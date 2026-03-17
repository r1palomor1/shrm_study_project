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
 * Now supports dual-mode generation and actual success tracking.
 */
export async function generateDistractorsBatch(cards, quizType = 'intelligent', onProgress) {
    const MAX_BATCH_SIZE = 5; 
    let successfulCount = 0;
    const totalRequests = cards.length;
    
    // We process in batches to respect the Gemini reasoning window (5 items is the sweet spot)
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

            if (response.status === 429) {
                throw new Error('RATE_LIMIT');
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API Error Response:', errorData);
                throw new Error(errorData.message || 'API_ERROR');
            }

            const data = await response.json();
            
            if (data.results) {
                data.results.forEach(res => {
                    saveDistractorToVault(res.id, {
                        quizType: quizType,
                        scenario: res.scenario,
                        question: res.question,
                        correct_answer: res.correct_answer,
                        distractors: res.distractors,
                        rationale: res.rationale,
                        tag_bask: res.tag_bask,
                        tag_behavior: res.tag_behavior
                    });
                });
                successfulCount += data.results.length;
            }

            // Report ACTUAL progress based on successful vault commits
            if (onProgress) {
                const percent = Math.round((successfulCount / totalRequests) * 100);
                onProgress(percent, null);
            }

            // STAGGER LOGIC: Wait 3 seconds before next batch to stay under 15 RPM limit
            if (i + MAX_BATCH_SIZE < cards.length) {
                await new Promise(r => setTimeout(r, 3000));
            }

        } catch (error) {
            console.error('Batch Generation Error:', error);
            if (onProgress) {
                onProgress(Math.round((successfulCount / totalRequests) * 100), error.message);
            }
            // If rate limited, we stop this specific run so the user knows to wait
            if (error.message === 'RATE_LIMIT') break;
        }
    }
}
