import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Settings, Dumbbell, TrendingUp, Pencil, Briefcase, Send, LogOut, X, User, Mail, Lock, Edit2, UserPlus, Users, MoreVertical, Trash2, Check, Paperclip, Download, FileText, Image as ImageIcon, Building2, PanelRightClose, PanelRight, AtSign, Plus, Trash, Menu, Camera, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import FriendRequest from '../components/FriendRequest/FriendRequest';
import MemberList from '../components/MemberList/MemberList';
import MessageItem from '../components/MessageItem/MessageItem';
import MentionDropdown from '../components/MentionDropdown/MentionDropdown';
import UserProfileModal from '../components/UserProfileModal/UserProfileModal';
import PinnedMessagesBar from '../components/PinnedMessagesBar/PinnedMessagesBar';
import RoleSelector from '../components/RoleSelector/RoleSelector';
import { findMentionTrigger, insertMention, extractMentions, getCaretPosition } from '../utils/mentionUtils';
import { getRankOrder } from '../utils/rankUtils';
import { getRankDisplayInfo } from '../utils/displayRankUtils';

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
  parent_message_id?: string | null;
  profiles?: {
    username: string;
    global_rank?: string;
    avatar_url?: string;
  };
  attachments?: Attachment[];
}

interface Channel {
  id: string;
  name: string;
  server_id: string;
  allowed_writer_roles?: string[] | null;
}

interface Friend {
  id: string;
  username: string;
  avatar_url?: string;
  global_rank?: string;
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
    avatar_url?: string;
    global_rank?: string;
  };
  receiver?: {
    username: string;
    avatar_url?: string;
    global_rank?: string;
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [mentionsCount, setMentionsCount] = useState(0);
  const [showMentionsOnly, setShowMentionsOnly] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [serverMembers, setServerMembers] = useState<Array<{ id: string; username: string; avatar_url?: string; global_rank: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState<string>('user');
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<string>>(new Set());
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [newChannelWriterRoles, setNewChannelWriterRoles] = useState<string[]>([]);
  const [hoveredChannelId, setHoveredChannelId] = useState<string | null>(null);
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileMembers, setShowMobileMembers] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [canWriteInChannel, setCanWriteInChannel] = useState(true);
  const [showEditChannelPermissions, setShowEditChannelPermissions] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingChannelWriterRoles, setEditingChannelWriterRoles] = useState<string[]>([]);
  const [updatingChannelPermissions, setUpdatingChannelPermissions] = useState(false);

  useEffect(() => {
    localStorage.setItem('showMemberList', JSON.stringify(showMemberList));
  }, [showMemberList]);

  useEffect(() => {
    const checkWritePermission = async () => {
      if (viewMode === 'friends' || !selectedChannel || !userId) {
        setCanWriteInChannel(true);
        return;
      }

      const allowedRoles = selectedChannel.allowed_writer_roles;

      if (!allowedRoles || allowedRoles.length === 0) {
        setCanWriteInChannel(true);
        return;
      }

      setCanWriteInChannel(allowedRoles.includes(currentUserRank));
    };

    checkWritePermission();
  }, [selectedChannel, currentUserRank, userId, viewMode]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate('/sign-in');
      } else {
        setUserEmail(data.session.user.email || 'user@email.com');
        setUserId(data.session.user.id);

        await supabase.rpc('update_login_streak', { user_id: data.session.user.id });

        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url, global_rank')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (profile) {
          setUsername(profile.username);
          setAvatarUrl(profile.avatar_url || '');
          setCurrentUserRank(profile.global_rank);
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

  const loadServerMembers = useCallback(async () => {
    try {
      const serverSlug = serverSlugs[selectedServer as keyof typeof serverSlugs];
      if (!serverSlug) {
        console.log('[Mentions] No server slug found');
        return;
      }

      console.log('[Mentions] Loading members for server:', serverSlug);

      const { data: serverData, error: serverError } = await supabase
        .from('servers')
        .select('id')
        .eq('slug', serverSlug)
        .maybeSingle();

      if (serverError || !serverData) {
        console.error('[Mentions] Error loading server:', serverError);
        return;
      }

      console.log('[Mentions] Server ID:', serverData.id);

      const { data: members, error: membersError } = await supabase
        .from('server_members')
        .select(`
          user_id,
          profiles:user_id (
            id,
            username,
            avatar_url,
            global_rank
          )
        `)
        .eq('server_id', serverData.id);

      if (membersError) {
        console.error('[Mentions] Error loading members:', membersError);
        return;
      }

      console.log('[Mentions] Raw members data:', members);

      const validMembers = (members || [])
        .filter(m => m.profiles && (m.profiles as any).id && (m.profiles as any).username)
        .map(m => {
          const profile = m.profiles as any;
          return {
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            global_rank: profile.global_rank || 'user',
          };
        });

      console.log('[Mentions] Valid members loaded:', validMembers.length, validMembers);
      setServerMembers(validMembers);
    } catch (error) {
      console.error('[Mentions] Error loading server members:', error);
      setServerMembers([]);
    }
  }, [selectedServer]);

  useEffect(() => {
    if (!ready) return;
    if (viewMode === 'servers') {
      loadChannels();
      loadServerMembers();
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
        sender:sender_id(id, username, avatar_url, global_rank),
        receiver:receiver_id(id, username, avatar_url, global_rank)
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
            global_rank: friend.global_rank,
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
        profiles:user_id (username, global_rank, avatar_url)
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
      loadReplyCounts(messagesWithAttachments);
    }

    loadPinnedMessages();
  }, [selectedChannel]);

  const loadPinnedMessages = async () => {
    if (!selectedChannel) return;

    try {
      const { data, error } = await supabase
        .from('pinned_messages')
        .select('message_id')
        .eq('channel_id', selectedChannel.id);

      if (error) throw error;

      const pinnedIds = new Set((data || []).map((p) => p.message_id));
      setPinnedMessageIds(pinnedIds);
    } catch (error) {
      console.error('Error loading pinned messages:', error);
    }
  };

  const loadReplyCounts = async (messages: Message[]) => {
    const counts: Record<string, number> = {};

    await Promise.all(
      messages.map(async (msg) => {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('parent_message_id', msg.id);

        if (count && count > 0) {
          counts[msg.id] = count;
        }
      })
    );

    setReplyCounts(counts);
    loadMentionsCount(messages);
  };

  const loadMentionsCount = (messages: Message[]) => {
    if (!username) return;

    const mentionedMessages = messages.filter((msg) => {
      const isMentioned = msg.content.includes(`@${username}`);
      const isReplyToMe = messages.some(
        (m) => m.parent_message_id === msg.id && m.user_id === userId
      );
      return (isMentioned || isReplyToMe) && msg.user_id !== userId;
    });

    setMentionsCount(mentionedMessages.length);
  };

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
            .select('username, global_rank, avatar_url')
            .eq('id', payload.new.user_id)
            .maybeSingle();

          const { data: attachments } = await supabase
            .from('message_attachments')
            .select('*')
            .eq('message_id', payload.new.id);

          const newMessage = {
            ...payload.new,
            profiles: profileData,
            attachments: attachments || [],
          } as Message;

          console.log('Adding message to state:', newMessage);
          setMessages((prev) => {
            const messageExists = prev.some(msg => msg.id === newMessage.id);
            if (messageExists) {
              console.log('Message already exists, skipping duplicate:', newMessage.id);
              return prev;
            }
            return [...prev, newMessage];
          });
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
        sender:sender_id(username, avatar_url, global_rank),
        receiver:receiver_id(username, avatar_url, global_rank)
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
            .select('username, avatar_url')
            .eq('id', payload.new.sender_id)
            .maybeSingle();

          const { data: attachments } = await supabase
            .from('message_attachments')
            .select('*')
            .eq('direct_message_id', payload.new.id);

          const newMessage = {
            ...payload.new,
            sender: senderData,
            attachments: attachments || [],
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

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        const activeElement = document.activeElement;
        if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
          return;
        }

        const hoveredMessage = messages.find((msg) => {
          const element = document.getElementById(`message-${msg.id}`);
          return element?.matches(':hover');
        });

        if (hoveredMessage) {
          e.preventDefault();
          handleReply(hoveredMessage);
        }
      }

      if (e.key === 'Escape' && replyingTo) {
        handleCancelReply();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [messages, replyingTo]);

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

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setMessageInput(`@${message.profiles?.username} `);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setMessageInput('');
  };

  const handleViewReplies = (parentId: string) => {
    const firstReply = messages.find((msg) => msg.parent_message_id === parentId);
    if (firstReply) {
      const element = document.getElementById(`message-${firstReply.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-message');
        setTimeout(() => element.classList.remove('highlight-message'), 2000);
      }
    }
  };

  const handleTogglePin = async (messageId: string, isPinned: boolean) => {
    if (!selectedChannel) return;

    try {
      const serverSlug = serverSlugs[selectedServer as keyof typeof serverSlugs];
      const { data: serverData } = await supabase
        .from('servers')
        .select('id')
        .eq('slug', serverSlug)
        .maybeSingle();

      if (!serverData) return;

      if (isPinned) {
        const { error } = await supabase
          .from('pinned_messages')
          .delete()
          .eq('message_id', messageId)
          .eq('channel_id', selectedChannel.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pinned_messages')
          .insert({
            message_id: messageId,
            channel_id: selectedChannel.id,
            server_id: serverData.id,
            pinned_by: userId,
          });

        if (error) throw error;
      }

      await loadPinnedMessages();
    } catch (error: any) {
      console.error('Error toggling pin:', error);
      alert(`Failed to ${isPinned ? 'unpin' : 'pin'} message: ${error.message}`);
    }
  };

  const handleJumpToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-message');
      setTimeout(() => element.classList.remove('highlight-message'), 2000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && selectedFiles.length === 0) || loading) return;

    if (viewMode === 'servers' && !selectedChannel) return;
    if (viewMode === 'friends' && !selectedFriend) return;

    setShowMentionDropdown(false);
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
            parent_message_id: replyingTo?.id || null,
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

          if (data) {
            const mentions = extractMentions(messageInput, serverMembers);
            if (mentions.length > 0) {
              const mentionRecords = mentions.map(mention => ({
                message_id: data.id,
                mentioned_user_id: mention.userId,
                mentioning_user_id: userId,
              }));

              await supabase.from('message_mentions').insert(mentionRecords);
            }
          }

          setMessageInput('');
          setSelectedFiles([]);
          setReplyingTo(null);
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

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMessageInput(newValue);

    if (viewMode !== 'servers') {
      setShowMentionDropdown(false);
      return;
    }

    const input = messageInputRef.current;
    if (!input) {
      setShowMentionDropdown(false);
      return;
    }

    const cursorPos = input.selectionStart || 0;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    console.log('[Mentions] Input changed:', { newValue, cursorPos, lastAtSymbol });

    if (lastAtSymbol === -1) {
      setShowMentionDropdown(false);
      return;
    }

    const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
    const hasSpace = /\s/.test(textAfterAt);

    console.log('[Mentions] After @:', { textAfterAt, hasSpace });

    if (hasSpace) {
      setShowMentionDropdown(false);
      return;
    }

    setMentionStartPos(lastAtSymbol);
    setMentionSearchTerm(textAfterAt);

    console.log('[Mentions] Showing dropdown, searchTerm:', textAfterAt);
    setShowMentionDropdown(true);
  };

  const handleMentionSelect = (member: { id: string; username: string }) => {
    const newText = insertMention(
      messageInput,
      mentionStartPos,
      mentionSearchTerm.length,
      member.username
    );
    setMessageInput(newText);
    setShowMentionDropdown(false);

    setTimeout(() => {
      messageInputRef.current?.focus();
      const newCaretPos = mentionStartPos + member.username.length + 2;
      messageInputRef.current?.setSelectionRange(newCaretPos, newCaretPos);
    }, 0);
  };

  const handleCloseMentionDropdown = () => {
    setShowMentionDropdown(false);
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

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (PNG, JPG, JPEG, or WEBP)');
      return;
    }

    if (file.size > 5242880) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
      setShowAvatarUpload(true);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!selectedAvatarFile || !userId) return;

    try {
      setUploadingAvatar(true);

      const fileExt = selectedAvatarFile.name.split('.').pop();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${userId}/${oldPath}`]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedAvatarFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(urlData.publicUrl);
      setShowAvatarUpload(false);
      setSelectedAvatarFile(null);
      setAvatarPreview(null);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert(error.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const cancelAvatarUpload = () => {
    setShowAvatarUpload(false);
    setSelectedAvatarFile(null);
    setAvatarPreview(null);
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || creatingChannel) return;

    const serverSlug = serverSlugs[selectedServer as keyof typeof serverSlugs];
    if (!serverSlug) return;

    setCreatingChannel(true);

    try {
      const { data: serverData, error: serverError } = await supabase
        .from('servers')
        .select('id')
        .eq('slug', serverSlug)
        .maybeSingle();

      if (serverError || !serverData) {
        alert(`Failed to find server: ${serverError?.message || 'Server not found'}`);
        return;
      }

      const { data: maxSortOrder } = await supabase
        .from('channels')
        .select('sort_order')
        .eq('server_id', serverData.id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSortOrder = (maxSortOrder?.sort_order || 0) + 1;

      const { error } = await supabase
        .from('channels')
        .insert({
          server_id: serverData.id,
          name: newChannelName.trim().toLowerCase(),
          type: 'text',
          sort_order: nextSortOrder,
          allowed_writer_roles: newChannelWriterRoles.length === 0 ? null : newChannelWriterRoles,
        });

      if (error) {
        alert(`Failed to create channel: ${error.message}`);
      } else {
        setNewChannelName('');
        setNewChannelWriterRoles([]);
        setShowCreateChannel(false);
        await loadChannels();
      }
    } catch (error: any) {
      console.error('Error creating channel:', error);
      alert('An unexpected error occurred');
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleEditChannelPermissions = (channel: Channel) => {
    setEditingChannelId(channel.id);
    setEditingChannelWriterRoles(channel.allowed_writer_roles || []);
    setShowEditChannelPermissions(true);
  };

  const handleUpdateChannelPermissions = async () => {
    if (!editingChannelId || updatingChannelPermissions) return;

    setUpdatingChannelPermissions(true);

    try {
      const { error } = await supabase
        .from('channels')
        .update({
          allowed_writer_roles: editingChannelWriterRoles.length === 0 ? null : editingChannelWriterRoles,
        })
        .eq('id', editingChannelId);

      if (error) {
        alert(`Failed to update channel permissions: ${error.message}`);
      } else {
        setShowEditChannelPermissions(false);
        setEditingChannelId(null);
        setEditingChannelWriterRoles([]);
        await loadChannels();
      }
    } catch (error: any) {
      console.error('Error updating channel permissions:', error);
      alert('An unexpected error occurred');
    } finally {
      setUpdatingChannelPermissions(false);
    }
  };

  const handleDeleteChannel = async (channelId: string, channelName: string) => {
    if (!confirm(`Are you sure you want to delete the channel #${channelName}? This action cannot be undone.`)) {
      return;
    }

    setDeletingChannelId(channelId);

    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId);

      if (error) {
        alert(`Failed to delete channel: ${error.message}`);
      } else {
        if (selectedChannel?.id === channelId) {
          setSelectedChannel(null);
          setMessages([]);
        }
        await loadChannels();
      }
    } catch (error: any) {
      console.error('Error deleting channel:', error);
      alert('An unexpected error occurred');
    } finally {
      setDeletingChannelId(null);
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
    <div className="h-screen overflow-hidden flex flex-col md:grid" style={{
      gridTemplateColumns: viewMode === 'servers' && showMemberList ? '72px 240px 1fr 240px' : '72px 240px 1fr',
      background: 'var(--bg)',
      color: 'var(--text)'
    }}>
      {/* Mobile Header Bar - Only visible on mobile */}
      <div className="md:hidden flex items-center px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setShowMobileMenu(true)}
          className="p-2 rounded-lg transition-colors flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {viewMode === 'servers' ? (
            <>
              <Hash size={18} style={{ color: 'var(--text-muted)' }} />
              <h2 className="font-semibold capitalize truncate" style={{ color: 'var(--text)' }}>
                {selectedChannel?.name || 'Select a channel'}
              </h2>
            </>
          ) : (
            <>
              <div
                className="size-8 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0"
                style={{
                  background: selectedFriend?.global_rank
                    ? `${getRankDisplayInfo(selectedFriend.global_rank).color}40`
                    : 'var(--accent-grad)',
                  color: selectedFriend?.global_rank
                    ? getRankDisplayInfo(selectedFriend.global_rank).color
                    : 'white',
                  border: selectedFriend?.global_rank
                    ? `2px solid ${getRankDisplayInfo(selectedFriend.global_rank).color}20`
                    : 'none'
                }}
              >
                {selectedFriend?.avatar_url ? (
                  <img
                    src={selectedFriend.avatar_url}
                    alt={selectedFriend.username}
                    className="size-full object-cover"
                  />
                ) : (
                  selectedFriend?.username[0].toUpperCase() || '?'
                )}
              </div>
              <h2
                className="font-semibold truncate flex items-center gap-1.5"
                style={{
                  color: selectedFriend?.global_rank
                    ? getRankDisplayInfo(selectedFriend.global_rank).color
                    : 'var(--text)'
                }}
              >
                <span className="truncate">
                  {selectedFriend?.username || 'Select a friend'}
                </span>
                {selectedFriend?.global_rank && (
                  <span className="text-base flex-shrink-0">
                    {getRankDisplayInfo(selectedFriend.global_rank).emoji}
                  </span>
                )}
              </h2>
            </>
          )}
        </div>
        {viewMode === 'servers' && (
          <button
            onClick={() => setShowMobileMembers(true)}
            className="p-2 rounded-lg transition-colors flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            <Users size={24} />
          </button>
        )}
      </div>

      {/* Mobile Menu Drawer - Servers + Channels */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-50 flex"
            style={{ background: 'rgba(0, 0, 0, 0.4)' }}
            onClick={() => setShowMobileMenu(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="w-[85%] max-w-sm h-full overflow-y-auto flex"
              style={{ background: 'var(--bg)' }}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Server Icons Column */}
            <div className="w-[72px] flex-shrink-0 sidebar flex flex-col items-center py-3 gap-2">
              <button
                onClick={() => {
                  handleFriendsClick();
                  setShowMobileMenu(false);
                }}
                className={`server-icon ${viewMode === 'friends' ? 'active' : ''}`}
                title="Friends"
                style={{
                  color: viewMode === 'friends' ? '#ffffff' : '#71717a'
                }}
              >
                <Users size={24} />
              </button>
              <div className="w-8 h-px my-1" style={{ background: 'var(--border)' }} />
              {servers.map((server) => {
                const Icon = server.icon;
                const isActive = viewMode === 'servers' && selectedServer === server.id;
                return (
                  <button
                    key={server.id}
                    onClick={() => {
                      handleServerChange(server.id);
                    }}
                    className={`server-icon ${isActive ? 'active' : ''}`}
                    title={server.name}
                    style={{
                      color: isActive ? '#ffffff' : '#71717a'
                    }}
                  >
                    <Icon size={24} />
                  </button>
                );
              })}
            </div>

            {/* Channels/Friends List Column */}
            <div className="flex-1 sidebar flex flex-col overflow-hidden">
              <div className="p-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex-1">
                  <h1 className="font-bold text-lg" style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', color: 'transparent', backgroundClip: 'text' }}>
                    {viewMode === 'friends' ? 'Friends' : currentServer?.name}
                  </h1>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {viewMode === 'friends' ? 'Direct Messages' : 'The Legion Community'}
                  </p>
                </div>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-lg transition-colors ml-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={20} />
                </button>
              </div>

              {viewMode === 'servers' && currentServer && (
                <div className="px-3 py-2">
                  <button
                    onClick={() => {
                      navigate(`/servers/${serverSlugs[selectedServer as keyof typeof serverSlugs]}/learning`);
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm text-white transition-all duration-200"
                    style={{
                      background: `linear-gradient(135deg, ${getGradientColors(currentServer.gradient)})`,
                    }}
                  >
                    {(() => {
                      const Icon = currentServer.icon;
                      return <Icon size={18} />;
                    })()}
                    <span>Courses</span>
                  </button>
                </div>
              )}

              <nav className="px-2 py-3 space-y-1 overflow-y-auto flex-1">
                {viewMode === 'servers' ? (
                  <>
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Channels
                      </div>
                      {getRankOrder(currentUserRank) >= 40 && (
                        <button
                          onClick={() => {
                            setShowCreateChannel(true);
                            setShowMobileMenu(false);
                          }}
                          className="p-1 rounded transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          title="Create Channel"
                        >
                          <Plus size={16} />
                        </button>
                      )}
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
                          className={`channel-item flex items-center ${selectedChannel?.id === channel.id ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedChannel(channel);
                            setShowMobileMenu(false);
                          }}
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
                        onClick={() => {
                          setShowFriendRequests(true);
                          setShowMobileMenu(false);
                        }}
                        className="p-1 rounded transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        title="Friend Requests"
                      >
                        <UserPlus size={16} />
                      </button>
                    </div>
                    {friends.length === 0 ? (
                      <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                        No friends yet
                      </div>
                    ) : (
                      friends.map((friend) => (
                        <div
                          key={friend.id}
                          className={`channel-item flex items-center ${selectedFriend?.id === friend.id ? 'active' : ''}`}
                          onClick={() => {
                            handleFriendClick(friend);
                            setShowMobileMenu(false);
                          }}
                        >
                          <div
                            className="size-8 rounded-full flex items-center justify-center text-white font-bold text-xs mr-2 overflow-hidden flex-shrink-0"
                            style={{
                              background: friend.global_rank
                                ? `${getRankDisplayInfo(friend.global_rank).color}40`
                                : 'var(--accent-grad)',
                              color: friend.global_rank
                                ? getRankDisplayInfo(friend.global_rank).color
                                : 'white',
                              border: friend.global_rank
                                ? `2px solid ${getRankDisplayInfo(friend.global_rank).color}20`
                                : 'none'
                            }}
                          >
                            {friend.avatar_url ? (
                              <img
                                src={friend.avatar_url}
                                alt={friend.username}
                                className="size-full object-cover"
                              />
                            ) : (
                              friend.username[0].toUpperCase()
                            )}
                          </div>
                          <span
                            style={{
                              color: friend.global_rank
                                ? getRankDisplayInfo(friend.global_rank).color
                                : 'inherit'
                            }}
                          >
                            {friend.username}
                          </span>
                          {friend.global_rank && (
                            <span className="text-sm ml-1">
                              {getRankDisplayInfo(friend.global_rank).emoji}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}
              </nav>

              <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => {
                    setShowSettings(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                  style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                >
                  <Settings size={18} />
                  <span className="font-medium">Settings</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Members Drawer */}
      <AnimatePresence>
        {showMobileMembers && viewMode === 'servers' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-50 flex justify-end"
            style={{ background: 'rgba(0, 0, 0, 0.4)' }}
            onClick={() => setShowMobileMembers(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="w-[85%] max-w-sm h-full overflow-y-auto"
              style={{ background: 'var(--bg)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 flex items-center justify-between sidebar" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Members</h2>
                <button
                  onClick={() => setShowMobileMembers(false)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={20} />
                </button>
              </div>
              <MemberList
                serverId={serverSlugs[selectedServer as keyof typeof serverSlugs] || selectedServer}
                isMobile={true}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Server List - Hidden on mobile */}
      <aside className="hidden md:flex sidebar flex-col items-center py-3 gap-2 overflow-y-auto">
        <button
          onClick={handleFriendsClick}
          className={`server-icon ${viewMode === 'friends' ? 'active' : ''}`}
          title="Friends"
          style={{
            color: viewMode === 'friends' ? '#ffffff' : '#71717a'
          }}
        >
          <Users size={24} />
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
              style={{
                color: isActive ? '#ffffff' : '#71717a'
              }}
            >
              <Icon size={24} />
            </button>
          );
        })}
      </aside>

      {/* Desktop Channel/Friends Sidebar - Hidden on mobile */}
      <aside className="hidden md:flex sidebar flex-col overflow-hidden">
        <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h1 className="font-bold text-lg" style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', color: 'transparent', backgroundClip: 'text' }}>
            {viewMode === 'friends' ? 'Friends' : currentServer?.name}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {viewMode === 'friends' ? 'Direct Messages' : 'The Legion Community'}
          </p>
        </div>

        {viewMode === 'servers' && currentServer && (
          <div className="px-3 py-2">
            <button
              onClick={() => navigate(`/servers/${serverSlugs[selectedServer as keyof typeof serverSlugs]}/learning`)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm text-white transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, ${getGradientColors(currentServer.gradient)})`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              aria-label={`Open Courses for ${currentServer.name}`}
            >
              {(() => {
                const Icon = currentServer.icon;
                return <Icon size={18} />;
              })()}
              <span>Courses</span>
            </button>
          </div>
        )}

        <nav className="px-2 py-3 space-y-1 overflow-y-auto flex-1">
          {viewMode === 'servers' ? (
            <>
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Channels
                </div>
                {getRankOrder(currentUserRank) >= 40 && (
                  <button
                    onClick={() => setShowCreateChannel(true)}
                    className="p-1 rounded transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    title="Create Channel"
                  >
                    <Plus size={16} />
                  </button>
                )}
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
                    onMouseEnter={() => setHoveredChannelId(channel.id)}
                    onMouseLeave={() => setHoveredChannelId(null)}
                    className={`channel-item flex items-center justify-between ${selectedChannel?.id === channel.id ? 'active' : ''} relative group`}
                  >
                    <div
                      onClick={() => setSelectedChannel(channel)}
                      className="flex items-center space-x-2 flex-1 cursor-pointer"
                    >
                      <Hash size={18} />
                      <span className="capitalize">{channel.name}</span>
                    </div>
                    {getRankOrder(currentUserRank) >= 40 && hoveredChannelId === channel.id && deletingChannelId !== channel.id && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditChannelPermissions(channel);
                          }}
                          className="p-1 rounded transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                          title="Edit permissions"
                        >
                          <Lock size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChannel(channel.id, channel.name);
                          }}
                          className="p-1 rounded transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                          title="Delete channel"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    )}
                    {deletingChannelId === channel.id && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="w-3 h-3 border-2 border-t-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                      </div>
                    )}
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
                      <div
                        className="size-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
                        style={{
                          background: friend.global_rank
                            ? `${getRankDisplayInfo(friend.global_rank).color}40`
                            : 'var(--accent-grad)',
                          color: friend.global_rank
                            ? getRankDisplayInfo(friend.global_rank).color
                            : 'white',
                          border: friend.global_rank
                            ? `2px solid ${getRankDisplayInfo(friend.global_rank).color}20`
                            : 'none'
                        }}
                      >
                        {friend.avatar_url ? (
                          <img
                            src={friend.avatar_url}
                            alt={friend.username}
                            className="size-full object-cover"
                          />
                        ) : (
                          friend.username[0].toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <div
                            className="text-sm font-medium truncate"
                            style={{
                              color: friend.global_rank
                                ? getRankDisplayInfo(friend.global_rank).color
                                : 'var(--text)'
                            }}
                          >
                            {friend.username}
                          </div>
                          {friend.global_rank && (
                            <span className="text-sm flex-shrink-0">
                              {getRankDisplayInfo(friend.global_rank).emoji}
                            </span>
                          )}
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
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username}
              className="size-9 rounded-full object-cover"
              style={{ border: '2px solid rgba(6, 182, 212, 0.3)' }}
            />
          ) : (
            <div className="size-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--accent-grad)' }}>
              {username.charAt(0).toUpperCase() || userEmail.charAt(0).toUpperCase()}
            </div>
          )}
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
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={username}
                      className="size-20 rounded-full object-cover"
                      style={{ border: '3px solid rgba(6, 182, 212, 0.3)' }}
                    />
                  ) : (
                    <div className="size-20 rounded-full flex items-center justify-center text-white font-bold text-2xl" style={{ background: 'var(--accent-grad)' }}>
                      {username.charAt(0).toUpperCase() || userEmail.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleAvatarFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 rounded-full transition-all duration-200 shadow-lg"
                    style={{
                      background: 'rgba(6, 182, 212, 0.9)',
                      border: '2px solid var(--surface)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(6, 182, 212, 1)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(6, 182, 212, 0.9)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Change profile picture"
                  >
                    <Camera size={16} style={{ color: 'white' }} />
                  </button>
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

      {/* Avatar Upload Preview Modal */}
      {showAvatarUpload && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.8)' }} onClick={() => !uploadingAvatar && cancelAvatarUpload()}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-md mx-4 rounded-xl shadow-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="p-3 rounded-full"
                style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                }}
              >
                <Upload size={24} style={{ color: '#06b6d4' }} />
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'white' }}>
                  Change Profile Picture
                </h3>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Preview your new avatar
                </p>
              </div>
            </div>

            <div className="mb-6 flex flex-col items-center">
              <div className="mb-4">
                {avatarPreview && (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="size-32 rounded-full object-cover"
                    style={{ border: '3px solid rgba(6, 182, 212, 0.5)' }}
                  />
                )}
              </div>
              <p className="text-sm text-center" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                This will be your new profile picture
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelAvatarUpload}
                disabled={uploadingAvatar}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                onMouseEnter={(e) => !uploadingAvatar && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
              >
                Cancel
              </button>
              <button
                onClick={handleAvatarUpload}
                disabled={uploadingAvatar}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                style={{
                  background: uploadingAvatar ? 'rgba(6, 182, 212, 0.3)' : 'rgba(6, 182, 212, 0.2)',
                  color: '#06b6d4',
                  border: '1px solid rgba(6, 182, 212, 0.5)',
                }}
                onMouseEnter={(e) => !uploadingAvatar && (e.currentTarget.style.background = 'rgba(6, 182, 212, 0.3)')}
                onMouseLeave={(e) => !uploadingAvatar && (e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)')}
              >
                {uploadingAvatar ? (
                  <>
                    <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Save Picture
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Friend Requests Modal */}
      {showFriendRequests && (
        <FriendRequest userId={userId} onClose={() => setShowFriendRequests(false)} />
      )}

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.7)' }} onClick={() => setShowCreateChannel(false)}>
          <div className="w-full max-w-md mx-4 rounded-lg shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-xl font-bold" style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', color: 'transparent', backgroundClip: 'text' }}>
                Create Channel
              </h2>
              <button
                onClick={() => setShowCreateChannel(false)}
                className="p-2 rounded-lg transition-colors duration-200"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Channel Name
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g., general, announcements"
                  className="input-field w-full"
                  autoFocus
                  disabled={creatingChannel}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Channel names are lowercase and cannot contain spaces
                </p>
              </div>

              <RoleSelector
                selectedRoles={newChannelWriterRoles}
                onChange={setNewChannelWriterRoles}
                disabled={creatingChannel}
              />

              <div className="flex gap-2">
                <button
                  onClick={handleCreateChannel}
                  disabled={!newChannelName.trim() || creatingChannel}
                  className="btn-primary flex-1"
                  style={{
                    opacity: !newChannelName.trim() || creatingChannel ? 0.5 : 1,
                  }}
                >
                  {creatingChannel ? 'Creating...' : 'Create Channel'}
                </button>
                <button
                  onClick={() => setShowCreateChannel(false)}
                  disabled={creatingChannel}
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditChannelPermissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.7)' }} onClick={() => setShowEditChannelPermissions(false)}>
          <div className="w-full max-w-md mx-4 rounded-lg shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-xl font-bold" style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', color: 'transparent', backgroundClip: 'text' }}>
                Edit Channel Permissions
              </h2>
              <button
                onClick={() => setShowEditChannelPermissions(false)}
                className="p-2 rounded-lg transition-colors duration-200"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="mb-2">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Configure who can write messages in this channel. Users can still read messages regardless of these settings.
                </p>
              </div>

              <RoleSelector
                selectedRoles={editingChannelWriterRoles}
                onChange={setEditingChannelWriterRoles}
                disabled={updatingChannelPermissions}
                label="Who can write in this channel?"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleUpdateChannelPermissions}
                  disabled={updatingChannelPermissions}
                  className="btn-primary flex-1"
                  style={{
                    opacity: updatingChannelPermissions ? 0.5 : 1,
                  }}
                >
                  {updatingChannelPermissions ? 'Updating...' : 'Update Permissions'}
                </button>
                <button
                  onClick={() => setShowEditChannelPermissions(false)}
                  disabled={updatingChannelPermissions}
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat section */}
      <main className="flex-1 md:grid grid-rows-[auto_1fr_auto] overflow-hidden flex flex-col">
        {/* Desktop Header - Hidden on mobile */}
        <div className="hidden md:flex px-6 py-4 items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
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
                <div
                  className="size-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0"
                  style={{
                    background: selectedFriend?.global_rank
                      ? `${getRankDisplayInfo(selectedFriend.global_rank).color}40`
                      : 'var(--accent-grad)',
                    color: selectedFriend?.global_rank
                      ? getRankDisplayInfo(selectedFriend.global_rank).color
                      : 'white',
                    border: selectedFriend?.global_rank
                      ? `2px solid ${getRankDisplayInfo(selectedFriend.global_rank).color}20`
                      : 'none'
                  }}
                >
                  {selectedFriend?.avatar_url ? (
                    <img
                      src={selectedFriend.avatar_url}
                      alt={selectedFriend.username}
                      className="size-full object-cover"
                    />
                  ) : (
                    selectedFriend?.username[0].toUpperCase() || '?'
                  )}
                </div>
                <h2
                  className="font-semibold text-lg flex items-center gap-2"
                  style={{
                    color: selectedFriend?.global_rank
                      ? getRankDisplayInfo(selectedFriend.global_rank).color
                      : 'var(--text)'
                  }}
                >
                  {selectedFriend?.username || 'Select a friend'}
                  {selectedFriend?.global_rank && (
                    <span className="text-xl">
                      {getRankDisplayInfo(selectedFriend.global_rank).emoji}
                    </span>
                  )}
                </h2>
              </>
            )}
          </div>
          {viewMode === 'servers' && (
            <div className="flex items-center gap-2">
              {mentionsCount > 0 && (
                <button
                  onClick={() => setShowMentionsOnly(!showMentionsOnly)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 relative"
                  style={{
                    background: showMentionsOnly ? 'var(--accent)' : 'var(--surface-2)',
                    color: showMentionsOnly ? 'white' : 'var(--text)',
                  }}
                  onMouseEnter={(e) => {
                    if (!showMentionsOnly) {
                      e.currentTarget.style.background = 'var(--surface)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = showMentionsOnly ? 'var(--accent)' : 'var(--surface-2)';
                  }}
                  title="Jump to mentions"
                >
                  <AtSign size={16} />
                  <span className="text-sm font-medium">{mentionsCount}</span>
                  {!showMentionsOnly && (
                    <span className="text-xs">mentions</span>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowMemberList(!showMemberList)}
                className="p-2 rounded-lg transition-colors"
                style={{
                  color: 'var(--text-muted)',
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
            </div>
          )}
        </div>

        <div className="flex flex-col overflow-hidden">
          {viewMode === 'servers' && selectedChannel && (
            <PinnedMessagesBar
              channelId={selectedChannel.id}
              onJumpToMessage={handleJumpToMessage}
              canUnpin={getRankOrder(currentUserRank) >= 40}
              onUnpin={(messageId) => handleTogglePin(messageId, true)}
            />
          )}
          <div className="p-6 overflow-y-auto flex flex-col gap-3 flex-1">
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
                messages
                  .filter((msg) => {
                    if (showMentionsOnly) {
                      const isMentioned = msg.content.includes(`@${username}`);
                      const hasReplyToMe = messages.some(
                        (m) => m.parent_message_id === msg.id && m.user_id === userId
                      );
                      return (isMentioned || hasReplyToMe) && msg.user_id !== userId;
                    }
                    return true;
                  })
                  .map((message) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      currentUserId={userId}
                      currentUsername={username}
                      isEditing={editingMessageId === message.id}
                      editingContent={editingMessageContent}
                      onEditStart={handleEditMessage}
                      onEditSave={handleSaveMessageEdit}
                      onEditCancel={handleCancelMessageEdit}
                      onEditContentChange={setEditingMessageContent}
                      onDelete={handleDeleteMessage}
                      onReply={handleReply}
                      replyCount={replyCounts[message.id] || 0}
                      onJumpToReplies={handleViewReplies}
                      onUserClick={(clickedUserId) => {
                        setSelectedUserId(clickedUserId);
                        setShowUserProfile(true);
                      }}
                      canPin={getRankOrder(currentUserRank) >= 40}
                      isPinned={pinnedMessageIds.has(message.id)}
                      onTogglePin={handleTogglePin}
                    />
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
                const isEditing = editingMessageId === dm.id;
                const messageUser = isOwnMessage
                  ? { username, avatar_url: avatarUrl, global_rank: currentUserRank }
                  : {
                      username: dm.sender?.username || 'Unknown',
                      avatar_url: dm.sender?.avatar_url,
                      global_rank: dm.sender?.global_rank
                    };
                return (
                  <div
                    key={dm.id}
                    className="message flex gap-3 group relative"
                    onMouseEnter={() => setHoveredMessageId(dm.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
                    <div
                      className="size-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold overflow-hidden"
                      style={{
                        background: messageUser.global_rank
                          ? `${getRankDisplayInfo(messageUser.global_rank).color}40`
                          : 'var(--accent-grad)',
                        color: messageUser.global_rank
                          ? getRankDisplayInfo(messageUser.global_rank).color
                          : 'white',
                        border: messageUser.global_rank
                          ? `2px solid ${getRankDisplayInfo(messageUser.global_rank).color}20`
                          : 'none'
                      }}
                    >
                      {messageUser.avatar_url ? (
                        <img
                          src={messageUser.avatar_url}
                          alt={messageUser.username}
                          className="size-full object-cover"
                        />
                      ) : (
                        messageUser.username?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span
                          className="font-semibold"
                          style={{
                            color: messageUser.global_rank
                              ? getRankDisplayInfo(messageUser.global_rank).color
                              : 'var(--text)'
                          }}
                        >
                          {messageUser.username}
                        </span>
                        {messageUser.global_rank && (
                          <span className="text-base" title={getRankDisplayInfo(messageUser.global_rank).label}>
                            {getRankDisplayInfo(messageUser.global_rank).emoji}
                          </span>
                        )}
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
        </div>

        <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          {viewMode === 'servers' && !canWriteInChannel && (
            <div
              className="mb-2 px-3 py-2 rounded-lg flex items-center gap-2"
              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              <Lock size={16} style={{ color: '#ef4444' }} />
              <span className="text-sm font-medium" style={{ color: '#ef4444' }}>
                You don't have permission to write in this channel
              </span>
            </div>
          )}
          {replyingTo && (
            <div
              className="mb-2 px-3 py-2 rounded-lg flex items-center justify-between"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Replying to <strong style={{ color: 'var(--text)' }}>{replyingTo.profiles?.username}</strong>
                </span>
                <span className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
                  {replyingTo.content}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelReply}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                title="Cancel reply"
              >
                <X size={16} />
              </button>
            </div>
          )}
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
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
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
              disabled={uploadingFile || loading || (viewMode === 'servers' && !canWriteInChannel)}
              title="Attach files"
            >
              <Paperclip size={20} />
            </button>
            <div className="relative flex-1">
              <input
                ref={messageInputRef}
                className="input-field w-full"
                placeholder={
                  viewMode === 'servers' && !canWriteInChannel
                    ? 'You cannot write in this channel'
                    : viewMode === 'servers'
                    ? `Message #${selectedChannel?.name || 'channel'}`
                    : `Message ${selectedFriend?.username || 'friend'}`
                }
                value={messageInput}
                onChange={handleMessageInputChange}
                disabled={(viewMode === 'servers' && (!selectedChannel || !canWriteInChannel)) || (viewMode === 'friends' && !selectedFriend) || loading || uploadingFile}
              />
              {showMentionDropdown && (
                <MentionDropdown
                  members={serverMembers}
                  searchTerm={mentionSearchTerm}
                  onSelect={handleMentionSelect}
                  onClose={handleCloseMentionDropdown}
                />
              )}
            </div>
            <button
              type="submit"
              disabled={
                (!messageInput.trim() && selectedFiles.length === 0) ||
                (viewMode === 'servers' && (!selectedChannel || !canWriteInChannel)) ||
                (viewMode === 'friends' && !selectedFriend) ||
                loading ||
                uploadingFile
              }
              className="btn-primary flex items-center gap-2"
              style={{
                opacity:
                  (!messageInput.trim() && selectedFiles.length === 0) ||
                  (viewMode === 'servers' && (!selectedChannel || !canWriteInChannel)) ||
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

      {/* Desktop Member List Sidebar - Hidden on mobile */}
      {viewMode === 'servers' && showMemberList && (
        <aside className="hidden md:block">
          <MemberList serverId={serverSlugs[selectedServer as keyof typeof serverSlugs] || selectedServer} />
        </aside>
      )}

      {/* User Profile Modal */}
      {showUserProfile && selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          serverId={viewMode === 'servers' ? (serverSlugs[selectedServer as keyof typeof serverSlugs] || selectedServer) : undefined}
          onClose={() => {
            setShowUserProfile(false);
            setSelectedUserId(null);
          }}
        />
      )}
    </div>
  );
}
