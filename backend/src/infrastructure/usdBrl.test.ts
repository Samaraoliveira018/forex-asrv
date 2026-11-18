import { afterEach, expect, it, vi } from 'vitest';
import { formatBalanceInBrl, watchUsdBrlQuote } from './usdBrl';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const stamp = 1794839466;
const primary = { ok: true, json: async () => ({ USDBRL: { bid: '5.5', timestamp: String(stamp) } }) };
const backup = { ok: true, json: async () => ({ result: 'success', base_code: 'USD', rates: { BRL: 5.4 }, time_last_update_unix: stamp }) };

it('converte o saldo, mostra horário de Brasília, sinaliza cache e oculta valores', () => {
  const quote = { rate: 5.5, timestamp: Date.UTC(2026, 10, 16, 14, 30) };
  expect(formatBalanceInBrl(80, false, quote)).toMatch(/R\$\s*440,00/);
  expect(formatBalanceInBrl(80, false, quote)).toContain('11:30');
  expect(formatBalanceInBrl(80, false, quote, true)).toContain('Última cotação salva');
  expect(formatBalanceInBrl(80, true, quote)).toBe('Saldo em reais: ••••••');
  expect(formatBalanceInBrl(80, false, { ...quote, source: 'ExchangeRate-API' })).toContain('Referência diária');
});

it('atualiza a fonte principal a cada minuto e cancela o polling ao desmontar', async () => {
  vi.useFakeTimers();
  const request = vi.fn().mockResolvedValue(primary);
  vi.stubGlobal('fetch', request);
  const onQuote = vi.fn();
  const stop = watchUsdBrlQuote(onQuote);
  await vi.advanceTimersByTimeAsync(0);
  expect(request).toHaveBeenCalledWith('https://economia.awesomeapi.com.br/json/last/USD-BRL', expect.anything());
  expect(onQuote).toHaveBeenLastCalledWith({ rate: 5.5, timestamp: stamp * 1000, source: 'AwesomeAPI' });
  await vi.advanceTimersByTimeAsync(60_000);
  expect(request).toHaveBeenCalledTimes(2);
  stop();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(request).toHaveBeenCalledTimes(2);
});

it('usa fonte diária no erro de rede/429 e reutiliza a reserva sem requisitá-la a cada minuto', async () => {
  vi.useFakeTimers();
  const request = vi.fn().mockResolvedValue({ ok: false }).mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce(backup);
  vi.stubGlobal('fetch', request);
  const onQuote = vi.fn();
  const stop = watchUsdBrlQuote(onQuote);
  await vi.advanceTimersByTimeAsync(0);
  expect(onQuote).toHaveBeenLastCalledWith({ rate: 5.4, timestamp: stamp * 1000, source: 'ExchangeRate-API' });
  await vi.advanceTimersByTimeAsync(60_000);
  expect(request).toHaveBeenCalledTimes(3);
  stop();
});

it('rejeita taxas inválidas nas duas fontes e mantém cache recuperável', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ USDBRL: { bid: '0' } }) }));
  const onQuote = vi.fn();
  const cache = { rate: 5.3, timestamp: stamp * 1000, source: 'AwesomeAPI' };
  const storage = { getItem: vi.fn(async () => JSON.stringify(cache)), setItem: vi.fn() };
  const stop = watchUsdBrlQuote(onQuote, storage);
  await vi.advanceTimersByTimeAsync(0);
  expect(onQuote).toHaveBeenCalledWith({ ...cache, cached: true });
  expect(onQuote).toHaveBeenLastCalledWith(null);
  expect(storage.setItem).not.toHaveBeenCalled();
  stop();
});

it('não publica resposta nem agenda polling após cancelamento durante uma consulta', async () => {
  vi.useFakeTimers();
  let finish!: (value: typeof primary) => void;
  vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { finish = resolve; })));
  const onQuote = vi.fn();
  const stop = watchUsdBrlQuote(onQuote);
  stop(); finish(primary);
  await vi.advanceTimersByTimeAsync(0);
  expect(onQuote).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
