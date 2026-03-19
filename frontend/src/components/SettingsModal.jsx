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
        // --- SJI SIMULATOR ITEM ---
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
        md += `---\n\n`;
      } else if (data.quizType === 'simple' && data.correct_answer) {
        // --- SIMPLE RECALL ITEM ---
        md += `## [SHRM-${levelLabel}] RECALL: ${data.question}\n\n`;
        md += `*   **Correct (Knowledge Match):** ${data.correct_answer}\n`;
        if (data.distractors && Array.isArray(data.distractors)) {
          data.distractors.forEach((d, i) => {
            md += `*   **Trap ${i+1}:** ${d}\n`;
          });
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

  const performBossModeCalibration = () => {
    const vault = JSON.parse(localStorage.getItem('shrm_distractor_vault') || '{}');
    let patched = false;

    // Recommendation 1: Surgical Fixes
    Object.keys(vault).forEach(key => {
        const entry = vault[key];
        // Digital Transformation CP
        if ((entry.question || '').includes('Digital Transformation') && entry.certLevel === 'CP') {
            entry.correct_answer = "Process a review of internal records and coordinate with managers to identify tactical process gaps in current workflows.";
            patched = true;
        }
        // AI Ethics SCP
        if ((entry.question || '').includes('AI Ethics Friction') && entry.certLevel === 'SCP') {
            entry.correct_answer = "Evaluate the current reporting structure by conducting stakeholder interviews to identify strategic risks in AI governance.";
            patched = true;
        }
    });

    if (patched) {
        localStorage.setItem('shrm_distractor_vault', JSON.stringify(vault));
        alert('Boss-Mode Calibration Successful: Audit Entries Synced.');
    } else {
        alert('Calibration Complete: No legacy entries required patching.');
    }
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
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>Settings & Audit</h2>
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
          
          <div style={{ marginBottom: '2.5rem' }}>
            <h4 style={{ color: 'var(--secondary)', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1.2rem' }}>Audit & Calibration</h4>
            
            <div style={{ display: grid, gap: '1rem' }}>
              <div style={{
                background: 'rgba(59,130,246,0.05)',
                borderRadius: '16px',
                padding: '1.2rem',
                border: '1px solid rgba(59,130,246,0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>assignment_turned_in</span>
                    <span style={{ fontWeight: '600' }}>Export Dual-Engine Audit</span>
                  </div>
                  <button 
                    onClick={handleAuditExport}
                    style={{ 
                      background: 'rgba(59,130,246,0.1)', 
                      color: 'var(--primary)', 
                      border: '1px solid var(--primary)', 
                      padding: '0.4rem 1rem', 
                      fontSize: '0.8rem',
                      borderRadius: '8px'
                    }}
                  >
                    Export Log
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                  Generates 2026 Audit Log with CP/SCP labels and Rationale Gaps.
                </p>
              </div>

              <div style={{
                background: 'rgba(245,158,11,0.05)',
                borderRadius: '16px',
                padding: '1.2rem',
                border: '1px solid rgba(245,158,11,0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span className="material-symbols-outlined" style={{ color: '#f59e0b' }}>precision_manufacturing</span>
                    <span style={{ fontWeight: '600' }}>Boss-Mode Calibration</span>
                  </div>
                  <button 
                    onClick={performBossModeCalibration}
                    style={{ 
                      background: 'rgba(245,158,11,0.1)', 
                      color: '#f59e0b', 
                      border: '1px solid #f59e0b', 
                      padding: '0.4rem 1rem', 
                      fontSize: '0.8rem',
                      borderRadius: '8px'
                    }}
                  >
                    Apply Patches
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                  Surgically corrects legacy audit entries to align with 2026 standards.
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '2.5rem' }}>
            <h4 style={{ color: 'var(--secondary)', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1.2rem' }}>Dangerous Territory</h4>
            
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
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
