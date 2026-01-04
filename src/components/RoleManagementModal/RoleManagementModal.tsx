import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Crown } from 'lucide-react';

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    username: string;
    global_rank: string;
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

  if (!isOpen) return null;

  const canPromoteToHead =
    currentUserRank === 'app_developer' &&
    serverSlug === 'headquarters' &&
    targetUser.global_rank !== 'the_head';

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

        {canPromoteToHead ? (
          <div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              As an App Developer, you can promote this member to The Head role.
            </p>

            <button
              onClick={handlePromoteToHead}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all"
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
              <Crown size={20} />
              {loading ? 'Promoting...' : 'Promote to The Head'}
            </button>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {currentUserRank !== 'app_developer'
              ? 'Only App Developers can manage roles.'
              : serverSlug !== 'headquarters'
              ? 'Role management is only available in Headquarters.'
              : targetUser.global_rank === 'the_head'
              ? 'This user is already The Head.'
              : 'No actions available.'}
          </p>
        )}
      </div>
    </div>
  );
}
