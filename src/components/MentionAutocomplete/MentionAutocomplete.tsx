import { useEffect, useState, useRef } from 'react';
import { User } from 'lucide-react';

interface Member {
  user_id: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
  server_roles?: {
    name: string;
    position: number;
  };
}

interface MentionAutocompleteProps {
  members: Member[];
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

  const filteredMembers = members
    .filter((member) =>
      member.profiles.username.toLowerCase().startsWith(query.toLowerCase())
    )
    .sort((a, b) => {
      const posA = a.server_roles?.position ?? 999;
      const posB = b.server_roles?.position ?? 999;
      return posA - posB;
    })
    .slice(0, 8);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredMembers.length - 1));
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
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredMembers, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    const selectedElement = menuRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (filteredMembers.length === 0) {
    return null;
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
      {filteredMembers.map((member, index) => (
        <button
          key={member.user_id}
          onClick={() => onSelect(member)}
          className="w-full flex items-center gap-3 px-3 py-2 transition-colors text-left"
          style={{
            background: index === selectedIndex ? 'var(--surface)' : 'transparent',
            color: 'var(--text)',
          }}
          onMouseEnter={() => setSelectedIndex(index)}
          aria-label={`Mention ${member.profiles.username}`}
        >
          <div
            className="size-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
            style={{ background: 'var(--accent-grad)' }}
          >
            {member.profiles.avatar_url ? (
              <img
                src={member.profiles.avatar_url}
                alt=""
                className="size-8 rounded-full object-cover"
              />
            ) : (
              member.profiles.username[0].toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{member.profiles.username}</div>
            {member.server_roles && (
              <div
                className="text-xs truncate"
                style={{ color: 'var(--text-muted)' }}
              >
                {member.server_roles.name}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
