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
    raise exception 'O limite de duas operações no dia já foi atingido.';
  end if;
  if mixed_sessions and (adding_to_day or previous_session is distinct from new.session) then
    raise exception 'As operações do dia devem ser da mesma sessão.';
  end if;
  if adding_to_day then
    select round(greatest(0,
      coalesce((select initial_balance from public.settings where user_id = new.user_id), 150)
      + coalesce(sum(pnl), 0)
    ) * 0.10, 2)
    into daily_limit
    from public.trades
    where user_id = new.user_id and "date" < new."date" and id <> new.id;

    if previous_losses >= daily_limit then
      raise exception 'O limite de perda diária já foi atingido.';
    end if;
    -- Novas operações e operações movidas entram no fim da data de destino.
    new.created_at := clock_timestamp();
  end if;
  return new;
end;
$$;
