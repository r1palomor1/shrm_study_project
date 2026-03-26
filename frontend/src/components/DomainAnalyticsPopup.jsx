import React from 'react';
import { getDomainSnapshots, resolveCardDomains, loadVaultFromStorage } from '../utils/storage';

const DomainAnalyticsPopup = ({ domainId, quizType, studyMode, certLevel, decks, onClose }) => {
  const snapshots = getDomainSnapshots(domainId, quizType, certLevel);
  
  // Calculate cluster-level competency
  const clusters = {};
  const activeVault = loadVaultFromStorage(); // PERFORMANCE HUB

  decks.forEach(deck => {
    deck.cards.forEach(card => {
        // STRUCTURAL SYNC: Use the universal routing matrix for 100% symmetry
        const cardDomains = resolveCardDomains(card, certLevel, deck.title, activeVault);

        if (cardDomains.includes(domainId)) {
            // Check for the cluster tag in the AI Vault primarily to guarantee exact domain matching
            const vaultData = activeVault[`${String(card.id).replace(/[\s\n\r]/g, '')}:${quizType}:${certLevel}`];
            const cluster = card.tag_behavior || vaultData?.tag_behavior || 'Core Concepts';
            
            if (!clusters[cluster]) clusters[cluster] = { correct: 0, total: 0, sumScores: 0 };
            
            if (studyMode === 'traditional') {
                const val = card.status_traditional;
                if (val && val.toString().startsWith('difficulty-')) {
                   clusters[cluster].total++;
                   clusters[cluster].sumScores += (parseInt(val.split('-')[1]) || 0);
                }
            } else {
                const historyKey = `correct_count_quiz_${quizType}_${certLevel}`;
                const incorrectKey = `incorrect_count_quiz_${quizType}_${certLevel}`;
                clusters[cluster].correct += (card[historyKey] || 0);
                clusters[cluster].total += ((card[historyKey] || 0) + (card[incorrectKey] || 0));
            }
        }
    });
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10005,
      padding: '2rem'
    }} onClick={onClose}>
      <div className="glass-panel animate-fade-in" style={{ 
        width: '100%', 
        maxWidth: '600px', 
        padding: '2rem', 
        maxHeight: '85vh', 
        overflowY: 'auto',
        backgroundColor: '#0f111a',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '24px'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'white', fontWeight: '800' }}>{domainId === 'Competencies' ? 'All Study Material' : domainId} Insights</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Competitive Performance & Trend Analysis ({studyMode === 'traditional' ? 'FLASHCARDS' : (quizType === 'intelligent' ? 'SJI' : 'RECALL')} Mode)
            </div>
          </div>
          <button onClick={onClose} style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: 'none', color: '#94a3b8', width: '32px', height: '32px', 
              borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>close</span>
          </button>
        </div>

        {/* CLUSTER BREAKDOWN SECTION (Moved to Top) */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.2rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Cluster-Level Competency
            </h3>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>* % is proficiency • (#) is questions answered</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.keys(clusters).length === 0 ? (
                 <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No competency data generated yet.</div>
            ) : (
                Object.entries(clusters).sort((a,b) => b[1].total - a[1].total).map(([name, stats]) => {
                    let percent = 0;
                    let displayValue = '';
                    if (studyMode === 'traditional') {
                       const gpa = stats.total > 0 ? (stats.sumScores / stats.total).toFixed(1) : "0.0";
                       percent = stats.total > 0 ? (gpa / 5) * 100 : 0;
                       displayValue = `${gpa} GPA`;
                    } else {
                       percent = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                       displayValue = `${percent}%`;
                    }
                    const color = percent > 80 ? 'var(--secondary)' : percent > 50 ? '#fbbf24' : '#ef4444';
                    return (
                        <div key={name} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                                <span style={{ fontWeight: '600' }}>{name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ color, fontWeight: '800' }}>{displayValue}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 'bold' }}>({stats.total})</span>
                                </div>
                            </div>
                            <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ 
                                    width: `${percent}%`, 
                                    height: '100%', 
                                    background: color,
                                    borderRadius: '2px',
                                    boxShadow: `0 0 10px ${color}44`
                                }} />
                            </div>
                        </div>
                    );
                })
            )}
          </div>
        </section>

        {/* PERFORMANCE TREND SECTION (Moved Below) */}
        <section>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--secondary)', textTransform: 'uppercase', marginBottom: '1.2rem', letterSpacing: '1px' }}>
            Retake Improvement Trend
          </h3>
          <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {snapshots.length === 0 ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center' }}>
                    No session history yet. Complete a domain and reset to see legacy trends.
                </div>
            ) : (
                snapshots.map((s, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'white', fontWeight: 'bold' }}>{studyMode === 'traditional' ? ((s.percentage / 100) * 5).toFixed(1) : `${Math.round(s.percentage)}%`}</div>
                        <div style={{ 
                            width: '100%', 
                            height: `${Math.max(10, s.percentage)}px`, 
                            background: 'linear-gradient(to top, var(--primary), #818cf8)',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 1s ease',
                            boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)'
                        }} />
                        <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 'bold' }}>Run {i+1}</div>
                    </div>
                ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DomainAnalyticsPopup;
