# ReelCut

Editor de vídeo no navegador para preparar clipes para **Stories** e **Reels**. Corte, junte clipes, adicione texto, música de fundo e exporte em formato vertical (ou quadrado/paisagem) — tudo processado localmente no seu navegador, sem enviar seus vídeos para nenhum servidor.

## Funcionalidades

- **Importar vários vídeos** e organizá-los em sequência
- **Cortar** cada clipe arrastando as alças de início/fim
- **Reordenar** e remover clipes
- **Texto sobre o vídeo**: legendas/títulos arrastáveis, com cor, tamanho, negrito e tempo de exibição
- **Música de fundo** com controle de volume independente do áudio original
- **Formatos**: 9:16 (Stories/Reels), 4:5 (feed), 1:1 (quadrado) e 16:9
- **Exportação** para MP4 (H.264 + AAC) pronta para postar, com barra de progresso e download

Todo o processamento (corte, corte de aspecto, texto, mixagem de áudio) acontece no navegador via [ffmpeg.wasm](https://ffmpegwasm.netlify.app/) — nada é enviado para um servidor.

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

## Limitações conhecidas

- A primeira exportação baixa o motor do ffmpeg (~30 MB) de uma CDN pública, então requer conexão com a internet mesmo sendo um app "local".
- Vídeos sem faixa de áudio são detectados e recebem uma trilha silenciosa automaticamente para não quebrar a exportação.
