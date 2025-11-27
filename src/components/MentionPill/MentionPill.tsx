import { useState } from 'react';

interface MentionPillProps {
  username: string;
  userId: string;
  avatarUrl?: string;
  isFormerMember?: boolean;
  onClick?: () => void;
}

export default function MentionPill({
  username,
  userId,
  avatarUrl,
  isFormerMember = false,
  onClick,
}: MentionPillProps) {
  const [showHoverCard, setShowHoverCard] = useState(false);

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all relative"
      style={{
        background: isFormerMember ? 'var(--surface-2)' : 'rgba(251, 191, 36, 0.15)',
        color: isFormerMember ? 'var(--text-muted)' : 'var(--accent)',
        fontWeight: 600,
        fontSize: '0.95em',
      }}
      onClick={onClick}
      onMouseEnter={() => setShowHoverCard(true)}
      onMouseLeave={() => setShowHoverCard(false)}
      title={isFormerMember ? 'Former member' : undefined}
    >
      <div
        className="size-4 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
        style={{ background: 'var(--accent-grad)' }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-4 rounded-full object-cover"
          />
        ) : (
          username[0].toUpperCase()
        )}
      </div>
      <span>@{username}</span>
    </span>
  );
}
