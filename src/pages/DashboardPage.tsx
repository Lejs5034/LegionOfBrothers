import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Send, User, Settings, LogOut, Menu, X } from 'lucide-react';
import { supabase, getCurrentUser, getUserProfile } from '../lib/supabase';
import type { Profile } from '../types/database';

type Channel = {
  id: string;
  name: string;
  icon: typeof Hash;
};

const channels: Channel[] = [
  { id: 'general', name: 'general', icon: Hash },
  { id: 'strategies', name: 'strategies', icon: Hash },
  { id: 'growth', name: 'growth', icon: Hash },
  { id: 'networking', name: 'networking', icon: Hash },
  { id: 'resources', name: 'resources', icon: Hash },
  { id: 'announcements', name: 'announcements', icon: Hash },
];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState('general');
  const [message, setMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate('/sign-in', { replace: true });
          return;
        }

        let userProfile = await getUserProfile(user.id);

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

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log(`Sending message to #${activeChannel}: ${message}`);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Error loading profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0f0f0f] flex overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:relative lg:translate-x-0 w-64 h-full bg-[#1a1a1a] flex flex-col z-30 transition-transform duration-300`}
      >
        {/* Server Header */}
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 shadow-lg">
          <h1 className="font-bold text-white text-lg tracking-wide">Business Mastery</h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto py-4 px-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 mb-2">
            Text Channels
          </div>
          <div className="space-y-0.5">
            {channels.map((channel) => {
              const Icon = channel.icon;
              const isActive = activeChannel === channel.id;

              return (
                <button
                  key={channel.id}
                  onClick={() => {
                    setActiveChannel(channel.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-md transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  <Icon
                    size={20}
                    className={`${
                      isActive
                        ? 'text-cyan-400'
                        : 'text-gray-500 group-hover:text-gray-300'
                    } transition-colors`}
                  />
                  <span className="font-medium">{channel.name}</span>
                  {isActive && (
                    <div className="ml-auto w-1 h-8 bg-gradient-to-b from-cyan-400 to-purple-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* User Profile Section */}
        <div className="border-t border-gray-800 p-3 bg-[#151515]">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-white" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#151515]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm truncate">{profile.username}</div>
              <div className="text-xs text-green-400">Online</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 p-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors">
              <Settings size={16} className="text-gray-400 mx-auto" />
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 p-2 bg-gray-800 hover:bg-red-900/50 rounded-md transition-colors"
            >
              <LogOut size={16} className="text-gray-400 hover:text-red-400 mx-auto transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 bg-[#1a1a1a] shadow-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white transition-colors mr-2"
            >
              <Menu size={20} />
            </button>
            <Hash size={24} className="text-gray-500" />
            <h2 className="text-white font-semibold text-lg">{activeChannel}</h2>
          </div>
          <div className="text-sm text-gray-500">
            Legion of Brothers – Workspace
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                <Hash size={40} className="text-gray-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Welcome to #{activeChannel}
              </h3>
              <p className="text-gray-500 text-sm max-w-md">
                This is the beginning of the #{activeChannel} channel. No messages yet.
              </p>
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 bg-[#1a1a1a] border-t border-gray-800">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-center gap-3 bg-[#2a2a2a] rounded-lg px-4 py-3 focus-within:ring-2 focus-within:ring-cyan-500/50 transition-all">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message #${activeChannel}`}
                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className={`p-2 rounded-md transition-all duration-200 ${
                  message.trim()
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2 text-center">
              Press Enter to send • Shift + Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-20"
        />
      )}
    </div>
  );
};

export default DashboardPage;
