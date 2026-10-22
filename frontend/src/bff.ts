import { createBff } from '@asrv/backend';

// Chave publicável (a mesma já usada pelo app atual). Nunca usar service_role no cliente.
const fallbackUrl = 'https://atlybzarulwijlepngci.supabase.co';
const fallbackAnonKey = 'sb_publishable_u-A3EfX-ufsbw0-2aaxFaw_1gXagG-0';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackAnonKey;

export const bff = createBff({
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  storage: window.localStorage,
});
