const STORAGE_KEY = 'shrm_study_decks';

export function saveDeckToStorage(deck) {
    try {
        const decks = loadDecksFromStorage() || [];
        const existingIndex = decks.findIndex(d => d.title === deck.title);

        if (existingIndex !== -1) {
            decks[existingIndex] = deck; // Update existing
        } else {
            decks.push(deck); // Add new
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
        return true;
    } catch (error) {
        console.error('Error saving deck to storage:', error);
        return false;
    }
}

export function loadDecksFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading decks from storage:', error);
        return [];
    }
}

export function deleteDeckFromStorage(deckTitle) {
    try {
        const decks = loadDecksFromStorage() || [];
        const updatedDecks = decks.filter(d => d.title !== deckTitle);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDecks));
    } catch (error) {
        console.error('Error deleting deck from storage:', error);
    }
}

export function clearAllDecksFromStorage() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing decks:', error);
    }
}

export function updateCardStatus(cardId, studyMode, newStatus, historyData = null) {
    const decks = loadDecksFromStorage();
    if (decks && decks.length > 0) {
        let updated = false;
        for (const deck of decks) {
            const cardIndex = deck.cards.findIndex(c => c.id === cardId);
            if (cardIndex !== -1) {
                if (studyMode === 'traditional') {
                    deck.cards[cardIndex].status_traditional = newStatus;
                } else if (studyMode === 'test') {
                    deck.cards[cardIndex].status_test = newStatus;
                }

                // Save permanent history if provided
                if (historyData) {
                    if (studyMode === 'test') {
                        deck.cards[cardIndex].history_test = {
                            userInput: historyData.userInput,
                            grade: newStatus,
                            percentage: historyData.percentage,
                            feedback: historyData.feedback,
                            timestamp: new Date().toISOString()
                        };
                    }
                }

                updated = true;
                break;
            }
        }
        if (updated) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
        }
    }
}
