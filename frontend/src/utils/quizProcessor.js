import { getDistractorFromVault, saveDistractorToVault } from './storage';

/**
 * Orchestrates the retrieval and generation of AI distractors.
 * Checks the local vault first, then groups missing items for batch generation.
 */
export async function getQuizDataForDeck(deck, requestedQuizType = 'intelligent') {
    const cardsWithData = deck.cards.map(card => {
        const vaultData = getDistractorFromVault(card.id, requestedQuizType);
        // We only count it as "having data" if it exists AND matches the requested type
        const isValid = vaultData && vaultData.quizType === requestedQuizType;
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
 * @param {Array} cards - Objects with { question, answer }
 * @param {String} quizType - 'simple' or 'intelligent'
 * @param {Function} onProgress - Callback for progress tracking
 */
export async function generateDistractorsBatch(cards, quizType = 'intelligent', onProgress) {
    const MAX_BATCH_SIZE = 5; // Optimal for Gemini 2.5 reasoning logic
    const results = [];
    
    for (let i = 0; i < cards.length; i += MAX_BATCH_SIZE) {
        const batch = cards.slice(i, i + MAX_BATCH_SIZE);
        
        try {
            const response = await fetch('/api/study-coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'generate-distractors',
                    quizType: quizType,
                    cards: batch.map(c => ({ id: c.id, topic: c.topic, question: c.question, answer: c.answer }))
                })
            });

            if (!response.ok) throw new Error('API Request Failed');

            const data = await response.json();
            
            if (data.results) {
                data.results.forEach(res => {
                    saveDistractorToVault(res.id, {
                        quizType: quizType,
                        scenario: res.scenario,
                        question: res.question, // The refined question (SJI)
                        distractors: res.distractors,
                        rationale: res.rationale,
                        shrm_principle: res.shrm_principle,
                        tag_bask: res.tag_bask,
                        tag_behavior: res.tag_behavior
                    });
                    results.push(res);
                });
            }

            if (onProgress) onProgress(Math.min(100, Math.round(((i + batch.length) / cards.length) * 100)));

        } catch (error) {
            console.error('Batch Generation Error:', error);
            // We could implement a retry here or just skip and let individual questions fail later
        }
    }

    return results;
}
