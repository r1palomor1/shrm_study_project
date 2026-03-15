import { useEffect } from 'react';

/**
 * A premium, glassmorphism confirmation modal for high-stakes actions like Deleting.
 */
export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you sure?", 
  message, 
  confirmText = "Delete", 
  cancelText = "Cancel",
  type = "danger" // "danger" (red) or "warning" (amber)
}) {
  
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const accentColor = type === 'danger' ? '#ef4444' : '#fbbf24';
  const accentBg = type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)';

  return (
    <div className="modal-overlay" style={{ zIndex: 4000 }}>
      <div 
        className="modal-content animate-fade-in" 
        style={{ 
          maxWidth: '450px', 
          padding: '2rem',
          border: `1px solid rgba(255, 255, 255, 0.1)`,
          textAlign: 'center'
        }}
      >
        <div style={{ 
          width: '60px', 
          height: '60px', 
          borderRadius: '50%', 
          backgroundColor: accentBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto',
          color: accentColor
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>
            {type === 'danger' ? 'delete_forever' : 'warning'}
          </span>
        </div>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'white' }}>{title}</h2>
        
        <p style={{ 
          color: 'var(--text-muted)', 
          fontSize: '0.95rem', 
          lineHeight: '1.6',
          marginBottom: '2rem',
          whiteSpace: 'pre-line'
        }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="secondary" 
            onClick={onClose} 
            style={{ 
              flex: 1, 
              padding: '0.8rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white'
            }}
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            style={{ 
              flex: 1, 
              padding: '0.8rem', 
              background: accentColor,
              borderColor: 'transparent',
              color: 'white',
              fontWeight: 'bold',
              boxShadow: `0 4px 15px ${accentBg.replace('0.1', '0.4')}`
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
