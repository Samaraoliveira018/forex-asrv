import { useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@asrv/design-system';
import { useBff } from '../../BffContext';

export function LoginScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const bff = useBff();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.');
      return;
    }

    setLoading(true);
    try {
      await bff.auth.signIn(email.trim(), password);
      onSignedIn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
            Diário Trader
          </p>
          <h1 className="mt-2 text-2xl font-bold">ASRV</h1>
          <p className="mt-2 text-sm text-slate-400">
            Entre para sincronizar suas operações e manter a disciplina.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <Input
              id="email"
              label="E-mail"
              type="email"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              id="password"
              label="Senha"
              type="password"
              autoComplete="current-password"
              value={password}
              onChangeText={setPassword}
            />

            {error ? (
              <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <Button type="submit" loading={loading} fullWidth>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
