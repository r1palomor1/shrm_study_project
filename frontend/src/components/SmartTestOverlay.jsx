import React, { useState } from 'react';

/**
 * SmartTestOverlay: Modal for configuring and launching a study session.
 * Implements the "Proportionality Guard" for the 134-question simulation.
 */
const SmartTestOverlay = ({ 
  isOpen, 
  onClose, 
  onStartTest, 
  domainId, 
  vaultStats, 
  certLevel,
  studyMode,
  quizType
}) => {
  const [testLength, setTestLength] = useState(25);
  // testType (intelligent vs simple) is now controlled by the sidebar prop
  const testType = quizType;
  
  const stats = vaultStats[domainId] || { simple: 0, intelligent: 0, total: 0 };
  const availableCount = testType === 'intelligent' ? stats.intelligent : stats.simple;
  
  const isSimulation = testLength === 134;
  const isUnderStrength = availableCount < testLength && testLength !== -1; // -1 for "All Available"

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      background: 'rgba(11, 15, 25, 0.85)', 
      backdropFilter: 'blur(8px)', 
      zIndex: 3000, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div className="modal-content glass-panel animate-fade-in" style={{ 
        maxWidth: '450px', 
        width: '90%',
        padding: '2rem',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Configure Test</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{domainId}</span> • {certLevel} • {testType === 'intelligent' ? 'SITUATIONAL (SJI)' : 'RECALL (DEFINITION)'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Proportionality Guard Indicator (Moved to Top) */}
          {isUnderStrength && (
            <div style={{ 
              padding: '1rem', 
              borderRadius: '12px', 
              background: 'rgba(251, 191, 36, 0.05)', 
              border: '1px solid rgba(251, 191, 36, 0.2)',
              fontSize: '0.75rem',
              color: '#fbbf24',
              display: 'flex',
              gap: '0.8rem'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>report</span>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>Pool Strength Warning</div>
                Only {availableCount} questions are currently synced for this domain. 
                Engine will scale to maximum capacity.
              </div>
            </div>
          )}

          {/* Length Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test Length</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem' }}>
              {[
                { val: 25, label: 'Mini-Sprint (25)' },
                { val: 50, label: 'Standard (50)' },
                { val: 134, label: 'Full Simulation (134)', gold: true },
                { val: -1, label: `All Available (${availableCount})` }
              ].map(opt => (
                <button 
                  key={opt.val}
                  onClick={() => setTestLength(opt.val)}
                  style={{
                    padding: '0.8rem',
                    fontSize: '0.75rem',
                    background: testLength === opt.val ? (opt.gold ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.05)') : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${testLength === opt.val ? (opt.gold ? '#fbbf24' : 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.05)'}`,
                    color: testLength === opt.val ? 'white' : 'var(--text-muted)',
                    boxShadow: 'none'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>


          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button 
              onClick={onClose}
              style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', boxShadow: 'none' }}
            >
              Cancel
            </button>
            <button 
              onClick={() => onStartTest({ 
                domainId, 
                testLength: testLength === -1 ? availableCount : testLength, 
                testType, 
                certLevel 
              })}
              disabled={availableCount === 0}
              style={{ 
                flex: 2, 
                padding: '1rem', 
                background: availableCount === 0 ? 'rgba(255,255,255,0.05)' : (isSimulation ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--primary)'),
                boxShadow: availableCount === 0 ? 'none' : undefined,
                cursor: availableCount === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined">play_arrow</span>
                START STUDYING
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SmartTestOverlay;
