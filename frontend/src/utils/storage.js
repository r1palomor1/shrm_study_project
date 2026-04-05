const STORAGE_KEY = 'shrm_study_decks';
const VAULT_KEY = 'shrm_distractor_vault';

export function saveDistractorToVault(fingerprint, data, certLevel = 'CP') {
    try {
        const vault = loadVaultFromStorage();
        const cleanId = String(fingerprint).replace(/[\s\n\r]/g, '');
        const quizType = data.quizType || (data.scenario ? 'intelligent' : 'simple');
        const key = `${cleanId}:${quizType}:${certLevel}`;
        const existingData = vault[key] || {};
        vault[key] = {
            ...existingData,
            ...data,
            quizType,
            certLevel,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
        return true;
    } catch (error) {
        console.error('Error saving to Distractor Vault:', error);
        return false;
    }
}

export function getDistractorFromVault(fingerprint, quizType = 'intelligent', certLevel = 'CP') {
    const rawVault = localStorage.getItem(VAULT_KEY) || '{}';
    const vault = JSON.parse(rawVault);
    const cleanId = String(fingerprint).replace(/[\s\n\r]/g, '');
    const key = `${cleanId}:${quizType}:${certLevel}`;
    
    // V8.1: Unified Recall Mapping (Shared Definitions Fallback)
    const fallbackKey = (quizType === 'simple' && certLevel === 'SCP') ? `${cleanId}:simple:CP` : null;

    const data = vault[key] || (fallbackKey ? vault[fallbackKey] : null) || (vault[`${cleanId}:${quizType}`] || null);
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

export function saveMetadataToVault(results, certLevel = 'CP') {
    const vault = loadVaultFromStorage();
    let updatedCount = 0;
    results.forEach(res => {
        const cleanId = String(res.id).replace(/[\s\n\r]/g, '');
        const key = `${cleanId}:simple:${certLevel}`;
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

export function exportAppData() {
    const decks = loadDecksFromStorage() || [];
    const vault = loadVaultFromStorage() || {};
    const snapshot = { version: '1.0', timestamp: new Date().toISOString(), decks: decks, vault: vault };
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

export async function importAppData(jsonFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const snapshot = JSON.parse(e.target.result);
                if (!snapshot.decks || !snapshot.vault) throw new Error('Invalid backup file format');
                localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.decks));
                localStorage.setItem(VAULT_KEY, JSON.stringify(snapshot.vault));
                resolve(true);
            } catch (error) { reject(error); }
        };
        reader.onerror = () => reject(new Error('File reading error'));
        reader.readAsText(jsonFile);
    });
}

export async function mergeAppData(jsonFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const snapshot = JSON.parse(e.target.result);
                if (!snapshot.decks || !snapshot.vault) throw new Error('Invalid backup file format');
                const currentVault = loadVaultFromStorage();
                const mergedVault = { ...currentVault, ...snapshot.vault };
                localStorage.setItem(VAULT_KEY, JSON.stringify(mergedVault));
                const currentDecks = loadDecksFromStorage();
                const existingTitles = new Set(currentDecks.map(d => d.title));
                const newDecks = snapshot.decks.filter(d => !existingTitles.has(d.title));
                if (newDecks.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify([...currentDecks, ...newDecks]));
                resolve(true);
            } catch (error) { reject(error); }
        };
        reader.onerror = () => reject(new Error('File reading error'));
        reader.readAsText(jsonFile);
    });
}

export function saveDeckToStorage(deck) {
    try {
        const decks = loadDecksFromStorage() || [];
        const existingIndex = decks.findIndex(d => d.title === deck.title);
        if (existingIndex !== -1) decks[existingIndex] = deck;
        else decks.push(deck);
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
    } catch (error) { console.error('Error deleting deck from storage:', error); }
}

export function clearAllDecksFromStorage() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) { console.error('Error clearing decks:', error); }
}

export function clearAiVault() {
    try {
        localStorage.removeItem(VAULT_KEY);
        localStorage.removeItem('shrm_domain_snapshots');
        return true;
    } catch (error) {
        console.error('Error clearing AI Vault:', error);
        return false;
    }
}

export function resolveCardDomains(card, certLevel = 'CP', deckTitle = '', vault = null) {
    const activeVault = vault || loadVaultFromStorage();
    const cleanId = String(card.id).replace(/[\s\n\r]/g, '');
    const intelKey = `${cleanId}:intelligent:${certLevel}`;
    const simpleKey = `${cleanId}:simple:${certLevel}`;
    const otherCert = certLevel === 'CP' ? 'SCP' : 'CP';
    const vaultData = activeVault[intelKey] || activeVault[simpleKey] || activeVault[`${cleanId}:intelligent:${otherCert}`] || activeVault[`${cleanId}:simple:${otherCert}`] || {};
    const domains = ['Competencies'];
    let baskDomain = card.tag_bask || vaultData.tag_bask;
    if (!baskDomain && deckTitle && typeof deckTitle === 'string') {
        if (deckTitle.includes('People')) baskDomain = 'People';
        else if (deckTitle.includes('Organization')) baskDomain = 'Organization';
        else if (deckTitle.includes('Workplace')) baskDomain = 'Workplace';
    }
    if (baskDomain) {
        if (baskDomain.includes('People')) domains.push('People');
        else if (baskDomain.includes('Organization')) domains.push('Organization');
        else if (baskDomain.includes('Workplace')) domains.push('Workplace');
    }
    return domains;
}

export function getVaultStats(certLevel, decks) {
    const vault = loadVaultFromStorage();
    const stats = { 'ALL': { intelligent: 0, simple: 0, total: 0 } };
    const domainIds = ['People', 'Organization', 'Workplace', 'Competencies'];
    domainIds.forEach(d => stats[d] = { intelligent: 0, simple: 0, total: 0 });
    decks.forEach(deck => {
        deck.cards.forEach(card => {
            const cleanId = String(card.id).replace(/[\s\n\r]/g, '');
            const intelKey = `${cleanId}:intelligent:${certLevel}`;
            const simpleKey = `${cleanId}:simple:${certLevel}`;
            const intelData = vault[intelKey];
            
            // V8.1: Unified Recall Mapping (Stats Fallback)
            const simpleData = vault[simpleKey] || (certLevel === 'SCP' ? vault[`${cleanId}:simple:CP`] : null);
            
            stats['ALL'].total++;
            if (intelData && intelData.scenario && intelData.rationale) stats['ALL'].intelligent++;
            if (simpleData && simpleData.scenario && simpleData.rationale && Array.isArray(simpleData.distractors) && simpleData.distractors.length > 0) stats['ALL'].simple++;
            const targetDomains = resolveCardDomains(card, certLevel, deck.title, vault);
            targetDomains.forEach(domain => {
                if (stats[domain]) {
                    stats[domain].total++;
                    if (intelData && intelData.scenario && intelData.rationale) stats[domain].intelligent++;
                    if (simpleData && simpleData.scenario && simpleData.rationale && Array.isArray(simpleData.distractors) && simpleData.distractors.length > 0) stats[domain].simple++;
                }
            });
        });
    });
    return stats;
}

export function saveDomainSnapshot(domainId, quizType, certLevel, percentage) {
    try {
        const snapshots = JSON.parse(localStorage.getItem('shrm_domain_snapshots') || '{}');
        const key = `${domainId}:${quizType}:${certLevel}`;
        if (!snapshots[key]) snapshots[key] = [];
        snapshots[key].push({ percentage, timestamp: new Date().toISOString() });
        if (snapshots[key].length > 10) snapshots[key].shift();
        localStorage.setItem('shrm_domain_snapshots', JSON.stringify(snapshots));
    } catch (error) { console.error('Error saving domain snapshot:', error); }
}

export function getDomainSnapshots(domainId, quizType, certLevel) {
    const snapshots = JSON.parse(localStorage.getItem('shrm_domain_snapshots') || '{}');
    const key = `${domainId}:${quizType}:${certLevel}`;
    return snapshots[key] || [];
}

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
                if (targetDomains.includes(domainId)) { card[statusKey] = 'unseen'; delete card[optionKey]; }
            });
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
        return true;
    } catch (error) { console.error('Error resetting domain progress:', error); return false; }
}

export function resetAllDecksProgress() {
    try {
        const decks = loadDecksFromStorage();
        if (!decks) return;
        decks.forEach(deck => {
            deck.cards.forEach(card => {
                card.status_traditional = 'unseen'; card.status_test = 'unseen';
                Object.keys(card).forEach(key => {
                    if (key.includes('status_quiz_') || key.includes('history_') || key.includes('selected_option_') || key.includes('correct_count_') || key.includes('incorrect_count_')) delete card[key];
                });
            });
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
        return true;
    } catch (error) { console.error('Error resetting all progress:', error); return false; }
}

export function clearSimpleVaultData() {
    try {
        const vault = JSON.parse(localStorage.getItem(VAULT_KEY) || '{}');
        const keys = Object.keys(vault);
        let count = 0;
        keys.forEach(key => { if (key.includes(':simple:')) { delete vault[key]; count++; } });
        localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
        return true;
    } catch (error) { console.error('Error in Surgical Purge:', error); return false; }
}

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
            if (eQuizType === quizType && eCertLevel === certLevel) { if (entry.distractors) { delete entry.distractors; count++; } }
        });
        localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
        return count;
    } catch (error) { console.error('Error in Distractor Purge:', error); return false; }
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
                    if (newStatus === 'audio_seen') card.status_audio_seen = 'seen';
                    else if (newStatus === 'audio_reset') card.status_audio_seen = null;
                    else if (studyMode === 'traditional') {
                        card.status_traditional = newStatus;
                        if (newStatus === 'difficulty-5') card['correct_count_traditional'] = (card['correct_count_traditional'] || 0) + 1;
                        if (newStatus === 'difficulty-1') card['incorrect_count_traditional'] = (card['incorrect_count_traditional'] || 0) + 1;
                    } else if (studyMode === 'test') { card.status_test = newStatus; }
                    else if (studyMode === 'quiz') {
                        card[statusKey] = newStatus;
                        if (newStatus === 'difficulty-5') card[correctCountKey] = (card[correctCountKey] || 0) + 1;
                        if (newStatus === 'difficulty-1') card[incorrectCountKey] = (card[incorrectCountKey] || 0) + 1;
                        if (historyData?.selectedOption) card[optionKey] = historyData.selectedOption;
                    }
                    if (historyData) {
                        if (studyMode === 'test') card.history_test = { userInput: historyData.userInput, grade: newStatus, percentage: historyData.percentage, feedback: historyData.feedback, timestamp: new Date().toISOString() };
                        else if (studyMode === 'quiz') card[historyKey] = { grade: newStatus, timestamp: new Date().toISOString() };
                    }
                    updated = true;
                }
            }
        }
        if (updated) localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
    }
}
