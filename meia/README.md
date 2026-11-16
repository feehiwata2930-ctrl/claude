# MEIA — gerador de imagens pessoal

IA de geração de imagens que roda **100% no seu computador**. Depois que o modelo é
baixado, nenhum prompt ou imagem sai da sua máquina — não há servidor, conta, nem
filtro de conteúdo de terceiros.

- Texto → imagem e imagem → imagem
- Qualquer modelo Stable Diffusion (SDXL ou SD 1.5): do Hugging Face ou checkpoints
  `.safetensors` baixados (ex.: Civitai) colocados em `./models`
- LoRAs (estilos, personagens) em `./loras`, com força ajustável
- **Treino da sua própria IA** (LoRA) com as suas imagens → `train_lora.py`
- Imagens salvas em `./outputs/AAAA-MM-DD/` com todos os parâmetros embutidos no PNG

## Sobre "sem censura"

O safety checker dos modelos vem **desligado** e o MEIA não bloqueia temas — nudez,
violência, terror, etc. são gerados normalmente. A única trava (`meia/guard.py`) é
contra **conteúdo sexual envolvendo menores de idade**, que é crime em qualquer
circunstância, inclusive gerado por IA. Ela é estreita: só dispara quando o prompt
junta termos de menoridade com termos sexuais.

Lembre também: gerar imagens íntimas ou difamatórias de **pessoas reais** sem
consentimento é crime no Brasil (Lei 15.123/2025 e art. 216-B do Código Penal) e em
muitos outros países.

## Requisitos

| | Mínimo | Recomendado |
|---|---|---|
| GPU | NVIDIA 6 GB (SD 1.5) / 8 GB (SDXL com `MEIA_LOWVRAM=1`) | NVIDIA 12 GB+ |
| Mac | Apple Silicon (M1+) — funciona, mais lento | |
| Disco | ~10 GB por modelo SDXL | |

Sem GPU funciona em CPU, mas leva minutos por imagem.

## Instalação

```bash
cd meia
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 1) PyTorch com suporte à sua GPU (veja https://pytorch.org/get-started/locally/)
pip install torch --index-url https://download.pytorch.org/whl/cu124

# 2) O resto
pip install -r requirements.txt
```

## Usando

```bash
python app.py
```

Abra **http://127.0.0.1:7860**. A primeira geração baixa o modelo padrão (SDXL, ~7 GB).

- Pouca VRAM: `MEIA_LOWVRAM=1 python app.py`
- Acessar pelo celular na mesma rede: `python app.py --host 0.0.0.0` e abra
  `http://IP-DO-PC:7860` (ou `--share` para um link temporário do Gradio)
- Trocar o modelo padrão: `MEIA_MODEL=SG161222/RealVisXL_V4.0 python app.py`

### Dicas de prompt

- Em inglês os resultados costumam ser melhores.
- SDXL: 25–35 passos, CFG 5–7, tamanhos ~1024. SD 1.5: 512×512/512×768, CFG 7.
- Gostou de uma imagem? Reuse a **seed** e mude só um detalhe do prompt.

## Treinando a sua própria IA (LoRA)

Treinar um modelo do zero exige milhões de imagens e centenas de milhares de dólares
em GPU. O jeito prático de ter uma IA **sua** é ensinar um modelo base com as suas
imagens — um *LoRA*. Ele aprende um estilo, um personagem, um rosto (o seu) ou um
objeto, e vira um arquivo pequeno (~50–200 MB) que você liga na hora de gerar.

1. Coloque **15–40 imagens** em `./dataset`. Variedade de ângulos/fundos ajuda.
2. Opcional: para cada `foto1.jpg`, um `foto1.txt` descrevendo a imagem.
3. Treine:

   ```bash
   python train_lora.py --name meu_estilo --token "meuestilo"
   # SD 1.5 (menos VRAM):
   python train_lora.py --name meu_estilo --token "meuestilo" --sd15 \
       --model stable-diffusion-v1-5/stable-diffusion-v1-5
   ```

4. O resultado vai para `loras/meu_estilo.safetensors`. Na aba **Gerar → LoRAs**,
   clique em "Atualizar lista", selecione, e use a palavra-gatilho no prompt.

Parâmetros úteis: `--steps` (padrão 1000; personagens 1200–2000), `--rank`
(16; maior = mais detalhe e arquivo maior), `--lr` (1e-4).

## Estrutura

```
meia/
├── app.py            interface web (Gradio)
├── train_lora.py     treino de LoRA com suas imagens
├── meia/
│   ├── engine.py     carregamento de modelos, LoRAs, geração, salvamento
│   ├── guard.py      única trava (menores + conteúdo sexual)
│   └── config.py     pastas e modelo padrão
├── models/           seus checkpoints .safetensors
├── loras/            seus LoRAs
├── dataset/          imagens para treino
└── outputs/          imagens geradas
```
