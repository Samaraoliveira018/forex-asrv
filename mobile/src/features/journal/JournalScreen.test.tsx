import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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

async function renderJournal(options: {
  trades?: ReturnType<typeof createTrade>[];
  noTradeDays?: string[];
  initialBalance?: number;
} = {}) {
  const fake = createFakeBff({
    snapshot: emptySnapshot(
      options.trades ?? [trade],
      options.noTradeDays ?? [],
      options.initialBalance ?? 1000,
    ),
  });
  const onSignedOut = jest.fn();

  await render(
    <BffProvider bff={fake.bff}>
      <JournalScreen onSignedOut={onSignedOut} />
    </BffProvider>,
  );

  return { fake, onSignedOut };
}

async function openNewTradeModal() {
  await fireEvent.press(screen.getByRole('button', { name: 'Nova operação' }));
  expect(await screen.findByText('Registrar Nova Operação')).toBeTruthy();
}

describe('JournalScreen (mobile)', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const destructive = buttons?.find((button) => button.style === 'destructive');
      destructive?.onPress?.();
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mostra o resumo, a ofensiva e o histórico', async () => {
    await renderJournal();

    expect(await screen.findByText('EURUSD')).toBeTruthy();
    expect(screen.getAllByText('US$ 1.100,00').length).toBeGreaterThan(0);
    expect(screen.getByText('Metas de Ofensiva (Disciplina Trader)')).toBeTruthy();
    expect(screen.getByText(/Dia: 0\/6 trades/)).toBeTruthy();
    expect(screen.getByText(/Noite: 0\/6 trades/)).toBeTruthy();
  });

  it('registra uma nova operação pelo modal e atualiza a lista', async () => {
    const { fake } = await renderJournal();

    await openNewTradeModal();
    await fireEvent.changeText(screen.getByLabelText('Ativo'), 'gbpusd');
    await fireEvent.press(screen.getByRole('tab', { name: 'Noite' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Venda (Short)' }));
    await fireEvent.changeText(screen.getByLabelText('Lotes / Contratos'), '0.5');
    await fireEvent.changeText(screen.getByLabelText('Resultado'), '-25');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar Operação' }));

    await waitFor(() => {
      expect(fake.mocks.saveTrade).toHaveBeenCalledWith(
        expect.objectContaining({
          date: localToday(),
          asset: 'gbpusd',
          type: 'Venda',
          session: 'night',
          lots: 0.5,
          pnl: -25,
        }),
        undefined,
      );
    });
    expect(await screen.findByText('GBPUSD')).toBeTruthy();
  });

  it('anexa um print à operação', async () => {
    const { fake } = await renderJournal();

    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file://print.jpg',
          width: 800,
          height: 600,
          base64: 'AAECAwQ=',
          mimeType: 'image/jpeg',
        },
      ],
    });

    await openNewTradeModal();
    await fireEvent.changeText(screen.getByLabelText('Ativo'), 'EURUSD');
    await fireEvent.changeText(screen.getByLabelText('Resultado'), '10');
    await fireEvent.press(screen.getByTestId('attach-screenshot'));

    await waitFor(() => expect(screen.getByText('Trocar print')).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar Operação' }));

    await waitFor(() => {
      expect(fake.mocks.saveTrade).toHaveBeenCalledWith(
        expect.objectContaining({ asset: 'EURUSD' }),
        'data:image/webp;base64,AAECAwQ=',
      );
    });
  });

  it('edita uma operação existente mantendo o id', async () => {
    const { fake } = await renderJournal();

    await screen.findByText('EURUSD');
    await fireEvent.press(screen.getByLabelText('Editar EURUSD de 21/10/26'));
    expect(await screen.findByText('Editar Operação')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Resultado'), '150');
    await fireEvent.press(screen.getByRole('button', { name: 'Atualizar Operação' }));

    await waitFor(() => {
      expect(fake.mocks.saveTrade).toHaveBeenCalledWith(
        expect.objectContaining({ id: 't1', pnl: 150 }),
        undefined,
      );
    });
    expect((await screen.findAllByText('US$ 1.150,00')).length).toBeGreaterThan(0);
  });

  it('mostra os avisos de disciplina devolvidos pelo BFF', async () => {
    const { fake } = await renderJournal();
    fake.mocks.saveTrade.mockResolvedValueOnce({
      trade,
      synced: true,
      warnings: ['Limite de 6 operações na sessão Dia atingido (break even não conta).'],
    });

    await openNewTradeModal();
    await fireEvent.changeText(screen.getByLabelText('Ativo'), 'EURUSD');
    await fireEvent.changeText(screen.getByLabelText('Resultado'), '10');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar Operação' }));

    expect(await screen.findByText('Limite de 6 operações na sessão Dia atingido (break even não conta).')).toBeTruthy();
  });

  it('exclui uma operação pelo histórico após confirmação', async () => {
    const { fake } = await renderJournal();

    await screen.findByText('EURUSD');
    await fireEvent.press(screen.getByLabelText('Excluir EURUSD de 21/10/26'));

    await waitFor(() => expect(fake.mocks.deleteTrade).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(screen.queryByText('EURUSD')).toBeNull());
  });

  it('registra e remove um dia sem operação', async () => {
    const { fake } = await renderJournal();

    await screen.findByText('EURUSD');
    await fireEvent.press(screen.getByRole('button', { name: 'Dia sem operar' }));
    expect(await screen.findByText('Registrar Dia Sem Operar')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Data sem operação'), '20/10/26');
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() =>
      expect(fake.mocks.registerNoTradeDay).toHaveBeenCalledWith('2026-10-20'),
    );
    expect(await screen.findByText(/Preservação de Capital/)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Excluir dia sem operar 20/10/26'));
    await waitFor(() =>
      expect(fake.mocks.removeNoTradeDay).toHaveBeenCalledWith('2026-10-20'),
    );
  });

  it('edita o saldo inicial pelo topo', async () => {
    const { fake } = await renderJournal();

    await fireEvent.press(await screen.findByLabelText('Editar saldo inicial'));
    expect((await screen.findAllByText('Saldo Inicial')).length).toBeGreaterThan(0);
    await fireEvent.changeText(screen.getByLabelText('Saldo Inicial'), '1500');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar Saldo' }));

    await waitFor(() =>
      expect(fake.mocks.saveInitialBalance).toHaveBeenCalledWith(1500),
    );
    expect(await screen.findByText('US$ 1.500,00')).toBeTruthy();
  });

  it('alterna entre grid e lista e oculta os valores', async () => {
    await renderJournal();

    await screen.findByText('EURUSD');
    expect(screen.getByText(/Lotes \/ Contratos/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Lista' }));
    await waitFor(() => expect(screen.queryByText(/Lotes \/ Contratos/)).toBeNull());
    expect(screen.getByText('1 lote(s)', { exact: false })).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Ocultar valores'));
    expect(screen.getAllByText('••••••').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Mostrar valores')).toBeTruthy();
  });

  it('navega entre Dashboard, Diário, Plano e Estatísticas', async () => {
    await renderJournal();

    await fireEvent.press(screen.getByRole('tab', { name: 'Dashboard' }));
    expect(await screen.findByText('Dashboard Geral')).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Plano' }));
    expect(await screen.findByText('Plano Operacional & Disciplina')).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Estatísticas' }));
    expect(await screen.findByText('Dados Estatísticos Detalhados')).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Diário' }));
    expect(await screen.findByText('Diário de Trading')).toBeTruthy();
  });

  it('importa um backup JSON pelo menu de ações', async () => {
    const { fake } = await renderJournal();

    await fireEvent.press(screen.getByLabelText('Mais ações'));
    expect(await screen.findByText('Armazenamento e Dados')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Importar JSON' }));
    expect(await screen.findByText('Importar JSON')).toBeTruthy();

    const payload = JSON.stringify({
      trades: [
        {
          id: 't2',
          date: '2026-10-19',
          asset: 'GBPUSD',
          type: 'Venda',
          lots: 0.5,
          pnl: -20,
          notes: 'Importada',
        },
      ],
      noTradeDays: ['2026-10-18'],
      initialBalance: 1200,
    });

    await fireEvent.changeText(screen.getByLabelText('Conteúdo JSON'), payload);
    await fireEvent.press(screen.getByRole('button', { name: 'Importar Dados' }));

    await waitFor(() => {
      expect(fake.mocks.saveTrade).toHaveBeenCalledWith(
        expect.objectContaining({ asset: 'GBPUSD' }),
      );
    });
    await waitFor(() =>
      expect(fake.mocks.registerNoTradeDay).toHaveBeenCalledWith('2026-10-18'),
    );
    expect(fake.mocks.saveInitialBalance).toHaveBeenCalledWith(1200);
    expect(await screen.findByText('GBPUSD')).toBeTruthy();
  });

  it('reseta o histórico pelo menu de ações', async () => {
    const { fake } = await renderJournal();

    await screen.findByText('EURUSD');
    await fireEvent.press(screen.getByLabelText('Mais ações'));
    await fireEvent.press(screen.getByRole('button', { name: 'Resetar Todos os Dados' }));

    await waitFor(() => expect(fake.mocks.deleteTrade).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(screen.queryByText('EURUSD')).toBeNull());
  });

  it('sincroniza pendências pelo topo', async () => {
    const fake = createFakeBff();
    fake.mocks.pendingCount.mockResolvedValue(2);
    const onSignedOut = jest.fn();

    await render(
      <BffProvider bff={fake.bff}>
        <JournalScreen onSignedOut={onSignedOut} />
      </BffProvider>,
    );

    expect(await screen.findByText('2 pendência(s)')).toBeTruthy();
    fake.mocks.pendingCount.mockResolvedValue(0);
    await fireEvent.press(screen.getByLabelText('Sincronizar dados'));

    await waitFor(() => expect(fake.mocks.flush).toHaveBeenCalled());
    expect(await screen.findByText('Em dia')).toBeTruthy();
  });

  it('sai da conta', async () => {
    const { fake, onSignedOut } = await renderJournal();

    await fireEvent.press(await screen.findByLabelText('Mais ações'));
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));

    await waitFor(() => expect(fake.mocks.signOut).toHaveBeenCalled());
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });
});
