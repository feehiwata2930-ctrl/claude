# ReelCut

Editor de vídeo no navegador para preparar clipes para **Stories** e **Reels**. Corte, junte clipes, adicione texto, música de fundo e exporte em formato vertical (ou quadrado/paisagem) — tudo processado localmente no seu navegador, sem enviar seus vídeos para nenhum servidor.

## Funcionalidades

- **Importar vários vídeos** e organizá-los em sequência
- **Cortar** cada clipe arrastando as alças de início/fim
- **Reordenar** e remover clipes
- **Texto sobre o vídeo**: legendas/títulos arrastáveis, com cor, tamanho, negrito e tempo de exibição
- **Música de fundo** com controle de volume independente do áudio original
- **Formatos**: 9:16 (Stories/Reels), 4:5 (feed), 1:1 (quadrado) e 16:9
- **Corte automático (local)**: detecta picos de áudio e movimento e já monta um corte de destaque, sem IA
- **Corte com IA**: o Claude analisa os frames do vídeo e escolhe os cortes com base na narrativa (gancho, clímax, reação), não só em sinais de áudio/movimento — veja detalhes abaixo
- **Exportação** para MP4 (H.264 + AAC) pronta para postar, com barra de progresso e download

Todo o processamento de vídeo (corte, corte de aspecto, texto, mixagem de áudio) acontece no navegador via [ffmpeg.wasm](https://ffmpegwasm.netlify.app/) — nada é enviado para um servidor. A única exceção é a feature opcional de **corte com IA**, descrita abaixo.

## Corte com IA

Na aba "Cortar", o card **"Corte com IA (entende a cena)"** extrai frames do vídeo e manda para o modelo Claude (Anthropic) analisar a cena e recomendar os melhores cortes, com o motivo de cada escolha.

Como isso funciona tecnicamente:

- A chamada à API da Anthropic é feita **direto do seu navegador** (`dangerouslyAllowBrowser`), sem passar por nenhum servidor deste app.
- Você usa **sua própria chave de API** da Anthropic (crie uma em [console.anthropic.com](https://console.anthropic.com)). Ela fica salva só no `localStorage` do seu navegador.
- **Isso tem custo real, cobrado na sua conta Anthropic** — o app mostra uma estimativa de custo antes de rodar, e você escolhe o modelo (Opus 5, Sonnet 5 ou Haiku 4.5).
- A análise é só do conteúdo **visual** (frames); não há transcrição de fala. Para vídeos com humor/informação que depende do que é dito, isso é uma limitação conhecida.

Se você não quiser usar essa feature (ou não tiver uma chave de API), o **corte automático local** continua disponível e funciona sem nenhuma chamada externa.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra o endereço exibido no terminal (por padrão `http://localhost:5173`).

## Build de produção

```bash
npm run build
npm run preview
```

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Zustand para estado
- ffmpeg.wasm para exportação de vídeo no navegador
- @anthropic-ai/sdk + Zod para o corte com IA (structured outputs)

## Limitações conhecidas

- A primeira exportação baixa o motor do ffmpeg (~30 MB) de uma CDN pública, então requer conexão com a internet mesmo sendo um app "local".
- Vídeos sem faixa de áudio são detectados e recebem uma trilha silenciosa automaticamente para não quebrar a exportação.
