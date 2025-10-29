import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Settings, Dumbbell, TrendingUp, Pencil, Briefcase, Send, LogOut, X, User, Mail, Lock, Edit2, UserPlus, Users, MoreVertical, Trash2, Check, Paperclip, Download, FileText, Image as ImageIcon, Building2, PanelRightClose, PanelRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FriendRequest from '../components/FriendRequest/FriendRequest';
import MemberList from '../components/MemberList/MemberList';

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  channel_id: string;
  created_at: string;
  edited_at?: string | null;
  profiles?: {
    username: string;
  };
  attachments?: Attachment[];
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
  edited_at?: string | null;
  sender?: {
    username: string;
  };
  receiver?: {
    username: string;
  };
  attachments?: Attachment[];
}

const serverSlugs = {
  headquarters: 'headquarters',
  business: 'business-mastery',
  crypto: 'crypto-trading',
  copywriting: 'copywriting',
  fitness: 'fitness',
};

const servers = [
  { id: 'headquarters', name: 'Headquarters', icon: Building2, gradient: '#fbbf24, #f59e0b', slug: 'headquarters' },
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
  const [selectedServer, setSelectedServer] = useState('headquarters');
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showMemberList, setShowMemberList] = useState(() => {
    const saved = localStorage.getItem('showMemberList');
    return saved ? JSON.parse(saved) : true;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('showMemberList', JSON.stringify(showMemberList));
  }, [showMemberList]);

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

    const { data: messagesData } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:user_id (username)
      `)
      .eq('channel_id', selectedChannel.id)
      .order('created_at', { ascending: true });

    if (messagesData) {
      const messagesWithAttachments = await Promise.all(
        messagesData.map(async (msg: any) => {
          const { data: attachments } = await supabase
            .from('message_attachments')
            .select('*')
            .eq('message_id', msg.id);

          return { ...msg, attachments: attachments || [] } as Message;
        })
      );

      setMessages(messagesWithAttachments);
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

    const { data: dmData } = await supabase
      .from('direct_messages')
      .select(`
        *,
        sender:sender_id(username),
        receiver:receiver_id(username)
      `)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${selectedFriend.id}),and(sender_id.eq.${selectedFriend.id},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (dmData) {
      const dmsWithAttachments = await Promise.all(
        dmData.map(async (dm: any) => {
          const { data: attachments } = await supabase
            .from('message_attachments')
            .select('*')
            .eq('direct_message_id', dm.id);

          return { ...dm, attachments: attachments || [] } as DirectMessage;
        })
      );

      setDirectMessages(dmsWithAttachments);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach((file) => {
      if (file.name.toLowerCase().endsWith('.exe')) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      alert(`The following files cannot be uploaded (.exe files are not allowed):\n${invalidFiles.join('\n')}`);
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFilesToStorage = async () => {
    const uploadedPaths: Array<{
      storage_path: string;
      file_name: string;
      file_type: string;
      file_size: number;
    }> = [];

    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        uploadedPaths.push({
          storage_path: fileName,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        });
      }

      return uploadedPaths;
    } catch (error: any) {
      console.error('Error uploading files to storage:', error);
      for (const uploaded of uploadedPaths) {
        await supabase.storage.from('uploads').remove([uploaded.storage_path]);
      }
      throw error;
    }
  };

  const createAttachmentRecords = async (
    messageId: string,
    isDirect: boolean,
    uploadedFiles: Array<{
      storage_path: string;
      file_name: string;
      file_type: string;
      file_size: number;
    }>
  ) => {
    const attachmentRecords = uploadedFiles.map((file) => ({
      [isDirect ? 'direct_message_id' : 'message_id']: messageId,
      user_id: userId,
      ...file,
    }));

    const { error } = await supabase
      .from('message_attachments')
      .insert(attachmentRecords);

    if (error) throw error;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && selectedFiles.length === 0) || loading) return;

    if (viewMode === 'servers' && !selectedChannel) return;
    if (viewMode === 'friends' && !selectedFriend) return;

    setLoading(true);
    setUploadingFile(selectedFiles.length > 0);

    try {
      let uploadedFiles: Array<{
        storage_path: string;
        file_name: string;
        file_type: string;
        file_size: number;
      }> = [];

      if (selectedFiles.length > 0) {
        uploadedFiles = await uploadFilesToStorage();
      }

      if (viewMode === 'servers' && selectedChannel) {
        console.log('Attempting to send message to channel:', selectedChannel);
        const { data, error } = await supabase
          .from('messages')
          .insert({
            channel_id: selectedChannel.id,
            user_id: userId,
            content: messageInput.trim() || '📎 Attachment',
          })
          .select('*')
          .single();

        if (error) {
          console.error('Error sending message:', error);
          alert(`Failed to send message: ${error.message}`);
          if (uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
              await supabase.storage.from('uploads').remove([file.storage_path]);
            }
          }
        } else {
          console.log('Message sent successfully:', data);
          if (uploadedFiles.length > 0 && data) {
            await createAttachmentRecords(data.id, false, uploadedFiles);
          }
          await loadMessages();
          setMessageInput('');
          setSelectedFiles([]);
        }
      } else if (viewMode === 'friends' && selectedFriend) {
        const { data, error } = await supabase
          .from('direct_messages')
          .insert({
            sender_id: userId,
            receiver_id: selectedFriend.id,
            content: messageInput.trim() || '📎 Attachment',
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
          if (uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
              await supabase.storage.from('uploads').remove([file.storage_path]);
            }
          }
        } else {
          console.log('Direct message sent successfully:', data);
          if (uploadedFiles.length > 0 && data) {
            await createAttachmentRecords(data.id, true, uploadedFiles);
          }
          await loadDirectMessages();
          setMessageInput('');
          setSelectedFiles([]);
        }
      }
    } catch (error) {
      console.error('Unexpected error sending message:', error);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
      setUploadingFile(false);
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

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingMessageContent(content);
    setShowMessageMenu(null);
  };

  const handleCancelMessageEdit = () => {
    setEditingMessageId(null);
    setEditingMessageContent('');
  };

  const handleSaveMessageEdit = async () => {
    if (!editingMessageId || !editingMessageContent.trim()) return;

    try {
      if (viewMode === 'servers') {
        const { error } = await supabase
          .from('messages')
          .update({
            content: editingMessageContent.trim(),
            edited_at: new Date().toISOString(),
          })
          .eq('id', editingMessageId);

        if (error) throw error;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === editingMessageId
              ? { ...msg, content: editingMessageContent.trim(), edited_at: new Date().toISOString() }
              : msg
          )
        );
      } else {
        const { error } = await supabase
          .from('direct_messages')
          .update({
            content: editingMessageContent.trim(),
            edited_at: new Date().toISOString(),
          })
          .eq('id', editingMessageId);

        if (error) throw error;

        setDirectMessages((prev) =>
          prev.map((msg) =>
            msg.id === editingMessageId
              ? { ...msg, content: editingMessageContent.trim(), edited_at: new Date().toISOString() }
              : msg
          )
        );
      }

      setEditingMessageId(null);
      setEditingMessageContent('');
    } catch (error: any) {
      console.error('Error editing message:', error);
      alert(`Failed to edit message: ${error.message}`);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      if (viewMode === 'servers') {
        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('id', messageId);

        if (error) throw error;

        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      } else {
        const { error } = await supabase
          .from('direct_messages')
          .delete()
          .eq('id', messageId);

        if (error) throw error;

        setDirectMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      }

      setShowMessageMenu(null);
    } catch (error: any) {
      console.error('Error deleting message:', error);
      alert(`Failed to delete message: ${error.message}`);
    }
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
    <div className="h-screen overflow-hidden grid" style={{
      gridTemplateColumns: viewMode === 'servers' && showMemberList ? '72px 240px 1fr 240px' : '72px 240px 1fr',
      background: 'var(--bg)',
      color: 'var(--text)'
    }}>
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
              onClick={() => setShowMemberList(!showMemberList)}
              className="p-2 rounded-lg transition-colors"
              style={{
                color: 'var(--text-muted)',
                marginRight: '-0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-2)';
                e.currentTarget.style.color = 'var(--text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              title={showMemberList ? 'Hide member list' : 'Show member list'}
            >
              {showMemberList ? <PanelRightClose size={20} /> : <PanelRight size={20} />}
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
              messages.map((message) => {
                const isOwnMessage = message.user_id === userId;
                const isEditing = editingMessageId === message.id;
                return (
                  <div
                    key={message.id}
                    className="message flex gap-3 group relative"
                    onMouseEnter={() => setHoveredMessageId(message.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
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
                        {message.edited_at && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            (edited)
                          </span>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={editingMessageContent}
                            onChange={(e) => setEditingMessageContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveMessageEdit();
                              if (e.key === 'Escape') handleCancelMessageEdit();
                            }}
                            className="input-field flex-1 py-1 text-sm"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveMessageEdit}
                            className="p-1 rounded transition-colors"
                            style={{ color: '#10b981' }}
                            title="Save"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={handleCancelMessageEdit}
                            className="p-1 rounded transition-colors"
                            style={{ color: '#ef4444' }}
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p style={{ color: 'var(--text)' }}>{message.content}</p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.attachments.map((attachment) => {
                                const { data } = supabase.storage.from('uploads').getPublicUrl(attachment.storage_path);
                                const isImage = attachment.file_type.startsWith('image/');

                                return (
                                  <div key={attachment.id}>
                                    {isImage ? (
                                      <a href={data.publicUrl} target="_blank" rel="noopener noreferrer">
                                        <img
                                          src={data.publicUrl}
                                          alt={attachment.file_name}
                                          className="rounded-lg max-w-xs max-h-64 object-cover cursor-pointer transition-opacity"
                                          style={{ border: '1px solid var(--border)' }}
                                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        href={data.publicUrl}
                                        download={attachment.file_name}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                                      >
                                        <FileText size={20} style={{ color: 'var(--accent)' }} />
                                        <div className="flex flex-col">
                                          <span className="text-sm font-medium">{attachment.file_name}</span>
                                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {(attachment.file_size / 1024).toFixed(1)} KB
                                          </span>
                                        </div>
                                        <Download size={16} style={{ color: 'var(--text-muted)' }} />
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {isOwnMessage && !isEditing && hoveredMessageId === message.id && (
                      <div className="absolute top-0 right-0 flex gap-1">
                        <button
                          onClick={() => handleEditMessage(message.id, message.content)}
                          className="p-1 rounded transition-colors"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                          title="Edit message"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="p-1 rounded transition-colors"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                          title="Delete message"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
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
                const isEditing = editingMessageId === dm.id;
                return (
                  <div
                    key={dm.id}
                    className="message flex gap-3 group relative"
                    onMouseEnter={() => setHoveredMessageId(dm.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
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
                        {dm.edited_at && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            (edited)
                          </span>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={editingMessageContent}
                            onChange={(e) => setEditingMessageContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveMessageEdit();
                              if (e.key === 'Escape') handleCancelMessageEdit();
                            }}
                            className="input-field flex-1 py-1 text-sm"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveMessageEdit}
                            className="p-1 rounded transition-colors"
                            style={{ color: '#10b981' }}
                            title="Save"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={handleCancelMessageEdit}
                            className="p-1 rounded transition-colors"
                            style={{ color: '#ef4444' }}
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p style={{ color: 'var(--text)' }}>{dm.content}</p>
                          {dm.attachments && dm.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {dm.attachments.map((attachment) => {
                                const { data } = supabase.storage.from('uploads').getPublicUrl(attachment.storage_path);
                                const isImage = attachment.file_type.startsWith('image/');

                                return (
                                  <div key={attachment.id}>
                                    {isImage ? (
                                      <a href={data.publicUrl} target="_blank" rel="noopener noreferrer">
                                        <img
                                          src={data.publicUrl}
                                          alt={attachment.file_name}
                                          className="rounded-lg max-w-xs max-h-64 object-cover cursor-pointer transition-opacity"
                                          style={{ border: '1px solid var(--border)' }}
                                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        href={data.publicUrl}
                                        download={attachment.file_name}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                                      >
                                        <FileText size={20} style={{ color: 'var(--accent)' }} />
                                        <div className="flex flex-col">
                                          <span className="text-sm font-medium">{attachment.file_name}</span>
                                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {(attachment.file_size / 1024).toFixed(1)} KB
                                          </span>
                                        </div>
                                        <Download size={16} style={{ color: 'var(--text-muted)' }} />
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {isOwnMessage && !isEditing && hoveredMessageId === dm.id && (
                      <div className="absolute top-0 right-0 flex gap-1">
                        <button
                          onClick={() => handleEditMessage(dm.id, dm.content)}
                          className="p-1 rounded transition-colors"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                          title="Edit message"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(dm.id)}
                          className="p-1 rounded transition-colors"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                          title="Delete message"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          {selectedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  {file.type.startsWith('image/') ? (
                    <ImageIcon size={16} style={{ color: 'var(--accent)' }} />
                  ) : (
                    <FileText size={16} style={{ color: 'var(--accent)' }} />
                  )}
                  <span className="text-sm truncate max-w-[150px]" style={{ color: 'var(--text)' }}>
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(index)}
                    className="p-0.5 rounded transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg transition-colors"
              style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              disabled={uploadingFile || loading}
              title="Attach files"
            >
              <Paperclip size={20} />
            </button>
            <input
              className="input-field flex-1"
              placeholder={
                viewMode === 'servers'
                  ? `Message #${selectedChannel?.name || 'channel'}`
                  : `Message ${selectedFriend?.username || 'friend'}`
              }
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              disabled={(viewMode === 'servers' && !selectedChannel) || (viewMode === 'friends' && !selectedFriend) || loading || uploadingFile}
            />
            <button
              type="submit"
              disabled={
                (!messageInput.trim() && selectedFiles.length === 0) ||
                (viewMode === 'servers' && !selectedChannel) ||
                (viewMode === 'friends' && !selectedFriend) ||
                loading ||
                uploadingFile
              }
              className="btn-primary flex items-center gap-2"
              style={{
                opacity:
                  (!messageInput.trim() && selectedFiles.length === 0) ||
                  (viewMode === 'servers' && !selectedChannel) ||
                  (viewMode === 'friends' && !selectedFriend) ||
                  loading ||
                  uploadingFile
                    ? 0.5
                    : 1,
              }}
            >
              {uploadingFile ? (
                <div className="w-5 h-5 border-2 border-t-2 rounded-full animate-spin" style={{ borderColor: 'white', borderTopColor: 'transparent' }} />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Member List Sidebar - Only show for servers, not for friends */}
      {viewMode === 'servers' && showMemberList && <MemberList serverId={selectedServer} />}
    </div>
  );
}
