import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTrade } from '@asrv/backend';
import { App } from './App';
import { BffProvider } from './BffContext';
import { createFakeBff, emptySnapshot } from './test/fakeBff';

const session = { userId: 'user-1', email: 'samara@example.com' };

describe('App', () => {
  it('mostra o login quando não há sessão', async () => {
    const fake = createFakeBff({ session: null });

    render(
      <BffProvider bff={fake.bff}>
        <App />
      </BffProvider>,
    );

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('abre o diário direto quando a sessão já está salva', async () => {
    const trade = createTrade({
      id: 't1',
      date: '2026-10-21',
      asset: 'EURUSD',
      type: 'Compra',
      lots: 1,
      pnl: 100,
    });
    const fake = createFakeBff({
      session,
      snapshot: emptySnapshot([trade]),
    });

    render(
      <BffProvider bff={fake.bff}>
        <App />
      </BffProvider>,
    );

    expect(await screen.findByText('EURUSD')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
  });
});
