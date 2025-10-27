import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Hash, Send, LogOut, Users } from 'lucide-react';

interface Server {
  id: string;
  name: string;
  slug: string;
}

interface Channel {
  id: string;
  name: string;
  type: string;
  sort_order: number;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
}

const AppPage: React.FC = () => {
  const { user } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    if (selectedServer) {
      loadChannels(selectedServer.id);
    }
  }, [selectedServer]);

  useEffect(() => {
    if (selectedChannel) {
      loadMessages(selectedChannel.id);
      subscribeToChannel(selectedChannel.id);
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadServers = async () => {
    try {
      const { data, error } = await supabase
        .from('servers')
        .select('id, name, slug')
        .eq('is_public', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setServers(data || []);
      if (data && data.length > 0) {
        setSelectedServer(data[0]);
      }
    } catch (error) {
      console.error('Error loading servers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChannels = async (serverId: string) => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('id, name, type, sort_order')
        .eq('server_id', serverId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      setChannels(data || []);
      if (data && data.length > 0) {
        setSelectedChannel(data[0]);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const loadMessages = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:user_id (username, avatar_url)
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToChannel = (channelId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const newMessage = {
            ...payload.new,
            profiles: profile || { username: 'Unknown' },
          } as Message;

          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim() || !selectedChannel || !user || isSending) {
      return;
    }

    setIsSending(true);

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          channel_id: selectedChannel.id,
          user_id: user.id,
          content: messageInput.trim(),
        });

      if (error) throw error;

      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const getServerInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-gray-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-900 overflow-hidden">
      <div className="w-20 bg-gray-950 flex flex-col items-center py-3 space-y-2 border-r border-gray-800">
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => setSelectedServer(server)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-200 hover:rounded-xl ${
              selectedServer?.id === server.id
                ? 'bg-gradient-to-br from-cyan-500 to-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-cyan-500 hover:text-white'
            }`}
            title={server.name}
          >
            {getServerInitials(server.name)}
          </button>
        ))}

        <div className="flex-1" />

        <button
          onClick={handleSignOut}
          className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-all duration-200 hover:rounded-xl"
          title="Sign Out"
        >
          <LogOut size={20} />
        </button>
      </div>

      <div className="w-60 bg-gray-800 flex flex-col border-r border-gray-700">
        <div className="h-12 border-b border-gray-700 px-4 flex items-center justify-between">
          <h2 className="font-bold text-white truncate">{selectedServer?.name}</h2>
          <Users size={18} className="text-gray-400" />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
              Channels
            </div>
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded text-left transition-colors duration-150 ${
                  selectedChannel?.id === channel.id
                    ? 'bg-gray-700/50 text-white'
                    : 'text-gray-400 hover:bg-gray-700/30 hover:text-gray-300'
                }`}
              >
                <Hash size={16} className="flex-shrink-0" />
                <span className="text-sm font-medium truncate">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-800">
        <div className="h-12 border-b border-gray-700 px-4 flex items-center space-x-2">
          <Hash size={20} className="text-gray-400" />
          <h3 className="font-semibold text-white">{selectedChannel?.name}</h3>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Hash size={48} className="text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-300 mb-2">
                Welcome to #{selectedChannel?.name}
              </h3>
              <p className="text-gray-500">
                This is the beginning of the #{selectedChannel?.name} channel.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex space-x-3 hover:bg-gray-700/20 -mx-2 px-2 py-1 rounded">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white">
                    {message.profiles.username[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline space-x-2">
                    <span className="font-semibold text-white">
                      {message.profiles.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-300 break-words">{message.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-700">
          <form onSubmit={sendMessage} className="flex items-center space-x-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={`Message #${selectedChannel?.name}`}
              disabled={isSending}
              className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!messageInput.trim() || isSending}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white p-3 rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AppPage;
