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
    const [missingCount, setMissingCount] = useState(0);
    
    const card = deck.cards[currentIndex];

    // Check for missing distractor data on mount (Phase 8 Cold Start)
    useEffect(() => {
        const missing = deck.cards.filter(c => {
            const vaultData = getDistractorFromVault(c.id);
            return !vaultData || vaultData.quizType !== deck.quizType;
        });
        
        if (missing.length > 0) {
            setMissingCount(missing.length);
            startBatchGeneration(missing);
        }
    }, [deck.cards, deck.quizType]);

    const startBatchGeneration = async (missingCards) => {
        setIsProcessing(true);
        await generateDistractorsBatch(missingCards, deck.quizType, (p) => setProgress(p));
        setIsProcessing(false);
    };

    // Load options for current card
    useEffect(() => {
        if (isProcessing) return;

        const aiData = getDistractorFromVault(card.id);
        
        if (aiData && aiData.distractors && aiData.quizType === deck.quizType) {
            const allOptions = [card.answer, ...aiData.distractors].sort(() => 0.5 - Math.random());
            setOptions(allOptions);
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

    if (isProcessing) {
        return (
            <div style={{ height: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>
                <div style={{ fontSize: '1.2rem', color: 'white', textAlign: 'center' }}>
                    <h2 style={{ marginBottom: '0.5rem' }}>Preparing {deck.quizType === 'intelligent' ? 'Intelligent' : 'Simple'} Quiz</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Designing high-fidelity distractors and rationales using Gemini 2.5...
                    </p>
                </div>
                <div style={{ width: '100%', maxWidth: '400px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'var(--secondary)', transition: 'width 0.3s ease' }}></div>
                </div>
                <div style={{ color: 'var(--secondary)', fontSize: '1rem', fontWeight: 'bold' }}>{progress}%</div>
            </div>
        );
    }

    const currentAiData = getDistractorFromVault(card.id);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <button onClick={onBack} className="secondary">Exit Quiz</button>
                <div style={{ fontWeight: 'bold' }}>Question {currentIndex + 1} of {deck.cards.length}</div>
            </div>

            <div className="glass-panel">
                <div style={{ color: 'var(--secondary)', marginBottom: '1rem', textAlign: 'center', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {deck.quizType === 'intelligent' ? 'Situational Judgment (SJI)' : 'Knowledge Recall'}
                </div>
                
                {deck.quizType === 'intelligent' && currentAiData?.scenario && (
                    <div style={{ 
                        padding: '1.2rem', 
                        backgroundColor: 'rgba(255,255,255,0.03)', 
                        borderRadius: '12px', 
                        marginBottom: '1.5rem',
                        borderLeft: '4px solid var(--primary)',
                        lineHeight: '1.6'
                    }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Workplace Scenario:</div>
                        {currentAiData.scenario}
                    </div>
                )}

                <h2 style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: '2rem', lineHeight: '1.4' }}>
                    {deck.quizType === 'intelligent' ? (currentAiData?.question || card.question) : card.question}
                </h2>

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
                        <button onClick={handleSubmit} disabled={!selectedOption || options.includes('Loading...')} style={{ width: '100%' }}>
                            Submit Selection
                        </button>
                    ) : (
                        <div className="animate-fade-in">
                            <div style={{ 
                                padding: '1.2rem', 
                                marginBottom: '1.5rem', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '12px', 
                                backgroundColor: 'var(--bg-darker)',
                                textAlign: 'left'
                            }}>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--secondary)', marginBottom: '0.8rem', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span className="badge">{currentAiData?.tag_bask || 'General'}</span>
                                    <span>•</span>
                                    <span className="badge">{currentAiData?.tag_behavior || 'Core Knowledge'}</span>
                                    {currentAiData?.shrm_principle && (
                                        <>
                                            <span>•</span>
                                            <span style={{ color: 'var(--primary)', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                                {currentAiData.shrm_principle}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <strong style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>Rationale:</strong> 
                                <div style={{ fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                                    {currentAiData?.rationale || "No rationale available for this item."}
                                </div>
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
