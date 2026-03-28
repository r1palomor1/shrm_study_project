import React, { useState, useEffect, useRef } from 'react';

const AudioStudyMode = ({ deck, onExit, certLevel, updateCardStatus }) => {
  const [currentIndex, setCurrentIndex] = useState(deck.initialIndex || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [restartKey, setRestartKey] = useState(0); 
  const hasUserStartedRef = useRef(false);
  const hasMountedRef = useRef(false);
  const ribbonRef = useRef(null);
  const synth = window.speechSynthesis;

  const [isContinuous, setIsContinuous] = useState(() => {
    const saved = localStorage.getItem('shrm_audio_is_continuous');
    return saved === null ? false : JSON.parse(saved);
  });
  const [includeScenario, setIncludeScenario] = useState(() => {
    const saved = localStorage.getItem('shrm_audio_v2_include_scenario');
    return saved === null ? true : JSON.parse(saved);
  });
  const [includeTrapAlert, setIncludeTrapAlert] = useState(() => {
    const saved = localStorage.getItem('shrm_audio_v2_include_trap_alert');
    return saved === null ? true : JSON.parse(saved);
  });
  const [includeRationale, setIncludeRationale] = useState(() => {
    const saved = localStorage.getItem('shrm_audio_v2_include_rationale');
    return saved === null ? false : JSON.parse(saved);
  });

  const cards = deck.cards || [];
  const currentCard = cards[currentIndex];
  const total = cards.length;

  useEffect(() => { localStorage.setItem('shrm_audio_is_continuous', JSON.stringify(isContinuous)); }, [isContinuous]);
  useEffect(() => { localStorage.setItem('shrm_audio_v2_include_scenario', JSON.stringify(includeScenario)); }, [includeScenario]);
  useEffect(() => { localStorage.setItem('shrm_audio_v2_include_trap_alert', JSON.stringify(includeTrapAlert)); }, [includeTrapAlert]);
  useEffect(() => { localStorage.setItem('shrm_audio_v2_include_rationale', JSON.stringify(includeRationale)); }, [includeRationale]);

  useEffect(() => {
    if (!hasMountedRef.current) { hasMountedRef.current = true; return; }
    if (deck.sessionKey) {
        const savedSessionStr = localStorage.getItem(deck.sessionKey);
        if (savedSessionStr) {
            const savedSession = JSON.parse(savedSessionStr);
            savedSession.initialIndex = currentIndex;
            localStorage.setItem(deck.sessionKey, JSON.stringify(savedSession));
        }
    }
  }, [currentIndex, deck.sessionKey]);

  useEffect(() => {
    if (ribbonRef.current) {
        const activeNode = ribbonRef.current.querySelector(`[data-active="true"]`);
        if (activeNode) activeNode.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentIndex]);

  const handleScrollRibbon = (direction) => {
    if (ribbonRef.current) {
        const scrollAmount = 250;
        ribbonRef.current.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount;
    }
  };

  useEffect(() => {
    if (hasUserStartedRef.current && currentCard && !currentCard.status_audio_seen) {
      updateCardStatus(currentCard.id, 'audio_seen', null);
    }
  }, [currentIndex, currentCard]);

  const stopAudio = () => { synth.cancel(); setIsPlaying(false); };
  const speakCurrent = () => {
    if (!currentCard || !hasUserStartedRef.current) return;
    synth.cancel();
    setIsPlaying(false);
    
    // EXCELLENCE: Strip redundant AI-generated labels before speaking or displaying
    const cleanLabel = (text) => text ? text.replace(/^(Strategic )?(Coaching|Trap Alert|Rationale|Insight):\s*/i, '') : '';
    
    const scText = (includeScenario && currentCard.aiData?.scenario) ? 'Scenario: ' + currentCard.aiData.scenario : '';
    const ratText = (includeRationale && currentCard.aiData?.rationale) ? 'Coaching: ' + cleanLabel(currentCard.aiData.rationale) : '';
    const gapText = (includeTrapAlert && currentCard.aiData?.gap_analysis) ? 'Trap Alert: ' + cleanLabel(currentCard.aiData.gap_analysis) : '';
    const textToSpeak = `Term: ${currentCard.term || currentCard.question}. Definition: ${currentCard.definition || currentCard.answer}. ${scText} ${ratText} ${gapText}`;
    
    // 100ms delay after cancel prevents Chrome Speech Synthesis stuck-synth bug
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.95;
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => {
        setIsPlaying(false);
        if (isContinuous && currentIndex < total - 1) setTimeout(() => setCurrentIndex(prev => prev + 1), 1500);
      };
      utterance.onerror = (e) => { if (e.error !== 'interrupted') setIsPlaying(false); };
      synth.speak(utterance);
    }, 100);
  };

  useEffect(() => { if (hasUserStartedRef.current) speakCurrent(); return () => synth.cancel(); }, [currentIndex]);

  const handleTogglePlay = () => {
    if (isPlaying) { synth.pause(); setIsPlaying(false); }
    else {
      if (!hasUserStartedRef.current) {
        hasUserStartedRef.current = true;
        if (currentCard && !currentCard.status_audio_seen) {
          updateCardStatus(currentCard.id, 'audio_seen', null);
        }
      }
      if (synth.paused) { synth.resume(); setIsPlaying(true); } else speakCurrent();
    }
  };

  const handleNext = () => { if (currentIndex < total - 1) setCurrentIndex(prev => prev + 1); };
  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(prev => prev - 1); };
  
  const confirmReset = () => {
    cards.forEach(c => { c.status_audio_seen = null; });
    cards.forEach(c => updateCardStatus(c.id, 'audio_reset', null));
    setRestartKey(prev => prev + 1);
    hasUserStartedRef.current = false;
    setCurrentIndex(0);
    stopAudio();
    setShowResetModal(false);
  };

  // METADATA RESOLVERS: Map from AI assignment vault
  const rawDomain = currentCard?.aiData?.tag_bask || currentCard?.domain || 'All Study Material';
  const displayDomain = rawDomain === 'Competencies' ? 'All Study Material' : rawDomain;
  const displayCluster = currentCard?.aiData?.tag_behavior || '';

  return (
    <div className="animate-fade-in font-inter" style={{ 
      minHeight: '100vh', background: 'linear-gradient(180deg, #0b0f19 0%, #111827 100%)',
      padding: '0.8rem', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden'
    }}>
      {showResetModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, WebkitBackdropFilter: 'blur(10px)', backdropFilter: 'blur(10px)' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '320px', padding: '2rem', borderRadius: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
             <span className="material-symbols-outlined" style={{ fontSize: '3.5rem', color: '#ef4444', marginBottom: '1rem' }}>history</span>
             <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '0.6rem' }}>Reset Progress?</h3>
             <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1.5rem', lineHeight: '1.4' }}>This will return you to the first term in this study group.</p>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <button onClick={confirmReset} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '0.7rem', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', fontSize: '0.85rem' }}>YES, CLEAR AND RESTART</button>
                <button onClick={() => setShowResetModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.7rem', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', fontSize: '0.85rem' }}>CANCEL</button>
             </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ width: '100%', maxWidth: '850px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
        <button onClick={() => { stopAudio(); onExit(); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.4rem 1rem', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold', fontSize: '0.8rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_back</span> EXIT HUB
        </button>
        <div style={{ fontSize: '0.8rem', fontWeight: '900', color: '#60a5fa' }}>
           {currentIndex + 1} OF {total}
        </div>
      </div>

      <div key={restartKey} style={{ width: '100%', maxWidth: '850px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.4rem 0.8rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => handleScrollRibbon('left')} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '1.2rem' }}>&lsaquo;</button>
        <div ref={ribbonRef} className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: 1, scrollBehavior: 'smooth' }}>
          {cards.map((c, idx) => {
            const isAudioSeen = (c.status_audio_seen === 'seen');
            const isCurrent = idx === currentIndex;
            return (
              <button key={`${c.id}-${restartKey}`} data-active={isCurrent} onClick={() => { stopAudio(); setCurrentIndex(idx); }}
                style={{ 
                  width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: isCurrent ? '2px solid white' : 'none',
                  background: isCurrent ? '#6366f1' : isAudioSeen ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                  color: 'white', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', flexShrink: 0,
                  transition: 'all 0.2s', boxShadow: isCurrent ? '0 0 10px rgba(99, 102, 241, 0.5)' : 'none'
                }}>
                {idx + 1}
              </button>
            );
          })}
        </div>
        <button onClick={() => handleScrollRibbon('right')} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '1.2rem' }}>&rsaquo;</button>
      </div>

      <div className="glass-panel" style={{ 
        width: '100%', maxWidth: '800px', padding: '1.2rem 2.5rem 2rem', borderRadius: '24px',
        textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 60px -15px rgba(0,0,0,0.6)', position: 'relative',
        minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
      }}>
        {/* Labels - Dynamic & Root-Cause Fixed */}
        <div style={{ position: 'absolute', top: '20px', left: '20px', fontSize: '0.6rem', fontWeight: '900', color: '#60a5fa', textTransform: 'uppercase', background: 'rgba(96, 165, 250, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px', letterSpacing: '0.05em' }}>
           DOMAIN: {displayDomain}
        </div>
        {displayCluster && (
          <div style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '0.6rem', fontWeight: '900', color: '#60a5fa', textTransform: 'uppercase', background: 'rgba(96, 165, 250, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px', letterSpacing: '0.05em' }}>
             CLUSTER: {displayCluster}
          </div>
        )}

        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', height: '20px', marginBottom: '0.8rem', opacity: isPlaying ? 1 : 0.2 }}>
            {[1,2,3,4,5,6,7].map(i => (
                <div key={i} style={{ width: '3px', borderRadius: '4px', background: 'linear-gradient(to top, #3b82f6, #60a5fa)', height: isPlaying ? '100%' : '15%', animation: isPlaying ? `visualizer 0.6s ease-in-out infinite alternate ${i * 0.1}s` : 'none' }} />
            ))}
        </div>

        <h2 style={{ fontSize: '2.1rem', fontWeight: '900', marginBottom: '0.9rem', lineHeight: '1.1', color: 'white' }}>{currentCard?.term || currentCard?.question}</h2>
        <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#9ca3af', marginBottom: '1.5rem', maxWidth: '650px', margin: '0 auto 1.5rem' }}>{currentCard?.definition || currentCard?.answer}</p>

        {includeScenario && currentCard?.aiData?.scenario && (
          <div style={{ padding: '1.2rem', background: 'rgba(99, 102, 241, 0.05)', borderLeft: '3px solid #6366f1', borderRadius: '10px', textAlign: 'left', fontStyle: 'italic', fontSize: '0.85rem', color: '#a5b4fc', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#6366f1' }}>description</span>
                <strong style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', color: '#6366f1' }}>Scenario</strong>
             </div>
             {currentCard.aiData.scenario}
          </div>
        )}

        {includeRationale && currentCard?.aiData?.rationale && (
          <div style={{ 
            marginTop: '1.2rem', 
            padding: '1rem 1.2rem', 
            background: 'rgba(99, 102, 241, 0.05)', 
            borderLeft: '3px solid #6366f1', 
            borderRadius: '10px', 
            textAlign: 'left', 
            fontSize: '0.82rem', 
            color: '#a5b4fc', 
            lineHeight: '1.4',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem'
          }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#6366f1' }}>psychology</span>
                <strong style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', color: '#6366f1' }}>STRATEGIC COACHING</strong>
             </div>
             <span>{currentCard.aiData.rationale.replace(/^(Strategic )?(Coaching|Trap Alert|Rationale|Insight):\s*/i, '')}</span>
          </div>
        )}

        {includeTrapAlert && currentCard?.aiData?.gap_analysis && (
          <div style={{ 
            marginTop: '1.2rem', 
            padding: '1rem 1.2rem', 
            background: 'rgba(251, 191, 36, 0.05)', 
            borderLeft: '3px solid #fbbf24', 
            borderRadius: '10px', 
            textAlign: 'left', 
            fontSize: '0.82rem', 
            color: '#fbbf24', 
            lineHeight: '1.4',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem'
          }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#fbbf24' }}>warning</span>
                <strong style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', color: '#fbbf24' }}>TRAP ALERT</strong>
             </div>
             <span>{currentCard.aiData.gap_analysis.replace(/^(Strategic )?(Coaching|Trap Alert|Rationale|Insight):\s*/i, '')}</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <button onClick={handlePrev} disabled={currentIndex === 0} style={{ background: 'none', border: 'none', color: currentIndex === 0 ? 'rgba(255,255,255,0.1)' : '#60a5fa', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>skip_previous</span></button>
          <button onClick={handleTogglePlay} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 25px rgba(99, 102, 241, 0.4)', transition: 'transform 0.2s' }}><span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>{isPlaying ? 'pause' : 'play_arrow'}</span></button>
          <button onClick={handleNext} disabled={currentIndex === total - 1} style={{ background: 'none', border: 'none', color: currentIndex === total - 1 ? 'rgba(255,255,255,0.1)' : '#60a5fa', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>skip_next</span></button>
        </div>
        <div className="glass-panel" style={{ display: 'flex', gap: '1.8rem', padding: '0.6rem 1.8rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <button onClick={() => setShowResetModal(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', fontWeight: '900' }}><span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>restart_alt</span> RESET</button>
          <button onClick={() => setIsContinuous(!isContinuous)} style={{ background: 'none', border: 'none', color: isContinuous ? '#60a5fa' : 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', fontWeight: '900' }}><span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{isContinuous ? 'repeat' : 'touch_app'}</span> {isContinuous ? 'CONTINUOUS' : 'MANUAL'}</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: includeScenario ? '#a5b4fc' : 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: '900' }}><input type="checkbox" checked={includeScenario} onChange={() => setIncludeScenario(!includeScenario)} style={{ cursor: 'pointer', width: '12px', height: '12px' }} /> SCENARIOS</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: includeTrapAlert ? '#a5b4fc' : 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: '900' }}><input type="checkbox" checked={includeTrapAlert} onChange={() => setIncludeTrapAlert(!includeTrapAlert)} style={{ cursor: 'pointer', width: '12px', height: '12px' }} /> TRAPS</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: includeRationale ? '#a5b4fc' : 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: '900' }}><input type="checkbox" checked={includeRationale} onChange={() => setIncludeRationale(!includeRationale)} style={{ cursor: 'pointer', width: '12px', height: '12px' }} /> COACHING</label>
        </div>
      </div>

      <style>{`
        @keyframes visualizer { 0% { transform: scaleY(0.4); opacity: 0.5; } 100% { transform: scaleY(1); opacity: 1; } }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default AudioStudyMode;
