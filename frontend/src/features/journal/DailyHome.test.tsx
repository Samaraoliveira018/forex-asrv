import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTrade } from '@asrv/backend';
import { emptySnapshot } from '../../test/fakeBff';
import { DailyHome } from './DailyHome';
import { today } from './format';

const callbacks = { onRefreshQuote: vi.fn(), onToggleHidden: vi.fn(), onNewTrade: vi.fn(), onOpenHistory: vi.fn(), onOpenPlan: vi.fn(), onNoTradeDay: vi.fn(), onEditTrade: vi.fn() };

describe('Tela inicial simplificada', () => {
  it('conta BE no total e reserva os limites para stops e takes', () => {
    const trades = [-1.99, 1.99, -2, 2].map((pnl, i) => createTrade({ id: String(i), date: today(), asset: `EURUSD${i}`, type: 'Compra', lots: 1, pnl }));
    const snapshot = emptySnapshot(trades);
    render(<DailyHome snapshot={snapshot} hidden={false} quote={{ rate: 5, timestamp: Date.now() }} {...callbacks} />);
    const counters = within(screen.getByLabelText('Contadores de hoje'));
    expect(counters.getByText('Operações hoje: 4')).toBeInTheDocument();
    expect(counters.getByText('Stop Loss: 1/2')).toBeInTheDocument();
    expect(counters.getByText('Take Profit: 1/2')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText(/2 BE hoje/)).toBeInTheDocument();
    expect(snapshot.stats.balance).toBe(snapshot.initialBalance);
  });
  it('avisa ao segundo take e mantém o registro disponível', () => {
    const trades = [10, 0, 10].map((pnl, i) => createTrade({ id: String(i), date: today(), asset: `XAUUSD${i}`, type: 'Compra', lots: 1, pnl }));
    render(<DailyHome snapshot={emptySnapshot(trades)} hidden={true} quote={undefined} {...callbacks} />);
    expect(screen.getByRole('status')).toHaveTextContent('Encerre por hoje');
    expect(screen.getByRole('button', { name: 'Nova operação' })).toBeEnabled();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });
});
