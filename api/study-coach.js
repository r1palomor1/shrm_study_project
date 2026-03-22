import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { mode } = req.body;

    // Route based on requested mode
    if (mode === 'generate-distractors') {
        return handleGenerateDistractors(req, res);
    }

    // Default to coaching insight
    return handleCoachingInsight(req, res);
}

async function handleGenerateDistractors(req, res) {
    const { cards, quizType = 'intelligent', certLevel = 'CP', pipelineStage = 'monolithic' } = req.body;

    if (!cards || !Array.isArray(cards)) {
        return res.status(400).json({ message: 'Invalid card data' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. System Instructions for SHRM 2026 BASK (Two-Stage Pipeline)
    let promptSystemInstructions = "";

    if (quizType === 'intelligent') {
        if (pipelineStage === 'seed') {
            // --- STAGE 1: THE SCENARIO & ANSWER SEED (The "Heavy" Logic) ---
            const verbTaxonomy = certLevel === 'SCP'
                ? "[Design, Evaluate, Analyze, Interpret, Champion]"
                : "[Implement, Coordinate, Apply, Review, Identify]";

            promptSystemInstructions = `
            ROLE: SHRM 2026 SJI Architect (Seed Stage)
            TASK: Generate a Situation and a "Tethered-Action" Correct Answer for the provided SHRM definition.

            TETHERED-ACTION RULE:
            - The 'correct_answer' MUST be a functional, verbed translation of the flashcard definition.
            - Do NOT hallucinate new concepts. If the definition is 'Variance Analysis', the answer MUST involve 'Reviewing actual vs planned budget'.

            2026 VERB TAXONOMY (${certLevel}):
            - You MUST start the 'correct_answer' with one of these verbs: ${verbTaxonomy}.

            MANDATORY CONSTRAINTS:
            1. SCENARIO: 3-4 sentence workplace conflict identifying a specific challenge related to the [Term].
            2. FOCUS: ${certLevel === 'SCP' ? 'Strategic Governance and Stakeholder Analysis.' : 'Operational Policy and Tactical Fact-Finding.'}
            3. NO LABELING: The name of the [Term] must NOT appear in the scenario or answer.
            `;
        } else if (pipelineStage === 'expand') {
            // --- STAGE 2: THE LOGIC EXPANSION (The "Detail" Work) ---
            promptSystemInstructions = `
            ROLE: SHRM 2026 Logic Expander (Expansion Stage)
            TASK: Generate high-plausibility traps and a professional rationale for the provided Scenario and Correct Answer.

            MANDATORY CONSTRAINTS:
            1. TRAP LOGIC: Distractors must be professionally sound but "Symptomatic/Operational" (for CP) or "Premature Escalation" (skipping discovery).
            2. SYMMETRY: All options must match the 'correct_answer' in length (within +/- 5 words) and professional tone.
            3. RATIONALE: Explain why the 'correct_answer' is superior using SHRM 2026 logic.

            UI SYNC MANDATE:
            - Provide a 2-word label for 'gap_analysis' (e.g., 'Premature Escalation', 'Symptomatic Fix').
            - TETHERING RULE: This label MUST be the header of the 'rationale' field.
            `;
        } else {
            // Legacy/Monolithic (Kept for safety)
            promptSystemInstructions = `ROLE: SHRM 2026 Architect. Generate Scenario, Answer, Traps, and Rationale in one call.`;
        }
    } else {
        // --- SHRM 2026: KNOWLEDGE DESIGNER (Simple Recall) ---
        promptSystemInstructions = `
        ROLE: SHRM 2026 Knowledge Designer.
        TASK: Generate 3 high-plausibility definition-only distractors for the provided SHRM definition.
        LENGTH PARITY: Distractors must match the Correct Answer's word count within +/- 5 words.
        `;
    }

    const outputFormat = pipelineStage === 'seed'
        ? `{ "results": [{ "id": "string", "scenario": "string", "correct_answer": "string", "tag_bask": "string", "tag_behavior": "string" }] }`
        : `{ "results": [{ "id": "string", "distractors": ["3 items"], "rationale": "string", "gap_analysis": "string" }] }`;

    const prompt = `
    ${promptSystemInstructions}

    MANDATORY 2026 MAPPING:
    - Domains: [People, Organization, Workplace]
    - Competencies: [Leadership, Interpersonal, Business, Inclusive Mindset]
    - Always use "Inclusive Mindset" instead of "Diversity".

    STRICT CHARACTER RULE: Escape &, –, and quotes. Output RAW JSON only.

    Input Cards:
    ${cards.map(c => `ID: ${c.id}\nTerm: ${c.question}\nDefinition: ${c.answer}\n${c.scenario ? `Scenario: ${c.scenario}\nFixed Answer: ${c.correct_answer}` : ''}`).join('\n---\n')}

    Return JSON format:
    ${outputFormat}
    `;

    // 2. Try Gemini (Primary)
    if (!geminiKey) {
        return res.status(500).json({ message: "AI Provider Failed", error: "GEMINI_API_KEY is missing from environment" });
    }

    try {
        console.info(`[GEMINI REQUEST] Mode: ${quizType} | Level: ${certLevel} | Cards: ${cards.length}`);

        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite-preview",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
                maxOutputTokens: 8192
            }
        });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const parsedData = parseAIResponse(responseText);
        if (parsedData) return res.status(200).json(parsedData);

        throw new Error("Invalid AI Data Format");
    } catch (geminiError) {
        console.error("Gemini Failure:", geminiError.message);
        return res.status(500).json({
            message: "AI Provider Failed",
            error: geminiError.message,
            tip: "Verify model name or API quota in Google AI Studio"
        });
    }
}

function parseAIResponse(text) {
    try {
        let cleanText = text.trim();

        // --- SILENT SANITIZER PROTOCOL ---
        // 1. Remove markdown backticks if present
        if (cleanText.includes('```')) {
            const matches = cleanText.match(/```(?:json)?([\s\S]*?)```/);
            if (matches && matches[1]) {
                cleanText = matches[1].trim();
            } else {
                cleanText = cleanText.replace(/```json/g, "").replace(/```/g, "").trim();
            }
        }

        // 2. Locate first '{' and last '}' to strip "noise" or conversational text
        const startIdx = cleanText.indexOf('{');
        const endIdx = cleanText.lastIndexOf('}');

        if (startIdx !== -1 && endIdx !== -1) {
            cleanText = cleanText.substring(startIdx, endIdx + 1);
        }

        return JSON.parse(cleanText);
    } catch (e) {
        console.error("Parsing Failed:", e.message);
        return null;
    }
}

async function handleCoachingInsight(req, res) {
    try {
        const { masteryPercent, masteryIndex, counts } = req.body;
        const geminiKey = process.env.GEMINI_API_KEY;

        if (!geminiKey) throw new Error("Key Missing");

        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

        const prompt = `
        ROLE: Senior SHRM 2026 Study Coach
        CONTEXT: User has ${masteryPercent}% overall mastery (Index: ${masteryIndex}/100) across People, Organization, and Workplace domains.
        COUNTS: ${JSON.stringify(counts)}

        TASK: Provide a single "Boss-Mode" coaching bridge.
        1. TERMINOLOGY: Use "Inclusive Mindset" instead of "Diversity" or "Global HR".
        2. VERB-LOGIC: Remind the user that CP items require TACTICAL implementation while SCP requires STRATEGIC discovery.
        3. TONE: Professional, encouraging, and razor-sharp on 2026 mandates.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.status(200).json({ insight: responseText });
    } catch (err) {
        console.error("Coaching Error:", err.message);
        return res.status(500).json({ insight: "Keep pushing. The 2026 BASK requires both tactical precision and strategic foresight." });
    }
}
