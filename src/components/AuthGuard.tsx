import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({ children, requireAuth = false, redirectTo = '/chat' }: AuthGuardProps) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('[AuthGuard] Checking authentication status...');

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[AuthGuard] Error checking session:', error);
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(!!session);
          console.log('[AuthGuard] Authentication status:', !!session);
        }

        if (requireAuth && !session) {
          console.log('[AuthGuard] Unauthenticated user on protected route, redirecting to /sign-in');
          navigate('/sign-in', { replace: true });
        } else if (!requireAuth && session) {
          console.log('[AuthGuard] Authenticated user on public route, redirecting to', redirectTo);
          navigate(redirectTo, { replace: true });
        }
      } catch (error) {
        console.error('[AuthGuard] Unexpected error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthGuard] Auth state changed:', event);
      const wasAuthenticated = isAuthenticated;
      const nowAuthenticated = !!session;

      setIsAuthenticated(nowAuthenticated);

      if (requireAuth && !nowAuthenticated) {
        console.log('[AuthGuard] User signed out from protected route');
        navigate('/sign-in', { replace: true });
      } else if (!requireAuth && nowAuthenticated && !wasAuthenticated) {
        console.log('[AuthGuard] User signed in on public route');
        navigate(redirectTo, { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, requireAuth, redirectTo, isAuthenticated]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-cyan-400 rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (!requireAuth && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
