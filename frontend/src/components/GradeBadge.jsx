export const GradeBadge = ({ grade, percentage }) => {
    let color = '#ef4444'; // Red
    let bg = 'rgba(239, 68, 68, 0.1)';
    let text = 'Needs Review';
    let icon = '❌';

    if (grade === 'green') {
        color = '#10b981'; // Green
        bg = 'rgba(16, 185, 129, 0.1)';
        text = 'Mastered';
        icon = '✅';
    } else if (grade === 'yellow') {
        color = '#f59e0b'; // Yellow
        bg = 'rgba(245, 158, 11, 0.1)';
        text = 'Almost There';
        icon = '⚠️';
    }

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: bg,
            color: color,
            border: `1px solid ${color}`,
            borderRadius: '20px',
            fontWeight: '600',
            fontSize: '0.9rem'
        }}>
            <span>{icon}</span>
            <span>{text} ({percentage}%)</span>
        </div>
    );
};
