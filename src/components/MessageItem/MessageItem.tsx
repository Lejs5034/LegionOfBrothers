import { useState, useEffect } from 'react';
import { Edit2, Trash2, Check, X, Reply, FileText, Download, CornerDownRight, AtSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MentionPill from '../MentionPill/MentionPill';

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
}

interface MessageItemProps {
  message: {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
    edited_at?: string | null;
    parent_message_id?: string | null;
    profiles?: {
      username: string;
    };
    attachments?: Attachment[];
  };
  currentUserId: string;
  currentUsername?: string;
  isEditing: boolean;
  editingContent: string;
  onEditStart: (id: string, content: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onEditContentChange: (content: string) => void;
  onDelete: (id: string) => void;
  onReply: (message: any) => void;
  replyCount?: number;
  onJumpToReplies?: (parentId: string) => void;
}

export default function MessageItem({
  message,
  currentUserId,
  currentUsername,
  isEditing,
  editingContent,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditContentChange,
  onDelete,
  onReply,
  replyCount = 0,
  onJumpToReplies,
}: MessageItemProps) {
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [parentMessage, setParentMessage] = useState<any>(null);
  const [isMentioned, setIsMentioned] = useState(false);
  const [isReplyToMe, setIsReplyToMe] = useState(false);
  const isOwnMessage = message.user_id === currentUserId;

  useEffect(() => {
    if (message.parent_message_id) {
      loadParentMessage();
    }
    checkMentions();
  }, [message.parent_message_id, message.content, currentUsername]);

  const checkMentions = () => {
    if (currentUsername && message.content.includes(`@${currentUsername}`)) {
      setIsMentioned(true);
    }
  };

  const loadParentMessage = async () => {
    if (!message.parent_message_id) return;

    const { data } = await supabase
      .from('messages')
      .select('id, content, user_id, profiles:user_id(username)')
      .eq('id', message.parent_message_id)
      .maybeSingle();

    if (data) {
      setParentMessage(data);
      if (data.user_id === currentUserId) {
        setIsReplyToMe(true);
      }
    }
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-message');
      setTimeout(() => element.classList.remove('highlight-message'), 2000);
    }
  };

  const renderMessageContent = (content: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      const username = match[1];
      parts.push(
        <MentionPill
          key={`mention-${match.index}`}
          username={username}
          userId=""
        />
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  const hasHighlight = isMentioned || isReplyToMe;
  const highlightStyle = hasHighlight ? {
    background: 'rgba(251, 191, 36, 0.08)',
    borderLeft: '3px solid var(--accent)',
    paddingLeft: '8px',
    borderRadius: '8px',
  } : {};

  const jumpToFirstReply = () => {
    if (replyCount === 0 || !onJumpToReplies) return;
    onJumpToReplies(message.id);
  };

  return (
    <div
      id={`message-${message.id}`}
      className="message flex gap-3 group relative"
      style={highlightStyle}
      onMouseEnter={() => setHoveredMessageId(message.id)}
      onMouseLeave={() => setHoveredMessageId(null)}
    >
      <div
        className="size-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
        style={{ background: 'var(--accent-grad)' }}
      >
        {message.profiles?.username?.[0]?.toUpperCase() || 'U'}
      </div>
      <div className="flex-1">
        {parentMessage && (
          <button
            onClick={() => scrollToMessage(parentMessage.id)}
            className="flex items-center gap-1 mb-1 text-xs px-2 py-1 rounded transition-colors"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--surface-2)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
          >
            <span>↩︎</span>
            <span>
              Replying to <strong>{parentMessage.profiles?.username || 'Unknown'}</strong>
            </span>
          </button>
        )}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold" style={{ color: 'var(--text)' }}>
            {message.profiles?.username || 'Unknown'}
          </span>
          {isMentioned && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--accent)',
                color: 'white',
                fontWeight: '600',
              }}
            >
              <AtSign size={10} className="inline" style={{ marginRight: '2px' }} />
              mentioned
            </span>
          )}
          {isReplyToMe && !isMentioned && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--accent)',
                color: 'white',
                fontWeight: '600',
              }}
            >
              <Reply size={10} className="inline" style={{ marginRight: '2px' }} />
              reply
            </span>
          )}
          <span className="timestamp">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
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
              value={editingContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onEditSave();
                if (e.key === 'Escape') onEditCancel();
              }}
              className="input-field flex-1 py-1 text-sm"
              autoFocus
            />
            <button
              onClick={onEditSave}
              className="p-1 rounded transition-colors"
              style={{ color: '#10b981' }}
              title="Save"
            >
              <Check size={18} />
            </button>
            <button
              onClick={onEditCancel}
              className="p-1 rounded transition-colors"
              style={{ color: '#ef4444' }}
              title="Cancel"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text)' }}>{renderMessageContent(message.content)}</p>
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.attachments.map((attachment) => {
                  const { data } = supabase.storage
                    .from('uploads')
                    .getPublicUrl(attachment.storage_path);
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
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                          />
                        </a>
                      ) : (
                        <a
                          href={data.publicUrl}
                          download={attachment.file_name}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                          style={{
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = 'var(--surface)')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = 'var(--surface-2)')
                          }
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
            {replyCount > 0 && onJumpToReplies && (
              <button
                onClick={jumpToFirstReply}
                className="flex items-center gap-1 mt-2 text-xs px-2 py-1 rounded transition-colors"
                style={{
                  color: 'var(--text-muted)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-2)';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <span>↩︎</span>
                <span>
                  {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                </span>
              </button>
            )}
          </>
        )}
      </div>
      {!isEditing && hoveredMessageId === message.id && (
        <div className="absolute top-0 right-0 flex gap-1">
          <button
            onClick={() => onReply(message)}
            className="p-1 rounded transition-colors"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            title="Reply to message"
          >
            <Reply size={16} />
          </button>
          {isOwnMessage && (
            <>
              <button
                onClick={() => onEditStart(message.id, message.content)}
                className="p-1 rounded transition-colors"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                title="Edit message"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 rounded transition-colors"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                title="Delete message"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
