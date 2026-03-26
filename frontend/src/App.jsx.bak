import { useState, useEffect } from 'react';
import VaultManager from './components/VaultManager';
import DomainGrid from './components/DomainGrid';
import SmartTestOverlay from './components/SmartTestOverlay';
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
  const [isRefining, setIsRefining] = useState(false);
  const [refineProgress, setRefineProgress] = useState(0);
  const [isVaultManagerOpen, setIsVaultManagerOpen] = useState(false);

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
        // Refresh state
        setDecks(loadDecksFromStorage());
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSelectDomain = (domainId) => {
    // Toggle selection: If already selected, revert to ALL
    setSelectedDomain(prev => prev === domainId ? 'ALL' : domainId);
  };

  const handleStartTestFromSidebar = (isWeighted = false) => {
    handleStartTestDirectly({ 
      domainId: selectedDomain, 
      testLength: isWeighted ? 134 : testLength, 
      testType: quizType, 
      certLevel,
      isWeighted
    });
  };

  const handleStartTestDirectly = async (config) => {
    const { domainId, testLength: lengthReq, testType, certLevel: level, isWeighted } = config;
    setIsTestOverlayOpen(false);
    
    // Engine Logic: Use the new Domain-First filter
    const effectiveLength = lengthReq === -1 ? 9999 : lengthReq;
    const filter = { domainId, length: effectiveLength, isWeighted };
    const data = await getQuizDataByFilter(decks, filter, testType, level);
    
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

    // PROGRESS RECOVERY: Audit seen vs unseen to calculate initialIndex
    const statusKey = `status_quiz_${testType}_${level}`;
    const seenCardsCount = data.cards.filter(c => c[statusKey] && c[statusKey] !== 'unseen').length;
    const initialIndex = (data.cards.length > 0 && seenCardsCount === data.cards.length) ? 0 : seenCardsCount;

    setActiveStudyDeck({ 
      title: domainId === 'ALL' ? 'Full 2026 Simulator' : `Domain: ${domainId}`, 
      cards: data.cards, 
      totalOriginalCards: data.totalAvailable, 
      initialIndex: initialIndex, 
      quizType: testType, 
      certLevel: level,
      isUnderStrength: data.isUnderStrength,
      requestedLength: lengthReq
    });
    setIsStudying(true);
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
          const batchToProcess = missingSimple.slice(0, 8); 
          
          // SURGICAL LOGIC: If distractors exist but tags are missing, use the lighter metadata refiner
          const vault = loadVaultFromStorage();
          const isMetadataOnly = batchToProcess.every(c => {
            const cleanId = String(c.id).replace(/[\s\n\r]/g, '');
            return !!vault[`${cleanId}:simple:${certLevel}`]?.distractors;
          });

          if (isMetadataOnly) {
            setWarmUpStatus(`SURGICAL TAG SYNC: Batch ${currentBatch} of ${simpleBatches}...`);
            const result = await refineMetadataBatch(batchToProcess, certLevel, (p) => {
              const currentP = Math.round(((syncedCount + p) / totalToSync) * 100);
              setWarmUpProgress(prev => currentP);
            });
            
            if (result && result.success === false) {
              setWarmUpError(`Metadata Sync Interrupted`);
              setIsWarmingUp(false);
              return;
            }
          } else {
            setWarmUpStatus(`RECALL SYNC: Batch ${currentBatch} of ${simpleBatches}...`);
            const result = await generateDistractorsBatch(batchToProcess, 'simple', (p, error) => {
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

  const handleRefineMetadata = async () => {
    if (decks.length === 0) return;
    setIsRefining(true);
    setRefineProgress(0);

    const vault = loadVaultFromStorage();
    let cardsToRefine = [];
    
    decks.forEach(deck => {
      deck.cards.forEach(card => {
        const cleanId = String(card.id).replace(/[\s\n\r]/g, '');
        const sData = vault[`${cleanId}:simple:${certLevel}`];
        if (sData?.distractors && !sData?.tag_bask) {
          cardsToRefine.push({ ...card, topic: deck.title });
        }
      });
    });

    if (cardsToRefine.length === 0) {
      setIsRefining(false);
      return;
    }

    const total = cardsToRefine.length;
    let completed = 0;
    const BATCH_SIZE = 8;

    for (let i = 0; i < cardsToRefine.length; i += BATCH_SIZE) {
      const batch = cardsToRefine.slice(i, i + BATCH_SIZE);
      const result = await refineMetadataBatch(batch, certLevel);
      
      if (result.success) {
        completed += result.count;
        setRefineProgress(Math.round((completed / total) * 100));
        // Force state refresh to update matrix in real-time
        setDecks(loadDecksFromStorage());
      } else {
        console.error("Refine Batch Failed:", result.error);
        break;
      }
      
      // Stagger to stay safe with RPM
      if (i + BATCH_SIZE < cardsToRefine.length) {
        await new Promise(r => setTimeout(r, 6000));
      }
    }

    setIsRefining(false);
    setRefineProgress(100);
    // Final sync
    setDecks(loadDecksFromStorage());
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
    
    // UI RE-SYNC: Force the active session to see the updated data in real-time
    const freshDecks = loadDecksFromStorage();
    setDecks(freshDecks);
    
    if (activeStudyDeck) {
      const updatedCards = activeStudyDeck.cards.map(c => {
        if (c.id === cardId) {
          const quizKey = `status_quiz_${historyData.quizType || quizType}_${certLevel}`;
          const optionKey = `selected_option_${historyData.quizType || quizType}_${certLevel}`;
          return { ...c, [quizKey]: status, [optionKey]: historyData.selectedOption };
        }
        return c;
      });
      setActiveStudyDeck(prev => ({ ...prev, cards: updatedCards }));
    }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }} className="text-gradient">SHRM 2026 Study Hub</h1>
          
          {/* DYNAMIC STATUS INDICATOR (Mutually Exclusive) */}
          {decks.length > 0 && (
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', marginLeft: '1rem' }}>
              {(() => {
                const stats = getVaultStats(certLevel, decks)[selectedDomain] || { intelligent: 0, simple: 0 };
                const count = quizType === 'intelligent' ? stats.intelligent : stats.simple;
                
                if (count > 0) {
                  return (
                    <div key="ready-to-test" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></span>
                      Ready to Test
                    </div>
                  );
                } else {
                  return (
                    <div key="sync-needed" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 10px #f59e0b' }}></span>
                      Sync Needed
                    </div>
                  );
                }
              })()}
            </div>
          )}
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

      {/* MODAL LAYER: Settings & Vault Management */}
      {isSettingsOpen && <SettingsModal 
        onClose={() => setIsSettingsOpen(false)} 
        onExport={exportAppData} 
        onImport={async (e) => { await importAppData(e.target.files[0]); setDecks(loadDecksFromStorage()); }} 
        onMerge={async (e) => { await mergeAppData(e.target.files[0]); setDecks(loadDecksFromStorage()); }} 
        onNukeAi={handleNukeAi} 
        onNukeSimple={handleNukeSimple} 
        onDeleteDeck={handleDeleteDeck} 
        onResetProgress={handleResetProgress} 
        decks={decks} 
        onOpenVault={() => {
          setIsSettingsOpen(false);
          setIsVaultManagerOpen(true);
        }}
        onOpenMatrix={() => {
          setIsSettingsOpen(false);
          setIsMatrixOpen(true);
        }}
      />}

      {isVaultManagerOpen && <VaultManager 
        decks={decks} 
        onDeckLoaded={handleDeckLoaded} 
        onDeleteDeck={handleDeleteDeck} 
        onResetProgress={handleResetProgress}
        onResetAllProgress={() => handleResetProgress('ALL')}
        onDeleteAllDecks={() => handleDeleteDeck('ALL')}
        certLevel={certLevel}
        isWarmingUp={isWarmingUp}
        warmUpProgress={warmUpProgress}
        onRefineMetadata={handleRefineMetadata}
        isRefining={isRefining}
        refineProgress={refineProgress}
        isOpen={isVaultManagerOpen}
        setIsOpen={setIsVaultManagerOpen}
      />}
      {isResetOpen && <ResetModal isOpen={isResetOpen} targetTitle={resetTarget} currentMode={studyMode} quizType={quizType} onClose={() => setIsResetOpen(false)} onConfirm={handlePerformReset} />}
        <ConfirmationModal isOpen={confirmModal.isOpen} type={confirmModal.type} title={confirmModal.title} message={confirmModal.message} confirmText={confirmModal.confirmText} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmModal.onConfirm} />

      <main style={{ padding: '0.5rem 0 5rem 0' }}>
        {decks.length > 0 ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '2.5rem', alignItems: 'flex-start' }}>
              <section>
                <DomainGrid 
                  decks={decks} 
                  certLevel={certLevel} 
                  onSelectDomain={handleSelectDomain}
                  studyMode={studyMode}
                  quizType={quizType}
                  selectedDomain={selectedDomain}
                  onResetDomain={handleResetDomain}
                />
              </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>BASK Controls</h3>
                
                {/* CERTIFICATION LEVEL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Certification Level</label>
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '3px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <button 
                      onClick={() => setCertLevel('CP')}
                      style={{ 
                        flex: 1, padding: '0.5rem', borderRadius: '18px', fontSize: '0.75rem', fontWeight: 'bold',
                        background: certLevel === 'CP' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        border: certLevel === 'CP' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                        color: certLevel === 'CP' ? 'white' : 'rgba(255,255,255,0.4)',
                        transition: 'all 0.3s ease'
                      }}
                    >SHRM-CP</button>
                    <button 
                      onClick={() => setCertLevel('SCP')}
                      style={{ 
                        flex: 1, padding: '0.5rem', borderRadius: '18px', fontSize: '0.75rem', fontWeight: 'bold',
                        background: certLevel === 'SCP' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        border: certLevel === 'SCP' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                        color: certLevel === 'SCP' ? 'white' : 'rgba(255,255,255,0.4)',
                        transition: 'all 0.3s ease'
                      }}
                    >SHRM-SCP</button>
                  </div>
                </div>

                {/* STUDY MODE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Study Mode</label>
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '3px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <button 
                      onClick={() => setStudyMode('traditional')}
                      style={{ 
                        flex: 1, padding: '0.5rem', borderRadius: '18px', fontSize: '0.75rem', fontWeight: 'bold',
                        background: studyMode === 'traditional' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        border: studyMode === 'traditional' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                        color: studyMode === 'traditional' ? 'white' : 'rgba(255,255,255,0.4)',
                        transition: 'all 0.3s ease'
                      }}
                    >FLASHCARDS</button>
                    <button 
                      onClick={() => setStudyMode('quiz')}
                      style={{ 
                        flex: 1, padding: '0.5rem', borderRadius: '18px', fontSize: '0.75rem', fontWeight: 'bold',
                        background: studyMode === 'quiz' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        border: studyMode === 'quiz' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                        color: studyMode === 'quiz' ? 'white' : 'rgba(255,255,255,0.4)',
                        transition: 'all 0.3s ease'
                      }}
                    >INTERACTIVE QUIZ</button>
                  </div>
                </div>

                {/* QUIZ TYPE (Conditional) */}
                {studyMode === 'quiz' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quiz Type</div>
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '3px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <button 
                        onClick={() => setQuizType('intelligent')}
                        style={{ 
                          flex: 1, padding: '0.5rem', borderRadius: '18px', fontSize: '0.75rem', fontWeight: 'bold',
                          background: quizType === 'intelligent' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                          border: quizType === 'intelligent' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                          color: quizType === 'intelligent' ? 'white' : 'rgba(255,255,255,0.4)',
                          transition: 'all 0.3s ease'
                        }}
                      >SITUATIONAL (SJI)</button>
                      <button 
                        onClick={() => setQuizType('simple')}
                        style={{ 
                          flex: 1, padding: '0.5rem', borderRadius: '18px', fontSize: '0.75rem', fontWeight: 'bold',
                          background: quizType === 'simple' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                          border: quizType === 'simple' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                          color: quizType === 'simple' ? 'white' : 'rgba(255,255,255,0.4)',
                          transition: 'all 0.3s ease'
                        }}
                      >RECALL (DEFINITION)</button>
                    </div>
                  </div>
                )}

                {/* SELECT QUIZ LENGTH (DYNAMIC SLIDER) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {(() => {
                    const stats = getVaultStats(certLevel, decks)[selectedDomain] || { intelligent: 0, simple: 0, total: 0 };
                    const readyCount = quizType === 'intelligent' ? stats.intelligent : stats.simple;
                    const maxVal = Math.max(1, readyCount);
                    const isGlobal = selectedDomain === 'ALL';
                    const isExamReady = isGlobal && readyCount >= 134;

                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Test Question Size
                          </label>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
                            {testLength === -1 ? `Full (${readyCount})` : `${testLength} Cards`}
                          </span>
                        </div>

                        {/* PREMIUM SLIDER UI (With Boundaries and Snap-to-5) */}
                        <div style={{ padding: '0.5rem 0' }}>
                          <input 
                            type="range" 
                            min="5" 
                            max={maxVal} 
                            step="5"
                            list="tickmarks"
                            value={testLength === -1 ? maxVal : Math.min(testLength, maxVal)}
                            onChange={(e) => setTestLength(parseInt(e.target.value))}
                            className="premium-slider"
                            style={{ width: '100%', cursor: 'pointer' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>
                            <span>0</span>
                            <span>{maxVal}</span>
                          </div>
                          <datalist id="tickmarks">
                             {Array.from({ length: Math.floor(maxVal / 10) + 1 }, (_, i) => (
                               <option key={i * 10} value={i * 10}></option>
                             ))}
                          </datalist>
                        </div>

                        {/* EXAM SIMULATOR PULSE BUTTON (Unlocked at 134+ global) */}
                        {isExamReady && (
                          <div className="animate-fade-in" style={{ marginTop: '0.5rem' }}>
                            <button 
                              onClick={() => handleStartTestFromSidebar(true)}
                              className="pulse-button"
                              style={{ 
                                width: '100%',
                                padding: '0.7rem',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                border: 'none',
                                color: '#0f172a',
                                fontSize: '0.75rem',
                                fontWeight: '900',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.6rem'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>military_tech</span>
                              LAUNCH 134-QUESTION SIMULATION
                            </button>
                            <p style={{ fontSize: '0.6rem', color: '#fbbf24', textAlign: 'center', marginTop: '0.4rem', fontStyle: 'italic', opacity: 0.8 }}>
                              Full Exam Distribution (35% People | 35% Org | 30% Workplace)
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* POOL STRENGTH WARNING */}
                {(() => {
                  const stats = getVaultStats(certLevel, decks)[selectedDomain] || { intelligent: 0, simple: 0 };
                  const count = quizType === 'intelligent' ? stats.intelligent : stats.simple;
                  if (count > 0) return null;
                  return (
                    <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: '1.2rem' }}>warning</span>
                      <div style={{ fontSize: '0.65rem', color: '#fbbf24', lineHeight: '1.3' }}>
                        <b>SYNC NEEDED</b>: 0 synced for {selectedDomain === 'ALL' ? 'Global Vault' : selectedDomain}.
                      </div>
                    </div>
                  );
                })()}

                {/* START STUDYING BUTTON */}
                <button 
                  onClick={handleStartTestFromSidebar}
                  style={{ 
                    marginTop: '0.5rem',
                    width: '100%',
                    padding: '1rem', 
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    border: 'none',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: '800',
                    boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.8rem',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {selectedDomain === 'ALL' ? 'START GLOBAL STUDYING' : `LAUNCH ${selectedDomain.toUpperCase()} STUDY`}
                </button>
                
                {isWarmingUp && (
                  <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 'bold', marginBottom: '0.5rem' }}>{warmUpStatus}</div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${warmUpProgress}%`, height: '100%', background: '#fbbf24' }} />
                    </div>
                  </div>
                )}

                {warmUpError && (
                  <button 
                    onClick={handleBulkWarmUp}
                    style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.7rem', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Resume Interrupted Sync
                  </button>
                )}
              </div>
            </section>
            </div>
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
