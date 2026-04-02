import { getDistractorFromVault, saveDistractorToVault, loadVaultFromStorage, saveMetadataToVault, resolveCardDomains } from './storage';

// HF-STABILITY-GEARBOX: The direct API endpoint for the Hugging Face Space
const HF_API_BASE_URL = 'https://r1palomor1-sync-engine-shbsk.hf.space';

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

/**
 * ENGINE: V6 ASYNC POLLING CLUSTER
 * Submits the full batch to HF and then polls for progress.
 * Infrastructure: Hugging Face Spaces (Long-Running Worker)
 */
export async function generateDistractorsBatch(cards, quizType = 'intelligent', onProgress, certLevel = 'CP') {
    const totalRequests = cards.length;
    const payloadCards = cards.map(c => ({
        id: String(c.id).replace(/[\s\n\r]/g, ''),
        question: c.question,
        answer: c.answer || "",
        originalPunctuation: (c.answer || "").includes(';') ? 'semicolon' : 'standard'
    }));

    try {
        // 1. SUBMIT JOB
        console.log(`[V6 ASYNC] Submitting Sync Job for ${totalRequests} cards to HF...`);
        const submitResponse = await fetch(`${HF_API_BASE_URL}/generate-distractors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizType, certLevel, cards: payloadCards })
        });

        if (!submitResponse.ok) throw new Error(`HF Submit Fail: ${submitResponse.status}`);
        const { job_id } = await submitResponse.json();
        console.log(`[V6 ASYNC] Job Created: ${job_id}. Starting Heartbeat Poll...`);

        // 2. POLLING LOOP (Heartbeat)
        let isDone = false;
        let successfulCount = 0;

        while (!isDone) {
            await new Promise(r => setTimeout(r, 4000)); // Heartbeat interval: 4s

            const statusResponse = await fetch(`${HF_API_BASE_URL}/sync-status/${job_id}`);
            if (!statusResponse.ok) continue; // Retry on transient network blip

            const { status, results, completed } = await statusResponse.json();
            
            // Incrementally Save Partial Results
            if (results && results.length > 0) {
                console.log(`[V6 HEARTBEAT] Received ${results.length} new cards from HF.`);
                results.forEach(res => {
                    const cleanId = String(res.id).replace(/[\s\n\r]/g, '');
                    saveDistractorToVault(cleanId, {
                        ...res,
                        quizType: quizType
                    }, certLevel);
                });
                successfulCount = completed; // Use server-side absolute count
                
                // Update Progress UI (Relative to total sync)
                if (onProgress) onProgress(Math.min(100, Math.round((successfulCount / totalRequests) * 100)), null);
            }

            if (status === 'done') {
                isDone = true;
                console.log(`[V6 ASYNC] Job Total Complete: ${job_id}`);
            } else if (status === 'error') {
                throw new Error("Hugging Face Job Error");
            }
        }

        return { success: true, totalProcessed: successfulCount };

    } catch (error) {
        console.error(`[V6 FATAL] Sync Pipeline Crashed:`, error.message);
        return { success: false, error: error.message };
    }
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
