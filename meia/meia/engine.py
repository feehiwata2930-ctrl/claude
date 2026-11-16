"""Motor de geração do MEIA (texto→imagem e imagem→imagem) usando diffusers.

Roda 100% local: depois que o modelo é baixado uma vez, nada sai da sua máquina.
"""

from __future__ import annotations

import json
import os
import random
import threading
import time
from dataclasses import dataclass, asdict, field
from pathlib import Path

import torch
from PIL import Image
from PIL.PngImagePlugin import PngInfo

from . import config
from .guard import check_prompt

SCHEDULERS = {
    "DPM++ 2M Karras": ("DPMSolverMultistepScheduler", {"use_karras_sigmas": True}),
    "DPM++ 2M": ("DPMSolverMultistepScheduler", {}),
    "Euler a": ("EulerAncestralDiscreteScheduler", {}),
    "Euler": ("EulerDiscreteScheduler", {}),
    "UniPC": ("UniPCMultistepScheduler", {}),
    "DDIM": ("DDIMScheduler", {}),
}


@dataclass
class GenRequest:
    prompt: str
    negative_prompt: str = config.DEFAULT_NEGATIVE
    width: int = 1024
    height: int = 1024
    steps: int = 30
    guidance: float = 6.5
    seed: int = -1
    batch: int = 1
    scheduler: str = "DPM++ 2M Karras"
    loras: list[str] = field(default_factory=list)
    lora_scale: float = 0.8
    init_image: Image.Image | None = None
    strength: float = 0.6


class BlockedPrompt(Exception):
    pass


def pick_device() -> tuple[str, torch.dtype]:
    if torch.cuda.is_available():
        return "cuda", torch.float16
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps", torch.float16
    return "cpu", torch.float32


def list_loras() -> list[str]:
    return sorted(p.name for p in config.LORA_DIR.glob("*.safetensors"))


def list_local_models() -> list[str]:
    exts = ("*.safetensors", "*.ckpt")
    return sorted(str(p) for e in exts for p in config.MODELS_DIR.glob(e))


class Engine:
    def __init__(self):
        self.device, self.dtype = pick_device()
        self.low_vram = os.environ.get("MEIA_LOWVRAM") == "1"
        self.model_id: str | None = None
        self.txt2img = None
        self.img2img = None
        self.is_xl = False
        self._loaded_loras: tuple[str, ...] = ()
        self._lock = threading.Lock()

    # ------------------------------------------------------------------ load
    def load(self, model_id: str):
        if model_id == self.model_id and self.txt2img is not None:
            return
        from diffusers import (
            AutoPipelineForImage2Image,
            AutoPipelineForText2Image,
            StableDiffusionPipeline,
            StableDiffusionXLPipeline,
        )

        self._unload()
        kwargs = dict(torch_dtype=self.dtype)

        if Path(model_id).suffix in (".safetensors", ".ckpt"):
            # Checkpoint de arquivo único (ex.: baixado do Civitai).
            try:
                pipe = StableDiffusionXLPipeline.from_single_file(model_id, **kwargs)
            except Exception:
                pipe = StableDiffusionPipeline.from_single_file(model_id, **kwargs)
        else:
            pipe = AutoPipelineForText2Image.from_pretrained(
                model_id, use_safetensors=True, **kwargs
            )

        # Sem censura: desliga o safety checker (existe nos modelos SD 1.x).
        if hasattr(pipe, "safety_checker"):
            pipe.safety_checker = None
            if hasattr(pipe, "register_to_config"):
                pipe.register_to_config(requires_safety_checker=False)

        self.is_xl = "XL" in type(pipe).__name__
        self._place(pipe)
        self.txt2img = pipe
        self.img2img = AutoPipelineForImage2Image.from_pipe(pipe)
        self.model_id = model_id

    def _place(self, pipe):
        if self.device == "cuda" and self.low_vram:
            pipe.enable_model_cpu_offload()
        else:
            pipe.to(self.device)
        if hasattr(pipe, "enable_vae_tiling"):
            pipe.enable_vae_tiling()
        if self.device != "cuda" and hasattr(pipe, "enable_attention_slicing"):
            pipe.enable_attention_slicing()

    def _unload(self):
        self.txt2img = self.img2img = None
        self.model_id = None
        self._loaded_loras = ()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    # ------------------------------------------------------------- settings
    def _set_scheduler(self, name: str):
        import diffusers

        cls_name, extra = SCHEDULERS.get(name, SCHEDULERS["DPM++ 2M Karras"])
        cls = getattr(diffusers, cls_name)
        sched = cls.from_config(self.txt2img.scheduler.config, **extra)
        self.txt2img.scheduler = sched
        self.img2img.scheduler = sched

    def _set_loras(self, names: list[str], scale: float):
        names = tuple(n for n in names if (config.LORA_DIR / n).exists())
        pipe = self.txt2img
        if names != self._loaded_loras:
            if self._loaded_loras:
                pipe.unload_lora_weights()
            for n in names:
                pipe.load_lora_weights(
                    str(config.LORA_DIR), weight_name=n, adapter_name=Path(n).stem
                )
            self._loaded_loras = names
        if names:
            pipe.set_adapters([Path(n).stem for n in names], [scale] * len(names))

    # ------------------------------------------------------------- generate
    def generate(self, req: GenRequest) -> tuple[list[Image.Image], list[Path], int]:
        blocked = check_prompt(req.prompt)
        if blocked:
            raise BlockedPrompt(blocked)

        with self._lock:
            if self.txt2img is None:
                self.load(config.DEFAULT_MODEL)
            self._set_scheduler(req.scheduler)
            self._set_loras(req.loras, req.lora_scale)

            seed = req.seed if req.seed >= 0 else random.randint(0, 2**32 - 1)
            generator = torch.Generator(device="cpu").manual_seed(seed)
            w = max(256, round(req.width / 64) * 64)
            h = max(256, round(req.height / 64) * 64)

            common = dict(
                prompt=req.prompt,
                negative_prompt=req.negative_prompt or None,
                num_inference_steps=int(req.steps),
                guidance_scale=float(req.guidance),
                num_images_per_prompt=int(req.batch),
                generator=generator,
            )
            if req.init_image is not None:
                init = req.init_image.convert("RGB").resize((w, h), Image.LANCZOS)
                out = self.img2img(image=init, strength=float(req.strength), **common)
            else:
                out = self.txt2img(width=w, height=h, **common)

            images = out.images
            paths = [self._save(img, req, seed, i, w, h) for i, img in enumerate(images)]
            return images, paths, seed

    def _save(self, img: Image.Image, req: GenRequest, seed: int, idx: int, w: int, h: int) -> Path:
        meta = asdict(req)
        meta.pop("init_image", None)
        meta.update(seed=seed, index=idx, width=w, height=h, model=self.model_id,
                    mode="img2img" if req.init_image is not None else "txt2img")
        info = PngInfo()
        info.add_text("meia", json.dumps(meta, ensure_ascii=False))
        info.add_text("parameters", req.prompt)
        day = config.OUTPUT_DIR / time.strftime("%Y-%m-%d")
        day.mkdir(parents=True, exist_ok=True)
        path = day / f"{time.strftime('%H%M%S')}_{seed}_{idx}.png"
        img.save(path, pnginfo=info)
        return path


ENGINE = Engine()
