import { Bug, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DebugInfo {
  userId: string;
  serverIdReal: string;
  serverNameReal: string;
  serverType: string;
  userGlobalRank: string;
  userServerRoleKeys: string[];
  allowedUploaderRoleKeys: string[];
  intersection: string[];
  canUpload: boolean;
  reason: string;
}

interface DebugPanelProps {
  debugInfo: DebugInfo;
  serverId: string;
}

export default function DebugPanel({ debugInfo, serverId }: DebugPanelProps) {
  const storageKey = `debug-panel-${serverId}`;
  const [isOpen, setIsOpen] = useState(() => {
    const stored = sessionStorage.getItem(storageKey);
    return stored === 'true';
  });

  useEffect(() => {
    sessionStorage.setItem(storageKey, String(isOpen));
  }, [isOpen, storageKey]);

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    setIsOpen(stored === 'true');
  }, [serverId, storageKey]);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-40 p-3 rounded-full shadow-lg transition-all hover:scale-110"
        style={{
          background: 'var(--accent-grad)',
          color: '#ffffff',
        }}
        title="Toggle Debug Panel"
      >
        <Bug size={20} />
      </button>

      <div
        className="fixed bottom-20 right-4 z-40 w-full max-w-2xl transition-all duration-300 ease-in-out"
        style={{
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <div
          className="rounded-xl p-4 text-xs font-mono shadow-2xl mx-4"
          style={{
            background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
            border: '2px solid #fbbf24',
            boxShadow: '0 8px 24px rgba(251, 191, 36, 0.3)',
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          <div className="flex items-center justify-between mb-3 sticky top-0 pb-2"
            style={{ background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)' }}
          >
            <div>
              <h3 className="font-bold text-sm" style={{ color: '#fbbf24' }}>
                DEBUG PANEL
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Course upload permission diagnostics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-1 rounded text-xs font-medium"
                style={{
                  background: debugInfo.canUpload ? '#10b981' : '#ef4444',
                  color: '#ffffff',
                }}
              >
                {debugInfo.canUpload ? 'CAN UPLOAD' : 'CANNOT UPLOAD'}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fbbf24'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-2" style={{ color: 'var(--text-muted)' }}>
            <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>User ID:</span>
              <div className="mt-1 break-all">{debugInfo.userId}</div>
            </div>

            <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Global Rank:</span>
              <div className="mt-1">
                <span
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    background: ['the_head', 'app_developer'].includes(debugInfo.userGlobalRank)
                      ? '#10b981'
                      : '#6b7280',
                    color: '#ffffff',
                  }}
                >
                  {debugInfo.userGlobalRank || 'none'}
                </span>
              </div>
            </div>

            <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Server:</span>
              <div className="mt-1">{debugInfo.serverNameReal}</div>
              <div className="text-xs mt-1 opacity-70">ID: {debugInfo.serverIdReal}</div>
              <div className="mt-1">
                <span style={{ color: '#f59e0b' }}>{debugInfo.serverType}</span>
              </div>
            </div>

            <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>User Server Role Keys:</span>
              <div className="mt-1">
                <span style={{ color: '#3b82f6' }}>
                  [{debugInfo.userServerRoleKeys.length > 0
                    ? debugInfo.userServerRoleKeys.map(k => `"${k}"`).join(', ')
                    : 'none'}]
                </span>
              </div>
            </div>

            <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>
                Allowed Uploader Role Keys:
              </span>
              <div className="mt-1">
                <span style={{ color: '#10b981' }}>
                  [{debugInfo.allowedUploaderRoleKeys.map(k => `"${k}"`).join(', ')}]
                </span>
              </div>
            </div>

            <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Intersection:</span>
              <div className="mt-1">
                <span style={{ color: debugInfo.intersection.length > 0 ? '#10b981' : '#ef4444' }}>
                  [{debugInfo.intersection.length > 0
                    ? debugInfo.intersection.map(k => `"${k}"`).join(', ')
                    : 'none'}]
                </span>
              </div>
            </div>

            <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Upload Permission:</span>
              <div className="mt-1">
                <span style={{ color: debugInfo.canUpload ? '#10b981' : '#ef4444' }}>
                  {debugInfo.canUpload ? 'GRANTED' : 'DENIED'}
                </span>
              </div>
            </div>

            <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Reason:</span>
              <div className="mt-1">{debugInfo.reason}</div>
            </div>

            <div className="mt-3 p-2 rounded text-xs" style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}>
              <strong>Permission Logic:</strong><br />
              1. Global roles "the_head" and "app_developer" can upload to ALL servers<br />
              2. Server-specific role "professor" can upload ONLY to their assigned server<br />
              3. All other users cannot upload courses
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
