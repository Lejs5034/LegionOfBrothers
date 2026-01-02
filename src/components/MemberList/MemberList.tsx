import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getServerRankGroups, isRankedUser, RankGroup } from '../../utils/displayRankUtils';

interface MemberProfile {
  id: string;
  username: string;
  avatar_url?: string;
  global_rank: string;
}

interface RankedMemberGroup {
  rankGroup: RankGroup;
  members: MemberProfile[];
}

interface MemberListProps {
  serverId: string;
  isMobile?: boolean;
}

export default function MemberList({ serverId, isMobile = false }: MemberListProps) {
  const [rankedGroups, setRankedGroups] = useState<RankedMemberGroup[]>([]);
  const [serverName, setServerName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadMembers = async () => {
    setLoading(true);
    setRankedGroups([]);
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

      const rankedMembers = allMembers.filter(m => isRankedUser(m.global_rank));

      const serverRankGroups = getServerRankGroups(server.name);

      const groupedRankedMembers: RankedMemberGroup[] = serverRankGroups
        .map(rankGroup => {
          const groupMembers = rankedMembers
            .filter(m => m.global_rank === rankGroup.key)
            .sort((a, b) => a.username.localeCompare(b.username));

          return {
            rankGroup,
            members: groupMembers,
          };
        })
        .filter(group => group.members.length > 0);

      setRankedGroups(groupedRankedMembers);
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

  if (rankedGroups.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-4 ${isMobile ? 'w-full' : 'w-60'}`}
        style={{
          background: isMobile ? 'transparent' : 'var(--surface)',
          borderLeft: isMobile ? 'none' : '1px solid var(--border)'
        }}
      >
        <div className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>No ranked members yet</div>
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
        {rankedGroups.map(({ rankGroup, members }, index) => (
          <div key={rankGroup.key} className="mb-6">
            <div className="flex items-center gap-2 mb-2 px-2">
              <span className="text-lg">{rankGroup.emoji}</span>
              <h3
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: rankGroup.color }}
              >
                {rankGroup.label} — {members.length}
              </h3>
            </div>
            <div className="space-y-1">
              {members.map(member => (
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
                      backgroundColor: rankGroup.color + '20',
                      color: rankGroup.color,
                    }}
                  >
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: rankGroup.color }}
                  >
                    {member.username}
                  </span>
                </div>
              ))}
            </div>
            {index < rankedGroups.length - 1 && (
              <div className="mt-6 h-px" style={{ background: 'rgba(255, 255, 255, 0.04)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
