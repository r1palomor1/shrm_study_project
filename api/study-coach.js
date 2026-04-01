import { GoogleGenerativeAI } from '@google/generative-ai';

// VERCEL HOBBY STABILITY: Unlocking the 300s Fluid Compute window
export const config = {
    maxDuration: 300,
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { mode } = req.body;
        if (mode === 'generate-distractors') {
            return await handleGenerateDistractors(req, res);
        }
        return await handleCoachingInsight(req, res);
    } catch (err) {
        console.error('SERVER ERROR:', err.message);
        return res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
}

async function handleGenerateDistractors(req, res) {
    const { cards, quizType = 'intelligent', certLevel = 'CP', pipelineStage = 'monolithic' } = req.body;
    if (!cards || !Array.isArray(cards)) return res.status(400).json({ message: 'Invalid card data' });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return res.status(500).json({ message: "AI Provider Failed", error: "GEMINI_API_KEY is missing" });

    let promptSystemInstructions = "";
    if (quizType === 'intelligent') {
        promptSystemInstructions = `ROLE: Senior SHRM 2026 Psychometrician & SJI Architect.
TASK: Generate high-fidelity Situational Judgment Items (SJI) that mirror the cognitive complexity of the 2026 SHRM-CP/SCP exams.

MANDATORY "FOUR ANCHOR" ARCHITECTURE:
1. ORGANIZATIONAL CONTEXT: Define a nuanced environment (e.g., a multi-generational workforce, a firm undergoing a digital transformation, or a global merger).
2. STAKEHOLDER TENSION: Inject competing interests. The scenario must pit two valid business needs against each other (e.g., a Department Head demanding rapid results vs. a Union Rep citing equity).
3. BASK LOGIC CONFLICT: Explicitly test Behavioral Competencies. Force the user to choose between "Ethical Practice" and "Business Acumen."
4. GREY-AREA DISTRACTORS: All four options (Correct + 3 Distractors) must be plausible, professional, and technically "correct" in some context, but only one is the BEST per 2026 BASK logic.

VISUAL PARITY & DNA SYMMETRY (LENGTH BIAS ELIMINATION):
- CLONAL STRUCTURE: Analyze the "Correct Answer" provided in the input. 
- All 3 distractors MUST match the correct answer in: 
  a) Word count (±10%).
  b) Grammatical structure (e.g., if the answer uses a semicolon, all distractors must use a semicolon).
  c) Rhetorical weight (no "always/never" tells; no obviously "bad" options).
- LEADING VERB ANCHOR: Start all options with a verb from the ${certLevel} taxonomy: ${certLevel === 'SCP' ? '[Design, Evaluate, Analyze, Interpret, Champion]' : '[Implement, Coordinate, Apply, Review, Identify]'}.

OUTPUT REQUIREMENTS (JSON):
- scenario: A 3-5 sentence "High-Fidelity Theater" conflict.
- question: Ends with "What is the BEST action for the HR Professional to take?"
- correct_answer: The provided answer, refined for professional tone (no labels).
- distractors: 3 psychometric traps that represent "Common but Sub-optimal" HR reactions.
- rationale: A 2-part expert breakdown: (1) Why the correct answer is the most effective and (2) Why the distractors are sub-optimal in the 2026 context.
- gap_analysis: Identify the specific "Cognitive Gap" this item tests.
- tag_bask: Must be exactly one of: [People, Organization, Workplace].
- tag_behavior: Must be exactly one of the 9 SHRM Behavioral Competencies.`;
    } else {
        promptSystemInstructions = `ROLE: SHRM 2026 Structural Mirror. Mimic visual density of answer. Naturally vary concepts.`;
    }

    const prompt = `${promptSystemInstructions}\nInput Cards:\n${cards.map(c => `ID: ${c.id}\nTerm: ${c.question}\nCorrect Answer: ${c.answer}\nPunctuation: ${c.originalPunctuation}\nStarts With: ${c.startsWithVerb}${c.scenario ? `\nExisting Scenario: ${c.scenario}` : ''}`).join('\n---\n')}\nReturn JSON: { "results": [{ "id": "string", "scenario": "string", "question": "string", "correct_answer": "string", "distractors": ["3 items"], "rationale": "string", "gap_analysis": "string", "tag_bask": "People|Organization|Workplace", "tag_behavior": "string" }] }`;

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite-preview",
        generationConfig: { 
            responseMimeType: "application/json", 
            temperature: 0.1,
            maxOutputTokens: 4096
        }
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsedData = parseAIResponse(responseText);

    if (parsedData) return res.status(200).json(parsedData);
    throw new Error("Invalid Response Format");
}

function parseAIResponse(text) {
    try {
        let cleanText = text.trim();
        const startIdx = cleanText.indexOf('{');
        const endIdx = cleanText.lastIndexOf('}');
        if (startIdx === -1 || endIdx === -1) return null;
        cleanText = cleanText.substring(startIdx, endIdx + 1);
        return JSON.parse(cleanText);
    } catch (e) { return null; }
}

async function handleCoachingInsight(req, res) {
    const { masteryPercent, counts } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return res.status(500).json({ insight: "Keep pushing." });
    try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
        const result = await model.generateContent(`ROLE: Study Coach. Mastery: ${masteryPercent}%. Data: ${JSON.stringify(counts)}. Task: Provide 1 coaching bridge using "Inclusive Mindset".`);
        return res.status(200).json({ insight: result.response.text() });
    } catch (err) { return res.status(500).json({ insight: "Tactical precision is key." }); }
}
