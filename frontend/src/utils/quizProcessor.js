import { getDistractorFromVault, saveDistractorToVault } from './storage';

/**
 * Orchestrates the retrieval and generation of AI distractors.
 * Checks the local vault first, then groups missing items for batch generation.
 */
/**
 * Orchestrates the retrieval and generation of AI distractors.
 * Checks the local vault first, then groups missing items for batch generation.
 */
export async function getQuizDataForDeck(deck, requestedQuizType = 'intelligent', certLevel = 'CP') {
    const cardsWithData = deck.cards.map(card => {
        // DIAGNOSTIC LOG: Cross-reference this with VAULT SAVE log
        console.log("MATRIX LOOKUP - ID:", card.id, "CLEANED:", String(card.id).replace(/[\s\n\r]/g, ''));

        // PHYSICAL CONTENT AUDIT: We only count it if the actual payload is present
        const vaultData = getDistractorFromVault(card.id, requestedQuizType, certLevel);

        let isValid = false;
        if (vaultData && vaultData.quizType === requestedQuizType) {
            if (requestedQuizType === 'intelligent') {
                // Intelligent mode requires a scenario and rationale
                isValid = !!vaultData.scenario && !!vaultData.rationale;
            } else {
                // Simple mode requires at least one distractor
                isValid = Array.isArray(vaultData.distractors) && vaultData.distractors.length > 0;
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
                // --- STAGE 1: SEED (Scenario & Correct Answer) ---
                let seedData = null;
                let attempts = 0;

                // AUTO-RETRY: specifically for SEED_STAGE_FAILED
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
                                cards: batch.map(c => ({ id: c.id, topic: c.topic, question: c.question, answer: c.answer }))
                            })
                        });

                        if (seedResponse.ok) {
                            seedData = await seedResponse.json();
                            break; // Success
                        }
                        attempts++;
                        if (attempts < 2) console.warn("Seed Stage Timeout/Fail. Self-Healing Auto-Retry 2 of 2...");
                        else throw new Error('SEED_STAGE_FAILED');
                    } catch (e) {
                        attempts++;
                        if (attempts >= 2) throw e;
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }

                // Save Seed Data (Scenario + Answer + Tags)
                if (seedData && seedData.results) {
                    seedData.results.forEach(res => {
                        // EXTREME SANITIZATION: Force clean ID before it hits the storage
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

                // --- STAGE 2: EXPAND (Traps & Rationale) ---
                const expandResponse = await fetch('/api/study-coach', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'generate-distractors',
                        quizType: quizType,
                        certLevel: certLevel,
                        pipelineStage: 'expand',
                        cards: seedData.results.map(res => ({
                            id: String(res.id).replace(/[\s\n\r]/g, ''), // EXTREME SANITIZE
                            scenario: res.scenario,
                            correct_answer: res.correct_answer
                        }))
                    })
                });

                if (!expandResponse.ok) throw new Error('EXPAND_STAGE_FAILED');
                const expandData = await expandResponse.json();

                // Save Expansion Data (Distractors + Rationale + Gap Analysis)
                if (expandData.results) {
                    expandData.results.forEach(res => {
                        const cleanId = String(res.id).replace(/[\s\n\r]/g, '');
                        saveDistractorToVault(cleanId, {
                            quizType: quizType,
                            distractors: res.distractors,
                            rationale: res.rationale,
                            gap_analysis: res.gap_analysis
                        }, certLevel);
                    });
                    successfulCount += expandData.results.length;
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
                    data.results.forEach(res => {
                        const cleanId = String(res.id).replace(/[\s\n\r]/g, '');
                        saveDistractorToVault(cleanId, res, certLevel);
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
