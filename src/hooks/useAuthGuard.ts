"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const useAuthGuard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        // getUser() makes a network request to verify the token is valid on the server
        // This prevents local storage stale token issues in production
        const { data: { user }, error } = await supabase.auth.getUser();
        if (isMounted) {
          setUser(user);
          setAuthReady(true);
        }
      } catch (error) {
        if (isMounted) {
          setUser(null);
          setAuthReady(true);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted && session?.user) {
        setUser(session.user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, authReady };
};