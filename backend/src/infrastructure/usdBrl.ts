import type { KeyValueStorage } from './storage';

export interface UsdBrlQuote {
  rate: number;
  timestamp: number;
  source?: 'AwesomeAPI' | 'ExchangeRate-API';
  cached?: boolean;
}

const endpoints = [
  'https://economia.awesomeapi.com.br/json/last/USD-BRL',
  'https://open.er-api.com/v6/latest/USD',
];
const cacheKey = 'asrv:usd-brl:v1';
const pollInterval = 60_000;
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const rateFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

function validQuote(quote: UsdBrlQuote): boolean {
  return Number.isFinite(quote.rate) && quote.rate > 0 && Number.isFinite(quote.timestamp)
    && quote.timestamp > 0 && quote.timestamp <= Date.now() + 300_000;
}

export function watchUsdBrlQuote(
  onQuote: (quote: UsdBrlQuote | null) => void,
  storage?: Pick<KeyValueStorage, 'getItem' | 'setItem'>,
): () => void {
  let active = true;
  let received = false;
  let fallback: UsdBrlQuote | undefined;
  let fallbackFetchedAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  // A falha do cache nunca impede a consulta de rede.
  if (storage) void Promise.resolve().then(() => storage.getItem(cacheKey)).then(raw => {
    if (!raw || !active || received) return;
    const cached: UsdBrlQuote = JSON.parse(raw);
    if (validQuote(cached)) onQuote({ ...cached, cached: true });
  }).catch(() => undefined);

  async function refresh() {
    let next: UsdBrlQuote | null = null;
    for (const endpoint of endpoints) {
      if (!active) return;
      if (endpoint === endpoints[1] && fallback && Date.now() - fallbackFetchedAt < 3_600_000) {
        next = fallback;
        break;
      }
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 7_000);
      try {
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) throw new Error('Cotação indisponível');
        const data = await response.json();
        const primary = endpoint === endpoints[0];
        const quote: UsdBrlQuote = {
          rate: Number(primary ? data?.USDBRL?.bid : data?.rates?.BRL),
          timestamp: Number(primary ? data?.USDBRL?.timestamp : data?.time_last_update_unix) * 1000,
          source: primary ? 'AwesomeAPI' : 'ExchangeRate-API',
        };
        if (!validQuote(quote) || (!primary && (data?.result !== 'success' || data?.base_code !== 'USD'))) {
          throw new Error('Cotação inválida');
        }
        if (!primary) { fallback = quote; fallbackFetchedAt = Date.now(); }
        next = quote;
        break;
      } catch {
        // Rede Android, timeout, limite do provedor ou payload inválido: tenta a fonte reserva.
      } finally {
        clearTimeout(timeout);
      }
    }
    if (!active) return;
    received = next !== null;
    onQuote(next);
    if (next && storage) void Promise.resolve().then(() => storage.setItem(cacheKey, JSON.stringify(next))).catch(() => undefined);
    timer = setTimeout(refresh, pollInterval);
  }

  void refresh();
  return () => { active = false; clearTimeout(timer); controller?.abort(); };
}

export function formatBalanceInBrl(
  balance: number, hidden: boolean, quote: UsdBrlQuote | null | undefined, unavailable = false,
): string {
  if (hidden) return 'Saldo em reais: ••••••';
  if (!quote) return quote === null ? 'Cotação indisponível · tente atualizar' : 'Buscando cotação USD/BRL…';
  // Evita depender da base de fusos do Android/Hermes para exibir a conversão.
  const date = new Date(quote.timestamp - 3 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  const time = `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)} · ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  const saved = unavailable || quote.cached;
  const source = saved ? 'Última cotação salva' : quote.source === 'ExchangeRate-API'
    ? 'Referência diária · ExchangeRate-API' : 'AwesomeAPI';
  return `≈ ${brl.format(balance * quote.rate)}\nUS$ 1 = R$ ${rateFormat.format(quote.rate)} · ${time} (Brasília)\n${source}`;
}
