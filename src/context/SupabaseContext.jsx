import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SupabaseContext = createContext(undefined);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient = null;
if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
} else {
  console.warn('Supabase credentials are missing. Add them to your .env file to enable realtime functionality.');
}

export const SupabaseProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let subscription;

    const loadSession = async () => {
      if (!supabaseClient) {
        setInitializing(false);
        return;
      }

      const { data, error } = await supabaseClient.auth.getSession();
      if (!error && isMounted) {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      } else if (error) {
        console.error('Failed to fetch session:', error.message);
      }
      setInitializing(false);

      const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      });
      subscription = listener.subscription;
    };

    loadSession();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      supabase: supabaseClient,
      session,
      user,
      initializing,
      async signIn({ email, password }) {
        if (!supabaseClient) throw new Error('Supabase client is not configured.');
        return supabaseClient.auth.signInWithPassword({ email, password });
      },
      async signUp({ email, password, options }) {
        if (!supabaseClient) throw new Error('Supabase client is not configured.');
        return supabaseClient.auth.signUp({
          email,
          password,
          options
        });
      },
      async signOut() {
        if (!supabaseClient) throw new Error('Supabase client is not configured.');
        return supabaseClient.auth.signOut();
      }
    }),
    [session, user, initializing]
  );

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export const useAuth = () => {
  const { user, session, initializing } = useSupabase();
  return { user, session, initializing };
};
