import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Role {
  id: string;
  name: string;
  rank: number;
  color: string;
  icon: string;
}

interface Member {
  id: string;
  username: string;
  role_id: string | null;
  role?: Role;
}

interface MembersByRole {
  role: Role;
  members: Member[];
}

interface MemberListProps {
  serverId: string;
  isMobile?: boolean;
}

const adjustColorBrightness = (hex: string, percent: number) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.floor((num >> 16) * percent);
  const g = Math.floor(((num >> 8) & 0x00FF) * percent);
  const b = Math.floor((num & 0x0000FF) * percent);
  return `rgb(${r}, ${g}, ${b})`;
};

export default function MemberList({ serverId, isMobile = false }: MemberListProps) {
  const [membersByRole, setMembersByRole] = useState<MembersByRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadMembers = async () => {
    setLoading(true);
    setMembersByRole([]);
    setError('');

    try {
      const { data: serverData, error: serverError } = await supabase
        .from('servers')
        .select('id, slug')
        .eq('slug', serverId)
        .maybeSingle();

      if (serverError) {
        console.error('Error loading server:', serverError);
        setError(`Failed to load server: ${serverError.message}`);
        setLoading(false);
        return;
      }

      if (!serverData) {
        console.error('Server not found:', serverId);
        setError(`Server not found: ${serverId}`);
        setLoading(false);
        return;
      }

      const { data: roles, error: rolesError } = await supabase
        .from('server_roles')
        .select('*')
        .eq('server_id', serverData.id)
        .order('rank', { ascending: true });

      if (rolesError) {
        console.error('Error loading roles:', rolesError);
        setError(`Failed to load roles: ${rolesError.message}`);
        setLoading(false);
        return;
      }

      if (!roles || roles.length === 0) {
        console.warn('No roles found for server:', serverId);
        setMembersByRole([]);
        setLoading(false);
        return;
      }

      const { data: members, error: membersError } = await supabase
        .from('server_members')
        .select(`
          user_id,
          role_id,
          profiles:user_id (
            id,
            username
          )
        `)
        .eq('server_id', serverData.id);

      if (membersError) {
        console.error('Error loading members:', membersError);
        setError(`Failed to load members: ${membersError.message}`);
        setLoading(false);
        return;
      }

      const roleMap = new Map(roles.map(role => [role.id, role]));

      const groupedMembers: MembersByRole[] = roles.map(role => ({
        role,
        members: (members || [])
          .filter(m => m.role_id === role.id)
          .map(m => ({
            id: (m.profiles as any)?.id || '',
            username: (m.profiles as any)?.username || 'Unknown',
            role_id: m.role_id,
            role: roleMap.get(m.role_id || '') || undefined,
          }))
          .sort((a, b) => a.username.localeCompare(b.username)),
      }));

      setMembersByRole(groupedMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();

    const channelName = `server_members_${serverId}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'server_members',
        },
        () => {
          loadMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center ${isMobile ? 'w-full' : 'w-60'}`}
        style={{
          background: isMobile ? 'transparent' : 'var(--surface)',
          borderLeft: isMobile ? 'none' : '1px solid var(--border)'
        }}
      >
        <div style={{ color: 'var(--text-muted)' }}>Loading members...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-4 ${isMobile ? 'w-full' : 'w-60'}`}
        style={{
          background: isMobile ? 'transparent' : 'var(--surface)',
          borderLeft: isMobile ? 'none' : '1px solid var(--border)'
        }}
      >
        <div className="text-sm text-center" style={{ color: '#ef4444' }}>{error}</div>
      </div>
    );
  }

  if (membersByRole.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-4 ${isMobile ? 'w-full' : 'w-60'}`}
        style={{
          background: isMobile ? 'transparent' : 'var(--surface)',
          borderLeft: isMobile ? 'none' : '1px solid var(--border)'
        }}
      >
        <div className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>No roles configured for this server</div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col overflow-hidden ${isMobile ? 'w-full' : 'w-60'}`}
      style={{
        background: isMobile ? 'transparent' : 'var(--surface)',
        borderLeft: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.06)'
      }}
    >
      <div className="flex-1 overflow-y-auto p-4">
        {membersByRole.map(({ role, members }, index) => (
          <div key={role.id} className="mb-6">
            <div className="flex items-center gap-2 mb-2 px-2">
              <span className="text-lg">{role.icon}</span>
              <h3
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: adjustColorBrightness(role.color, 0.8) }}
              >
                {role.name} — {members.length}
              </h3>
            </div>
            <div className="space-y-1">
              {members.length === 0 ? (
                <div className="px-2 py-1.5 text-xs" style={{ color: '#9CA3AF' }}>
                  No members
                </div>
              ) : (
                members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors"
                    style={{
                      background: 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                      style={{
                        backgroundColor: role.color + '20',
                        color: role.color,
                      }}
                    >
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: role.color }}
                    >
                      {member.username}
                    </span>
                  </div>
                ))
              )}
            </div>
            {index < membersByRole.length - 1 && (
              <div className="mt-6 h-px" style={{ background: 'rgba(255, 255, 255, 0.04)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
