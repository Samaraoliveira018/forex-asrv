import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createTrade } from '@asrv/backend';
import { BffProvider } from '../../BffContext';
import { createFakeBff, emptySnapshot } from '../../test/fakeBff';
import { JournalScreen } from './JournalScreen';

const trade = createTrade({
  id: 't1',
  date: '2026-10-21',
  asset: 'EURUSD',
  type: 'Compra',
  lots: 1,
  pnl: 100,
  notes: '',
});

function renderJournal() {
  const fake = createFakeBff({ snapshot: emptySnapshot([trade]) });

  render(
    <BffProvider bff={fake.bff}>
      <JournalScreen onSignedOut={vi.fn()} />
    </BffProvider>,
  );

  return fake;
}

describe('JournalScreen', () => {
  it('mostra o resumo e o histórico', async () => {
    renderJournal();

    expect(await screen.findByText('EURUSD')).toBeInTheDocument();
    expect(screen.getByText(/1\.100,00/)).toBeInTheDocument();
    expect(screen.getByText('Ofensiva')).toBeInTheDocument();
  });

  it('registra uma nova operação e atualiza a lista', async () => {
    const fake = renderJournal();
    const user = userEvent.setup();

    fireEvent.change(await screen.findByLabelText('Data'), { target: { value: '2026-10-22' } });
    await user.type(screen.getByLabelText('Ativo'), 'gbpusd');
    await user.selectOptions(screen.getByLabelText('Tipo'), 'Venda');
    await user.clear(screen.getByLabelText('Lotes'));
    await user.type(screen.getByLabelText('Lotes'), '0.5');
    await user.type(screen.getByLabelText('Resultado (US$)'), '-25');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(fake.mocks.saveTrade).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-10-22',
        asset: 'gbpusd',
        type: 'Venda',
        lots: 0.5,
        pnl: -25,
      }),
    );
    expect(await screen.findByText('GBPUSD')).toBeInTheDocument();
  });

  it('mostra os avisos de disciplina devolvidos pelo BFF', async () => {
    const fake = renderJournal();
    fake.mocks.saveTrade.mockResolvedValueOnce({
      trade,
      synced: true,
      warnings: ['Limite de 2 operações por dia atingido.'],
    });
    const user = userEvent.setup();

    await screen.findByLabelText('Ativo');
    await user.type(screen.getByLabelText('Ativo'), 'EURUSD');
    await user.type(screen.getByLabelText('Resultado (US$)'), '10');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Limite de 2 operações por dia atingido.',
    );
  });

  it('exclui uma operação pelo histórico', async () => {
    const fake = renderJournal();
    const user = userEvent.setup();

    await screen.findByText('EURUSD');
    await user.click(screen.getByRole('button', { name: /Excluir EURUSD/ }));

    expect(fake.mocks.deleteTrade).toHaveBeenCalledWith('t1');
    await waitFor(() => expect(screen.queryByText('EURUSD')).not.toBeInTheDocument());
  });

  it('marca o dia de hoje como sem operação', async () => {
    const fake = renderJournal();
    const user = userEvent.setup();

    await screen.findByText('EURUSD');
    await user.click(screen.getByRole('button', { name: 'Hoje sem operar' }));

    expect(fake.mocks.registerNoTradeDay).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });
});
