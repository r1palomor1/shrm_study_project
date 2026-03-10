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

    const handleRate = (rating) => {
        if (onUpdateCardStatus) {
            // Map 1-5 to meaningful statuses
            const statusMap = {
                1: 'difficulty-1', // Purple
                2: 'difficulty-2', // Orange
                3: 'difficulty-3', // Yellow
                4: 'difficulty-4', // Light Green
                5: 'difficulty-5'  // Blue
            };
            const newStatus = statusMap[rating];
            onUpdateCardStatus(card.id, newStatus);
            // Update local card status for immediate UI feedback
            card.status_traditional = newStatus;
        }
        handleNext(); 
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

            {/* Top Navigation & Progress Ribbon */}
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <button
                        onClick={onBack}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'none',
                            padding: '0.5rem 1rem',
                            fontSize: '0.9rem'
                        }}
                    >
                        &larr; Exit
                    </button>
                    <div style={{ color: 'white', fontWeight: 'bold' }}>
                        Card {currentIndex + 1} of {deck.cards.length}
                    </div>
                </div>

                {/* Progress Ribbon Dots - Left Aligned Scrolling Row */}
                <div style={{ 
                    position: 'relative',
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '10px',
                    padding: '0.5rem 0'
                }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem', opacity: 0.5, paddingRight: '5px' }}>&lsaquo;</div>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-start', 
                        gap: '12px', 
                        overflowX: 'auto',
                        padding: '10px 0',
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        WebkitOverflowScrolling: 'touch',
                        paddingLeft: '20px', // Prevent overlap with lsaquo
                        flex: 1
                    }} className="hide-scrollbar">
                        {deck.cards.map((c, idx) => {
                            const status = c.status_traditional || 'unseen';
                            let dotColor = 'rgba(255,255,255,0.15)'; // Deep Grey/Unseen
                            
                            if (status === 'difficulty-1') dotColor = '#9d174d'; // Purple
                            if (status === 'difficulty-2') dotColor = '#f97316'; // Orange
                            if (status === 'difficulty-3') dotColor = '#eab308'; // Yellow
                            if (status === 'difficulty-4') dotColor = '#84cc16'; // Green
                            if (status === 'difficulty-5') dotColor = '#0ea5e9'; // Blue
                            
                            const isCurrent = idx === currentIndex;

                            return (
                                <button
                                    key={c.id}
                                    onClick={() => setCurrentIndex(idx)}
                                    title={`Card ${idx + 1}`}
                                    style={{
                                        width: '24px', // Slightly larger for number
                                        height: '24px',
                                        borderRadius: '50%',
                                        padding: 0,
                                        border: isCurrent ? '2px solid white' : 'none',
                                        background: dotColor,
                                        boxShadow: isCurrent ? '0 0 12px rgba(255,255,255,0.6)' : 'none',
                                        cursor: 'pointer',
                                        minWidth: '24px',
                                        flexShrink: 0,
                                        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        transform: isCurrent ? 'scale(1.3)' : 'scale(1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.65rem',
                                        color: isCurrent ? 'white' : 'rgba(255,255,255,0.4)',
                                        fontWeight: '600'
                                    }}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem', opacity: 0.5, paddingLeft: '5px' }}>&rsaquo;</div>
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

                            <div style={{ marginTop: '1rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                                {/* SVG Collapse Icon */}
                                <button 
                                    onClick={handleHideAnswer}
                                    title="Collapse Answer"
                                    style={{
                                        position: 'absolute',
                                        left: '1rem',
                                        bottom: '2.5rem',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        padding: '0.5rem',
                                        minWidth: 'auto',
                                        boxShadow: 'none',
                                        width: '40px',
                                        height: '40px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: 0.8
                                    }}
                                >
                                    <svg width="24" height="24" viewBox="0 0 36 36" fill="white">
                                        <path d="M29,19.41a1,1,0,0,1-.71-.29L18,8.83,7.71,19.12a1,1,0,0,1-1.41-1.41L18,6,29.71,17.71A1,1,0,0,1,29,19.41Z" />
                                        <path d="M29,30.41a1,1,0,0,1-.71-.29L18,19.83,7.71,30.12a1,1,0,0,1-1.41-1.41L18,17,29.71,28.71A1,1,0,0,1,29,30.41Z" />
                                    </svg>
                                </button>

                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>How well did you know this?</div>
                                
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem', width: '100%' }}>
                                    {[
                                        { val: 1, label: 'Not at all', color: '#9d174d' },
                                        { val: 2, label: '', color: '#f97316' },
                                        { val: 3, label: '', color: '#eab308' },
                                        { val: 4, label: '', color: '#84cc16' },
                                        { val: 5, label: 'Perfectly', color: '#0ea5e9' }
                                    ].map((btn) => (
                                        <div key={btn.val} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                            <button 
                                                onClick={() => handleRate(btn.val)}
                                                style={{
                                                    width: '44px',
                                                    height: '44px',
                                                    borderRadius: '50%',
                                                    background: btn.color,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.1rem',
                                                    fontWeight: 'bold',
                                                    padding: 0,
                                                    minWidth: 'auto',
                                                    border: '2px solid rgba(255,255,255,0.1)',
                                                    transition: 'transform 0.2s ease'
                                                }}
                                                className="confidence-btn"
                                            >
                                                {btn.val}
                                            </button>
                                            {btn.label && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{btn.label}</span>}
                                        </div>
                                    ))}
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
