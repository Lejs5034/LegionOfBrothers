import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Hash, Send } from 'lucide-react';

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

const ChatUI: React.FC = () => {
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
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex-shrink-0 border-b border-gray-700 p-3">
        <select
          value={selectedServer?.id || ''}
          onChange={(e) => {
            const server = servers.find(s => s.id === e.target.value);
            setSelectedServer(server || null);
          }}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {servers.map((server) => (
            <option key={server.id} value={server.id}>
              {server.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-shrink-0 border-b border-gray-700 p-3 space-y-1 max-h-40 overflow-y-auto">
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
            <Hash size={14} className="flex-shrink-0" />
            <span className="text-xs font-medium truncate">{channel.name}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Hash size={40} className="text-gray-600 mb-3" />
            <h3 className="text-base font-bold text-gray-300 mb-1">
              #{selectedChannel?.name}
            </h3>
            <p className="text-gray-500 text-xs">
              Start the conversation
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex space-x-2 hover:bg-gray-700/10 -mx-1 px-1 py-1 rounded">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">
                  {message.profiles.username[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline space-x-2">
                  <span className="font-semibold text-white text-sm">
                    {message.profiles.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(message.created_at)}
                  </span>
                </div>
                <p className="text-gray-300 text-sm break-words">{message.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-3 border-t border-gray-700">
        <form onSubmit={sendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={`Message #${selectedChannel?.name}`}
            disabled={isSending}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!messageInput.trim() || isSending}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white p-2 rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatUI;
