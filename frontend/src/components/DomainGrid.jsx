import React, { useMemo } from 'react';
import { getVaultStats } from '../utils/storage';

/**
 * DomainGrid: The Educational Hub of the application.
 * Replaces file-based navigation with SHRM 2026 BASK Domain buckets.
 * Provides a high-level view of study progress and AI readiness per domain.
 */
const DomainGrid = ({ decks, certLevel, onSelectDomain, studyMode, quizType, selectedDomain }) => {
  // 1. Calculate technical readiness via getVaultStats
  const vaultStats = useMemo(() => getVaultStats(certLevel, decks), [decks, certLevel]);

  // 2. Calculate educational progress (Mastery) across all decks for each domain
  const domainProgress = useMemo(() => {
    const progress = {
      'People': { mastered: 0, total: 0 },
      'Organization': { mastered: 0, total: 0 },
      'Workplace': { mastered: 0, total: 0 },
      'Competencies': { mastered: 0, total: 0 }
    };

    decks.forEach(deck => {
      deck.cards.forEach(card => {
        // HEURISTIC TETHERING: AI Tag -> Topic Fallback -> Default
        let domain = card.tag_bask;
        if (!domain) {
            if (deck.title.includes('People')) domain = 'People';
            else if (deck.title.includes('Organization')) domain = 'Organization';
            else if (deck.title.includes('Workplace')) domain = 'Workplace';
            else domain = 'Competencies';
        }
        
        if (!progress[domain]) return;

        progress[domain].total++;
        
        // Determine mastery based on current study mode
        const statusKey = studyMode === 'quiz' 
          ? `status_quiz_${quizType}_${certLevel}` 
          : (studyMode === 'traditional' ? 'status_traditional' : 'status');
        
        if (card[statusKey] === 'mastered' || card[statusKey] === 'correct' || card[statusKey] === 'difficulty-5' || card[statusKey] === 'difficulty-1') {
          progress[domain].mastered++;
        }
      });
    });

    return progress;
  }, [decks, studyMode, quizType, certLevel]);

  const DOMAINS = [
    { id: 'People', icon: 'groups', color: '#60a5fa', gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)', description: 'HR Strategy & Talent Acquisition' },
    { id: 'Organization', icon: 'corporate_fare', color: '#fbbf24', gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)', description: 'Business Governance & Structure' },
    { id: 'Workplace', icon: 'business_center', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)', description: 'Risk, Law & Global Integration' },
    { id: 'Competencies', icon: 'psychology', color: '#c084fc', gradient: 'linear-gradient(135deg, #c084fc, #a855f7)', description: 'Behavioral & Ethical Leadership' }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
      {DOMAINS.map(domain => {
        const stats = vaultStats[domain.id] || { simple: 0, intelligent: 0, total: 0 };
        const prog = domainProgress[domain.id] || { mastered: 0, total: 0 };
        const percentProgress = prog.total > 0 ? Math.round((prog.mastered / prog.total) * 100) : 0;
        const isReady = stats.intelligent === stats.total && stats.total > 0;

        return (
          <div 
            key={domain.id}
            onClick={() => onSelectDomain(domain.id)}
            className={`glass-panel topic-card ${selectedDomain === domain.id ? 'active-selection' : ''}`}
            style={{ 
              padding: '1.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.2rem',
              borderLeft: `4px solid ${domain.color}`,
              borderRight: selectedDomain === domain.id ? '2px solid var(--secondary)' : '1px solid rgba(255,255,255,0.05)',
              borderTop: selectedDomain === domain.id ? '2px solid var(--secondary)' : '1px solid rgba(255,255,255,0.05)',
              borderBottom: selectedDomain === domain.id ? '2px solid var(--secondary)' : '1px solid rgba(255,255,255,0.05)',
              background: selectedDomain === domain.id ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.02)',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {/* Background Glow */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: domain.color,
              filter: 'blur(60px)',
              opacity: 0.1,
              zIndex: 0
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: domain.color }}>
                    {domain.icon}
                  </span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{domain.id}</h3>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {domain.description}
                  </div>
                </div>
              </div>
              {isReady && (
                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: domain.color }}>
                  verified
                </span>
              )}
            </div>

            <div style={{ zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>{prog.total} Questions Available</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'white' }}>{percentProgress}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${percentProgress}%`, 
                  height: '100%', 
                  background: domain.gradient,
                  boxShadow: `0 0 10px ${domain.color}44`
                }} />
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              paddingTop: '0.5rem', 
              borderTop: '1px solid rgba(255,255,255,0.03)',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              zIndex: 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>bolt</span>
                {stats.intelligent} SJI Ready
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>menu_book</span>
                {stats.simple} Recall Ready
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DomainGrid;
