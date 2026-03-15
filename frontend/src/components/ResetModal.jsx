import { useState, useEffect } from 'react';

export default function ResetModal({ isOpen, onClose, onConfirm, targetTitle, currentMode, quizType }) {
  const [modes, setModes] = useState({
    traditional: false,
    test: false,
    quiz_simple: false,
    quiz_intelligent: false
  });

  useEffect(() => {
    if (isOpen) {
      if (targetTitle === 'ALL') {
        // Default to everything checked for Global Settings
        setModes({
          traditional: true,
          test: true,
          quiz_simple: true,
          quiz_intelligent: true
        });
      } else {
        // Default to current selection for Topic Card
        setModes({
          traditional: currentMode === 'traditional',
          test: currentMode === 'test',
          quiz_simple: currentMode === 'quiz' && quizType === 'simple',
          quiz_intelligent: currentMode === 'quiz' && quizType === 'intelligent'
        });
      }
    }
  }, [isOpen, targetTitle, currentMode, quizType]);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    setModes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    const allSet = Object.values(modes).every(v => v);
    setModes({
      traditional: !allSet,
      test: !allSet,
      quiz_simple: !allSet,
      quiz_intelligent: !allSet
    });
  };

  const hasSelection = Object.values(modes).some(v => v);

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="modal-content animate-fade-in" style={{ maxWidth: '400px', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          Reset Progress {targetTitle !== 'ALL' ? ` - ${targetTitle}` : ' - All Topics'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
          <button 
            onClick={handleSelectAll}
            style={{ 
              alignSelf: 'flex-start',
              background: 'transparent',
              border: 'none',
              color: 'var(--secondary)',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: 0,
              cursor: 'pointer',
              marginBottom: '0.4rem'
            }}
          >
            {Object.values(modes).every(v => v) ? 'Deselect All' : 'Select All / Master Wipe'}
          </button>

          {[
            { id: 'traditional', label: 'Traditional Study', desc: 'Flashcard flip markers' },
            { id: 'quiz_simple', label: 'Quiz: Simple', desc: 'Definition multiple-choice' },
            { id: 'quiz_intelligent', label: 'Quiz: Intelligent', desc: 'SJI simulator progress' }
          ].map(m => (
            <div 
              key={m.id} 
              onClick={() => handleToggle(m.id)}
              style={{
                background: modes[m.id] ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${modes[m.id] ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <div style={{ 
                width: '18px', 
                height: '18px', 
                borderRadius: '4px', 
                border: '2px solid',
                borderColor: modes[m.id] ? '#fbbf24' : 'rgba(255,255,255,0.2)',
                background: modes[m.id] ? '#fbbf24' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                color: 'black'
              }}>
                {modes[m.id] && '✓'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: '600' }}>{m.label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.85rem', color: 'rgba(239, 68, 68, 0.9)', fontStyle: 'italic', marginBottom: '2rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>warning</span>
          This action cannot be undone. Progress will be lost.
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="secondary" 
            onClick={onClose} 
            style={{ flex: 1, padding: '0.8rem' }}
          >
            Cancel
          </button>
          <button 
            disabled={!hasSelection}
            onClick={() => onConfirm(modes)}
            style={{ 
              flex: 1, 
              padding: '0.8rem', 
              background: hasSelection ? 'rgba(239, 68, 68, 0.9)' : 'rgba(255,255,255,0.1)',
              borderColor: 'transparent',
              color: 'white',
              opacity: hasSelection ? 1 : 0.5
            }}
          >
            Apply Reset
          </button>
        </div>
      </div>
    </div>
  );
}
