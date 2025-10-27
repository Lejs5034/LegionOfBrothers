import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Crown, MessageCircle } from 'lucide-react';
import { supabase, getCurrentUser, getUserProfile } from '../lib/supabase';
import type { Profile } from '../types/database';
import ChatPanel from '../components/Chat/ChatPanel';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate('/sign-in', { replace: true });
          return;
        }

        let userProfile = await getUserProfile(user.id);
        
        // If no profile exists, create one (first login after email confirmation)
        if (!userProfile) {
          const username = user.user_metadata?.username || 'User';
          
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: username,
              role: 'user'
            })
            .select()
            .single();

          if (profileError) {
            console.error('Profile creation failed:', profileError);
            throw profileError;
          }
          
          userProfile = newProfile;
        }
        
        setProfile(userProfile);
      } catch (error) {
        console.error('Error loading user data:', error);
        navigate('/sign-in', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Error loading profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900/20 pt-20 px-4">
      <div className="fixed top-4 right-4 z-30 flex items-center space-x-3">
        <motion.button
          onClick={() => setIsChatOpen(prev => !prev)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full text-white shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
          title="Toggle Chat"
        >
          <MessageCircle size={24} />
        </motion.button>

        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <User size={24} className="text-white" />
          )}
        </div>
      </div>

      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.h1 
            className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            WELCOME TO THE LEGION
          </motion.h1>
          <p className="text-xl text-gray-300">
            Welcome back, <span className="text-cyan-400 font-bold">{profile.username}</span>
          </p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-md rounded-3xl border border-gray-700/50 p-8 mb-8"
        >
          <div className="flex items-center space-x-6 mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.username}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <User size={40} className="text-white" />
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">{profile.username}</h2>
              <div className="flex items-center space-x-2">
                {profile.role === 'admin' || profile.role === 'superadmin' ? (
                  <Crown size={20} className="text-yellow-400" />
                ) : null}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  profile.role === 'superadmin' 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                    : profile.role === 'admin'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                }`}>
                  {profile.role.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-800/50 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-2">Member Since</h3>
              <p className="text-cyan-400">
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-2">Servers</h3>
              <p className="text-purple-400">0</p>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-2">Courses</h3>
              <p className="text-pink-400">0</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-6 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 rounded-2xl text-left hover:border-cyan-500/50 transition-all duration-300"
          >
            <User size={32} className="text-cyan-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Edit Profile</h3>
            <p className="text-gray-400">Update your username and avatar</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/30 rounded-2xl text-left hover:border-purple-500/50 transition-all duration-300"
          >
            <Settings size={32} className="text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Settings</h3>
            <p className="text-gray-400">Manage your account preferences</p>
          </motion.button>

          <motion.button
            onClick={handleSignOut}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-6 bg-gradient-to-br from-red-500/10 to-orange-600/10 border border-red-500/30 rounded-2xl text-left hover:border-red-500/50 transition-all duration-300"
          >
            <LogOut size={32} className="text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Sign Out</h3>
            <p className="text-gray-400">Leave The Legion (temporarily)</p>
          </motion.button>
        </motion.div>

        {/* Coming Soon */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center p-8 bg-gradient-to-br from-gray-900/50 to-gray-800/30 rounded-2xl border border-gray-700/50"
        >
          <h3 className="text-2xl font-bold text-white mb-4">More Features Coming Soon</h3>
          <p className="text-gray-400 mb-6">
            Server management, course enrollment, live streams, and more are being forged in the fires of development.
          </p>
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;