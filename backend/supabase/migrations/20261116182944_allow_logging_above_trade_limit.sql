create or replace function public.enforce_daily_trade_rules()
returns trigger language plpgsql set search_path = '' as $$
declare
  adding_to_day boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 2311));
  adding_to_day := not exists (
    select 1 from public.trades
    where user_id = new.user_id and id = new.id and "date" = new."date"
  );

  if adding_to_day then
    -- Novas operações e operações movidas entram no fim da data de destino.
    new.created_at := clock_timestamp();
  end if;
  return new;
end;
$$;
