import { getDistractorFromVault, saveDistractorToVault, loadVaultFromStorage, saveMetadataToVault, resolveCardDomains } from './storage';

export async function getQuizDataByFilter(decks, filter = {}, requestedQuizType = 'intelligent', certLevel = 'CP', studyMode = 'quiz') {
    const { domainId, length, isWeighted } = filter;
    const vault = loadVaultFromStorage();
    const statusKey = studyMode === 'traditional' ? 'status_traditional' : `status_quiz_${requestedQuizType}_${certLevel}`;
    const pools = { 'People': [], 'Organization': [], 'Workplace': [], 'Competencies': [] };
    decks.forEach(deck => {
        deck.cards.forEach(card => {
            const cleanId = String(card.id).replace(/[\s\n\r]/g, '');
            const vaultData = vault[`${cleanId}:${requestedQuizType}:${certLevel}`];
            const cardDomains = resolveCardDomains(card, certLevel, deck.title, vault);
            let isReady = (studyMode === 'traditional');
            if (!isReady && vaultData) {
                // UNIFIED ELITE VALIDATION: Scenario + Rationale mandatory for ALL modes
                const hasDna = (card.answer?.includes(';') === (vaultData.distractors?.[0]?.includes(';') || false));
                isReady = !!vaultData.scenario && !!vaultData.rationale && Array.isArray(vaultData.distractors) && vaultData.distractors.length > 0 && hasDna;
            }
            if (isReady) {
                const primaryDomain = cardDomains.find(d => d !== 'Competencies') || 'Competencies';
                if (domainId && domainId !== 'ALL' && !cardDomains.includes(domainId)) return;
                pools[primaryDomain]?.push({ ...card, aiData: vaultData });
            }
        });
    });
    let finalSelection = [];
    const totalReady = Object.values(pools).reduce((acc, p) => acc + p.length, 0);
    const isTraditional = (studyMode === 'traditional');
    if (!isTraditional && (isWeighted || (domainId === 'ALL' && (length === 134 || length === 50)))) {
        const weights = { 'People': 0.35, 'Organization': 0.35, 'Workplace': 0.30, 'Competencies': 0.0 };
        const targetLen = length === -1 ? totalReady : length;
        Object.keys(pools).forEach(dom => {
            const pool = pools[dom].sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, {numeric: true}));
            if (pool.length === 0) return;
            const count = Math.max(1, Math.floor(targetLen * (weights[dom] || 0)));
            const firstUnseenIdx = pool.findIndex(card => !card[statusKey] || card[statusKey] === 'unseen');
            const startIdx = firstUnseenIdx === -1 ? 0 : firstUnseenIdx;
            finalSelection = [...finalSelection, ...pool.slice(startIdx, startIdx + count)];
        });
        finalSelection = finalSelection.slice(0, targetLen);
    } else {
        const flatPool = Object.values(pools).flat();
        const pool = flatPool.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, {numeric: true}));
        if (length === -1 || (isTraditional && length === 9999)) {
            finalSelection = pool;
        } else {
            const unseenPool = pool.filter(card => !card[statusKey] || card[statusKey] === 'unseen');
            if (unseenPool.length >= length) {
                finalSelection = unseenPool.slice(0, length);
            } else {
                const playedPool = pool.filter(card => card[statusKey] && card[statusKey] !== 'unseen');
                finalSelection = [...unseenPool, ...playedPool.slice(0, length - unseenPool.length)];
            }
        }
    }
    return { cards: finalSelection, totalAvailable: totalReady, isUnderStrength: (length > 0 && totalReady < length), requestedLength: length };
}

export async function getQuizDataForDeck(deck, requestedQuizType = 'intelligent', certLevel = 'CP') {
    const cardsWithData = deck.cards.map(card => {
        const vaultData = getDistractorFromVault(card.id, requestedQuizType, certLevel);
        const isValidBaskDomain = (tag) => tag && (tag.toLowerCase().includes('people') || tag.toLowerCase().includes('organization') || tag.toLowerCase().includes('workplace'));
        // UNIFIED ELITE VALIDATION: Purging all thinned data
        let isValid = false;
        if (vaultData && vaultData.quizType === requestedQuizType) {
            const hasDna = (card.answer?.includes(';') === (vaultData.distractors?.[0]?.includes(';') || false));
            isValid = !!vaultData.scenario && 
                      !!vaultData.rationale && 
                      Array.isArray(vaultData.distractors) && 
                      vaultData.distractors.length > 0 && 
                      isValidBaskDomain(vaultData.tag_bask) && 
                      hasDna;
        }
        return { ...card, aiData: isValid ? vaultData : null };
    });
    const missingCards = cardsWithData.filter(c => !c.aiData);
    return { cards: cardsWithData, missingCount: missingCards.length, hasAllData: missingCards.length === 0, missingCards: missingCards };
}

export async function generateDistractorsBatch(cards, quizType = 'intelligent', onProgress, certLevel = 'CP') {
    let successfulCount = 0;
    const totalRequests = cards.length;
    let i = 0;
    let forceSolo = false;

    while (i < cards.length) {
        // STABILITY LOCK: Batch size 2 for all monolithic generation
        let batchSize = forceSolo ? 1 : 2;
        let STAGGER = 30000; 
        
        if (forceSolo) {
            console.warn(`[GEAR 2: RECOVERY] ⚙️ Forcing Solo Gear for Card ${currentCard.id}.`);
        }

        const batch = cards.slice(i, i + batchSize);
        const payloadCards = batch.map(c => {
            const ans = c.answer || "";
            return {
                id: String(c.id).replace(/[\s\n\r]/g, ''),
                question: c.question,
                answer: ans,
                targetLength: ans.length,
                originalPunctuation: ans.includes(';') ? 'semicolon' : 'standard'
            };
        });

        try {
            const response = await fetch('/api/study-coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'generate-distractors', quizType, certLevel, cards: payloadCards })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const error = new Error(`Vercel Bridge Error: ${response.status}`);
                error.raw = errData.raw;
                throw error;
            }

            const data = await response.json();
            if (data && data.results) {
                data.results.forEach(res => {
                    const cleanId = String(res.id).replace(/[\s\n\r]/g, '');
                    const matchingCard = batch.find(bc => String(bc.id).replace(/[\s\n\r]/g, '') === cleanId);
                    if (!matchingCard) return;

                    saveDistractorToVault(cleanId, {
                        ...res,
                        quizType: quizType
                    }, certLevel);
                });
                successfulCount += data.results.length;
                if (onProgress) onProgress(Math.min(100, Math.round((successfulCount / totalRequests) * 100)), null);
            }
            
            i += batchSize; 
            forceSolo = false; 
            if (i < cards.length) await new Promise(r => setTimeout(r, STAGGER));

        } catch (error) {
            console.error(`ERROR in generateDistractorsBatch:`, error.message);
            if (error.raw) {
                console.error(`[FORENSIC AUDIT] Raw AI Output:`, String(error.raw).substring(0, 500));
            }
            if (batchSize > 1) {
                console.warn(`[THROTTLE DOWN] ⚠️ Batch of 2 failed. Dropping to Solo Gear.`);
                forceSolo = true; 
                await new Promise(r => setTimeout(r, 10000));
            } else {
                console.error(`[SURGICAL AUDIT REQUIRED] ⚠️ Card ${currentCard.id} failed Solo-Sync. Checking for data clumping/timeouts.`);
                i++; 
                forceSolo = false; 
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    }
    return { success: successfulCount > 0, totalProcessed: successfulCount };
}

export async function refineMetadataBatch(cards, certLevel, onProgress = null) {
    if (!cards || cards.length === 0) return { success: true, count: 0 };
    if (onProgress) onProgress(cards.length);
    return { success: true, count: cards.length };
}

export async function polishGapsBatch(cards, certLevel, onProgress = null) {
    if (!cards || cards.length === 0) return { success: true, count: 0 };
    if (onProgress) onProgress(cards.length);
    return { success: true, count: cards.length };
}
