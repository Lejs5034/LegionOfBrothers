import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getServerRoleConfig, RoleConfig } from '../../utils/displayRankUtils';

interface MemberProfile {
  id: string;
  username: string;
  avatar_url?: string;
  global_rank: string;
}

interface RoleSection {
  roleConfig: RoleConfig;
  members: MemberProfile[];
}

interface MemberListProps {
  serverId: string;
  isMobile?: boolean;
}

export default function MemberList({ serverId, isMobile = false }: MemberListProps) {
  const [roleSections, setRoleSections] = useState<RoleSection[]>([]);
  const [serverName, setServerName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadMembers = async () => {
    setLoading(true);
    setRoleSections([]);
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

      const serverRoleConfig = getServerRoleConfig(server.name);

      const { data: members, error: membersError } = await supabase
        .from('server_members')
        .select(`
          user_id,
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
          };
        })
        .filter((m): m is MemberProfile => m !== null);

      const sections: RoleSection[] = serverRoleConfig.map(roleConfig => {
        const roleMembers = allMembers
          .filter(m => m.global_rank === roleConfig.key)
          .sort((a, b) => a.username.localeCompare(b.username));

        return {
          roleConfig,
          members: roleMembers,
        };
      });

      setRoleSections(sections);
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

  if (roleSections.length === 0 && !loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-4 ${isMobile ? 'w-full' : 'w-60'}`}
        style={{
          background: isMobile ? 'transparent' : 'var(--bg)',
          borderLeft: isMobile ? 'none' : '1px solid var(--border)'
        }}
      >
        <div className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>No roles configured</div>
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
        {roleSections.map(({ roleConfig, members }, index) => (
          <div key={roleConfig.key} className="mb-8">
            <div className="flex items-center gap-2 mb-3 px-2">
              <span className="text-lg">{roleConfig.emoji}</span>
              <h3
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: roleConfig.color }}
              >
                {roleConfig.label} — {members.length}
              </h3>
            </div>
            {members.length === 0 ? (
              <div className="px-2 py-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                No members
              </div>
            ) : (
              members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                    style={{ color: roleConfig.color }}
                  >
                    {member.username}
                  </span>
                </div>
              ))
            )}
            {index < roleSections.length - 1 && (
              <div className="mt-8 h-px" style={{ background: 'rgba(255, 255, 255, 0.04)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
