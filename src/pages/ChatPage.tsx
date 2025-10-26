import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ChatPage() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState('general');

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || 'user@email.com');
      }
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    console.log('[ChatPage] Logging out...');
    await supabase.auth.signOut();
    console.log('[ChatPage] Logged out, redirecting to homepage');
    navigate('/', { replace: true });
  };

  const channels = [
    'general',
    'strategies',
    'growth',
    'networking',
    'resources',
    'announcements',
  ];

  return (
    <div className="h-screen grid grid-cols-[240px_1fr] bg-zinc-950 text-zinc-200">
      {/* Sidebar */}
      <aside className="border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h1 className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Business Mastery
          </h1>
          <p className="text-xs text-zinc-500 mt-1">The Legion Community</p>
        </div>

        <nav className="px-2 py-3 space-y-1 overflow-auto flex-1">
          <div className="text-xs font-semibold text-zinc-500 px-3 py-2 uppercase tracking-wider">
            Channels
          </div>
          {channels.map((channel) => (
            <div
              key={channel}
              onClick={() => setSelectedChannel(channel)}
              className={`px-3 py-2 rounded flex items-center space-x-2 cursor-pointer transition-colors duration-200 ${
                selectedChannel === channel
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
              }`}
            >
              <Hash size={18} />
              <span className="capitalize">{channel}</span>
            </div>
          ))}
        </nav>

        <div className="mt-auto p-3 border-t border-zinc-800 flex items-center gap-3">
          <div className="size-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-zinc-100 text-sm font-medium truncate">{userEmail.split('@')[0]}</div>
            <div className="flex items-center space-x-1">
              <div className="size-2 rounded-full bg-green-500" />
              <div className="text-zinc-400 text-xs">Online</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:text-red-400 transition-colors duration-200 p-1"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Chat section */}
      <main className="grid grid-rows-[auto_1fr_auto]">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center space-x-2">
          <Hash size={20} className="text-zinc-400" />
          <h2 className="font-semibold text-lg capitalize">{selectedChannel}</h2>
        </div>

        <div className="p-6 overflow-auto">
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="size-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Hash size={32} className="text-zinc-700" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-300 mb-2">Welcome to #{selectedChannel}</h3>
              <p className="text-zinc-500">
                No messages yet. Be the first to start the conversation!
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <input
            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all duration-200"
            placeholder={`Message #${selectedChannel}`}
          />
        </div>
      </main>
    </div>
  );
}
