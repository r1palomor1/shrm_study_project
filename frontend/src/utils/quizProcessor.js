import { getDistractorFromVault, saveDistractorToVault, loadVaultFromStorage, saveMetadataToVault, resolveCardDomains } from './storage';

/**
 * REFACTOR: Domain-First Extraction.
 * Filters cards across ALL topics by their AI-assigned Domain (tag_bask).
 * Implements the "Proportionality Guard" for the 134-question simulation.
 * @param {Array} decks - All loaded topics.
 * @param {Object} filter - Selection criteria { domainId, length }.
 * @param {string} requestedQuizType - 'intelligent' or 'simple'.
 * @param {string} certLevel - 'CP' or 'SCP'.
 */
export async function getQuizDataByFilter(decks, filter = {}, requestedQuizType = 'intelligent', certLevel = 'CP', studyMode = 'quiz') {
    const { domainId, length, isWeighted } = filter;
    const vault = loadVaultFromStorage();
    const statusKey = studyMode === 'traditional' ? 'status_traditional' : `status_quiz_${requestedQuizType}_${certLevel}`;

    // Helper removed - we now strictly use the universal routing matrix for 100% sync.
    
    // 1. Group cards by Domain into pools
    const pools = {
        'People': [],
        'Organization': [],
        'Workplace': [],
        'Competencies': []
    };
    
    decks.forEach(deck => {
        deck.cards.forEach(card => {
            const cleanId = String(card.id).replace(/[\s\n\r]/g, '');
            const vaultData = vault[`${cleanId}:${requestedQuizType}:${certLevel}`];
            if (studyMode === 'traditional') {
                // Flashcards should NOT care about vaultData existence
            } else if (!vaultData) {
                return;
            }

            // STRUCTURAL SYNC: Universal Routing Hub
            const cardDomains = resolveCardDomains(card, certLevel, deck.title, vault);
            
            // EXCELLENCE: Traditional mode bypasses AI-readiness (flashcards don't need scenarios)
            let isReady = (studyMode === 'traditional');
            if (!isReady && vaultData) {
                if (requestedQuizType === 'intelligent') {
                    isReady = !!vaultData.scenario && !!vaultData.rationale;
                } else {
                    isReady = Array.isArray(vaultData.distractors) && vaultData.distractors.length > 0;
                }
            }

            if (isReady) {
                // PRIMARY DOMAIN RESOLUTION: Pick the most specific BASK domain first, default to Competencies if generic.
                const primaryDomain = cardDomains.find(d => d !== 'Competencies') || 'Competencies';
                
                if (domainId && domainId !== 'ALL' && !cardDomains.includes(domainId)) return;

                pools[primaryDomain]?.push({
                    ...card,
                    aiData: vaultData
                });
            }
        });
    });

    // 2. COMPUTE WEIGHTS (BASK Authentic Weights)
    // People: 35% (~47), Org: 35% (~47), Workplace: 30% (~40)
    let finalSelection = [];
    const totalReady = Object.values(pools).reduce((acc, p) => acc + p.length, 0);

    // SECURE BYPASS: Flashcards should ALWAYS show the full pool without weighted slicing.
    const isTraditional = (studyMode === 'traditional');

    if (!isTraditional && (isWeighted || (domainId === 'ALL' && (length === 134 || length === 50)))) {
        // Apply SHRM Weights
        const weights = { 'People': 0.35, 'Organization': 0.35, 'Workplace': 0.30, 'Competencies': 0.0 };
        const targetLen = length === -1 ? totalReady : length;

        Object.keys(pools).forEach(dom => {
            const pool = pools[dom].sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, {numeric: true}));
            if (pool.length === 0) return;

            const domainWeight = weights[dom] || 0;
            const count = Math.max(1, Math.floor(targetLen * domainWeight));
            
            // PROGRESS BLOCK SELECTION
            const firstUnseenIdx = pool.findIndex(card => !card[statusKey] || card[statusKey] === 'unseen');
            const startIdx = firstUnseenIdx === -1 ? 0 : firstUnseenIdx;
            
            finalSelection = [...finalSelection, ...pool.slice(startIdx, startIdx + count)];
        });

        // Hard Slice to ensure we don't exceed targetLen (e.g., 10)
        finalSelection = finalSelection.slice(0, targetLen);
    } else {
        // Monolithic Sequential Rolling
        const flatPool = Object.values(pools).flat();
        const pool = flatPool.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, {numeric: true}));
        
        // STRUCTURAL SYNC: Universal Length Handler (Restoring 1b817de Logic)
        if (length === -1 || (isTraditional && length === 9999)) {
            finalSelection = pool;
        } else if (studyMode === 'audio') {
            // Audio Hub: Strict Unseen Persistence 
            const unseenPool = pool.filter(card => !card.status_audio_seen || card.status_audio_seen !== 'seen');
            if (unseenPool.length >= length) {
                finalSelection = unseenPool.slice(0, length);
            } else {
                const seenPool = pool.filter(card => card.status_audio_seen === 'seen');
                const needed = length - unseenPool.length;
                finalSelection = [...unseenPool, ...seenPool.slice(0, needed)];
            }
        } else {
            // BACKFILL ENGINE (from 1b817de): Prioritize unseen, fill remaining with played cards
            const unseenPool = pool.filter(card => !card[statusKey] || card[statusKey] === 'unseen');
            
            if (unseenPool.length >= length) {
                // We have enough unseen cards to fill the quota
                finalSelection = unseenPool.slice(0, length);
            } else {
                // Not enough unseen — fill the gap with the earliest played cards
                const playedPool = pool.filter(card => card[statusKey] && card[statusKey] !== 'unseen');
                const needed = length - unseenPool.length;
                finalSelection = [...unseenPool, ...playedPool.slice(0, needed)];
            }
        }
    }

    const isUnderStrength = (length > 0 && totalReady < length);

    if (studyMode === 'traditional' || (length > 0 && finalSelection.length !== length)) {
        console.group('[SHRM ENGINE DIAGNOSTICS]');
        console.table({
            'Study Mode': studyMode,
            'Domain ID': domainId,
            'Requested Length': length === -1 ? 'Full Pool' : length,
            'Actual Selection': finalSelection.length,
            'Total Pool Available': totalReady,
            'Weighted Simulation': isWeighted ? 'Yes' : 'No'
        });
        if (length > 0 && finalSelection.length !== length) {
            console.warn(`[SHRM WARNING] Slicing Mismatch: Requested ${length} but returned ${finalSelection.length}. (Check Backfill/Weighted Logic)`);
        }
        console.groupEnd();
    }

    return {
        cards: finalSelection,
        totalAvailable: totalReady,
        isUnderStrength: isUnderStrength,
        requestedLength: length
    };
}

/**
 * BACKWARD COMPATIBILITY: Original topic-based extractor.
 * Kept as a fallback for verification audits against specific source files.
 */
export async function getQuizDataForDeck(deck, requestedQuizType = 'intelligent', certLevel = 'CP') {
    const cardsWithData = deck.cards.map(card => {
        // PHYSICAL CONTENT AUDIT: We only count it if the actual payload is present
        const vaultData = getDistractorFromVault(card.id, requestedQuizType, certLevel);

        const isValidBaskDomain = (tag) => {
            if (!tag) return false;
            const low = tag.toLowerCase();
            return low.includes('people') || low.includes('organization') || low.includes('workplace');
        };

        let isValid = false;
        if (vaultData && vaultData.quizType === requestedQuizType) {
            if (requestedQuizType === 'intelligent') {
                // Intelligent mode requires a scenario, rationale, distractors, and STRICT BASK tag
                isValid = !!vaultData.scenario && !!vaultData.rationale && !!vaultData.distractors && isValidBaskDomain(vaultData.tag_bask);
            } else {
                // Simple mode requires distractors AND a STRICT BASK tag
                isValid = Array.isArray(vaultData.distractors) && vaultData.distractors.length > 0 && isValidBaskDomain(vaultData.tag_bask);
            }
        }

        return {
            ...card,
            aiData: isValid ? vaultData : null
        };
    });

    const missingCards = cardsWithData.filter(c => !c.aiData);

    return {
        cards: cardsWithData,
        missingCount: missingCards.length,
        hasAllData: missingCards.length === 0,
        missingCards: missingCards
    };
}

// MASTER HARDENING: Supporting Variable Batching for RPD optimization
const SIMPLE_BATCH_SIZE = 8;
const INTEL_BATCH_SIZE = 4;

/**
 * Calls the backend to generate distractors for a batch of cards.
 */
export async function generateDistractorsBatch(cards, quizType = 'intelligent', onProgress, certLevel = 'CP') {
    let successfulCount = 0;
    const totalRequests = cards.length;

    // VARIABLE BATCHING: Turbo-charge Simple mode while protecting Scenarios
    const MAX_BATCH_SIZE = quizType === 'simple' ? SIMPLE_BATCH_SIZE : INTEL_BATCH_SIZE;
    // TASK 3: 12-second stagger for Intelligent mode ensures a Safe Zone of 5 RPM
    const STAGGER_TIME = quizType === 'simple' ? 8000 : 12000;

    for (let i = 0; i < cards.length; i += MAX_BATCH_SIZE) {
        const batch = cards.slice(i, i + MAX_BATCH_SIZE);
        console.info(`[SHRM BATCH SYNC] Starting ${quizType} batch of ${MAX_BATCH_SIZE}`);

        try {
            if (quizType === 'intelligent') {
                // --- STAGE 0: REUSE INVENTORY ---
                const vault = loadVaultFromStorage();
                let preSeededResults = [];
                let toSeedCards = [];

                batch.forEach(c => {
                    const cleanId = String(c.id).replace(/[\s\n\r]/g, '');
                    const existing = vault[`${cleanId}:intelligent:${certLevel}`];
                    // RULE: If scenario, rationale, and answer exist — SKIP Stage 1
                    if (existing && existing.scenario && existing.correct_answer && existing.rationale) {
                        preSeededResults.push({
                            id: cleanId,
                            scenario: existing.scenario,
                            correct_answer: existing.correct_answer,
                            rationale: existing.rationale,
                            gap_analysis: existing.gap_analysis,
                            tag_bask: existing.tag_bask,
                            tag_behavior: existing.tag_behavior
                        });
                    } else {
                        toSeedCards.push({ id: c.id, topic: c.topic, question: c.question, answer: c.answer });
                    }
                });

                // --- STAGE 1: SEED (Only for cards missing scenarios) ---
                let seedData = { results: [] };
                if (toSeedCards.length > 0) {
                    let attempts = 0;
                    while (attempts < 2) {
                        try {
                            const seedResponse = await fetch('/api/study-coach', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    mode: 'generate-distractors',
                                    quizType: quizType,
                                    certLevel: certLevel,
                                    pipelineStage: 'seed',
                                    cards: toSeedCards
                                })
                            });
                            if (seedResponse.ok) {
                                const responseJson = await seedResponse.json();
                                seedData.results = responseJson.results || [];
                                break;
                            }
                            attempts++;
                            if (attempts >= 2) throw new Error('SEED_STAGE_FAILED');
                        } catch (e) {
                            attempts++;
                            if (attempts >= 2) throw e;
                            await new Promise(r => setTimeout(r, 2000));
                        }
                    }
                }

                // Save New Seed Data
                if (seedData.results.length > 0) {
                    seedData.results.forEach(res => {
                        const cleanId = String(res.id).replace(/[\s\n\r]/g, '');
                        saveDistractorToVault(cleanId, {
                            quizType: quizType,
                            scenario: res.scenario,
                            correct_answer: res.correct_answer,
                            tag_bask: res.tag_bask,
                            tag_behavior: res.tag_behavior
                        }, certLevel);
                    });
                }

                // Combine Pre-Seeded with New Seeds for Stage 2
                const allSeedResults = [...preSeededResults, ...seedData.results];

                // --- STAGE 2: EXPAND (Fetch only missing Traps) ---
                if (allSeedResults.length > 0) {
                    const expandResponse = await fetch('/api/study-coach', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mode: 'generate-distractors',
                            quizType: quizType,
                            certLevel: certLevel,
                            pipelineStage: 'expand',
                            cards: allSeedResults.map(res => ({
                                id: res.id,
                                scenario: res.scenario,
                                correct_answer: res.correct_answer,
                                rationale: res.rationale // Pass existing rationale for parity context
                            }))
                        })
                    });

                    if (expandResponse.ok) {
                        const expandData = await expandResponse.json();
                        if (expandData && expandData.results) {
                            expandData.results.forEach(res => {
                                const cleanId = String(res.id).replace(/[\s\n\r]/g, '');
                                const existing = vault[`${cleanId}:intelligent:${certLevel}`];
                                
                                // MANDATE: If we already have the meta-data, keep it. 
                                // Only overwrite THE DISTRACTORS to achieve Visual Parity.
                                saveDistractorToVault(cleanId, {
                                    quizType: quizType,
                                    distractors: res.distractors,
                                    rationale: (existing && existing.rationale) ? existing.rationale : res.rationale,
                                    gap_analysis: (existing && existing.gap_analysis) ? existing.gap_analysis : res.gap_analysis
                                }, certLevel);
                            });
                            successfulCount += allSeedResults.length;
                        }
                    }
                }

            } else {
                // --- SIMPLE MODE (Monolithic Recall) ---
                const response = await fetch('/api/study-coach', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'generate-distractors',
                        quizType: quizType,
                        certLevel: certLevel,
                        cards: batch.map(c => ({ id: c.id, topic: c.topic, question: c.question, answer: c.answer }))
                    })
                });

                if (!response.ok) throw new Error('SIMPLE_SYNC_FAILED');
                const data = await response.json();

                if (data.results) {
                    const vault = loadVaultFromStorage();
                    data.results.forEach(res => {
                        const cleanId = String(res.id).replace(/[\s\n\r]/g, '');
                        const existing = vault[`${cleanId}:simple:${certLevel}`];

                        // SURGICAL: Preserve existing tags for Simple Recall
                        saveDistractorToVault(cleanId, { 
                            ...res, 
                            quizType: 'simple',
                            tag_bask: (existing && existing.tag_bask) ? existing.tag_bask : res.tag_bask,
                            tag_behavior: (existing && existing.tag_behavior) ? existing.tag_behavior : res.tag_behavior
                        }, certLevel);
                    });
                    successfulCount += data.results.length;
                }
            }

            if (onProgress) {
                const percent = Math.round((successfulCount / totalRequests) * 100);
                onProgress(percent, null);
            }

            // STAGGER: Dynamic cooldown to stay safely within 15 RPM
            if (i + MAX_BATCH_SIZE < cards.length) {
                await new Promise(r => setTimeout(r, STAGGER_TIME));
            }

        } catch (error) {
            console.error('Hardened Sync Error:', error);
            // TASK 4: Circuit Breaker cooldown to prevent rapid-fire RPM spikes
            await new Promise(r => setTimeout(r, 5000));

            if (onProgress) onProgress(Math.round((successfulCount / totalRequests) * 100), error.message);
            return { success: false, error: error.message };
        }
    }
    return { success: successfulCount > 0, totalProcessed: successfulCount };
}

/**
 * SURGICAL METADATA REFINER
 * Fetches only BASK tags for cards that possess distractors but lack tags.
 */
export async function refineMetadataBatch(cards, certLevel, onProgress = null) {
    if (!cards || cards.length === 0) return { success: true, count: 0 };

    try {
        const response = await fetch('/api/study-coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'generate-distractors',
                quizType: 'simple',
                certLevel,
                pipelineStage: 'tagging', // Surgical metadata only
                cards: cards.map(c => ({
                    id: c.id,
                    question: c.question,
                    answer: c.answer
                }))
            })
        });

        const data = await response.json();
        
        if (data && data.results && Array.isArray(data.results)) {
            const updatedCount = saveMetadataToVault(data.results, certLevel);
            if (onProgress) onProgress(updatedCount);
            return { success: true, count: updatedCount };
        }

        throw new Error(data?.error || 'Refinement failed');
    } catch (error) {
        console.error("Refinement error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * SURGICAL GAP POLISHER
 * Revises 2-word gap labels into high-density strategic insights.
 */
export async function polishGapsBatch(cards, certLevel, onProgress = null) {
    if (!cards || cards.length === 0) return { success: true, count: 0 };

    try {
        const response = await fetch('/api/study-coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'generate-distractors',
                quizType: 'intelligent',
                certLevel,
                pipelineStage: 'polish-gaps',
                cards: cards.map(c => ({
                    id: String(c.id).replace(/[\s\n\r]/g, ''),
                    question: c.question,
                    answer: c.answer,
                    scenario: c.aiData?.scenario
                }))
            })
        });

        const data = await response.json();
        
        if (data && data.results && Array.isArray(data.results)) {
            data.results.forEach(res => {
                const cleanId = String(res.id).replace(/[\s\n\r]/g, '');
                saveDistractorToVault(cleanId, {
                    quizType: 'intelligent',
                    gap_analysis: res.gap_analysis
                }, certLevel);
            });
            if (onProgress) onProgress(data.results.length);
            return { success: true, count: data.results.length };
        }

        throw new Error(data?.error || 'Polishing failed');
    } catch (error) {
        console.error("Polishing error:", error);
        return { success: false, error: error.message };
    }
}
