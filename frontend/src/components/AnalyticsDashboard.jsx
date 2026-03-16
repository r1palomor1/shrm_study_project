import { useState, useMemo } from 'react';
import { calculateBASKAnalytics } from '../utils/scoring';
import { loadVaultFromStorage } from '../utils/storage';

export default function AnalyticsDashboard({ decks, onBack, initialMode = 'intelligent' }) {
    const vault = useMemo(() => loadVaultFromStorage(), []);
    const stats = useMemo(() => calculateBASKAnalytics(decks, vault), [decks, vault]);
    const [activeMode, setActiveMode] = useState(initialMode);

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2.2rem', lineHeight: '1', marginBottom: '1.2rem' }}>Relational Insights Dashboard</h1>
                    
                    {/* Mode Toggle */}
                    <div style={{ 
                        display: 'flex', 
                        background: 'rgba(255,255,255,0.05)', 
                        padding: '4px', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        width: 'fit-content'
                    }}>
                        <button onClick={() => setActiveMode('intelligent')} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '8px', background: activeMode === 'intelligent' ? 'var(--primary)' : 'transparent', color: 'white', border: 'none', cursor: 'pointer' }}>Intelligent</button>
                        <button onClick={() => setActiveMode('simple')} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '8px', background: activeMode === 'simple' ? 'var(--primary)' : 'transparent', color: 'white', border: 'none', cursor: 'pointer' }}>Simple</button>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'stretch' }}>
                    <div className="glass-panel" style={{ padding: '0.8rem 1.5rem', textAlign: 'center', width: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Work Done</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{modeStats.workDone}%</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Questions {modeStats.totalAttempted} of {modeStats.totalUnique}</div>
                    </div>

                    <div className="glass-panel" style={{ padding: '0.8rem 1.5rem', textAlign: 'center', width: '150px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Accuracy GPA</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: isUnlocked ? 'white' : 'rgba(255,255,255,0.2)' }}>{isUnlocked ? modeStats.globalGPA : '--'}</div>
                        <div style={{ marginTop: '0.2rem', fontSize: '0.75rem', color: isOtherUnlocked ? 'var(--secondary)' : 'rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.2rem' }}>
                            {otherMode}: {isOtherUnlocked ? otherModeStats.globalGPA : 'Locked'}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                {/* Knowledge Lens */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-white)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>database</span>
                            Knowledge Lens
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>3 STRATEGIC DOMAINS</span>
                    </div>
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {(modeStats.domainStats || []).map(domain => (
                            <div key={domain.name} className="glass-panel" style={{ padding: '1.5rem', borderLeft: `4px solid ${colors[domain.name] || 'var(--primary)'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{domain.name}</h4>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                            {domain.name === 'People' && 'HR Strategy, Talent Acq, Engagement'}
                                            {domain.name === 'Organization' && 'Structure, HR Effectiveness, Technology'}
                                            {domain.name === 'Workplace' && 'Employment Law, Risk, Global HR'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: domain.attempted >= 2 ? 'white' : 'rgba(255,255,255,0.2)' }}>
                                            {domain.attempted >= 2 ? domain.gpa.toFixed(1) : '--'}
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '4px' }}>GPA</span>
                                        </div>
                                        <div className="badge" style={{ marginTop: '0.4rem', fontSize: '0.65rem' }}>{domain.attempted}/{domain.count} DONE</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: getBridgeColor(domain.primaryLink), marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>join_inner</span>
                                    {domain.primaryLink ? `Applied via: ${domain.primaryLink}` : 'No behavioral bridge detected'}
                                </div>
                                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${domain.percent}%`, height: '100%', backgroundColor: colors[domain.name] || 'var(--primary)', boxShadow: `0 0 15px ${colors[domain.name]}44` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Behavioral Lens */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-white)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>psychology</span>
                            Behavioral Lens
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>3 CLUSTERS</span>
                    </div>
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {(modeStats.clusterStats || []).map(cluster => (
                            <div key={cluster.name} className="glass-panel" style={{ padding: '1.5rem', borderLeft: `4px solid ${colors[cluster.name] || 'var(--primary)'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{cluster.name.replace(' Cluster', '')}</h4>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                            {cluster.name.includes('Leadership') && 'Ethical Practice, Relationship Mgmt'}
                                            {cluster.name.includes('Interpersonal') && 'Communication, Diversity, Inclusion'}
                                            {cluster.name.includes('Business') && 'Business Acumen, Consulting'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: cluster.attempted >= 2 ? 'white' : 'rgba(255,255,255,0.2)' }}>
                                            {cluster.attempted >= 2 ? cluster.gpa.toFixed(1) : '--'}
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '4px' }}>GPA</span>
                                        </div>
                                        <div className="badge" style={{ marginTop: '0.4rem', fontSize: '0.65rem' }}>{cluster.attempted}/{cluster.count} DONE</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: colors[cluster.name] || 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>join_inner</span>
                                    {cluster.attempted > 0 ? `Bridges: ${cluster.name.includes('Leadership') ? 'People & Organization' : 'Workplace Domain'}` : 'No bridge data yet'}
                                </div>
                                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${cluster.percent}%`, height: '100%', backgroundColor: colors[cluster.name] || 'var(--primary)', boxShadow: `0 0 15px ${colors[cluster.name]}44` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer Section (Legend) */}
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '1.2rem', padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: '500', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} /> Leadership
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: '500', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} /> Interpersonal
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: '500', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} /> Business
                    </div>
                </div>
            </div>
        </div>
    );
}
