import { useState, useEffect } from 'react';
import DataImporter from './components/DataImporter';
import FlashcardStudyMode from './components/FlashcardStudyMode';
import TraditionalStudyMode from './components/TraditionalStudyMode';
import QuizStudyMode from './components/QuizStudyMode';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import SettingsModal from './components/SettingsModal';
import ResetModal from './components/ResetModal';
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

function App() {
  const [decks, setDecks] = useState([]);
  const [isStudying, setIsStudying] = useState(false);
  const [activeStudyDeck, setActiveStudyDeck] = useState(null);
  const [isViewingAnalytics, setIsViewingAnalytics] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);

  // Study configuration
  const [selectedDeckTitle, setSelectedDeckTitle] = useState('ALL');
  const [studyOrder, setStudyOrder] = useState('sequential'); // 'sequential' or 'random'
  const [studyMode, setStudyMode] = useState('quiz'); // 'traditional', 'quiz'
  const [quizType, setQuizType] = useState('intelligent'); // 'simple' or 'intelligent'
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  useEffect(() => {
    const savedDecks = loadDecksFromStorage();
    if (savedDecks) {
      setDecks(savedDecks);
    }
  }, []);

  const handleDeckLoaded = (loadedDeck) => {
    saveDeckToStorage(loadedDeck);
    // Reload state from storage
    setDecks(loadDecksFromStorage());
  };

  const handleDeleteDeck = (title) => {
    const confirmation = window.confirm(
      `⚠️ WARNING: This will permanently remove "${title}" and ALL your associated study progress, scores, and mastery history from this device.\n\n` +
      `Are you ABSOLUTELY sure you want to delete this topic?`
    );
    
    if (confirmation) {
      deleteDeckFromStorage(title);
      setDecks(loadDecksFromStorage());
      // Reset selection if we deleted the selected deck
      if (selectedDeckTitle === title) setSelectedDeckTitle('ALL');
    }
  };

  const handleResetProgress = (title) => {
    setResetTarget(title);
    setIsResetOpen(true);
  };

  const handlePerformReset = (modesToReset) => {
    setDecks(prevDecks => {
      const updatedDecks = prevDecks.map(d => {
        if (resetTarget === 'ALL' || d.title === resetTarget) {
          const resetCards = d.cards.map(c => {
            const updated = { ...c };
            
            if (modesToReset.traditional) {
              updated.status_traditional = 'unseen';
              updated.status = 'unseen'; // Shared fallback
            }
            if (modesToReset.test) {
              updated.status_test = 'unseen';
              updated.history_test = null;
            }
            if (modesToReset.quiz_simple) {
              updated.status_quiz_simple = 'unseen';
              updated.selected_option_simple = null;
              updated.history_quiz_simple = null;
            }
            if (modesToReset.quiz_intelligent) {
              updated.status_quiz_intelligent = 'unseen';
              updated.selected_option_intelligent = null;
              updated.history_quiz_intelligent = null;
            }

            // Global score reset if all or multiple modes reset
            if (Object.values(modesToReset).every(v => v)) {
              updated.score = 0;
            }
            
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

    if (resetTarget === 'ALL' || resetTarget === selectedDeckTitle) {
      setActiveStudyDeck(null);
    }
    
    setIsResetOpen(false);
    setResetTarget(null);
  };

  const handleExport = () => {
    exportAppData();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (window.confirm("Restoring from a backup will overwrite all current progress and data. Are you sure?")) {
      setIsRestoring(true);
      try {
        await importAppData(file);
        setDecks(loadDecksFromStorage());
        alert("Restoration Complete!");
      } catch (error) {
        alert("Restoration Failed: " + error.message);
      } finally {
        setIsRestoring(false);
      }
    }
    // Reset input
    e.target.value = '';
  };
  
  const handleNukeAiData = () => {
    if (window.confirm("⚠️ WARNING: This will permanently delete ALL generated questions, rationales, and distractors across all decks.\n\nYou will have to re-fetch/re-warm everything. Are you sure?")) {
      if (clearAiVault()) {
        alert("AI Vault Nuked Successfully.");
        // We don't necessarily need to reload decks, but a state refresh helps
        setDecks(loadDecksFromStorage());
      }
    }
  };

// ... inside App component ...

  const [warmUpProgress, setWarmUpProgress] = useState(0);
  const [warmUpError, setWarmUpError] = useState(null);

  const handleBulkWarmUp = async () => {
    if (decks.length === 0) return;
    setWarmUpError(null);
    
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
        let { missingCards: missingIntel } = await getQuizDataForDeck({ cards: targetCards }, 'intelligent');
        while (missingIntel.length > 0) {
          let rateLimited = false;
          await generateDistractorsBatch(missingIntel, 'intelligent', (p, error) => {
            setWarmUpProgress(Math.round(p * 0.5)); 
            if (error === 'RATE_LIMIT') rateLimited = true;
          });

          if (rateLimited) {
            setWarmUpError('Daily Limit detected. Switching to Fallback Engine...');
            await new Promise(r => setTimeout(r, 2000));
            setWarmUpError(null);
            // Refresh missing list
            const updated = await getQuizDataForDeck({ cards: targetCards }, 'intelligent');
            missingIntel = updated.missingCards;
          } else {
            break; 
          }
        }

        // MODE 2: Simple (Recall)
        let { missingCards: missingSimple } = await getQuizDataForDeck({ cards: targetCards }, 'simple');
        while (missingSimple.length > 0) {
          let rateLimited = false;
          await generateDistractorsBatch(missingSimple, 'simple', (p, error) => {
            setWarmUpProgress(50 + Math.round(p * 0.5));
            if (error === 'RATE_LIMIT') rateLimited = true;
          });

          if (rateLimited) {
            setWarmUpError('Daily Limit detected. Switching to Fallback Engine...');
            await new Promise(r => setTimeout(r, 2000));
            setWarmUpError(null);
            // Refresh missing list
            const updated = await getQuizDataForDeck({ cards: targetCards }, 'simple');
            missingSimple = updated.missingCards;
          } else {
            break;
          }
        }

        if (!warmUpError) {
          // FINAL AUDIT: Physical scan of the vault to verify logic versus storage
          const finalIntel = await getQuizDataForDeck({ cards: targetCards }, 'intelligent');
          const finalSimple = await getQuizDataForDeck({ cards: targetCards }, 'simple');
          
          if (finalIntel.missingCount > 0 || finalSimple.missingCount > 0) {
            setWarmUpError(`Logistics Error: ${finalIntel.missingCount + finalSimple.missingCount} items failed to sync. Please re-run.`);
            setIsWarmingUp(false);
            return;
          }

          setWarmUpProgress(100);
          setTimeout(() => {
            setIsWarmingUp(false);
            setWarmUpProgress(0);
          }, 2000);
        }
      } catch (err) {
        console.error("Warm-Up failed:", err);
        setWarmUpError("System Error. Please try again.");
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
      if (studyMode === 'test') return c.status_test || c.status || 'unseen';
      if (studyMode === 'quiz') return c[`status_quiz_${quizType}`] || 'unseen';
      return c.status || 'unseen';
    };
    const seenCards = cardsToStudy.filter(c => getStatus(c) !== 'unseen');
    let unseenCards = cardsToStudy.filter(c => getStatus(c) === 'unseen');

    let finalDeckCards = [];
    let initialIndex = 0;
    let isReviewMode = false;

    if (cardsToStudy.length > 0 && unseenCards.length === 0) {
      // Review Mode: All cards are seen, so study them all again from start
      isReviewMode = true;
      finalDeckCards = [...cardsToStudy];
      initialIndex = 0;
    } else {
      // Normal Mode: Prioritize unseen cards
      finalDeckCards = [...seenCards, ...unseenCards];
      initialIndex = seenCards.length;
    }

    if (cardsToStudy.length === 0) {
      alert("No cards found for this selection.");
      return;
    }

    if (studyOrder === 'random') {
      // Shuffling cards based on mode
      if (isReviewMode) {
        // Shuffle EVERYTHING
        for (let i = finalDeckCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [finalDeckCards[i], finalDeckCards[j]] = [finalDeckCards[j], finalDeckCards[i]];
        }
      } else if (unseenCards.length > 0) {
        // Only shuffle the unseen portion
        const shuffledUnseen = [...unseenCards];
        for (let i = shuffledUnseen.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledUnseen[i], shuffledUnseen[j]] = [shuffledUnseen[j], shuffledUnseen[i]];
        }
        // Re-construct final deck with seen cards first, followed by shuffled unseen
        finalDeckCards = [...seenCards, ...shuffledUnseen];
      }
      studyTitle += ' (Randomized)';
    } else {
      studyTitle += ' (Sequential)';
    }

    if (isReviewMode) studyTitle += ' [Review]';

    setActiveStudyDeck({
      title: studyTitle,
      cards: finalDeckCards,
      totalOriginalCards: totalOriginalCards,
      initialIndex: initialIndex,
      quizType: quizType
    });
    setIsStudying(true);
  };

  const handleUpdateCardStatus = (cardId, status, historyData = {}) => {
    // Determine the exact quiz type from history or current state
    const currentQuizType = historyData.quizType || quizType;
    const enrichedHistory = { ...historyData, quizType: currentQuizType };
    
    // Update LocalStorage and background decks state
    updateCardStatus(cardId, studyMode, status, enrichedHistory);
    
    // Update live study deck state
    if (activeStudyDeck) {
      const updatedCards = activeStudyDeck.cards.map(c => {
        if (c.id === cardId) {
          const updated = { ...c };
          if (studyMode === 'traditional') {
            updated.status_traditional = status;
          } else if (studyMode === 'test') {
            updated.status_test = status;
          } else if (studyMode === 'quiz') {
            const qKey = `status_quiz_${currentQuizType}`;
            const oKey = `selected_option_${currentQuizType}`;
            updated[qKey] = status;
            if (historyData.selectedOption) {
              updated[oKey] = historyData.selectedOption;
            }
          }
          return updated;
        }
        return c;
      });
      setActiveStudyDeck({ ...activeStudyDeck, cards: updatedCards });
    }
    
    // Sync the main decks view
    setDecks(loadDecksFromStorage());
  };

  if (isStudying && activeStudyDeck) {
    return (
      <div className="app-container animate-fade-in" style={{ paddingTop: '2rem' }}>
        {studyMode === 'test' ? (
          <FlashcardStudyMode
            deck={activeStudyDeck}
            onBack={() => setIsStudying(false)}
            onUpdateCardStatus={handleUpdateCardStatus}
          />
        ) : studyMode === 'traditional' ? (
          <TraditionalStudyMode
            deck={activeStudyDeck}
            onBack={() => setIsStudying(false)}
            onUpdateCardStatus={handleUpdateCardStatus}
          />
        ) : studyMode === 'quiz' ? (
          <QuizStudyMode
            deck={activeStudyDeck}
            onBack={() => setIsStudying(false)}
            onUpdateCardStatus={handleUpdateCardStatus}
          />
        ) : (
          <div style={{ textAlign: 'center', color: 'white' }}>
            <h2>Mode Not Supported</h2>
            <button onClick={() => setIsStudying(false)}>Back to Dashboard</button>
          </div>
        )}
      </div>
    );
  }

  if (isViewingAnalytics) {
    return (
      <div className="app-container animate-fade-in" style={{ paddingTop: '2rem' }}>
        <AnalyticsDashboard 
          decks={decks} 
          onBack={() => setIsViewingAnalytics(false)} 
        />
      </div>
    );
  }

  const totalCards = decks.reduce((sum, deck) => sum + deck.cards.length, 0);

  return (
    <div className="app-container animate-fade-in">
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '3rem',
        padding: '1rem 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }} className="text-gradient">SHRM 2026</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {decks.length > 0 && (
            <button 
              onClick={() => setIsViewingAnalytics(true)}
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                color: 'white',
                padding: '0.5rem 1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                boxShadow: 'none'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>analytics</span>
              Insights
            </button>
          )}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              padding: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: 'none'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.8rem' }}>settings</span>
          </button>
        </div>
      </header>

      {isSettingsOpen && (
        <SettingsModal 
          onClose={() => setIsSettingsOpen(false)}
          onExport={handleExport}
          onImport={handleImport}
          onNukeAi={handleNukeAiData}
          onDeleteDeck={handleDeleteDeck}
          onResetProgress={handleResetProgress}
          decks={decks}
          isRestoring={isRestoring}
        />
      )}

      {isResetOpen && (
        <ResetModal 
          isOpen={isResetOpen}
          targetTitle={resetTarget}
          currentMode={studyMode}
          quizType={quizType}
          onClose={() => {
            setIsResetOpen(false);
            setResetTarget(null);
          }}
          onConfirm={handlePerformReset}
        />
      )}

      <main>
        <DataImporter onDeckLoaded={handleDeckLoaded} />
        {decks.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '2rem' }}>
            
            {/* Left: Topic Selector Grid */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Select Topic</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {decks.length} Topics | {totalCards} Cards
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '1rem',
                maxHeight: 'calc(100vh - 300px)',
                overflowY: 'auto',
                paddingRight: '0.5rem'
              }} className="custom-scrollbar">
                
                {/* "ALL" Topic Card */}
                <div 
                  onClick={() => setSelectedDeckTitle('ALL')}
                  className={`glass-panel topic-card ${selectedDeckTitle === 'ALL' ? 'active' : ''}`}
                  style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>All Study Material</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {selectedDeckTitle === 'ALL' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleResetProgress('ALL'); }}
                          style={{ background: 'transparent', border: 'none', padding: 0, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', boxShadow: 'none', display: 'flex' }}
                          title="Reset All Progress"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>restart_alt</span>
                        </button>
                      )}
                      <span className="material-symbols-outlined" style={{ color: selectedDeckTitle === 'ALL' ? 'var(--secondary)' : 'rgba(255,255,255,0.2)' }}>
                        {selectedDeckTitle === 'ALL' ? 'check_circle' : 'circle'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Comprehensive review of {totalCards} cards across all topics.
                  </div>
                </div>

                {[...decks].sort((a, b) => a.title.localeCompare(b.title)).map(deck => {
                  const getStatus = (c) => {
                    if (studyMode === 'traditional') return c.status_traditional || c.status || 'unseen';
                    if (studyMode === 'test') return c.status_test || c.status || 'unseen';
                    if (studyMode === 'quiz') return c[`status_quiz_${quizType}`] || 'unseen';
                    return c.status || 'unseen';
                  };
                  const masteredCount = deck.cards.filter(c => getStatus(c) !== 'unseen').length;
                  const percent = deck.cards.length > 0 ? Math.round((masteredCount / deck.cards.length) * 100) : 0;
                  const isActive = selectedDeckTitle === deck.title;

                  return (
                    <div 
                      key={deck.title} 
                      onClick={() => setSelectedDeckTitle(deck.title)}
                      className={`glass-panel topic-card ${isActive ? 'active' : ''}`}
                      style={{ padding: '1.2rem', position: 'relative' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{deck.title}</h3>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {deck.cards.length} Flashcards
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {isActive && (
                            <>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleResetProgress(deck.title); }}
                                style={{ background: 'transparent', border: 'none', padding: 0, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', boxShadow: 'none', display: 'flex' }}
                                title="Reset Progress"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>restart_alt</span>
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteDeck(deck.title); }}
                                style={{ background: 'transparent', border: 'none', padding: 0, color: 'rgba(239, 68, 68, 0.4)', cursor: 'pointer', boxShadow: 'none', display: 'flex' }}
                                title="Delete Topic"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>delete</span>
                              </button>
                            </>
                          )}
                          <span className="material-symbols-outlined" style={{ color: isActive ? 'var(--secondary)' : 'rgba(255,255,255,0.1)' }}>
                            {isActive ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                        <span>{masteredCount} mastered</span>
                        <span>{percent}%</span>
                      </div>
                      <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', backgroundColor: 'var(--secondary)', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  );
                })}

                {/* ADD NEW TOPIC CARD */}
                <div style={{ position: 'relative' }}>
                  <label htmlFor="md-upload-main" style={{ cursor: 'pointer', display: 'block' }}>
                    <div className="glass-panel topic-card" style={{ 
                      padding: '1.2rem', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.8rem',
                      border: '1px dashed rgba(255,255,255,0.15)',
                      height: '100%',
                      minHeight: '135px',
                      background: 'rgba(255,255,255,0.02)'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.2)' }}>add_circle</span>
                      <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>Add New Topic</span>
                    </div>
                  </label>
                </div>
              </div>
            </section>

            {/* Right: Focused Study Panel */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ 
                padding: '2rem', 
                position: 'sticky', 
                top: '2rem',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}>
                <h3 style={{ margin: 0, color: 'var(--secondary)', fontSize: '1.2rem' }}>Study Configuration</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>MODE</label>
                    <select
                      value={studyMode}
                      onChange={(e) => setStudyMode(e.target.value)}
                      className="glass-select"
                    >
                      <option value="quiz">Multiple Choice Quiz</option>
                      <option value="traditional">Traditional Study</option>
                    </select>
                  </div>

                  {studyMode === 'quiz' && (
                    <div className="animate-fade-in">
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>ENGINE</label>
                      <select
                        value={quizType}
                        onChange={(e) => setQuizType(e.target.value)}
                        className="glass-select"
                      >
                        <option value="intelligent">Intelligent (Simulator)</option>
                        <option value="simple">Simple (Recall)</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>ORDER</label>
                    <select
                      value={studyOrder}
                      onChange={(e) => setStudyOrder(e.target.value)}
                      className="glass-select"
                    >
                      <option value="random">Randomized</option>
                      <option value="sequential">Sequential</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <button onClick={handleStartStudying} style={{ width: '100%', fontSize: '1.1rem', padding: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
                    <span className="material-symbols-outlined">play_arrow</span>
                    Start Studying
                  </button>
                  
                  {studyMode === 'quiz' && (
                    <div style={{ marginTop: '1rem' }}>
                      {isWarmingUp ? (
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.75rem' }}>
                            <span style={{ color: warmUpError ? '#fbbf24' : 'var(--secondary)' }}>{warmUpError || 'Generating Content...'}</span>
                            <span>{warmUpProgress}%</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${warmUpProgress}%`, height: '100%', backgroundColor: 'var(--secondary)', transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={handleBulkWarmUp}
                          style={{ 
                            width: '100%', 
                            background: 'transparent', 
                            border: '1px solid rgba(16, 185, 129, 0.3)', 
                            color: 'var(--secondary)',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.8rem',
                            boxShadow: 'none'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>bolt</span>
                          Bulk Warm-Up
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '5rem', marginBottom: '1.5rem', opacity: 0.2 }}>upload_file</span>
            <h2>No Study Material Found</h2>
            <p style={{ marginBottom: '2rem' }}>Please import your study material to begin your 2026 SHRM prep.</p>
            <label htmlFor="md-upload-main" style={{ cursor: 'pointer' }}>
                <span className="button" style={{ 
                    padding: '1rem 2.5rem', 
                    fontSize: '1rem', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.8rem',
                    background: 'var(--primary)',
                    borderRadius: '16px',
                    color: 'white',
                    fontWeight: 'bold'
                }}>
                    <span className="material-symbols-outlined">upload_file</span>
                    Add Your First Topic
                </span>
            </label>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
