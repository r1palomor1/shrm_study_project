import { useState } from 'react';
import { evaluateAnswerViaAI } from '../utils/aiScoring';
import { GradeBadge } from './GradeBadge';

export default function FlashcardStudyMode({ deck, onBack, onUpdateCardStatus }) {
    const [currentIndex, setCurrentIndex] = useState(deck.initialIndex || 0);
    const [userInput, setUserInput] = useState('');
    const [isFlipped, setIsFlipped] = useState(false);
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Track answered cards in current session so Previous button restores state
    const [sessionHistory, setSessionHistory] = useState({});

    const card = deck.cards[currentIndex];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userInput.trim()) return;

        setIsLoading(true);

        // Call the backend AI semantic grader
        const evaluation = await evaluateAnswerViaAI(
            card.question,
            card.answer,
            userInput
        );

        setResults(evaluation);
        setIsFlipped(true);
        setIsLoading(false);

        // Save to session history
        setSessionHistory(prev => ({
            ...prev,
            [currentIndex]: {
                userInput,
                results: evaluation,
                isFlipped: true
            }
        }));

        // Save progress and permanent history up to the parent component
        if (onUpdateCardStatus) {
            onUpdateCardStatus(card.id, evaluation.grade, {
                userInput: userInput,
                percentage: evaluation.percentage,
                feedback: evaluation.feedback
            });
        }
    };

    const nextCard = () => {
        if (currentIndex < deck.cards.length - 1) {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);

            const nextCardData = deck.cards[nextIdx];

            // Restore from history if it exists, otherwise reset
            if (sessionHistory[nextIdx]) {
                setUserInput(sessionHistory[nextIdx].userInput);
                setResults(sessionHistory[nextIdx].results);
                setIsFlipped(sessionHistory[nextIdx].isFlipped);
            } else if (nextCardData.status_test && nextCardData.status_test !== 'unseen') {
                setUserInput(nextCardData.history_test?.userInput || '');
                setResults({
                    grade: nextCardData.history_test?.grade || nextCardData.status_test,
                    percentage: nextCardData.history_test?.percentage || 100,
                    feedback: nextCardData.history_test?.feedback || 'Previous test answer recorded.'
                });
                setIsFlipped(true);
            } else {
                setUserInput('');
                setIsFlipped(false);
                setResults(null);
            }
        } else {
            alert("You've finished the deck!");
            onBack();
        }
    };

    const prevCard = () => {
        if (currentIndex > 0) {
            const prevIdx = currentIndex - 1;
            setCurrentIndex(prevIdx);

            const prevCardData = deck.cards[prevIdx];

            // Restore from history if it exists, otherwise reset
            if (sessionHistory[prevIdx]) {
                setUserInput(sessionHistory[prevIdx].userInput);
                setResults(sessionHistory[prevIdx].results);
                setIsFlipped(sessionHistory[prevIdx].isFlipped);
            } else if (prevCardData.status_test && prevCardData.status_test !== 'unseen') {
                setUserInput(prevCardData.history_test?.userInput || '');
                setResults({
                    grade: prevCardData.history_test?.grade || prevCardData.status_test,
                    percentage: prevCardData.history_test?.percentage || 100,
                    feedback: prevCardData.history_test?.feedback || 'Previous test answer recorded.'
                });
                setIsFlipped(true);
            } else {
                setUserInput('');
                setIsFlipped(false);
                setResults(null);
            }
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            {/* Top Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
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

            {/* Flashcard Container */}
            <div className="glass-panel" style={{
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            }}>

                {/* Topic Header */}
                <div style={{
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '1rem',
                    marginBottom: '1.5rem',
                    textAlign: 'center',
                    color: 'var(--secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                }}>
                    {card.topic}
                </div>

                {/* Question Area */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <h2 style={{ fontSize: '2rem', textAlign: 'center', margin: 0, fontWeight: '500' }}>
                        {card.question}
                    </h2>
                </div>

                {/* Answer / Input Area */}
                <div style={{ marginTop: '2rem' }}>
                    {!isFlipped ? (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <textarea
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Type your answer here..."
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    border: '1px solid var(--border-color)',
                                    color: 'white',
                                    fontFamily: 'inherit',
                                    fontSize: '1rem',
                                    resize: 'vertical',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={prevCard}
                                    disabled={currentIndex === 0}
                                    style={{
                                        flex: 1,
                                        padding: '1rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        opacity: currentIndex === 0 ? 0.4 : 1,
                                        cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                                        boxShadow: 'none',
                                        color: 'white'
                                    }}
                                >
                                    Previous
                                </button>
                                <button type="submit" disabled={isLoading} style={{ flex: 1, padding: '1rem', opacity: isLoading ? 0.7 : 1, border: '1px solid var(--secondary)' }}>
                                    {isLoading ? 'AI Analyzing...' : 'Check Answer'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="animate-fade-in" style={{
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>Actual Answer</h3>
                                {results && <GradeBadge grade={results.grade} percentage={results.percentage} />}
                            </div>

                            <p style={{ fontSize: '1.2rem', lineHeight: '1.6', margin: '0 0 1.5rem 0' }}>
                                {card.answer}
                            </p>

                            <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Your Answer:</span>
                                <p style={{ margin: '0 0 1rem 0' }}>{userInput}</p>
                                {results && results.feedback && (
                                    <div style={{
                                        borderTop: '1px solid var(--border-color)',
                                        paddingTop: '0.75rem',
                                        color: 'var(--secondary)',
                                        fontStyle: 'italic',
                                        fontSize: '0.95rem'
                                    }}>
                                        <strong style={{ color: 'var(--text-main)' }}>AI Feedback:</strong> {results.feedback}
                                        
                                        {results.missing_keywords && results.missing_keywords.length > 0 && (
                                            <div style={{ marginTop: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 'bold' }}>Key Concepts Missed:</span>
                                                {results.missing_keywords.map((kw, i) => (
                                                    <span key={i} style={{ 
                                                        background: 'rgba(239, 68, 68, 0.1)', 
                                                        color: '#ef4444', 
                                                        padding: '0.2rem 0.6rem', 
                                                        borderRadius: '6px', 
                                                        fontSize: '0.75rem',
                                                        border: '1px solid rgba(239, 68, 68, 0.2)'
                                                    }}>
                                                        {kw}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={prevCard}
                                    disabled={currentIndex === 0}
                                    style={{
                                        flex: 1,
                                        padding: '1rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        opacity: currentIndex === 0 ? 0.4 : 1,
                                        cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                                        boxShadow: 'none',
                                        color: 'white'
                                    }}
                                >
                                    Previous
                                </button>
                                <button onClick={nextCard} style={{ flex: 1, padding: '1rem', border: '1px solid var(--secondary)' }}>
                                    {currentIndex < deck.cards.length - 1 ? 'Next Card \u2192' : 'Finish Deck'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
