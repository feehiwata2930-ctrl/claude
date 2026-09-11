-- TatuCorte — schema do Supabase
-- Rode este arquivo inteiro em: painel do Supabase > SQL Editor > New query > Run

create extension if not exists "pgcrypto";

-- ─── Clientes (opcional, para organizar decalques por cliente) ───────────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "clients_select_own" on public.clients
  for select using (auth.uid() = user_id);
create policy "clients_insert_own" on public.clients
  for insert with check (auth.uid() = user_id);
create policy "clients_update_own" on public.clients
  for update using (auth.uid() = user_id);
create policy "clients_delete_own" on public.clients
  for delete using (auth.uid() = user_id);

-- ─── Decalques (stencils gerados) ─────────────────────────────────────────
create table if not exists public.decalques (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  image_path text not null,
  width_mm numeric not null default 100,
  height_mm numeric not null default 100,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.decalques enable row level security;

create policy "decalques_select_own" on public.decalques
  for select using (auth.uid() = user_id);
create policy "decalques_insert_own" on public.decalques
  for insert with check (auth.uid() = user_id);
create policy "decalques_update_own" on public.decalques
  for update using (auth.uid() = user_id);
create policy "decalques_delete_own" on public.decalques
  for delete using (auth.uid() = user_id);

-- ─── Folhas (layout de impressão com vários decalques) ────────────────────
create table if not exists public.sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  paper_size text not null default 'a4',
  orientation text not null default 'portrait',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sheets enable row level security;

create policy "sheets_select_own" on public.sheets
  for select using (auth.uid() = user_id);
create policy "sheets_insert_own" on public.sheets
  for insert with check (auth.uid() = user_id);
create policy "sheets_update_own" on public.sheets
  for update using (auth.uid() = user_id);
create policy "sheets_delete_own" on public.sheets
  for delete using (auth.uid() = user_id);

-- ─── Itens de uma folha (posição de cada decalque dentro da folha) ────────
create table if not exists public.sheet_items (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.sheets(id) on delete cascade,
  decalque_id uuid not null references public.decalques(id) on delete cascade,
  x_mm numeric not null default 0,
  y_mm numeric not null default 0,
  width_mm numeric not null default 50,
  height_mm numeric not null default 50,
  rotation numeric not null default 0
);

alter table public.sheet_items enable row level security;

create policy "sheet_items_select_own" on public.sheet_items
  for select using (exists (select 1 from public.sheets s where s.id = sheet_id and s.user_id = auth.uid()));
create policy "sheet_items_insert_own" on public.sheet_items
  for insert with check (exists (select 1 from public.sheets s where s.id = sheet_id and s.user_id = auth.uid()));
create policy "sheet_items_update_own" on public.sheet_items
  for update using (exists (select 1 from public.sheets s where s.id = sheet_id and s.user_id = auth.uid()));
create policy "sheet_items_delete_own" on public.sheet_items
  for delete using (exists (select 1 from public.sheets s where s.id = sheet_id and s.user_id = auth.uid()));

-- ─── Ampliações/mosaicos salvos (corte de folha para peças grandes) ───────
create table if not exists public.tilings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  decalque_id uuid not null references public.decalques(id) on delete cascade,
  target_width_mm numeric not null,
  target_height_mm numeric not null,
  paper_size text not null default 'a4',
  created_at timestamptz not null default now()
);

alter table public.tilings enable row level security;

create policy "tilings_select_own" on public.tilings
  for select using (auth.uid() = user_id);
create policy "tilings_insert_own" on public.tilings
  for insert with check (auth.uid() = user_id);
create policy "tilings_delete_own" on public.tilings
  for delete using (auth.uid() = user_id);

-- ─── Storage: bucket para as imagens dos decalques ────────────────────────
insert into storage.buckets (id, name, public)
values ('decalques', 'decalques', true)
on conflict (id) do nothing;

create policy "decalques_storage_read_public" on storage.objects
  for select using (bucket_id = 'decalques');
create policy "decalques_storage_insert_own" on storage.objects
  for insert with check (bucket_id = 'decalques' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "decalques_storage_delete_own" on storage.objects
  for delete using (bucket_id = 'decalques' and (storage.foldername(name))[1] = auth.uid()::text);
