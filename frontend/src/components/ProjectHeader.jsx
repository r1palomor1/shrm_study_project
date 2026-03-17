import React from 'react';

/**
 * ProjectHeader: Structural Component for the Main Application Header.
 * Dynamically calculates the project status baseline from current data.
 */
const ProjectHeader = ({ totalCards }) => {
  // Structural Logic: Baseline is fixed at 398 for the current project audit.
  // We use the dynamic totalCards to show real-time parity.
  const BASELINE = 398;
  const isParityReached = totalCards === BASELINE;

  return (
    <header style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '3rem',
      padding: '1.5rem 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: '800' }} className="text-gradient">
          SHRM 2026
        </h1>
        
        {/* Dynamic Project Status Badge */}
        <div style={{ 
          padding: '0.5rem 1rem', 
          background: 'rgba(255,255,255,0.03)', 
          borderRadius: '12px', 
          border: `1px solid ${isParityReached ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem'
        }}>
          <span style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-muted)', 
            fontWeight: 'bold',
            letterSpacing: '0.05em'
          }}>
            PROJECT STATUS:
          </span>
          <span style={{ 
            fontSize: '0.85rem', 
            color: isParityReached ? '#10b981' : '#60a5fa', 
            fontWeight: '900' 
          }}>
            {totalCards} / {BASELINE} AUDITED
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          background: isParityReached ? '#10b981' : '#fbbf24',
          boxShadow: isParityReached ? '0 0 10px #10b981' : '0 0 10px #fbbf24'
        }} />
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
          {isParityReached ? 'SYSTEM AT PARITY' : 'DATA GAP DETECTED'}
        </span>
      </div>
    </header>
  );
};

export default ProjectHeader;
