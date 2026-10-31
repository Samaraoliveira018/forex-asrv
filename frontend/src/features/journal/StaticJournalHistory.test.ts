import { afterEach, describe, expect, it } from 'vitest';
import html from '../../../../index.html?raw';

afterEach(() => { document.body.innerHTML = ''; });

function loadHistory() {
  document.body.innerHTML = html;
  const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)![1];
  const api = new Function('document', 'window', `${source}\nreturn {
    seed: (items, days) => { trades = items; noTradeDays = days; },
    select: setJournalDate,
    filter: value => { journalResultFilter = value; refreshUI(); },
    hide: () => { isValueHidden = true; refreshUI(); }
  };`)(document, { addEventListener() {} });
  api.seed([
    { id: 'win', date: '2026-10-20', asset: 'EURUSD', pnl: 20, session: 'day', type: 'Compra', lots: 1 },
    { id: 'loss', date: '2026-10-20', asset: 'GBPUSD', pnl: -7, session: 'day', type: 'Venda', lots: 1 },
    { id: 'be', date: '2026-10-20', asset: 'USDJPY', pnl: -0.1, session: 'night', type: 'Compra', lots: 1 },
    { id: 'other', date: '2026-10-21', asset: 'XAUUSD', pnl: 50, session: 'day', type: 'Compra', lots: 1 },
  ], ['2026-10-19']);
  return api;
}

describe('Histórico da página estática', () => {
  it('filtra grid e lista pela data, mantém os totais ao filtrar resultados e respeita ocultar valores', () => {
    const api = loadHistory();
    api.select('2026-10-20');
    const grid = document.getElementById('journal-grid-view')!;
    const list = document.getElementById('trades-table-body')!;
    const summary = document.getElementById('journal-day-summary')!;
    expect(grid).toHaveTextContent('EURUSD');
    expect(grid).not.toHaveTextContent('XAUUSD');
    expect(list).not.toHaveTextContent('XAUUSD');
    expect(summary).toHaveTextContent('- $ 7.10');
    expect(summary).toHaveTextContent('+ $ 12.90');
    api.filter('loss');
    expect(grid).toHaveTextContent('GBPUSD');
    expect(grid).not.toHaveTextContent('USDJPY');
    expect(list).not.toHaveTextContent('EURUSD');
    expect(summary).toHaveTextContent('+ $ 12.90');
    api.filter('be');
    expect(grid).toHaveTextContent('USDJPY');
    expect(list).not.toHaveTextContent('GBPUSD');
    api.hide();
    expect(summary).not.toHaveTextContent('12.90');
    expect(summary).toHaveTextContent('••••••');
  });

  it('mostra dias sem operar e permite voltar ao histórico completo', () => {
    const api = loadHistory();
    api.select('2026-10-19');
    expect(document.getElementById('journal-grid-view')).toHaveTextContent('Preservação de Capital');
    expect(document.getElementById('trades-table-body')).toHaveTextContent('Dia registrado sem operar');
    api.select('2026-10-18');
    expect(document.getElementById('journal-grid-view')).toHaveTextContent('Nenhum registro');
    api.select('');
    expect(document.getElementById('trades-table-body')).toHaveTextContent('XAUUSD');
  });
});
