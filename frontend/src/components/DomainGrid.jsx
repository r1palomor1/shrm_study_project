import React, { useMemo, useState } from 'react';
import { getVaultStats, getDomainSnapshots } from '../utils/storage';
import DomainAnalyticsPopup from './DomainAnalyticsPopup';

/**
 * DomainGrid: The Educational Hub of the application.
 * Replaces file-based navigation with SHRM 2026 BASK Domain buckets.
 */
const DomainGrid = ({ decks, certLevel, onSelectDomain, studyMode, quizType, selectedDomain, onResetDomain }) => {
  const [activeAnalyticsDomain, setActiveAnalyticsDomain] = useState(null);

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
        let domain = card.tag_bask;
        if (!domain) {
            if (deck.title.includes('People')) domain = 'People';
            else if (deck.title.includes('Organization')) domain = 'Organization';
            else if (deck.title.includes('Workplace')) domain = 'Workplace';
            else domain = 'Competencies';
        }
        
        if (!progress[domain]) return;

        progress[domain].total++;
        
        const statusKey = studyMode === 'quiz' 
          ? `status_quiz_${quizType}_${certLevel}` 
          : (studyMode === 'traditional' ? 'status_traditional' : 'status');
        
        if (card[statusKey] === 'mastered' || card[statusKey] === 'correct' || card[statusKey] === 'difficulty-5') {
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
    { id: 'Competencies', title: 'All Study Material', icon: 'auto_stories', color: '#c084fc', gradient: 'linear-gradient(135deg, #c084fc, #a855f7)', description: 'Master Exam Repository' }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
      {DOMAINS.map(domain => {
        const stats = vaultStats[domain.id] || { simple: 0, intelligent: 0, total: 0 };
        const prog = domainProgress[domain.id] || { mastered: 0, total: 0 };
        const percentProgress = prog.total > 0 ? Math.round((prog.mastered / prog.total) * 100) : 0;
        const isReady = stats.intelligent === stats.total && stats.total > 0;
        const snapshots = getDomainSnapshots(domain.id, quizType, certLevel);

        return (
          <div 
            key={domain.id}
            onClick={() => onSelectDomain(domain.id)}
            className={`glass-panel topic-card ${selectedDomain === domain.id ? 'active' : ''}`}
            style={{ 
              padding: '1.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem',
              borderLeft: `5px solid ${domain.color}`,
              borderRight: selectedDomain === domain.id ? `2px solid ${domain.color}88` : '1px solid rgba(255,255,255,0.05)',
              borderTop: selectedDomain === domain.id ? `2px solid ${domain.color}88` : '1px solid rgba(255,255,255,0.05)',
              borderBottom: selectedDomain === domain.id ? `2px solid ${domain.color}88` : '1px solid rgba(255,255,255,0.05)',
              background: selectedDomain === domain.id ? `${domain.color}11` : 'rgba(255,255,255,0.02)',
              boxShadow: selectedDomain === domain.id ? `0 0 40px ${domain.color}22` : 'var(--card-shadow)',
              transform: selectedDomain === domain.id ? 'scale(1.01)' : 'scale(1)',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              zIndex: selectedDomain === domain.id ? 2 : 1,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {/* Background Glow */}
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: domain.color, filter: 'blur(60px)', opacity: 0.1, zIndex: 0 }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.4rem', color: domain.color }}>
                    {domain.icon}
                  </span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>{domain.title || domain.id}</h3>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{domain.description}</div>
                </div>
              </div>

              {/* SURGICAL CONTROLS */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveAnalyticsDomain(domain.id);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex' }}
                  title="Competency Insights"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>monitoring</span>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onResetDomain(domain.id, percentProgress);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex' }}
                  title="Reset Domain Session"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>restart_alt</span>
                </button>
              </div>
            </div>

            <div style={{ zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '600' }}>Mastery Progress</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white' }}>{percentProgress}%</span>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${percentProgress}%`, height: '100%', background: domain.gradient, boxShadow: `0 0 8px ${domain.color}44` }} />
              </div>
            </div>

            {/* PULSE ANALYTICS SPARKLINE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem', zIndex: 1 }}>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pulse</div>
                <div style={{ flex: 1, height: '16px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                    {snapshots.length === 0 ? (
                        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                    ) : (
                        snapshots.map((s, i) => (
                            <div key={i} style={{ 
                                flex: 1, 
                                height: `${Math.max(10, s.percentage)}%`, 
                                background: domain.color, 
                                opacity: 0.1 + (i * 0.1), 
                                borderRadius: '1px 1px 0 0' 
                            }} />
                        ))
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.03)', fontSize: '0.65rem', color: 'var(--text-muted)', zIndex: 1, fontWeight: 'bold' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: domain.color }}>verified</span>
                {Math.min(stats.intelligent, stats.simple)} Questions Ready
              </div>
              {isReady && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', color: domain.color, fontWeight: 'bold' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>award_star</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {activeAnalyticsDomain && (
          <DomainAnalyticsPopup 
            domainId={activeAnalyticsDomain}
            quizType={quizType}
            certLevel={certLevel}
            decks={decks}
            onClose={() => setActiveAnalyticsDomain(null)}
          />
      )}
    </div>
  );
};

export default DomainGrid;
