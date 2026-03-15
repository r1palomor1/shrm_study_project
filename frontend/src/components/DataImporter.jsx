import { useState, useRef } from 'react';
import { parseMarkdownToDeck } from '../utils/markdownParser';

export default function DataImporter({ onDeckLoaded }) {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.md')) {
            setError('Select a valid .md file.');
            return;
        }

        setIsLoading(true);
        setError('');

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const markdown = event.target.result;
                const parsedDeck = parseMarkdownToDeck(markdown);

                if (parsedDeck.cards.length === 0) {
                    setError('No flashcards found.');
                } else {
                    onDeckLoaded(parsedDeck);
                    setError('');
                }
            } catch (err) {
                setError('Error parsing file.');
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            <input
                type="file"
                accept=".md"
                onChange={handleFileUpload}
                ref={fileInputRef}
                style={{ display: 'none' }}
                id="md-upload-main"
            />
            
            <label htmlFor="md-upload-main">
                <button as="span" style={{ 
                    padding: '0.5rem 1rem', 
                    fontSize: '0.85rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: 'none'
                }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>
                        {isLoading ? 'sync' : 'upload_file'}
                    </span>
                    {isLoading ? 'Loading...' : 'Import .md'}
                </button>
            </label>

            <button 
                onClick={() => setShowInfo(!showInfo)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    boxShadow: 'none',
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.4)',
                    display: 'flex',
                    alignItems: 'center'
                }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>info</span>
            </button>

            {error && <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold' }}>{error}</span>}

            {showInfo && (
                <>
                    <div 
                        onClick={() => setShowInfo(false)}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9000 }} 
                    />
                    <div style={{
                        position: 'absolute',
                        top: '110%',
                        left: 0,
                        width: '240px',
                        background: '#1a1b2e',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '1rem',
                        zIndex: 9001,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        animation: 'fadeInUp 0.15s ease'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            Markdown Format Guide
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', lineHeight: '1.6' }}>
                            ### Topic Name<br />
                            **Q:** The Question text<br />
                            **A:** The Answer text<br />
                            ---<br />
                            (repeat for next card)
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
