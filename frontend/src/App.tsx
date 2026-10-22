import { useEffect, useState } from 'react';
import { useBff } from './BffContext';
import { LoginScreen } from './features/auth/LoginScreen';
import { JournalScreen } from './features/journal/JournalScreen';

type Status = 'loading' | 'anonymous' | 'authenticated';

export function App() {
  const bff = useBff();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let active = true;

    bff
      .ready()
      .then((session) => {
        if (active) setStatus(session ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (active) setStatus('anonymous');
      });

    return () => {
      active = false;
    };
  }, [bff]);

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0f19] text-slate-400">
        <p role="status">Carregando…</p>
      </main>
    );
  }

  if (status === 'anonymous') {
    return <LoginScreen onSignedIn={() => setStatus('authenticated')} />;
  }

  return <JournalScreen onSignedOut={() => setStatus('anonymous')} />;
}
