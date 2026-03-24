import React from 'react';

/**
 * TopicCard: Structural Component for Topic Selection.
 * Dynamically visualizes mastery progress and selection state.
 */
const TopicCard = ({ 
  title, 
  cards, 
  isActive, 
  onSelect, 
  onReset, 
  onDelete, 
  studyMode, 
  quizType,
  isAllCards = false
}) => {
  // Structural Logic: Calculate mastery based on current study mode
  const getStatus = (c) => {
    if (studyMode === 'traditional') return c.status_traditional || c.status || 'unseen';
    if (studyMode === 'quiz') return c[`status_quiz_${quizType}`] || 'unseen';
    return 'unseen';
  };

  const masteredCount = cards.filter(c => getStatus(c) !== 'unseen').length;
  const totalCount = cards.length;
  const percent = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  return (
    <div 
      onClick={onSelect}
      className={`glass-panel topic-card ${isActive ? 'active' : ''}`}
      style={{ padding: '1.5rem', position: 'relative', cursor: 'pointer', transition: 'all 0.2s ease' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: isActive ? '#60a5fa' : 'white' }}>{title}</h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            {totalCount} {isAllCards ? 'Total Flashcards' : 'Flashcards'}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {!isAllCards && isActive && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); onReset(); }}
                style={{ background: 'transparent', border: 'none', padding: 0, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                title="Reset Progress"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>restart_alt</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                style={{ background: 'transparent', border: 'none', padding: 0, color: 'rgba(239, 68, 68, 0.4)', cursor: 'pointer' }}
                title="Delete Topic"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>delete</span>
              </button>
            </div>
          )}
          <span className="material-symbols-outlined" style={{ color: isActive ? 'var(--secondary)' : 'rgba(255,255,255,0.1)' }}>
            {isActive ? 'check_circle' : 'radio_button_unchecked'}
          </span>
        </div>
      </div>
      
      {/* Progress Visualization */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          <span>{masteredCount} mastered</span>
          <span style={{ fontWeight: 'bold', color: isActive ? '#60a5fa' : 'var(--text-muted)' }}>{percent}%</span>
        </div>
        <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${percent}%`, 
            height: '100%', 
            backgroundColor: isActive ? 'var(--secondary)' : 'rgba(255,255,255,0.2)', 
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
          }} />
        </div>
      </div>
    </div>
  );
};

export default TopicCard;
