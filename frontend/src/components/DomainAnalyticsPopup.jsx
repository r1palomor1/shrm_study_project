import React from 'react';
import { getDomainSnapshots } from '../utils/storage';

const DomainAnalyticsPopup = ({ domainId, quizType, certLevel, decks, onClose }) => {
  const snapshots = getDomainSnapshots(domainId, quizType, certLevel);
  
  // Calculate cluster-level competency
  const clusters = {};
  decks.forEach(deck => {
    deck.cards.forEach(card => {
        let cardDomain = card.tag_bask;
        if (!cardDomain) {
            if (deck.title.includes('People')) cardDomain = 'People';
            else if (deck.title.includes('Organization')) cardDomain = 'Organization';
            else if (deck.title.includes('Workplace')) cardDomain = 'Workplace';
            else cardDomain = 'Competencies';
        }

        if (cardDomain === domainId) {
            const cluster = card.tag_behavior || 'Core Concepts';
            if (!clusters[cluster]) clusters[cluster] = { correct: 0, total: 0 };
            
            const historyKey = `correct_count_quiz_${quizType}_${certLevel}`;
            const incorrectKey = `incorrect_count_quiz_${quizType}_${certLevel}`;
            
            clusters[cluster].correct += (card[historyKey] || 0);
            clusters[cluster].total += ((card[historyKey] || 0) + (card[incorrectKey] || 0));
        }
    });
  });

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 3000 }}>
      <div className="glass-panel" style={{ 
        width: '90%', 
        maxWidth: '600px', 
        padding: '2rem', 
        maxHeight: '85vh', 
        overflowY: 'auto',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>{domainId} Insights</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Competitive Performance & Trend Analysis ({quizType.toUpperCase()} Mode)
            </div>
          </div>
          <button onClick={onClose} className="glass-panel" style={{ padding: '0.5rem', borderRadius: '50%' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* PERFORMANCE TREND SECTION */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--secondary)', textTransform: 'uppercase', marginBottom: '1.2rem', letterSpacing: '1px' }}>
            Retake Improvement Trend
          </h3>
          <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {snapshots.length === 0 ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No session history yet. Complete a domain and reset to see trends.
                </div>
            ) : (
                snapshots.map((s, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{Math.round(s.percentage)}%</div>
                        <div style={{ 
                            width: '100%', 
                            height: `${Math.max(10, s.percentage)}px`, 
                            background: 'linear-gradient(to top, var(--primary), var(--secondary))',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 1s ease',
                            boxShadow: '0 0 10px rgba(99, 102, 241, 0.2)'
                        }} />
                        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>Run {i+1}</div>
                    </div>
                ))
            )}
          </div>
        </section>

        {/* CLUSTER BREAKDOWN SECTION */}
        <section>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--secondary)', textTransform: 'uppercase', marginBottom: '1.2rem', letterSpacing: '1px' }}>
            Cluster-Level Competency
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.keys(clusters).length === 0 ? (
                 <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No competency data found.</div>
            ) : (
                Object.entries(clusters).sort((a,b) => b[1].total - a[1].total).map(([name, stats]) => {
                    const percent = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                    return (
                        <div key={name} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                <span style={{ fontWeight: '600' }}>{name}</span>
                                <span style={{ color: percent > 80 ? 'var(--secondary)' : percent > 50 ? '#fbbf24' : '#ef4444' }}>{percent}%</span>
                            </div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                <div style={{ 
                                    width: `${percent}%`, 
                                    height: '100%', 
                                    background: percent > 80 ? 'var(--secondary)' : percent > 50 ? '#fbbf24' : '#ef4444',
                                    borderRadius: '2px'
                                }} />
                            </div>
                        </div>
                    );
                })
            )}
          </div>
        </section>

        <button 
           onClick={onClose}
           className="btn-primary" 
           style={{ width: '100%', marginTop: '2rem', padding: '0.8rem' }}>
            Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default DomainAnalyticsPopup;
