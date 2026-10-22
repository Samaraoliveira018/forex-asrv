import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBff } from '@asrv/backend';

// Chave publicável (a mesma já usada no app web). Nunca usar service_role no cliente.
const fallbackUrl = 'https://atlybzarulwijlepngci.supabase.co';
const fallbackAnonKey = 'sb_publishable_u-A3EfX-ufsbw0-2aaxFaw_1gXagG-0';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || fallbackUrl;
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || fallbackAnonKey;

export const bff = createBff({
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  storage: {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
  },
});
