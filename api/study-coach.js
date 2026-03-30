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
            // Expansion Mode: STRUCTURAL SYMMETRY ENGINE
            promptSystemInstructions = `
            ROLE: SHRM 2026 Structural Mirror (Symmetry Engine)
            TASK: Generate 3 distractors, rationale, and gap analysis.

            STRICT SYMMETRY PROTOCOL (THE CLONAL RULE):
            1. CLONAL STRUCTURE: Analyze the 'Correct Answer' for its rhetorical DNA. 
               - If it is [Action] + [Entity] + [Outcome], all distractors MUST follow that sequence.
               - If it uses a semicolon (;) or a parenthetical, every distractor MUST use one.
            2. LEADING VERB ANCHOR: Every distractor MUST start with the EXACT SAME VERB TENSE and part of speech as provided in 'startsWithVerb'.
            3. DENSITY MATCHING: Match the "weight" of the concepts. If the answer is strategic, the distractors must be strategic. 
            4. ELIMINATE MATH: Do not count characters. Focus on visual blocks. If the answer is a "two-line block," the distractors must be "two-line blocks."

            JSON SANITIZATION:
            - Ensure all generated strings are properly escaped for JSON.
            `;
        }
    } else {
        // RECALL SYMMETRY
        promptSystemInstructions = `
        ROLE: SHRM 2026 Structural Mirror (Symmetry Engine)
        TASK: Generate 3 distractors and a BASK Domain tag.

        STRICT SYMMETRY PROTOCOL:
        1. CLONAL STRUCTURE: Mimic the visual density and rhythm of the Correct Answer.
        2. FORBIDDEN: Do not match the correct answer exactly. Naturally vary the concepts within the structural shell.
        
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
    ${cards.map(c => `ID: ${c.id}\nTerm: ${c.question}\nCorrect Answer: ${c.answer}\nPunctuation: ${c.originalPunctuation}\nStarts With: ${c.startsWithVerb}${c.scenario ? `\nExisting Scenario: ${c.scenario}` : ''}`).join('\n---\n')}

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
