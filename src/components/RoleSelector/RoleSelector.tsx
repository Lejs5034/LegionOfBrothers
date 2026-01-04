import { useState, useEffect } from 'react';
import { Check, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GlobalRole {
  rank: string;
  display_name: string;
  emoji: string;
  power_level: number;
}

interface RoleSelectorProps {
  selectedRoles: string[];
  onChange: (roles: string[]) => void;
  label?: string;
  disabled?: boolean;
}

export default function RoleSelector({ selectedRoles, onChange, label = 'Who can write in this channel?', disabled = false }: RoleSelectorProps) {
  const [globalRoles, setGlobalRoles] = useState<GlobalRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [allRolesSelected, setAllRolesSelected] = useState(false);

  useEffect(() => {
    const loadGlobalRoles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('rank_hierarchy')
          .select('rank, display_name, emoji, power_level')
          .order('power_level', { ascending: true });

        if (error) throw error;

        if (data) {
          setGlobalRoles(data);
          setAllRolesSelected(selectedRoles.length === 0 || selectedRoles.length === data.length);
        }
      } catch (error) {
        console.error('Error loading global roles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGlobalRoles();
  }, [selectedRoles.length]);

  const handleToggleRole = (roleKey: string) => {
    if (disabled) return;

    const newRoles = selectedRoles.includes(roleKey)
      ? selectedRoles.filter(r => r !== roleKey)
      : [...selectedRoles, roleKey];

    onChange(newRoles);
    setAllRolesSelected(false);
  };

  const handleToggleAll = () => {
    if (disabled) return;

    if (allRolesSelected) {
      onChange([]);
    } else {
      onChange(globalRoles.map(r => r.rank));
    }
    setAllRolesSelected(!allRolesSelected);
  };

  const filteredRoles = globalRoles.filter(role =>
    role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.rank.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
          {label}
        </label>
        <div className="p-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading roles...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
        {label} <span style={{ color: '#ef4444' }}>*</span>
      </label>

      <div className="relative mb-2">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search roles..."
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2 rounded-lg text-sm transition-all"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        />
      </div>

      <div
        className="rounded-lg p-2 space-y-1 max-h-64 overflow-y-auto"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
        }}
      >
        <button
          onClick={handleToggleAll}
          disabled={disabled}
          className="w-full flex items-center justify-between p-2 rounded transition-colors"
          style={{
            background: allRolesSelected ? 'var(--surface-2)' : 'transparent',
            color: 'var(--text)',
          }}
          onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={(e) => !disabled && (e.currentTarget.style.background = allRolesSelected ? 'var(--surface-2)' : 'transparent')}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded flex items-center justify-center transition-all"
              style={{
                background: allRolesSelected ? 'var(--accent)' : 'var(--surface)',
                border: '2px solid',
                borderColor: allRolesSelected ? 'var(--accent)' : 'var(--border)',
              }}
            >
              {allRolesSelected && <Check size={14} color="white" />}
            </div>
            <span className="font-semibold text-sm">All roles</span>
          </div>
        </button>

        <div className="h-px my-1" style={{ background: 'var(--border)' }} />

        {filteredRoles.map((role) => {
          const isSelected = allRolesSelected || selectedRoles.includes(role.rank);

          return (
            <button
              key={role.rank}
              onClick={() => handleToggleRole(role.rank)}
              disabled={disabled || allRolesSelected}
              className="w-full flex items-center justify-between p-2 rounded transition-colors"
              style={{
                background: isSelected ? 'var(--surface-2)' : 'transparent',
                color: 'var(--text)',
                opacity: disabled || allRolesSelected ? 0.6 : 1,
              }}
              onMouseEnter={(e) => !disabled && !allRolesSelected && (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={(e) => !disabled && !allRolesSelected && (e.currentTarget.style.background = isSelected ? 'var(--surface-2)' : 'transparent')}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center transition-all"
                  style={{
                    background: isSelected ? 'var(--accent)' : 'var(--surface)',
                    border: '2px solid',
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  {isSelected && <Check size={14} color="white" />}
                </div>
                <span className="text-sm">{role.emoji}</span>
                <span className="text-sm">{role.display_name}</span>
              </div>
            </button>
          );
        })}

        {filteredRoles.length === 0 && (
          <div className="p-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No roles found
          </div>
        )}
      </div>

      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
        {allRolesSelected || selectedRoles.length === 0
          ? 'All users can write in this channel'
          : `${selectedRoles.length} role${selectedRoles.length === 1 ? '' : 's'} selected`}
      </p>
    </div>
  );
}
