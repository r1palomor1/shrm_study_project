import React, { useMemo } from 'react';
import { loadVaultFromStorage } from '../utils/storage';

/**
 * TopicHealthCell: Sub-component for individual matrix cells.
 * Encapsulates the visual logic for READY/SYNC states.
 */
const TopicHealthCell = ({ count, total }) => {
  const isComplete = count === total && total > 0;
  
  return (
    <td style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
        {isComplete ? (
          <span className="material-symbols-outlined" style={{ fontSize: '1.4rem', color: '#60a5fa' }}>verified</span>
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
          color: isComplete ? '#60a5fa' : '#fbbf24',
          fontFamily: 'monospace'
        }}>
          {count} / {total}
        </div>
        
        <div style={{ 
          fontSize: '0.55rem', 
          textTransform: 'uppercase', 
          color: isComplete ? '#60a5fa' : '#fbbf24', 
          fontWeight: '900',
          letterSpacing: '0.1em'
        }}>
          {isComplete ? 'READY' : 'SYNC NEEDED'}
        </div>
      </div>
    </td>
  );
};

/**
 * VaultHealthMatrix: Structural Component for AI Readiness Audit.
 * Provides a granular view of AI content presence across all topics.
 */
const VaultHealthMatrix = ({ decks, onSmartSync, isSyncing, syncProgress, certLevel = 'CP' }) => {
  // Dynamic vault reload for real-time matrix updates during sync
  const vault = useMemo(() => loadVaultFromStorage(), [isSyncing, syncProgress]);

  // Structural Logic: Calculate health stats for each topic
  const topicStats = useMemo(() => {
    return decks.map(deck => {
      const stats = {
        name: deck.title,
        total: deck.cards.length,
        simple: 0,
        scenarios: 0,
        rationales: 0,
        tags: 0
      };

      deck.cards.forEach(card => {
        // Updated to use the ISOATED KEY STRATEGY (fingerprint:quizType:certLevel)
        const sData = vault[`${card.id}:simple:${certLevel}`];
        const iData = vault[`${card.id}:intelligent:${certLevel}`];

        // PHYSICAL DATA CHECK: No shadow logic, just existence check
        if (sData?.distractors) stats.simple++;
        if (iData?.scenario) stats.scenarios++;
        if (iData?.rationale) stats.rationales++;
        if (iData?.tag_bask) stats.tags++;
      });

      return stats;
    });
  }, [decks, vault, certLevel]); 

  const headers = ['Intelligent Scenarios', 'Strategic Rationales', 'Behavioral Bridge Tags', 'Simple Distractors'];
  const dataKeys = ['scenarios', 'rationales', 'tags', 'simple'];
  const icons = ['psychology', 'description', 'join_inner', 'format_list_bulleted'];

  return (
    <section className="glass-panel" style={{ 
      padding: '2rem', 
      overflowX: 'auto',
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.8rem', fontWeight: '800' }}>
          <span className="material-symbols-outlined" style={{ color: '#60a5fa' }}>verified_user</span>
          AI READINESS MATRIX
        </h3>
        <button 
          onClick={onSmartSync} 
          disabled={isSyncing} 
          className={isSyncing ? "glass-panel" : "btn-primary"} 
          style={{ 
            padding: '0.6rem 1.2rem', 
            fontSize: '0.8rem', 
            fontWeight: 'bold',
            color: isSyncing ? '#fbbf24' : 'white',
            border: isSyncing ? '1px solid rgba(251,191,36,0.3)' : 'none'
          }}
        >
          {isSyncing ? `SYNCING ${syncProgress}%...` : 'SMART SYNC ALL'}
        </button>
      </div>
      {/* Dynamic progress bar for Smart Sync */}
      {isSyncing && (
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div style={{ width: `${syncProgress}%`, height: '100%', background: '#fbbf24', transition: 'width 0.3s' }} />
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.05)' }}>
            <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              AI CONTENT ELEMENT
            </th>
            {topicStats.map(t => (
              <th key={t.name} style={{ padding: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {t.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {headers.map((label, idx) => (
            <tr key={label} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <td style={{ padding: '1.2rem 1rem', fontSize: '0.85rem', color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: '#60a5fa' }}>{icons[idx]}</span>
                {label}
              </td>
              {topicStats.map(topic => (
                <TopicHealthCell key={topic.name} count={topic[dataKeys[idx]]} total={topic.total} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default VaultHealthMatrix;
