import { useEffect, useRef, useState } from 'react';

interface Member {
  id: string;
  username: string;
  avatar_url?: string;
  role_rank?: number;
  role_color?: string;
}

interface MentionDropdownProps {
  members: Member[];
  searchTerm: string;
  onSelect: (member: Member) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

function scoreMatch(username: string, searchTerm: string): number {
  if (!searchTerm) return 1;

  const lowerUsername = username.toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();

  if (lowerUsername === lowerSearch) return 100;
  if (lowerUsername.startsWith(lowerSearch)) return 50;
  if (lowerUsername.includes(lowerSearch)) return 10;

  return 0;
}

function sortMembers(members: Member[], searchTerm: string): Member[] {
  return members
    .filter((member) => {
      if (!member?.id || !member?.username) return false;
      return scoreMatch(member.username, searchTerm) > 0;
    })
    .sort((a, b) => {
      const scoreA = scoreMatch(a.username, searchTerm);
      const scoreB = scoreMatch(b.username, searchTerm);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      const rankA = a.role_rank ?? 999;
      const rankB = b.role_rank ?? 999;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return a.username.localeCompare(b.username);
    });
}

export default function MentionDropdown({ members, searchTerm, onSelect, onClose, position }: MentionDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  const filteredMembers = sortMembers(members, searchTerm);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredMembers.length === 0) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredMembers.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredMembers[selectedIndex]) {
            onSelect(filteredMembers[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          if (filteredMembers[selectedIndex]) {
            onSelect(filteredMembers[selectedIndex]);
          }
          break;
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [filteredMembers, selectedIndex, onSelect, onClose]);

  if (filteredMembers.length === 0) {
    return (
      <div
        ref={dropdownRef}
        className="absolute z-50 min-w-[240px] max-w-[320px] rounded-lg shadow-xl overflow-hidden"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          No users found
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 min-w-[240px] max-w-[320px] rounded-lg shadow-xl overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div
        className="py-1 max-h-[280px] overflow-y-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent',
        }}
      >
        {filteredMembers.map((member, index) => (
          <button
            key={member.id}
            ref={index === selectedIndex ? selectedItemRef : null}
            type="button"
            onClick={() => onSelect(member)}
            className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors"
            style={{
              background: index === selectedIndex ? 'var(--surface-2)' : 'transparent',
              color: 'var(--text)',
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={member.username}
                className="w-8 h-8 rounded-full flex-shrink-0"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{
                  background: member.role_color
                    ? `${member.role_color}40`
                    : 'var(--accent-grad)',
                  color: member.role_color || 'white',
                  border: member.role_color ? `2px solid ${member.role_color}20` : 'none',
                }}
              >
                {member.username[0]?.toUpperCase() || '?'}
              </div>
            )}
            <span
              className="text-sm font-medium truncate"
              style={{
                color: member.role_color || 'var(--text)',
              }}
            >
              {member.username}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
