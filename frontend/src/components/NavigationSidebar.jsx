import React from 'react';

/**
 * NavigationSidebar: Structural Component for Global Maintenance Hub.
 * Separates navigation and maintenance actions from the main content flow.
 */
const NavigationSidebar = ({ 
  onViewInsights, 
  onViewSettings, 
  onTriggerWarmUp, 
  isWarmingUp, 
  warmUpProgress 
}) => {
  return (
    <aside style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1.2rem', 
      alignItems: 'center',
      padding: '1rem 0'
    }}>
      {/* Audit Insights Button */}
      <button 
        onClick={onViewInsights} 
        className="glass-panel sidebar-btn" 
        style={{ 
          width: '60px', 
          height: '60px', 
          borderRadius: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: '#60a5fa',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }} 
        title="Audit Insights"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>analytics</span>
      </button>
      
      {/* Vault Settings Button */}
      <button 
        onClick={onViewSettings} 
        className="glass-panel sidebar-btn" 
        style={{ 
          width: '60px', 
          height: '60px', 
          borderRadius: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }} 
        title="Vault Settings"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>settings</span>
      </button>

      {/* Structural Separator */}
      <div style={{ width: '30px', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />

      {/* Bulk Prep Engine (The Bolt) */}
      <button 
        onClick={onTriggerWarmUp} 
        disabled={isWarmingUp} 
        className={`glass-panel sidebar-btn ${isWarmingUp ? 'is-active' : ''}`}
        style={{ 
          width: '60px', 
          height: '60px', 
          borderRadius: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: isWarmingUp ? '#fbbf24' : '#60a5fa', 
          position: 'relative',
          cursor: isWarmingUp ? 'default' : 'pointer',
          transition: 'all 0.2s ease'
        }} 
        title="Bulk Prep Engine"
      >
        {isWarmingUp ? (
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{warmUpProgress}%</div>
        ) : (
          <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>bolt</span>
        )}
        {isWarmingUp && <div className="pulse-ring" />}
      </button>
    </aside>
  );
};

export default NavigationSidebar;
