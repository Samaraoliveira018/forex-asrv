create or replace function public.enforce_daily_trade_rules()
returns trigger language plpgsql set search_path = '' as $$
declare
  previous_session text;
  adding_to_day boolean;
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

  select coalesce(bool_or(session <> new.session), false),
    coalesce(sum(round(greatest(-pnl, 0), 2)), 0)
  into mixed_sessions, previous_losses
  from public.trades
  where user_id = new.user_id and "date" = new."date" and id <> new.id;

  if adding_to_day and exists (
    select 1
    from (
      select pnl, lag(pnl) over (order by created_at, id) as previous_pnl
      from public.trades
      where user_id = new.user_id and "date" = new."date" and id <> new.id
    ) as ordered_trades
    where pnl < -0.3 and previous_pnl < -0.3
  ) then
    raise exception 'Stop do dia atingido após duas perdas consecutivas.';
  end if;
  if mixed_sessions and (adding_to_day or previous_session is distinct from new.session) then
    raise exception 'As operações do dia devem ser da mesma sessão.';
  end if;
  select loss_limit into daily_limit from public.daily_plans
    where user_id = new.user_id and day = new."date";
  if adding_to_day and daily_limit is not null and previous_losses >= daily_limit then
    raise exception 'O limite de perda diária já foi atingido.';
  end if;
  -- Registros novos e operações movidas entram no fim da data de destino,
  -- inclusive durante uma importação com várias linhas na mesma transação.
  if adding_to_day then
    new.created_at := clock_timestamp();
  end if;
  return new;
end;
$$;
