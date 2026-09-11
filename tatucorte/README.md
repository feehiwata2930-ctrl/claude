# TatuCorte

App para tatuadores gerarem **decalques (stencils)** a partir de fotos e organizarem o **corte de folha** para impressão — tudo salvo no seu próprio **Google Drive**, para acessar depois de qualquer aparelho.

Feito com base no funcionamento de apps de referência do mercado (como o *Tattoo Stencil Pro*, de Darwin Enriquez): converter uma foto em contorno pronto para decalque e preparar a impressão em papel.

## Funcionalidades

- **Gerar decalque**: envie uma foto e ajuste sensibilidade de contorno, contraste, espessura da linha e inversão de cores — tudo processado no navegador (a foto original não é enviada para nenhum servidor nessa etapa).
- **Biblioteca**: todos os decalques gerados ficam salvos na pasta "TatuCorte" do seu Drive, com tamanho real (mm) e cliente associado (opcional).
- **Montar folha**: arraste vários decalques salvos para uma folha (A4, A5, Carta ou A3), redimensione, gire, organize automaticamente para aproveitar melhor o papel, e exporte um PDF em tamanho real, pronto para imprimir.
- **Ampliar & cortar**: para peças maiores que uma folha, defina o tamanho final desejado (em mm) e o app divide o desenho em várias páginas com marcas de corte e numeração de linha/coluna, para imprimir e montar.
- **Clientes**: organize decalques por cliente.
- Tudo fica salvo no **seu** Google Drive — o app não tem servidor próprio nem acesso aos seus dados; só você, autenticado com sua conta Google, entra na pasta "TatuCorte" que ele cria.

## Configuração (gratuita, ~5 minutos)

Os dados são salvos como arquivos numa pasta **"TatuCorte"** criada no seu próprio Google Drive (o app só enxerga arquivos que ele mesmo cria — escopo `drive.file` do Google, o mais restrito possível).

1. Abra o [Google Cloud Console](https://console.cloud.google.com/projectcreate) e crie um projeto (ou use um existente).
2. Em **APIs e Serviços → Biblioteca**, procure **Google Drive API** e clique em **Ativar**.
3. Em **APIs e Serviços → Tela de consentimento OAuth**: escolha **Externo**, preencha nome do app e seu e-mail, e deixe a publicação em **Testing**. Em **Test users**, adicione o seu próprio e-mail do Google — assim só você acessa, e o Google não exige verificação do app.
4. Em **APIs e Serviços → Credenciais → Criar credenciais → ID do cliente OAuth**: tipo **App da Web**. Em **Origens JavaScript autorizadas**, adicione o endereço onde o app roda (ex.: `http://localhost:5173` para rodar localmente).
5. Copie o **Client ID** gerado (termina em `.apps.googleusercontent.com`).
6. Abra o app, cole o Client ID na tela inicial e clique em **Salvar e continuar**.
7. Clique em **Entrar com o Google Drive** e autorize o acesso — pronto, seus decalques já ficam salvos no seu Drive.

> Como o app roda só no seu navegador (sem servidor), a sessão dura cerca de 1 hora — depois disso ele pede para entrar de novo com o Google. Isso é uma limitação inerente a apps 100% client-side, não um bug.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra o endereço exibido no terminal (por padrão `http://localhost:5173`) — lembre de adicionar esse endereço nas Origens JavaScript autorizadas do passo 4 acima.

## Build de produção

```bash
npm run build
npm run preview
```

Se for publicar em outro domínio (ex.: um deploy no Vercel/Netlify), adicione esse domínio também nas Origens JavaScript autorizadas do Client ID no Google Cloud Console.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Zustand para estado
- Google Identity Services (OAuth no navegador) + API do Google Drive (REST) para autenticação e persistência — sem backend próprio
- Processamento de imagem (detecção de bordas) em Canvas, no navegador
- jsPDF para exportar as folhas e os mosaicos de corte em PDF, em tamanho real

## Como os dados ficam organizados no Drive

O app cria, na raiz do seu Drive, uma pasta **TatuCorte** contendo:

- `db.json` — um arquivo com os dados de clientes, decalques, folhas e configurações de corte (metadados, não as imagens)
- `imagens/` — uma subpasta com o PNG de cada decalque gerado

Você pode abrir essa pasta diretamente no [drive.google.com](https://drive.google.com) para ver ou baixar os arquivos manualmente a qualquer momento.

## Limitações conhecidas

- A geração de decalque usa detecção de bordas (Sobel) — funciona melhor com fotos de traço/desenho já definido do que com fotos muito complexas ou de baixo contraste; ajuste os controles de sensibilidade e contraste conforme a imagem.
- A organização automática de folha usa um empacotamento simples (não é o aproveitamento matematicamente ótimo do papel).
- Sem servidor próprio, a sessão do Google expira depois de ~1h de inatividade e pede login de novo (ver seção de configuração acima).
- `db.json` é lido e reescrito por inteiro a cada alteração — ótimo para uso pessoal (uma biblioteca de algumas centenas de decalques), mas não foi pensado para uso simultâneo por vários dispositivos ao mesmo tempo (a última gravação sobrescreve a anterior).
