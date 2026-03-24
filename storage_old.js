const STORAGE_KEY = 'shrm_study_decks';
const VAULT_KEY = 'shrm_distractor_vault';

/**
 * Saves AI-generated distractor data (distractors, rationale, and BASK tags) 
 * to the local vault using the card's unique fingerprint.
 * @param {string} fingerprint - Unique identifier for the card content.
 * @param {object} data - The AI response data.
 * @param {string} certLevel - The certification level (CP or SCP).
 */
export function saveDistractorToVault(fingerprint, data, certLevel = 'CP') {
    try {
        const vault = loadVaultFromStorage();

        // EXTREME HARDENING & HANDSHAKE: Strip all whitespace/control characters
        const cleanId = String(fingerprint).replace(/[\s\n\r]/g, '');
        const quizType = data.quizType || (data.scenario ? 'intelligent' : 'simple');
        const key = `${cleanId}:${quizType}:${certLevel}`;

        // MERGE LOGIC: Preserve existing data (like scenario from seed stage) when adding new fields
        const existingData = vault[key] || {};
        vault[key] = {
            ...existingData,
            ...data,
            quizType, // Ensure it's explicitly saved for Matrix checks
            certLevel, // Explicitly store for debugging/consistency
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
 * Retrieves AI-generated data from the vault for a specific fingerprint, mode, and cert.
 */
export function getDistractorFromVault(fingerprint, quizType = 'intelligent', certLevel = 'CP') {
    const rawVault = localStorage.getItem(VAULT_KEY) || '{}';
    const vault = JSON.parse(rawVault);

    // EXTREME HARDENING: Clean the lookup ID to match the saved ID
    const cleanId = String(fingerprint).replace(/[\s\n\r]/g, '');
    const key = `${cleanId}:${quizType}:${certLevel}`;

    // Fallback logic for transitioning existing data (assumes old data is CP)
    const oldKey = `${cleanId}:${quizType}`;

    const data = vault[key] || (certLevel === 'CP' ? vault[oldKey] : null) || (vault[cleanId]?.quizType === quizType ? vault[cleanId] : null);
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

/**
 * Merges backup data into the current store WITHOUT wiping student progress.
 * Adds new vault entries (CP/SCP) and only Appends new deck topics.
 */
export async function mergeAppData(jsonFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const snapshot = JSON.parse(e.target.result);

                if (!snapshot.decks || !snapshot.vault) {
                    throw new Error('Invalid backup file format');
                }

                // 1. Merge the AI Distractor Vault (Key-level isolation allows CP + SCP coexistence)
                const currentVault = loadVaultFromStorage();
                const mergedVault = { ...currentVault, ...snapshot.vault };
                localStorage.setItem(VAULT_KEY, JSON.stringify(mergedVault));

                // 2. Merge Decks Selective: Keep existing cards/progress, only add missing topics
                const currentDecks = loadDecksFromStorage();
                const existingTitles = new Set(currentDecks.map(d => d.title));
                const newDecks = snapshot.decks.filter(d => !existingTitles.has(d.title));

                if (newDecks.length > 0) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify([...currentDecks, ...newDecks]));
                }

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

export function clearAiVault() {
    try {
        localStorage.removeItem(VAULT_KEY);
        return true;
    } catch (error) {
        console.error('Error clearing AI Vault:', error);
        return false;
    }
}

/**
 * SURGICAL NUKE: Purges ONLY simple recall data while keeping Intelligent scenarios.
 * Scans the vault for keys containing ":simple:" and deletes them.
 */
export function clearSimpleVaultData() {
    try {
        const vault = JSON.parse(localStorage.getItem(VAULT_KEY) || '{}');
        const keys = Object.keys(vault);
        let count = 0;

        keys.forEach(key => {
            // Check for the ':simple:' flag in the isolated key pattern
            if (key.includes(':simple:')) {
                delete vault[key];
                count++;
            }
        });

        localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
        console.info(`[SURGICAL PURGE] Removed ${count} Simple Distractor items.`);
        return true;
    } catch (error) {
        console.error('Error in Surgical Purge:', error);
        return false;
    }
}

export function updateCardStatus(cardId, studyMode, newStatus, historyData = null) {
    const certLevel = historyData?.certLevel || 'CP';
    const quizType = historyData?.quizType || 'intelligent';
    const statusKey = `status_quiz_${quizType}_${certLevel}`;
    const historyKey = `history_quiz_${quizType}_${certLevel}`;
    const optionKey = `selected_option_${quizType}_${certLevel}`;

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
                    deck.cards[cardIndex][statusKey] = newStatus;
                    // Persist the specific option selected by the user
                    if (historyData?.selectedOption) {
                        deck.cards[cardIndex][optionKey] = historyData.selectedOption;
                    }
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
                        deck.cards[cardIndex][historyKey] = {
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
