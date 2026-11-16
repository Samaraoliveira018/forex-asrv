import { afterEach, expect, it, vi } from 'vitest';
import { formatBalanceInBrl, watchUsdBrlQuote } from './usdBrl';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('converte o saldo pela última cotação e oculta o valor no modo privado', () => {
  const quote = { rate: 5.5, timestamp: Date.UTC(2026, 10, 16, 14, 30) };
  expect(formatBalanceInBrl(80, false, quote)).toMatch(/R\$\s*440,00/);
  expect(formatBalanceInBrl(80, false, quote, true)).toContain('Última cotação disponível');
  expect(formatBalanceInBrl(80, true, quote)).toBe('Saldo em reais: ••••••');
});

it('consulta apenas USD/BRL, atualiza a cada minuto e sinaliza respostas inválidas', async () => {
  vi.useFakeTimers();
  const request = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ USDBRL: { bid: '5.5', timestamp: '1794839466' } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ USDBRL: { bid: '0' } }) });
  vi.stubGlobal('fetch', request);
  const onQuote = vi.fn();
  const stop = watchUsdBrlQuote(onQuote);
  await vi.advanceTimersByTimeAsync(0);
  expect(request).toHaveBeenCalledWith('https://economia.awesomeapi.com.br/json/last/USD-BRL', expect.anything());
  expect(onQuote).toHaveBeenLastCalledWith({ rate: 5.5, timestamp: 1794839466000 });
  await vi.advanceTimersByTimeAsync(60_000);
  expect(onQuote).toHaveBeenLastCalledWith(null);
  stop();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(request).toHaveBeenCalledTimes(2);
});
