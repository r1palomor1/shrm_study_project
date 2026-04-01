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
 * SAVES Metadata (Tags) Surgically
 * Targets the specific isolated key: id:simple:certLevel
 */
export function saveMetadataToVault(results, certLevel = 'CP') {
    const vault = loadVaultFromStorage();
    let updatedCount = 0;

    results.forEach(res => {
        const cleanId = String(res.id).replace(/[\s\n\r]/g, '');
        const key = `${cleanId}:simple:${certLevel}`;
        
        // Find if exist as simple distill record
        if (vault[key]) {
            vault[key] = {
                ...vault[key],
                tag_bask: res.tag_bask || vault[key].tag_bask,
                tag_behavior: res.tag_behavior || vault[key].tag_behavior,
                lastUpdated: new Date().toISOString()
            };
            updatedCount++;
        }
    });

    localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
    return updatedCount;
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
        // Clear snapshots as well
        localStorage.removeItem('shrm_domain_snapshots');
        return true;
    } catch (error) {
        console.error('Error clearing AI Vault:', error);
        return false;
    }
}

/**
 * STRATEGIC RESOLVER: Maps a card to its 2026 BASK Domain(s) for the Dashboard.
 * Prioritizes AI-generated tags (tag_bask, tag_behavior) over legacy deck names.
 * Ensures the 'Competencies' card populates based on Behavioral tags.
 */
export function resolveCardDomains(card, certLevel = 'CP', deckTitle = '', vault = null) {
    const activeVault = vault || loadVaultFromStorage();
    const cleanId = String(card.id).replace(/[\s\n\r]/g, '');
    const intelKey = `${cleanId}:intelligent:${certLevel}`;
    const simpleKey = `${cleanId}:simple:${certLevel}`;
    
    // Check vault for both possible keys AND both cert levels (Domain tags are content-based)
    const otherCert = certLevel === 'CP' ? 'SCP' : 'CP';
    const vaultData = activeVault[intelKey] || 
                      activeVault[simpleKey] || 
                      activeVault[`${cleanId}:intelligent:${otherCert}`] || 
                      activeVault[`${cleanId}:simple:${otherCert}`] || 
                      {};
    const domains = ['Competencies']; // Every card belongs to the master hub
    
    // 1. BASK DOMAIN (tag_bask) -> People/Organization/Workplace
    let baskDomain = card.tag_bask || vaultData.tag_bask;
    
    // Fallback ONLY for identifying starting domain (un-synced state)
    if (!baskDomain) {
        if (deckTitle && typeof deckTitle === 'string') {
            if (deckTitle.includes('People')) baskDomain = 'People';
            else if (deckTitle.includes('Organization')) baskDomain = 'Organization';
            else if (deckTitle.includes('Workplace')) baskDomain = 'Workplace';
        }
    }

    if (baskDomain) {
        // Standardize tagging (Fuzzy Match for resilience)
        if (baskDomain.includes('People')) domains.push('People');
        else if (baskDomain.includes('Organization')) domains.push('Organization');
        else if (baskDomain.includes('Workplace')) domains.push('Workplace');
    }

    return domains;
}

export function getVaultStats(certLevel, decks) {
    const vault = loadVaultFromStorage();
    const stats = {
        'ALL': { intelligent: 0, simple: 0, total: 0 }
    };
    
    // Initialize domains
    const domainIds = ['People', 'Organization', 'Workplace', 'Competencies'];
    domainIds.forEach(d => stats[d] = { intelligent: 0, simple: 0, total: 0 });

    decks.forEach(deck => {
        deck.cards.forEach(card => {
            const cleanId = String(card.id).replace(/[\s\n\r]/g, '');
            const intelKey = `${cleanId}:intelligent:${certLevel}`;
            const simpleKey = `${cleanId}:simple:${certLevel}`;
            
            const intelData = vault[intelKey];
            const simpleData = vault[simpleKey];

            // 1. MASTER COUNT (Unique IDs only)
            stats['ALL'].total++;
            if (intelData && intelData.scenario && intelData.rationale) stats['ALL'].intelligent++;
            if (simpleData && simpleData.scenario && simpleData.rationale && Array.isArray(simpleData.distractors) && simpleData.distractors.length > 0) stats['ALL'].simple++;

            // 2. DOMAIN REPLICATION (A card can belong to a Domain and a Competency card)
            const targetDomains = resolveCardDomains(card, certLevel, deck.title, vault);
            
            targetDomains.forEach(domain => {
                if (stats[domain]) {
                    stats[domain].total++;
                    
                    if (intelData && intelData.scenario && intelData.rationale) {
                        stats[domain].intelligent++;
                    }
                    if (simpleData && simpleData.scenario && simpleData.rationale && Array.isArray(simpleData.distractors) && simpleData.distractors.length > 0) {
                        stats[domain].simple++;
                    }
                }
            });
        });
    });

    return stats;
}

/**
 * SAVES a performance snapshot of a specific domain before a manual reset.
 * Used to populate the "Pulse Analytics" sparklines.
 */
export function saveDomainSnapshot(domainId, quizType, certLevel, percentage) {
    try {
        const snapshots = JSON.parse(localStorage.getItem('shrm_domain_snapshots') || '{}');
        const key = `${domainId}:${quizType}:${certLevel}`;
        
        if (!snapshots[key]) snapshots[key] = [];
        
        snapshots[key].push({
            percentage,
            timestamp: new Date().toISOString()
        });

        // Keep only top 10 most recent snapshots for performance
        if (snapshots[key].length > 10) snapshots[key].shift();
        
        localStorage.setItem('shrm_domain_snapshots', JSON.stringify(snapshots));
    } catch (error) {
        console.error('Error saving domain snapshot:', error);
    }
}

export function getDomainSnapshots(domainId, quizType, certLevel) {
    const snapshots = JSON.parse(localStorage.getItem('shrm_domain_snapshots') || '{}');
    const key = `${domainId}:${quizType}:${certLevel}`;
    return snapshots[key] || [];
}

/**
 * Surgically resets progress for ALL cards in a specific Domain.
 * Wipes current session 'unseen' markers while preserving correct_count / incorrect_count.
 */
export function resetDomainProgress(domainId, quizType, certLevel) {
    try {
        const decks = loadDecksFromStorage();
        if (!decks) return;

        const vault = loadVaultFromStorage();
        const statusKey = `status_quiz_${quizType}_${certLevel}`;
        const optionKey = `selected_option_${quizType}_${certLevel}`;

        decks.forEach(deck => {
            deck.cards.forEach(card => {
                const targetDomains = resolveCardDomains(card, certLevel, deck.title, vault);
                
                if (targetDomains.includes(domainId)) {
                    card[statusKey] = 'unseen';
                    delete card[optionKey];
                }
            });
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
        return true;
    } catch (error) {
        console.error('Error resetting domain progress:', error);
        return false;
    }
}

/**
 * Surgically resets progress for ALL cards in ALL decks.
 */
export function resetAllDecksProgress() {
    try {
        const decks = loadDecksFromStorage();
        if (!decks) return;

        decks.forEach(deck => {
            deck.cards.forEach(card => {
                // Wipe all status fields
                card.status_traditional = 'unseen';
                card.status_test = 'unseen';
                
                // Pure clean: wipe all dynamic status/history keys
                Object.keys(card).forEach(key => {
                    if (key.includes('status_quiz_') || 
                        key.includes('history_') || 
                        key.includes('selected_option_') ||
                        key.includes('correct_count_') ||
                        key.includes('incorrect_count_')) {
                        delete card[key];
                    }
                });
            });
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
        return true;
    } catch (error) {
        console.error('Error resetting all progress:', error);
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

/**
 * SURGICAL PURGE: Deletes ONLY the 'distractors' property for a specific quizType and certLevel.
 * Keeps scenarios, rationales, and metadata (tags) completely intact.
 */
export function clearDistractorsOnly(quizType, certLevel) {
    try {
        const vault = JSON.parse(localStorage.getItem(VAULT_KEY) || '{}');
        const keys = Object.keys(vault);
        let count = 0;

        keys.forEach(key => {
            const entry = vault[key];
            const cleanKey = key.split(':');
            const eQuizType = cleanKey[1] || (entry.scenario ? 'intelligent' : 'simple');
            const eCertLevel = cleanKey[2] || 'CP';

            if (eQuizType === quizType && eCertLevel === certLevel) {
                if (entry.distractors) {
                    delete entry.distractors;
                    count++;
                }
            }
        });

        localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
        return count;
    } catch (error) {
        console.error('Error in Distractor Purge:', error);
        return false;
    }
}

export function updateCardStatus(cardId, studyMode, newStatus, historyData = null) {
    const certLevel = historyData?.certLevel || 'CP';

    const quizType = historyData?.quizType || 'intelligent';
    const statusKey = `status_quiz_${quizType}_${certLevel}`;
    const historyKey = `history_quiz_${quizType}_${certLevel}`;
    const optionKey = `selected_option_${quizType}_${certLevel}`;
    const correctCountKey = `correct_count_quiz_${quizType}_${certLevel}`;
    const incorrectCountKey = `incorrect_count_quiz_${quizType}_${certLevel}`;

    const decks = loadDecksFromStorage();
    if (decks && decks.length > 0) {
        let updated = false;
        for (const deck of decks) {
            for (let i = 0; i < deck.cards.length; i++) {
                if (deck.cards[i].id === cardId) {
                    const card = deck.cards[i];

                    
                    if (newStatus === 'audio_seen') {
                        card.status_audio_seen = 'seen';
                    } else if (newStatus === 'audio_reset') {
                        card.status_audio_seen = null;
                    } else if (studyMode === 'traditional') {

                        card.status_traditional = newStatus;
                        // Tracker for traditional mastery (hits/misses) if we want it too
                        const tradCorrectKey = 'correct_count_traditional';
                        const tradIncorrectKey = 'incorrect_count_traditional';
                        if (newStatus === 'difficulty-5') card[tradCorrectKey] = (card[tradCorrectKey] || 0) + 1;
                        if (newStatus === 'difficulty-1') card[tradIncorrectKey] = (card[tradIncorrectKey] || 0) + 1;
                    } else if (studyMode === 'test') {
                        card.status_test = newStatus;
                    } else if (studyMode === 'quiz') {
                        card[statusKey] = newStatus;
                        
                        // ACCURACY PERSISTENCE: Increment Lifetime Hits vs Misses
                        if (newStatus === 'difficulty-5') card[correctCountKey] = (card[correctCountKey] || 0) + 1;
                        if (newStatus === 'difficulty-1') card[incorrectCountKey] = (card[incorrectCountKey] || 0) + 1;

                        // Persist the specific option selected by the user
                        if (historyData?.selectedOption) {
                            card[optionKey] = historyData.selectedOption;
                        }
                    }

                    // Save permanent history if provided
                    if (historyData) {
                        if (studyMode === 'test') {
                            card.history_test = {
                                userInput: historyData.userInput,
                                grade: newStatus,
                                percentage: historyData.percentage,
                                feedback: historyData.feedback,
                                timestamp: new Date().toISOString()
                            };
                        } else if (studyMode === 'quiz') {
                            card[historyKey] = {
                                grade: newStatus,
                                timestamp: new Date().toISOString()
                            };
                        }
                    }

                    updated = true;
                }
            }
        }
        if (updated) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
        } else {
            console.error(`[CRITICAL ERROR] No card matching ${cardId} was found in the Global Vault!`);
        }

    }
}
