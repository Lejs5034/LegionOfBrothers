import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  requireTyping?: boolean;
  typingText?: string;
  isDestructive?: boolean;
  loading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  requireTyping = false,
  typingText = 'DELETE',
  isDestructive = false,
  loading = false,
}: ConfirmationModalProps) {
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireTyping && inputValue !== typingText) {
      return;
    }
    onConfirm();
    setInputValue('');
  };

  const handleClose = () => {
    setInputValue('');
    onClose();
  };

  const isConfirmDisabled = loading || (requireTyping && inputValue !== typingText);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleClose}
    >
      <div
        className="rounded-xl p-6 w-full max-w-md"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-4">
          {isDestructive && (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239, 68, 68, 0.1)' }}
            >
              <AlertTriangle size={20} style={{ color: '#ef4444' }} />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
              {title}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          {message}
        </p>

        {requireTyping && (
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
              Type <span style={{ color: '#ef4444', fontFamily: 'monospace' }}>{typingText}</span> to confirm
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg transition-all font-mono"
              style={{
                background: 'var(--bg)',
                border: '2px solid var(--border)',
                color: 'var(--text)',
              }}
              placeholder={typingText}
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-colors"
            style={{
              background: 'var(--bg)',
              border: '2px solid var(--border)',
              color: 'var(--text)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.borderColor = 'var(--text-muted)')}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="flex-1 px-4 py-3 rounded-lg font-semibold text-sm text-white transition-all shadow-md"
            style={{
              background: isConfirmDisabled
                ? 'var(--border)'
                : isDestructive
                ? '#ef4444'
                : 'var(--accent-grad)',
              cursor: isConfirmDisabled ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isConfirmDisabled) {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }
            }}
            onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
