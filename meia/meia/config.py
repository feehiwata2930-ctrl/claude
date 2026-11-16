"""Configurações do MEIA. Pode sobrescrever por variáveis de ambiente."""

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

OUTPUT_DIR = Path(os.environ.get("MEIA_OUTPUT_DIR", ROOT / "outputs"))
LORA_DIR = Path(os.environ.get("MEIA_LORA_DIR", ROOT / "loras"))
MODELS_DIR = Path(os.environ.get("MEIA_MODELS_DIR", ROOT / "models"))

# Modelo padrão. Aceita:
#  - um ID do Hugging Face (ex.: "stabilityai/stable-diffusion-xl-base-1.0")
#  - um arquivo local .safetensors/.ckpt (checkpoints baixados do Civitai etc.)
DEFAULT_MODEL = os.environ.get("MEIA_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")

# Modelos sugeridos no menu (você pode adicionar os seus).
SUGGESTED_MODELS = [
    "stabilityai/stable-diffusion-xl-base-1.0",
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    "SG161222/RealVisXL_V4.0",
    "cagliostrolab/animagine-xl-3.1",
]

DEFAULT_NEGATIVE = (
    "lowres, blurry, bad anatomy, bad hands, extra fingers, missing fingers, "
    "deformed, jpeg artifacts, watermark, text, signature"
)

for d in (OUTPUT_DIR, LORA_DIR, MODELS_DIR):
    d.mkdir(parents=True, exist_ok=True)
