import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({ children, requireAuth = false, redirectTo = '/chat' }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      console.log('[AuthGuard] Checking authentication status...', {
        requireAuth,
        redirectTo,
        currentPath: location.pathname,
      });

      // Set a timeout to prevent infinite loading
      timeoutRef.current = setTimeout(() => {
        if (!isMounted) return;

        console.error('[AuthGuard] Session check timed out after 10 seconds');
        setHasTimedOut(true);
        setIsChecking(false);
        setIsAuthenticated(false);

        // On timeout, redirect based on route type
        if (requireAuth) {
          console.log('[AuthGuard] Timeout on protected route, redirecting to /sign-in');
          navigate('/sign-in', { replace: true });
        }
      }, 10000);

      try {
        const startTime = Date.now();
        const { data: { session }, error } = await supabase.auth.getSession();
        const duration = Date.now() - startTime;

        // Clear timeout if we got a response
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        console.log(`[AuthGuard] Session check completed in ${duration}ms`);

        if (!isMounted) return;

        if (error) {
          console.error('[AuthGuard] Error checking session:', error);
          setIsAuthenticated(false);
          setIsChecking(false);

          // Redirect on error
          if (requireAuth) {
            console.log('[AuthGuard] Error on protected route, redirecting to /sign-in');
            navigate('/sign-in', { replace: true });
          }
          return;
        }

        const authStatus = !!session;
        console.log('[AuthGuard] Authentication status:', authStatus);
        console.log('[AuthGuard] Session user:', session?.user?.email);

        setIsAuthenticated(authStatus);
        setIsChecking(false);

        // Handle redirects based on auth status and route type
        if (requireAuth && !authStatus) {
          console.log('[AuthGuard] Unauthenticated user on protected route, redirecting to /sign-in');
          navigate('/sign-in', { replace: true });
        } else if (!requireAuth && authStatus) {
          console.log('[AuthGuard] Authenticated user on public route, redirecting to', redirectTo);
          navigate(redirectTo, { replace: true });
        } else {
          console.log('[AuthGuard] User is on correct route for auth status');
        }
      } catch (error) {
        console.error('[AuthGuard] Unexpected error:', error);

        // Clear timeout on error
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        if (!isMounted) return;

        setIsAuthenticated(false);
        setIsChecking(false);

        // Redirect on error
        if (requireAuth) {
          console.log('[AuthGuard] Exception on protected route, redirecting to /sign-in');
          navigate('/sign-in', { replace: true });
        }
      }
    };

    checkAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthGuard] Auth state changed:', event);
      const nowAuthenticated = !!session;

      setIsAuthenticated(nowAuthenticated);

      // Handle sign out
      if (event === 'SIGNED_OUT') {
        console.log('[AuthGuard] User signed out');
        if (requireAuth) {
          navigate('/sign-in', { replace: true });
        }
      }

      // Handle sign in
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[AuthGuard] User signed in or token refreshed');
        if (!requireAuth) {
          navigate(redirectTo, { replace: true });
        }
      }
    });

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [location.pathname]); // Only re-run when the path changes

  if (isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-gray-400">
          <div className="w-8 h-8 border-3 border-gray-600 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-lg">Loading...</span>
          {hasTimedOut && (
            <p className="text-sm text-red-400">
              Connection timeout. Redirecting...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (!requireAuth && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
