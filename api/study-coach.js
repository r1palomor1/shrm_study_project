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
            - Do NOT hallucinate new concepts.

            2026 VERB TAXONOMY (${certLevel}):
            - You MUST start the 'correct_answer' with one of these verbs: ${verbTaxonomy}.

            MANDATORY CONSTRAINTS:
            1. SCENARIO: 3-4 sentence workplace conflict.
            2. FOCUS: ${certLevel === 'SCP' ? 'Strategic Governance.' : 'Operational Policy.'}
            3. NO LABELING: [Term] name must NOT appear.
            4. DOMAIN TAGGING: Assign to [People, Organization, or Workplace].
            `;
        } else if (pipelineStage === 'expand') {
            // --- STAGE 2: THE LOGIC EXPANSION ---
            promptSystemInstructions = `
            ROLE: SHRM 2026 Logic Expander (Expansion Stage)
            TASK: Generate traps and rationale for the Seed.
            UI SYNC MANDATE: Prepare gap_analysis label.
            `;
        } else {
            promptSystemInstructions = `ROLE: SHRM 2026 Architect. Generate full data in one call.`;
        }
    } else {
        // --- SHRM 2026: KNOWLEDGE DESIGNER (Simple Recall) ---
        promptSystemInstructions = `
        ROLE: SHRM 2026 Knowledge Designer (High-Fidelity Distractors).
        TASK: Generate 3 distractors and a BASK Domain tag.
        1. VISUAL PARITY: Match word count and complexity (+/- 3 words).
        2. TERMINOLOGY: Use SHRM 2026 BASK terminology.
        3. DOMAIN TAGGING: Assign to [People, Organization, Workplace].
        `;
    }

    // MANDATORY JSON SCHEMA (Updated for Enrichment Stage)
    let outputFormat = "";
    if (pipelineStage === 'tagging') {
        outputFormat = `{ "results": [{ "id": "MUST match input ID", "tag_bask": "string", "tag_behavior": "string" }] }`;
    } else {
        outputFormat = (pipelineStage === 'seed' || quizType === 'simple')
            ? `{ "results": [{ "id": "MUST match input ID", "scenario": "string", "correct_answer": "string", "tag_bask": "string", "tag_behavior": "string" ${quizType === 'simple' ? ', "distractors": ["3 items"]' : ''} }] }`
            : `{ "results": [{ "id": "MUST match input ID", "distractors": ["3 items"], "rationale": "string", "gap_analysis": "string" }] }`;
    }

    const prompt = `
    ${promptSystemInstructions}

    MANDATORY 2026 MAPPING:
    - Domains: [People, Organization, Workplace]
    - Competencies: [Leadership, Interpersonal, Business, Inclusive Mindset]
    - Always use "Inclusive Mindset" instead of "Diversity".

    STRICT MECHANICAL RULES:
    1. STRICT ID MATCHING: You MUST return the 'id' in the JSON exactly as it appears in the input.
    2. DIRECT JSON ONLY: Return only the RAW JSON object.
    3. CHARACTER SAFETY: Use standard straight quotes.

    Input Cards:
    ${cards.map(c => `ID: ${c.id}\nTerm: ${c.question}\nDefinition: ${c.answer}`).join('\n---\n')}

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
                maxOutputTokens: 4096
            }
        });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const parsedData = parseAIResponse(responseText);
        if (parsedData) return res.status(200).json(parsedData);

        console.error("Malformed AI Response (First 500 chars):", responseText.substring(0, 500));
        throw new Error(`Invalid AI Data Format: ${responseText.substring(0, 100)}...`);
    } catch (geminiError) {
        console.error("Gemini Failure:", geminiError.message);
        return res.status(500).json({
            message: "AI Provider Failed",
            error: geminiError.message,
            tip: "Check for unescaped characters or model safety filters."
        });
    }
}

function parseAIResponse(text) {
    try {
        let cleanText = text.trim();

        // 1. SILENT SANITIZER: Identify the JSON payload
        // Locate first '{' and last '}' to strip markdown backticks or conversational noise
        const startIdx = cleanText.indexOf('{');
        const endIdx = cleanText.lastIndexOf('}');

        if (startIdx === -1 || endIdx === -1) {
            console.error("AI Context Error: No JSON boundaries found.");
            return null;
        }

        // Isolate the core JSON string
        cleanText = cleanText.substring(startIdx, endIdx + 1);

        // 2. CHARACTER NORMALIZATION (Standardize quotes)
        cleanText = cleanText
            .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
            .replace(/[\u2018\u2019]/g, "'"); // Smart single quotes

        // 3. STRUCTURAL SAFETY: Removed global \n replacement.
        // Valid JSON can (and often does) contain newlines for readability.
        // Replacing them globally turned them into literal '\' and 'n' chars, 
        // which breaks parsing at position 1 (immediately after the opening brace).

        try {
            return JSON.parse(cleanText);
        } catch (jsonErr) {
            // 4. TRUNCATION HEALING (Class-level Fix)
            // If the AI response was cut off, try to close the array and object
            // This prevents a total sync failure for 1-2 bad cards in a batch.
            console.warn("Attempting Truncation Healing...");

            // Check if it looks like an array of results that just cut out
            if (cleanText.includes('"results": [') && !cleanText.endsWith(']}')) {
                const healedText = cleanText + (cleanText.endsWith('}') ? ']}' : '}]}');
                try {
                    return JSON.parse(healedText);
                } catch (e) {
                    // Fall through to error
                }
            }
            throw jsonErr;
        }
    } catch (e) {
        console.error("Parsing Failed:", e.message);
        // Log a more useful snippet for the logs to reveal the exact syntax error
        const snippet = text.length > 500 ? text.substring(0, 500) + "..." : text;
        console.error("Malformed Payload Snippet:", snippet);
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
