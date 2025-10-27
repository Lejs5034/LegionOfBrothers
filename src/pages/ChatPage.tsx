import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, LogOut, Dumbbell, TrendingUp, Pencil, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';

const servers = [
  { id: 'business', name: 'Business Mastery', icon: Briefcase, gradient: '#6ee7ff, #3b82f6' },
  { id: 'crypto', name: 'Crypto Trading', icon: TrendingUp, gradient: '#34d399, #10b981' },
  { id: 'copywriting', name: 'Copywriting', icon: Pencil, gradient: '#fb923c, #ef4444' },
  { id: 'fitness', name: 'Fitness', icon: Dumbbell, gradient: '#f472b6, #ec4899' },
];

const channelsByServer: Record<string, string[]> = {
  business: ['general', 'strategies', 'growth', 'networking', 'resources', 'announcements'],
  crypto: ['general', 'trading-signals', 'market-analysis', 'portfolio', 'news'],
  copywriting: ['general', 'critiques', 'tips', 'projects', 'resources'],
  fitness: ['general', 'workouts', 'nutrition', 'progress', 'motivation'],
};

const getGradientColors = (gradient: string) => gradient;

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
    <div className="h-screen grid grid-cols-[72px_240px_1fr]" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Server List */}
      <aside className="sidebar flex flex-col items-center py-3 gap-2">
        {servers.map((server) => {
          const Icon = server.icon;
          const isActive = selectedServer === server.id;
          return (
            <button
              key={server.id}
              onClick={() => handleServerChange(server.id)}
              className={`server-icon ${isActive ? 'active' : ''}`}
              title={server.name}
              style={{ background: `linear-gradient(135deg, ${getGradientColors(server.gradient)})` }}
            >
              <Icon size={24} className="text-white" />
            </button>
          );
        })}
      </aside>

      {/* Channel Sidebar */}
      <aside className="sidebar flex flex-col">
        <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h1 className="font-bold text-lg" style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', color: 'transparent', backgroundClip: 'text' }}>
            {currentServer?.name}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>The Legion Community</p>
        </div>

        <nav className="px-2 py-3 space-y-1 overflow-auto flex-1">
          <div className="text-xs font-semibold px-3 py-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Channels
          </div>
          {channels.map((channel) => (
            <div
              key={channel}
              onClick={() => setSelectedChannel(channel)}
              className={`channel-item flex items-center space-x-2 ${selectedChannel === channel ? 'active' : ''}`}
            >
              <Hash size={18} />
              <span className="capitalize">{channel}</span>
            </div>
          ))}
        </nav>

        <div className="mt-auto p-3 flex items-center gap-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="size-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--accent-grad)' }}>
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{userEmail.split('@')[0]}</div>
            <div className="flex items-center space-x-1">
              <div className="size-2 rounded-full" style={{ background: '#10b981' }} />
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Online</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 transition-colors duration-200"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Chat section */}
      <main className="grid grid-rows-[auto_1fr_auto]">
        <div className="px-6 py-4 flex items-center space-x-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <Hash size={20} style={{ color: 'var(--text-muted)' }} />
          <h2 className="font-semibold text-lg capitalize" style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', color: 'transparent', backgroundClip: 'text' }}>{selectedChannel}</h2>
        </div>

        <div className="p-6 overflow-auto">
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="size-16 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <Hash size={32} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Welcome to #{selectedChannel}</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                No messages yet. Be the first to start the conversation!
              </p>
            </div>
          </div>
        </div>

        <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <input
            className="input-field w-full"
            placeholder={`Message #${selectedChannel}`}
          />
        </div>
      </main>
    </div>
  );
}
