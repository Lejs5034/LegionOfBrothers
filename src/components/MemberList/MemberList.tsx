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
}

export default function MemberList({ serverId }: MemberListProps) {
  const [membersByRole, setMembersByRole] = useState<MembersByRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMembers = async () => {
    try {
      const { data: serverData } = await supabase
        .from('servers')
        .select('id, slug')
        .eq('slug', serverId)
        .maybeSingle();

      if (!serverData) return;

      const { data: roles } = await supabase
        .from('server_roles')
        .select('*')
        .eq('server_id', serverData.id)
        .order('rank', { ascending: true });

      const { data: members } = await supabase
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

      if (!roles || !members) return;

      const roleMap = new Map(roles.map(role => [role.id, role]));

      const groupedMembers: MembersByRole[] = roles.map(role => ({
        role,
        members: members
          .filter(m => m.role_id === role.id)
          .map(m => ({
            id: (m.profiles as any).id,
            username: (m.profiles as any).username,
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

    const channel = supabase
      .channel('server_members_changes')
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
      <div className="w-60 bg-[#2b2d31] border-l border-gray-700 flex items-center justify-center">
        <div className="text-gray-400">Loading members...</div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-[#2b2d31] border-l border-gray-700 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        {membersByRole.map(({ role, members }) => (
          <div key={role.id} className="mb-6">
            <div className="flex items-center gap-2 mb-2 px-2">
              <span className="text-lg">{role.icon}</span>
              <h3
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: role.color }}
              >
                {role.name} — {members.length}
              </h3>
            </div>
            <div className="space-y-1">
              {members.length === 0 ? (
                <div className="px-2 py-1.5 text-xs" style={{ color: '#6b7280' }}>
                  No members
                </div>
              ) : (
                members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#35373c] cursor-pointer transition-colors"
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
          </div>
        ))}
      </div>
    </div>
  );
}
