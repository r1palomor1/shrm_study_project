const STORAGE_KEY = 'shrm_study_decks';
const VAULT_KEY = 'shrm_distractor_vault';

/**
 * Saves AI-generated distractor data (distractors, rationale, and BASK tags) 
 * to the local vault using the card's unique fingerprint.
 */
export function saveDistractorToVault(fingerprint, data) {
    try {
        const vault = loadVaultFromStorage();
        // Use composite key to allow both modes for the same card
        const key = `${fingerprint}:${data.quizType || 'intelligent'}`;
        
        vault[key] = {
            ...data,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
        return true;
    } catch (error) {
        console.error('Error saving to Distractor Vault:', error);
        return false;
    }
}

/**
 * Retrieves AI-generated data from the vault for a specific fingerprint and mode.
 */
export function getDistractorFromVault(fingerprint, quizType = 'intelligent') {
    const vault = loadVaultFromStorage();
    const key = `${fingerprint}:${quizType}`;
    
    // Fallback logic: check composite key first, then old fingerprint key if it matches the type
    const data = vault[key] || (vault[fingerprint]?.quizType === quizType ? vault[fingerprint] : null);
    return data;
}

export function loadVaultFromStorage() {
    try {
        const data = localStorage.getItem(VAULT_KEY);
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error('Error loading Distractor Vault:', error);
        return {};
    }
}

/**
 * Creates a complete snapshot of the application state for backup.
 */
export function exportAppData() {
    const decks = loadDecksFromStorage() || [];
    const vault = loadVaultFromStorage() || {};
    
    const snapshot = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        decks: decks,
        vault: vault
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const date = new Date();
    const ts = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
    const filename = `SHRM_Backup_${ts}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Restores the application state from a JSON snapshot.
 */
export async function importAppData(jsonFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const snapshot = JSON.parse(e.target.result);
                
                if (!snapshot.decks || !snapshot.vault) {
                    throw new Error('Invalid backup file format');
                }

                localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.decks));
                localStorage.setItem(VAULT_KEY, JSON.stringify(snapshot.vault));
                resolve(true);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('File reading error'));
        reader.readAsText(jsonFile);
    });
}

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
                } else if (studyMode === 'quiz') {
                    deck.cards[cardIndex].status_quiz = newStatus;
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
                    } else if (studyMode === 'quiz') {
                        deck.cards[cardIndex].history_quiz = {
                            grade: newStatus,
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
