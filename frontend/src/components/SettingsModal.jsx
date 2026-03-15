import { useState } from 'react';

export default function SettingsModal({ 
  onClose, 
  onExport, 
  onImport, 
  onNukeAi, 
  isRestoring 
}) {
  const [activeCategory, setActiveCategory] = useState('data'); // Default to data management

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
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '2rem'
    }} onClick={onClose}>
      <div 
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '85vh',
          backgroundColor: '#0f111a',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
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
          
          {/* Section: GENERAL */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h4 style={{ color: 'var(--secondary)', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1.2rem' }}>General</h4>
            
            <div className="settings-card" style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              padding: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.4)' }}>language</span>
                <div>
                  <div style={{ fontSize: '1rem', color: 'white' }}>Language</div>
                </div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>English</div>
            </div>

            <div className="settings-card" style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              padding: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              border: '1px solid transparent',
              transition: 'all 0.2s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.4)' }}>storage</span>
                <div>
                  <div style={{ fontSize: '1rem', color: 'white' }}>Data Management</div>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.2)' }}>chevron_right</span>
            </div>
          </div>

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

          <div style={{ opacity: 0.3, textAlign: 'center', fontSize: '0.7rem' }}>
            SHRM Study Project v1.2.0 • Build ID: 86CCF7D
          </div>
        </div>
      </div>
    </div>
  );
}
