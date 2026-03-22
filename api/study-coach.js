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
    const { cards, quizType = 'intelligent', certLevel = 'CP' } = req.body;

    if (!cards || !Array.isArray(cards)) {
        return res.status(400).json({ message: 'Invalid card data' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. System Instructions for SHRM 2026 BASK (Dual-Certification Engine)
    let promptSystemInstructions = "";

    if (quizType === 'intelligent') {
        if (certLevel === 'SCP') {
            // --- SHRM-SCP: STRATEGIC GOVERNANCE ---
            promptSystemInstructions = `
            ROLE: Senior SHRM-SCP Exam Architect (2026 BASK Standards)
            TASK: Transform the [Term] into a Strategic Situational Judgment Item (SJI).
            
            VERB-LOGIC GUARDRAIL (SCP):
            - The CORRECT answer MUST favor: Stakeholder Discovery, Systems Strategy, Evaluating Governance Frameworks, or Conducting Interviews.
            - Focus on identifying strategic risks and aligning with leadership objectives.
            
            MANDATORY CONSTRAINTS:
            1. ROLE FOCUS: Strategic Governance, Stakeholder Alignment, and Global Risk.
            2. DISCOVERY PRIORITY: The correct answer MUST favor discovery/analysis before action.
            3. AI ETHICS MANDATE: Include scenarios involving AI Ethics, Algorithmic Bias, and Technology Governance.
            4. VERB MANDATE: Start choices with: Analyze, Facilitate, Advise, Audit, Evaluate, Formulate.
            5. BOSS-MODE TRAPS: Distractors must be professionally sound but "Symptomatic/Operational" (CP-level) or skip initial discovery.
            `;
        } else {
            // --- SHRM-CP: OPERATIONAL IMPLEMENTATION ---
            promptSystemInstructions = `
            ROLE: SHRM-CP 2026 Implementation Specialist (BASK Standards)
            TASK: Transform the [Term] into an Operational Situational Judgment Item (SJI).
            
            VERB-LOGIC GUARDRAIL (CP):
            - The CORRECT answer MUST favor: Reviewing Records, Applying Policies, Fact-Finding, or Coordinating Implementation.
            - Focus on consistent application of established rules and tactical resolution.
            
            MANDATORY CONSTRAINTS:
            1. ROLE FOCUS: Policy Application, Manager Coordination, and Operational Compliance.
            2. TACTICAL FACT-FINDING: The correct action favors reviewing internal records (attendance, performance, handbooks) to confirm facts before applying policy.
            3. AI ACCOUNTABILITY: Include 'Unverified reliance on AI tools' or 'Data Privacy gaps' as high-plausibility traps.
            4. VERB MANDATE: Start choices with: Implement, Coordinate, Apply, Resolve, Process, Communicate.
            5. COMPLIANCE TRAPS: Distractors should represent inconsistent application or "Premature Escalation to Leadership/Legal" (skipping tactical steps).
            `;
        }

        promptSystemInstructions += `
        GLOBAL 2026 SJI RULES:
        - scenario: 3-4 sentence workplace conflict.
        - question: Ends with "What is the BEST action?" or "What is the FIRST step?"
        - NO LABELING: The name of the [Term] must NOT appear in the Correct Answer or Distractors.
        - SYMMETRY: All 4 options must be similar in length and complexity.
        - RATIONALE MANDATE: Explicitly explain why the 'Boss-Mode' action is superior to 'Premature Escalation' or 'Symptomatic/Operational' fixes.
        
        TETHERING RULE: This label MUST also serve as the 'header' for the 'rationale' field (e.g., 'gap_analysis': 'Premature Escalation', 'rationale': 'Premature Escalation: The candidate failed by...') to ensure the Gap Accordion UI functions correctly.
        `;
    } else {
        // --- SHRM 2026: KNOWLEDGE DESIGNER (Simple Recall) ---
        // TUNED FOR: Gemini 3.1 Flash Lite Preview (Force Symmetry)
        promptSystemInstructions = `
        ROLE: SHRM 2026 Knowledge Designer.
        TASK: Generate 3 high-plausibility distractors for the provided SHRM definition.

        STRICT MECHANICAL CONSTRAINTS:
        1. DEFINITION-ONLY RULE: All 3 distractors MUST be full-sentence definitions. 
        2. NO LABELS/NAMES: Never use the "Name" or "Title" of a concept as a distractor. (Example: If the answer is a definition of 'Local Responsiveness', you must provide the full DEFINITION of a neighboring concept, NOT the words 'Global Integration').
        3. LENGTH PARITY (+/- 5 WORDS): Every distractor MUST match the word count of the Correct Answer within a 5-word margin. If the correct answer is 30 words, every distractor must be 25-35 words.
        4. CONCEPTUAL PROXIMITY: Distractors must be 'Neighboring Concepts' from the same 2026 SHRM Domain cluster.

        MANDATORY 2026 BRANDING:
        - Use "Inclusive Mindset" instead of "Diversity".
        - If the term involves social networks, tag "tag_behavior" as "Inclusive Mindset".
        `;
    }

    const prompt = `
    ${promptSystemInstructions}
    
    Format: JSON Array labeled "results".
    Official 2026 Domains: [People, Organization, Workplace]
    Official 2026 Competencies: [Leadership, Interpersonal, Business, Inclusive Mindset]
    
    MANDATORY 2026 MAPPING:
    - All Behavioral tags MUST use "Inclusive Mindset" instead of "Diversity" or "Global Effectiveness" or "Inclusion".
    - METADATA POLISH: If the scenario or term involves global teams, social networks, diverse demographics, or cultural effectiveness, automatically tag "tag_behavior" as "Inclusive Mindset" to ensure unified analytics.
    
    STRICT CHARACTER RULE: All returned strings must be JSON-safe. Escape all special characters, specifically ampersands (&), dashes (– or —), and quotation marks within rationale texts. Ensure the output is a raw JSON string without markdown code blocks (e.g., no \`\`\`json).
    LEGAL TOPIC PROTOCOL: Provide direct, factual content only. Do not provide legal disclaimers or conversational text. Any non-JSON text will result in a system failure.

    UI SYNC MANDATE: The 'gap_analysis' key is STRICTLY MANDATORY. 
    - For SJIs: Provide a 2-word label of the behavioral failure (e.g., 'Symptomatic Fix').
    - For Simple Recall: Populate with 'Knowledge Match'.

    TETHERING RULE: Use this label as the header of the 'rationale' field (e.g., 'gap_analysis': 'Symptomatic Fix', 'rationale': 'Symptomatic Fix: The candidate failed by...') to ensure UI consistency.

    Cards:
    ${cards.map(c => `ID: ${c.id}\nQ: ${c.question}\nA: ${c.answer}`).join('\n---\n')}
    
    Return JSON:
    {
        "results": [
            {
                "id": "MUST match input ID",
                "scenario": "string",
                "question": "string",
                "correct_answer": "string",
                "distractors": ["3 items"],
                "rationale": "string",
                "gap_analysis": "Identify the primary failing: e.g., 'Premature Escalation' or 'Symptomatic Fix'.",
                "shrm_principle": "string",
                "tag_bask": "People | Organization | Workplace",
                "tag_behavior": "Leadership | Interpersonal | Business | Inclusive Mindset"
            }
        ]
    }
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
