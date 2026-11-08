begin;

create table if not exists public.daily_plans (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  loss_limit numeric(14, 2) check (loss_limit > 0 and loss_limit < 1000000000000),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.daily_plans enable row level security;
drop policy if exists daily_plans_own_rows on public.daily_plans;
create policy daily_plans_own_rows on public.daily_plans for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.daily_plans from anon;
grant select, insert, update, delete on public.daily_plans to authenticated;

drop trigger if exists daily_plans_set_updated_at on public.daily_plans;
create trigger daily_plans_set_updated_at before update on public.daily_plans
  for each row execute function public.set_updated_at();

alter table public.settings add column if not exists reset_at timestamptz;

alter table public.trades add column if not exists weekend_breach boolean not null default false;

create or replace function public.enforce_daily_trade_rules()
returns trigger language plpgsql set search_path = '' as $$
declare
  previous_session text;
  adding_to_day boolean;
  daily_count integer;
  mixed_sessions boolean;
  previous_losses numeric;
  daily_limit numeric;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 2311));
  select session into previous_session from public.trades
    where user_id = new.user_id and id = new.id and "date" = new."date";
  adding_to_day := not found;

  if adding_to_day and extract(isodow from new."date") in (6, 7) and not new.weekend_breach then
    raise exception 'Sábado e domingo são dias sem operar. Confirme a quebra de regra para registrar uma operação já feita.';
  end if;

  select count(*), coalesce(bool_or(session <> new.session), false),
    coalesce(sum(round(greatest(-pnl, 0), 2)), 0)
  into daily_count, mixed_sessions, previous_losses
  from public.trades
  where user_id = new.user_id and "date" = new."date" and id <> new.id;

  if adding_to_day and daily_count >= 2 then
    raise exception 'Você já registrou duas operações nessa data, incluindo break even.';
  end if;
  if mixed_sessions and (adding_to_day or previous_session is distinct from new.session) then
    raise exception 'As duas operações devem ser da mesma sessão.';
  end if;
  select loss_limit into daily_limit from public.daily_plans
    where user_id = new.user_id and day = new."date";
  if adding_to_day and daily_limit is not null and previous_losses >= daily_limit then
    raise exception 'O limite de perda diária já foi atingido.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_daily_trade_rules on public.trades;
create trigger enforce_daily_trade_rules before insert or update on public.trades
  for each row execute function public.enforce_daily_trade_rules();

create or replace function public.reset_trading_journal()
returns text[] language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  deleted_ids text[];
begin
  if owner_id is null then
    raise exception 'Faça login para reiniciar o diário.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 2311));
  with deleted as (delete from public.trades where user_id = owner_id returning id)
  select coalesce(array_agg(id), '{}'::text[]) into deleted_ids from deleted;
  delete from public.no_trade_days where user_id = owner_id;
  delete from public.daily_plans where user_id = owner_id;
  insert into public.settings (user_id, initial_balance, reset_at) values (owner_id, 0, now())
    on conflict (user_id) do update set initial_balance = 0, reset_at = excluded.reset_at;
  return deleted_ids;
end;
$$;

revoke all on function public.reset_trading_journal() from public, anon;
grant execute on function public.reset_trading_journal() to authenticated;

commit;
