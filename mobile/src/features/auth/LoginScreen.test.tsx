import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { BffProvider } from '../../BffContext';
import { createFakeBff } from '../../test/fakeBff';
import { LoginScreen } from './LoginScreen';

async function renderLogin() {
  const fake = createFakeBff();
  const onSignedIn = jest.fn();

  await render(
    <BffProvider bff={fake.bff}>
      <LoginScreen onSignedIn={onSignedIn} />
    </BffProvider>,
  );

  return { fake, onSignedIn };
}

describe('LoginScreen (mobile)', () => {
  it('envia e-mail e senha e avisa quando entra', async () => {
    const { fake, onSignedIn } = await renderLogin();

    await fireEvent.changeText(screen.getByLabelText('E-mail'), ' samara@example.com ');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'segredo');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(fake.mocks.signIn).toHaveBeenCalledWith('samara@example.com', 'segredo');
    });
    expect(onSignedIn).toHaveBeenCalledTimes(1);
  });

  it('mostra a mensagem de erro quando o login falha', async () => {
    const { fake } = await renderLogin();
    fake.mocks.signIn.mockRejectedValueOnce(new Error('E-mail ou senha inválidos.'));

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'samara@example.com');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'errada');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeTruthy();
  });

  it('não chama o login com campos vazios', async () => {
    const { fake } = await renderLogin();

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(fake.mocks.signIn).not.toHaveBeenCalled();
    expect(await screen.findByText('Informe e-mail e senha.')).toBeTruthy();
  });
});
