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
  it('mostra o resumo, o gráfico e o histórico', async () => {
    renderJournal();

    expect(await screen.findByText('EURUSD')).toBeInTheDocument();
    expect(screen.getAllByText('$ 1,100.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Operações Registradas')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progresso da ofensiva' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Evolução do patrimônio' })).toBeInTheDocument();
  });

  it('registra uma nova operação pelo modal e atualiza a lista', async () => {
    const fake = renderJournal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Nova operação' }));
    fireEvent.change(screen.getByLabelText('Data da Operação'), {
      target: { value: '22/10/26' },
    });
    await user.type(screen.getByLabelText('Ativo'), 'gbpusd');
    await user.selectOptions(screen.getByLabelText('Sessão'), 'night');
    await user.selectOptions(screen.getByLabelText('Direção'), 'Venda');
    await user.clear(screen.getByLabelText('Lotes / Contratos'));
    await user.type(screen.getByLabelText('Lotes / Contratos'), '0.5');
    await user.type(screen.getByLabelText('Resultado Financeiro ($ / R$)'), '-25');
    await user.click(screen.getByRole('button', { name: 'Salvar Operação' }));

    expect(fake.mocks.saveTrade).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-10-22',
        asset: 'gbpusd',
        type: 'Venda',
        session: 'night',
        lots: 0.5,
        pnl: -25,
      }),
      undefined,
    );
    expect(await screen.findByText('GBPUSD')).toBeInTheDocument();
    expect(screen.getAllByText('Noite').length).toBeGreaterThan(0);
  });

  it('anexa um print à operação', async () => {
    const fake = renderJournal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Nova operação' }));
    await user.type(screen.getByLabelText('Ativo'), 'EURUSD');
    await user.type(screen.getByLabelText('Resultado Financeiro ($ / R$)'), '10');

    const file = new File(['print'], 'print.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Anexar print da operação'), {
      target: { files: [file] },
    });

    // Espera a leitura do arquivo (FileReader) refletir no preview.
    await screen.findByAltText('Pré-visualização do print da operação');
    await user.click(screen.getByRole('button', { name: 'Salvar Operação' }));

    expect(fake.mocks.saveTrade).toHaveBeenCalledWith(
      expect.objectContaining({ asset: 'EURUSD' }),
      expect.stringContaining('data:image/png;base64,'),
    );
  });

  it('edita uma operação existente', async () => {
    const fake = renderJournal();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: 'Editar EURUSD de 21/10/26' }),
    );
    expect(screen.getByRole('dialog', { name: 'Editar Operação' })).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Resultado Financeiro ($ / R$)'));
    await user.type(screen.getByLabelText('Resultado Financeiro ($ / R$)'), '120');
    await user.click(screen.getByRole('button', { name: 'Atualizar Operação' }));

    expect(fake.mocks.saveTrade).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', pnl: 120 }),
      undefined,
    );
  });

  it('mostra os avisos de disciplina devolvidos pelo BFF', async () => {
    const fake = renderJournal();
    fake.mocks.saveTrade.mockResolvedValueOnce({
      trade,
      synced: true,
      warnings: ['Limite de 4 operações na sessão Dia atingido (break even não conta).'],
    });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Nova operação' }));
    await user.type(screen.getByLabelText('Ativo'), 'EURUSD');
    await user.type(screen.getByLabelText('Resultado Financeiro ($ / R$)'), '10');
    await user.click(screen.getByRole('button', { name: 'Salvar Operação' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Limite de 4 operações na sessão Dia atingido (break even não conta).',
    );
  });

  it('exclui uma operação pelo histórico', async () => {
    const fake = renderJournal();
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    await user.click(
      await screen.findByRole('button', { name: 'Excluir EURUSD de 21/10/26' }),
    );

    expect(confirm).toHaveBeenCalled();
    expect(fake.mocks.deleteTrade).toHaveBeenCalledWith('t1');
    await waitFor(() => expect(screen.queryByText('EURUSD')).not.toBeInTheDocument());
  });

  it('marca o dia como sem operação', async () => {
    const fake = renderJournal();
    const user = userEvent.setup();
    vi.spyOn(window, 'prompt').mockReturnValue('22/10/26');

    await user.click(await screen.findByRole('button', { name: 'Registrar Dia Sem Operar' }));

    expect(fake.mocks.registerNoTradeDay).toHaveBeenCalledWith('2026-10-22');
  });

  it('navega para o dashboard e para as estatísticas', async () => {
    renderJournal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Dashboard' }));
    expect(screen.getByText('Dashboard Geral')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dados Estatísticos' }));
    expect(screen.getByText('Dados Estatísticos Detalhados')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Distribuição de resultados' })).toBeInTheDocument();
  });

  it('alterna entre grid e lista', async () => {
    renderJournal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('tab', { name: 'Lista' }));
    expect(screen.getByRole('columnheader', { name: 'Ativo' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'EURUSD' })).toBeInTheDocument();
  });

  it('oculta os valores financeiros', async () => {
    renderJournal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Ocultar valores' }));
    expect(screen.getAllByText('••••••').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Mostrar valores' })).toBeInTheDocument();
  });
});
