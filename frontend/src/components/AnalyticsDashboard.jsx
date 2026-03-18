import { useState, useMemo } from 'react';
import { calculateBASKAnalytics } from '../utils/scoring';
import { loadVaultFromStorage } from '../utils/storage';

export default function AnalyticsDashboard({ decks, onBack, initialMode = 'intelligent', certLevel = 'CP' }) {
    const vault = useMemo(() => loadVaultFromStorage(), []);
    const stats = useMemo(() => calculateBASKAnalytics(decks, vault, certLevel), [decks, vault, certLevel]);
    const [activeMode, setActiveMode] = useState(initialMode);
    const [expandedCard, setExpandedCard] = useState(null); 
    const [expandedAttempt, setExpandedAttempt] = useState(null); // Track specific question drill-down

    const modeStats = stats[activeMode];
    const otherMode = activeMode === 'intelligent' ? 'simple' : 'intelligent';
    const otherModeStats = stats[otherMode];

    const getThreshold = (total) => Math.max(2, Math.min(5, Math.ceil(total * 0.1)));
    const activeThreshold = getThreshold(modeStats.totalUnique || 0);
    
    const isUnlocked = (modeStats.totalAttempted || 0) >= activeThreshold;
    const isOtherUnlocked = (otherModeStats.totalAttempted || 0) >= getThreshold(otherModeStats.totalUnique || 0);

    const colors = {
        'People': '#3b82f6',
        'Organization': '#10b981',
        'Workplace': '#f59e0b',
        'Leadership Cluster': '#a855f7',
        'Interpersonal Cluster': '#ef4444',
        'Business Cluster': '#6366f1'
    };

    const getBridgeColor = (behavior) => {
        if (!behavior) return 'var(--text-muted)';
        if (behavior.includes('Leadership') || behavior.includes('Ethical')) return '#a855f7';
        if (behavior.includes('Communication') || behavior.includes('Relationship') || behavior.includes('Inclusive')) return '#ef4444';
        return '#6366f1'; 
    };

    const getProficiencyText = (gpa) => {
        if (gpa >= 3.8) return 'Expert';
        if (gpa >= 3.0) return 'High Proficiency';
        if (gpa >= 2.0) return 'Intermediate';
        if (gpa > 0) return 'Fundamental';
        return 'Not Measured';
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', paddingBottom: '2rem' }}>
            {/* Top Navigation Row (Floating Arrow) */}
            <div style={{ position: 'relative', height: '0', zIndex: 10 }}>
                <button 
                    onClick={onBack} 
                    style={{ 
                        position: 'absolute',
                        left: '-3.5rem',
                        top: '0.4rem',
                        background: 'transparent', 
                        border: 'none', 
                        color: 'var(--text-muted)', 
                        cursor: 'pointer',
                        padding: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.8rem' }}>arrow_back</span>
                </button>
            </div>

            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', lineHeight: '1' }}>Relational Insights</h1>
                        <div style={{ 
                            background: '#3b82f6', 
                            color: 'white', 
                            padding: '0.2rem 0.8rem', 
                            borderRadius: '5px', 
                            fontSize: '0.7rem', 
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>
                            SHRM-{certLevel}
                        </div>
                    </div>
                    <div style={{ 
                        display: 'flex', 
                        background: 'rgba(255,255,255,0.05)', 
                        padding: '3px', 
                        borderRadius: '10px', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        width: 'fit-content'
                    }}>
                        <button onClick={() => setActiveMode('intelligent')} style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem', borderRadius: '7px', background: activeMode === 'intelligent' ? '#f59e0b' : 'transparent', color: 'white', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}>Intelligent</button>
                        <button onClick={() => setActiveMode('simple')} style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem', borderRadius: '7px', background: activeMode === 'simple' ? '#f59e0b' : 'transparent', color: 'white', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}>Simple</button>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'stretch' }}>
                    <div className="glass-panel" style={{ padding: '0.5rem 1rem', textAlign: 'center', width: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Work Done</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{modeStats.workDone}%</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{modeStats.totalAttempted}/{modeStats.totalUnique}</div>
                    </div>

                    <div className="glass-panel" style={{ padding: '0.5rem 1rem', textAlign: 'center', width: '110px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Accuracy GPA</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: isUnlocked ? 'white' : 'rgba(255,255,255,0.2)' }}>{isUnlocked ? modeStats.globalGPA : '--'}</div>
                        <div style={{ marginTop: '0.1rem', fontSize: '0.6rem', color: isOtherUnlocked ? 'var(--secondary)' : 'rgba(255,255,255,0.1)', borderTop: '0.5px solid rgba(255,255,255,0.05)', paddingTop: '0.1rem' }}>
                            {otherMode.charAt(0).toUpperCase()}: {isOtherUnlocked ? otherModeStats.globalGPA : 'Locked'}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '2.5rem', rowGap: '0.8rem', alignItems: 'start' }}>
                {/* Headers Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.1rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-white)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>database</span>
                        Knowledge Lens
                    </h3>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-white)', opacity: 0.3, fontWeight: '500' }}>DOMAINS</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.1rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-white)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>psychology</span>
                        Behavioral Lens
                    </h3>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-white)', opacity: 0.3, fontWeight: '500' }}>CLUSTERS</span>
                </div>

                {/* Interleaved Cards Grid */}
                {[0, 1, 2].map(idx => {
                    const domain = (modeStats.domainStats || [])[idx];
                    const cluster = (modeStats.clusterStats || [])[idx];

                    return (
                        <div key={idx} style={{ display: 'contents' }}>
                            {/* Knowledge Card */}
                            {domain && (
                                <div key={`domain-${idx}`}>
                                    <div 
                                        className={`glass-panel card-interactive ${expandedCard === domain.name ? 'active' : ''}`}
                                        onClick={() => setExpandedCard(expandedCard === domain.name ? null : domain.name)}
                                        style={{ 
                                            padding: '1.3rem 1.5rem', 
                                            borderLeft: `4px solid ${colors[domain.name] || 'var(--primary)'}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            background: expandedCard === domain.name ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.7rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1, paddingRight: '1rem' }}>
                                                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: colors[domain.name] || 'var(--primary)', fontWeight: 'bold', letterSpacing: '0.5px', marginBottom: '0.3rem' }}>{domain.name} DOMAIN</div>
                                                <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                                                    {domain.name === 'People' && 'Talent Acquisition & Retention'}
                                                    {domain.name === 'Organization' && 'Structure & Employee Relations'}
                                                    {domain.name === 'Workplace' && 'Risk Management & Safety'}
                                                </h4>
                                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', lineHeight: '1.3' }}>
                                                    {domain.name === 'People' && 'Strategic sourcing, workforce planning, and branding.'}
                                                    {domain.name === 'Organization' && 'Labor law, conflict mediation, and bargaining.'}
                                                    {domain.name === 'Workplace' && 'OSHA, risk, and occupational health.'}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', minWidth: '100px' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)' }}>
                                                    {domain.attempted >= 1 ? `${Math.round((domain.gpa / 4) * 100)}% Mastery` : '0% Mastery'}
                                                </div>
                                                <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold', color: domain.attempted >= 1 ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}>
                                                    {domain.attempted >= 1 ? domain.gpa.toFixed(1) : '--'}
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '4px' }}>GPA</span>
                                                </div>
                                                <div style={{ marginTop: '0.2rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                    {domain.attempted}/{domain.count} SYNCED
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {domain.primaryLink && (
                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                                                <div style={{ fontSize: '0.6rem', color: getBridgeColor(domain.primaryLink), display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>join_inner</span>
                                                    Applied via: {domain.primaryLink}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {expandedCard === domain.name && (
                                        <div className="animate-slide-down" style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0 0 10px 10px', border: '1px solid rgba(255,255,255,0.05)', borderTop: 'none' }}>
                                            <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Attempted Questions</div>
                                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                                {(domain.attempts || []).map((attempt, idx2) => {
                                                    const attemptData = vault[`${attempt.id}:intelligent:${certLevel}`] || vault[`${attempt.id}:simple:${certLevel}`];
                                                    const isExpanded = expandedAttempt === attempt.id;
                                                    return (
                                                        <div key={idx2} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '6px', overflow: 'hidden' }}>
                                                            <div onClick={(e) => { e.stopPropagation(); setExpandedAttempt(isExpanded ? null : attempt.id); }} style={{ padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem' }}>
                                                                    <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', color: attempt.mastery >= 3.0 ? 'var(--secondary)' : '#ef4444' }}>{attempt.mastery >= 3.0 ? 'check_circle' : 'error'}</span>
                                                                    <span>{attempt.title.length > 40 ? attempt.title.substring(0, 40) + '...' : attempt.title}</span>
                                                                </div>
                                                                <div style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>{attempt.mastery.toFixed(1)}</div>
                                                            </div>
                                                            {isExpanded && attemptData && (
                                                                <div className="animate-fade-in" style={{ padding: '0.4rem 0.4rem 0.4rem 1.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', lineHeight: '1.3' }}>
                                                                    {attemptData.scenario}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Behavioral Card */}
                            {cluster && (
                                <div key={`cluster-${idx}`}>
                                    <div 
                                        className={`glass-panel card-interactive ${expandedCard === cluster.name ? 'active' : ''}`}
                                        onClick={() => setExpandedCard(expandedCard === cluster.name ? null : cluster.name)}
                                        style={{ 
                                            padding: '1.3rem 1.5rem', 
                                            borderLeft: `4px solid ${colors[cluster.name] || 'var(--primary)'}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            background: expandedCard === cluster.name ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.7rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1, paddingRight: '1rem' }}>
                                                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: colors[cluster.name] || 'var(--primary)', fontWeight: 'bold', letterSpacing: '0.5px', marginBottom: '0.3rem' }}>{cluster.name.replace(' Cluster', '').toUpperCase()} CLUSTER</div>
                                                <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                                                    {cluster.name.includes('Leadership') && 'Ethical Practice'}
                                                    {cluster.name.includes('Interpersonal') && 'Relationship Management'}
                                                    {cluster.name.includes('Business') && 'Business Acumen & Strategy'}
                                                </h4>
                                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', lineHeight: '1.3' }}>
                                                    {cluster.name.includes('Leadership') && 'Integrity and value-driven decisions.'}
                                                    {cluster.name.includes('Interpersonal') && 'Networking and synergy development.'}
                                                    {cluster.name.includes('Business') && 'Economic logic and organizational strategy.'}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', minWidth: '100px' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: cluster.attempted >= 1 ? colors[cluster.name] : 'rgba(255,255,255,0.1)' }}>
                                                    {getProficiencyText(cluster.gpa)}
                                                </div>
                                                <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold', color: cluster.attempted >= 1 ? 'white' : 'rgba(255,255,255,0.1)' }}>
                                                    {cluster.attempted >= 1 ? cluster.gpa.toFixed(1) : '--'}
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '4px' }}>GPA</span>
                                                </div>
                                                <div style={{ marginTop: '0.2rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                    {cluster.attempted} QUESTIONS
                                                </div>
                                            </div>
                                        </div>

                                        {cluster.attempted > 0 && (
                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                                                <div style={{ fontSize: '0.6rem', color: colors[cluster.name] || 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>join_inner</span>
                                                    Bridges: {cluster.name.includes('Leadership') ? 'People & Org' : 'Workplace'}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {expandedCard === cluster.name && (
                                        <div className="animate-slide-down" style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0 0 10px 10px', border: '1px solid rgba(255,255,255,0.05)', borderTop: 'none' }}>
                                            <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Attempted Questions</div>
                                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                                {(cluster.attempts || []).map((attempt, idx2) => {
                                                    const attemptData = vault[`${attempt.id}:intelligent:${certLevel}`] || vault[`${attempt.id}:simple:${certLevel}`];
                                                    const isExpanded = expandedAttempt === attempt.id;
                                                    return (
                                                        <div key={idx2} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '6px', overflow: 'hidden' }}>
                                                            <div onClick={(e) => { e.stopPropagation(); setExpandedAttempt(isExpanded ? null : attempt.id); }} style={{ padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem' }}>
                                                                    <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', color: attempt.mastery >= 3.0 ? 'var(--secondary)' : '#ef4444' }}>{attempt.mastery >= 3.0 ? 'check_circle' : 'error'}</span>
                                                                    <span>{attempt.title.length > 40 ? attempt.title.substring(0, 40) + '...' : attempt.title}</span>
                                                                </div>
                                                                <div style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>{attempt.mastery.toFixed(1)}</div>
                                                            </div>
                                                            {isExpanded && attemptData && (
                                                                <div className="animate-fade-in" style={{ padding: '0.4rem 0.4rem 0.4rem 1.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', lineHeight: '1.3' }}>
                                                                    {attemptData.scenario}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer Section (Legend) */}
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '1.5rem', padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 10px rgba(168, 85, 247, 0.4)' }} /> Leadership
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)' }} /> Interpersonal
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)' }} /> Business
                    </div>
                </div>
            </div>
        </div>
    );
}
