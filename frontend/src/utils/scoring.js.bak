/**
 * Calculates the Levenshtein distance between two strings.
 * This measures the minimum number of single-character edits 
 * (insertions, deletions, or substitutions) required to change one word into the other.
 */
function levenshteinDistance(s1, s2) {
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    const matrix = [];

    for (let i = 0; i <= s2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= s1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= s2.length; i++) {
        for (let j = 1; j <= s1.length; j++) {
            if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[s2.length][s1.length];
}

/**
 * Normalizes text for better comparison (removes punctuation, lowercases, trims)
 */
function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]|_/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Calculates a similarity score (0 to 1) between two strings.
 * 1 = Exact match, 0 = Completely different
 */
export function calculateSimilarity(input, target) {
    const normInput = normalizeText(input);
    const normTarget = normalizeText(target);

    if (!normInput || !normTarget) return 0;
    if (normInput === normTarget) return 1;

    const distance = levenshteinDistance(normInput, normTarget);
    const maxLength = Math.max(normInput.length, normTarget.length);

    // Return percentage similarity
    return 1 - distance / maxLength;
}

/**
 * Evaluates an answer and returns a score object with color coding.
 * Green >= 0.85
 * Yellow >= 0.60
 * Red < 0.60
 */
export function evaluateAnswer(input, target) {
    const score = calculateSimilarity(input, target);

    let grade = 'red';
    if (score >= 0.85) {
        grade = 'green';
    } else if (score >= 0.60) {
        grade = 'yellow';
    }

    return {
        score: score,
        percentage: Math.round(score * 100),
        grade: grade
    };
}

/**
 * Maps legacy 1-5 or simple status to a weighted 1-4 Mastery Index.
 * 4 = Professional (Mastered)
 * 3 = Advanced (Learning)
 * 2 = Fundamental (Growing)
 * 1 = Lacking (Struggling)
 */
export function getWeightedMastery(status) {
    switch (status) {
        case 'difficulty-5': return 4;
        case 'difficulty-4': return 3;
        case 'difficulty-3': return 2;
        case 'difficulty-2': return 1;
        case 'difficulty-1': return 0; // Needs significant work
        case 'green': return 4;
        case 'yellow': return 2;
        case 'red': return 0;
        default: return 0;
    }
}

/**
 * Aggregates mastery data across the 2026 BASK framework.
 * Returns an object with domainStats and competencyStats.
 */
export function calculateBASKAnalytics(decks, vault) {
    const domains = {
        'People': { total: 0, score: 0 },
        'Organization': { total: 0, score: 0 },
        'Workplace': { total: 0, score: 0 },
        'Behavioral Competencies': { total: 0, score: 0 }
    };

    const competencies = {
        'Leadership & Navigation': { total: 0, score: 0 },
        'Ethical Practice': { total: 0, score: 0 },
        'Inclusive Mindset': { total: 0, score: 0 },
        'Relationship Management': { total: 0, score: 0 },
        'Communication': { total: 0, score: 0 },
        'Business Acumen': { total: 0, score: 0 },
        'Consultation': { total: 0, score: 0 },
        'Analytical Aptitude': { total: 0, score: 0 }
    };

    decks.forEach(deck => {
        deck.cards.forEach(card => {
            const aiData = vault[card.id];
            if (!aiData) return;

            const mastery = getWeightedMastery(card.status_traditional || card.status_test || card.status_quiz || card.status);
            
            // Map Domain (BASK Domain)
            const domainKey = (aiData.tag_bask || '').split('|')[0].trim();
            if (domains[domainKey]) {
                domains[domainKey].total++;
                domains[domainKey].score += (mastery / 4);
            }

            // Map Competency (Behavioral)
            const compKey = aiData.tag_behavior;
            if (competencies[compKey]) {
                competencies[compKey].total++;
                competencies[compKey].score += (mastery / 4);
                
                // Also aggregate to the top-level "Behavioral Competencies" domain
                domains['Behavioral Competencies'].total++;
                domains['Behavioral Competencies'].score += (mastery / 4);
            }
        });
    });

    return {
        domainStats: Object.keys(domains).map(key => ({
            name: key,
            percent: domains[key].total > 0 ? Math.round((domains[key].score / domains[key].total) * 100) : 0,
            count: domains[key].total
        })),
        competencyStats: Object.keys(competencies).map(key => ({
            name: key,
            percent: competencies[key].total > 0 ? Math.round((competencies[key].score / competencies[key].total) * 100) : 0,
            count: competencies[key].total
        }))
    };
}
