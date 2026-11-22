alter table public.trades
  add column if not exists risk_reward numeric
  check (risk_reward > 0 and risk_reward < 'Infinity'::numeric);
