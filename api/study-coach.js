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
        return res.status(500).json({ 
            message: 'Internal Server Error', 
            error: err.message, 
            raw: err.rawResponse || null 
        });
    }
}

async function handleGenerateDistractors(req, res) {
    const { cards, quizType = 'intelligent', certLevel = 'CP', pipelineStage = 'monolithic' } = req.body;
    if (!cards || !Array.isArray(cards)) return res.status(400).json({ message: 'Invalid card data' });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return res.status(500).json({ message: "AI Provider Failed", error: "GEMINI_API_KEY is missing" });

    const promptSystemInstructions = `ROLE: Senior SHRM 2026 Psychometrician & SJI Architect.
TASK: Generate high-fidelity Situational Judgment Items (SJI) that mirror the cognitive complexity of the 2026 SHRM-CP/SCP exams.

MANDATORY "FOUR ANCHOR" ARCHITECTURE:
1. ORGANIZATIONAL CONTEXT: Define a nuanced environment (e.g., a multi-generational workforce, a merger, or digital transformation).
2. STAKEHOLDER TENSION: Inject competing interests. The scenario must pit two valid business needs against each other.
3. BASK LOGIC CONFLICT: Explicitly test Behavioral Competencies. Force the user to choose between "Ethical Practice" and "Business Acumen."
4. GREY-AREA DISTRACTORS: All four options must be plausible and professional. Only one is BEST per 2026 BASK logic.

VISUAL PARITY & "CLONAL DNA" MANDATE (LENGTH BIAS ELIMINATION):
- SYNTATIC CLONING: All 3 distractors MUST match the provided "Correct Answer" in word count (±10%), rhetorical weight, and linguistic density.
- PUNCTUATION MIRRORING: If the correct answer uses a semicolon, all distractors must use a semicolon. If it uses a list, all must use a list.
- LINGUISTIC DENSITY: Distractors must occupy the same "Visual Footprint" (line count and density) as the answer.
- LEADING VERB ANCHOR: Start all options with a verb from the ${certLevel} taxonomy: ${certLevel === 'SCP' ? '[Design, Evaluate, Analyze, Interpret, Champion]' : '[Implement, Coordinate, Apply, Review, Identify]'}.

OUTPUT REQUIREMENTS (JSON):
- scenario: A 3-5 sentence "High-Fidelity Theater" conflict.
- question: Ends with "What is the BEST action for the HR Professional to take?"
- correct_answer: The provided answer, refined for professional tone.
- distractors: 3 psychometric distractors that match the visual and genomic footprint of the correct answer perfectly.
- rationale: A 2-part expert breakdown: (1) Why the correct answer is the most effective and (2) Why the distractors are sub-optimal.
- gap_analysis: Identify the specific "Cognitive Gap" this item tests.
- tag_bask: exactly one of: [People, Organization, Workplace].
- tag_behavior: exactly one of the 09 SHRM Behavioral Competencies.`;

    const prompt = `${promptSystemInstructions}\nInput Cards:\n${cards.map(c => `ID: ${c.id}\nTerm: ${c.question}\nCorrect Answer: ${c.answer}\nPunctuation: ${c.originalPunctuation}\nStarts With: ${c.startsWithVerb}`).join('\n---\n')}\nReturn JSON: { "results": [{ "id": "string", "scenario": "string", "question": "string", "correct_answer": "string", "distractors": ["3 items"], "rationale": "string", "gap_analysis": "string", "tag_bask": "People|Organization|Workplace", "tag_behavior": "string" }] }`;

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
    
    // FORENSIC TRACE: Reveal why JSON parsing failed
    console.error("AI_TRACE_FAIL (Raw):", responseText);
    const error = new Error("Invalid Response Format");
    error.rawResponse = responseText;
    throw error;
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
