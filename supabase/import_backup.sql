-- ============================================================
-- Importar um backup exportado pelo app (JSON) direto no Supabase
--
-- Quando usar: se você preferir migrar os dados pelo SQL Editor,
-- sem abrir o app. O app também faz essa migração sozinho
-- (ele pergunta, no primeiro login, se deve enviar os dados locais).
--
-- Passos:
--   1. No app: botão "Exportar" -> gera diario_trader_asrv_backup_AAAA-MM-DD.json
--   2. Abra o JSON e copie apenas o ARRAY de "trades" e o ARRAY de "noTradeDays".
--   3. Troque SEU_EMAIL@EXEMPLO.COM pelo e-mail do usuário criado no Supabase.
--   4. Cole cada array no lugar dos marcadores $json$ [ ] $json$ abaixo.
--   5. Rode no SQL Editor.
--
-- Obs.: rode uma vez para trades e outra para no_trade_days (ou rode
-- o arquivo inteiro, deixando vazio o bloco que não for usar).
-- ============================================================

-- ------------------------------------------------------------
-- A) OPERAÇÕES (trades)
-- ------------------------------------------------------------
with u as (
  select id from auth.users where email = 'SEU_EMAIL@EXEMPLO.COM'
),
payload as (
  select *
  from jsonb_to_recordset(
    $json$
    [
      { "id": "1699999999999-abcde", "date": "2026-10-20", "asset": "EURUSD", "type": "Venda", "lots": 1, "pnl": 25.5, "notes": "exemplo" }
    ]
    $json$::jsonb
  ) as x (id text, "date" date, asset text, type text, lots numeric, pnl numeric, notes text)
)
insert into public.trades (user_id, id, date, asset, type, lots, pnl, notes)
select u.id, p.id, p.date, upper(p.asset), p.type,
       coalesce(p.lots, 1), coalesce(p.pnl, 0), coalesce(p.notes, '')
from u, payload p
on conflict (user_id, id) do update
  set date  = excluded.date,
      asset = excluded.asset,
      type  = excluded.type,
      lots  = excluded.lots,
      pnl   = excluded.pnl,
      notes = excluded.notes;

-- ------------------------------------------------------------
-- B) DIAS SEM OPERAR (no_trade_days)
-- ------------------------------------------------------------
with u as (
  select id from auth.users where email = 'SEU_EMAIL@EXEMPLO.COM'
),
payload as (
  select *
  from jsonb_to_recordset(
    $json$
    [
      "2026-10-21"
    ]
    $json$::jsonb
  ) as x (day date)
)
insert into public.no_trade_days (user_id, day)
select u.id, p.day
from u, payload p
on conflict (user_id, day) do nothing;

-- ------------------------------------------------------------
-- C) SALDO INICIAL (settings)
-- ------------------------------------------------------------
insert into public.settings (user_id, initial_balance)
select id, 150
from auth.users
where email = 'SEU_EMAIL@EXEMPLO.COM'
on conflict (user_id) do update
  set initial_balance = excluded.initial_balance;

-- ------------------------------------------------------------
-- D) CONFERIR O QUE FOI IMPORTADO
-- ------------------------------------------------------------
select
  (select count(*) from public.trades where user_id = u.id)        as trades,
  (select count(*) from public.no_trade_days where user_id = u.id) as no_trade_days,
  (select initial_balance from public.settings where user_id = u.id) as saldo_inicial
from auth.users u
where u.email = 'SEU_EMAIL@EXEMPLO.COM';
