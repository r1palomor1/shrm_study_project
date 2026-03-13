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
                setQuizError('15 RPM Limit reached. Auto-resuming in 60s...');
                await new Promise(r => setTimeout(r, 60000));
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
        
        setSelectedOption(null);
        setIsAnswered(false);
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
            setIsAnswered(false);
            setSelectedOption(null);
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
                        {quizError ? 'Gemini is Resting...' : `Preparing ${deck.quizType === 'intelligent' ? 'Intelligent' : 'Simple'} Quiz`}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {quizError || 'Designing high-fidelity distractors and rationales using Gemini 2.5...'}
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

                <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ color: 'var(--secondary)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {deck.quizType === 'intelligent' ? 'Situational Judgment (SJI)' : 'Knowledge Recall'}
                        {/* SYSTEM MARKER Phase 11.7 v5 Styled Force */}
                        <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>SYNC_FORCE_V5</div>
                    </div>
                    
                    {deck.quizType === 'intelligent' && currentAiData?.scenario && (
                        <div style={{ 
                            padding: '1.5rem', 
                            backgroundColor: 'rgba(255,255,255,0.03)', 
                            borderRadius: '12px', 
                            marginBottom: '2rem',
                            borderLeft: '5px solid var(--primary)',
                            lineHeight: '1.6',
                            fontSize: '1rem'
                        }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Workplace Scenario:</div>
                            {currentAiData.scenario}
                        </div>
                    )}

                    <h2 style={{ fontSize: '1.6rem', textAlign: 'center', marginBottom: '2.5rem', lineHeight: '1.4' }}>
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
                            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{deck.title} Preview (Simple)</h2>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Review your quiz results for all {deck.cards.length} cards.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                                {[
                                    { val: 'correct', label: 'Correct', color: 'var(--secondary)' },
                                    { val: 'incorrect', label: 'Incorrect', color: '#ef4444' },
                                    { val: 'unseen', label: 'Unseen', color: 'rgba(255,255,255,0.4)' }
                                ].map(f => (
                                    <button
                                        key={f.val}
                                        onClick={() => {
                                            if (previewFilter.includes(f.val)) {
                                                setPreviewFilter(previewFilter.filter(x => x !== f.val));
                                            } else {
                                                setPreviewFilter([...previewFilter, f.val]);
                                            }
                                        }}
                                        style={{
                                            padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px',
                                            border: 'none', cursor: 'pointer',
                                            background: previewFilter.includes(f.val) ? f.color : 'transparent',
                                            color: previewFilter.includes(f.val) ? (f.val === 'unseen' ? 'white' : 'black') : 'rgba(255,255,255,0.4)',
                                            fontWeight: 'bold', transition: 'all 0.2s'
                                        }}
                                    >
                                        {f.label}
                                    </button>
                                ))}
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
                                    display: 'flex', gap: '1rem', padding: '1.2rem',
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '12px', borderLeft: `5px solid ${status === 'correct' ? 'var(--secondary)' : status === 'incorrect' ? '#ef4444' : 'rgba(255,255,255,0.1)'}`
                                }}>
                                    <div style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>{idx + 1}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: '500' }}>{c.question}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>Answer: </span>
                                            {c.answer}
                                        </div>
                                    </div>
                                    <div style={{ minWidth: '100px', textAlign: 'right' }}>
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
