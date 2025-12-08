import { useState, useEffect } from 'react';
import { X, Pin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PinnedMessage {
  id: string;
  message_id: string;
  channel_id: string;
  pinned_by: string;
  pinned_at: string;
  message: {
    content: string;
    user_id: string;
    profiles: {
      username: string;
    };
  };
}

interface PinnedMessagesBarProps {
  channelId: string;
  onJumpToMessage: (messageId: string) => void;
  canUnpin: boolean;
  onUnpin: (messageId: string) => void;
}

export default function PinnedMessagesBar({
  channelId,
  onJumpToMessage,
  canUnpin,
  onUnpin,
}: PinnedMessagesBarProps) {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPinnedMessages();
    subscribeToChanges();
  }, [channelId]);

  const loadPinnedMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pinned_messages')
        .select(`
          id,
          message_id,
          channel_id,
          pinned_by,
          pinned_at,
          message:message_id (
            content,
            user_id,
            profiles:user_id (username)
          )
        `)
        .eq('channel_id', channelId)
        .order('pinned_at', { ascending: false });

      if (error) throw error;

      setPinnedMessages((data || []) as unknown as PinnedMessage[]);
    } catch (error) {
      console.error('Error loading pinned messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    const subscription = supabase
      .channel(`pinned-messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pinned_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          loadPinnedMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  if (loading || pinnedMessages.length === 0) {
    return null;
  }

  return (
    <div
      className="px-4 py-2 flex flex-col gap-1"
      style={{
        background: 'rgba(251, 191, 36, 0.05)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {pinnedMessages.map((pinned) => (
        <div
          key={pinned.id}
          className="flex items-center gap-2 group"
        >
          <Pin
            size={14}
            style={{ color: '#fbbf24', transform: 'rotate(45deg)' }}
            className="flex-shrink-0"
          />
          <button
            onClick={() => onJumpToMessage(pinned.message_id)}
            className="flex-1 text-left text-sm px-2 py-1 rounded transition-colors truncate"
            style={{ color: 'var(--text)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span className="font-semibold" style={{ color: '#fbbf24' }}>
              {pinned.message.profiles.username}:
            </span>{' '}
            {pinned.message.content.length > 80
              ? pinned.message.content.substring(0, 80) + '...'
              : pinned.message.content}
          </button>
          {canUnpin && (
            <button
              onClick={() => onUnpin(pinned.message_id)}
              className="p-1 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              title="Unpin message"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
