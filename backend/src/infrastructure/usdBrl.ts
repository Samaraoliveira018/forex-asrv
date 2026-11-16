export interface UsdBrlQuote {
  rate: number;
  timestamp: number;
}

const endpoint = 'https://economia.awesomeapi.com.br/json/last/USD-BRL';
const pollInterval = 60_000;
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const rateFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
});

export function watchUsdBrlQuote(onQuote: (quote: UsdBrlQuote | null) => void): () => void {
  let active = true;
  let timer: ReturnType<typeof setTimeout>;
  let controller: AbortController;

  async function refresh() {
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(endpoint, { signal: controller.signal });
      if (!response.ok) throw new Error('Cotação indisponível');
      const data = await response.json();
      const rate = Number(data?.USDBRL?.bid);
      const timestamp = Number(data?.USDBRL?.timestamp) * 1000;
      if (!(rate > 0 && Number.isFinite(rate) && timestamp > 0 && timestamp < 8.64e15)) {
        throw new Error('Cotação inválida');
      }
      if (active) onQuote({ rate, timestamp });
    } catch {
      if (active) onQuote(null);
    } finally {
      clearTimeout(timeout);
      if (active) timer = setTimeout(refresh, pollInterval);
    }
  }

  void refresh();
  return () => {
    active = false;
    clearTimeout(timer);
    controller.abort();
  };
}

export function formatBalanceInBrl(
  balance: number, hidden: boolean, quote: UsdBrlQuote | null | undefined, unavailable = false,
): string {
  if (hidden) return 'Saldo em reais: ••••••';
  if (!quote) return quote === null ? 'Cotação USD/BRL indisponível' : 'Buscando cotação USD/BRL…';
  const time = dateFormat.format(quote.timestamp);
  const source = unavailable ? 'Última cotação disponível' : 'AwesomeAPI';
  return `≈ ${brl.format(balance * quote.rate)}\nUS$ 1 = R$ ${rateFormat.format(quote.rate)} · ${time} (Brasília) · ${source}`;
}
