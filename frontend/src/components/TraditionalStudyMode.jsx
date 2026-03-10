import { useState, useEffect } from 'react';

export default function TraditionalStudyMode({ deck, onBack, onUpdateCardStatus }) {
    const [currentIndex, setCurrentIndex] = useState(deck.initialIndex || 0);
    const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

    const card = deck.cards[currentIndex];

    // Reset revealed state whenever the card changes
    useEffect(() => {
        setIsAnswerRevealed(false);
    }, [currentIndex, card]);

    const handleNext = () => {
        if (currentIndex < deck.cards.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            alert("You've finished the deck!");
            onBack();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleMarkComplete = () => {
        if (onUpdateCardStatus) {
            // green indicates mastery/completed
            onUpdateCardStatus(card.id, 'green');
            // Optimistically update local state so the button flips immediately
            card.status_traditional = 'green';
        }
        handleNext(); // Auto-advance
    };

    const handleMarkUnseen = () => {
        if (onUpdateCardStatus) {
            onUpdateCardStatus(card.id, 'unseen');
            // Optimistically update local state so the button flips immediately
            card.status_traditional = 'unseen';
        }
        // Don't auto-advance so they see it resets
    };

    const handleHideAnswer = () => {
        setIsAnswerRevealed(false);
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            {/* Topic Header at Top */}
            <div style={{
                textAlign: 'center',
                color: 'var(--secondary)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontSize: '0.85rem',
                fontWeight: '600',
                marginBottom: '1rem'
            }}>
                {card.topic}
            </div>

            {/* Top Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'none'
                    }}
                >
                    &larr; Exit Deck
                </button>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'white', fontWeight: 'bold' }}>
                        Card {currentIndex + 1} of {deck.cards.length}
                    </div>
                </div>
            </div>

            {/* Vertical Stack Container */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0',
                minHeight: '500px',
                position: 'relative'
            }}>
                {/* Question Side */}
                <div className="glass-panel" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'min-height 0.2s ease',
                    margin: 0,
                    overflow: 'hidden',
                    borderBottom: isAnswerRevealed ? 'none' : '1px solid var(--border-color)',
                    borderBottomLeftRadius: isAnswerRevealed ? '0' : '12px',
                    borderBottomRightRadius: isAnswerRevealed ? '0' : '12px',
                    flex: '0 0 auto',
                    minHeight: isAnswerRevealed ? '200px' : '500px'
                }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                        <h2 style={{ 
                            fontSize: '2.5rem', 
                            textAlign: 'center', 
                            margin: 0, 
                            fontWeight: '500'
                        }}>
                            {card.question}
                        </h2>
                    </div>

                    {!isAnswerRevealed && (
                        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                            <button onClick={() => setIsAnswerRevealed(true)} style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
                                Reveal Answer
                            </button>
                        </div>
                    )}
                </div>

                {/* Subtle Divider Line */}
                {isAnswerRevealed && (
                    <div style={{ 
                        height: '1px', 
                        background: 'var(--border-color)', 
                        opacity: 0.3, 
                        margin: '0 1.5rem',
                        zIndex: 2
                    }} />
                )}

                {/* Answer Side */}
                <div className="glass-panel" style={{
                    flex: isAnswerRevealed ? '1' : '0',
                    opacity: isAnswerRevealed ? 1 : 0,
                    maxHeight: isAnswerRevealed ? '1000px' : '0px',
                    transform: 'translateY(0)',
                    transition: 'opacity 0.2s ease, max-height 0.2s ease',
                    display: isAnswerRevealed ? 'flex' : 'none',
                    flexDirection: 'column',
                    margin: 0,
                    borderTop: 'none',
                    borderTopLeftRadius: '0',
                    borderTopRightRadius: '0',
                    overflow: 'hidden',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    {isAnswerRevealed && (
                        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: 'var(--secondary)', fontWeight: 'bold', fontSize: '1.2rem' }}>A</span>
                                <div style={{ height: '1px', flex: 1, background: 'var(--secondary)', opacity: 0.2 }} />
                            </div>
                            
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <p style={{ fontSize: '1.3rem', lineHeight: '1.7', margin: 0, color: 'rgba(255,255,255,0.9)' }}>
                                    {card.answer}
                                </p>
                            </div>

                            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button onClick={handleHideAnswer} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                        Hide Answer
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    {(card.status_traditional || 'unseen') !== 'unseen' ? (
                                        <button onClick={handleMarkUnseen} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-color)', color: 'white' }}>
                                            Reset (Mark Unseen)
                                        </button>
                                    ) : (
                                        <button onClick={handleMarkComplete} style={{ flex: 1, background: 'var(--success-color, #10b981)', color: 'white', fontWeight: 'bold' }}>
                                            Mark as Complete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    style={{
                        padding: '1rem 2rem',
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        opacity: currentIndex === 0 ? 0.3 : 1,
                        cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                        color: 'white'
                    }}
                >
                    &larr; Previous Card
                </button>
                <button
                    onClick={handleNext}
                    style={{
                        padding: '1rem 2rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid var(--border-color)',
                        color: 'white'
                    }}
                >
                    {currentIndex < deck.cards.length - 1 ? 'Skip / Next \u2192' : 'Finish Deck'}
                </button>
            </div>
        </div>
    );
}
