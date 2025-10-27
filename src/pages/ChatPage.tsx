import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, LogOut, Dumbbell, TrendingUp, Pencil, Briefcase, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  content: string;
  user_id: string;
  channel_id: string;
  created_at: string;
  profiles?: {
    username: string;
  };
}

interface Channel {
  id: string;
  name: string;
  server_id: string;
}

const serverSlugs = {
  business: 'business-mastery',
  crypto: 'crypto-trading',
  copywriting: 'copywriting',
  fitness: 'fitness',
};

const servers = [
  { id: 'business', name: 'Business Mastery', icon: Briefcase, gradient: '#6ee7ff, #3b82f6', slug: 'business-mastery' },
  { id: 'crypto', name: 'Crypto Trading', icon: TrendingUp, gradient: '#34d399, #10b981', slug: 'crypto-trading' },
  { id: 'copywriting', name: 'Copywriting', icon: Pencil, gradient: '#fb923c, #ef4444', slug: 'copywriting' },
  { id: 'fitness', name: 'Fitness', icon: Dumbbell, gradient: '#f472b6, #ec4899', slug: 'fitness' },
];

const getGradientColors = (gradient: string) => gradient;

export default function ChatPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [selectedServer, setSelectedServer] = useState('business');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channelsError, setChannelsError] = useState<string>('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/sign-in');
      } else {
        setUserEmail(data.session.user.email || 'user@email.com');
        setUserId(data.session.user.id);
        setReady(true);
      }
    });
  }, [navigate]);

  const loadChannels = useCallback(async () => {
    const serverSlug = serverSlugs[selectedServer as keyof typeof serverSlugs];

    setLoadingChannels(true);
    setChannelsError('');

    try {
      const { data: serverData, error: serverError } = await supabase
        .from('servers')
        .select('id')
        .eq('slug', serverSlug)
        .maybeSingle();

      if (serverError) {
        console.error('Error loading server:', serverError);
        setChannelsError('Failed to load server');
        return;
      }

      if (!serverData) {
        console.error('Server not found:', serverSlug);
        setChannelsError('Server not found');
        return;
      }

      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('*')
        .eq('server_id', serverData.id)
        .order('sort_order');

      if (channelsError) {
        console.error('Error loading channels:', channelsError);
        setChannelsError('Failed to load channels');
        return;
      }

      console.log('Loaded channels:', channelsData);

      if (channelsData && channelsData.length > 0) {
        setChannels(channelsData);
        setSelectedChannel(channelsData[0]);
      } else {
        setChannels([]);
        setSelectedChannel(null);
      }
    } catch (error) {
      console.error('Unexpected error loading channels:', error);
      setChannelsError('An unexpected error occurred');
    } finally {
      setLoadingChannels(false);
    }
  }, [selectedServer]);

  useEffect(() => {
    if (!ready) return;
    loadChannels();
  }, [ready, selectedServer, loadChannels]);

  const loadMessages = useCallback(async () => {
    if (!selectedChannel) return;

    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:user_id (username)
      `)
      .eq('channel_id', selectedChannel.id)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as Message[]);
    }
  }, [selectedChannel]);

  const subscribeToMessages = useCallback(() => {
    if (!selectedChannel) return;

    const subscription = supabase
      .channel(`messages:${selectedChannel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${selectedChannel.id}`,
        },
        async (payload) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', payload.new.user_id)
            .maybeSingle();

          const newMessage = {
            ...payload.new,
            profiles: profileData,
          } as Message;

          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedChannel]);

  useEffect(() => {
    if (!selectedChannel) return;
    loadMessages();
    const unsubscribe = subscribeToMessages();
    return unsubscribe;
  }, [selectedChannel, loadMessages, subscribeToMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChannel || loading) return;

    setLoading(true);
    try {
      await supabase.from('messages').insert({
        channel_id: selectedChannel.id,
        user_id: userId,
        content: messageInput.trim(),
      });

      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleServerChange = (serverId: string) => {
    setSelectedServer(serverId);
    setMessages([]);
    setSelectedChannel(null);
  };

  if (!ready) {
    return (
      <div className="grid h-screen place-items-center" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 border-2 border-t-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  const currentServer = servers.find(s => s.id === selectedServer);

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
          {loadingChannels ? (
            <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              Loading channels...
            </div>
          ) : channelsError ? (
            <div className="px-3 py-2 text-sm" style={{ color: '#ef4444' }}>
              {channelsError}
            </div>
          ) : channels.length === 0 ? (
            <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              No channels available
            </div>
          ) : (
            channels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className={`channel-item flex items-center space-x-2 ${selectedChannel?.id === channel.id ? 'active' : ''}`}
              >
                <Hash size={18} />
                <span className="capitalize">{channel.name}</span>
              </div>
            ))
          )}
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
          <h2 className="font-semibold text-lg capitalize" style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', color: 'transparent', backgroundClip: 'text' }}>
            {selectedChannel?.name || 'Select a channel'}
          </h2>
        </div>

        <div className="p-6 overflow-auto flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="size-16 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <Hash size={32} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Welcome to #{selectedChannel?.name}</h3>
                <p style={{ color: 'var(--text-muted)' }}>
                  No messages yet. Be the first to start the conversation!
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="message flex gap-3">
                <div className="size-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ background: 'var(--accent-grad)' }}>
                  {message.profiles?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>
                      {message.profiles?.username || 'Unknown'}
                    </span>
                    <span className="timestamp">
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text)' }}>{message.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              className="input-field flex-1"
              placeholder={`Message #${selectedChannel?.name || 'channel'}`}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              disabled={!selectedChannel || loading}
            />
            <button
              type="submit"
              disabled={!messageInput.trim() || !selectedChannel || loading}
              className="btn-primary flex items-center gap-2"
              style={{ opacity: (!messageInput.trim() || !selectedChannel || loading) ? 0.5 : 1 }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
