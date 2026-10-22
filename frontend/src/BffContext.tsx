import { createContext, useContext, type ReactNode } from 'react';
import type { Bff } from '@asrv/backend';

const BffContext = createContext<Bff | null>(null);

export function BffProvider({ bff, children }: { bff: Bff; children: ReactNode }) {
  return <BffContext.Provider value={bff}>{children}</BffContext.Provider>;
}

export function useBff(): Bff {
  const bff = useContext(BffContext);
  if (!bff) {
    throw new Error('useBff precisa ser usado dentro de BffProvider.');
  }
  return bff;
}
