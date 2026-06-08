import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://uuizijhznsbuugxyjcwo.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_B0LtJ5eexZ_qj9QssVMf5w_XA3E6BKA';
export const isDummyUrl = supabaseUrl === 'https://uuizijhznsbuugxyjcwo.supabase.co';

// Custom fetch to completely silence Auth background loops when using the dummy URL.
// By returning a Promise that never resolves, we prevent Supabase's GoTrueClient 
// from throwing AuthRetryableFetchError or triggering the React Native ExceptionsManager.
const customFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (isDummyUrl) {
    // Blackhole the request: never resolve, never reject.
    // This safely suspends the background auth token refresh without crashing.
    return new Promise(() => {});
  }

  try {
    return await fetch(url, init);
  } catch (err) {
    // If it's a real project but offline, return a 400 to force a hard fail (no retries/spam)
    return {
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: 'Network offline' }),
      text: async () => JSON.stringify({ error: 'Network offline' }),
      headers: new Headers(),
    } as Response;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: require('@react-native-async-storage/async-storage').default,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: customFetch,
  },
});
