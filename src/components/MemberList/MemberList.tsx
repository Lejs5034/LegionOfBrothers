import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import RoleManagementModal from '../RoleManagementModal/RoleManagementModal';
import { getEffectiveDisplayRole } from '../../utils/displayRankUtils';

interface MemberProfile {
  id: string;
  username: string;
  avatar_url?: string;
  global_rank: string;
  role_id?: string;
}

interface ServerRole {
  id: string;
  name: string;
  rank: number;
  color: string;
  icon: string;
  role_key?: string;
}

interface EffectiveRoleGroup {
  label: string;
  emoji: string;
  color: string;
  order: number;
  members: MemberProfile[];
}

interface MemberListProps {
  serverId: string;
  isMobile?: boolean;
}

export default function MemberList({ serverId, isMobile = false }: MemberListProps) {
  const [roleGroups, setRoleGroups] = useState<EffectiveRoleGroup[]>([]);
  const [serverName, setServerName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRank, setCurrentUserRank] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    setRoleGroups([]);
    setError('');

    try {
      const { data: server, error: serverError } = await supabase
        .from('servers')
        .select('id, slug, name')
        .eq('slug', serverId)
        .maybeSingle();

      if (serverError) {
        console.error('Error loading server:', serverError);
        setError(`Failed to load server: ${serverError.message}`);
        setLoading(false);
        return;
      }

      if (!server) {
        console.error('Server not found:', serverId);
        setError(`Server not found: ${serverId}`);
        setLoading(false);
        return;
      }

      setServerName(server.name);

      const { data: roles, error: rolesError } = await supabase
        .from('server_roles')
        .select('id, name, rank, color, icon, role_key')
        .eq('server_id', server.id)
        .order('rank', { ascending: true });

      if (rolesError) {
        console.error('Error loading roles:', rolesError);
        setError(`Failed to load roles: ${rolesError.message}`);
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
            username,
            avatar_url,
            global_rank
          )
        `)
        .eq('server_id', server.id);

      if (membersError) {
        console.error('Error loading members:', membersError);
        setError(`Failed to load members: ${membersError.message}`);
        setLoading(false);
        return;
      }

      const allMembers: MemberProfile[] = (members || [])
        .map(m => {
          const profile = m.profiles as any;
          if (!profile) return null;
          return {
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            global_rank: profile.global_rank || 'user',
            role_id: m.role_id,
          };
        })
        .filter((m): m is MemberProfile => m !== null);

      const rolesMap = new Map<string, ServerRole>();
      (roles || []).forEach(role => {
        rolesMap.set(role.id, role);
      });

      const groupsMap = new Map<string, EffectiveRoleGroup>();

      allMembers.forEach(member => {
        const serverRole = member.role_id ? rolesMap.get(member.role_id) : null;
        const effectiveRole = getEffectiveDisplayRole({
          global_rank: member.global_rank,
          server_role: serverRole || null,
        });

        const groupKey = `${effectiveRole.label}|${effectiveRole.color}`;

        if (!groupsMap.has(groupKey)) {
          let order = 999;
          if (effectiveRole.label === 'The Head') order = 1;
          else if (effectiveRole.label === 'App Developers') order = 2;
          else if (effectiveRole.label === 'Admins') order = 3;
          else if (effectiveRole.kind === 'server') order = 50;
          else order = 100;

          groupsMap.set(groupKey, {
            label: effectiveRole.label,
            emoji: effectiveRole.emoji,
            color: effectiveRole.color,
            order,
            members: [],
          });
        }

        groupsMap.get(groupKey)!.members.push(member);
      });

      const groups = Array.from(groupsMap.values())
        .sort((a, b) => {
          if (a.order !== b.order) return a.order - b.order;
          return a.label.localeCompare(b.label);
        })
        .map(group => ({
          ...group,
          members: group.members.sort((a, b) => a.username.localeCompare(b.username)),
        }));

      setRoleGroups(groups);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('global_rank')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setCurrentUserRank(profile.global_rank || 'user');
        }
      }
    };

    initializeUser();
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          loadMembers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'server_roles',
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

  const handleMemberClick = (member: MemberProfile) => {
    if (currentUserId === member.id) {
      return;
    }
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
  };

  const handlePromotionSuccess = () => {
    loadMembers();
  };

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center ${isMobile ? 'w-full' : 'w-60'}`}
        style={{
          background: isMobile ? 'transparent' : 'var(--bg)',
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
          background: isMobile ? 'transparent' : 'var(--bg)',
          borderLeft: isMobile ? 'none' : '1px solid var(--border)'
        }}
      >
        <div className="text-sm text-center" style={{ color: '#ef4444' }}>{error}</div>
      </div>
    );
  }

  if (roleGroups.length === 0 && !loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-4 ${isMobile ? 'w-full' : 'w-60'}`}
        style={{
          background: isMobile ? 'transparent' : 'var(--bg)',
          borderLeft: isMobile ? 'none' : '1px solid var(--border)'
        }}
      >
        <div className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>No members found</div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col overflow-hidden ${isMobile ? 'w-full' : 'w-60'}`}
      style={{
        background: 'var(--bg)',
        borderLeft: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.06)'
      }}
    >
      <div className="flex-1 overflow-y-auto p-4">
        {roleGroups.map((group, index) => (
          <div key={`${group.label}-${group.color}`} className="mb-8">
            <div className="flex items-center gap-2 mb-3 px-2">
              <span className="text-lg">{group.emoji}</span>
              <h3
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: group.color }}
              >
                {group.label} — {group.members.length}
              </h3>
            </div>
            {group.members.length === 0 ? (
              <div className="px-2 py-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                No members
              </div>
            ) : (
              group.members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => handleMemberClick(member)}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden"
                    style={{
                      backgroundColor: '#27272a',
                      color: '#a1a1aa',
                    }}
                  >
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      member.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: group.color }}
                  >
                    {member.username}
                  </span>
                </div>
              ))
            )}
            {index < roleGroups.length - 1 && (
              <div className="mt-8 h-px" style={{ background: 'rgba(255, 255, 255, 0.04)' }} />
            )}
          </div>
        ))}
      </div>

      {selectedMember && (
        <RoleManagementModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          targetUser={selectedMember}
          currentUserRank={currentUserRank}
          serverSlug={serverId}
          onSuccess={handlePromotionSuccess}
        />
      )}
    </div>
  );
}
