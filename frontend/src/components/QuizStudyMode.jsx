import { useState, useEffect } from 'react';
import { getDistractorFromVault } from '../utils/storage';
import { generateDistractorsBatch } from '../utils/quizProcessor';

export default function QuizStudyMode({ deck, onBack, onUpdateCardStatus }) {
    const [currentIndex, setCurrentIndex] = useState(deck.initialIndex || 0);
    const [options, setOptions] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [previewFilter, setPreviewFilter] = useState(['correct', 'incorrect', 'unseen']);
    const [tempPreviewFilter, setTempPreviewFilter] = useState(['correct', 'incorrect', 'unseen']);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    
    const card = deck.cards[currentIndex];

    // Check for missing distractor data on mount (Phase 8 Cold Start)
    useEffect(() => {
        const missing = deck.cards.filter(c => {
            const vaultData = getDistractorFromVault(c.id, deck.quizType);
            return !vaultData || vaultData.quizType !== deck.quizType;
        });
        
        if (missing.length > 0) {
            startBatchGeneration(missing);
        }
    }, [deck.cards, deck.quizType]);

    const [quizError, setQuizError] = useState(null);

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
                
                // Refresh missing list
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

    // Load options for current card
    useEffect(() => {
        if (isProcessing) return;

        const aiData = getDistractorFromVault(card.id, deck.quizType);
        
        if (aiData && aiData.distractors && aiData.quizType === deck.quizType) {
            const allOptions = [card.answer, ...aiData.distractors.slice(0, 3)].sort(() => 0.5 - Math.random());
            setOptions(allOptions.slice(0, 4));
        } else {
            // Fallback for unexpected missing data
            setOptions([card.answer, "Loading...", "Loading...", "Loading..."]);
        }
        
        // Restore previous state if available
        const currentStatus = getQuizStatus(card);
        const alreadyAnswered = currentStatus !== 'unseen';
        
        if (alreadyAnswered) {
            setSelectedOption(card.answer); // Fallback: default to correct if we don't store selected index
            setIsAnswered(true);
        } else {
            setSelectedOption(null);
            setIsAnswered(false);
        }
    }, [currentIndex, card, isProcessing, deck.quizType]);

    const handleSelect = (option) => {
        if (isAnswered) return;
        setSelectedOption(option);
    };

    const handleSubmit = () => {
        if (!selectedOption) return;
        setIsAnswered(true);
        
        const isCorrect = selectedOption === card.answer;
        if (onUpdateCardStatus) {
            // Mapping: Correct = difficulty-5, Incorrect = difficulty-1
            onUpdateCardStatus(card.id, isCorrect ? 'difficulty-5' : 'difficulty-1');
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
        const s = c.status_quiz || 'unseen';
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
        <div style={{ maxWidth: '850px', margin: '0 auto', width: '100%', minHeight: 'calc(100vh - 6rem)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
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
                            id="quiz-preview-btn-v5"
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
                </div>
                <div style={{ fontWeight: 'bold' }}>Question {currentIndex + 1} of {deck.cards.length}</div>
            </div>

                <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', overflowY: 'auto' }}>
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

                    <h2 style={{ fontSize: '1.4rem', textAlign: 'center', marginBottom: '1.8rem', lineHeight: '1.4', fontWeight: '500' }}>
                        {deck.quizType === 'intelligent' ? (currentAiData?.question || card.question) : card.question}
                    </h2>

                    <div style={{ display: 'grid', gap: '1.2rem' }}>
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

                    {isAnswered && currentAiData?.rationale && (
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
                {!isAnswered ? (
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
                            disabled={!selectedOption || options.includes('Loading...')} 
                            style={{ 
                                padding: '0.6rem 1.5rem',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                opacity: (!selectedOption || options.includes('Loading...')) ? 0.3 : 1,
                                cursor: (!selectedOption || options.includes('Loading...')) ? 'not-allowed' : 'pointer',
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

            {/* SIMPLE QUIZ PREVIEW MODAL */}
            {showPreview && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: '#0a0b1e', zIndex: 2000, display: 'flex', flexDirection: 'column',
                    animation: 'fadeIn 0.2s ease-out', color: 'white'
                }}>
                    <div style={{
                        padding: '1rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: '#1a1b2e', position: 'sticky', top: 0
                    }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{deck.title?.split(' (')[0] || 'Deck'} Preview</h2>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Review your quiz results for all {deck.cards.length} cards.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                            {/* Multi-select Dropdown Filter */}
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
                                    <span>Filter Cards ({previewFilter.length === 3 ? 'All' : `${previewFilter.length} Selected`})</span>
                                    <span style={{ transform: showFilterMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '0.7rem' }}>▼</span>
                                </button>

                                {showFilterMenu && (
                                    <>
                                        {/* Transparent click-away layer */}
                                        <div 
                                            onClick={() => setShowFilterMenu(false)}
                                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2050 }} 
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            top: '110%',
                                            right: 0,
                                            width: '240px',
                                            background: '#1a1b2e',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            padding: '1.2rem',
                                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                            zIndex: 2100,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem',
                                            animation: 'fadeInUp 0.15s ease'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem', marginBottom: '0.2rem' }}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setTempPreviewFilter(['correct', 'incorrect', 'unseen']); }}
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--secondary)', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                                                >
                                                    SELECT ALL
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setTempPreviewFilter([]); }}
                                                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                                                >
                                                    CLEAR ALL
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                {[
                                                    { val: 'correct', label: 'Correct', color: 'var(--secondary)' },
                                                    { val: 'incorrect', label: 'Incorrect', color: '#ef4444' },
                                                    { val: 'unseen', label: 'Unseen', color: 'rgba(255,255,255,0.4)' }
                                                ].map(f => {
                                                    const count = deck.cards.filter(c => getQuizStatus(c) === f.val).length;
                                                    const isActive = tempPreviewFilter.includes(f.val);
                                                    return (
                                                        <div 
                                                            key={f.val}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isActive) setTempPreviewFilter(tempPreviewFilter.filter(x => x !== f.val));
                                                                else setTempPreviewFilter([...tempPreviewFilter, f.val]);
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.8rem',
                                                                cursor: 'pointer',
                                                                padding: '0.2rem 0',
                                                                opacity: isActive ? 1 : 0.4
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: '18px',
                                                                height: '18px',
                                                                borderRadius: '4px',
                                                                border: '2px solid',
                                                                borderColor: isActive ? f.color : 'rgba(255,255,255,0.2)',
                                                                background: isActive ? f.color : 'transparent',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '0.8rem',
                                                                color: isActive ? (f.val === 'unseen' ? 'white' : 'black') : 'white'
                                                            }}>
                                                                {isActive && '✓'}
                                                            </div>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: f.color }} />
                                                            <span style={{ fontSize: '0.9rem', color: 'white', flex: 1 }}>{f.label}</span>
                                                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}>{count}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setShowFilterMenu(false); }}
                                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setPreviewFilter([...tempPreviewFilter]); setShowFilterMenu(false); }}
                                                    style={{ flex: 1, background: 'var(--secondary)', color: 'black', border: 'none', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <button 
                                onClick={() => setShowPreview(false)} 
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--border-color)',
                                    padding: '0.6rem 1.5rem',
                                    fontSize: '0.9rem',
                                    minWidth: 'auto',
                                    color: 'white'
                                }}
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="custom-scrollbar">
                        {deck.cards.map((c, idx) => {
                            const status = getQuizStatus(c);
                            if (!previewFilter.includes(status)) return null;

                            return (
                                <div key={c.id} style={{
                                    display: 'flex', gap: '0.8rem', minHeight: '120px',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div style={{
                                        width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold', flexShrink: 0
                                    }}>
                                        {idx + 1}
                                    </div>

                                    <div style={{
                                        flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '12px', display: 'flex', overflow: 'hidden',
                                        borderLeft: `5px solid ${status === 'correct' ? 'var(--secondary)' : status === 'incorrect' ? '#ef4444' : 'rgba(255,255,255,0.1)'}`
                                    }}>
                                        {/* Question Area */}
                                        <div style={{
                                            padding: '0.8rem 1.2rem', flex: 0.7, borderRight: '1px solid rgba(255,255,255,0.06)',
                                            position: 'relative', wordBreak: 'break-word'
                                        }}>
                                            <span style={{ position: 'absolute', top: '0.8rem', left: '0.8rem', fontSize: '1.2rem', fontWeight: '900', color: 'rgba(255,255,255,0.05)' }}>Q</span>
                                            <div style={{ fontSize: '1.15rem', color: 'white', lineHeight: '1.5', marginTop: '0.5rem' }}>
                                                {c.question}
                                            </div>
                                        </div>

                                        {/* Answer Area */}
                                        <div style={{
                                            padding: '0.8rem 1.2rem', flex: 1, background: 'rgba(255,255,255,0.01)',
                                            position: 'relative', wordBreak: 'break-word'
                                        }}>
                                            <span style={{ position: 'absolute', top: '0.8rem', left: '0.8rem', fontSize: '1.2rem', fontWeight: '900', color: 'rgba(255,255,255,0.05)' }}>A</span>
                                            <div style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', marginTop: '0.5rem' }}>
                                                {c.answer}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ width: '100px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '1rem' }}>
                                        <span style={{ 
                                            fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase',
                                            color: status === 'correct' ? 'var(--secondary)' : status === 'incorrect' ? '#ef4444' : 'rgba(255,255,255,0.2)'
                                        }}>
                                            {status}
                                        </span>
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
