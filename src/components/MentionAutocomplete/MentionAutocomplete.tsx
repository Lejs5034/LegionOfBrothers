import { useEffect, useState, useRef } from 'react';

interface Member {
  user_id: string;
  profiles?: {
    username?: string;
    avatar_url?: string;
  } | null;
  server_roles?: {
    name?: string;
    position?: number;
  } | null;
}

interface MentionAutocompleteProps {
  members: Member[] | null | undefined;
  query: string;
  position: { top: number; left: number };
  onSelect: (member: Member) => void;
  onClose: () => void;
}

export default function MentionAutocomplete({
  members,
  query,
  position,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  if (!members || !Array.isArray(members)) {
    return (
      <div
        className="fixed z-50 rounded-lg shadow-lg overflow-hidden px-4 py-3"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          minWidth: '240px',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No users found
        </p>
      </div>
    );
  }

  const filteredMembers = members
    .filter((member) => {
      if (!member || !member.profiles || !member.profiles.username) {
        return false;
      }
      try {
        return member.profiles.username
          .toLowerCase()
          .startsWith(query.toLowerCase());
      } catch (error) {
        console.error('Error filtering member:', error);
        return false;
      }
    })
    .sort((a, b) => {
      try {
        const posA = a.server_roles?.position ?? 999;
        const posB = b.server_roles?.position ?? 999;
        return posA - posB;
      } catch (error) {
        console.error('Error sorting members:', error);
        return 0;
      }
    })
    .slice(0, 8);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredMembers.length - 1)
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && filteredMembers[selectedIndex]) {
          e.preventDefault();
          onSelect(filteredMembers[selectedIndex]);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      } catch (error) {
        console.error('Error handling keyboard:', error);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredMembers, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    try {
      const selectedElement = menuRef.current?.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    } catch (error) {
      console.error('Error scrolling to element:', error);
    }
  }, [selectedIndex]);

  if (filteredMembers.length === 0) {
    return (
      <div
        className="fixed z-50 rounded-lg shadow-lg overflow-hidden px-4 py-3"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          minWidth: '240px',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No users found
        </p>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 rounded-lg shadow-lg overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        maxHeight: '280px',
        overflowY: 'auto',
        minWidth: '240px',
      }}
    >
      {filteredMembers.map((member, index) => {
        const username = member.profiles?.username || 'Unknown';
        const avatarUrl = member.profiles?.avatar_url;
        const roleName = member.server_roles?.name;

        return (
          <button
            key={member.user_id || `member-${index}`}
            onClick={() => {
              try {
                onSelect(member);
              } catch (error) {
                console.error('Error selecting member:', error);
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 transition-colors text-left"
            style={{
              background:
                index === selectedIndex ? 'var(--surface)' : 'transparent',
              color: 'var(--text)',
            }}
            onMouseEnter={() => setSelectedIndex(index)}
            aria-label={`Mention ${username}`}
          >
            <div
              className="size-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
              style={{ background: 'var(--accent-grad)' }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="size-8 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                username[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{username}</div>
              {roleName && (
                <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {roleName}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
