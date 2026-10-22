import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BffProvider } from '../../BffContext';
import { createFakeBff } from '../../test/fakeBff';
import { LoginScreen } from './LoginScreen';

describe('LoginScreen', () => {
  it('envia e-mail e senha e avisa quando entra', async () => {
    const fake = createFakeBff();
    const onSignedIn = vi.fn();
    render(
      <BffProvider bff={fake.bff}>
        <LoginScreen onSignedIn={onSignedIn} />
      </BffProvider>,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('E-mail'), ' samara@example.com ');
    await user.type(screen.getByLabelText('Senha'), 'segredo');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(fake.mocks.signIn).toHaveBeenCalledWith('samara@example.com', 'segredo');
    expect(onSignedIn).toHaveBeenCalledTimes(1);
  });

  it('mostra a mensagem de erro quando o login falha', async () => {
    const fake = createFakeBff();
    fake.mocks.signIn.mockRejectedValueOnce(new Error('E-mail ou senha inválidos.'));
    render(
      <BffProvider bff={fake.bff}>
        <LoginScreen onSignedIn={vi.fn()} />
      </BffProvider>,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('E-mail'), 'samara@example.com');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
  });

  it('não chama o login com campos vazios', async () => {
    const fake = createFakeBff();
    render(
      <BffProvider bff={fake.bff}>
        <LoginScreen onSignedIn={vi.fn()} />
      </BffProvider>,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(fake.mocks.signIn).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Informe e-mail e senha.');
  });
});
