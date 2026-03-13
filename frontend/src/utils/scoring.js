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
        'People': { total: 0, score: 0, links: {} },
        'Organization': { total: 0, score: 0, links: {} },
        'Workplace': { total: 0, score: 0, links: {} },
        'Behavioral Competencies': { total: 0, score: 0, links: {} }
    };

    const clusters = {
        'Leadership': { total: 0, score: 0, name: 'Leadership Cluster', items: ['Leadership & Navigation', 'Ethical Practice'] },
        'Interpersonal': { total: 0, score: 0, name: 'Interpersonal Cluster', items: ['Relationship Management', 'Communication', 'Inclusive Mindset'] },
        'Business': { total: 0, score: 0, name: 'Business Cluster', items: ['Business Acumen', 'Consultation', 'Analytical Aptitude'] }
    };

    const uniqueQuestions = new Set();
    let totalCerts = 0; // For future Phase 12

    decks.forEach(deck => {
        deck.cards.forEach(card => {
            const aiData = vault[card.id] || vault[`${card.id}:intelligent`] || vault[`${card.id}:simple`];
            if (!aiData) return;

            uniqueQuestions.add(card.id);
            const status = card.status_traditional || card.status_test || card.status_quiz || card.status;
            const mastery = getWeightedMastery(status);
            
            // Map Domain (BASK Domain)
            const domainKey = (aiData.tag_bask || '').split('|')[0].trim();
            if (domains[domainKey]) {
                domains[domainKey].total++;
                domains[domainKey].score += (mastery / 4);
                
                // Track behavioral links
                const behavior = aiData.tag_behavior;
                if (behavior) {
                    domains[domainKey].links[behavior] = (domains[domainKey].links[behavior] || 0) + 1;
                }
            }

            // Map Cluster
            const compKey = aiData.tag_behavior;
            Object.keys(clusters).forEach(clusterKey => {
                if (clusters[clusterKey].items.includes(compKey)) {
                    clusters[clusterKey].total++;
                    clusters[clusterKey].score += (mastery / 4);
                }
            });
            
            // Always aggregate to top-level Behavioral domain
            if (compKey) {
                domains['Behavioral Competencies'].total++;
                domains['Behavioral Competencies'].score += (mastery / 4);
            }
        });
    });

    const getPrimaryLink = (links) => {
        if (!links || Object.keys(links).length === 0) return null;
        return Object.entries(links).sort((a, b) => b[1] - a[1])[0][0];
    };

    return {
        totalUnique: uniqueQuestions.size,
        domainStats: Object.keys(domains).filter(k => k !== 'Behavioral Competencies').map(key => ({
            name: key,
            percent: domains[key].total > 0 ? Math.round((domains[key].score / domains[key].total) * 100) : 0,
            count: domains[key].total,
            primaryLink: getPrimaryLink(domains[key].links)
        })),
        clusterStats: Object.keys(clusters).map(key => ({
            name: clusters[key].name,
            percent: clusters[key].total > 0 ? Math.round((clusters[key].score / clusters[key].total) * 100) : 0,
            count: clusters[key].total
        })),
        behavioralTotal: domains['Behavioral Competencies']
    };
}
