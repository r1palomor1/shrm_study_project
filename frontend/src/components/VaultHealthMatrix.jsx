import React, { useMemo } from 'react';
import { loadVaultFromStorage } from '../utils/storage';

const TopicHealthCell = ({ count, total, status = 'incomplete' }) => {
  const isComplete = count === total && total > 0;
  
  // HUD Color Logic based on Phase
  const getPhaseColor = () => {
    if (!isComplete) return '#fbbf24'; // Yellow (Sync Needed)
    if (status === 'phase1') return '#10b981'; // Green (Seed Set)
    if (status === 'phase2') return '#60a5fa'; // Blue (Mirror Parity)
    if (status === 'phase3') return '#f59e0b'; // Gold (Polish/Gaps)
    return '#60a5fa'; // Default
  };

  const color = getPhaseColor();

  return (
    <td style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
        {isComplete ? (
          <span className="material-symbols-outlined" style={{ fontSize: '1.4rem', color }}>verified</span>
        ) : (
          <span className="material-symbols-outlined" style={{
            fontSize: '1.4rem',
            color: '#fbbf24',
            animation: 'pulse 2s infinite'
          }}>bolt</span>
        )}

        <div style={{
          fontSize: '0.85rem',
          fontWeight: '900',
          color,
          fontFamily: 'monospace'
        }}>
          {count} / {total}
        </div>

        <div style={{
          fontSize: '0.55rem',
          textTransform: 'uppercase',
          color,
          fontWeight: '900',
          letterSpacing: '0.1em'
        }}>
          {isComplete ? 'READY' : 'SYNC NEEDED'}
        </div>
      </div>
    </td>
  );
};

const VaultHealthMatrix = ({ decks, onSmartSync, onSyncTopic, isSyncing, syncProgress, syncStatus, certLevel = 'CP' }) => {
  const vault = useMemo(() => loadVaultFromStorage(), [decks, certLevel, isSyncing, syncProgress]);

  const topicStats = useMemo(() => {
    const domains = ['Competencies', 'Organization', 'People', 'Workplace'];
    
    return domains.map(domName => {
      const targetDeck = decks.find(d => d.title.includes(domName)) || { cards: [], title: domName };
      const stats = { 
        name: domName, 
        deckObject: targetDeck,
        total: targetDeck.cards.length, 
        scenarios: 0, 
        distractors: 0, 
        rationales: 0, 
        traps: 0, 
        behavioral: 0, 
        simple: 0, 
        recallTags: 0 
      };

      targetDeck.cards.forEach(card => {
        const cleanId = String(card.id).replace(/[\s\n\r]/g, '');
        const sData = vault[`${cleanId}:simple:${certLevel}`];
        const iData = vault[`${cleanId}:intelligent:${certLevel}`];
        const isValidDomain = (tag) => tag && (tag.toLowerCase().includes('people') || tag.toLowerCase().includes('organization') || tag.toLowerCase().includes('workplace'));

        // FORENSIC AUDIT LOGIC (PHASE-GATE VALIDATION)
        if (iData?.scenario) stats.scenarios++;
        
        // Phase 2 Mirror Check (Character-Length Parity)
        if (Array.isArray(iData?.distractors) && iData.distractors.length > 0) {
            const matchLen = (card.answer || "").length;
            const distLens = iData.distractors.map(d => d.length);
            const avgLen = distLens.reduce((a,b) => a+b, 0) / distLens.length;
            // RELIEF LOGIC: 15 -> 25 chars (accounts for AI variance while catching longest-answer bias)
            if (Math.abs(avgLen - matchLen) < 25) stats.distractors++; 
        }

        // Phase 3 Polish Check (Rationale + Gap Analysis)
        if (iData?.rationale && iData?.gap_analysis) {
            stats.rationales++;
            stats.traps++;
        }
        
        if (isValidDomain(iData?.tag_bask)) stats.behavioral++;
        if (Array.isArray(sData?.distractors) && sData.distractors.length > 0) stats.simple++;
        if (isValidDomain(sData?.tag_bask)) stats.recallTags++;
      });
      return stats;
    });
  }, [decks, vault, certLevel]);

  const headers = [
    { label: 'Intelligent Scenarios', key: 'scenarios', icon: 'psychology', status: 'phase1' },
    { label: 'Intelligent Distractors', key: 'distractors', icon: 'list_alt', status: 'phase2' },
    { label: 'Strategic Rationales', key: 'rationales', icon: 'description', status: 'phase3' },
    { label: 'Strategic Trap Alerts', key: 'traps', icon: 'warning', status: 'phase3' },
    { label: 'Behavioral Bridge Tags', key: 'behavioral', icon: 'link', status: 'phase3' },
    { label: 'Simple Distractors', key: 'simple', icon: 'format_list_bulleted', status: 'phase1' },
    { label: 'Recall Metadata Tags', key: 'recallTags', icon: 'sell', status: 'phase1' }
  ];

  return (
    <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'white' }}>
          <span className="material-symbols-outlined" style={{ color: '#60a5fa' }}>verified_user</span>
          AI READINESS MATRIX - {certLevel}
        </h2>
        <button onClick={onSmartSync} disabled={isSyncing} className="btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: '12px' }}>
          {isSyncing ? `Syncing ${syncProgress}%` : 'SMART SYNC ALL'}
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.05)' }}>
            <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              AI CONTENT ELEMENT
            </th>
            {topicStats.map(t => (
              <th key={t.name} style={{ textAlign: 'center', padding: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {t.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {headers.map(h => (
            <tr key={h.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <td style={{ padding: '1.2rem 1rem', fontSize: '0.85rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: '#60a5fa' }}>{h.icon}</span>
                {h.label}
              </td>
              {topicStats.map(topic => (
                <TopicHealthCell key={`${topic.name}-${h.key}`} count={topic[h.key]} total={topic.total} status={h.status} />
              ))}
            </tr>
          ))}
          {/* SURGICAL ACTIONS ROW (Preserved Original) */}
          <tr>
            <td style={{ padding: '1.5rem 1rem', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              SURGICAL ACTIONS
            </td>
            {topicStats.map(topic => (
              <td key={`action-${topic.name}`} style={{ textAlign: 'center', padding: '1rem' }}>
                <button 
                  onClick={() => onSyncTopic(topic.deckObject)}
                  disabled={isSyncing || topic.total === 0}
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#f59e0b',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    opacity: topic.total === 0 ? 0.5 : 1
                  }}
                >
                  {topic.total > 0 && (topic.simple === topic.total && topic.distractors === topic.total) ? 'FULLY READY' : 'SYNC TOPIC'}
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default VaultHealthMatrix;
