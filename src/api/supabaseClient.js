import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Supabase features will be disabled.");
}

// Create client with fallbacks to prevent crash during initialization
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : { 
      from: () => {
        const chain = {
          select: () => chain,
          insert: () => chain,
          update: () => chain,
          upsert: () => chain,
          eq: () => chain,
          order: () => chain,
          limit: () => chain,
          single: () => Promise.resolve({ data: null, error: null }),
          then: (fn) => fn({ data: [], error: null })
        };
        return chain;
      },
      channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
      removeChannel: () => {},
      auth: { getUser: () => Promise.resolve({ data: { user: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) }
    };
