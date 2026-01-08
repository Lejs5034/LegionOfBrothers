import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Crown, Shield } from 'lucide-react';

interface ServerRole {
  id: string;
  name: string;
  rank: number;
  color: string;
  icon: string;
  role_key?: string;
}

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    username: string;
    global_rank: string;
    role_id?: string;
  };
  currentUserRank: string;
  serverSlug: string;
  onSuccess?: () => void;
}

export default function RoleManagementModal({
  isOpen,
  onClose,
  targetUser,
  currentUserRank,
  serverSlug,
  onSuccess,
}: RoleManagementModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<ServerRole[]>([]);
  const [currentRole, setCurrentRole] = useState<ServerRole | null>(null);
  const [assigningRole, setAssigningRole] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadServerRoles();
    }
  }, [isOpen, serverSlug]);

  const loadServerRoles = async () => {
    try {
      const { data: server } = await supabase
        .from('servers')
        .select('id')
        .eq('slug', serverSlug)
        .maybeSingle();

      if (!server) return;

      const { data: roles } = await supabase
        .from('server_roles')
        .select('*')
        .eq('server_id', server.id)
        .order('rank', { ascending: true });

      if (roles) {
        setAvailableRoles(roles);

        if (targetUser.role_id) {
          const userCurrentRole = roles.find(r => r.id === targetUser.role_id);
          setCurrentRole(userCurrentRole || null);
        }
      }
    } catch (err) {
      console.error('Error loading server roles:', err);
    }
  };

  const handleAssignRole = async (roleId: string) => {
    setAssigningRole(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('assign_server_role', {
        target_user_id: targetUser.id,
        server_slug: serverSlug,
        new_role_id: roleId,
      });

      if (rpcError) {
        console.error('Error assigning role:', rpcError);
        setError(rpcError.message || 'Failed to assign role');
        setAssigningRole(false);
        return;
      }

      if (data && !data.success) {
        setError(data.error || 'Failed to assign role');
        setAssigningRole(false);
        return;
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error assigning role:', err);
      setError('An unexpected error occurred');
    } finally {
      setAssigningRole(false);
    }
  };

  const canPromoteToHead =
    ['the_head', 'app_developer'].includes(currentUserRank) &&
    serverSlug === 'headquarters';

  const handlePromoteToHead = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('promote_user_to_the_head', {
        target_user_id: targetUser.id,
      });

      if (rpcError) {
        console.error('Error promoting user:', rpcError);
        setError(rpcError.message || 'Failed to promote user');
        setLoading(false);
        return;
      }

      if (data && !data.success) {
        setError(data.error || 'Failed to promote user');
        setLoading(false);
        return;
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error promoting user:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const canManageRoles = ['the_head', 'app_developer', 'admin'].includes(currentUserRank);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg p-6"
        style={{
          backgroundColor: 'var(--bg)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <X size={20} />
        </button>

        <h2
          className="text-xl font-bold mb-4"
          style={{ color: 'var(--text)' }}
        >
          Manage {targetUser.username}
        </h2>

        {error && (
          <div
            className="mb-4 p-3 rounded text-sm"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        )}

        {currentRole && (
          <div className="mb-4 p-3 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Current Role</p>
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentRole.icon}</span>
              <span className="font-medium" style={{ color: currentRole.color }}>
                {currentRole.name}
              </span>
            </div>
          </div>
        )}

        {canManageRoles ? (
          <div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
              Select a new role for {targetUser.username}
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleAssignRole(role.id)}
                  disabled={assigningRole || role.id === targetUser.role_id}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all"
                  style={{
                    backgroundColor: role.id === targetUser.role_id ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    border: role.id === targetUser.role_id ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
                    opacity: role.id === targetUser.role_id ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!assigningRole && role.id !== targetUser.role_id) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (role.id !== targetUser.role_id) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                >
                  <span className="text-2xl">{role.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold" style={{ color: role.color }}>
                      {role.name}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Rank: {role.rank}
                    </div>
                  </div>
                  {role.id === targetUser.role_id && (
                    <Shield size={16} style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>
              ))}
            </div>

            {canPromoteToHead && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  Global Rank Management
                </p>
                <button
                  onClick={handlePromoteToHead}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm"
                  style={{
                    backgroundColor: '#fbbf24',
                    color: '#18181b',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = '#f59e0b';
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = '#fbbf24';
                  }}
                >
                  <Crown size={16} />
                  {loading ? 'Promoting...' : 'Promote to The Head (Global)'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            You do not have permission to manage roles in this server.
          </p>
        )}
      </div>
    </div>
  );
}
