import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || Constants.manifest?.extra) as {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
} | undefined;

const supabaseUrl = extra?.SUPABASE_URL;
const supabaseAnonKey = extra?.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are not defined.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
