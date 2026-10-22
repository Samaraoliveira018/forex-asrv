import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createTrade } from '@asrv/backend';
import { BffProvider } from '../../BffContext';
import { createFakeBff, emptySnapshot, localToday } from '../../test/fakeBff';
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

async function renderJournal() {
  const fake = createFakeBff({ snapshot: emptySnapshot([trade]) });
  const onSignedOut = jest.fn();

  await render(
    <BffProvider bff={fake.bff}>
      <JournalScreen onSignedOut={onSignedOut} />
    </BffProvider>,
  );

  return { fake, onSignedOut };
}

describe('JournalScreen (mobile)', () => {
  it('mostra o resumo e o histórico', async () => {
    await renderJournal();

    expect(await screen.findByText('EURUSD')).toBeTruthy();
    expect(screen.getByText(/1\.100,00/)).toBeTruthy();
    expect(screen.getByText('Ofensiva')).toBeTruthy();
  });

  it('registra uma nova operação e atualiza a lista', async () => {
    const { fake } = await renderJournal();

    await fireEvent.changeText(await screen.findByLabelText('Ativo'), 'gbpusd');
    await fireEvent.press(screen.getByTestId('trade-type-Venda'));
    await fireEvent.changeText(screen.getByLabelText('Lotes'), '0.5');
    await fireEvent.changeText(screen.getByLabelText('Resultado (US$)'), '-25');
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => {
      expect(fake.mocks.saveTrade).toHaveBeenCalledWith(
        expect.objectContaining({
          date: localToday(),
          asset: 'gbpusd',
          type: 'Venda',
          lots: 0.5,
          pnl: -25,
        }),
      );
    });
    expect(await screen.findByText('GBPUSD')).toBeTruthy();
  });

  it('mostra os avisos de disciplina devolvidos pelo BFF', async () => {
    const { fake } = await renderJournal();
    fake.mocks.saveTrade.mockResolvedValueOnce({
      trade,
      synced: true,
      warnings: ['Limite de 2 operações por dia atingido.'],
    });

    await fireEvent.changeText(await screen.findByLabelText('Ativo'), 'EURUSD');
    await fireEvent.changeText(screen.getByLabelText('Resultado (US$)'), '10');
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText('Limite de 2 operações por dia atingido.')).toBeTruthy();
  });

  it('exclui uma operação pelo histórico', async () => {
    const { fake } = await renderJournal();

    await screen.findByText('EURUSD');
    await fireEvent.press(screen.getByLabelText(/Excluir EURUSD/));

    expect(fake.mocks.deleteTrade).toHaveBeenCalledWith('t1');
    await waitFor(() => expect(screen.queryByText('EURUSD')).toBeNull());
  });

  it('marca o dia de hoje como sem operação', async () => {
    const { fake } = await renderJournal();

    await screen.findByText('EURUSD');
    await fireEvent.press(screen.getByRole('button', { name: 'Hoje sem operar' }));

    expect(fake.mocks.registerNoTradeDay).toHaveBeenCalledWith(localToday());
  });

  it('sai da conta', async () => {
    const { fake, onSignedOut } = await renderJournal();

    await fireEvent.press(await screen.findByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(fake.mocks.signOut).toHaveBeenCalled());
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });
});
