import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AuthActionsProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const AuthActions: React.FC<AuthActionsProps> = ({ isMobile = false, onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Check authentication status on mount and auth changes
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsAuthenticated(true);
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUserProfile(profile);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true);
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUserProfile(profile);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    // TODO: Replace with actual Supabase signOut
    setIsAuthenticated(false);
    setIsDropdownOpen(false);
    if (onClose) onClose();
    navigate('/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (onClose) onClose();
  };

  if (isMobile) {
    return (
      <div className="space-y-3">
        {!isAuthenticated ? (
          <>
            <Link to="/sign-up" onClick={onClose}>
              <motion.button
                className="w-full py-3 px-4 rounded-2xl font-semibold bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg hover:opacity-90 transition-opacity duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Join the Brotherhood
              </motion.button>
            </Link>
            <Link to="/sign-in" onClick={onClose}>
              <motion.button
                className="w-full py-3 px-4 rounded-2xl font-semibold border border-violet-500/40 text-violet-400 hover:bg-violet-500/10 transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Login
              </motion.button>
            </Link>
          </>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => handleNavigation('/dashboard')}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-200"
            >
              <User className="h-5 w-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => handleNavigation('/profile')}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-200"
            >
              <Settings className="h-5 w-5" />
              <span>Profile</span>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {!isAuthenticated ? (
        <>
          <Link to="/sign-up">
            <motion.button
              className="rounded-2xl px-6 py-2 font-semibold bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg hover:opacity-90 transition-opacity duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Join
            </motion.button>
          </Link>
          <Link to="/sign-in">
            <motion.button
              className="rounded-2xl px-6 py-2 font-semibold border border-violet-500/40 text-violet-400 hover:bg-violet-500/10 transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Login
            </motion.button>
          </Link>
        </>
      ) : (
        <div className="relative" ref={dropdownRef}>
          <motion.button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 p-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center">
              {userProfile?.avatar_url ? (
                <img 
                  src={userProfile.avatar_url} 
                  alt={userProfile.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-white" />
              )}
            </div>
            {userProfile?.username && (
              <span className="text-sm text-gray-300 hidden sm:block">
                {userProfile.username}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-md rounded-xl border border-gray-800/50 shadow-xl overflow-hidden"
              >
                <div className="py-2">
                  <button
                    onClick={() => handleNavigation('/dashboard')}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-200"
                  >
                    <User className="h-4 w-4" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => handleNavigation('/profile')}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-200"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Profile</span>
                  </button>
                  <div className="border-t border-gray-800/50 my-1" />
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default AuthActions;