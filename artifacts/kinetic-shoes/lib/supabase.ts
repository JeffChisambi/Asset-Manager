import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://uuizijhznsbuugxyjcwo.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_B0LtJ5eexZ_qj9QssVMf5w_XA3E6BKA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: require('@react-native-async-storage/async-storage').default,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
