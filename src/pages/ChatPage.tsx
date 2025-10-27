import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, LogOut, Dumbbell, TrendingUp, Pencil, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';

const servers = [
  { id: 'business', name: 'Business Mastery', icon: Briefcase, gradient: 'from-cyan-400 to-blue-500' },
  { id: 'crypto', name: 'Crypto Trading', icon: TrendingUp, gradient: 'from-green-400 to-emerald-500' },
  { id: 'copywriting', name: 'Copywriting', icon: Pencil, gradient: 'from-orange-400 to-red-500' },
  { id: 'fitness', name: 'Fitness', icon: Dumbbell, gradient: 'from-pink-400 to-rose-500' },
];

const channelsByServer: Record<string, string[]> = {
  business: ['general', 'strategies', 'growth', 'networking', 'resources', 'announcements'],
  crypto: ['general', 'trading-signals', 'market-analysis', 'portfolio', 'news'],
  copywriting: ['general', 'critiques', 'tips', 'projects', 'resources'],
  fitness: ['general', 'workouts', 'nutrition', 'progress', 'motivation'],
};

export default function ChatPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [selectedServer, setSelectedServer] = useState('business');
  const [selectedChannel, setSelectedChannel] = useState('general');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/sign-in');
      } else {
        setUserEmail(data.session.user.email || 'user@email.com');
        setReady(true);
      }
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleServerChange = (serverId: string) => {
    setSelectedServer(serverId);
    setSelectedChannel('general');
  };

  if (!ready) {
    return (
      <div className="grid h-screen place-items-center bg-zinc-950 text-zinc-300">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 border-2 border-zinc-500 border-t-cyan-400 rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  const currentServer = servers.find(s => s.id === selectedServer);
  const channels = channelsByServer[selectedServer];

  return (
    <div className="h-screen grid grid-cols-[72px_240px_1fr] bg-zinc-950 text-zinc-200">
      {/* Server List */}
      <aside className="bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-3 gap-2">
        {servers.map((server) => {
          const Icon = server.icon;
          const isActive = selectedServer === server.id;
          return (
            <button
              key={server.id}
              onClick={() => handleServerChange(server.id)}
              className={`group relative size-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'rounded-xl'
                  : 'hover:rounded-xl bg-zinc-800 hover:bg-zinc-700'
              }`}
              title={server.name}
            >
              <div className={`size-full rounded-2xl ${isActive ? 'rounded-xl' : 'group-hover:rounded-xl'} bg-gradient-to-br ${server.gradient} flex items-center justify-center`}>
                <Icon size={24} className="text-white" />
              </div>
              {isActive && (
                <div className="absolute left-0 w-1 h-8 bg-white rounded-r-full" />
              )}
            </button>
          );
        })}
      </aside>

      {/* Channel Sidebar */}
      <aside className="border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h1 className={`font-bold text-lg bg-gradient-to-r ${currentServer?.gradient} bg-clip-text text-transparent`}>
            {currentServer?.name}
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
