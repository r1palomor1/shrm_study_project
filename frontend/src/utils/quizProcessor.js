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
                if (requestedQuizType === 'intelligent') {
                    // SEMICOLON VALIDATOR: Symmetrical Punctuation as proxy for READY
                    const hasDna = (card.answer?.includes(';') === vaultData.distractors?.[0]?.includes(';'));
                    isReady = !!vaultData.scenario && !!vaultData.rationale && hasDna;
                } else {
                    isReady = Array.isArray(vaultData.distractors) && vaultData.distractors.length > 0;
                }
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
            const hasDna = (card.answer?.includes(';') === vaultData.distractors?.[0]?.includes(';'));
            isValid = (requestedQuizType === 'intelligent') 
                ? (!!vaultData.scenario && !!vaultData.rationale && !!vaultData.distractors && isValidBaskDomain(vaultData.tag_bask) && hasDna)
                : (Array.isArray(vaultData.distractors) && vaultData.distractors.length > 0 && isValidBaskDomain(vaultData.tag_bask));
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

    // THE MAITRE D' (V4.3): DEEP-TRACE PROBE ENABLED
    while (i < cards.length) {
        const currentCard = cards[i];
        const ansLen = (currentCard.answer || "").length;
        
        // GEAR 2: Solo-Mode forcing if previous batch failed
        const isComplex = ansLen > 150 || forceSolo;
        let batchSize = isComplex ? 1 : (quizType === 'simple' ? 8 : 4);
        let STAGGER = isComplex ? 25000 : 20000;
        
        if (forceSolo) {
            console.warn(`%c [GEAR 2: RECOVERY] ⚙️ Forcing Solo Gear for Card ${currentCard.id}.`, 'color: #fbbf24; font-weight: bold;');
        } else if (isComplex) {
            console.log(`%c [DOWNSHIFT: SAFETY] 🚨 Card ${currentCard.id} (>150 chars). Isolating to Single-Card Request.`, 'color: #fca5a5; font-weight: bold;');
        }

        const batch = cards.slice(i, i + batchSize);
        const payloadCards = batch.map(c => {
            const ans = c.answer || "";
            return {
                id: String(c.id).replace(/[\s\n\r]/g, ''),
                question: c.question,
                answer: ans,
                scenario: c.aiData?.scenario || "",
                targetLength: ans.length,
                originalPunctuation: ans.includes(';') ? 'semicolon' : 'standard',
                startsWithVerb: ans.split(' ')[0]
            };
        });

        try {
            const response = await fetch('/api/study-coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'generate-distractors', quizType, certLevel, cards: payloadCards })
            });

            if (!response.ok) {
                // THE DEEP TRACE PROBE: Parsing the Vercel 500 response body
                let traceInfo = "No Trace Provided";
                try {
                    const errorPayload = await response.json();
                    traceInfo = JSON.stringify(errorPayload, null, 2);
                } catch (e) { traceInfo = "Response was not JSON. (Platform Crash)"; }
                
                console.error(`%c [VERCEL TRACE: DEEP PROBE] 🆘 Bridge Failure Identified:\nStatus: ${response.status}\nPayload: ${traceInfo}`, 'color: #ef4444; font-weight: bold;');
                throw new Error(`Vercel Bridge Error: ${response.status}`);
            }

            const data = await response.json();
            if (data && data.results) {
                data.results.forEach(res => {
                    const cleanId = String(res.id).replace(/[\s\n\r]/g, '');
                    const matchingCard = batch.find(bc => String(bc.id).replace(/[\s\n\r]/g, '') === cleanId);
                    if (!matchingCard) return;

                    // SYMMETRY ENGINE HUD
                    const targetLen = (matchingCard.answer || "").length;
                    const distLens = res.distractors?.map(d => d.length) || [];
                    const avgLen = distLens.reduce((a, b) => a + b, 0) / distLens.length;
                    const variance = Math.round((Math.abs(avgLen - targetLen) / targetLen) * 100);
                    const markerMatch = (matchingCard.answer?.includes(';') === res.distractors[0]?.includes(';'));

                    if (res.scenario) console.log(`%c [PHASE 1: SEED] 🟢 Card ${cleanId}: Situation Generated.`, 'color: #10b981; font-weight: bold;');
                    console.log(`%c [PHASE 2: SYMMETRY] 🟦 Card ${cleanId}: Structure [Marker: ${markerMatch ? 'PASS' : 'FAIL'}] | Density [${variance}% Var] -> CLONE READY`, `color: #60a5fa; font-weight: bold;`);
                    if (res.rationale) console.log(`%c [PHASE 3: POLISH] ✅ Card ${cleanId}: Rationale Synced.`, 'color: #3b82f6; font-weight: bold;');

                    saveDistractorToVault(cleanId, {
                        ...res,
                        quizType: quizType,
                        rationale: res.rationale,
                        gap_analysis: res.gap_analysis
                    }, certLevel);
                });
                successfulCount += data.results.length;
                if (onProgress) onProgress(Math.round((successfulCount / totalRequests) * 100), null);
            }
            
            i += batchSize; 
            forceSolo = false; // Reset to standard gear on success
            if (i < cards.length) await new Promise(r => setTimeout(r, STAGGER));

        } catch (error) {
            console.error(`ERROR in generateDistractorsBatch:`, error.message);
            if (batchSize > 1) {
                console.warn(`%c [RECOVERY] Batch failed. Throttling down to Solo-Mode for recovery...`, 'color: #fbbf24; font-weight: bold;');
                forceSolo = true; // Engage GEAR 2
                await new Promise(r => setTimeout(r, 8000));
            } else {
                // THE CIRCUIT BREAKER: Force-Skip the problem child and reset gear
                console.error(`%c [SURGICAL AUDIT REQUIRED] ⚠️ Card ${currentCard.id} failed Solo-Sync twice or is a hard-fail. Skipping.`, 'color: #f87171; font-weight: bold;');
                i++; 
                forceSolo = false; // Downshift back to standard gear for next card
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    }
    return { success: successfulCount > 0, totalProcessed: successfulCount };
}

export async function refineMetadataBatch(cards, certLevel, onProgress = null) {
    if (!cards || cards.length === 0) return { success: true, count: 0 };
    try {
        const response = await fetch('/api/study-coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'generate-distractors', quizType: 'simple', certLevel, pipelineStage: 'tagging', cards: cards.map(c => ({ id: String(c.id).replace(/[\s\n\r]/g, ''), question: c.question, answer: c.answer })) })});
        const data = await response.json();
        if (data && data.results) {
            const updatedCount = saveMetadataToVault(data.results, certLevel);
            if (onProgress) onProgress(updatedCount);
            return { success: true, count: updatedCount };
        }
        throw new Error('Refinement failed');
    } catch (e) { return { success: false, error: e.message }; }
}

export async function polishGapsBatch(cards, certLevel, onProgress = null) {
    if (!cards || cards.length === 0) return { success: true, count: 0 };
    
    let successfulCount = 0;
    const totalRequests = cards.length;
    const MAX_BATCH_SIZE = 4; 
    const STAGGER = 15000;

    console.log(`%c [POLISH: HARDENED] 🛡️ Phase 3 Protection Active (Size: 4). Joining relay...`, 'color: #3b82f6; font-weight: bold;');

    for (let i = 0; i < cards.length; i += MAX_BATCH_SIZE) {
        const batch = cards.slice(i, i + MAX_BATCH_SIZE);
        try {
            const response = await fetch('/api/study-coach', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    mode: 'generate-distractors', 
                    quizType: 'intelligent', 
                    certLevel, 
                    pipelineStage: 'polish-gaps', 
                    cards: batch.map(c => ({ 
                        id: String(c.id).replace(/[\s\n\r]/g, ''), 
                        question: c.question, 
                        answer: c.answer, 
                        scenario: c.aiData?.scenario 
                    })) 
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.results) {
                    data.results.forEach(res => saveDistractorToVault(String(res.id).replace(/[\s\n\r]/g, ''), { quizType: 'intelligent', gap_analysis: res.gap_analysis }, certLevel));
                    successfulCount += data.results.length;
                    if (onProgress) onProgress(successfulCount);
                }
            }
            if (i + MAX_BATCH_SIZE < cards.length) await new Promise(r => setTimeout(r, STAGGER));
        } catch (e) {
            console.error(`[POLISH ERROR] Batch failed:`, e.message);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    return { success: successfulCount > 0, count: successfulCount };
}
