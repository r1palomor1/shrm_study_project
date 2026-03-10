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
