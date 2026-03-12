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
    const deck = {
        title: 'Imported Deck',
        cards: []
    };

    const lines = markdownText.split('\n');
    let currentCard = null;
    let inFrontMatter = false;
    let hasReadFrontMatter = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line && !currentCard) continue;

        // Parse Frontmatter/Dividers
        if (line === '---') {
            if (!inFrontMatter && !hasReadFrontMatter) {
                inFrontMatter = true;
                continue;
            } else if (inFrontMatter) {
                inFrontMatter = false;
                hasReadFrontMatter = true;
                continue;
            } else {
                // Topic divider
                if (currentCard && currentCard.question && currentCard.answer) {
                    currentCard.id = generateFingerprint(currentCard.question, currentCard.answer);
                    deck.cards.push(currentCard);
                    currentCard = null;
                }
                continue;
            }
        }

        if (inFrontMatter) {
            if (line.toLowerCase().startsWith('deck:')) {
                let parsedTitle = line.substring(5).trim();
                parsedTitle = parsedTitle.replace(/SHRM 2026/i, '');
                parsedTitle = parsedTitle.replace(/^[\s\-\u2013\u2014]+/, '').trim();
                deck.title = parsedTitle || 'Imported Deck';
            }
            continue;
        }

        // Parse Card Topic
        if (line.startsWith('###')) {
            if (currentCard && currentCard.question && currentCard.answer) {
                currentCard.id = generateFingerprint(currentCard.question, currentCard.answer);
                deck.cards.push(currentCard);
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

        // Parse Question/Answer
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

    // Push final card
    if (currentCard && currentCard.question && currentCard.answer) {
        currentCard.id = generateFingerprint(currentCard.question, currentCard.answer);
        deck.cards.push(currentCard);
    }

    return deck;
}
