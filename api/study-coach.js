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
        if (pipelineStage === 'seed') {
            const verbTaxonomy = certLevel === 'SCP' ? "[Design, Evaluate, Analyze, Interpret, Champion]" : "[Implement, Coordinate, Apply, Review, Identify]";
            promptSystemInstructions = `ROLE: SHRM 2026 SJI Architect. Situation Scenario + Tethered-Action Correct Answer. Start answer with ${verbTaxonomy}. No [Term] labeling.`;
        } else {
            promptSystemInstructions = `ROLE: SHRM 2026 Structural Mirror (Symmetry Engine). 3 distractors, rationale, gap. STRICT SYMMETRY PROTOCOL: 1. CLONAL STRUCTURE: Analyze Correct Answer DNA. Mirror rhetorical weight/blocks. If semicolon (;), mirror it. 2. LEADING VERB ANCHOR: Start all distractors with same verb tense as startsWithVerb. 3. ELIMINATE MATH.`;
        }
    } else {
        promptSystemInstructions = `ROLE: SHRM 2026 Structural Mirror. Mimic visual density of answer. Naturally vary concepts.`;
    }

    const prompt = `${promptSystemInstructions}\nInput Cards:\n${cards.map(c => `ID: ${c.id}\nTerm: ${c.question}\nCorrect Answer: ${c.answer}\nPunctuation: ${c.originalPunctuation}\nStarts With: ${c.startsWithVerb}${c.scenario ? `\nExisting Scenario: ${c.scenario}` : ''}`).join('\n---\n')}\nReturn JSON: { "results": [{ "id": "string", "scenario": "string", "distractors": ["3 items"], "rationale": "string", "gap_analysis": "string", "tag_bask": "People|Organization|Workplace" }] }`;

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
