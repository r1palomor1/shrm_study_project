import { generateFingerprint } from './hashing';

/**
 * Parses the agreed-upon Markdown format into a JavaScript object (Deck).
 * Expected format:
 * ---
 * deck: SHRM Study Guide
 * ---
 * ### [Topic Name 1]
 * **Q:** [Question text]
 * **A:** [Answer text]
 * ---
 */
export function parseMarkdownToDeck(markdownText) {
    const decks = [];
    let currentDeck = null;
    let currentCard = null;
    let inFrontMatter = false;
    let hasReadFrontMatter = false;

    const lines = markdownText.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line && !currentCard) continue;

        // 1. New Deck Detection (Multi-Topic Support)
        if (line.toLowerCase().startsWith('deck:')) {
            // Save state of previous card/deck
            if (currentCard && currentCard.question && currentCard.answer) {
                currentCard.id = generateFingerprint(currentCard.question, currentCard.answer);
                currentDeck.cards.push(currentCard);
                currentCard = null;
            }

            let parsedTitle = line.substring(5).trim();
            parsedTitle = parsedTitle.replace(/SHRM 2026/i, '');
            parsedTitle = parsedTitle.replace(/^[\s\-\u2013\u2014]+/, '').trim();
            
            currentDeck = {
                title: parsedTitle || 'Imported Deck',
                cards: []
            };
            decks.push(currentDeck);
            continue;
        }

        // Initialize first deck if none found yet and content starts
        if (!currentDeck && line && line !== '---') {
            currentDeck = { title: 'Imported Deck', cards: [] };
            decks.push(currentDeck);
        }

        // 2. Parse Dividers
        if (line === '---') {
            if (inFrontMatter) {
                inFrontMatter = false;
                hasReadFrontMatter = true;
                continue;
            } else if (!hasReadFrontMatter) {
                inFrontMatter = true;
                continue;
            } else {
                // Card divider
                if (currentCard && currentCard.question && currentCard.answer) {
                    currentCard.id = generateFingerprint(currentCard.question, currentCard.answer);
                    currentDeck.cards.push(currentCard);
                    currentCard = null;
                }
                continue;
            }
        }

        if (inFrontMatter) continue;

        // 3. Parse Topics/Cards
        if (line.startsWith('###')) {
            if (currentCard && currentCard.question && currentCard.answer) {
                currentCard.id = generateFingerprint(currentCard.question, currentCard.answer);
                currentDeck.cards.push(currentCard);
            }

            currentCard = {
                id: null,
                topic: line.replace('###', '').trim(),
                question: '',
                answer: '',
                status: 'unseen'
            };
            continue;
        }

        // 4. Parse Q&A
        if (currentCard) {
            if (line.startsWith('**Q:**')) {
                currentCard.question = line.replace('**Q:**', '').trim();
            } else if (line.startsWith('**A:**')) {
                currentCard.answer = line.replace('**A:**', '').trim();
            } else if (line.length > 0) {
                if (currentCard.answer !== '') {
                    currentCard.answer += ' ' + line;
                } else if (currentCard.question !== '') {
                    currentCard.question += ' ' + line;
                }
            }
        }
    }

    // Final push for last card
    if (currentCard && currentCard.question && currentCard.answer && currentDeck) {
        currentCard.id = generateFingerprint(currentCard.question, currentCard.answer);
        currentDeck.cards.push(currentCard);
    }

    return decks;
}
