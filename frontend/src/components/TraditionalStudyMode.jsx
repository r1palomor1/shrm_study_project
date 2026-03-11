import { useState, useEffect, useRef } from 'react';

export default function TraditionalStudyMode({ deck, onBack, onUpdateCardStatus }) {
    const [currentIndex, setCurrentIndex] = useState(deck.initialIndex || 0);
    const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [aiInsight, setAiInsight] = useState("");
    const [isCoachLoading, setIsCoachLoading] = useState(false);

    const [statsViewMode, setStatsViewMode] = useState('circular'); // 'circular' or 'bar'

    const card = deck.cards[currentIndex];

    // Reset revealed state whenever the card changes
    useEffect(() => {
        setIsAnswerRevealed(false);
    }, [currentIndex, card]);

    const ribbonRef = useRef(null);

    // Auto-scroll ribbon to active dot
    useEffect(() => {
        if (ribbonRef.current) {
            const activeDot = ribbonRef.current.querySelector('[data-active="true"]');
            if (activeDot) {
                activeDot.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [currentIndex]);

    const handleScrollRibbon = (direction) => {
        if (ribbonRef.current) {
            const scrollAmount = 240; // Roughly 8-10 dots
            ribbonRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

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

    const counts = deck.cards.reduce((acc, c) => {
        const s = c.status_traditional || 'unseen';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {});

    const gradedCards = deck.cards.filter(c => c.status_traditional && c.status_traditional !== 'unseen');
    const totalWeight = gradedCards.reduce((sum, c) => {
        const rating = parseInt(c.status_traditional.split('-')[1]) || 0;
        return sum + rating;
    }, 0);
    
    const masteryIndex = gradedCards.length > 0 ? (totalWeight / gradedCards.length).toFixed(1) : "0.0";
    const masteryPercent = Math.round((gradedCards.length / deck.cards.length) * 100);

    // AI Coach Fetch Logic (Moved below initialization)
    useEffect(() => {
        if (showStats && !aiInsight) {
            const fetchCoachInsight = async () => {
                setIsCoachLoading(true);
                try {
                    const response = await fetch('/api/study-coach', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ masteryPercent, masteryIndex, counts })
                    });
                    const data = await response.json();
                    if (data.insight) setAiInsight(data.insight);
                } catch (err) {
                    console.error("Coach fetch failed:", err);
                } finally {
                    setIsCoachLoading(false);
                }
            };
            fetchCoachInsight();
        }
    }, [showStats, masteryPercent, masteryIndex, counts, aiInsight]);



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
            // Optimistically update local card status for immediate ribbon feedback
            card.status_traditional = newStatus;
        }
        handleNext(); 
    };



    const handleHideAnswer = () => {
        setIsAnswerRevealed(false);
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', paddingTop: '0.5rem' }}>
            {/* Unified Top Header Row */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.8rem'
            }}>
                {/* Left: Exit */}
                <button
                    onClick={onBack}
                    style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.85rem',
                        minWidth: 'auto'
                    }}
                >
                    &larr; Exit
                </button>

                {/* Center: Topic Title */}
                <div style={{
                    color: 'var(--secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    maxWidth: '40%',
                    textAlign: 'center',
                    lineHeight: '1.2'
                }}>
                    {card.topic}
                </div>

                {/* Right: Analytics + Count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <button 
                        onClick={() => setShowStats(!showStats)}
                        style={{
                            background: showStats ? 'var(--secondary)' : 'transparent',
                            border: '1px solid var(--border-color)',
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.75rem',
                            borderRadius: '20px',
                            color: showStats ? 'black' : 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 'bold',
                            minWidth: 'auto'
                        }}
                    >
                        <span>{masteryPercent}%</span>
                        <span style={{ opacity: 0.8 }}>📊</span>
                        <span>{masteryIndex}</span>
                    </button>
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        Card {currentIndex + 1} of {deck.cards.length}
                    </div>
                </div>
            </div>

                {/* Mastery Stats Drawer (Option 3) */}
                {/* Mastery Stats Drawer (Advanced Mockup Style) */}
                {showStats && (
                    <div className="glass-panel" style={{ 
                        margin: '1.5rem auto', 
                        maxWidth: '600px',
                        padding: '1.2rem 1.5rem 2.2rem 1.5rem', 
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        animation: 'fadeIn 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Upper Row: Progress Stats + Confidence Circle */}
                        <div style={{ 
                            display: 'flex', 
                            gap: '4rem', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            marginTop: '0.5rem',
                            padding: '0 1rem'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', minWidth: '180px' }}>
                                {/* Overall Progress */}
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>Overall Progress</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'white', lineHeight: '1.2' }}>{masteryPercent}% <span style={{ fontWeight: '300', fontSize: '1.2rem', opacity: 0.6 }}>Complete</span></div>
                                </div>

                                {/* Breakdown List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>Grading Stats</div>
                                    {[
                                        { k: 'difficulty-5', l: 'Perfect (5)', c: '#0ea5e9' },
                                        { k: 'difficulty-4', l: 'Mastered (4)', c: '#84cc16' },
                                        { k: 'difficulty-3', l: 'Learning (3)', c: '#eab308' },
                                        { k: 'difficulty-2', l: 'Growing (2)', c: '#f97316' },
                                        { k: 'difficulty-1', l: 'Struggling (1)', c: '#9d174d' }
                                    ].map(item => (
                                        <div key={item.k} style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.c, boxShadow: `0 0 6px ${item.c}` }} />
                                                <span style={{ fontSize: '0.9rem', color: item.c, fontWeight: '600' }}>{item.l}</span>
                                            </div>
                                            <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: '800' }}>{counts[item.k] || 0}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Donut Chart Component */}
                            <div style={{ 
                                position: 'relative', 
                                width: '130px', 
                                height: '130px', 
                                flexShrink: 0, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center'
                            }}>
                                <svg width="130" height="130" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                                    {(() => {
                                        const total = gradedCards.length || 1;
                                        const r = 40;
                                        const circ = 2 * Math.PI * r;
                                        let cumulative = 0;
                                        const tiers = [
                                            { k: 'difficulty-5', c: '#0ea5e9' },
                                            { k: 'difficulty-4', c: '#84cc16' },
                                            { k: 'difficulty-3', c: '#eab308' },
                                            { k: 'difficulty-2', c: '#f97316' },
                                            { k: 'difficulty-1', c: '#9d174d' }
                                        ];
                                        return tiers.map((tier) => {
                                            const count = counts[tier.k] || 0;
                                            const percentage = count / total;
                                            const strokeDasharray = `${percentage * circ} ${circ}`;
                                            const strokeDashoffset = -cumulative * circ;
                                            cumulative += percentage;
                                            return (
                                                <circle
                                                    key={tier.k}
                                                    cx="50" cy="50" r={r}
                                                    fill="transparent"
                                                    stroke={tier.c}
                                                    strokeWidth="10"
                                                    strokeDasharray={strokeDasharray}
                                                    strokeDashoffset={strokeDashoffset}
                                                    style={{ transition: 'stroke-dashoffset 0.5s ease, stroke-dasharray 0.5s ease' }}
                                                />
                                            );
                                        });
                                    })()}
                                </svg>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confidence</div>
                                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'white' }}>{masteryIndex}</div>
                                </div>
                            </div>
                        </div>

                        {/* Full Multi-Sentence Study Coach Insight - Centered Below Row */}
                        {(() => {
                            const confidence = parseFloat(masteryIndex);
                            const totalGraded = gradedCards.length;
                            
                            let intro = `You've done ${masteryPercent}% of the work`;
                            let mid = `average confidence is ${masteryIndex}`;
                            let status = "making solid progress";
                            let advice = "";
                            let highlight = "Struggling or Growing";
                            let highlightColor = '#f97316';

                            if (totalGraded === 0) {
                                return (
                                    <div style={{ marginTop: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                        Ready to start? Grade your first few cards to see your confidence grow!
                                    </div>
                                );
                            }

                            // Dynamic Logic
                            if (confidence >= 4.5) {
                                status = "absolutely crushing it";
                                advice = "your deck is almost entirely Perfect!";
                                highlight = "Perfect";
                                highlightColor = '#0ea5e9';
                            } else if (confidence >= 3.8) {
                                status = "showing strong mastery";
                                advice = "keep polishing those few Learning areas.";
                                highlight = "Learning";
                                highlightColor = '#eab308';
                            } else if ((counts['difficulty-1'] || 0) + (counts['difficulty-2'] || 0) > totalGraded * 0.3) {
                                status = "making steady progress";
                                advice = "but you have a few Struggling or Growing areas that need attention.";
                                highlight = "Struggling or Growing";
                                highlightColor = '#f97316';
                            } else {
                                status = "on the right track";
                                advice = "focus on moving your Growing cards into Mastered.";
                                highlight = "Growing";
                                highlightColor = '#f97316';
                            }

                            return (
                                <div style={{ 
                                    marginTop: '2rem', 
                                    padding: '1.2rem 1.6rem', 
                                    background: 'rgba(255,255,255,0.03)', 
                                    borderRadius: '20px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    maxWidth: '540px',
                                    margin: '2rem auto 0 auto',
                                    animation: 'fadeInUp 0.6s ease',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                                }}>
                                    {/* Static Heuristic Logic (Instant) */}
                                    <p style={{ 
                                        margin: '0 0 1rem 0', 
                                        fontSize: '0.85rem', 
                                        color: 'rgba(255,255,255,0.4)', 
                                        lineHeight: '1.4',
                                        textAlign: 'center',
                                        fontWeight: '500',
                                        letterSpacing: '0.3px'
                                    }}>
                                        CORE ANALYSIS: {intro}, and your {mid}. 
                                        You're {status}, {advice.split(highlight).map((part, i, arr) => (
                                            <span key={i}>
                                                {part}
                                                {i < arr.length - 1 && <span style={{ color: highlightColor, fontWeight: '700' }}>{highlight}</span>}
                                            </span>
                                        ))}
                                    </p>

                                    {/* AI Personalized Insight (Loaded) */}
                                    <div style={{ 
                                        paddingTop: '1rem',
                                        borderTop: '1px dashed rgba(255,255,255,0.1)',
                                        minHeight: '40px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {isCoachLoading ? (
                                            <div className="shimmer" style={{ width: '80%', height: '14px', borderRadius: '4px', opacity: 0.3 }} />
                                        ) : (
                                            <p style={{ 
                                                margin: 0, 
                                                fontSize: '0.95rem', 
                                                color: 'var(--secondary)', 
                                                lineHeight: '1.6',
                                                textAlign: 'center',
                                                fontWeight: '600',
                                                fontStyle: 'italic',
                                                animation: 'fadeIn 1s ease'
                                            }}>
                                                "{aiInsight || "Ready to provide your personalized study strategy..."}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* View Mode Toggle - Centered at Bottom */}
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            gap: '0.4rem',
                            marginTop: '2rem',
                            paddingBottom: '0.5rem'
                        }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.8, letterSpacing: '1px' }}>Display Progress as:</div>
                            <div style={{ 
                                display: 'flex', 
                                background: 'rgba(255,255,255,0.05)', 
                                padding: '3px', 
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <button 
                                    onClick={() => {
                                        setStatsViewMode('circular');
                                        setShowStats(false);
                                    }}
                                    style={{
                                        padding: '4px 12px',
                                        fontSize: '0.65rem',
                                        borderRadius: '8px',
                                        background: statsViewMode === 'circular' ? 'rgba(255,255,255,0.15)' : 'transparent',
                                        border: 'none',
                                        color: statsViewMode === 'circular' ? 'white' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontWeight: '800',
                                        minWidth: '70px',
                                        boxShadow: 'none'
                                    }}
                                >
                                    ROUND
                                </button>
                                <button 
                                    onClick={() => {
                                        setStatsViewMode('bar');
                                        setShowStats(false);
                                    }}
                                    style={{
                                        padding: '4px 12px',
                                        fontSize: '0.65rem',
                                        borderRadius: '8px',
                                        background: statsViewMode === 'bar' ? 'rgba(255,255,255,0.15)' : 'transparent',
                                        border: 'none',
                                        color: statsViewMode === 'bar' ? 'white' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontWeight: '800',
                                        minWidth: '70px',
                                        boxShadow: 'none'
                                    }}
                                >
                                    BAR
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress Ribbon Dots - Left Aligned Scrolling Row */}
                {/* Mastery Progress Display (Conditional Ribbon) */}
                <div style={{ 
                    position: 'relative',
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '15px',
                    padding: '0.6rem 0',
                    minHeight: '60px'
                }}>
                    {statsViewMode === 'circular' ? (
                        <>
                            <button
                                onClick={() => handleScrollRibbon('left')}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '1.8rem',
                                    cursor: 'pointer',
                                    padding: '0 10px',
                                    minWidth: 'auto',
                                    boxShadow: 'none',
                                    opacity: 0.6
                                }}
                            >
                                &lsaquo;
                            </button>

                            <div 
                                ref={ribbonRef}
                                style={{ 
                                    display: 'flex', 
                                    justifyContent: 'flex-start', 
                                    gap: '12px', 
                                    overflowX: 'auto',
                                    msOverflowStyle: 'none',
                                    scrollbarWidth: 'none',
                                    WebkitOverflowScrolling: 'touch',
                                    flex: 1,
                                    scrollBehavior: 'smooth'
                                }} className="hide-scrollbar">
                                {deck.cards.map((c, idx) => {
                                    const status = c.status_traditional || 'unseen';
                                    let dotColor = 'rgba(255,255,255,0.15)';
                                    if (status === 'difficulty-1') dotColor = '#9d174d';
                                    if (status === 'difficulty-2') dotColor = '#f97316';
                                    if (status === 'difficulty-3') dotColor = '#eab308';
                                    if (status === 'difficulty-4') dotColor = '#84cc16';
                                    if (status === 'difficulty-5') dotColor = '#0ea5e9';
                                    
                                    const isCurrent = idx === currentIndex;

                                    return (
                                        <button
                                            key={c.id}
                                            data-active={isCurrent}
                                            onClick={() => setCurrentIndex(idx)}
                                            style={{
                                                width: '26px',
                                                height: '26px',
                                                borderRadius: '50%',
                                                padding: 0,
                                                border: isCurrent ? '2px solid white' : 'none',
                                                background: dotColor,
                                                boxShadow: isCurrent ? '0 0 15px rgba(255,255,255,0.6)' : 'none',
                                                cursor: 'pointer',
                                                minWidth: '26px',
                                                flexShrink: 0,
                                                fontSize: isCurrent ? '0.85rem' : '0.65rem',
                                                color: 'white',
                                                fontWeight: '800'
                                            }}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => handleScrollRibbon('right')}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '1.8rem',
                                    cursor: 'pointer',
                                    padding: '0 10px',
                                    minWidth: 'auto',
                                    boxShadow: 'none',
                                    opacity: 0.6
                                }}
                            >
                                &rsaquo;
                            </button>
                        </>
                    ) : (
                        /* BRAINSCAPE STYLE PROPORTIONAL BAR */
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '15px' }}>
                            {/* Left: Previous Arrow */}
                            <div 
                                onClick={handlePrev}
                                style={{ 
                                    cursor: currentIndex > 0 ? 'pointer' : 'default', 
                                    opacity: currentIndex > 0 ? 1 : 0.3,
                                    fontSize: '1.8rem',
                                    color: 'var(--text-muted)'
                                }}
                            >
                                &lsaquo;
                            </div>

                            {/* Center: Progress Stack */}
                            <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '12px' }}>
                                {/* Label: X / Y */}
                                <div style={{ 
                                    color: 'var(--text-muted)', 
                                    fontSize: '1.1rem', 
                                    fontWeight: '500', 
                                    minWidth: '60px',
                                    textAlign: 'right'
                                }}>
                                    {currentIndex + 1} <span style={{ opacity: 0.4 }}>/</span> {deck.cards.length}
                                </div>

                                {/* The Mastery Bar */}
                                <div style={{ 
                                    flex: 1, 
                                    height: '24px', 
                                    background: 'rgba(255,255,255,0.05)', 
                                    borderRadius: '4px', 
                                    overflow: 'hidden',
                                    display: 'flex',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {(() => {
                                        const totalGraded = gradedCards.length || 1;
                                        // We represent the graded portion proportionally here
                                        const tiers = [
                                            { k: 'difficulty-1', c: '#9d174d' },
                                            { k: 'difficulty-2', c: '#f97316' },
                                            { k: 'difficulty-3', c: '#eab308' },
                                            { k: 'difficulty-4', c: '#84cc16' },
                                            { k: 'difficulty-5', c: '#0ea5e9' }
                                        ];

                                        return tiers.map(tier => {
                                            const count = counts[tier.k] || 0;
                                            if (count === 0) return null;
                                            // The bar is fixed length, this segment's width is relative to total cards
                                            const width = (count / deck.cards.length) * 100;
                                            return (
                                                <div 
                                                    key={tier.k}
                                                    style={{ 
                                                        width: `${width}%`, 
                                                        background: tier.c, 
                                                        height: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.75rem',
                                                        color: 'white',
                                                        fontWeight: 'bold',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                                                        transition: 'width 0.3s ease'
                                                    }}
                                                >
                                                    {count > 0 && count}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>

                                {/* Right: Remaining Cards Count */}
                                <div style={{ 
                                    padding: '2px 8px', 
                                    fontSize: '0.85rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: '500',
                                    minWidth: '35px',
                                    textAlign: 'center'
                                }}>
                                    {deck.cards.length - (currentIndex + 1)}
                                </div>
                            </div>

                            {/* Right: Next Arrow */}
                            <div 
                                onClick={handleNext}
                                style={{ 
                                    cursor: 'pointer', 
                                    fontSize: '1.8rem',
                                    color: 'var(--text-muted)'
                                }}
                            >
                                &rsaquo;
                            </div>
                        </div>
                    )}
                </div>
            
            {/* Vertical Stack Container */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0',
                minHeight: '400px',
                position: 'relative',
                marginTop: '0.5rem'
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
                    minHeight: isAnswerRevealed ? '140px' : '400px'
                }}>
                    <div style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        padding: isAnswerRevealed ? '0.5rem 1.5rem' : '1.5rem',
                        transition: 'padding 0.2s ease'
                    }}>
                        <h2 style={{ 
                            fontSize: isAnswerRevealed ? '2.2rem' : '2.5rem', 
                            textAlign: 'center', 
                            margin: 0, 
                            fontWeight: '500',
                            transition: 'font-size 0.2s'
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

                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>How well did you know this?</div>
                                
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem', width: '100%', marginBottom: '0.5rem' }}>
                                    {[
                                        { val: 1, label: 'Not at all', color: '#9d174d' },
                                        { val: 2, label: '', color: '#f97316' },
                                        { val: 3, label: '', color: '#eab308' },
                                        { val: 4, label: '', color: '#84cc16' },
                                        { val: 5, label: 'Perfectly', color: '#0ea5e9' }
                                    ].map((btn) => (
                                        <div key={btn.val} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
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
                                                    transition: 'background 0.2s ease, box-shadow 0.2s ease',
                                                    backfaceVisibility: 'hidden',
                                                    WebkitFontSmoothing: 'subpixel-antialiased'
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


            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <button
                    onClick={handlePrev}
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
                    &larr; Previous Card
                </button>
                <button
                    onClick={handleNext}
                    style={{
                        padding: '0.6rem 1.5rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid var(--border-color)',
                        color: 'white',
                        fontSize: '0.9rem'
                    }}
                >
                    {currentIndex < deck.cards.length - 1 ? 'Skip / Next \u2192' : 'Finish Deck'}
                </button>
            </div>
        </div>
    );
}
