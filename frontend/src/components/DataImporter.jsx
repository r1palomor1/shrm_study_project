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
                const parsedDecks = parseMarkdownToDeck(markdown);

                if (!parsedDecks || parsedDecks.length === 0 || parsedDecks.every(d => d.cards.length === 0)) {
                    setError('No flashcards found.');
                } else {
                    parsedDecks.forEach(deck => {
                        if (deck.cards.length > 0) onDeckLoaded(deck);
                    });
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
        <input
            type="file"
            accept=".md"
            onChange={handleFileUpload}
            ref={fileInputRef}
            style={{ display: 'none' }}
            id="md-upload-main"
        />
    );
}
