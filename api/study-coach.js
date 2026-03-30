import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { mode } = req.body;

    if (mode === 'generate-distractors') {
        return handleGenerateDistractors(req, res);
    }

    return handleCoachingInsight(req, res);
}

async function handleGenerateDistractors(req, res) {
    const { cards, quizType = 'intelligent', certLevel = 'CP', pipelineStage = 'monolithic' } = req.body;

    if (!cards || !Array.isArray(cards)) {
        return res.status(400).json({ message: 'Invalid card data' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    let promptSystemInstructions = "";

    if (quizType === 'intelligent') {
        if (pipelineStage === 'seed') {
            const verbTaxonomy = certLevel === 'SCP'
                ? "[Design, Evaluate, Analyze, Interpret, Champion]"
                : "[Implement, Coordinate, Apply, Review, Identify]";

            promptSystemInstructions = `
            ROLE: SHRM 2026 SJI Architect
            TASK: Generate a Situation and a "Tethered-Action" Correct Answer.

            MANDATORY CONSTRAINTS:
            1. SCENARIO: 3-4 sentence realistic workplace situation.
            2. FOCUS: ${certLevel === 'SCP' ? 'Strategic Governance.' : 'Operational Policy.'}
            3. CORRECT_ANSWER: A functional, verbed translation of the definition.
            4. TACTICAL SYNC: Start the 'correct_answer' with one of ${verbTaxonomy}.
            5. NO LABELING: [Term] name must NOT appear.
            `;
        } else {
            // Expansion Mode: RANDOMIZED PARITY PROTOCOL
            promptSystemInstructions = `
            ROLE: SHRM 2026 Structural Mirror (Randomized Parity Engine)
            TASK: Generate 3 randomized distractors, rationale, and gap analysis.
            
            STRICT ANTI-BIAS RULES (ENTROPY):
            1. NATURAL VARIANCE: Each of the 3 distractors MUST have a different character count to avoid "clumping".
            2. RANGE: Every distractor must fall within the range of (targetLength - 30) to (targetLength + 30) characters.
            3. FORBIDDEN: Do not make any two distractors the same length. Do not match the correct answer exactly for all three.
            
            STRICT MECHANICAL REQUIREMENTS:
            4. SYNTACTIC PARITY: All three distractors MUST start with a functionally similar verb or part of speech in the same tense as provided in 'startsWithVerb'.
            5. PUNCTUATION MIRROR: Mirror the frequency of semicolons/commas from the Correct Answer.
            6. INCLUSIVE MINDSET: Use "Inclusive Mindset" over "Diversity".
            
            JSON SANITIZATION:
            - Ensure all generated strings are properly escaped for JSON.
            `;
        }
    } else {
        // RECALL MIRROR (Randomized Parity)
        promptSystemInstructions = `
        ROLE: SHRM 2026 Structural Mirror (Randomized Parity Engine)
        TASK: Generate 3 randomized distractors and a BASK Domain tag.

        STRICT ANTI-BIAS RULES (ENTROPY):
        1. NATURAL VARIANCE: Each distractor MUST have a different character count.
        2. RANGE: Every distractor must fall within (targetLength - 30) to (targetLength + 30) characters.
        3. FORBIDDEN: Do not explain. Just match the randomized range exactly.
        
        JSON SANITIZATION:
        - Ensure all generated strings are properly escaped for JSON.
        `;
    }

    const prompt = `
    ${promptSystemInstructions}

    MANDATORY 2026 MAPPING:
    - Domains: [People, Organization, Workplace]
    - Competencies: [Leadership, Interpersonal, Business, Inclusive Mindset]

    STRICT MECHANICAL RULES:
    1. STRICT ID MATCHING: return the 'id' exactly as in the input.
    2. DIRECT JSON ONLY: Return only raw JSON.

    Input Cards:
    ${cards.map(c => `ID: ${c.id}\nTerm: ${c.question}\nCorrect Answer: ${c.answer}\nTarget Length: ${c.targetLength} chars\nPunctuation: ${c.originalPunctuation}\nStarts With: ${c.startsWithVerb}${c.scenario ? `\nExisting Scenario: ${c.scenario}` : ''}`).join('\n---\n')}

    Return JSON format:
    { "results": [{ "id": "string", "scenario": "string", "distractors": ["3 items"], "rationale": "string", "gap_analysis": "string", "tag_bask": "People|Organization|Workplace", "tag_behavior": "string" }] }
    `;

    if (!geminiKey) return res.status(500).json({ message: "AI Provider Failed", error: "GEMINI_API_KEY is missing" });

    try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite-preview",
            generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 4096 }
        });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const parsedData = parseAIResponse(responseText);
        if (parsedData) return res.status(200).json(parsedData);
        throw new Error("Invalid AI Data Format");
    } catch (err) {
        return res.status(500).json({ message: "AI Provider Failed", error: err.message });
    }
}

function parseAIResponse(text) {
    try {
        let cleanText = text.trim();
        const startIdx = cleanText.indexOf('{');
        const endIdx = cleanText.lastIndexOf('}');
        if (startIdx === -1 || endIdx === -1) return null;
        cleanText = cleanText.substring(startIdx, endIdx + 1)
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'");
        try {
            return JSON.parse(cleanText);
        } catch (jsonErr) {
            if (cleanText.includes('"results": [') && !cleanText.endsWith(']}')) {
                return JSON.parse(cleanText + (cleanText.endsWith('}') ? ']}' : '}]}'));
            }
            throw jsonErr;
        }
    } catch (e) {
        return null;
    }
}

async function handleCoachingInsight(req, res) {
    try {
        const { masteryPercent, counts } = req.body;
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) throw new Error("Key Missing");
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
        const prompt = `ROLE: Study Coach. Mastery: ${masteryPercent}%. Counts: ${JSON.stringify(counts)}. Task: Provide 1 coaching bridge using "Inclusive Mindset".`;
        const result = await model.generateContent(prompt);
        return res.status(200).json({ insight: result.response.text() });
    } catch (err) {
        return res.status(500).json({ insight: "Keep pushing. The 2026 BASK requires tactical precision." });
    }
}
