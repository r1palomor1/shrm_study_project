import { useState, useEffect } from 'react';

export default function SettingsModal({ 
  onClose, 
  onExport, 
  onImport, 
  onNukeAi, 
  onDeleteDeck,
  onResetProgress,
  onMerge,
  onNukeSimple,
  onNukeGaps,
  decks,
  isRestoring,
  onOpenVault,
  onOpenMatrix 
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

  const handleAuditExport = () => {
    const vault = JSON.parse(localStorage.getItem('shrm_distractor_vault') || '{}');
    let md = '# SHRM 2026 Simulator - Dual-Engine Audit Log (Boss-Mode)\n\n';
    md += `Generated: ${new Date().toLocaleString()}\n`;
    md += `Compliance Level: 2026 BASK Standards\n\n---\n\n`;
    
    // Sort keys to group by level
    const sortedEntries = Object.entries(vault).sort((a, b) => {
        const levelA = a[1].certLevel || 'CP';
        const levelB = b[1].certLevel || 'CP';
        return levelA.localeCompare(levelB);
    });

    sortedEntries.forEach(([key, data]) => {
      const levelLabel = data.certLevel || 'CP';
      
      if (data.quizType === 'intelligent' && data.scenario) {
        md += `## [SHRM-${levelLabel}] SJI: ${data.question}\n\n`;
        md += `> **Scenario:** ${data.scenario}\n\n`;
        md += `*   **Correct (Boss-Mode Action):** ${data.correct_answer}\n`;
        if (data.distractors && Array.isArray(data.distractors)) {
          data.distractors.forEach((d, i) => {
            md += `*   **Trap ${i+1}:** ${d}\n`;
          });
        }
        md += `\n**🎓 Tutor Rationale:**\n${data.rationale}\n\n`;
        if (data.gap_analysis) {
            md += `**🔍 Relational Gap:** ${data.gap_analysis}\n\n`;
        }
        if (data.tag_bask) {
            md += `**🏛️ Domain (2026 BASK):** ${data.tag_bask}\n`;
        }
        if (data.tag_behavior) {
            md += `**🧠 Competency:** ${data.tag_behavior}\n`;
        }
        md += `\n---\n\n`;
      } else if (data.quizType === 'simple' && data.correct_answer) {
        md += `## [SHRM-${levelLabel}] RECALL: ${data.question}\n\n`;
        md += `*   **Correct (Knowledge Match):** ${data.correct_answer}\n`;
        if (data.distractors && Array.isArray(data.distractors)) {
          data.distractors.forEach((d, i) => {
            md += `*   **Trap ${i+1}:** ${d}\n`;
          });
        }
        if (data.tag_bask) {
          md += `\n**🏛️ Domain (2026 BASK):** ${data.tag_bask}\n`;
        }
        md += `\n---\n\n`;
      }
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shrm_dual_audit_2026-03-18.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const cardStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.2rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '16px',
    transition: 'all 0.3s ease'
  };

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
          margin: '5vh auto auto',
          backgroundColor: '#0f111a',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          maxHeight: 'calc(100vh - 10vh)'
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>Settings</h2>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            color: 'white',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>close</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem', overflowY: 'auto' }} className="custom-scrollbar">
          
          {/* AI COMPANION & DATA */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h4 style={{ color: 'var(--secondary)', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1.2rem' }}>AI COMPANION & DATA</h4>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Nuke AI Vault (Surgical + Full) */}
              <div style={{ ...cardStyle, border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>cancel</span>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.2rem' }}>Wipe AI Vault Data</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4' }}>
                      Clear generated data. Study history remains safe.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button onClick={onNukeSimple} style={{ 
                    padding: '0.5rem 0.8rem', 
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#f59e0b',
                    fontSize: '0.75rem',
                    fontWeight: '700'
                  }}>Nuke Simple Only</button>
                  <button onClick={onNukeAi} style={{ 
                    padding: '0.5rem 0.8rem', 
                    borderRadius: '12px',
                    background: 'transparent',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: '700'
                  }}>Full Wipe</button>
                </div>
              </div>

              {/* Surgical Nuke: Strategic Gaps */}
              <div style={{ ...cardStyle, border: '1px solid rgba(251, 191, 36, 0.2)', background: 'rgba(251, 191, 36, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#fbbf24' }}>warning</span>
                  <div>
                    <div style={{ fontWeight: '600' }}>Upgrade Gaps Only</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4' }}>
                      Purge existing Trap Alert labels to force a 100% fresh strategic refresh.
                    </div>
                  </div>
                </div>
                <button onClick={onNukeGaps} style={{ 
                  padding: '0.5rem 1rem', 
                  borderRadius: '12px',
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid #fbbf24',
                  color: '#fbbf24',
                  fontSize: '0.8rem',
                  fontWeight: '700'
                }}>Purge Gaps</button>
              </div>

              {/* Export SJI Audit Log */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#f59e0b' }}>description</span>
                  <div style={{ fontWeight: '600' }}>Export SJI Audit Log</div>
                </div>
                <button onClick={handleAuditExport} style={{ 
                  padding: '0.5rem 1rem', 
                  borderRadius: '12px',
                  background: 'transparent',
                  border: '1px solid #f59e0b',
                  color: '#f59e0b',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)'
                }}>Export MD</button>
              </div>

              {/* Export Backup */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#3b82f6' }}>cloud_download</span>
                  <div style={{ fontWeight: '600' }}>Export Backup</div>
                </div>
                <button onClick={onExport} style={{ 
                  padding: '0.5rem 1rem', 
                  borderRadius: '12px',
                  background: 'transparent',
                  border: '1px solid #3b82f6',
                  color: '#3b82f6',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>Download</button>
              </div>

              {/* Restore / Merge Backup */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#10b981' }}>cloud_upload</span>
                  <div>
                    <div style={{ fontWeight: '600' }}>Import & Sync</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>Merge new levels or restore everything.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <input 
                    type="file" 
                    id="merge-backup-upload" 
                    style={{ display: 'none' }} 
                    onChange={onMerge} 
                  />
                  <button 
                    onClick={() => document.getElementById('merge-backup-upload').click()} 
                    style={{ 
                      padding: '0.5rem 1rem', 
                      borderRadius: '12px',
                      background: 'transparent',
                      border: '1px solid #10b981',
                      color: '#10b981',
                      fontSize: '0.8rem',
                      fontWeight: '500'
                    }}
                  >
                    Merge (Keep Progress)
                  </button>

                  <input 
                    type="file" 
                    id="restore-backup-upload" 
                    style={{ display: 'none' }} 
                    onChange={onImport} 
                  />
                  <button 
                    onClick={() => document.getElementById('restore-backup-upload').click()} 
                    style={{ 
                      padding: '0.5rem 1rem', 
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '0.8rem',
                      fontWeight: '500'
                    }}
                  >
                    Full Restore
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* VAULT & TOPIC CONTROLS */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ color: 'var(--secondary)', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1.2rem' }}>VAULT & TOPIC CONTROLS</h4>
            
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: '24px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              {/* Description Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#60a5fa', fontSize: '1.8rem' }}>database</span>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', color: 'white' }}>Administrative Hub</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4' }}>
                    Topic indexing, BASK refinement zone, and readiness audit matrix.
                  </div>
                </div>
              </div>

              {/* Controls Row: Matrix & Topics side-by-side */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={onOpenMatrix}
                  style={{ 
                    flex: 1,
                    padding: '0.8rem', 
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.3rem', color: '#10b981' }}>verified_user</span>
                  MATRIX STATUS
                </button>

                <button 
                  onClick={onOpenVault}
                  style={{ 
                    flex: 1,
                    padding: '0.8rem', 
                    borderRadius: '16px',
                    background: 'transparent',
                    border: '1px solid #6366f1',
                    color: '#6366f1',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.3rem' }}>settings_accessibility</span>
                  TOPICS MAINTENANCE
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ opacity: 0.3, textAlign: 'center', fontSize: '0.6rem', marginTop: '2rem', letterSpacing: '0.05em' }}>
            6ef7e27 - SHRM 2026: Restored Study Persistence & History (Unification with Domain Grid)
          </div>

        </div>
      </div>
    </div>
  );
}
