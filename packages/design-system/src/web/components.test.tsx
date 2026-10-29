import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  NavItem,
  ProgressBar,
  SegmentedControl,
  Select,
  StatCard,
  Textarea,
  TradeCard,
} from '../index';

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

  it('aplica a variante de sucesso', () => {
    render(<Button variant="success">Registrar dia</Button>);

    expect(screen.getByRole('button', { name: 'Registrar dia' })).toHaveClass(
      'asrv-btn--success',
    );
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

  it('aceita data, mínimo e passo para os formulários do diário', () => {
    render(
      <Input
        label="Data"
        type="date"
        value="2026-10-22"
        onChangeText={() => undefined}
        min="2020-01-01"
        step="0.01"
      />,
    );

    const input = screen.getByLabelText('Data');
    expect(input).toHaveAttribute('type', 'date');
    expect(input).toHaveAttribute('min', '2020-01-01');
    expect(input).toHaveAttribute('step', '0.01');
  });
});

describe('Select e Textarea', () => {
  it('emite o valor selecionado', () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Direção"
        value="Compra"
        onChange={onChange}
        options={[
          { value: 'Compra', label: 'Compra (Long)' },
          { value: 'Venda', label: 'Venda (Short)' },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Direção'), { target: { value: 'Venda' } });
    expect(onChange).toHaveBeenCalledWith('Venda');
  });

  it('emite o texto digitado', async () => {
    const onChangeText = vi.fn();
    render(<Textarea label="Observações" value="" onChangeText={onChangeText} />);

    await userEvent.type(screen.getByLabelText('Observações'), 'Plano');
    expect(onChangeText).toHaveBeenCalled();
  });
});

describe('Checkbox', () => {
  it('emite o novo estado', async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Calendário" checked={false} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText('Calendário'));
    expect(onChange).toHaveBeenCalledWith(true);
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

  it('renderiza badge com tom e pílula', () => {
    render(
      <Badge tone="success" pill>
        Sincronizado
      </Badge>,
    );

    const badge = screen.getByText('Sincronizado');
    expect(badge).toHaveAttribute('data-tone', 'success');
    expect(badge).toHaveClass('asrv-badge--pill');
  });

  it('renderiza estatística com rótulo, valor, dica e ícone', () => {
    render(
      <StatCard
        label="Banca"
        value="US$ 1.100,00"
        hint="+10% do inicial"
        hintTone="success"
        icon={<span>icon</span>}
      />,
    );

    expect(screen.getByText('Banca')).toBeInTheDocument();
    expect(screen.getByText('US$ 1.100,00')).toBeInTheDocument();
    expect(screen.getByText('+10% do inicial')).toHaveClass('asrv-stat__hint--success');
    expect(screen.getByText('icon')).toBeInTheDocument();
  });
});

describe('NavItem e SegmentedControl', () => {
  it('marca o item ativo e dispara navegação', async () => {
    const onClick = vi.fn();
    render(
      <NavItem active icon={<span>icon</span>} onClick={onClick}>
        Diário de Trading
      </NavItem>,
    );

    const item = screen.getByRole('button', { name: 'Diário de Trading' });
    expect(item).toHaveClass('is-active');
    expect(item).toHaveAttribute('aria-current', 'page');

    await userEvent.click(item);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('troca a opção selecionada', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        ariaLabel="Visão"
        value="grid"
        onChange={onChange}
        options={[
          { value: 'grid', label: 'Grid Visual' },
          { value: 'list', label: 'Lista' },
        ]}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Grid Visual' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await userEvent.click(screen.getByRole('tab', { name: 'Lista' }));
    expect(onChange).toHaveBeenCalledWith('list');
  });
});

describe('Modal', () => {
  it('não renderiza quando fechado', () => {
    render(
      <Modal open={false} title="Nova operação" onClose={() => undefined}>
        conteúdo
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza aberto, fecha pelo botão e pelo Escape', async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Nova operação" onClose={onClose}>
        conteúdo
      </Modal>,
    );

    expect(screen.getByRole('dialog', { name: 'Nova operação' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('ProgressBar, Alert e EmptyState', () => {
  it('calcula o progresso e expõe semântica acessível', () => {
    render(<ProgressBar label="Ofensiva" value={7} max={14} />);

    const progress = screen.getByRole('progressbar', { name: 'Ofensiva' });
    expect(progress).toHaveAttribute('aria-valuenow', '7');
    expect(progress).toHaveAttribute('aria-valuemax', '14');
  });

  it('renderiza alerta e estado vazio', () => {
    render(
      <>
        <Alert tone="warning">Offline</Alert>
        <EmptyState>Nenhuma operação</EmptyState>
      </>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Offline');
    expect(screen.getByText('Nenhuma operação')).toHaveClass('asrv-empty');
  });
});

describe('TradeCard', () => {
  it('mostra operação vencedora com ações', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <TradeCard
        asset="EURUSD"
        date="2026-10-21"
        type="Compra"
        session="night"
        lots={1}
        pnl={100}
        notes="Rompimento"
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText('EURUSD')).toBeInTheDocument();
    expect(screen.getByText('Noite')).toBeInTheDocument();
    expect(screen.getByText('+ 100.00')).toHaveClass('asrv-positive');
    expect(screen.getByText('Rompimento')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('renderiza break even e esconde o valor quando solicitado', () => {
    render(
      <TradeCard asset="WIN" date="2026-10-20" type="Venda" lots={2} pnl={0.1} hidden />,
    );

    expect(screen.getByText('BREAK EVEN')).toBeInTheDocument();
    expect(screen.getByText('••••••')).toBeInTheDocument();
  });
});
