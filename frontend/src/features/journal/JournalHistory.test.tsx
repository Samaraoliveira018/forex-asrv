import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTrade } from '@asrv/backend';
import { emptySnapshot } from '../../test/fakeBff';
import { JournalTab } from './JournalTab';

const trades = [
  ['win', '2026-10-20', 'EURUSD', 20],
  ['loss', '2026-10-20', 'GBPUSD', -7],
  ['be', '2026-10-20', 'USDJPY', -0.1],
  ['other', '2026-10-21', 'XAUUSD', 50],
].map(([id, date, asset, pnl]) => createTrade({ id: String(id), date: String(date), asset: String(asset), pnl: Number(pnl), type: 'Compra', lots: 0.01 }));

function setup(hidden = false, view: 'grid' | 'list' = 'grid') {
  render(<JournalTab snapshot={emptySnapshot(trades, ['2026-10-19'])} hidden={hidden} market="internacional" view={view} onMarketChange={vi.fn()} onViewChange={vi.fn()} onToggleHidden={vi.fn()} onNewTrade={vi.fn()} onEditTrade={vi.fn()} onDeleteTrade={vi.fn()} onNoTradeDay={vi.fn()} onDeleteNoTradeDay={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Data do diário'), { target: { value: '2026-10-20' } });
}

describe('Consulta do diário por data', () => {
  it('mostra apenas as operações da data e soma ganhos, perdas e BE no resultado', () => {
    setup();
    expect(screen.getByText('EURUSD')).toBeInTheDocument();
    expect(screen.queryByText('XAUUSD')).not.toBeInTheDocument();
    const summary = within(screen.getByLabelText('Resumo do histórico'));
    expect(summary.getByText('+ $ 20.00')).toBeInTheDocument();
    expect(summary.getByText('- $ 7.10')).toBeInTheDocument();
    expect(summary.getByText('+ $ 12.90')).toBeInTheDocument();
    expect(summary.getByText('3')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mostrar operações'), { target: { value: 'loss' } });
    expect(screen.getByText('GBPUSD')).toBeInTheDocument();
    expect(screen.queryByText('USDJPY')).not.toBeInTheDocument();
    expect(screen.queryByText('EURUSD')).not.toBeInTheDocument();
    expect(summary.getByText('+ $ 12.90')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mostrar operações'), { target: { value: 'be' } });
    expect(screen.getByText('USDJPY')).toBeInTheDocument();
    expect(screen.queryByText('GBPUSD')).not.toBeInTheDocument();
  });

  it('consulta dias sem operar, datas vazias e restaura todos os dias na lista', () => {
    setup(false, 'list');
    fireEvent.change(screen.getByLabelText('Data do diário'), { target: { value: '2026-10-19' } });
    expect(screen.getByText(/Dia registrado sem operar/)).toBeInTheDocument();
    expect(screen.queryByText('EURUSD')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Data do diário'), { target: { value: '2026-10-18' } });
    expect(screen.getByRole('status')).toHaveTextContent('Nenhum registro');
    fireEvent.click(screen.getByRole('button', { name: 'Todos os dias' }));
    expect(screen.getByText('XAUUSD')).toBeInTheDocument();
    expect(screen.getByText('EURUSD')).toBeInTheDocument();
  });

  it('oculta os valores financeiros também no resumo da data', () => {
    setup(true);
    const summary = within(screen.getByLabelText('Resumo do histórico'));
    expect(summary.getAllByText('••••••')).toHaveLength(3);
    expect(summary.queryByText('+ $ 12.90')).not.toBeInTheDocument();
  });
});
