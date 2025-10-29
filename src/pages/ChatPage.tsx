import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Settings, Dumbbell, TrendingUp, Pencil, Briefcase, Send, LogOut, X, User, Mail, Lock, Edit2, UserPlus, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FriendRequest from '../components/FriendRequest/FriendRequest';

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

interface Friend {
  id: string;
  username: string;
  avatar_url?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender?: {
    username: string;
  };
  receiver?: {
    username: string;
  };
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
  const [viewMode, setViewMode] = useState<'servers' | 'friends'>('servers');
  const [selectedServer, setSelectedServer] = useState('business');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channelsError, setChannelsError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate('/sign-in');
      } else {
        setUserEmail(data.session.user.email || 'user@email.com');
        setUserId(data.session.user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (profile) {
          setUsername(profile.username);
        }

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
        setChannelsError(`Failed to load server: ${serverError.message}`);
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
        setChannelsError(`Failed to load channels: ${channelsError.message}`);
        return;
      }

      if (channelsData && channelsData.length > 0) {
        setChannels(channelsData);
        setSelectedChannel(channelsData[0]);
      } else {
        setChannels([]);
        setSelectedChannel(null);
      }
    } catch (error) {
      console.error('Unexpected error loading channels:', error);
      setChannelsError(`An unexpected error occurred: ${error}`);
    } finally {
      setLoadingChannels(false);
    }
  }, [selectedServer]);

  useEffect(() => {
    if (!ready) return;
    if (viewMode === 'servers') {
      loadChannels();
    }
  }, [ready, selectedServer, loadChannels, viewMode]);

  const loadFriends = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        receiver_id,
        sender:sender_id(id, username, avatar_url),
        receiver:receiver_id(id, username, avatar_url)
      `)
      .eq('status', 'accepted')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (data) {
      const friendsList: Friend[] = await Promise.all(
        data.map(async (req: any) => {
          const friend = req.sender_id === userId ? req.receiver : req.sender;

          const { data: lastMsg } = await supabase
            .from('direct_messages')
            .select('content, created_at')
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${userId})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count } = await supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', friend.id)
            .eq('receiver_id', userId)
            .eq('read', false);

          return {
            id: friend.id,
            username: friend.username,
            avatar_url: friend.avatar_url,
            lastMessage: lastMsg?.content,
            lastMessageTime: lastMsg?.created_at,
            unreadCount: count || 0,
          };
        })
      );
      setFriends(friendsList);
    }
  }, [userId]);

  useEffect(() => {
    if (!ready || viewMode !== 'friends') return;
    loadFriends();
  }, [ready, viewMode, loadFriends]);

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

    console.log('Subscribing to messages for channel:', selectedChannel.id, selectedChannel.name);

    // Use a unique channel name with timestamp to avoid conflicts
    const channelName = `channel-messages-${selectedChannel.id}`;

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${selectedChannel.id}`,
        },
        async (payload) => {
          console.log('New message received via Realtime in channel:', selectedChannel.name, payload);

          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', payload.new.user_id)
            .maybeSingle();

          const newMessage = {
            ...payload.new,
            profiles: profileData,
          } as Message;

          console.log('Adding message to state:', newMessage);
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe((status, err) => {
        console.log(`Realtime subscription status for ${selectedChannel.name}:`, status);
        if (err) {
          console.error('Subscription error:', err);
        }
      });

    return () => {
      console.log('Unsubscribing from channel:', selectedChannel.id, selectedChannel.name);
      supabase.removeChannel(subscription);
    };
  }, [selectedChannel]);

  useEffect(() => {
    if (!selectedChannel) return;
    loadMessages();
    const unsubscribe = subscribeToMessages();
    return unsubscribe;
  }, [selectedChannel, loadMessages, subscribeToMessages]);

  const loadDirectMessages = useCallback(async () => {
    if (!selectedFriend) return;

    const { data } = await supabase
      .from('direct_messages')
      .select(`
        *,
        sender:sender_id(username),
        receiver:receiver_id(username)
      `)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${selectedFriend.id}),and(sender_id.eq.${selectedFriend.id},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (data) {
      setDirectMessages(data as DirectMessage[]);

      await supabase
        .from('direct_messages')
        .update({ read: true })
        .eq('sender_id', selectedFriend.id)
        .eq('receiver_id', userId)
        .eq('read', false);
    }
  }, [selectedFriend, userId]);

  const subscribeToDirectMessages = useCallback(() => {
    if (!selectedFriend) return;

    const channelName = `dm-${userId}-${selectedFriend.id}`;

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${selectedFriend.id},receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const { data: senderData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', payload.new.sender_id)
            .maybeSingle();

          const newMessage = {
            ...payload.new,
            sender: senderData,
          } as DirectMessage;

          setDirectMessages((prev) => {
            const exists = prev.find(msg => msg.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });

          await supabase
            .from('direct_messages')
            .update({ read: true })
            .eq('id', payload.new.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedFriend, userId]);

  useEffect(() => {
    if (!selectedFriend) return;
    loadDirectMessages();
    const unsubscribe = subscribeToDirectMessages();
    return unsubscribe;
  }, [selectedFriend, loadDirectMessages, subscribeToDirectMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, directMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || loading) return;

    if (viewMode === 'servers' && !selectedChannel) return;
    if (viewMode === 'friends' && !selectedFriend) return;

    setLoading(true);
    try {
      if (viewMode === 'servers' && selectedChannel) {
        console.log('Attempting to send message to channel:', selectedChannel);
        const { data, error } = await supabase.from('messages').insert({
          channel_id: selectedChannel.id,
          user_id: userId,
          content: messageInput.trim(),
        });

        if (error) {
          console.error('Error sending message:', error);
          alert(`Failed to send message: ${error.message}`);
        } else {
          console.log('Message sent successfully:', data);
          setMessageInput('');
        }
      } else if (viewMode === 'friends' && selectedFriend) {
        const { data, error } = await supabase
          .from('direct_messages')
          .insert({
            sender_id: userId,
            receiver_id: selectedFriend.id,
            content: messageInput.trim(),
          })
          .select(`
            *,
            sender:sender_id(username),
            receiver:receiver_id(username)
          `)
          .single();

        if (error) {
          console.error('Error sending direct message:', error);
          alert(`Failed to send message: ${error.message}`);
        } else {
          console.log('Direct message sent successfully:', data);
          const newMessage = data as DirectMessage;
          setDirectMessages((prev) => [...prev, newMessage]);
          setMessageInput('');
        }
      }
    } catch (error) {
      console.error('Unexpected error sending message:', error);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleServerChange = (serverId: string) => {
    setViewMode('servers');
    setSelectedServer(serverId);
    setMessages([]);
    setSelectedChannel(null);
    setSelectedFriend(null);
    setDirectMessages([]);
  };

  const handleFriendsClick = () => {
    setViewMode('friends');
    setSelectedChannel(null);
    setMessages([]);
    setSelectedFriend(null);
    setDirectMessages([]);
  };

  const handleFriendClick = (friend: Friend) => {
    setSelectedFriend(friend);
    setDirectMessages([]);
  };

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSaveEdit = async () => {
    if (!editingField || updateLoading) return;

    setUpdateLoading(true);
    try {
      if (editingField === 'username') {
        const { error } = await supabase
          .from('profiles')
          .update({ username: editValue })
          .eq('id', userId);

        if (error) {
          alert(`Failed to update username: ${error.message}`);
        } else {
          setUsername(editValue);
          setEditingField(null);
        }
      } else if (editingField === 'email') {
        const { error } = await supabase.auth.updateUser({ email: editValue });

        if (error) {
          alert(`Failed to update email: ${error.message}`);
        } else {
          alert('Confirmation email sent. Please check your inbox.');
          setEditingField(null);
        }
      } else if (editingField === 'password') {
        const { error } = await supabase.auth.updateUser({ password: editValue });

        if (error) {
          alert(`Failed to update password: ${error.message}`);
        } else {
          alert('Password updated successfully.');
          setEditingField(null);
          setEditValue('');
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('An unexpected error occurred');
    } finally {
      setUpdateLoading(false);
    }
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
    <div className="h-screen overflow-hidden grid grid-cols-[72px_240px_1fr]" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Server List */}
      <aside className="sidebar flex flex-col items-center py-3 gap-2 overflow-y-auto">
        <button
          onClick={handleFriendsClick}
          className={`server-icon ${viewMode === 'friends' ? 'active' : ''}`}
          title="Friends"
          style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
        >
          <Users size={24} className="text-white" />
        </button>
        <div className="w-8 h-px my-1" style={{ background: 'var(--border)' }} />
        {servers.map((server) => {
          const Icon = server.icon;
          const isActive = viewMode === 'servers' && selectedServer === server.id;
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

      {/* Channel/Friends Sidebar */}
      <aside className="sidebar flex flex-col overflow-hidden">
        <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h1 className="font-bold text-lg" style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', color: 'transparent', backgroundClip: 'text' }}>
            {viewMode === 'friends' ? 'Friends' : currentServer?.name}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {viewMode === 'friends' ? 'Direct Messages' : 'The Legion Community'}
          </p>
        </div>

        <nav className="px-2 py-3 space-y-1 overflow-y-auto flex-1">
          {viewMode === 'servers' ? (
            <>
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
            </>
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Direct Messages
                </div>
                <button
                  onClick={() => setShowFriendRequests(true)}
                  className="p-1 rounded transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  title="Add Friend"
                >
                  <UserPlus size={16} />
                </button>
              </div>
              {friends.length === 0 ? (
                <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                  No friends yet. Add some friends to start chatting!
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => handleFriendClick(friend)}
                    className={`channel-item flex items-center justify-between ${selectedFriend?.id === friend.id ? 'active' : ''}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="size-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: 'var(--accent-grad)' }}>
                        {friend.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                          {friend.username}
                        </div>
                        {friend.lastMessage && (
                          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {friend.lastMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    {friend.unreadCount! > 0 && (
                      <div className="size-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--accent)', color: 'white' }}>
                        {friend.unreadCount}
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </nav>

        <div className="mt-auto p-3 flex items-center gap-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="size-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--accent-grad)' }}>
            {username.charAt(0).toUpperCase() || userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{username || userEmail.split('@')[0]}</div>
            <div className="flex items-center space-x-1">
              <div className="size-2 rounded-full" style={{ background: '#10b981' }} />
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Online</div>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1 transition-colors duration-200"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </aside>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.7)' }} onClick={() => setShowSettings(false)}>
          <div className="w-full max-w-2xl mx-4 rounded-lg shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-2xl font-bold" style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', color: 'transparent', backgroundClip: 'text' }}>
                Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg transition-colors duration-200"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="size-20 rounded-full flex items-center justify-center text-white font-bold text-2xl" style={{ background: 'var(--accent-grad)' }}>
                  {username.charAt(0).toUpperCase() || userEmail.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>{username || userEmail.split('@')[0]}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="size-2 rounded-full" style={{ background: '#10b981' }} />
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Online</div>
                  </div>
                </div>
              </div>

              {/* Profile Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>Profile Information</h3>
                <div className="space-y-3">
                  {/* Username Field */}
                  <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <User size={20} style={{ color: 'var(--text-muted)' }} />
                        <div className="flex-1">
                          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Username</div>
                          {editingField === 'username' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="input-field flex-1 py-1 text-sm"
                                autoFocus
                              />
                              <button
                                onClick={handleSaveEdit}
                                disabled={updateLoading}
                                className="px-3 py-1 rounded text-sm font-medium transition-colors"
                                style={{ background: 'var(--accent)', color: 'white' }}
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 rounded text-sm font-medium transition-colors"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                              {username || 'Not set'}
                            </div>
                          )}
                        </div>
                      </div>
                      {editingField !== 'username' && (
                        <button
                          onClick={() => handleEditField('username', username)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Mail size={20} style={{ color: 'var(--text-muted)' }} />
                        <div className="flex-1">
                          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Email Address</div>
                          {editingField === 'email' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="email"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="input-field flex-1 py-1 text-sm"
                                autoFocus
                              />
                              <button
                                onClick={handleSaveEdit}
                                disabled={updateLoading}
                                className="px-3 py-1 rounded text-sm font-medium transition-colors"
                                style={{ background: 'var(--accent)', color: 'white' }}
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 rounded text-sm font-medium transition-colors"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                              {userEmail}
                            </div>
                          )}
                        </div>
                      </div>
                      {editingField !== 'email' && (
                        <button
                          onClick={() => handleEditField('email', userEmail)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Lock size={20} style={{ color: 'var(--text-muted)' }} />
                        <div className="flex-1">
                          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Password</div>
                          {editingField === 'password' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="password"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder="Enter new password"
                                className="input-field flex-1 py-1 text-sm"
                                autoFocus
                              />
                              <button
                                onClick={handleSaveEdit}
                                disabled={updateLoading}
                                className="px-3 py-1 rounded text-sm font-medium transition-colors"
                                style={{ background: 'var(--accent)', color: 'white' }}
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 rounded text-sm font-medium transition-colors"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                              ••••••••
                            </div>
                          )}
                        </div>
                      </div>
                      {editingField !== 'password' && (
                        <button
                          onClick={() => handleEditField('password', '')}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Logout Section */}
              <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200"
                  style={{ background: '#ef4444', color: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                >
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Friend Requests Modal */}
      {showFriendRequests && (
        <FriendRequest userId={userId} onClose={() => setShowFriendRequests(false)} />
      )}

      {/* Chat section */}
      <main className="grid grid-rows-[auto_1fr_auto] overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center space-x-2">
            {viewMode === 'servers' ? (
              <>
                <Hash size={20} style={{ color: 'var(--text-muted)' }} />
                <h2 className="font-semibold text-lg capitalize" style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', color: 'transparent', backgroundClip: 'text' }}>
                  {selectedChannel?.name || 'Select a channel'}
                </h2>
              </>
            ) : (
              <>
                <div className="size-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'var(--accent-grad)' }}>
                  {selectedFriend?.username[0].toUpperCase() || '?'}
                </div>
                <h2 className="font-semibold text-lg" style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', color: 'transparent', backgroundClip: 'text' }}>
                  {selectedFriend?.username || 'Select a friend'}
                </h2>
              </>
            )}
          </div>
          {viewMode === 'servers' && (
            <button
              onClick={() => setShowFriendRequests(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200"
              style={{ background: 'var(--accent)', color: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              title="Friend Requests"
            >
              <UserPlus size={18} />
              <span>Friends</span>
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-3">
          {viewMode === 'servers' ? (
            messages.length === 0 ? (
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
            )
          ) : (
            directMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="size-16 rounded-full flex items-center justify-center text-white font-bold text-2xl" style={{ background: 'var(--accent-grad)' }}>
                  {selectedFriend?.username[0].toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
                    {selectedFriend ? `Chat with ${selectedFriend.username}` : 'Select a friend'}
                  </h3>
                  <p style={{ color: 'var(--text-muted)' }}>
                    {selectedFriend ? 'No messages yet. Start the conversation!' : 'Choose a friend from the list to start chatting'}
                  </p>
                </div>
              </div>
            ) : (
              directMessages.map((dm) => {
                const isOwnMessage = dm.sender_id === userId;
                return (
                  <div key={dm.id} className="message flex gap-3">
                    <div className="size-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ background: 'var(--accent-grad)' }}>
                      {isOwnMessage ? username[0]?.toUpperCase() : selectedFriend?.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold" style={{ color: 'var(--text)' }}>
                          {isOwnMessage ? username : selectedFriend?.username}
                        </span>
                        <span className="timestamp">
                          {new Date(dm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text)' }}>{dm.content}</p>
                    </div>
                  </div>
                );
              })
            )
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              className="input-field flex-1"
              placeholder={
                viewMode === 'servers'
                  ? `Message #${selectedChannel?.name || 'channel'}`
                  : `Message ${selectedFriend?.username || 'friend'}`
              }
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              disabled={(viewMode === 'servers' && !selectedChannel) || (viewMode === 'friends' && !selectedFriend) || loading}
            />
            <button
              type="submit"
              disabled={
                !messageInput.trim() ||
                (viewMode === 'servers' && !selectedChannel) ||
                (viewMode === 'friends' && !selectedFriend) ||
                loading
              }
              className="btn-primary flex items-center gap-2"
              style={{
                opacity:
                  !messageInput.trim() ||
                  (viewMode === 'servers' && !selectedChannel) ||
                  (viewMode === 'friends' && !selectedFriend) ||
                  loading
                    ? 0.5
                    : 1,
              }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
