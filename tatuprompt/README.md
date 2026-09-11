# TatuPrompt

Assistente para tatuadores montarem **prompts de referência** para tatuagem realista em **preto e cinza**, prontos para usar no **ChatGPT** e no **Midjourney**.

**Link do app:** https://feehiwata2930-ctrl.github.io/claude/tatuprompt/ — abre e já funciona, sem cadastro, sem login.

## Como funciona

Um assistente guiado em etapas — tema, corpo & composição, estilo/luz/tonalidade, atmosfera & técnica — com perguntas e sugestões em formato de chips para cada campo. Em vez de escrever o prompt do zero, você escolhe (ou sorteia) as opções e o app monta duas versões prontas:

- **Prompt para Midjourney**: em inglês, já com os parâmetros técnicos (`--ar`, `--style raw`, `--v 6.1`, `--no ...`).
- **Prompt para ChatGPT / DALL·E**: em português, descritivo, pensado para gerar uma imagem de referência tecnicamente útil pra reproduzir com agulha.

## Funcionalidades

- **Perguntas guiadas com sugestões**: cada etapa mostra opções clicáveis (tema, elementos complementares, local do corpo, enquadramento, subestilo de realismo, iluminação, tonalidade/contraste, atmosfera, técnica de sombreamento).
- **Sortear**: um botão de dado 🎲 em cada campo sugere uma opção aleatória; "Sortear tudo" gera uma combinação inteira nova, evitando repetir a anterior — útil pra ter referências únicas.
- **Tonalidade certa**: 4 presets de contraste em preto e cinza (alto contraste clássico, cinza médio suave, sombras densas/dark realism, baixo contraste/fine line), cada um com a instrução técnica de tons já embutida no prompt.
- **Proporção da imagem**: sugerida automaticamente pelo local do corpo (antebraço, braço fechado, costela, etc.), mas pode ser trocada manualmente.
- **Histórico local**: prompts gerados podem ser salvos e revisitados depois, com botão de copiar.

## Onde os dados ficam salvos

**No seu navegador**, neste aparelho, via `localStorage` — sem conta, sem login, sem nuvem. O histórico não aparece em outro computador/celular; copie os prompts que quiser guardar em outro lugar.

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
- Tudo client-side — sem backend, sem chamadas de API (você cola o prompt gerado direto no ChatGPT ou no Midjourney)
