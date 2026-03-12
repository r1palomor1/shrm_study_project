import { useState, useRef } from 'react';
import { parseMarkdownToDeck } from '../utils/markdownParser';

export default function DataImporter({ onDeckLoaded }) {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.md')) {
            setError('Please select a valid Markdown (.md) file.');
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
                    setError('No valid flashcards found in the file. Please check the format.');
                } else {
                    onDeckLoaded(parsedDeck);
                }
            } catch (err) {
                console.error("Parsing Error Details:", err);
                setError('Error parsing the file data.');
            } finally {
                setIsLoading(false);
                // Reset input for re-uploading the same file
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.onerror = () => {
            setError('Failed to read file.');
            setIsLoading(false);
        };

        reader.readAsText(file);
    };

    return (
        <div className="glass-panel" style={{ textAlign: 'center' }}>
            <h2>Import Study Material</h2>
            <p style={{ color: 'var(--text-muted)' }}>
                Upload your highly-structured .md flashcard file to begin studying locally.
            </p>

            {error && (
                <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    color: '#fca5a5',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginTop: '1rem',
                    marginBottom: '1rem'
                }}>
                    {error}
                </div>
            )}

            <div style={{ marginTop: '2rem' }}>
                <input
                    type="file"
                    accept=".md"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    id="md-upload"
                />
                <label htmlFor="md-upload">
                    <button as="span" style={{ pointerEvents: 'none' }}>
                        {isLoading ? 'Parsing...' : 'Select Markdown File (.md)'}
                    </button>
                </label>
            </div>

            <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'left', backgroundColor: 'var(--bg-darker)', padding: '1rem', borderRadius: '12px' }}>
                <strong>Format Reminder:</strong><br />
                <code>### Topic Name</code><br />
                <code>**Q:** Question</code><br />
                <code>**A:** Answer</code><br />
                <code>---</code>
            </div>
        </div>
    );
}
