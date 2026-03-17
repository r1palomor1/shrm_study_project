import { getDistractorFromVault, saveDistractorToVault } from './storage';

/**
 * orchestrateAuditSync: Structural Logic for Unified AI Data Retrieval.
 * Ensures Simple and Intelligent modes are pre-populated with high-fidelity content.
 */
export async function getQuizDataForDeck(deck, requestedQuizType = 'intelligent') {
  // Veteran Implementation: Map cards to their existing AI data or null
  const cardsWithData = deck.cards.map(card => {
    const vaultSimple = getDistractorFromVault(card.id, 'simple');
    const vaultIntelligent = getDistractorFromVault(card.id, 'intelligent');
    
    // Check if the specific requested type exists physically in the vault
    const hasRequestedData = requestedQuizType === 'simple' 
      ? !!vaultSimple?.distractors 
      : !!vaultIntelligent?.scenario;
      
    return {
      ...card,
      aiData: hasRequestedData ? (requestedQuizType === 'simple' ? vaultSimple : vaultIntelligent) : null
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
 * generateDistractorsBatch: Structural Sync Engine.
 * Calls the Surgical Auditor API and maps the 'Unified' response into compartmentalized vault blocks.
 */
export async function generateDistractorsBatch(cards, mode = 'unified', onProgress) {
  const BATCH_SIZE = 5; 
  let count = 0;
  const total = cards.length;

  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE);
    
    try {
      const response = await fetch('/api/study-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate-distractors',
          cards: batch.map(c => ({ 
            id: c.id, 
            topic: c.topic, 
            question: c.question, 
            answer: c.answer 
          }))
        })
      });

      if (response.status === 429) throw new Error('RATE_LIMIT');
      if (!response.ok) throw new Error('API_SYNC_ERROR');

      const data = await response.json();
      
      if (data.results) {
        data.results.forEach(res => {
          // Structural Sync: Populate BOTH modes from the unified auditor response
          
          // 1. Vault: [Simple Mode] Block
          saveDistractorToVault(res.id, {
            quizType: 'simple',
            distractors: res.simple_distractors,
            rationale: res.rationales,
            tag_bask: res.tag_bask,
            tag_behavior: res.tag_behavior
          });

          // 2. Vault: [Intelligent Mode] Block
          saveDistractorToVault(res.id, {
            quizType: 'intelligent',
            scenario: res.intelligent_data.scenario,
            question: res.intelligent_data.question,
            correct_answer: res.intelligent_data.correct_answer,
            distractors: res.intelligent_data.distractors,
            rationale: res.rationales,
            tag_bask: res.tag_bask,
            tag_behavior: res.tag_behavior
          });
        });
        
        count += data.results.length;
      }

      if (onProgress) onProgress(Math.round((count / total) * 100), null);

      // SAFETY: 3s Audit Buffer to protect Gemini RPM (Structural Standard)
      if (i + BATCH_SIZE < cards.length) {
        await new Promise(r => setTimeout(r, 3000));
      }

    } catch (error) {
      console.error('Structural Sync Failure:', error);
      if (onProgress) onProgress(Math.round((count / total) * 100), error.message);
      if (error.message === 'RATE_LIMIT') throw error; // Bubble up to App.jsx for 15s retry
    }
  }
}
