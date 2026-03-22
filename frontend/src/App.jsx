// --- SHRM 2026: RESTORATION BASELINE (Ver: 1.0.0) ---
import { useState, useEffect } from 'react';
import DataImporter from './components/DataImporter';
import FlashcardStudyMode from './components/FlashcardStudyMode';
import TraditionalStudyMode from './components/TraditionalStudyMode';
import QuizStudyMode from './components/QuizStudyMode';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import VaultHealthMatrix from './components/VaultHealthMatrix';
import SettingsModal from './components/SettingsModal';
import ResetModal from './components/ResetModal';
import ConfirmationModal from './components/ConfirmationModal';
import { 
  saveDeckToStorage, 
  loadDecksFromStorage, 
  deleteDeckFromStorage, 
  updateCardStatus,
  exportAppData,
  importAppData,
  mergeAppData,
  clearAiVault,
  clearSimpleVaultData,
  getDistractorFromVault,
  loadVaultFromStorage
} from './utils/storage';
import { 
  getQuizDataForDeck,
  generateDistractorsBatch
} from './utils/quizProcessor';
import './index.css';

function App() {
  const [decks, setDecks] = useState([]);
  const [isStudying, setIsStudying] = useState(false);
  const [activeStudyDeck, setActiveStudyDeck] = useState(null);
  const [isViewingAnalytics, setIsViewingAnalytics] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: 'danger', title: '', message: '', onConfirm: null });

  // Study configuration
  const [selectedDeckTitle, setSelectedDeckTitle] = useState('ALL');
  const [studyOrder, setStudyOrder] = useState('sequential');
  const [studyMode, setStudyMode] = useState('quiz');
  const [quizType, setQuizType] = useState('intelligent');
  const [certLevel, setCertLevel] = useState(() => localStorage.getItem('shrm_cert_level') || 'CP');
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  useEffect(() => {
    localStorage.setItem('shrm_cert_level', certLevel);
    // Clear sync indicators when switching levels to prevent "ghost" completion status
    setWarmUpStatus(null);
    setWarmUpProgress(0);
    setWarmUpError(null);
  }, [certLevel]);
  const [warmUpProgress, setWarmUpProgress] = useState(0);
  const [warmUpError, setWarmUpError] = useState(null);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);

  useEffect(() => {
    const savedDecks = loadDecksFromStorage();
    if (savedDecks) {
      setDecks(savedDecks);
    }
  }, []);

  const handleDeckLoaded = (loadedDeck) => {
    saveDeckToStorage(loadedDeck);
    setDecks(loadDecksFromStorage());
  };

  const handleDeleteDeck = (title) => {
    setIsSettingsOpen(false);
    const isAll = title === 'ALL';
    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: isAll ? 'CRITICAL: PURGE ALL DATA?' : 'Delete Topic?',
      message: isAll 
        ? 'Warning: This will permanently wipe ALL topics, flashcards, and study progress from this device. THIS ACTION IS IRREVERSIBLE.'
        : `Warning: This will permanently remove "${title}" and ALL associated progress from this device.`,
      confirmText: isAll ? 'PURGE EVERYTHING' : 'Delete Permanently',
      onConfirm: () => {
        if (isAll) {
          decks.forEach(d => deleteDeckFromStorage(d.title));
        } else {
          deleteDeckFromStorage(title);
        }
        setDecks(loadDecksFromStorage());
        if (isAll || selectedDeckTitle === title) setSelectedDeckTitle('ALL');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };
  
  const handleNukeAi = () => {
    setIsSettingsOpen(false);
    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Wipe AI Distractor Vault?',
      message: 'This will permanently delete all AI-generated scenarios and distractors. Study history and flashcards remain unaffected. Continue?',
      confirmText: 'Wipe Vault',
      onConfirm: () => {
        clearAiVault();
        setDecks(loadDecksFromStorage());
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleNukeSimple = () => {
    setIsSettingsOpen(false);
    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Structural Purge: Simple Recall?',
      message: 'This will wipe ONLY the Simple Recall distractors. Your Intelligent mode scenarios, behavioral tags, and history will be preserved. Continue?',
      confirmText: 'Surgical Nuke',
      onConfirm: () => {
        clearSimpleVaultData();
        setDecks(loadDecksFromStorage());
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleResetProgress = (title) => {
    setIsSettingsOpen(false);
    setResetTarget(title);
    setIsResetOpen(true);
  };

  const handlePerformReset = (modesToReset) => {
    setDecks(prevDecks => {
      const updatedDecks = prevDecks.map(d => {
        if (resetTarget === 'ALL' || d.title === resetTarget) {
          const resetCards = d.cards.map(c => {
            const updated = { ...c };
            if (modesToReset.traditional) { updated.status_traditional = 'unseen'; updated.status = 'unseen'; }
            if (modesToReset.test) { updated.status_test = 'unseen'; updated.history_test = null; }
            if (modesToReset.quiz_simple) { 
              updated[`status_quiz_simple_${certLevel}`] = 'unseen'; 
              updated[`selected_option_simple_${certLevel}`] = null; 
              updated[`history_quiz_simple_${certLevel}`] = null; 
            }
            if (modesToReset.quiz_intelligent) { 
              updated[`status_quiz_intelligent_${certLevel}`] = 'unseen'; 
              updated[`selected_option_intelligent_${certLevel}`] = null; 
              updated[`history_quiz_intelligent_${certLevel}`] = null; 
            }
            if (Object.values(modesToReset).every(v => v)) { updated.score = 0; }
            return updated;
          });
          const updatedDeck = { ...d, cards: resetCards };
          saveDeckToStorage(updatedDeck);
          return updatedDeck;
        }
        return d;
      });
      return updatedDecks;
    });
    if (resetTarget === 'ALL' || resetTarget === selectedDeckTitle) setActiveStudyDeck(null);
    setIsResetOpen(false);
    setResetTarget(null);
  };

  const [warmUpStatus, setWarmUpStatus] = useState(null);

  const handleBulkWarmUp = async () => {
    if (decks.length === 0) return;
    setWarmUpError(null);
    setWarmUpStatus("Initializing...");

    // 1. Identify Target Cards
    let targetCards = [];
    if (selectedDeckTitle === 'ALL') {
      targetCards = decks.flatMap(d => d.cards);
    } else {
      const deck = decks.find(d => d.title === selectedDeckTitle);
      if (deck) targetCards = deck.cards;
    }

    if (targetCards.length === 0) return;

    // 2. Execution Logic (Dual Mode)
    setIsWarmingUp(true);
    setWarmUpProgress(0);

    const runWarming = async () => {
      try {
        // MODE 1: Intelligent (Simulator)
        let { missingCards: missingIntel } = await getQuizDataForDeck({ cards: targetCards }, 'intelligent', certLevel);
        let { missingCards: missingSimple } = await getQuizDataForDeck({ cards: targetCards }, 'simple', certLevel);
        
        const totalToSync = missingIntel.length + missingSimple.length;
        let syncedCount = 0;
        
        const intelBatches = Math.ceil(missingIntel.length / 4);
        let currentBatch = 0;


        while (missingIntel.length > 0) {
          let rateLimited = false;
          currentBatch++;
          const batchToProcess = missingIntel.slice(0, 4); // Take 4 for optimal balancing
          setWarmUpStatus(`SJI SYNC: Batch ${currentBatch} of ${intelBatches}...`);

          const result = await generateDistractorsBatch(batchToProcess, 'intelligent', (p, error) => {
            // UI SYNC: Use functional update to ensure real-time re-renders
            const batchDone = Math.round((p / 100) * batchToProcess.length);
            const currentP = Math.round(((syncedCount + batchDone) / totalToSync) * 100);
            setWarmUpProgress(prev => currentP);
            if (error === 'RATE_LIMIT') rateLimited = true;
          }, certLevel);

          if (result && result.success === false) {
            setWarmUpError(`Sync Interrupted: ${result.error || 'Provider Timeout'}`);
            setIsWarmingUp(false);
            return;
          }

          if (rateLimited) {
            setWarmUpStatus("Gemini Overload. Shielding for 15s...");
            setWarmUpError('Gemini Busy. Self-Healing Resume in 15s...');
            await new Promise(r => setTimeout(r, 15000));
            setWarmUpError(null);
          }
          syncedCount += batchToProcess.length;
          const updated = await getQuizDataForDeck({ cards: targetCards }, 'intelligent', certLevel);
          missingIntel = updated.missingCards;
        }

        // MODE 2: Simple (Recall) - TURBO BATCHING (8 CARDS)
        const updatedSimple = await getQuizDataForDeck({ cards: targetCards }, 'simple', certLevel);
        missingSimple = updatedSimple.missingCards;
        const simpleBatches = Math.ceil(missingSimple.length / 8);
        currentBatch = 0;

        while (missingSimple.length > 0) {
          let rateLimited = false;
          currentBatch++;
          const batchToProcess = missingSimple.slice(0, 8); // Turbo batch for RPD insurance
          setWarmUpStatus(`RECALL SYNC: Batch ${currentBatch} of ${simpleBatches}...`);

          const result = await generateDistractorsBatch(batchToProcess, 'simple', (p, error) => {
            // UI SYNC: Use functional update to ensure real-time re-renders
            const batchDone = Math.round((p / 100) * batchToProcess.length);
            const currentP = Math.round(((syncedCount + batchDone) / totalToSync) * 100);
            setWarmUpProgress(prev => currentP);
            if (error === 'RATE_LIMIT') rateLimited = true;
          }, certLevel);

          if (result && result.success === false) {
            setWarmUpError(`Sync Interrupted: Provider Timeout (Transient)`);
            setIsWarmingUp(false);
            return;
          }

          if (rateLimited) {
            setWarmUpStatus("API Rate Limit. Cooling down 15s...");
            setWarmUpError('Rate Limited. Self-Healing Resume in 15s...');
            await new Promise(r => setTimeout(r, 15000));
            setWarmUpError(null);
          }
          syncedCount += batchToProcess.length;
          const updated = await getQuizDataForDeck({ cards: targetCards }, 'simple', certLevel);
          missingSimple = updated.missingCards;
        }

        setWarmUpStatus("COMPLETED: All Data Synced.");
        setWarmUpProgress(100);
        setTimeout(() => setIsWarmingUp(false), 2000);
      } catch (err) {
        console.error("Bulk Generation Error:", err);
        setWarmUpError("Connection Interrupted. Please Resume.");
        setTimeout(() => setIsWarmingUp(false), 3000);
      }
    };

    runWarming();
  };

  const handleStartStudying = () => {
    if (decks.length === 0) return;
    let cardsToStudy = [];
    let studyTitle = "All Topics";
    let totalOriginalCards = 0;

    if (selectedDeckTitle === 'ALL') {
      decks.forEach(d => {
        cardsToStudy = [...cardsToStudy, ...d.cards];
        totalOriginalCards += d.cards.length;
      });
    } else {
      const specificDeck = decks.find(d => d.title === selectedDeckTitle);
      if (specificDeck) {
        cardsToStudy = [...specificDeck.cards];
        studyTitle = specificDeck.title;
        totalOriginalCards = specificDeck.cards.length;
      }
    }

    const getStatus = (c) => {
      if (studyMode === 'traditional') return c.status_traditional || c.status || 'unseen';
      if (studyMode === 'quiz') return c[`status_quiz_${quizType}_${certLevel}`] || 'unseen'; 
      return c.status || 'unseen';
    };

    const seenCards = cardsToStudy.filter(c => getStatus(c) !== 'unseen');
    let unseenCards = cardsToStudy.filter(c => getStatus(c) === 'unseen');
    let finalDeckCards = (cardsToStudy.length > 0 && unseenCards.length === 0) ? [...cardsToStudy] : [...seenCards, ...unseenCards];
    let initialIndex = (cardsToStudy.length > 0 && unseenCards.length === 0) ? 0 : seenCards.length;

    if (studyOrder === 'random') {
      for (let i = finalDeckCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalDeckCards[i], finalDeckCards[j]] = [finalDeckCards[j], finalDeckCards[i]];
      }
    }

    setActiveStudyDeck({ title: studyTitle, cards: finalDeckCards, totalOriginalCards, initialIndex, quizType, certLevel });
    setIsStudying(true);
  };

  const handleUpdateCardStatus = (cardId, status, historyData = {}) => {
    updateCardStatus(cardId, studyMode, status, { ...historyData, quizType: historyData.quizType || quizType, certLevel });
    setDecks(loadDecksFromStorage());
  };

  if (isStudying && activeStudyDeck) {
    return (
      <div className="app-container animate-fade-in" style={{ paddingTop: '2rem' }}>
        {studyMode === 'traditional' ? (
          <TraditionalStudyMode deck={activeStudyDeck} onBack={() => setIsStudying(false)} onUpdateCardStatus={handleUpdateCardStatus} />
        ) : (
          <QuizStudyMode deck={activeStudyDeck} onBack={() => setIsStudying(false)} onUpdateCardStatus={handleUpdateCardStatus} />
        )}
      </div>
    );
  }

  if (isViewingAnalytics) {
    return (
      <div className="app-container animate-fade-in" style={{ paddingTop: '2rem' }}>
        <AnalyticsDashboard decks={decks} initialMode={quizType} certLevel={certLevel} onBack={() => setIsViewingAnalytics(false)} />
      </div>
    );
  }

  const totalCards = decks.reduce((sum, deck) => sum + deck.cards.length, 0);

  return (
    <div className="app-container animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }} className="text-gradient">SHRM 2026</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {decks.length > 0 && (
            <button onClick={() => setIsViewingAnalytics(true)} className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: '#60a5fa' }}>analytics</span>
              Insights
            </button>
          )}
          <button onClick={() => setIsSettingsOpen(true)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.8rem' }}>settings</span>
          </button>
        </div>
      </header>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} onExport={exportAppData} onImport={async (e) => { await importAppData(e.target.files[0]); setDecks(loadDecksFromStorage()); }} onMerge={async (e) => { await mergeAppData(e.target.files[0]); setDecks(loadDecksFromStorage()); }} onNukeAi={handleNukeAi} onNukeSimple={handleNukeSimple} onDeleteDeck={handleDeleteDeck} onResetProgress={handleResetProgress} decks={decks} />}
      {isResetOpen && <ResetModal isOpen={isResetOpen} targetTitle={resetTarget} currentMode={studyMode} quizType={quizType} onClose={() => setIsResetOpen(false)} onConfirm={handlePerformReset} />}
      <ConfirmationModal isOpen={confirmModal.isOpen} type={confirmModal.type} title={confirmModal.title} message={confirmModal.message} confirmText={confirmModal.confirmText} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmModal.onConfirm} />

      <main>
        <DataImporter onDeckLoaded={handleDeckLoaded} />
        {decks.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '2rem' }}>
            <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Select Topic</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', paddingRight: '0.5rem', marginBottom: '0.5rem' }}>
                <div onClick={() => setSelectedDeckTitle('ALL')} className={`glass-panel topic-card ${selectedDeckTitle === 'ALL' ? 'active' : ''}`} style={{ padding: '1.5rem', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <h3 style={{ margin: 0 }}>All Study Material</h3>
                        {(() => {
                           const vault = loadVaultFromStorage();
                           const allCards = decks.flatMap(d => d.cards);
                           const isAllReady = allCards.length > 0 && allCards.every(c => {
                             const dataI = vault[`${c.id}:intelligent:${certLevel}`];
                             const dataS = vault[`${c.id}:simple:${certLevel}`];
                             return (dataI?.scenario && dataI.rationale) && (dataS?.distractors?.length > 0);
                           });
                           if (isAllReady) {
                             return (
                               <div id="badge-all-ready" style={{ fontSize: '0.6rem', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{certLevel} READY</div>
                             );
                           }
                           return null;
                        })()}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        Comprehensive review of {totalCards} cards across all topics.
                      </div>
                      {warmUpStatus && !decks.flatMap(d => d.cards).every(c => {
                        const v = loadVaultFromStorage();
                        return v[`${c.id}:intelligent:${certLevel}`] && v[`${c.id}:simple:${certLevel}`];
                      }) && (
                        <div style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '1rem', fontFamily: 'monospace' }}>
                          {warmUpStatus}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      {selectedDeckTitle === 'ALL' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleResetProgress('ALL'); }}
                            style={{ background: 'transparent', border: 'none', padding: 0, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                            title="Reset Progress"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>restart_alt</span>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteDeck('ALL'); }}
                            style={{ background: 'transparent', border: 'none', padding: 0, color: 'rgba(239, 68, 68, 0.4)', cursor: 'pointer' }}
                            title="Nuke All Topics"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>delete</span>
                          </button>
                        </div>
                      )}
                      <span className="material-symbols-outlined" style={{ color: selectedDeckTitle === 'ALL' ? 'var(--secondary)' : 'rgba(255,255,255,0.1)' }}>
                        {selectedDeckTitle === 'ALL' ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </div>
                  </div>
                </div>
                {decks.map(deck => {
                  const getStatus = (c) => {
                    if (studyMode === 'traditional') return c.status_traditional || c.status || 'unseen';
                    if (studyMode === 'quiz') return c[`status_quiz_${quizType}_${certLevel}`] || 'unseen';
                    return 'unseen';
                  };
                  const masteredCount = deck.cards.filter(c => getStatus(c) !== 'unseen').length;
                  const percent = Math.round((masteredCount / deck.cards.length) * 100);
                  const vault = loadVaultFromStorage();
                  const isDeckReady = deck.cards.every(c => {
                    const dataI = vault[`${c.id}:intelligent:${certLevel}`];
                    const dataS = vault[`${c.id}:simple:${certLevel}`];
                    return (dataI?.scenario && dataI.rationale) && (dataS?.distractors?.length > 0);
                  });
                  return (
                    <div key={deck.title} onClick={() => setSelectedDeckTitle(deck.title)} className={`glass-panel topic-card ${selectedDeckTitle === deck.title ? 'active' : ''}`} style={{ padding: '1.2rem', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <h3 style={{ margin: 0 }}>{deck.title}</h3>
                            {isDeckReady && (
                              <div style={{ fontSize: '0.6rem', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{certLevel} READY</div>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{deck.cards.length} Flashcards</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          {selectedDeckTitle === deck.title && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleResetProgress(deck.title); }}
                                style={{ background: 'transparent', border: 'none', padding: 0, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                                title="Reset Progress"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>restart_alt</span>
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteDeck(deck.title); }}
                                style={{ background: 'transparent', border: 'none', padding: 0, color: 'rgba(239, 68, 68, 0.4)', cursor: 'pointer' }}
                                title="Delete Topic"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>delete</span>
                              </button>
                            </div>
                          )}
                          <span className="material-symbols-outlined" style={{ color: selectedDeckTitle === deck.title ? 'var(--secondary)' : 'rgba(255,255,255,0.1)' }}>
                            {selectedDeckTitle === deck.title ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                        </div>
                      </div>
                      <div style={{ marginTop: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                          <span>{masteredCount} mastered</span>
                          <span>{percent}%</span>
                        </div>
                        {warmUpStatus && !isDeckReady && (
                          <>
                            <div style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '1.2rem', fontFamily: 'monospace' }}>
                              {warmUpStatus}
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                              <div style={{ width: `${percent}%`, height: '100%', background: '#fbbf24' }} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                <label htmlFor="md-upload-main" style={{ cursor: 'pointer', display: 'block' }}>
                  <div className="glass-panel topic-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.1)', height: '140px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.2)' }}>add_circle</span>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>Add New Topic</span>
                  </div>
                </label>
              </div>
            </div>

              {/* Maintenance Row (The buttons that were moved today) */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  onClick={handleBulkWarmUp} 
                  disabled={isWarmingUp} 
                  className="glass-panel" 
                  style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', color: (isWarmingUp || warmUpError) ? '#fbbf24' : '#60a5fa', border: `1px solid ${(isWarmingUp || warmUpError) ? 'rgba(251,191,36,0.3)' : 'rgba(96, 165, 250, 0.2)'}` }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.4rem' }}>{isWarmingUp ? 'sync' : (warmUpError ? 'replay' : 'bolt')}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>
                      {isWarmingUp ? `Syncing ${warmUpProgress}%` : (warmUpError ? 'Resume Sync' : 'Bulk Warm-Up')}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>{warmUpStatus || `Populate ${selectedDeckTitle === 'ALL' ? 'Full Vault' : 'Topic Gap'}`}</div>
                  </div>
                </button>

                {(() => {
                  const vault = loadVaultFromStorage();
                  const allCards = decks.flatMap(d => d.cards);
                  const isAllReady = allCards.length > 0 && allCards.every(c => {
                    const dataI = vault[`${c.id}:intelligent:${certLevel}`];
                    const dataS = vault[`${c.id}:simple:${certLevel}`];
                    return (dataI?.scenario && dataI.rationale) && (dataS?.distractors?.length > 0);
                  });
                  
                  return (
                    <button 
                      onClick={() => setIsMatrixOpen(!isMatrixOpen)} 
                      className={`glass-panel ${isMatrixOpen ? 'active' : ''}`}
                      style={{ 
                        flex: 1, 
                        padding: '1rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '0.8rem', 
                        color: isAllReady ? '#60a5fa' : '#fbbf24', 
                        border: `1px solid ${isAllReady ? 'rgba(96, 165, 250, 0.2)' : 'rgba(251, 191, 36, 0.2)'}` 
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.4rem' }}>{isMatrixOpen ? 'visibility_off' : (isAllReady ? 'verified_user' : 'report_problem')}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 'bold' }}>{isMatrixOpen ? 'Hide Matrix' : 'Vault Health'}</div>
                        <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Audit Readiness Data</div>
                      </div>
                    </button>
                  );
                })()}
              </div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ margin: 0, color: 'var(--secondary)' }}>Study Configuration</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SHRM 2026 BASK Standards</label>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '-0.3rem' }}>Certification Level</label>
                  <select value={certLevel} onChange={(e) => setCertLevel(e.target.value)} className="glass-select">
                    <option value="CP">SHRM-CP (Operational Implementation)</option>
                    <option value="SCP">SHRM-SCP (Senior Strategic Governance)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '-0.3rem' }}>Study Mode</label>
                  <select value={studyMode} onChange={(e) => setStudyMode(e.target.value)} className="glass-select">
                    <option value="quiz">Multiple Choice Quiz</option>
                    <option value="traditional">Traditional Study</option>
                  </select>
                </div>

                {studyMode === 'quiz' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '-0.3rem' }}>Quiz Strategy</label>
                    <select value={quizType} onChange={(e) => setQuizType(e.target.value)} className="glass-select">
                      <option value="intelligent">Intelligent (SJI Simulator)</option>
                      <option value="simple">Simple (Recall)</option>
                    </select>
                  </div>
                )}
                
                <button onClick={handleStartStudying} style={{ width: '100%', padding: '1rem', fontWeight: 'bold', marginTop: '1rem' }} className="btn-primary" disabled={isWarmingUp}>Start Studying</button>
                {warmUpError && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>warning</span>
                      {warmUpError}
                    </div>
                    <button 
                      onClick={handleBulkWarmUp}
                      style={{ width: '100%', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Resume Block Now
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>upload_file</span>
            <h2 style={{ marginBottom: '1rem' }}>No Study Material Found</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Please import your study material to begin.</p>
            <label htmlFor="md-upload-main" className="btn-primary" style={{ cursor: 'pointer', padding: '1rem 2rem', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.8rem' }}>
              <span className="material-symbols-outlined">add_circle</span>
              Add Your First Topic
            </label>
          </div>
        )}
        {decks.length > 0 && isMatrixOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(11, 15, 25, 0.9)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '1100px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button 
                onClick={() => setIsMatrixOpen(false)} 
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 100, transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.4)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.2)'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.8rem' }}>close</span>
              </button>
              <VaultHealthMatrix decks={decks} onSmartSync={handleBulkWarmUp} isSyncing={isWarmingUp} syncProgress={warmUpProgress} syncStatus={warmUpStatus} certLevel={certLevel} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
