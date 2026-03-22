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

/**
 * Calls the backend to generate distractors for a batch of cards.
 * Now supports dual-mode generation and actual success tracking with certLevel isolation.
 */
export async function generateDistractorsBatch(cards, quizType = 'intelligent', onProgress, certLevel = 'CP') {
    const MAX_BATCH_SIZE = 4;
    let successfulCount = 0;
    const totalRequests = cards.length;

    for (let i = 0; i < cards.length; i += MAX_BATCH_SIZE) {
        const batch = cards.slice(i, i + MAX_BATCH_SIZE);
        console.info(`[SHRM BATCH SYNC] Starting ${quizType} batch (Topics: ${[...new Set(batch.map(c => c.topic))].join(', ')})`);

        try {
            if (quizType === 'intelligent') {
                // --- STAGE 1: SEED (Scenario & Correct Answer) ---
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

                if (!seedResponse.ok) throw new Error('SEED_STAGE_FAILED');
                const seedData = await seedResponse.json();

                // Save Seed Data (Scenario + Answer + Tags)
                if (seedData.results) {
                    seedData.results.forEach(res => {
                        saveDistractorToVault(res.id, {
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
                            id: res.id,
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
                        saveDistractorToVault(res.id, {
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
                        saveDistractorToVault(res.id, res, certLevel);
                    });
                    successfulCount += data.results.length;
                }
            }

            if (onProgress) {
                const percent = Math.round((successfulCount / totalRequests) * 100);
                onProgress(percent, null);
            }

            // STAGGER: 5-second cooldown to stay safely within 15 RPM
            if (i + MAX_BATCH_SIZE < cards.length) {
                await new Promise(r => setTimeout(r, 5000));
            }

        } catch (error) {
            console.error('Two-Stage Generation Error:', error);
            if (onProgress) onProgress(Math.round((successfulCount / totalRequests) * 100), error.message);
            return { success: false, error: error.message };
        }
    }
    return { success: successfulCount > 0, totalProcessed: successfulCount };
}
