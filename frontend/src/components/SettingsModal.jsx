import { useState, useEffect } from 'react';

export default function SettingsModal({ 
  onClose, 
  onExport, 
  onImport, 
  onNukeAi, 
  onDeleteDeck,
  onResetProgress,
  decks,
  isRestoring 
}) {
  const [activeCategory, setActiveCategory] = useState('data');

  // ESC Listener
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      zIndex: 10000,
      padding: '2rem',
      overflowY: 'auto'
    }} onClick={onClose}>
      <div 
        style={{
          width: '100%',
          maxWidth: '600px',
          margin: 'auto',
          backgroundColor: '#0f111a',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          maxHeight: 'calc(100vh - 4rem)'
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>Settings</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem', overflowY: 'auto' }} className="custom-scrollbar">
          
          {/* Section: DATA ACTIONS */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h4 style={{ color: 'var(--secondary)', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1.2rem' }}>AI Companion & Data</h4>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{
                background: 'rgba(255,100,100,0.05)',
                borderRadius: '16px',
                padding: '1.2rem',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>dangerous</span>
                    <span style={{ fontWeight: '600' }}>Nuke AI Vault</span>
                  </div>
                  <button 
                    onClick={onNukeAi}
                    style={{ 
                      background: 'rgba(239,68,68,0.1)', 
                      color: '#ef4444', 
                      border: '1px solid #ef4444', 
                      padding: '0.4rem 1rem', 
                      fontSize: '0.8rem',
                      borderRadius: '8px'
                    }}
                  >
                    Delete Data
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                  Wipe all generated rationales and distractors. Study history is preserved.
                </p>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '16px',
                padding: '1.2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#fbbf24' }}>description</span>
                  <span style={{ fontWeight: '600' }}>Export SJI Audit Log</span>
                </div>
                <button 
                  onClick={() => {
                    const vault = JSON.parse(localStorage.getItem('ai_distractor_vault') || '{}');
                    let md = '# SHRM 2026 Simulator - SJI Audit Log (V3)\n\n';
                    md += `Generated: ${new Date().toLocaleString()}\n\n---\n\n`;
                    
                    Object.entries(vault).forEach(([key, data]) => {
                      if (data.quizType === 'intelligent' && data.scenario) {
                        md += `## SJI: ${data.question}\n\n`;
                        md += `> **Scenario:** ${data.scenario}\n\n`;
                        md += `*   **Correct (Boss-Mode Action):** ${data.correct_answer}\n`;
                        data.distractors.forEach((d, i) => {
                          md += `*   **Trap ${i+1}:** ${d}\n`;
                        });
                        md += `\n**🎓 Tutor Rationale:**\n${data.rationale}\n\n`;
                        md += `---\n\n`;
                      }
                    });

                    const blob = new Blob([md], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `shrm_sji_audit_v3_${new Date().toISOString().split('T')[0]}.md`;
                    a.click();
                  }}
                  style={{ 
                    padding: '0.4rem 1rem', 
                    fontSize: '0.8rem',
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid #fbbf24',
                    color: '#fbbf24'
                  }}
                >
                  Export MD
                </button>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '16px',
                padding: '1.2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>cloud_download</span>
                  <span style={{ fontWeight: '600' }}>Export Backup</span>
                </div>
                <button onClick={onExport} className="secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                  Download
                </button>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '16px',
                padding: '1.2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>cloud_upload</span>
                  <span style={{ fontWeight: '600' }}>Restore Backup</span>
                </div>
                <label className="button secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', cursor: 'pointer', margin: 0 }}>
                  Upload File
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={onImport} 
                    style={{ display: 'none' }} 
                    disabled={isRestoring}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section: TOPIC MANAGEMENT */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h4 style={{ color: 'var(--secondary)', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1.2rem' }}>Topic Management</h4>
            
            <div style={{ display: 'grid', gap: '0.8rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }} className="custom-scrollbar">
              {decks && decks.length > 0 ? (
                [...decks].sort((a, b) => a.title.localeCompare(b.title)).map(deck => (
                  <div key={deck.title} className="settings-card" style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    padding: '1rem 1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', color: 'white', fontWeight: '500' }}>{deck.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{deck.cards.length} Cards</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                      <button 
                        onClick={() => onResetProgress(deck.title)}
                        style={{ 
                          background: 'rgba(255,255,255,0.05)', 
                          color: 'white', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          padding: '0.4rem 0.8rem', 
                          fontSize: '0.75rem',
                          borderRadius: '8px',
                          boxShadow: 'none'
                        }}
                      >
                        Reset
                      </button>
                      <button 
                        onClick={() => onDeleteDeck(deck.title)}
                        style={{ 
                          background: 'rgba(239,68,68,0.1)', 
                          color: '#ef4444', 
                          border: '1px solid rgba(239,68,68,0.2)', 
                          padding: '0.4rem 0.8rem', 
                          fontSize: '0.75rem',
                          borderRadius: '8px',
                          boxShadow: 'none'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem' }}>
                  No topics loaded.
                </div>
              )}
            </div>
          </div>

          <div style={{ opacity: 0.3, textAlign: 'center', fontSize: '0.7rem' }}>
            SHRM Study Project v1.2.0 • Build ID: 86CCF7D
          </div>
        </div>
      </div>
    </div>
  );
}
