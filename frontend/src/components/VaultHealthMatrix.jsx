import React, { useMemo } from 'react';
import { loadVaultFromStorage } from '../utils/storage';

const TopicHealthCell = ({ gold, stabilized, total }) => {
  const isComplete = (gold + stabilized) >= total && total > 0;
  const isGold = gold === total && total > 0;
  
  // HUD Color Logic: Green = Gold, Indigo = Stabilized, Yellow = Sync Needed
  const getStatusColor = () => {
    if (!isComplete) return '#fbbf24'; // Yellow (Sync Needed)
    if (isGold) return '#10b981';      // Green (Pure Gold)
    return '#818cf8';                  // Indigo (Stabilized)
  };

  const getStatusIcon = () => {
    if (!isComplete) return 'bolt';
    if (isGold) return 'verified';
    return 'auto_mode'; // Stabilization Gear
  };

  const color = getStatusColor();

  return (
    <td style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
        <span className="material-symbols-outlined" style={{ 
            fontSize: '1.4rem', 
            color,
            animation: !isComplete ? 'pulse 2s infinite' : 'none'
        }}>
            {getStatusIcon()}
        </span>

        <div style={{
          fontSize: '0.85rem',
          fontWeight: '900',
          color,
          fontFamily: 'monospace'
        }}>
          {gold + stabilized} / {total}
        </div>

        <div style={{
          fontSize: '0.55rem',
          textTransform: 'uppercase',
          color,
          fontWeight: '900',
          letterSpacing: '0.1em',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <span>{isComplete ? 'READY' : 'SYNC NEEDED'}</span>
          {stabilized > 0 && isComplete && (
            <span style={{ fontSize: '0.45rem', opacity: 0.8, marginTop: '2px' }}>
                ({stabilized} STABILIZED)
            </span>
          )}
        </div>
      </div>
    </td>
  );
};

const VaultHealthMatrix = ({ decks, onSmartSync, onSyncTopic, onClose, isSyncing, syncProgress, syncStatus, certLevel = 'CP' }) => {
  const vault = useMemo(() => loadVaultFromStorage(), [decks, certLevel, isSyncing, syncProgress]);

  const topicStats = useMemo(() => {
    const domains = ['Competencies', 'Organization', 'People', 'Workplace'];
    const safeCertLevel = String(certLevel || 'CP').toUpperCase();

    // RECALL AUDIT ARRAYS (Captured during memo calculation)
    const missingRecalls = [];

    const statsArray = domains.map(domName => {
      const targetDeck = decks.find(d => d.title.includes(domName)) || { cards: [], title: domName };
      const stats = { 
        name: domName, 
        deckObject: targetDeck,
        total: targetDeck.cards.length,
        scenarios: { gold: 0, stabilized: 0 },
        distractors: { gold: 0, stabilized: 0 },
        rationales: { gold: 0, stabilized: 0 },
        traps: { gold: 0, stabilized: 0 },
        behavioral: { gold: 0, stabilized: 0 },
        simple: { gold: 0, stabilized: 0 },
        recallTags: { gold: 0, stabilized: 0 }
      };

      targetDeck.cards.forEach(card => {
        const cleanId = String(card.id).replace(/[\s\n\r]/g, '');
        const sData = vault[`${cleanId}:simple:${safeCertLevel}`] || (safeCertLevel === 'SCP' ? vault[`${cleanId}:simple:CP`] : null);
        const iData = vault[`${cleanId}:intelligent:${safeCertLevel}`];
        const isValidBehavior = (tag) => tag && tag.length > 3; // Any competency string (Leadership, etc.)
        const isValidDomain = (tag) => tag && (tag.toLowerCase().includes('people') || tag.toLowerCase().includes('organization') || tag.toLowerCase().includes('workplace'));

        // Intelligent Section
        if (iData?.scenario) stats.scenarios.gold++;
        if (Array.isArray(iData?.distractors) && iData.distractors.length > 0) {
            const hasSemicolonMatch = (card.answer?.includes(';') === iData.distractors[0]?.includes(';'));
            if (hasSemicolonMatch) stats.distractors.gold++;
            else stats.distractors.stabilized++;
        }
        if (iData?.rationale && iData?.gap_analysis) {
            stats.rationales.gold++;
            stats.traps.gold++;
        }
        if (isValidBehavior(iData?.tag_behavior)) stats.behavioral.gold++;

        // Simple Recall Section & AUDIT
        const hasSimple = Array.isArray(sData?.distractors) && sData.distractors.length > 0;
        const hasTags = isValidDomain(sData?.tag_bask) || isValidDomain(iData?.tag_bask);

        if (hasSimple) stats.simple.gold++;
        if (hasTags) stats.recallTags.gold++;

        // RECALL AUDIT TRIGGER
        if (domName === 'People' && (!hasSimple || !hasTags)) {
            missingRecalls.push({ id: cleanId, question: card.question, issue: !hasSimple ? 'Missing Distractors' : 'Invalid BASK Tags' });
        }
      });
      return stats;
    });


    return statsArray;
  }, [decks, vault, certLevel]);

  const headers = [
    { label: 'Intelligent Scenarios', key: 'scenarios', icon: 'psychology' },
    { label: 'Intelligent Distractors', key: 'distractors', icon: 'list_alt' },
    { label: 'Strategic Rationales', key: 'rationales', icon: 'description' },
    { label: 'Strategic Trap Alerts', key: 'traps', icon: 'warning' },
    { label: 'Behavioral Bridge Tags', key: 'behavioral', icon: 'link' },
    { label: 'Simple Distractors', key: 'simple', icon: 'format_list_bulleted' },
    { label: 'Recall Metadata Tags', key: 'recallTags', icon: 'sell' }
  ];

  return (
    <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'white' }}>
          <span className="material-symbols-outlined" style={{ color: '#6366f1' }}>verified_user</span>
          AI READINESS MATRIX - {certLevel}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <button onClick={onSmartSync} disabled={isSyncing} className="btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: '12px' }}>
            {isSyncing ? `Syncing ${syncProgress}%` : 'SMART SYNC ALL'}
          </button>
          {onClose && (
            <button 
              onClick={onClose} 
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', padding: '4px' }}
              className="hover-bright"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.8rem' }}>close</span>
            </button>
          )}
        </div>
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
                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: '#6366f1' }}>{h.icon}</span>
                {h.label}
              </td>
              {topicStats.map(topic => (
                <TopicHealthCell 
                  key={`${topic.name}-${h.key}`} 
                  gold={topic[h.key].gold} 
                  stabilized={topic[h.key].stabilized} 
                  total={topic.total} 
                />
              ))}
            </tr>
          ))}
          {/* SURGICAL ACTIONS ROW */}
          <tr>
            <td style={{ padding: '1.5rem 1rem', fontSize: '0.75rem', color: '#6366f1', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              SURGICAL ACTIONS
            </td>
            {topicStats.map(topic => (
              <td key={`action-${topic.name}`} style={{ textAlign: 'center', padding: '1rem' }}>
                <button 
                  onClick={() => onSyncTopic(topic.deckObject)}
                  disabled={isSyncing || topic.total === 0}
                  style={{
                    background: topic.total > 0 && (topic.simple.gold + topic.distractors.gold + topic.distractors.stabilized >= topic.total * 2) 
                        ? 'rgba(16, 185, 129, 0.1)' 
                        : 'rgba(99, 102, 241, 0.1)',
                    border: `1px solid ${topic.total > 0 && (topic.simple.gold === topic.total && topic.distractors.gold === topic.total) ? '#10b981' : '#6366f1'}`,
                    color: topic.total > 0 && (topic.simple.gold === topic.total && topic.distractors.gold === topic.total) ? '#10b981' : '#6366f1',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    opacity: topic.total === 0 ? 0.5 : 1
                  }}
                >
                  {topic.total > 0 && (topic.simple.gold + topic.simple.stabilized === topic.total && topic.distractors.gold + topic.distractors.stabilized === topic.total) ? 'FULLY READY' : 'SYNC TOPIC'}
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
