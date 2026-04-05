import { getDistractorFromVault, saveDistractorToVault, loadVaultFromStorage, saveMetadataToVault, resolveCardDomains } from './storage';

// V8.0 STRATEGIC ORCHESTRATOR: The direct API endpoint for the Hugging Face Space
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

/**
 * V8.0 BUCKETIZED DISCOVERY: Categorizes cards for Surgical Repair
 */
export async function getQuizDataForDeck(deck, requestedQuizType = 'intelligent', certLevel = 'CP') {
    const buckets = {
        fullSync: [],
        repairDistractors: [],
        repairMetadata: []
    };

    const cardsWithData = deck.cards.map(card => {
        const vaultData = getDistractorFromVault(card.id, requestedQuizType, certLevel);
        const isValidBaskDomain = (tag) => tag && (tag.toLowerCase().includes('people') || tag.toLowerCase().includes('organization') || tag.toLowerCase().includes('workplace'));
        const isValidBehavior = (tag) => tag && tag !== 'Professionalism'; // Detect default-filler tags
        
        let isValid = false;
        let gapType = 'none';

        if (vaultData && vaultData.quizType === requestedQuizType) {
            const hasDna = (card.answer?.includes(';') === (vaultData.distractors?.[0]?.includes(';') || false));
            const hasContent = !!vaultData.scenario && !!vaultData.rationale;
            const hasDistractors = Array.isArray(vaultData.distractors) && vaultData.distractors.length > 0;
            const hasMetadata = isValidBaskDomain(vaultData.tag_bask) && isValidBehavior(vaultData.tag_behavior);

            if (hasContent && hasDistractors && hasMetadata && hasDna) {
                isValid = true;
            } else if (hasContent) {
                if (!hasDistractors || !hasDna) gapType = 'distractors';
                else if (!hasMetadata) gapType = 'metadata';
            } else {
                gapType = 'full';
            }
        } else {
            gapType = 'full';
        }

        const cardState = { ...card, aiData: isValid ? vaultData : null };
        if (gapType === 'full') buckets.fullSync.push(cardState);
        else if (gapType === 'distractors') buckets.repairDistractors.push({ ...cardState, existingData: vaultData });
        else if (gapType === 'metadata') buckets.repairMetadata.push({ ...cardState, existingData: vaultData });

        return cardState;
    });

    return { 
        cards: cardsWithData, 
        missingCount: buckets.fullSync.length + buckets.repairDistractors.length + buckets.repairMetadata.length,
        buckets,
        hasAllData: buckets.fullSync.length === 0 && buckets.repairDistractors.length === 0 && buckets.repairMetadata.length === 0
    };
}

/**
 * V8.0 SURGICAL SYNC ENGINE
 * Supports 'full', 'repair-distractors', and 'repair-metadata' modes.
 */
export async function generateDistractorsBatch(cards, quizType = 'intelligent', onProgress, certLevel = 'CP', mode = 'full') {
    const totalRequests = cards.length;
    const payloadCards = cards.map(c => {
        const base = {
            id: String(c.id).replace(/[\s\n\r]/g, ''),
            question: c.question,
            answer: c.answer || "",
            originalPunctuation: (c.answer || "").includes(';') ? 'semicolon' : 'standard'
        };
        // For repair modes, inject existing content to preserve it
        if (mode !== 'full' && c.existingData) {
            return {
                ...base,
                scenario: c.existingData.scenario,
                rationale: c.existingData.rationale,
                correct_answer: c.existingData.correct_answer || c.answer
            };
        }
        return base;
    });

    try {
        console.log(`[V8 ASYNC] Submitting ${mode.toUpperCase()} Job for ${totalRequests} cards...`);
        const submitResponse = await fetch(`${HF_API_BASE_URL}/generate-distractors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizType, certLevel, cards: payloadCards, mode })
        });

        if (!submitResponse.ok) throw new Error(`HF Submit Fail: ${submitResponse.status}`);
        const { job_id } = await submitResponse.json();
        console.log(`[V8 ASYNC] Job Created: ${job_id}. Polling...`);

        let isDone = false;
        let successfulCount = 0;

        while (!isDone) {
            await new Promise(r => setTimeout(r, 4000));
            const statusResponse = await fetch(`${HF_API_BASE_URL}/sync-status/${job_id}`);
            if (!statusResponse.ok) continue;

            const { status, results, completed } = await statusResponse.json();
            
            if (results && results.length > 0) {
                console.log(`[V8 HEARTBEAT] Received ${results.length} cards (${mode}).`);
                results.forEach(res => {
                    const cleanId = String(res.id).replace(/[\s\n\r]/g, '');
                    const existing = getDistractorFromVault(cleanId, quizType, certLevel);
                    
                    // SURGICAL MERGE: Only overwrite the repaired fields
                    saveDistractorToVault(cleanId, {
                        ...(existing || {}),
                        ...res,
                        quizType: quizType
                    }, certLevel);
                });
                successfulCount = completed;
                if (onProgress) onProgress(Math.min(100, Math.round((successfulCount / totalRequests) * 100)), null);
            }

            if (status === 'done') isDone = true;
            else if (status === 'error') throw new Error(`V8 ${mode.toUpperCase()} Job Error`);
        }

        return { success: true, totalProcessed: successfulCount };

    } catch (error) {
        console.error(`[V8 FATAL] ${mode.toUpperCase()} Pipeline Crashed:`, error.message);
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
