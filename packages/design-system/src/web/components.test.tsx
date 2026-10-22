import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Badge, Button, Card, Input, StatCard } from '../index';

describe('Button', () => {
  it('dispara onPress', async () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Registrar</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('não dispara quando desabilitado', async () => {
    const onPress = vi.fn();
    render(
      <Button onPress={onPress} disabled>
        Registrar
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('bloqueia e sinaliza carregamento', async () => {
    const onPress = vi.fn();
    render(
      <Button onPress={onPress} loading>
        Entrar
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Entrar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    await userEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Input', () => {
  it('associa label e emite onChangeText', () => {
    const onChangeText = vi.fn();
    render(<Input label="E-mail" value="" onChangeText={onChangeText} />);

    const input = screen.getByLabelText('E-mail');
    expect(input).toBeInTheDocument();

    const user = userEvent.setup();
    return user.type(input, 'a').then(() => {
      expect(onChangeText).toHaveBeenCalled();
      expect(onChangeText.mock.calls.at(-1)?.[0]).toBe('a');
    });
  });

  it('mostra erro acessível', () => {
    render(<Input label="Senha" value="" onChangeText={() => undefined} error="Obrigatória" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Obrigatória');
  });

  it('respeita o tipo password', () => {
    render(<Input label="Senha" type="password" value="segredo" onChangeText={() => undefined} />);

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });
});

describe('Card, Badge e StatCard', () => {
  it('renderiza conteúdo do card', () => {
    render(
      <Card>
        <p>Conteúdo</p>
      </Card>,
    );

    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('expõe região acessível quando recebe ariaLabel', () => {
    render(
      <Card ariaLabel="Resumo">
        <p>Conteúdo</p>
      </Card>,
    );

    expect(screen.getByRole('region', { name: 'Resumo' })).toBeInTheDocument();
  });

  it('renderiza badge com tom', () => {
    render(<Badge tone="success">Sincronizado</Badge>);

    expect(screen.getByText('Sincronizado')).toHaveAttribute('data-tone', 'success');
  });

  it('renderiza estatística com rótulo e valor', () => {
    render(<StatCard label="Banca" value="US$ 1.100,00" />);

    expect(screen.getByText('Banca')).toBeInTheDocument();
    expect(screen.getByText('US$ 1.100,00')).toBeInTheDocument();
  });
});
