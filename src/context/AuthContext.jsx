import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './ToastContext';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Validate JWT against Supabase servers first (not just local storage)
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        setSession(null);
        setLoading(false);
      } else {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          setLoading(false);
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_OUT') {
        navigate('/login', { replace: true });
      }
      if (_event === 'TOKEN_REFRESHED' && !session) {
        showToast('Session expired. Please sign in again.', 'error');
        navigate('/login', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, showToast]);

  const value = {
    session,
    user: session?.user ?? null,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
