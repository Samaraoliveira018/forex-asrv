import { useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@asrv/design-system';
import { useBff } from '../../BffContext';

export function LoginScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const bff = useBff();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setInfo('');

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

  function handleForgotPassword() {
    setInfo('A redefinição de senha é feita no painel do Supabase.');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0f19] px-4 text-slate-100">
      <div className="w-full max-w-sm">
        <Card>
          <div className="flex items-center gap-2">
            <span className="asrv-brand-mark">DT</span>
            <div>
              <h1 className="text-base font-bold text-white">Entrar na nuvem</h1>
              <p className="text-[11px] text-slate-400">
                Seus dados ficam salvos no Supabase
              </p>
            </div>
          </div>

          <form className="mt-4 space-y-3 text-xs" onSubmit={handleSubmit} noValidate>
            <Input
              id="email"
              label="E-mail"
              type="email"
              autoComplete="username"
              placeholder="voce@exemplo.com"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              id="password"
              label="Senha"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
            />

            {error ? (
              <p role="alert" className="asrv-alert asrv-alert--danger">
                {error}
              </p>
            ) : null}

            {info ? (
              <p role="status" className="asrv-alert asrv-alert--warning">
                {info}
              </p>
            ) : null}

            <Button type="submit" loading={loading} fullWidth>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>

            <button type="button" className="asrv-link w-full py-1" onClick={handleForgotPassword}>
              Esqueci a senha
            </button>
          </form>

          <p className="mt-3 border-t border-[#1f2937] pt-3 text-center text-[10px] text-slate-500">
            O cadastro é fechado. Use o usuário criado no painel do Supabase.
          </p>
        </Card>
      </div>
    </main>
  );
}
