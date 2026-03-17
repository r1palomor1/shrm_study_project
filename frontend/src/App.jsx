import { useState, useEffect, useMemo } from 'react';
import DataImporter from './components/DataImporter';
import FlashcardStudyMode from './components/FlashcardStudyMode';
import TraditionalStudyMode from './components/TraditionalStudyMode';
import QuizStudyMode from './components/QuizStudyMode';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import SettingsModal from './components/SettingsModal';
import ResetModal from './components/ResetModal';
import ConfirmationModal from './components/ConfirmationModal';

// Expert Components (Approved Features)
import ProjectHeader from './components/ProjectHeader';
import NavigationSidebar from './components/NavigationSidebar';
import VaultHealthMatrix from './components/VaultHealthMatrix';
import TopicCard from './components/TopicCard';

import { 
  saveDeckToStorage, 
  loadDecksFromStorage, 
  deleteDeckFromStorage, 
  updateCardStatus,
  exportAppData,
  importAppData,
  clearAiVault
} from './utils/storage';
import { 
  getQuizDataForDeck,
  generateDistractorsBatch
} from './utils/quizProcessor';
import './index.css';

/**
 * App: Root Application Container (Structural Engineering Upgrade)
 */
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
  
  // Bulk Prep Engine State
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [warmUpProgress, setWarmUpProgress] = useState(0);
  const [warmUpError, setWarmUpError] = useState(null);

  useEffect(() => {
    const savedDecks = loadDecksFromStorage();
    if (savedDecks) setDecks(savedDecks);
  }, []);

  const totalCards = useMemo(() => decks.reduce((sum, deck) => sum + deck.cards.length, 0), [decks]);

  const handleDeckLoaded = (loadedDeck) => {
    saveDeckToStorage(loadedDeck);
    setDecks(loadDecksFromStorage());
  };

  const handleDeleteDeck = (title) => {
    setIsSettingsOpen(false);
    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Delete Topic?',
      message: `Warning: This will permanently remove "${title}" and ALL associated progress from this device.`,
      confirmText: 'Delete Permanently',
      onConfirm: () => {
        deleteDeckFromStorage(title);
        setDecks(loadDecksFromStorage());
        if (selectedDeckTitle === title) setSelectedDeckTitle('ALL');
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
            if (modesToReset.quiz_simple) { updated.status_quiz_simple = 'unseen'; updated.selected_option_simple = null; updated.history_quiz_simple = null; }
            if (modesToReset.quiz_intelligent) { updated.status_quiz_intelligent = 'unseen'; updated.selected_option_intelligent = null; updated.history_quiz_intelligent = null; }
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

  /**
   * handleBulkWarmUp: Veteran Implementation with Self-Healing Sync.
   * Uses 15-second retries and strict unified fetching.
   */
  const handleBulkWarmUp = async () => {
    if (decks.length === 0) return;
    setWarmUpError(null);
    setIsWarmingUp(true);
    setWarmUpProgress(0);

    const targetCards = selectedDeckTitle === 'ALL' 
      ? decks.flatMap(d => d.cards) 
      : decks.find(d => d.title === selectedDeckTitle)?.cards || [];
    
    if (targetCards.length === 0) {
      setIsWarmingUp(false);
      return;
    }

    try {
      let isSyncFinished = false;
      while (!isSyncFinished) {
        let isRateLimited = false;
        
        // Expert Implementation: Use 'unified' mode for full fidelity sync
        await generateDistractorsBatch(targetCards, 'unified', (progress, error) => {
          setWarmUpProgress(progress);
          if (error === 'RATE_LIMIT') isRateLimited = true;
        });

        if (isRateLimited) {
          setWarmUpError("GEMINI BUSY. SELF-HEALING RETRY IN 15S...");
          await new Promise(r => setTimeout(r, 15000));
          setWarmUpError(null);
          // Loop continues for retry
        } else {
          isSyncFinished = true;
        }
      }
      setWarmUpProgress(100);
      setTimeout(() => {
        setIsWarmingUp(false);
        setWarmUpProgress(0);
      }, 2000);
    } catch (err) {
      console.error("Critical Warm-Up Error:", err);
      setWarmUpError("SYSTEM FATAL. RE-ATTEMPT SYNC MANUALLY.");
      setTimeout(() => setIsWarmingUp(false), 5000);
    }
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
      if (studyMode === 'test') return c.status_test || c.status || 'unseen';
      if (studyMode === 'quiz') return c[`status_quiz_${quizType}`] || 'unseen';
      return c.status || 'unseen';
    };

    const seenCards = cardsToStudy.filter(c => getStatus(c) !== 'unseen');
    let unseenCards = cardsToStudy.filter(c => getStatus(c) === 'unseen');
    let finalDeckCards = (cardsToStudy.length > 0 && unseenCards.length === 0) ? [...cardsToStudy] : [...seenCards, ...unseenCards];
    let initialIndex = (cardsToStudy.length > 0 && unseenCards.length === 0) ? 0 : seenCards.length;

    if (cardsToStudy.length === 0) return alert("No cards selected.");

    if (studyOrder === 'random') {
      for (let i = finalDeckCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalDeckCards[i], finalDeckCards[j]] = [finalDeckCards[j], finalDeckCards[i]];
      }
    }

    setActiveStudyDeck({ title: studyTitle, cards: finalDeckCards, totalOriginalCards, initialIndex, quizType });
    setIsStudying(true);
  };

  const handleUpdateCardStatus = (cardId, status, historyData = {}) => {
    const currentQuizType = historyData.quizType || quizType;
    updateCardStatus(cardId, studyMode, status, { ...historyData, quizType: currentQuizType });
    setDecks(loadDecksFromStorage());
  };

  // Rendering Strategy: Conditional Overlays (Study/Analytics) vs Main Dashboard
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
        <AnalyticsDashboard decks={decks} initialMode={quizType} onBack={() => setIsViewingAnalytics(false)} />
      </div>
    );
  }

  return (
    <div className="app-container animate-fade-in">
      <ProjectHeader totalCards={totalCards} />

      {isSettingsOpen && (
        <SettingsModal 
          onClose={() => setIsSettingsOpen(false)}
          onExport={exportAppData}
          onImport={async (e) => { await importAppData(e.target.files[0]); setDecks(loadDecksFromStorage()); }}
          onNukeAi={() => { clearAiVault(); setDecks(loadDecksFromStorage()); setIsSettingsOpen(false); }}
          onDeleteDeck={handleDeleteDeck}
          onResetProgress={handleResetProgress}
          decks={decks}
        />
      )}
      
      {isResetOpen && (
        <ResetModal 
          isOpen={isResetOpen} targetTitle={resetTarget} currentMode={studyMode} quizType={quizType}
          onClose={() => setIsResetOpen(false)} onConfirm={handlePerformReset}
        />
      )}

      <ConfirmationModal 
        isOpen={confirmModal.isOpen} type={confirmModal.type} title={confirmModal.title} message={confirmModal.message}
        confirmText={confirmModal.confirmText} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
      />

      {/* Main Structural Layout Grid */}
      <main style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '2.5rem' }}>
        <NavigationSidebar 
          onViewInsights={() => setIsViewingAnalytics(true)}
          onViewSettings={() => setIsSettingsOpen(true)}
          onTriggerWarmUp={handleBulkWarmUp}
          isWarmingUp={isWarmingUp}
          warmUpProgress={warmUpProgress}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <DataImporter onDeckLoaded={handleDeckLoaded} />

          {decks.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2.5rem' }}>
              
              {/* Left Column: Topic Selection */}
              <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{ fontSize: '1.6rem', margin: 0, fontWeight: '800' }}>Select Study Topic</h2>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                  gap: '1.2rem',
                  maxHeight: 'calc(100vh - 400px)',
                  overflowY: 'auto',
                  paddingRight: '0.8rem'
                }} className="custom-scrollbar">
                  
                  <TopicCard 
                    title="All Study Material"
                    cards={decks.flatMap(d => d.cards)}
                    isActive={selectedDeckTitle === 'ALL'}
                    onSelect={() => setSelectedDeckTitle('ALL')}
                    onReset={() => handleResetProgress('ALL')}
                    studyMode={studyMode}
                    quizType={quizType}
                    isAllCards={true}
                  />

                  {[...decks].sort((a,b) => a.title.localeCompare(b.title)).map(deck => (
                    <TopicCard 
                      key={deck.title}
                      title={deck.title}
                      cards={deck.cards}
                      isActive={selectedDeckTitle === deck.title}
                      onSelect={() => setSelectedDeckTitle(deck.title)}
                      onReset={() => handleResetProgress(deck.title)}
                      onDelete={() => handleDeleteDeck(deck.title)}
                      studyMode={studyMode}
                      quizType={quizType}
                    />
                  ))}
                </div>
              </section>

              {/* Right Column: Execution Panel */}
              <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ 
                  padding: '2.5rem', 
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.8rem'
                }}>
                  <h3 style={{ margin: 0, color: 'var(--secondary)', fontSize: '1.2rem', fontWeight: '800' }}>Study Configuration</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>EXECUTION MODE</label>
                      <select value={studyMode} onChange={(e) => setStudyMode(e.target.value)} className="glass-select">
                        <option value="quiz">Multiple Choice Quiz</option>
                        <option value="traditional">Traditional Flashcards</option>
                      </select>
                    </div>

                    {studyMode === 'quiz' && (
                      <div className="animate-fade-in">
                        <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>ENGINE LEVEL</label>
                        <select value={quizType} onChange={(e) => setQuizType(e.target.value)} className="glass-select">
                          <option value="intelligent">Intelligent (Simulator)</option>
                          <option value="simple">Simple (Recall)</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>QUESTION SEQUENCE</label>
                      <select value={studyOrder} onChange={(e) => setStudyOrder(e.target.value)} className="glass-select">
                        <option value="random">Randomized (Shuffled)</option>
                        <option value="sequential">Sequential (In Order)</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={handleStartStudying} 
                    className="btn-primary" 
                    style={{ width: '100%', padding: '1.2rem', fontSize: '1rem', fontWeight: '800' }}
                  >
                    START AUDIT SESSION
                  </button>

                  {warmUpError && (
                    <div style={{ 
                      padding: '0.8rem', 
                      background: 'rgba(251, 191, 36, 0.1)', 
                      border: '1px solid rgba(251, 191, 36, 0.3)', 
                      borderRadius: '8px', 
                      color: '#fbbf24', 
                      fontSize: '0.75rem', 
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}>
                      {warmUpError}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '8rem 2rem', opacity: 0.5 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '5rem' }}>upload_file</span>
              <h2>VAULT IS EMPTY</h2>
              <p>Import SHRM 2026 BASK data to begin.</p>
            </div>
          )}

          {/* AI Readiness Matrix (Full Width Bottom) */}
          <VaultHealthMatrix 
            decks={decks} 
            onSmartSync={handleBulkWarmUp}
            isSyncing={isWarmingUp}
            syncProgress={warmUpProgress}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
