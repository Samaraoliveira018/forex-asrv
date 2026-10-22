export type SupabaseErrorLike = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

/**
 * Subconjunto do cliente Supabase usado pelo BFF.
 * Mantido estrutural para permitir testes com um cliente falso.
 */
export interface SupabaseClientLike {
  from(table: string): any;
  auth: {
    getSession(): Promise<{ data?: any; error: SupabaseErrorLike | null }>;
    signInWithPassword(input: {
      email: string;
      password: string;
    }): Promise<{ data?: any; error: SupabaseErrorLike | null }>;
    signOut(): Promise<{ error: SupabaseErrorLike | null }>;
    onAuthStateChange(
      callback: (event: string, session: unknown) => void,
    ): { data: { subscription: { unsubscribe(): void } } };
  };
}
