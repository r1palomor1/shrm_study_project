import React, { useState, useRef, useEffect, useMemo } from 'react';
import DataImporter from './DataImporter';
import { loadVaultFromStorage } from '../utils/storage';

/**
 * VaultManager: The "Administrative Layer" of the application.
 * Replaces the main-grid topic cards with a sleek, header-level dropdown.
 * Separates technical file management (Sync/Delete/Reset) from the Study Hub.
 */
const VaultManager = ({ 
  decks, 
  onDeckLoaded, 
  onDeleteDeck,
  onResetProgress, 
  onResetAllProgress,
  onDeleteAllDecks,
  certLevel, 
  isWarmingUp, 
  warmUpProgress,
  onRefineMetadata,
  isRefining,
  refineProgress,
  isOpen,
  setIsOpen
}) => {
  const dropdownRef = useRef(null);

  // Calculate Refinement Needs
  const needsRefinementCount = useMemo(() => {
    let count = 0;
    const vault = loadVaultFromStorage();
    decks.forEach(deck => {
      deck.cards.forEach(card => {
        const cleanId = String(card.id).replace(/[\s\n\r]/g, '');
        const key = `${cleanId}:simple:${certLevel}`;
        const sData = vault[key];
        if (sData?.distractors && !sData?.tag_bask) {
          count++;
        }
      });
    });
    return count;
  }, [decks, certLevel, isRefining]);


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      zIndex: 10001,
      padding: '2rem'
    }} onClick={() => setIsOpen(false)}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '500px',
        maxHeight: '85vh',
        padding: '2rem',
        backgroundColor: '#0f111a',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#60a5fa' }}>database</span>
            VAULT MANAGER
          </h3>
          <button onClick={() => setIsOpen(false)} style={{
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            color: '#94a3b8',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>close</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Source Topics</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label 
                htmlFor="md-upload-main" 
                className="icon-btn" 
                style={{ 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#60a5fa',
                  background: 'rgba(96, 165, 250, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(96, 165, 250, 0.2)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>add</span>
                ADD
              </label>
              <DataImporter onDeckLoaded={onDeckLoaded} />
            </div>
          </div>
          
          {/* BULK ACTIONS ROW */}
          {decks.length > 0 && (
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); onResetAllProgress(); }}
                style={{ 
                  flex: 1, 
                  padding: '0.4rem 0.6rem', 
                  fontSize: '0.65rem', 
                  fontWeight: '800', 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  color: '#94a3b8', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>restart_alt</span>
                RESET ALL
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteAllDecks(); }}
                style={{ 
                  flex: 1, 
                  padding: '0.4rem 0.8rem', 
                  fontSize: '0.65rem', 
                  fontWeight: '800', 
                  background: 'rgba(239, 68, 68, 0.05)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  color: '#ef4444', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete_sweep</span>
                DELETE ALL
              </button>
            </div>
          )}
        </div>

        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
          {decks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No topics loaded. Upload an MD file to begin.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {decks.map(deck => {
                const totalCards = deck.cards.length;
                const vault = loadVaultFromStorage();
                const readyCount = deck.cards.filter(c => {
                  const cleanId = String(c.id).replace(/[\s\n\r]/g, '');
                  const iData = vault[`${cleanId}:intelligent:${certLevel}`];
                  return !!iData?.scenario && !!iData?.rationale; // Match Matrix "READY" state
                }).length;
                const isReady = readyCount === totalCards && totalCards > 0;

                return (
                  <div 
                    key={deck.title} 
                    className="settings-card"
                    style={{
                      padding: '1rem',
                      borderRadius: '16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.8rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className="sync-dot" style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: isReady ? '#10b981' : '#fbbf24',
                          boxShadow: isReady ? '0 0 10px rgba(16, 185, 129, 0.4)' : '0 0 10px rgba(251, 191, 36, 0.4)'
                        }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'white' }}>{deck.title}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onResetProgress(deck.title); }}
                          className="icon-btn"
                          title="Reset Progress"
                          style={{ padding: '0.4rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: '#94a3b8' }}>restart_alt</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteDeck(deck.title); }}
                          className="icon-btn"
                          title="Delete Topic"
                          style={{ padding: '0.4rem', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: '#ef4444' }}>delete</span>
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{totalCards} Flashcards</span>
                      <span style={{ color: isReady ? '#10b981' : '#fbbf24', fontWeight: 'bold' }}>{readyCount}/{totalCards} Synced</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
           {needsRefinementCount > 0 && (
             <button 
               onClick={onRefineMetadata}
               disabled={isRefining}
               className="btn-primary"
               style={{
                 width: '100%',
                 padding: '0.86rem',
                 fontSize: '0.75rem',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '1rem',
                 animation: !isRefining ? 'pulse 2s infinite' : 'none',
                 background: isRefining ? 'rgba(99, 102, 241, 0.2)' : 'var(--primary)',
                 border: isRefining ? '1px solid var(--primary)' : 'none'
               }}
             >
               <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>
                 {isRefining ? 'sync' : 'sell'}
               </span>
               {isRefining ? `REFINING ${refineProgress}%` : `REFINE ${needsRefinementCount} BASK TAGS`}
             </button>
           )}

           <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', letterSpacing: '0.05em' }}>
              CURRENT ZONE: {certLevel} CONTEXT
           </div>
        </div>
      </div>
    </div>
  );
};

export default VaultManager;
