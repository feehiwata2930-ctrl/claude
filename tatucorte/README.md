# TatuCorte

App para tatuadores gerarem **decalques (stencils)** a partir de fotos e organizarem o **corte de folha** para impressão.

**Link do app:** https://feehiwata2930-ctrl.github.io/claude/tatucorte/ — abre e já funciona, sem cadastro, sem login.

Feito com base no funcionamento de apps de referência do mercado (como o *Tattoo Stencil Pro*, de Darwin Enriquez): converter uma foto em contorno pronto para decalque e preparar a impressão em papel.

## Funcionalidades

- **Gerar decalque**: envie uma foto e ajuste sensibilidade de contorno, suavização (reduz ruído sem apagar traços finos), contraste, espessura da linha e inversão de cores — tudo processado no navegador (a foto nunca é enviada para nenhum servidor).
- **Biblioteca**: todos os decalques gerados ficam salvos ali, com tamanho real (mm), cliente associado (opcional) e um botão para **baixar o PNG**.
- **Montar folha**: arraste vários decalques salvos para uma folha (A4, A5, Carta ou A3), redimensione, gire, organize automaticamente para aproveitar melhor o papel, e exporte um PDF em tamanho real, pronto para imprimir.
- **Ampliar & cortar**: para peças maiores que uma folha, defina o tamanho final desejado (em mm) e o app divide o desenho em várias páginas com marcas de corte e numeração de linha/coluna, para imprimir e montar.
- **Gerador de Prompt**: assistente em etapas (tema, corpo/composição, estilo/luz/tonalidade, atmosfera/técnica) que te guia com perguntas e sugestões — incluindo um botão de sortear — até montar um prompt único e completo para gerar referências de tatuagem realista em preto e cinza. Gera automaticamente duas versões prontas para copiar: uma em inglês com parâmetros para o **Midjourney** e outra em português, descritiva, para o **ChatGPT/DALL·E**. As combinações ficam salvas num histórico local.
- **Clientes**: organize decalques por cliente.

## Onde os dados ficam salvos

**No seu navegador**, neste aparelho — sem conta, sem login, sem nenhuma configuração de nuvem. O app usa o IndexedDB do navegador (a mesma tecnologia que apps como e-mail e editores usam para funcionar offline). Isso significa:

- Abrir o link e usar — não tem nenhuma etapa de configuração antes.
- Os dados **não** aparecem automaticamente em outro computador/celular — cada navegador guarda os seus. Use o botão de **baixar PNG** em cada decalque (na Biblioteca) para salvar os arquivos como quiser, transferir, ou enviar para impressão.
- Limpar o histórico/dados do site nesse navegador apaga os decalques salvos — evite fazer isso, ou baixe uma cópia antes.
- O histórico de prompts gerados usa `localStorage` (mais simples que o IndexedDB dos decalques) e também fica só neste navegador.

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
- IndexedDB (nativo do navegador) para persistência local — sem backend, sem login
- Processamento de imagem (detecção de bordas ao estilo Canny, com filtro bilateral para reduzir ruído preservando traços finos) em Canvas, no navegador
- jsPDF para exportar as folhas e os mosaicos de corte em PDF, em tamanho real

## Limitações conhecidas

- Os dados ficam só neste navegador/aparelho (ver seção acima) — não há sincronização entre dispositivos.
- A geração de decalque funciona melhor com fotos de traço/desenho já definido do que com fotos muito complexas ou de baixo contraste; ajuste os controles de sensibilidade, suavização e contraste conforme a imagem.
- A organização automática de folha usa um empacotamento simples (não é o aproveitamento matematicamente ótimo do papel).
