import { useEffect, useRef, useState } from 'react';
import { User } from 'lucide-react';

interface Member {
  id: string;
  username: string;
  avatar_url?: string;
}

interface MentionDropdownProps {
  members: Member[];
  searchTerm: string;
  onSelect: (member: Member) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export default function MentionDropdown({ members, searchTerm, onSelect, onClose, position }: MentionDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredMembers = members.filter((member) => {
    if (!member?.id || !member?.username) return false;
    return member.username.toLowerCase().includes(searchTerm.toLowerCase());
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredMembers.length === 0) return;

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
        className="absolute z-50 min-w-[200px] max-w-[300px] rounded-lg shadow-lg overflow-hidden"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
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
      className="absolute z-50 min-w-[200px] max-w-[300px] rounded-lg shadow-lg overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="py-1 max-h-[200px] overflow-y-auto">
        {filteredMembers.map((member, index) => (
          <button
            key={member.id}
            type="button"
            onClick={() => onSelect(member)}
            className="w-full flex items-center gap-3 px-4 py-2 transition-colors"
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
                className="w-6 h-6 rounded-full flex-shrink-0"
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: 'var(--accent-grad)' }}
              >
                {member.username[0]?.toUpperCase() || '?'}
              </div>
            )}
            <span className="text-sm font-medium truncate">{member.username}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
