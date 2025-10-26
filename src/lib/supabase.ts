import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'legion-auth-token',
  },
  global: {
    headers: {
      'X-Client-Info': 'legion-web-app',
    },
  },
  db: {
    schema: 'public',
  },
});

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper function to get user profile
export const getUserProfile = async (userId?: string) => {
  const id = userId || (await getCurrentUser())?.id;
  if (!id) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No profile found
      return null;
    }
    throw error;
  }
  return data;
};

// Helper function to check if user is server member
export const isServerMember = async (serverId: string, userId?: string) => {
  const id = userId || (await getCurrentUser())?.id;
  if (!id) return false;

  const { data, error } = await supabase
    .from('server_members')
    .select('role_in_server')
    .eq('server_id', serverId)
    .eq('user_id', id)
    .single();

  if (error) return false;
  return data;
};

// Helper function to check if user is server admin
export const isServerAdmin = async (serverId: string, userId?: string) => {
  const membership = await isServerMember(serverId, userId);
  return membership && membership.role_in_server === 'admin';
};