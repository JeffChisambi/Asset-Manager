import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Replace YOUR_SUPABASE_URL with your actual Supabase project URL.
// The key provided by the user:
const supabaseUrl = 'https://uuizijhznsbuugxyjcwo.supabase.co';
const supabaseAnonKey = 'sb_publishable_B0LtJ5eexZ_qj9QssVMf5w_XA3E6BKA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: require('@react-native-async-storage/async-storage').default,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
