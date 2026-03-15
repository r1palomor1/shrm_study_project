import { useState, useEffect, useRef } from 'react';

export default function TraditionalStudyMode({ deck, onBack, onUpdateCardStatus }) {
    const [currentIndex, setCurrentIndex] = useState(deck.initialIndex || 0);
    const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [statsViewMode, setStatsViewMode] = useState('circular'); // 'circular' or 'bar'
    const [showPreview, setShowPreview] = useState(false);
    const [previewFilter, setPreviewFilter] = useState(['1', '2', '3', '4', '5', 'unseen']); // Default all
    const [tempPreviewFilter, setTempPreviewFilter] = useState(['1', '2', '3', '4', '5', 'unseen']);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [pendingScores, setPendingScores] = useState({}); // Tracking batch edits
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
    
    // Mastery Calculations
    const masteryIndex = gradedCards.length > 0 ? (totalWeight / gradedCards.length).toFixed(1) : "0.0";
    const masteryPercent = Math.round((gradedCards.length / deck.cards.length) * 100);



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
        <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', paddingTop: '0' }}>
            {/* Unified Top Header Row */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '0.6rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.5rem',
                position: 'sticky',
                top: 0,
                backgroundColor: 'transparent',
                zIndex: 100,
                paddingTop: '0.5rem'
            }}>
                {/* Left: Exit + Preview */}
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
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
                    <button
                        onClick={() => setShowPreview(true)}
                        title="Preview All Cards"
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.85rem',
                            minWidth: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        👁️ Preview
                    </button>
                </div>

                {/* Center: Topic Title */}
                <div style={{
                    color: 'var(--secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontSize: '0.85rem',
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
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
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

                            const strugglingCount = counts['difficulty-1'] || 0;
                            const growingCount = counts['difficulty-2'] || 0;

                            // Dynamic Logic - Prioritize Struggling
                            if (strugglingCount > 0) {
                                status = "facing some obstacles";
                                advice = `with ${strugglingCount} Struggling cards that need immediate review.`;
                                highlight = "Struggling";
                                highlightColor = '#9d174d';
                            } else if (confidence >= 4.5) {
                                status = "absolutely crushing it";
                                advice = "your deck is almost entirely Perfect!";
                                highlight = "Perfect";
                                highlightColor = '#0ea5e9';
                            } else if (confidence >= 3.8) {
                                status = "showing strong mastery";
                                advice = "keep polishing those few Learning areas.";
                                highlight = "Learning";
                                highlightColor = '#eab308';
                            } else if (strugglingCount + growingCount > totalGraded * 0.3) {
                                status = "making steady progress";
                                advice = "but you have several areas that need attention.";
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
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {/* Unified Insight Row */}
                                    <p style={{ 
                                        margin: '0', 
                                        fontSize: '0.95rem', 
                                        color: 'rgba(255,255,255,0.85)', 
                                        lineHeight: '1.6',
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
                                                width: '30px',
                                                height: '30px',
                                                borderRadius: '50%',
                                                padding: 0,
                                                border: isCurrent ? '2px solid white' : 'none',
                                                background: dotColor,
                                                boxShadow: isCurrent ? '0 0 10px rgba(255,255,255,0.4)' : 'none',
                                                cursor: 'pointer',
                                                minWidth: '30px',
                                                flexShrink: 0,
                                                fontSize: '0.825rem',
                                                color: 'white',
                                                fontWeight: '800',
                                                transition: 'all 0.2s ease'
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
                                                        fontSize: '0.825rem',
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
                                    fontSize: '1.1rem',
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
                marginTop: '0.2rem'
            }}>
                {/* Question Side */}
                <div className="glass-panel" style={{
                    display: 'flex',
                    flexDirection: 'column',
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
                        padding: isAnswerRevealed ? '1.5rem' : '3.5rem 1.5rem',
                    }}>
                        <h2 style={{ 
                            fontSize: isAnswerRevealed ? '2.4rem' : '2.8rem', 
                            textAlign: 'center', 
                            margin: 0, 
                            fontWeight: '500',
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
                        <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: 'var(--secondary)', fontWeight: 'bold', fontSize: '1.2rem' }}>A</span>
                                <div style={{ height: '1px', flex: 1, background: 'var(--secondary)', opacity: 0.2 }} />
                            </div>
                            
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <p style={{ fontSize: '1.45rem', lineHeight: '1.5', margin: 0, color: 'rgba(255,255,255,0.9)' }}>
                                    {card.answer}
                                </p>
                            </div>

                            <div style={{ marginTop: '0.5rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
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
                                
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem', width: '100%', marginBottom: '0.2rem' }}>
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
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        color: 'white',
                        fontSize: '0.9rem'
                    }}
                >
                    {currentIndex < deck.cards.length - 1 ? 'Skip / Next \u2192' : 'Finish Deck'}
                </button>
            </div>

            {/* FULL SCREEN CARD PREVIEW MODAL */}
            {showPreview && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: '#0a0b1e',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'fadeIn 0.2s ease-out',
                    color: 'white'
                }}>
                    <style>{`
                        .preview-modal-content::-webkit-scrollbar { width: 8px; }
                        .preview-modal-content::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
                        .preview-modal-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                        .preview-modal-content::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                        .score-select option { background: #1a1b2e; color: white; }
                    `}</style>
                    {/* Header */}
                    <div style={{
                        padding: '1rem 1.2rem',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#1a1b2e',
                        zIndex: 10,
                        position: 'sticky',
                        top: 0
                    }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'white' }}>
                                {deck.title?.split(' (')[0] || 'Deck'} Preview
                            </h2>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Review questions, answers, and adjust scores for all {deck.cards.length} cards.
                            </p>
                        </div>
                        
                        {/* ACTION GROUP: Filter + Close Buttons closer together */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
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
                                    <span>Filter Cards ({previewFilter.length === 6 ? 'All' : `${previewFilter.length} Selected`})</span>
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
                                            position: 'fixed',
                                            top: '120px',
                                            right: 'calc(50% - 410px)',
                                            width: '260px',
                                            background: '#1a1b2e',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            padding: '1.2rem',
                                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                            zIndex: 9999,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem',
                                            animation: 'fadeInUp 0.15s ease'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem', marginBottom: '0.2rem' }}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setTempPreviewFilter(['1', '2', '3', '4', '5', 'unseen']); }}
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
                                                    { val: '1', l: 'Struggling (1)', c: '#9d174d' },
                                                    { val: '2', l: 'Growing (2)', c: '#f97316' },
                                                    { val: '3', l: 'Learning (3)', c: '#eab308' },
                                                    { val: '4', l: 'Mastered (4)', c: '#84cc16' },
                                                    { val: '5', l: 'Perfect (5)', c: '#0ea5e9' },
                                                    { val: 'unseen', l: 'Unseen (?)', c: 'rgba(255,255,255,0.2)' }
                                                ].map(f => {
                                                    const count = deck.cards.filter(c => {
                                                        const status = c.status_traditional || 'unseen';
                                                        return status === 'unseen' ? f.val === 'unseen' : status.split('-')[1] === f.val;
                                                    }).length;
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
                                                                borderColor: isActive ? f.c : 'rgba(255,255,255,0.2)',
                                                                background: isActive ? f.c : 'transparent',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '0.8rem',
                                                                color: 'white'
                                                            }}>
                                                                {isActive && '✓'}
                                                            </div>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: f.c }} />
                                                            <span style={{ fontSize: '0.9rem', color: 'white', flex: 1 }}>{f.l}</span>
                                                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', fontWeight: 'bold', marginLeft: '-0.3rem' }}>{count}</span>
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
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'rgba(255,255,255,0.8)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    padding: '0.6rem 1.4rem',
                                    borderRadius: '10px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                                }}
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        padding: '1.5rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem',
                        paddingBottom: Object.keys(pendingScores).length > 0 ? '8rem' : '4rem' 
                    }} className="custom-scrollbar preview-modal-content">
                        {deck.cards.map((c, idx) => {
                            const originalStatus = c.status_traditional || 'unseen';
                            const scoreKey = originalStatus === 'unseen' ? 'unseen' : originalStatus.split('-')[1];
                            
                            // Filter logic STRICTLY uses original status to prevent cards from disappearing while editing
                            if (!previewFilter.includes(scoreKey)) return null;

                            // Display Logic uses pending score if available
                            const displayStatus = pendingScores[c.id] || originalStatus;
                            let dotColor = 'rgba(255,255,255,0.1)';
                            if (displayStatus === 'difficulty-1') dotColor = '#9d174d';
                            if (displayStatus === 'difficulty-2') dotColor = '#f97316';
                            if (displayStatus === 'difficulty-3') dotColor = '#eab308';
                            if (displayStatus === 'difficulty-4') dotColor = '#84cc16';
                            if (displayStatus === 'difficulty-5') dotColor = '#0ea5e9';

                            return (
                                <div key={c.id} style={{
                                    display: 'flex',
                                    alignItems: 'stretch',
                                    gap: '0.8rem',
                                    minHeight: '160px',
                                    transition: 'all 0.3s ease',
                                    opacity: pendingScores[c.id] ? 1 : 0.8,
                                    transform: pendingScores[c.id] ? 'scale(1.005)' : 'none'
                                }}>
                                    {/* Card Number & Progress Indicator */}
                                    <div style={{
                                        width: '24px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.9rem',
                                        color: 'var(--text-muted)',
                                        fontWeight: 'bold',
                                        flexShrink: 0
                                    }}>
                                        {idx + 1}
                                    </div>

                                    {/* Main Card Content */}
                                    <div style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        borderLeft: `5px solid ${dotColor}`
                                    }}>
                                        {/* Question Area */}
                                        <div style={{
                                            padding: '1.2rem',
                                            flex: '0 0 32%', 
                                            borderRight: '1px solid rgba(255,255,255,0.06)',
                                            wordBreak: 'break-word',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5' }}>
                                                <strong style={{ color: '#0ea5e9', marginRight: '0.4rem', fontSize: '0.9rem' }}>Q:</strong>
                                                {c.question}
                                            </div>
                                        </div>

                                        {/* Answer Area */}
                                        <div style={{
                                            padding: '1.2rem',
                                            flex: 1,
                                            background: 'rgba(255,255,255,0.01)',
                                            wordBreak: 'break-word'
                                        }}>
                                            <div style={{ fontSize: '1.1rem', color: 'white', lineHeight: '1.5', fontWeight: '500' }}>
                                                <strong style={{ color: 'var(--primary)', marginRight: '0.4rem', fontSize: '0.9rem' }}>A:</strong>
                                                {c.answer}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stylized Badge Selector */}
                                    <div style={{
                                        width: '130px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-end',
                                        justifyContent: 'center',
                                        gap: '0.4rem',
                                        paddingRight: '1rem'
                                    }}>
                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Score</div>
                                        <div style={{ position: 'relative', width: '100%' }}>
                                            <div style={{
                                                padding: '0.5rem 0.8rem',
                                                borderRadius: '8px',
                                                background: 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${
                                                    displayStatus === 'unseen' ? 'rgba(255,255,255,0.1)' :
                                                    displayStatus === 'difficulty-1' ? '#9d174d' :
                                                    displayStatus === 'difficulty-2' ? '#f97316' :
                                                    displayStatus === 'difficulty-3' ? '#eab308' :
                                                    displayStatus === 'difficulty-4' ? '#84cc16' :
                                                    '#0ea5e9'
                                                }`,
                                                color: 'white',
                                                fontSize: '0.85rem',
                                                textAlign: 'center',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                minWidth: '110px'
                                            }}>
                                                <span>{
                                                    displayStatus === 'unseen' ? '--' :
                                                    displayStatus === 'difficulty-1' ? '1 Struggling' :
                                                    displayStatus === 'difficulty-2' ? '2 Growing' :
                                                    displayStatus === 'difficulty-3' ? '3 Learning' :
                                                    displayStatus === 'difficulty-4' ? '4 Mastered' :
                                                    '5 Perfect'
                                                }</span>
                                                <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>▼</span>
                                            </div>
                                            <select
                                                value={displayStatus === 'unseen' ? '' : displayStatus.split('-')[1]}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? 'unseen' : parseInt(e.target.value);
                                                    if (val === 'unseen' || !isNaN(val)) {
                                                        const statusMap = {
                                                            1: 'difficulty-1',
                                                            2: 'difficulty-2',
                                                            3: 'difficulty-3',
                                                            4: 'difficulty-4',
                                                            5: 'difficulty-5',
                                                            'unseen': 'unseen'
                                                        };
                                                        const newStatus = statusMap[val];
                                                        
                                                        if (newStatus === originalStatus) {
                                                            const nextPending = { ...pendingScores };
                                                            delete nextPending[c.id];
                                                            setPendingScores(nextPending);
                                                        } else {
                                                            setPendingScores({
                                                                ...pendingScores,
                                                                [c.id]: newStatus
                                                            });
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    opacity: 0,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="">-- Clear Score</option>
                                                <option value="1">1 Struggling</option>
                                                <option value="2">2 Growing</option>
                                                <option value="3">3 Learning</option>
                                                <option value="4">4 Mastered</option>
                                                <option value="5">5 Perfect</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* STICKY BATCH ACTIONS FOOTER */}
                    {Object.keys(pendingScores).length > 0 && (
                        <div style={{
                            position: 'fixed',
                            bottom: '2.5rem',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 'auto',
                            minWidth: '400px',
                            background: '#1a1b2e',
                            border: '1px solid var(--secondary)',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '3rem',
                            padding: '0.8rem 2.2rem',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
                            zIndex: 3000,
                            animation: 'fadeInUp 0.4s cubic-bezier(0.19, 1, 0.22, 1)'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: 'var(--secondary)', fontWeight: '900', fontSize: '1.1rem', letterSpacing: '0.5px' }}>
                                    {Object.keys(pendingScores).length} Changes Ready
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Review highlighted cards before saving</span>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button 
                                    onClick={() => setPendingScores({})}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'rgba(255,255,255,0.8)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        padding: '0.6rem 1.5rem',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => {
                                        Object.entries(pendingScores).forEach(([id, newStatus]) => {
                                            onUpdateCardStatus(id, newStatus);
                                            const cardToSync = deck.cards.find(dc => dc.id === id);
                                            if (cardToSync) cardToSync.status_traditional = newStatus;
                                        });
                                        setPendingScores({});
                                    }}
                                    style={{
                                        background: 'var(--secondary)',
                                        color: 'black',
                                        border: 'none',
                                        padding: '0.6rem 1.8rem',
                                        borderRadius: '8px',
                                        fontWeight: '900',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 0 15px var(--secondary-glow)'
                                    }}
                                >
                                    Save & Apply
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
