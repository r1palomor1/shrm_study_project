/**
 * Generates a stable unique fingerprint for a flashcard based on its content.
 * This ensures that the same question/answer pair always produces the same ID.
 */
export function generateFingerprint(question, answer) {
    const stream = `${question.trim().toLowerCase()}|${answer.trim().toLowerCase()}`;
    
    // Quick 53-bit hash (cyrb53) for browser performance and low collisions
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0, ch; i < stream.length; i++) {
        ch = stream.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
