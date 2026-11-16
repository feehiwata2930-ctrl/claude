"""MEIA — interface web local (abre em http://127.0.0.1:7860).

Uso:  python app.py            (só no seu computador)
      python app.py --share    (gera um link temporário para acessar do celular)
"""

import argparse

import gradio as gr

from meia import config
from meia.engine import ENGINE, SCHEDULERS, BlockedPrompt, GenRequest, list_local_models, list_loras

SIZES = {
    "Quadrado 1024×1024": (1024, 1024),
    "Retrato 832×1216": (832, 1216),
    "Paisagem 1216×832": (1216, 832),
    "Stories 768×1344": (768, 1344),
    "Widescreen 1344×768": (1344, 768),
    "SD 1.5 512×512": (512, 512),
    "SD 1.5 512×768": (512, 768),
}


def model_choices():
    seen, out = set(), []
    for m in [config.DEFAULT_MODEL, *config.SUGGESTED_MODELS, *list_local_models()]:
        if m not in seen:
            seen.add(m)
            out.append(m)
    return out


def do_load(model_id):
    model_id = (model_id or "").strip()
    if not model_id:
        return "Escolha ou digite um modelo."
    try:
        ENGINE.load(model_id)
    except Exception as e:  # noqa: BLE001
        return f"Erro ao carregar: {e}"
    tipo = "SDXL" if ENGINE.is_xl else "SD 1.x"
    return f"Carregado: {model_id} ({tipo}) em {ENGINE.device}"


def do_generate(prompt, negative, size, steps, guidance, seed, batch, scheduler,
                loras, lora_scale, init_image, strength, progress=gr.Progress(track_tqdm=True)):
    if not prompt or not prompt.strip():
        raise gr.Error("Escreva um prompt.")
    w, h = SIZES[size]
    req = GenRequest(
        prompt=prompt, negative_prompt=negative, width=w, height=h,
        steps=int(steps), guidance=float(guidance), seed=int(seed), batch=int(batch),
        scheduler=scheduler, loras=list(loras or []), lora_scale=float(lora_scale),
        init_image=init_image, strength=float(strength),
    )
    try:
        images, paths, used_seed = ENGINE.generate(req)
    except BlockedPrompt as e:
        raise gr.Error(str(e))
    return images, used_seed, f"Seed {used_seed} — salvo em {paths[0].parent}"


def build_ui():
    with gr.Blocks(title="MEIA") as ui:
        gr.Markdown("# MEIA\nGerador de imagens pessoal, rodando na sua máquina.")

        with gr.Tab("Gerar"):
            with gr.Row():
                with gr.Column(scale=5):
                    prompt = gr.Textbox(label="Prompt", lines=4,
                                        placeholder="Descreva a imagem (em inglês costuma funcionar melhor)")
                    negative = gr.Textbox(label="Prompt negativo", lines=2, value=config.DEFAULT_NEGATIVE)
                    with gr.Row():
                        size = gr.Dropdown(list(SIZES), value="Quadrado 1024×1024", label="Tamanho")
                        scheduler = gr.Dropdown(list(SCHEDULERS), value="DPM++ 2M Karras", label="Sampler")
                    with gr.Row():
                        steps = gr.Slider(4, 80, value=30, step=1, label="Passos")
                        guidance = gr.Slider(0, 15, value=6.5, step=0.5, label="CFG (fidelidade ao prompt)")
                    with gr.Row():
                        seed = gr.Number(value=-1, precision=0, label="Seed (-1 = aleatória)")
                        batch = gr.Slider(1, 4, value=1, step=1, label="Quantidade")
                    with gr.Accordion("LoRAs (seu estilo / seu personagem)", open=False):
                        loras = gr.Dropdown(list_loras(), multiselect=True, label="LoRAs em ./loras")
                        lora_scale = gr.Slider(0, 1.5, value=0.8, step=0.05, label="Força do LoRA")
                        refresh = gr.Button("Atualizar lista", size="sm")
                        refresh.click(lambda: gr.update(choices=list_loras()), outputs=loras)
                    with gr.Accordion("Imagem → imagem (opcional)", open=False):
                        init_image = gr.Image(type="pil", label="Imagem base")
                        strength = gr.Slider(0.05, 1.0, value=0.6, step=0.05,
                                             label="Quanto mudar (baixo = parecido com a base)")
                    go = gr.Button("Gerar", variant="primary")
                with gr.Column(scale=6):
                    gallery = gr.Gallery(label="Resultado", columns=2, height=640, format="png")
                    used_seed = gr.Number(label="Seed usada", interactive=False)
                    status = gr.Markdown()

            inputs = [prompt, negative, size, steps, guidance, seed, batch, scheduler,
                      loras, lora_scale, init_image, strength]
            go.click(do_generate, inputs, [gallery, used_seed, status])
            prompt.submit(do_generate, inputs, [gallery, used_seed, status])

        with gr.Tab("Modelo"):
            gr.Markdown(
                "Escolha um modelo do Hugging Face ou um checkpoint `.safetensors` "
                "colocado em `./models`. O primeiro carregamento baixa o modelo (alguns GB)."
            )
            model = gr.Dropdown(model_choices(), value=config.DEFAULT_MODEL,
                                allow_custom_value=True, label="Modelo")
            load_btn = gr.Button("Carregar modelo", variant="primary")
            load_status = gr.Markdown(f"Dispositivo: **{ENGINE.device}**")
            load_btn.click(do_load, model, load_status)

        with gr.Tab("Treinar a sua IA"):
            gr.Markdown(
                "Para deixar a IA com **o seu estilo** ou ensinar um personagem/objeto:\n\n"
                "1. Coloque 15–40 imagens em `./dataset` (e, se quiser, um `.txt` com a legenda de cada uma, mesmo nome).\n"
                "2. Rode no terminal: `python train_lora.py --name meu_estilo --token \"meuestilo\"`\n"
                "3. O arquivo `loras/meu_estilo.safetensors` aparece na aba **Gerar → LoRAs**.\n"
                "4. Use a palavra-gatilho no prompt, ex.: `retrato no estilo meuestilo`.\n\n"
                "Veja o README para detalhes e requisitos de GPU."
            )
    return ui


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--share", action="store_true", help="cria link público temporário")
    ap.add_argument("--port", type=int, default=7860)
    ap.add_argument("--host", default="127.0.0.1")
    args = ap.parse_args()
    build_ui().queue().launch(server_name=args.host, server_port=args.port, share=args.share)
