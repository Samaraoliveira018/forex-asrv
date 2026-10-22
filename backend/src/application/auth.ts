import { DomainError } from '../domain/errors';
import type { AuthGateway, AuthSession } from './ports';

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  onChange(callback: (session: AuthSession | null) => void): () => void;
}

export function createAuthService(deps: { auth: AuthGateway }): AuthService {
  const { auth } = deps;

  return {
    getSession: () => auth.getSession(),

    signIn(email, password) {
      const normalizedEmail = email.trim();

      if (!normalizedEmail || !password) {
        return Promise.reject(
          new DomainError('INVALID_CREDENTIALS', 'Informe e-mail e senha.'),
        );
      }

      return auth.signIn(normalizedEmail, password);
    },

    signOut: () => auth.signOut(),
    onChange: (callback) => auth.onChange(callback),
  };
}
