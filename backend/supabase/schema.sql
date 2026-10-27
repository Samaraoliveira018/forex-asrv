-- ============================================================
-- Diário Trader ASRV — Schema Supabase
-- Uso: Supabase Dashboard > SQL Editor > New query > cole tudo > Run
-- Idempotente: pode rodar mais de uma vez sem erro.
--
-- Segurança: RLS habilitado e policies amarradas a auth.uid().
-- Ninguém (nem com a anon key) lê ou grava dados de outro usuário.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABELAS
-- ------------------------------------------------------------

-- Operações do diário
create table if not exists public.trades (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  "date"     date        not null,
  asset      text        not null,
  type       text        not null check (type in ('Compra', 'Venda')),
  lots       numeric     not null default 1,
  pnl        numeric     not null default 0,
  notes      text        not null default '',
  screenshot_path text   not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Garante a coluna do print em bancos já existentes
alter table public.trades
  add column if not exists screenshot_path text not null default '';

-- Dias registrados como "não operei"
create table if not exists public.no_trade_days (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  day        date        not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Configurações (saldo inicial)
create table if not exists public.settings (
  user_id         uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  initial_balance numeric     not null default 150,
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. ÍNDICES
-- ------------------------------------------------------------
create index if not exists trades_user_date_idx on public.trades (user_id, date desc);
create index if not exists no_trade_days_user_day_idx on public.no_trade_days (user_id, day desc);

-- ------------------------------------------------------------
-- 3. updated_at automático
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trades_set_updated_at on public.trades;
create trigger trades_set_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.trades        enable row level security;
alter table public.no_trade_days enable row level security;
alter table public.settings      enable row level security;

-- trades: cada usuário só acessa as próprias linhas
drop policy if exists "trades_own_rows" on public.trades;
create policy "trades_own_rows"
  on public.trades
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- no_trade_days: idem
drop policy if exists "no_trade_days_own_rows" on public.no_trade_days;
create policy "no_trade_days_own_rows"
  on public.no_trade_days
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- settings: idem
drop policy if exists "settings_own_rows" on public.settings;
create policy "settings_own_rows"
  on public.settings
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- 5. DEFESA EM PROFUNDIDADE
-- Sem policy para o role "anon", o RLS já bloqueia; revogar o
-- grant deixa explícito que a chave anônima não acessa nada.
-- ------------------------------------------------------------
revoke all on public.trades        from anon;
revoke all on public.no_trade_days from anon;
revoke all on public.settings      from anon;

grant select, insert, update, delete on public.trades        to authenticated;
grant select, insert, update, delete on public.no_trade_days to authenticated;
grant select, insert, update, delete on public.settings      to authenticated;

-- ------------------------------------------------------------
-- 6. STORAGE — prints das operações
-- Bucket privado; cada usuário só acessa a própria pasta
-- (<user_id>/<trade_id>.webp ou .jpg). A leitura é feita por URL assinada.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', false)
on conflict (id) do nothing;

drop policy if exists "trade_screenshots_own" on storage.objects;
create policy "trade_screenshots_own"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'trade-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'trade-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ------------------------------------------------------------
-- 7. CONFERÊNCIA (deve listar as 3 tabelas com rowsecurity = true)
-- ------------------------------------------------------------
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('trades', 'no_trade_days', 'settings')
order by tablename;
