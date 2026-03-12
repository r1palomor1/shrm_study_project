import { useState, useMemo } from 'react';
import { calculateBASKAnalytics } from '../utils/scoring';
import { loadVaultFromStorage } from '../utils/storage';

export default function AnalyticsDashboard({ decks, onBack }) {
    const vault = useMemo(() => loadVaultFromStorage(), []);
    const stats = useMemo(() => calculateBASKAnalytics(decks, vault), [decks, vault]);

    const totalReadiness = useMemo(() => {
        const domainAvg = stats.domainStats.reduce((sum, d) => sum + d.percent, 0) / (stats.domainStats.length || 1);
        const compAvg = stats.competencyStats.reduce((sum, c) => sum + c.percent, 0) / (stats.competencyStats.length || 1);
        return Math.round((domainAvg + compAvg) / 2);
    }, [stats]);

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <button onClick={onBack} className="secondary">← Back to Dashboard</button>
                <h1 style={{ margin: 0, fontSize: '1.8rem', background: 'linear-gradient(to right, #fff, var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Exam Readiness Report
                </h1>
            </div>

            {/* Hero Stats */}
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.1))' }}>
                <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Overall Mastery Index
                </div>
                <div style={{ fontSize: '5rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                    {totalReadiness}<span style={{ fontSize: '1.5rem', color: 'var(--secondary)' }}>%</span>
                </div>
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '1rem' }}>
                    Based on 2026 SHRM Body of Applied Skills and Knowledge (BASK)
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                {/* Knowledge Domains (4 Core Areas) */}
                <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
                    <h3 style={{ marginBottom: '2rem', color: 'var(--secondary)', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                        The 4 SHRM Pillars (Knowledge Areas)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                        {stats.domainStats.map(domain => (
                            <div key={domain.name} style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                                    <span style={{ fontWeight: '600', color: 'white' }}>{domain.name}</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>{domain.percent}%</span>
                                </div>
                                <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        width: `${domain.percent}%`, 
                                        height: '100%', 
                                        background: domain.percent > 75 ? 'var(--secondary)' : domain.percent > 50 ? 'var(--warning)' : '#ef4444',
                                        transition: 'width 1s ease-out'
                                    }}></div>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{domain.count} items tracked</span>
                                    <span style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.65rem' }}>
                                        {domain.percent > 75 ? 'Ready' : 'Developing'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Strategy Hint */}
            <div style={{ marginTop: '2.5rem', padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>lightbulb</span>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    <strong>Insight:</strong> Your scores are weighted by difficulty. Focus on the "People" domain today to bring your overall average above 75%, which is the target for SHRM-SCP candidates.
                </p>
            </div>
        </div>
    );
}
