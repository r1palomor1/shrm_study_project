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
 * Returns an object with isolated stats for 'simple' and 'intelligent' modes.
 */
export function calculateBASKAnalytics(decks, vault, certLevel = 'CP') {
    const uniqueQuestions = new Set();
    
    const createStatTemplate = () => ({
        domains: {
            'People': { total: 0, score: 0, links: {}, attempted: 0, attempts: [] },
            'Organization': { total: 0, score: 0, links: {}, attempted: 0, attempts: [] },
            'Workplace': { total: 0, score: 0, links: {}, attempted: 0, attempts: [] },
            'Behavioral Competencies': { total: 0, score: 0, links: {}, attempted: 0, attempts: [] }
        },
        clusters: {
            'Leadership': { total: 0, score: 0, name: 'Leadership Cluster', items: ['Leadership & Navigation', 'Ethical Practice'], attempted: 0, attempts: [] },
            'Interpersonal': { total: 0, score: 0, name: 'Interpersonal Cluster', items: ['Relationship Management', 'Communication', 'Inclusive Mindset'], attempted: 0, attempts: [] },
            'Business': { total: 0, score: 0, name: 'Business Cluster', items: ['Business Acumen', 'Consultation', 'Analytical Aptitude'], attempted: 0, attempts: [] }
        }
    });

    const modes = {
        intelligent: { ...createStatTemplate(), uniqueIds: new Set(), attemptedIds: new Set(), totalPoints: 0 },
        simple: { ...createStatTemplate(), uniqueIds: new Set(), attemptedIds: new Set(), totalPoints: 0 }
    };

    decks.forEach(deck => {
        deck.cards.forEach(card => {
            uniqueQuestions.add(card.id);
            
            ['intelligent', 'simple'].forEach(mode => {
                const aiData = vault[`${card.id}:${mode}:${certLevel}`];
                if (!aiData) return;

                // Track total unique cards available for this mode
                modes[mode].uniqueIds.add(card.id);

                const statusKey = `status_quiz_${mode}_${certLevel}`;
                const status = card[statusKey];
                
                // If not attempted, we still count it for "total" availability, 
                // but not for "attempted" score tracking
                const domainKey = (aiData.tag_bask || '').split('|')[0].trim();
                const compKey = aiData.tag_behavior;

                if (modes[mode].domains[domainKey]) {
                    modes[mode].domains[domainKey].total++;
                    if (status && status !== 'unseen') {
                        const mastery = getWeightedMastery(status);
                        
                        // Global unique tracking for the mode
                        if (!modes[mode].attemptedIds.has(card.id)) {
                            modes[mode].attemptedIds.add(card.id);
                            modes[mode].totalPoints += (mastery / 4);
                        }

                        modes[mode].domains[domainKey].score += (mastery / 4);
                        modes[mode].domains[domainKey].attempted++;
                        if (modes[mode].domains[domainKey].attempts) {
                            modes[mode].domains[domainKey].attempts.push({
                                id: card.id,
                                title: card.question || card.front,
                                mastery: mastery, // 4.0 Scale
                                status: status
                            });
                        }
                        
                        if (compKey) {
                            modes[mode].domains[domainKey].links[compKey] = (modes[mode].domains[domainKey].links[compKey] || 0) + 1;
                        }
                    }
                }

                Object.keys(modes[mode].clusters).forEach(clusterKey => {
                    if (modes[mode].clusters[clusterKey].items.includes(compKey)) {
                        modes[mode].clusters[clusterKey].total++;
                        if (status && status !== 'unseen') {
                            const mastery = getWeightedMastery(status);
                            modes[mode].clusters[clusterKey].score += (mastery / 4);
                            modes[mode].clusters[clusterKey].attempted++;
                            modes[mode].clusters[clusterKey].attempts.push({
                                id: card.id,
                                title: card.question || card.front,
                                mastery: mastery, // 4.0 Scale
                                status: status,
                                domainLink: domainKey
                            });
                        }
                    }
                });

                if (compKey) {
                    modes[mode].domains['Behavioral Competencies'].total++;
                    if (status && status !== 'unseen') {
                        const mastery = getWeightedMastery(status);
                        modes[mode].domains['Behavioral Competencies'].score += (mastery / 4);
                        modes[mode].domains['Behavioral Competencies'].attempted++;
                    }
                }
            });
        });
    });

    const getPrimaryLink = (links) => {
        if (!links || Object.keys(links).length === 0) return null;
        return Object.entries(links).sort((a, b) => b[1] - a[1])[0][0];
    };

    const processStats = (modeData) => {
        const domainStats = Object.keys(modeData.domains).filter(k => k !== 'Behavioral Competencies').map(key => ({
            name: key,
            percent: modeData.domains[key].total > 0 ? Math.round((modeData.domains[key].attempted / modeData.domains[key].total) * 100) : 0,
            gpa: modeData.domains[key].attempted > 0 ? (modeData.domains[key].score / modeData.domains[key].attempted) * 4.0 : 0,
            count: modeData.domains[key].total,
            attempted: modeData.domains[key].attempted,
            attempts: modeData.domains[key].attempts || [],
            primaryLink: getPrimaryLink(modeData.domains[key].links)
        }));

        const clusterStats = Object.keys(modeData.clusters).map(key => ({
            name: modeData.clusters[key].name,
            percent: modeData.clusters[key].total > 0 ? Math.round((modeData.clusters[key].attempted / modeData.clusters[key].total) * 100) : 0,
            gpa: modeData.clusters[key].attempted > 0 ? (modeData.clusters[key].score / modeData.clusters[key].attempted) * 4.0 : 0,
            count: modeData.clusters[key].total,
            attempted: modeData.clusters[key].attempted,
            attempts: modeData.clusters[key].attempts
        }));

        // Calculate Global Metrics based on unique mode-level tracking
        const totalCards = modeData.uniqueIds.size;
        const totalCompleted = modeData.attemptedIds.size;
        const globalGPA = totalCompleted > 0 ? ((modeData.totalPoints / totalCompleted) * 4.0).toFixed(1) : "0.0";
        const workDone = totalCards > 0 ? Math.round((totalCompleted / totalCards) * 100) : 0;

        return {
            domainStats,
            clusterStats,
            globalGPA,
            workDone,
            totalAttempted: totalCompleted,
            totalUnique: totalCards
        };
    };

    return {
        totalUnique: uniqueQuestions.size,
        intelligent: processStats(modes.intelligent),
        simple: processStats(modes.simple)
    };
}
