import { useState, useEffect } from 'react';
import DataImporter from './components/DataImporter';
import FlashcardStudyMode from './components/FlashcardStudyMode';
import TraditionalStudyMode from './components/TraditionalStudyMode';
import { saveDeckToStorage, loadDecksFromStorage, deleteDeckFromStorage, updateCardStatus } from './utils/storage';
import './index.css';

function App() {
  const [decks, setDecks] = useState([]);
  const [isStudying, setIsStudying] = useState(false);
  const [activeStudyDeck, setActiveStudyDeck] = useState(null);

  // Study configuration
  const [selectedDeckTitle, setSelectedDeckTitle] = useState('ALL');
  const [studyOrder, setStudyOrder] = useState('sequential'); // 'sequential' or 'random'
  const [studyMode, setStudyMode] = useState('traditional'); // 'test', 'traditional', 'quiz'

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
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteDeckFromStorage(title);
      setDecks(loadDecksFromStorage());
      // Reset selection if we deleted the selected deck
      if (selectedDeckTitle === title) setSelectedDeckTitle('ALL');
    }
  };

  const handleResetProgress = (title) => {
    if (window.confirm(`Are you sure you want to reset your study progress for "${title}"?`)) {
      const updatedDecks = decks.map(d => {
        if (title === 'ALL' || d.title === title) {
          d.cards = d.cards.map(c => {
            const newCard = { ...c };
            if (studyMode === 'traditional') newCard.status_traditional = 'unseen';
            if (studyMode === 'test') newCard.status_test = 'unseen';
            // Also reset legacy status so it doesn't fall back to it
            newCard.status = 'unseen'; 
            return newCard;
          });
          saveDeckToStorage(d);
        }
        return d;
      });
      setDecks(loadDecksFromStorage());
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

    const getStatus = (c) => studyMode === 'traditional' ? (c.status_traditional || c.status || 'unseen') : (c.status_test || c.status || 'unseen');
    const seenCards = cardsToStudy.filter(c => getStatus(c) !== 'unseen');
    let unseenCards = cardsToStudy.filter(c => getStatus(c) === 'unseen');

    if (cardsToStudy.length > 0 && unseenCards.length === 0) {
      alert("You have already completed all cards in this selection! Reset your progress to study them again.");
      return;
    }

    if (studyOrder === 'random') {
      // Fisher-Yates shuffle ONLY unseen cards
      for (let i = unseenCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unseenCards[i], unseenCards[j]] = [unseenCards[j], unseenCards[i]];
      }
      studyTitle += ' (Randomized)';
    } else {
      studyTitle += ' (Sequential)';
    }

    const finalDeckCards = [...seenCards, ...unseenCards];
    const initialIndex = seenCards.length;

    setActiveStudyDeck({
      title: studyTitle,
      cards: finalDeckCards,
      totalOriginalCards: totalOriginalCards,
      initialIndex: initialIndex
    });
    setIsStudying(true);
  };

  const handleUpdateCardStatus = (cardId, status, historyData) => {
    updateCardStatus(cardId, studyMode, status, historyData);
    // Silent reload of decks to update main dashboard progress in background
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
        ) : (
          <div style={{ textAlign: 'center', color: 'white' }}>
            <h2>Quiz Mode Coming Soon!</h2>
            <button onClick={() => setIsStudying(false)}>Back to Dashboard</button>
          </div>
        )}
      </div>
    );
  }

  const totalCards = decks.reduce((sum, deck) => sum + deck.cards.length, 0);

  return (
    <div className="app-container animate-fade-in">
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="text-gradient">SHRM 2026 Study App</h1>
        <p style={{ color: 'var(--text-muted)' }}>Master the SHRM curriculum with intelligent tracking and importing.</p>
      </header>

      <main style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'minmax(0, 1fr)' }}>

        <DataImporter onDeckLoaded={handleDeckLoaded} />

        {decks.length > 0 && (
          <section className="glass-panel animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Your Study Material</h2>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {decks.length} Topics | {totalCards} Cards
              </span>
            </div>

            {/* Capsules per deck */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
              {decks.map(deck => {
                const getStatus = (c) => studyMode === 'traditional' ? (c.status_traditional || c.status || 'unseen') : (c.status_test || c.status || 'unseen');
                const completedCount = deck.cards.filter(c => getStatus(c) !== 'unseen').length;
                const percent = deck.cards.length > 0 ? Math.round((completedCount / deck.cards.length) * 100) : 0;

                return (
                  <div key={deck.title} className="glass-panel" style={{
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    flex: '0 1 300px',
                    minWidth: '250px',
                    margin: 0
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{deck.title}</h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <span>{completedCount} / {deck.cards.length} completed</span>
                        <span>{percent}%</span>
                      </div>
                      <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', backgroundColor: 'var(--secondary)', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleResetProgress(deck.title)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--secondary)', color: 'var(--secondary)', minWidth: 'auto', boxShadow: 'none' }}>
                        Reset
                      </button>
                      <button
                        onClick={() => handleDeleteDeck(deck.title)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', minWidth: 'auto', boxShadow: 'none' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Study Configuration UI */}
            <div style={{ backgroundColor: 'var(--bg-darker)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Study Configuration</h3>

              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Study Mode:</label>
                  <select
                    value={studyMode}
                    onChange={(e) => setStudyMode(e.target.value)}
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '8px',
                      backgroundColor: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)',
                      fontFamily: 'inherit', fontSize: '1rem'
                    }}
                  >
                    <option value="traditional" style={{ backgroundColor: 'var(--bg-dark)' }}>Traditional (Self-Marking)</option>
                    <option value="test" style={{ backgroundColor: 'var(--bg-dark)' }}>AI Test Mode (Typing)</option>
                    <option value="quiz" style={{ backgroundColor: 'var(--bg-dark)' }} disabled>Multiple Choice Quiz (Coming Soon)</option>
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Select Topic(s):</label>
                  <select
                    value={selectedDeckTitle}
                    onChange={(e) => setSelectedDeckTitle(e.target.value)}
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '8px',
                      backgroundColor: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)',
                      fontFamily: 'inherit', fontSize: '1rem'
                    }}
                  >
                    <option value="ALL" style={{ backgroundColor: 'var(--bg-dark)' }}>All Topics ({totalCards} cards)</option>
                    {decks.map(d => (
                      <option key={d.title} value={d.title} style={{ backgroundColor: 'var(--bg-dark)' }}>{d.title} ({d.cards.length} cards)</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Order:</label>
                  <select
                    value={studyOrder}
                    onChange={(e) => setStudyOrder(e.target.value)}
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '8px',
                      backgroundColor: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)',
                      fontFamily: 'inherit', fontSize: '1rem'
                    }}
                  >
                    <option value="sequential" style={{ backgroundColor: 'var(--bg-dark)' }}>Sequential (In order)</option>
                    <option value="random" style={{ backgroundColor: 'var(--bg-dark)' }}>Randomized</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button onClick={handleStartStudying} style={{ fontSize: '1.1rem', padding: '1rem 3rem' }}>
                  Start Studying
                </button>
              </div>
            </div>

          </section>
        )}
      </main>
    </div>
  );
}

export default App;
