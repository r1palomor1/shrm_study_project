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
            
            MANDATORY CONSTRAINTS:
            1. ROLE FOCUS: Strategic Governance, Stakeholder Alignment, and Global Risk.
            2. DISCOVERY PRIORITY: The correct answer MUST favor 'Stakeholder Interviews,' 'Analyzing Governance frameworks,' or 'Evaluating Organizational Impact' before action.
            3. AI ETHICS MANDATE: Include scenarios involving AI Ethics, Algorithmic Bias, and Technology Governance.
            4. VERB MANDATE: Start choices with: Analyze, Facilitate, Advise, Audit, Evaluate, Formulate.
            5. BOSS-MODE TRAPS: Distractors must be professionally sound but "Prematurely Strategic" or skip initial discovery.
            `;
        } else {
            // --- SHRM-CP: OPERATIONAL IMPLEMENTATION ---
            promptSystemInstructions = `
            ROLE: SHRM-CP 2026 Implementation Specialist (BASK Standards)
            TASK: Transform the [Term] into an Operational Situational Judgment Item (SJI).
            
            MANDATORY CONSTRAINTS:
            1. ROLE FOCUS: Policy Application, Manager Coordination, and Operational Compliance.
            2. TACTICAL FACT-FINDING: The correct action favors reviewing internal records (attendance, performance, handbooks) to confirm facts before applying policy.
            3. AI ACCOUNTABILITY: Include 'Unverified reliance on AI tools' or 'Data Privacy gaps' as high-plausibility traps.
            4. VERB MANDATE: Start choices with: Implement, Coordinate, Apply, Resolve, Process, Communicate.
            5. COMPLIANCE TRAPS: Distractors should represent inconsistent application or "Premature Escalation to Legal."
            `;
        }

        promptSystemInstructions += `
        GLOBAL 2026 SJI RULES:
        - scenario: 3-4 sentence workplace conflict.
        - question: Ends with "What is the BEST action?" or "What is the FIRST step?"
        - NO LABELING: The name of the [Term] must NOT appear in the Correct Answer or Distractors.
        - SYMMETRY: All 4 options must be similar in length and complexity.
        `;
    } else {
        // --- SIMPLE RECALL MODE (Both Levels) ---
        promptSystemInstructions = `
        ROLE: SHRM 2026 Knowledge Designer (${certLevel} Focus).
        TASK: Generate concept-match distractors for SHRM definitions.
        
        MANDATORY RULES:
        1. CORRECT ANSWER: Use exact input definition.
        2. SYMMETRY RULE: All 4 options MUST be similar in length, professional tone, and complexity.
        3. CONCEPTUAL PROXIMITY: Distractors must be 'Neighboring Concepts' from the same domain.
        4. RATIONALE: Focus on the fine lines between the correct term and distractors.
        `;
    }

    const prompt = `
    ${promptSystemInstructions}
    
    Format: JSON Array labeled "results".
    Official 2026 Domains: [People, Organization, Workplace]
    Official 2026 Competencies: [Leadership, Interpersonal, Business, Inclusive Mindset]
    
    MANDATORY 2026 MAPPING: All Behavioral tags MUST use "Inclusive Mindset" instead of "Diversity" or "Global Effectiveness".
    
    Cards:
    ${cards.map(c => `ID: ${c.id}\nQ: ${c.question}\nA: ${c.answer}`).join('\n---\n')}
    
    Return JSON:
    {
        "results": [
            {
                "id": "MUST match input ID (e.g., card_1)",
                "scenario": "string",
                "question": "string",
                "correct_answer": "string",
                "distractors": ["3 items"],
                "rationale": "string",
                "shrm_principle": "string",
                "tag_bask": "Domain",
                "tag_behavior": "Competency"
            }
        ]
    }
    `;

    // 2. Try Gemini (Primary)
    if (!geminiKey) {
        return res.status(500).json({ message: "AI Provider Failed", error: "GEMINI_API_KEY is missing from environment" });
    }

    try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
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
        let cleanText = text;
        if (cleanText.includes('```')) {
            const matches = cleanText.match(/```(?:json)?([\s\S]*?)```/);
            if (matches && matches[1]) cleanText = matches[1].trim();
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

        const prompt = `Provide a 1-sentence tactical SHRM coach tip. Stats: ${masteryPercent}% done, Index: ${masteryIndex}. Struggling count: ${counts['difficulty-1'] || 0}. Plain text only.`;
        
        const result = await model.generateContent(prompt);
        return res.status(200).json({ insight: result.response.text().trim() });
    } catch (e) {
        return res.status(200).json({ insight: "Great consistency! Keep polishing those 'Growing' cards to reach your mastery goal." });
    }
}
