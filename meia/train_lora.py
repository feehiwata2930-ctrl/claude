"""Treina um LoRA (a "sua" camada da IA) com as imagens de ./dataset.

Usa os scripts oficiais de treino DreamBooth-LoRA do diffusers (baixados na
primeira execução, na versão que bate com o diffusers instalado).

Exemplo:
    python train_lora.py --name meu_estilo --token "meuestilo"
    python train_lora.py --name minha_personagem --token "mxp woman" --steps 1500

Requisitos: GPU NVIDIA com ~12 GB+ de VRAM para SDXL (8 GB para SD 1.5).
"""

import argparse
import json
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

import diffusers

from meia import config
from meia.guard import check_prompt

ROOT = Path(__file__).resolve().parent
SCRIPTS = ROOT / "training" / "scripts"
RUNS = ROOT / "training" / "runs"
IMG_EXT = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}


def fetch_script(name: str) -> Path:
    SCRIPTS.mkdir(parents=True, exist_ok=True)
    dest = SCRIPTS / f"{diffusers.__version__}_{name}"
    if dest.exists():
        return dest
    for ref in (f"v{diffusers.__version__}", "main"):
        url = f"https://raw.githubusercontent.com/huggingface/diffusers/{ref}/examples/dreambooth/{name}"
        try:
            print(f"Baixando {url}")
            urllib.request.urlretrieve(url, dest)
            return dest
        except Exception as e:  # noqa: BLE001
            print(f"  falhou ({e})")
    sys.exit("Não consegui baixar o script de treino. Verifique a internet.")


def prepare_dataset(src: Path, token: str) -> tuple[Path, bool]:
    """Copia imagens para um imagefolder com metadata.jsonl (legendas)."""
    images = [p for p in sorted(src.iterdir()) if p.suffix.lower() in IMG_EXT]
    if len(images) < 5:
        sys.exit(f"Coloque pelo menos 5 imagens em {src} (encontrei {len(images)}).")

    work = RUNS / "_dataset"
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)

    has_captions = False
    with open(work / "metadata.jsonl", "w", encoding="utf-8") as meta:
        for img in images:
            cap_file = img.with_suffix(".txt")
            caption = token
            if cap_file.exists():
                has_captions = True
                text = cap_file.read_text(encoding="utf-8").strip()
                caption = f"{token}, {text}" if token not in text else text
            blocked = check_prompt(caption)
            if blocked:
                sys.exit(f"{img.name}: {blocked}")
            shutil.copy2(img, work / img.name)
            meta.write(json.dumps({"file_name": img.name, "text": caption}, ensure_ascii=False) + "\n")
    print(f"{len(images)} imagens preparadas ({'com' if has_captions else 'sem'} legendas).")
    return work, has_captions


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True, help="nome do LoRA gerado")
    ap.add_argument("--token", required=True, help="palavra-gatilho, ex.: 'meuestilo'")
    ap.add_argument("--model", default=config.DEFAULT_MODEL, help="modelo base (HF id)")
    ap.add_argument("--sd15", action="store_true", help="modelo base é SD 1.5 (não SDXL)")
    ap.add_argument("--dataset", default=str(ROOT / "dataset"))
    ap.add_argument("--steps", type=int, default=1000)
    ap.add_argument("--rank", type=int, default=16)
    ap.add_argument("--lr", type=float, default=1e-4)
    ap.add_argument("--resolution", type=int, default=None)
    args = ap.parse_args()

    blocked = check_prompt(args.token)
    if blocked:
        sys.exit(blocked)

    data_dir, has_captions = prepare_dataset(Path(args.dataset), args.token)
    out_dir = RUNS / args.name
    res = args.resolution or (512 if args.sd15 else 1024)
    script = fetch_script("train_dreambooth_lora.py" if args.sd15 else "train_dreambooth_lora_sdxl.py")

    cmd = [
        sys.executable, "-m", "accelerate.commands.launch", str(script),
        f"--pretrained_model_name_or_path={args.model}",
        f"--instance_prompt={args.token}",
        f"--output_dir={out_dir}",
        f"--resolution={res}",
        "--train_batch_size=1",
        "--gradient_accumulation_steps=4",
        "--gradient_checkpointing",
        f"--learning_rate={args.lr}",
        "--lr_scheduler=constant",
        "--lr_warmup_steps=0",
        f"--max_train_steps={args.steps}",
        f"--rank={args.rank}",
        "--mixed_precision=fp16",
        "--seed=42",
    ]
    if not args.sd15 and has_captions:
        cmd += [f"--dataset_name={data_dir}", "--image_column=image", "--caption_column=text"]
    else:
        # instance_data_dir tenta abrir todo arquivo como imagem.
        (data_dir / "metadata.jsonl").unlink(missing_ok=True)
        cmd += [f"--instance_data_dir={data_dir}"]
    if not args.sd15:
        cmd += ["--pretrained_vae_model_name_or_path=madebyollin/sdxl-vae-fp16-fix"]

    print("\n".join(["Rodando:", *cmd]))
    subprocess.run(cmd, check=True)

    weights = out_dir / "pytorch_lora_weights.safetensors"
    target = config.LORA_DIR / f"{args.name}.safetensors"
    shutil.copy2(weights, target)
    print(f"\nPronto! LoRA salvo em {target}")
    print(f"Use no prompt a palavra-gatilho: {args.token}")


if __name__ == "__main__":
    main()
