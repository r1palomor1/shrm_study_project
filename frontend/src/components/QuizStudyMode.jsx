import { useState, useEffect } from 'react';
import { getDistractorFromVault } from '../utils/storage';
import { generateDistractorsBatch } from '../utils/quizProcessor';

export default function QuizStudyMode({ deck, onBack, onUpdateCardStatus }) {
    const [currentIndex, setCurrentIndex] = useState(deck.initialIndex || 0);
    const [options, setOptions] = useState([]);
    const [userSelectedIdx, setUserSelectedIdx] = useState(null);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [previewFilter, setPreviewFilter] = useState(['correct', 'incorrect', 'unseen']);
    const [tempPreviewFilter, setTempPreviewFilter] = useState(['correct', 'incorrect', 'unseen']);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [quizError, setQuizError] = useState(null);
    
    const card = deck.cards[currentIndex];

    // Check for missing distractor data on mount
    useEffect(() => {
        const missing = deck.cards.filter(c => {
            const vaultData = getDistractorFromVault(c.id, deck.quizType);
            return !vaultData || vaultData.quizType !== deck.quizType;
        });
        
        if (missing.length > 0) {
            startBatchGeneration(missing);
        }
    }, [deck.cards, deck.quizType]);

    const startBatchGeneration = async (missingCards) => {
        setIsProcessing(true);
        setQuizError(null);
        
        let cardsLeft = [...missingCards];
        while (cardsLeft.length > 0) {
            let rateLimited = false;
            await generateDistractorsBatch(cardsLeft, deck.quizType, (p, error) => {
                setProgress(p);
                if (error === 'RATE_LIMIT') rateLimited = true;
            });

            if (rateLimited) {
                setQuizError('Limit reached. Switching to Fallback Engine...');
                await new Promise(r => setTimeout(r, 2000));
                setQuizError(null);
                
                const missing = deck.cards.filter(c => {
                    const vaultData = getDistractorFromVault(c.id, deck.quizType);
                    return !vaultData || vaultData.quizType !== deck.quizType;
                });
                cardsLeft = missing;
            } else {
                break;
            }
        }
        
        setIsProcessing(false);
    };

    const getSeededShuffle = (array, seedString) => {
        let hash = 0;
        for (let i = 0; i < seedString.length; i++) {
            hash = ((hash << 5) - hash) + seedString.charCodeAt(i);
            hash |= 0;
        }
        let seed = Math.abs(hash);
        const result = [...array];
        let m = result.length, t, i;
        while (m) {
            seed = (seed * 9301 + 49297) % 233280;
            i = Math.floor((seed / 233280) * m--);
            t = result[m];
            result[m] = result[i];
            result[i] = t;
        }
        return result;
    };

    useEffect(() => {
        if (isProcessing) return;

        const aiData = getDistractorFromVault(card.id, deck.quizType);
        
        if (aiData && aiData.distractors && aiData.quizType === deck.quizType) {
            const baseOptions = [card.answer, ...aiData.distractors.slice(0, 3)];
            const shuffled = getSeededShuffle(baseOptions, card.id + deck.quizType);
            setOptions(shuffled.slice(0, 4));
        } else {
            setOptions([card.answer, "Loading...", "Loading...", "Loading..."]);
        }
        
        const currentStatus = getQuizStatus(card);
        const alreadyAnswered = currentStatus !== 'unseen';
        
        if (alreadyAnswered) {
            const savedOption = card[`selected_option_${deck.quizType}`];
            const savedOptionIndex = options.indexOf(savedOption);
            setUserSelectedIdx(savedOptionIndex !== -1 ? savedOptionIndex : null);
            setIsConfirmed(true);
        } else {
            setUserSelectedIdx(null);
            setIsConfirmed(false);
        }
        setShowHint(false);
    }, [currentIndex, card, isProcessing, deck.quizType, deck.cards, options.length]);

    const handleSelect = (index) => {
        if (isConfirmed) return;
        setUserSelectedIdx(index);
    };

    const handleSubmit = () => {
        if (userSelectedIdx === null) return;
        setIsConfirmed(true);
        
        const isCorrect = options[userSelectedIdx] === card.answer;
        if (onUpdateCardStatus) {
            onUpdateCardStatus(card.id, isCorrect ? 'difficulty-5' : 'difficulty-1', {
                selectedOption: options[userSelectedIdx]
            });
            
            const quizKey = `status_quiz_${deck.quizType}`;
            const optionKey = `selected_option_${deck.quizType}`;
            card[quizKey] = isCorrect ? 'difficulty-5' : 'difficulty-1';
            card[optionKey] = options[userSelectedIdx];
        }
    };

    const handleNext = () => {
        if (currentIndex < deck.cards.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onBack();
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const getQuizStatus = (c) => {
        const s = c[`status_quiz_${deck.quizType}`] || 'unseen';
        if (s === 'difficulty-5') return 'correct';
        if (s === 'difficulty-1') return 'incorrect';
        return 'unseen';
    };

    if (isProcessing) {
        return (
            <div style={{ height: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>
                <div style={{ fontSize: '1.2rem', color: 'white', textAlign: 'center' }}>
                    <h2 style={{ marginBottom: '0.5rem', color: quizError ? '#fbbf24' : 'white' }}>
                        {quizError ? 'Tutor is taking a quick break...' : `Crafting your personal ${deck.quizType === 'intelligent' ? 'Intelligent' : 'Simple'} Quiz`}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {quizError || 'Polishing your practice questions and detailed explanations...'}
                    </p>
                </div>
                <div style={{ width: '100%', maxWidth: '400px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                        width: `${progress}%`, 
                        height: '100%', 
                        background: quizError ? '#fbbf24' : 'var(--secondary)', 
                        transition: 'width 0.3s ease',
                        boxShadow: quizError ? '0 0 10px #fbbf24' : 'none'
                    }}></div>
                </div>
                <div style={{ color: quizError ? '#fbbf24' : 'var(--secondary)', fontSize: '1rem', fontWeight: 'bold' }}>{progress}%</div>
            </div>
        );
    }

    const currentAiData = getDistractorFromVault(card.id, deck.quizType);

    return (
        <div style={{ maxWidth: '850px', margin: '0 auto', width: '100%', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <button 
                        onClick={onBack} 
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            padding: '0.6rem 1.5rem',
                            fontSize: '0.9rem',
                            minWidth: 'auto',
                            color: 'white'
                        }}
                    >
                        &larr; Exit
                    </button>
                    {(deck.quizType?.toLowerCase() !== 'intelligent') && (
                        <button 
                            onClick={() => setShowPreview(true)} 
                            style={{ 
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                padding: '0.6rem 1.5rem',
                                fontSize: '0.9rem',
                                minWidth: 'auto',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            👁️ Preview
                        </button>
                    )}
                    {deck.quizType === 'intelligent' && (
                        <button 
                            onClick={() => setShowHint(!showHint)}
                            style={{ 
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                padding: '0.6rem 1rem',
                                fontSize: '1.2rem',
                                minWidth: 'auto',
                                color: showHint ? 'var(--secondary)' : 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                boxShadow: showHint ? '0 0 15px rgba(16, 185, 129, 0.2)' : 'none'
                            }}
                            title="Reveal Concept Hint"
                        >
                            {showHint ? '💡' : '🔦'}
                        </button>
                    )}
                </div>
                <div style={{ fontWeight: 'bold' }}>Question {currentIndex + 1} of {deck.cards.length}</div>
            </div>

            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.2rem', overflowY: 'auto' }}>
                <div style={{ color: 'var(--secondary)', marginBottom: '0.8rem', textAlign: 'center', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                    {deck.quizType === 'intelligent' ? 'Situational Judgment (SJI)' : 'Knowledge Recall'}
                </div>

                {deck.quizType === 'intelligent' && currentAiData?.scenario && (
                    <div style={{ 
                        padding: '1.2rem', 
                        backgroundColor: 'rgba(255,255,255,0.03)', 
                        borderRadius: '12px', 
                        marginBottom: '1.5rem',
                        borderLeft: '4px solid var(--primary)',
                        lineHeight: '1.5',
                        fontSize: '0.95rem'
                    }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Workplace Scenario:</div>
                        {currentAiData.scenario}
                    </div>
                )}

                {showHint && deck.quizType === 'intelligent' && (
                    <div className="animate-fade-in" style={{ 
                        padding: '0.8rem 1.2rem', 
                        backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                        borderRadius: '10px', 
                        marginBottom: '1.5rem',
                        border: '1px dashed var(--secondary)',
                        textAlign: 'center',
                        fontSize: '0.9rem',
                        color: 'var(--secondary)',
                        fontWeight: '600'
                    }}>
                        Concept Hint: <span style={{ textDecoration: 'underline' }}>{card.question}</span>
                    </div>
                )}

                <h2 style={{ fontSize: '1.3rem', textAlign: 'center', marginBottom: '1.5rem', lineHeight: '1.4', fontWeight: '500' }}>
                    {deck.quizType === 'intelligent' ? (currentAiData?.question || card.question) : card.question}
                </h2>

                <div style={{ display: 'grid', gap: '1.2rem' }}>
                    {options.map((opt, i) => {
                        const isCorrect = opt === card.answer;
                        const isSelected = userSelectedIdx === i;
                        
                        let border = '1px solid var(--border-color)';
                        let bg = 'rgba(255,255,255,0.05)';
                        
                        if (isConfirmed) {
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
                                onClick={() => handleSelect(i)}
                                style={{
                                    padding: '1.2rem',
                                    borderRadius: '12px',
                                    border,
                                    background: bg,
                                    cursor: isConfirmed ? 'default' : 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1.2rem',
                                    fontSize: '1rem'
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

                {isConfirmed && currentAiData?.rationale && (
                    <div className="animate-fade-in" style={{ 
                        marginTop: '2rem',
                        padding: '1.5rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        borderRadius: '12px',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        lineHeight: '1.6',
                        fontSize: '0.95rem'
                    }}>
                        <div style={{ color: 'var(--secondary)', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            🎓 Tutor Explanation:
                        </div>
                        {currentAiData.rationale}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '3rem', marginBottom: '2rem' }}>
                {!isConfirmed ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                        <button 
                            onClick={handlePrevious} 
                            disabled={currentIndex === 0 || options.includes('Loading...')}
                            style={{ 
                                padding: '0.6rem 1.5rem',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                opacity: (currentIndex === 0 || options.includes('Loading...')) ? 0.3 : 1,
                                cursor: (currentIndex === 0 || options.includes('Loading...')) ? 'not-allowed' : 'pointer',
                                color: 'white',
                                fontSize: '0.9rem'
                            }}
                        >
                            &larr; Previous Question
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            disabled={userSelectedIdx === null || options.includes('Loading...')} 
                            style={{ 
                                padding: '0.6rem 1.5rem',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                opacity: (userSelectedIdx === null || options.includes('Loading...')) ? 0.3 : 1,
                                cursor: (userSelectedIdx === null || options.includes('Loading...')) ? 'not-allowed' : 'pointer',
                                color: 'white',
                                fontSize: '0.9rem'
                            }}
                        >
                            Submit Selection
                        </button>
                    </div>
                ) : (
                    <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                        <button 
                            onClick={handlePrevious} 
                            disabled={currentIndex === 0}
                            style={{ 
                                padding: '0.6rem 1.5rem',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                opacity: currentIndex === 0 ? 0.3 : 1,
                                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                                color: 'white',
                                fontSize: '0.9rem'
                            }}
                        >
                            &larr; Previous Question
                        </button>
                        <button 
                            onClick={handleNext} 
                            style={{ 
                                padding: '0.6rem 1.5rem',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                color: 'white',
                                fontSize: '0.9rem'
                            }}
                        >
                            {currentIndex < deck.cards.length - 1 ? 'Next Question \u2192' : 'Finish Quiz'}
                        </button>
                    </div>
                )}
            </div>

            {showPreview && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: '#0a0b1e', zIndex: 2000, display: 'flex', flexDirection: 'column',
                    animation: 'fadeIn 0.2s ease-out', color: 'white'
                }}>
                    <div style={{
                        padding: '1rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: '#1a1b2e', position: 'sticky', top: 0, zIndex: 10
                    }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Deck Preview</h2>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Review your results for all {deck.cards.length} cards.
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            {/* Filter Dropdown */}
                            <div style={{ position: 'relative' }}>
                                <button 
                                    onClick={() => {
                                        setTempPreviewFilter([...previewFilter]);
                                        setShowFilterMenu(!showFilterMenu);
                                    }}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        padding: '0.6rem 1.2rem',
                                        borderRadius: '10px',
                                        color: 'white',
                                        fontSize: '0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.8rem',
                                        fontWeight: '600'
                                    }}
                                >
                                    <span>Filter ({previewFilter.length === 3 ? 'All' : `${previewFilter.length}`})</span>
                                    <span style={{ transform: showFilterMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '0.7rem' }}>▼</span>
                                </button>

                                {showFilterMenu && (
                                    <>
                                        <div onClick={() => setShowFilterMenu(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2050 }} />
                                        <div style={{
                                            position: 'fixed', top: '80px', right: '40px', width: '240px',
                                            background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px', padding: '1.2rem', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                            zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '1rem',
                                            animation: 'fadeInUp 0.15s ease'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
                                                <button onClick={() => setTempPreviewFilter(['correct', 'incorrect', 'unseen'])} style={{ background: 'transparent', border: 'none', color: 'var(--secondary)', fontSize: '0.7rem', fontWeight: 'bold' }}>ALL</button>
                                                <button onClick={() => setTempPreviewFilter([])} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 'bold' }}>CLEAR</button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                {[
                                                    { val: 'correct', l: 'Correct', c: 'var(--secondary)' },
                                                    { val: 'incorrect', l: 'Incorrect', c: '#ef4444' },
                                                    { val: 'unseen', l: 'Unseen', c: 'rgba(255,255,255,0.2)' }
                                                ].map(f => {
                                                    const isActive = tempPreviewFilter.includes(f.val);
                                                    return (
                                                        <div key={f.val} onClick={() => {
                                                            if (isActive) setTempPreviewFilter(tempPreviewFilter.filter(x => x !== f.val));
                                                            else setTempPreviewFilter([...tempPreviewFilter, f.val]);
                                                        }} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', opacity: isActive ? 1 : 0.4 }}>
                                                            <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: '2px solid', borderColor: isActive ? f.c : 'rgba(255,255,255,0.2)', background: isActive ? f.c : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                                                                {isActive && '✓'}
                                                            </div>
                                                            <span style={{ fontSize: '0.9rem', color: 'white', flex: 1 }}>{f.l}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <button onClick={() => { setPreviewFilter(tempPreviewFilter); setShowFilterMenu(false); }} className="button" style={{ padding: '0.6rem', width: '100%', borderRadius: '8px', fontSize: '0.8rem' }}>Apply Filters</button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button onClick={() => setShowPreview(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '0.6rem 1.5rem', fontSize: '0.9rem', color: 'white' }}>
                                Close Preview
                            </button>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }} className="custom-scrollbar">
                        {deck.cards.filter(c => previewFilter.includes(getQuizStatus(c))).map((c, originalIdx) => {
                            const status = getQuizStatus(c);
                            const displayIdx = deck.cards.indexOf(c) + 1;
                            return (
                                <div key={c.id} style={{ display: 'flex', gap: '0.8rem', minHeight: '80px', marginBottom: '1rem' }}>
                                    <div style={{ width: '24px', flexShrink: 0, color: 'var(--text-muted)' }}>{displayIdx}</div>
                                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', borderLeft: `4px solid ${status === 'correct' ? 'var(--secondary)' : status === 'incorrect' ? '#ef4444' : 'rgba(255,255,255,0.1)'}` }}>
                                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{c.question}</div>
                                        <div style={{ color: 'white', fontWeight: 'bold', marginTop: '0.3rem' }}>{c.answer}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
