import { useState, useEffect, useMemo, useRef } from 'react';
import DataImporter from './components/DataImporter';
import VaultManager from './components/VaultManager';
import DomainGrid from './components/DomainGrid';
import SmartTestOverlay from './components/SmartTestOverlay';
import FlashcardStudyMode from './components/FlashcardStudyMode';
import TraditionalStudyMode from './components/TraditionalStudyMode';
import QuizStudyMode from './components/QuizStudyMode';
import AudioStudyMode from './components/AudioStudyMode';
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
  loadVaultFromStorage,
  getVaultStats,
  saveDomainSnapshot,
  resetDomainProgress
} from './utils/storage';
import { 
  getQuizDataByFilter,
  getQuizDataForDeck,
  generateDistractorsBatch,
  refineMetadataBatch
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
  const [isAudioMode, setIsAudioMode] = useState(false);

  // Study configuration
  const [selectedDeckTitle, setSelectedDeckTitle] = useState('ALL');
  const [studyOrder, setStudyOrder] = useState('sequential');
  const [studyMode, setStudyMode] = useState('quiz');
  const [quizType, setQuizType] = useState('intelligent');
  const [certLevel, setCertLevel] = useState(() => localStorage.getItem('shrm_cert_level') || 'CP');
  const [testLength, setTestLength] = useState(25);
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  // Selection & Launch States
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [isTestOverlayOpen, setIsTestOverlayOpen] = useState(false);

  // CORE PERFORMANCE OPTIMIZATION: Memoize the heavy vault JSON parse
  const vaultStats = useMemo(() => {
    return decks.length > 0 ? getVaultStats(certLevel, decks) : {};
  }, [certLevel, decks]);

  useEffect(() => {
    localStorage.setItem('shrm_cert_level', certLevel);
    setWarmUpStatus(null);
    setWarmUpProgress(0);
    setWarmUpError(null);
  }, [certLevel]);

  const [warmUpProgress, setWarmUpProgress] = useState(0);
  const [warmUpError, setWarmUpError] = useState(null);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refineProgress, setRefineProgress] = useState(0);
  const [isVaultManagerOpen, setIsVaultManagerOpen] = useState(false);

  useEffect(() => {
    const savedDecks = loadDecksFromStorage();
    if (savedDecks) { setDecks(savedDecks); }
  }, []);

  const handleDeckLoaded = (loadedDeck) => {
    saveDeckToStorage(loadedDeck);
    setDecks(loadDecksFromStorage());
  };

  const handleDeleteDeck = (title) => {
    setIsSettingsOpen(false);
    setIsVaultManagerOpen(false);
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
        if (isAll) { decks.forEach(d => deleteDeckFromStorage(d.title)); } 
        else { deleteDeckFromStorage(title); }
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
    setIsVaultManagerOpen(false);
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

  const handleResetDomain = (domainId, currentPercentage) => {
    setConfirmModal({
      isOpen: true,
      type: 'warning',
      title: 'Reset Domain Session?',
      message: `Resetting "${domainId}" will clear your current 'unseen' markers. Lifetime stats are preserved and a snapshot has been added to your Pulse trend. Proceed?`,
      confirmText: 'Snapshot & Reset',
      onConfirm: () => {
        saveDomainSnapshot(domainId, quizType, certLevel, currentPercentage);
        resetDomainProgress(domainId, quizType, certLevel);
        setDecks(loadDecksFromStorage());
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSelectDomain = (domainId) => {
    setSelectedDomain(prev => prev === domainId ? 'ALL' : domainId);
  };

  const handleStartTestFromSidebar = (isWeighted = false) => {
    const effectiveLength = studyMode === 'traditional' ? -1 : testLength;
    handleStartTestDirectly({ 
      domainId: selectedDomain, 
      testLength: isWeighted ? 134 : effectiveLength, 
      testType: quizType, 
      certLevel,
      isWeighted
    });
  };

  const handleStartTestDirectly = async (config) => {
    const { domainId, testLength: lengthReq, testType, certLevel: level, isWeighted, isAudio } = config;
    setIsTestOverlayOpen(false);
    setIsAudioMode(isAudio || false);
    
    // Engine Logic: Use the new Domain-First filter
    const activeSessionKey = isAudio ? 
        `shrm_audio_session_${domainId}_${testType}_${level}` : 
        `shrm_active_session_${studyMode}_${domainId}_${testType}_${level}`;
    
    const statusKey = isAudio ? 'status_audio_seen' : (studyMode === 'traditional' ? 'status_traditional' : `status_quiz_${testType}_${level}`);

    if (!isWeighted) {
        const savedSessionStr = localStorage.getItem(activeSessionKey);
        if (savedSessionStr) {
            const savedSession = JSON.parse(savedSessionStr);

            if (savedSession.requestedLength === lengthReq) {
                // LEAD FIX: Universal Hydration - Rebuild full card objects from IDs (INCLUDING AI DATA & STATUS)
                const vault = loadVaultFromStorage();
                const refreshedCards = (savedSession.cards || savedSession.cardIds || []).map(savedCard => {
                   let fullCard = null;
                   for (const d of decks) {
                      const found = d.cards.find(sc => String(sc.id) === String(savedCard.id));
                      if (found) {
                          const cleanId = String(found.id).replace(/[\s\n\r]/g, '');
                          const vData = isAudio
                            ? (vault[`${cleanId}:intelligent:${level}`] || {})
                            : (testType === 'simple' ? (vault[`${cleanId}:simple:${level}`] || {}) : (vault[`${cleanId}:${testType}:${level}`] || {}));
                          
                          // Ensure status is carried over
                          fullCard = { 
                            ...found, 
                            aiData: vData, 
                            domain: d.title,
                            status_audio_seen: found.status_audio_seen 
                          };
                          break;
                      }
                   }
                   return fullCard || savedCard;
                });


                
                if (isAudio) {
                    console.log('[AUDIO DEBUG] Session key:', activeSessionKey);
                    console.log('[AUDIO DEBUG] savedSession.cards:', savedSession.cards?.length, '| savedSession.cardIds:', savedSession.cardIds?.length, '| savedSession.initialIndex:', savedSession.initialIndex);
                    console.log('[AUDIO DEBUG] refreshedCards count:', refreshedCards.length);
                    if (refreshedCards.length > 0) {
                        // Resume at first unplayed card
                        const firstUnseenIdx = refreshedCards.findIndex(c => !c.status_audio_seen || c.status_audio_seen !== 'seen');
                        const resumeIndex = firstUnseenIdx !== -1 ? firstUnseenIdx : 0;
                        console.log('[AUDIO DEBUG] Resuming at index:', resumeIndex);
                        setActiveStudyDeck({ 
                          ...savedSession,
                          cards: refreshedCards,
                          initialIndex: resumeIndex,
                          sessionKey: activeSessionKey
                        });
                        setIsStudying(true);
                        return;
                    } else {
                        // Stale session — no card ID list recoverable. Clear and do fresh launch.
                        console.log('[AUDIO DEBUG] Stale session detected — clearing and doing fresh launch');
                        localStorage.removeItem(activeSessionKey);
                    }
                }

                const firstUnseenIdx = refreshedCards.findIndex(c => !c[statusKey] || c[statusKey] === 'unseen');
                
                if (firstUnseenIdx !== -1) {
                    setActiveStudyDeck({ 
                      ...savedSession,
                      cards: refreshedCards,
                      initialIndex: firstUnseenIdx,
                      sessionKey: activeSessionKey
                    });
                    setIsStudying(true);
                    return;
                } else {
                    localStorage.removeItem(activeSessionKey);
                }
            }
        }
    }

    // Fresh launch — no saved session or session expired
    if (isAudio) console.log('[AUDIO DEBUG] No session found or expired — fresh launch. Key:', activeSessionKey);
    const effectiveLength = lengthReq === -1 ? 9999 : lengthReq;
    const filter = { domainId, length: effectiveLength, isWeighted };
    const data = await getQuizDataByFilter(decks, filter, testType, level, (isAudio ? 'audio' : studyMode));
    if (isAudio) console.log('[AUDIO DEBUG] getQuizDataByFilter returned:', data.cards.length, 'cards');
    
    if (data.cards.length === 0) {
      setConfirmModal({
        isOpen: true,
        type: 'warning',
        title: 'Empty Simulation Zone',
        message: `No synced ${testType === 'intelligent' ? 'Situational SJI' : 'Definitions'} found for "${domainId}" at the ${level} path. Please run the SYNC in Topics Maintenance.`,
        confirmText: 'Understood',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // PROGRESS RECOVERY: Find the index of the FIRST card that hasn't been completed in this mode
    const firstUnplayedIdx = data.cards.findIndex(c => {
      if (isAudio) return !c.status_audio_seen || c.status_audio_seen !== 'seen';
      return !c[statusKey] || (c[statusKey] !== 'seen' && c[statusKey] !== 'mastered');
    });
    const initialIndex = firstUnplayedIdx === -1 ? 0 : firstUnplayedIdx;

    // QUOTA PROTECTION: Stripping payload for Audio persistence
    const storageOptimizedCards = isAudio ? 
        data.cards.map(c => ({ id: c.id })) : 
        data.cards;

    const activeDeckToSave = { 
      title: domainId === 'ALL' ? '' : `Domain: ${domainId}`, 
      cards: storageOptimizedCards, 
      totalOriginalCards: data.totalAvailable, 
      initialIndex: initialIndex, 
      quizType: testType, 
      certLevel: level,
      isUnderStrength: data.isUnderStrength,
      requestedLength: lengthReq,
      sessionKey: !isWeighted ? activeSessionKey : null
    };

    if (!isWeighted) {
        localStorage.setItem(activeSessionKey, JSON.stringify(activeDeckToSave));
    }
    
    // LEAD FIX: For fresh launches, also perform the FULL AI DATA weld
    const vault = loadVaultFromStorage();
    const hydratedCards = data.cards.map(c => {
       const parentDeck = decks.find(d => d.cards.some(dc => dc.id === c.id));
       const cleanId = String(c.id).replace(/[\s\n\r]/g, '');
       
       // Audio uses intelligent vault exclusively — single source for scenario+tags
       const vData = isAudio
         ? (vault[`${cleanId}:intelligent:${level}`] || {})
         : (testType === 'simple' ? (vault[`${cleanId}:simple:${level}`] || {}) : (vault[`${cleanId}:${testType}:${level}`] || {}));
       
       return { 
         ...c, 
         aiData: vData, 
         domain: parentDeck ? parentDeck.title : (domainId === 'ALL' ? '' : domainId), 
         status_audio_seen: c.status_audio_seen 
       };
    });

    setActiveStudyDeck({ ...activeDeckToSave, cards: hydratedCards });

    setIsStudying(true);
  };

  const [warmUpStatus, setWarmUpStatus] = useState(null);

  const handleBulkWarmUp = async () => {
    if (decks.length === 0) return;
    setWarmUpError(null);
    setWarmUpStatus("Initializing...");

    let targetCards = [];
    if (selectedDeckTitle === 'ALL') { targetCards = decks.flatMap(d => d.cards); } 
    else {
      const deck = decks.find(d => d.title === selectedDeckTitle);
      if (deck) targetCards = deck.cards;
    }

    if (targetCards.length === 0) return;
    setIsWarmingUp(true);
    setWarmUpProgress(0);

    const runWarming = async () => {
      try {
        let { missingCards: missingIntel } = await getQuizDataForDeck({ cards: targetCards }, 'intelligent', certLevel);
        let { missingCards: missingSimple } = await getQuizDataForDeck({ cards: targetCards }, 'simple', certLevel);
        const totalToSync = missingIntel.length + missingSimple.length;
        let syncedCount = 0;
        let currentBatch = 0;

        while (missingIntel.length > 0) {
          let rateLimited = false;
          currentBatch++;
          const batchToProcess = missingIntel.slice(0, 4);
          setWarmUpStatus(`SJI SYNC: Batch ${currentBatch}...`);

          const result = await generateDistractorsBatch(batchToProcess, 'intelligent', (p, error) => {
            const batchDone = Math.round((p / 100) * batchToProcess.length);
            const currentP = Math.round(((syncedCount + batchDone) / totalToSync) * 100);
            setWarmUpProgress(prev => currentP);
            if (error === 'RATE_LIMIT') rateLimited = true;
          }, certLevel);

          if (result && result.success === false) { setIsWarmingUp(false); return; }
          if (rateLimited) { await new Promise(r => setTimeout(r, 15000)); }
          syncedCount += batchToProcess.length;
          const updated = await getQuizDataForDeck({ cards: targetCards }, 'intelligent', certLevel);
          missingIntel = updated.missingCards;
        }

        const updatedSimple = await getQuizDataForDeck({ cards: targetCards }, 'simple', certLevel);
        missingSimple = updatedSimple.missingCards;
        currentBatch = 0;

        while (missingSimple.length > 0) {
          let rateLimited = false;
          currentBatch++;
          const batchToProcess = missingSimple.slice(0, 8); 
          setWarmUpStatus(`RECALL SYNC: Batch ${currentBatch}...`);
          const result = await generateDistractorsBatch(batchToProcess, 'simple', (p, error) => {
            const batchDone = Math.round((p / 100) * batchToProcess.length);
            const currentP = Math.round(((syncedCount + batchDone) / totalToSync) * 100);
            setWarmUpProgress(prev => currentP);
            if (error === 'RATE_LIMIT') rateLimited = true;
          }, certLevel);

          if (result && result.success === false) { setIsWarmingUp(false); return; }
          if (rateLimited) { await new Promise(r => setTimeout(r, 15000)); }
          syncedCount += batchToProcess.length;
          const updated = await getQuizDataForDeck({ cards: targetCards }, 'simple', certLevel);
          missingSimple = updated.missingCards;
        }

        setWarmUpStatus("COMPLETED: All Data Synced.");
        setWarmUpProgress(100);
        setTimeout(() => setIsWarmingUp(false), 2000);
      } catch (err) { setIsWarmingUp(false); }
    };
    runWarming();
  };

  const handleRefineMetadata = async () => {
    if (decks.length === 0) return;
    setIsRefining(true); setRefineProgress(0);
    const vault = loadVaultFromStorage();
    let cardsToRefine = [];
    decks.forEach(deck => {
      deck.cards.forEach(card => {
        const cleanId = String(card.id).replace(/[\s\n\r]/g, '');
        const sData = vault[`${cleanId}:simple:${certLevel}`];
        if (sData?.distractors && !sData?.tag_bask) { cardsToRefine.push({ ...card, topic: deck.title }); }
      });
    });
    if (cardsToRefine.length === 0) { setIsRefining(false); return; }
    const total = cardsToRefine.length;
    let completed = 0;
    for (let i = 0; i < cardsToRefine.length; i += 8) {
      const batch = cardsToRefine.slice(i, i + 8);
      const result = await refineMetadataBatch(batch, certLevel);
      if (result.success) {
        completed += result.count;
        setRefineProgress(Math.round((completed / total) * 100));
        setDecks(loadDecksFromStorage());
      } else { break; }
      if (i + 8 < cardsToRefine.length) { await new Promise(r => setTimeout(r, 6000)); }
    }
    setIsRefining(false); setDecks(loadDecksFromStorage());
  };

  const handleUpdateCardStatus = (cardId, status, historyData = {}) => {
    updateCardStatus(cardId, (isAudioMode ? 'audio' : studyMode), status, { 
      ...historyData, 
      quizType: historyData?.quizType || quizType, 
      certLevel 
    });
    const freshDecks = loadDecksFromStorage();
    setDecks(freshDecks);
    
    if (activeStudyDeck) {
      const updatedCards = activeStudyDeck.cards.map(c => {
        if (c.id === cardId) {
          if (isAudioMode) {
            const newAudioStatus = status === 'audio_seen' ? 'seen' : status === 'audio_reset' ? null : c.status_audio_seen;
            return { ...c, status_audio_seen: newAudioStatus };
          }
          if (studyMode === 'traditional') return { ...c, status_traditional: status };
          const quizKey = `status_quiz_${historyData.quizType || quizType}_${certLevel}`;
          const optionKey = `selected_option_${historyData.quizType || quizType}_${certLevel}`;
          return { ...c, [quizKey]: status, [optionKey]: historyData.selectedOption };
        }
        return c;
      });
      setActiveStudyDeck(prev => {
          const newDeck = { ...prev, cards: updatedCards };
          if (newDeck.sessionKey) {
              if (isAudioMode) {
                  const { cards, ...deanonymizedDeck } = newDeck;
                  deanonymizedDeck.cardIds = cards.map(c => ({ id: c.id }));
                  // Preserve position managed by AudioStudyMode — do not overwrite with stale initialIndex
                  try {
                      const currentSession = JSON.parse(localStorage.getItem(newDeck.sessionKey) || 'null');
                      if (currentSession?.initialIndex !== undefined) {
                          deanonymizedDeck.initialIndex = currentSession.initialIndex;
                      }
                  } catch(e) {}
                  localStorage.setItem(newDeck.sessionKey, JSON.stringify(deanonymizedDeck));
              } else {
                 localStorage.setItem(newDeck.sessionKey, JSON.stringify(newDeck));
              }
          }
          return newDeck;
      });
    }
  };

  const handleExitStudy = (isFinished = false) => {
    if (activeStudyDeck && activeStudyDeck.sessionKey && isFinished === true) {
       localStorage.removeItem(activeStudyDeck.sessionKey);
    }
    setIsStudying(false);
    setActiveStudyDeck(null);
    setIsAudioMode(false);
  };

  if (isStudying && activeStudyDeck) {
    if (isAudioMode) {
      return (
        <div className="app-container animate-fade-in">
          <AudioStudyMode 
            deck={activeStudyDeck} 
            onExit={() => handleExitStudy(false)}
            certLevel={certLevel}
            updateCardStatus={handleUpdateCardStatus}
          />
        </div>
      );
    }
    return (
      <div className="app-container animate-fade-in" style={{ paddingTop: '2rem' }}>
        {studyMode === 'traditional' ? (
          <TraditionalStudyMode deck={activeStudyDeck} onBack={handleExitStudy} onUpdateCardStatus={handleUpdateCardStatus} />
        ) : (
          <QuizStudyMode deck={activeStudyDeck} onBack={handleExitStudy} onUpdateCardStatus={handleUpdateCardStatus} />
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

  return (
    <div className="app-container animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }} className="text-gradient">SHRM 2026 Study Hub</h1>
          {decks.length > 0 && (
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', marginLeft: '1rem' }}>
              {(() => {
                const stats = vaultStats[selectedDomain] || { intelligent: 0, simple: 0 };
                const count = quizType === 'intelligent' ? stats.intelligent : stats.simple;
                return (
                  <div key="status" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: count > 0 ? '#10b981' : '#f59e0b', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: count > 0 ? '#10b981' : '#f59e0b', boxShadow: count > 0 ? '0 0 10px #10b981' : '0 0 10px #f59e0b' }}></span>
                    {count > 0 ? 'Ready to Test' : 'Sync Needed'}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {decks.length > 0 && (
            <button onClick={() => setIsViewingAnalytics(true)} className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'white' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: '#60a5fa' }}>analytics</span> Insights
            </button>
          )}
          <button onClick={() => setIsSettingsOpen(true)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.8rem' }}>settings</span>
          </button>
        </div>
      </header>
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} onExport={exportAppData} onImport={async (e) => { await importAppData(e.target.files[0]); setDecks(loadDecksFromStorage()); }} onMerge={async (e) => { await mergeAppData(e.target.files[0]); setDecks(loadDecksFromStorage()); }} onNukeAi={handleNukeAi} onNukeSimple={handleNukeSimple} onDeleteDeck={handleDeleteDeck} onResetProgress={handleResetProgress} decks={decks} onOpenVault={() => { setIsSettingsOpen(false); setIsVaultManagerOpen(true); }} onOpenMatrix={() => { setIsSettingsOpen(false); setIsMatrixOpen(true); }} />}
      {isVaultManagerOpen && <VaultManager decks={decks} onDeckLoaded={handleDeckLoaded} onDeleteDeck={handleDeleteDeck} onResetProgress={handleResetProgress} onResetAllProgress={() => handleResetProgress('ALL')} onDeleteAllDecks={() => handleDeleteDeck('ALL')} certLevel={certLevel} isWarmingUp={isWarmingUp} warmUpProgress={warmUpProgress} onRefineMetadata={handleRefineMetadata} isRefining={isRefining} refineProgress={refineProgress} isOpen={isVaultManagerOpen} setIsOpen={setIsVaultManagerOpen} />}
      {isResetOpen && <ResetModal isOpen={isResetOpen} targetTitle={resetTarget} currentMode={studyMode} quizType={quizType} onClose={() => setIsResetOpen(false)} onConfirm={handlePerformReset} />}
      <ConfirmationModal isOpen={confirmModal.isOpen} type={confirmModal.type} title={confirmModal.title} message={confirmModal.message} confirmText={confirmModal.confirmText} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmModal.onConfirm} />
      <main style={{ padding: '0.5rem 0 5rem 0' }}>
        {decks.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '2.5rem', alignItems: 'flex-start' }}>
            <section>
              <DomainGrid decks={decks} certLevel={certLevel} onSelectDomain={handleSelectDomain} studyMode={studyMode} quizType={quizType} selectedDomain={selectedDomain} onResetDomain={handleResetDomain} />
            </section>
            <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>BASK Controls</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Certification Level</label>
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '3px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {['CP', 'SCP'].map(level => (
                      <button key={level} onClick={() => setCertLevel(level)} style={{ flex: 1, padding: '0.5rem', borderRadius: '18px', fontSize: '0.75rem', fontWeight: 'bold', background: certLevel === level ? 'rgba(99, 102, 241, 0.15)' : 'transparent', border: certLevel === level ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent', color: certLevel === level ? 'white' : 'rgba(255,255,255,0.4)' }}>SHRM-{level}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Study Mode</label>
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '3px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <button onClick={() => setStudyMode('traditional')} style={{ flex: 1, padding: '0.5rem', borderRadius: '18px', fontSize: '0.75rem', fontWeight: 'bold', background: studyMode === 'traditional' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', border: studyMode === 'traditional' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent', color: studyMode === 'traditional' ? 'white' : 'rgba(255,255,255,0.4)' }}>FLASHCARDS</button>
                    <button onClick={() => setStudyMode('quiz')} style={{ flex: 1, padding: '0.5rem', borderRadius: '18px', fontSize: '0.75rem', fontWeight: 'bold', background: studyMode === 'quiz' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', border: studyMode === 'quiz' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent', color: studyMode === 'quiz' ? 'white' : 'rgba(255,255,255,0.4)' }}>INTERACTIVE QUIZ</button>
                  </div>
                </div>

                {studyMode === 'quiz' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quiz Type</label>
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '3px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <button onClick={() => setQuizType('intelligent')} style={{ flex: 1, padding: '0.5rem', borderRadius: '18px', fontSize: '0.75rem', fontWeight: 'bold', background: quizType === 'intelligent' ? 'rgba(99, 102, 241, 0.12)' : 'transparent', border: quizType === 'intelligent' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent', color: 'white' }}>SITUATIONAL (SJI)</button>
                            <button onClick={() => setQuizType('simple')} style={{ flex: 1, padding: '0.5rem', borderRadius: '18px', fontSize: '0.75rem', fontWeight: 'bold', background: quizType === 'simple' ? 'rgba(99, 102, 241, 0.12)' : 'transparent', border: quizType === 'simple' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent', color: 'white' }}>RECALL (DEFINITION)</button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test Question Size</label>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#10b981' }}>{testLength === -1 ? (vaultStats[selectedDomain]?.total || 0) : testLength} Cards</span>
                        </div>
                        <input type="range" min="5" max={vaultStats[selectedDomain]?.total || 25} step="5" value={testLength === -1 ? (vaultStats[selectedDomain]?.total || 25) : testLength} onChange={(e) => setTestLength(parseInt(e.target.value))} className="custom-slider" style={{ width: '100%', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', outline: 'none', cursor: 'pointer' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}><span>0</span><span>{vaultStats[selectedDomain]?.total || 90}</span></div>
                    </div>

                    <button onClick={handleStartTestFromSidebar} className="pulse-button" style={{ width: '100%', padding: '1rem', borderRadius: '15px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)', marginTop: '0.5rem' }}>
                      LAUNCH {selectedDomain === 'ALL' ? 'ALL STUDY' : selectedDomain.toUpperCase() + ' STUDY'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button onClick={handleStartTestFromSidebar} className="pulse-button" style={{ flex: 1, padding: '1rem', borderRadius: '15px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' }}>
                      LAUNCH {selectedDomain === 'ALL' ? 'ALL STUDY' : selectedDomain.toUpperCase() + ' STUDY'}
                    </button>
                    <button onClick={() => handleStartTestDirectly({ domainId: selectedDomain, testLength: -1, testType: 'intelligent', certLevel, isAudio: true })} style={{ width: '55px', borderRadius: '15px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Launch Audio Hub">
                      <span className="material-symbols-outlined">headset</span>
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10rem 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>upload_file</span>
            <h2 style={{ marginBottom: '1rem' }}>No Study Material Found</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Please import your study material to begin.</p>
            <label htmlFor="md-upload-main" className="btn-primary" style={{ cursor: 'pointer', padding: '1rem 2rem', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.8rem' }}>
              <span className="material-symbols-outlined">add_circle</span>
              Add Your First Topic
            </label>
            <DataImporter onDeckLoaded={handleDeckLoaded} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
