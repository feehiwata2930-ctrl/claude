# TatuCorte

App para tatuadores gerarem **decalques (stencils)** a partir de fotos e organizarem o **corte de folha** para impressão — tudo salvo na nuvem, com login, para acessar depois de qualquer aparelho.

Feito com base no funcionamento de apps de referência do mercado (como o *Tattoo Stencil Pro*, de Darwin Enriquez): converter uma foto em contorno pronto para decalque e preparar a impressão em papel.

## Funcionalidades

- **Gerar decalque**: envie uma foto e ajuste sensibilidade de contorno, contraste, espessura da linha e inversão de cores — tudo processado no navegador (a foto original não é enviada para nenhum servidor nessa etapa).
- **Biblioteca**: todos os decalques gerados ficam salvos na sua conta, com tamanho real (mm) e cliente associado (opcional).
- **Montar folha**: arraste vários decalques salvos para uma folha (A4, A5, Carta ou A3), redimensione, gire, organize automaticamente para aproveitar melhor o papel, e exporte um PDF em tamanho real, pronto para imprimir.
- **Ampliar & cortar**: para peças maiores que uma folha, defina o tamanho final desejado (em mm) e o app divide o desenho em várias páginas com marcas de corte e numeração de linha/coluna, para imprimir e montar.
- **Clientes**: organize decalques por cliente.
- Tudo fica salvo na nuvem (Supabase) associado à sua conta — acesse de qualquer computador fazendo login.

## Configuração (gratuita, ~2 minutos)

Os dados são salvos no **seu próprio projeto Supabase** (banco de dados + autenticação + armazenamento de imagens, plano gratuito é suficiente).

1. Crie uma conta e um projeto em [supabase.com](https://supabase.com).
2. No painel do projeto, abra **SQL Editor → New query**, cole todo o conteúdo do arquivo [`supabase/schema.sql`](./supabase/schema.sql) deste repositório e clique em **Run**. Isso cria as tabelas, as políticas de segurança (RLS, cada usuário só acessa seus próprios dados) e o bucket de armazenamento das imagens.
3. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
4. Abra o app, cole essas duas informações na tela inicial e clique em **Salvar e continuar**.
5. Crie sua conta (e-mail + senha) na tela seguinte — pronto, seus decalques já ficam salvos na nuvem.

> Por padrão o Supabase pede confirmação por e-mail ao criar conta. Se quiser pular isso durante testes, desative em **Authentication → Providers → Email → Confirm email**.

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
- Supabase (Postgres + Auth + Storage) para persistência na nuvem
- Processamento de imagem (detecção de bordas) em Canvas, no navegador
- jsPDF para exportar as folhas e os mosaicos de corte em PDF, em tamanho real

## Limitações conhecidas

- A geração de decalque usa detecção de bordas (Sobel) — funciona melhor com fotos de traço/desenho já definido do que com fotos muito complexas ou de baixo contraste; ajuste os controles de sensibilidade e contraste conforme a imagem.
- A organização automática de folha usa um empacotamento simples (não é o aproveitamento matematicamente ótimo do papel).
- O bucket de imagens é público por leitura (necessário para o PDF embutir as imagens); a escrita/exclusão é restrita ao dono via políticas do Supabase.
