import { useState, useEffect } from 'react';

export default function QuizStudyMode({ deck, onBack, onUpdateCardStatus }) {
    const [currentIndex, setCurrentIndex] = useState(deck.initialIndex || 0);
    const [options, setOptions] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    
    const card = deck.cards[currentIndex];

    // Placeholder: This is where Phase 8's "Intelligent Distractor" logic will live
    useEffect(() => {
        const correct = card.answer;
        // Selection logic for 3 contextually similar distractors will go here
        const distractors = deck.cards
            .filter(c => c.id !== card.id && c.topic === card.topic)
            .map(c => c.answer)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
            
        const allOptions = [correct, ...distractors].sort(() => 0.5 - Math.random());
        setOptions(allOptions);
        setSelectedOption(null);
        setIsAnswered(false);
    }, [currentIndex, card, deck.cards]);

    const handleSelect = (option) => {
        if (isAnswered) return;
        setSelectedOption(option);
    };

    const handleSubmit = () => {
        if (!selectedOption) return;
        setIsAnswered(true);
        
        const isCorrect = selectedOption === card.answer;
        if (onUpdateCardStatus) {
            onUpdateCardStatus(card.id, isCorrect ? 'difficulty-5' : 'difficulty-1');
        }
    };

    const handleNext = () => {
        if (currentIndex < deck.cards.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            alert("Quiz Complete!");
            onBack();
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <button onClick={onBack} className="secondary">Exit Quiz</button>
                <div style={{ fontWeight: 'bold' }}>Question {currentIndex + 1} of {deck.cards.length}</div>
            </div>

            <div className="glass-panel">
                <div style={{ color: 'var(--secondary)', marginBottom: '1rem', textAlign: 'center' }}>
                    {card.topic}
                </div>
                <h2 style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: '2rem' }}>{card.question}</h2>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    {options.map((opt, i) => {
                        const isCorrect = opt === card.answer;
                        const isSelected = selectedOption === opt;
                        
                        let border = '1px solid var(--border-color)';
                        let bg = 'rgba(255,255,255,0.05)';
                        
                        if (isAnswered) {
                            if (isCorrect) {
                                border = '2px solid var(--secondary)';
                                bg = 'rgba(16, 185, 129, 0.1)';
                            } else if (isSelected) {
                                border = '2px solid #ef4444';
                                bg = 'rgba(239, 68, 68, 0.1)';
                            }
                        } else if (isSelected) {
                            border = '2px solid var(--primary)';
                            bg = 'rgba(99, 102, 241, 0.1)';
                        }

                        return (
                            <div 
                                key={i}
                                onClick={() => handleSelect(opt)}
                                style={{
                                    padding: '1.2rem',
                                    borderRadius: '12px',
                                    border,
                                    background: bg,
                                    cursor: isAnswered ? 'default' : 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem'
                                }}
                            >
                                <span style={{ fontWeight: 'bold', color: isSelected ? 'var(--primary)' : 'white' }}>
                                    {String.fromCharCode(65 + i)}
                                </span>
                                <span>{opt}</span>
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                    {!isAnswered ? (
                        <button onClick={handleSubmit} disabled={!selectedOption} style={{ width: '100%' }}>
                            Submit Selection
                        </button>
                    ) : (
                        <div className="animate-fade-in">
                            <div style={{ padding: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontStyle: 'italic', fontSize: '0.9rem' }}>
                                <strong>Rationale:</strong> This is a Knowledge Item from the {card.topic} domain.
                            </div>
                            <button onClick={handleNext} style={{ width: '100%' }}>
                                {currentIndex < deck.cards.length - 1 ? 'Next Question →' : 'Finish Quiz'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
