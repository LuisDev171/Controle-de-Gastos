-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cat text not null check (cat in ('cartao','casa','carro','pet','pessoal')),
  sub text not null,
  descr text not null default '',
  valor numeric(12,2) not null check (valor > 0),
  data date not null,
  created_at timestamptz not null default now()
);
create index if not exists gastos_user_data on public.gastos (user_id, data desc);
alter table public.gastos enable row level security;
create policy "ver os proprios gastos" on public.gastos for select using (auth.uid() = user_id);
create policy "criar os proprios gastos" on public.gastos for insert with check (auth.uid() = user_id);
create policy "editar os proprios gastos" on public.gastos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "apagar os proprios gastos" on public.gastos for delete using (auth.uid() = user_id);

-- ATUALIZAÇÃO (só se você JÁ criou a tabela antes): rode este bloco uma vez
-- alter table public.gastos drop constraint if exists gastos_cat_check;
-- alter table public.gastos add constraint gastos_cat_check check (cat in ('cartao','casa','carro','pet','pessoal'));
