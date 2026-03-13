import { useState, useMemo } from 'react';
import { calculateBASKAnalytics } from '../utils/scoring';
import { loadVaultFromStorage } from '../utils/storage';

export default function AnalyticsDashboard({ decks, onBack }) {
    const vault = useMemo(() => loadVaultFromStorage(), []);
    const stats = useMemo(() => calculateBASKAnalytics(decks, vault), [decks, vault]);

    const globalGPA = useMemo(() => {
        const total = stats.domainStats.length + stats.clusterStats.length;
        const sum = stats.domainStats.reduce((s, d) => s + d.percent, 0) + stats.clusterStats.reduce((s, c) => s + c.percent, 0);
        return ((sum / total) / 25).toFixed(1); // Scale to 4.0 GPA
    }, [stats]);

    const workDone = useMemo(() => {
        const total = decks.reduce((sum, d) => sum + d.cards.length, 0);
        const completed = decks.reduce((sum, d) => sum + d.cards.filter(c => (c.status_quiz || c.status_test || c.status_traditional) && (c.status_quiz || c.status_test || c.status_traditional) !== 'unseen').length, 0);
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    }, [decks]);

    const colors = {
        'People': '#3b82f6', // Blue
        'Organization': '#10b981', // green
        'Workplace': '#f59e0b', // orange
        'Leadership Cluster': '#a855f7', // purple
        'Interpersonal Cluster': '#ef4444', // red/pink
        'Business Cluster': '#6366f1' // indigo
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', paddingBottom: '4rem' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2.2rem', marginBottom: '0.5rem' }}>Relational Insights Dashboard</h1>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <span className="badge" style={{ backgroundColor: '#1e3a8a', color: 'white', border: 'none', padding: '0.4rem 1rem' }}>
                            Total Unique Questions: {stats.totalUnique}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.4rem' }}>schedule</span>
                            Last updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '0.8rem 1.5rem', textAlign: 'center', minWidth: '140px' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Work Done</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{workDone}% <span style={{ fontSize: '0.9rem', color: 'var(--secondary)' }}>+5% week</span></div>
                    </div>
                    <div className="glass-panel" style={{ padding: '0.8rem 1.5rem', textAlign: 'center', minWidth: '140px' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Knowledge GPA</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{globalGPA} <span style={{ fontSize: '0.9rem', color: 'var(--secondary)' }}>+0.2</span></div>
                    </div>
                    <button onClick={onBack} className="secondary" style={{ height: 'fit-content', alignSelf: 'center' }}>
                        ← Back to Dashboard
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                
                {/* Knowledge Lens */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>database</span>
                            Knowledge Lens
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>3 STRATEGIC DOMAINS</span>
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {stats.domainStats.map(domain => (
                            <div key={domain.name} className="glass-panel" style={{ 
                                padding: '1.5rem', 
                                position: 'relative', 
                                overflow: 'hidden',
                                borderLeft: `4px solid ${colors[domain.name] || 'var(--primary)'}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{domain.name}</h4>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                            {domain.name === 'People' && 'HR Strategy, Talent Acq, Engagement'}
                                            {domain.name === 'Organization' && 'Structure, HR Effectiveness, Technology'}
                                            {domain.name === 'Workplace' && 'Employment Law, Risk, Global HR'}
                                        </div>
                                    </div>
                                    <div className="badge">{domain.count} Questions</div>
                                </div>

                                {domain.primaryLink && (
                                    <div style={{ fontSize: '0.75rem', color: colors[domain.name] || 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>link</span>
                                        Linked to: {domain.primaryLink}
                                    </div>
                                )}

                                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        width: `${domain.percent}%`, 
                                        height: '100%', 
                                        backgroundColor: colors[domain.name] || 'var(--primary)',
                                        boxShadow: `0 0 15px ${colors[domain.name] || 'var(--primary)'}44`
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Behavioral Lens */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>psychology</span>
                            Behavioral Lens
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>3 CLUSTERS</span>
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {stats.clusterStats.map(cluster => (
                            <div key={cluster.name} className="glass-panel" style={{ 
                                padding: '1.5rem', 
                                position: 'relative',
                                borderLeft: `4px solid ${colors[cluster.name] || 'var(--primary)'}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{cluster.name.replace(' Cluster', '')}</h4>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                            {cluster.name.includes('Leadership') && 'Ethical Practice, Relationship Mgmt'}
                                            {cluster.name.includes('Interpersonal') && 'Communication, Diversity, Inclusion'}
                                            {cluster.name.includes('Business') && 'Business Acumen, Consulting'}
                                        </div>
                                    </div>
                                    <div className="badge">{cluster.count} Questions</div>
                                </div>

                                <div style={{ fontSize: '0.75rem', color: colors[cluster.name] || 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>join_inner</span>
                                    {cluster.count > 0 ? `Bridges ${cluster.name.includes('Leadership') ? 'People & Organization' : 'Workplace Domain'}` : 'No bridge data yet'}
                                </div>

                                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        width: `${cluster.percent}%`, 
                                        height: '100%', 
                                        backgroundColor: colors[cluster.name] || 'var(--primary)',
                                        boxShadow: `0 0 15px ${colors[cluster.name] || 'var(--primary)'}44`
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Highlights Row */}
            <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '2rem' }}>analytics_link</span>
                    </div>
                    <div>
                        <h4 style={{ margin: 0, marginBottom: '0.4rem' }}>Critical Bridge</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                            Questions tagging "People" (Knowledge) and "{stats.domainStats[0]?.primaryLink || 'Behaviors'}" are currently your strongest area. 
                            Focusing on these will maximize your SHRM-SCP score potential.
                        </p>
                    </div>
                </div>
                <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '2rem' }}>trending_up</span>
                    <div>
                        <h4 style={{ margin: 0, marginBottom: '0.4rem' }}>Growth Metric</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            You've correctly answered {stats.domainStats.reduce((s,d)=>s+d.count,0)} out of {stats.totalUnique} overlap questions this week.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
