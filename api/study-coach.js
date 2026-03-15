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
    const { cards, quizType = 'intelligent' } = req.body;
    
    if (!cards || !Array.isArray(cards)) {
        return res.status(400).json({ message: 'Invalid card data' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    // 1. System Instructions for SHRM 2026 BASK
    let promptSystemInstructions = "";
    if (quizType === 'intelligent') {
        promptSystemInstructions = `
        ROLE: Senior SHRM-SCP Exam Architect (2026 BASK Standards)

        TASK: Transform the provided [Term] and [Definition] into a Situational Judgment Item (SJI) that tests strategic application rather than rote memorization.

        MANDATORY CONSTRAINTS:
        1. NO LABELING: The name of the [Term] must NOT appear in the Correct Answer or the Distractors.
        2. VERB MANDATE: Every answer choice MUST begin with a professional action verb (e.g., Analyze, Facilitate, Advise, Audit, Evaluate, Formulate, Collaborate).
        3. DISCOVERY PRIORITY: Prioritize gathering perspectives. The correct answer should favor 'Conducting initial stakeholder interviews,' 'Gathering diverse perspectives,' or 'Analyzing existing workforce data' before implementing a solution.
        4. STAKEHOLDER INTEGRATION: Incorporate roles like 'Cross-functional leads,' 'Budget owners,' or 'Departmental stakeholders' into the scenario and options.
        5. BOSS-MODE TRAPS: Every distractor MUST be a legally or professionally sound action that is simply 'less optimal' than the correct answer. The 'Premature Escalation' trap must sound professional but bypass initial discovery.
        
        OUTPUT STRUCTURE:
        - scenario: Realistic 3-4 sentence workplace conflict (merger, crisis, risk).
        - question: End with "What is the BEST action for the HR professional?" or "What should be the FIRST step?"
        - correct_answer: A strategic, single-sentence action that describes applying the [Term]. Start with a verb, NO label/name of the term.
        - distractors: 3 high-plausibility traps matching the patterns above.
        - rationale: Explain the "Why" in terms of Business Impact. Frame the HR professional as a Strategic Consultant. Explain how the correct action prevents organizational costs (e.g., turnover, litigation, lost productivity) compared to the distractors. No labels like "Correct:".
        `;
    } else {
        promptSystemInstructions = `
        You are an expert SHRM Knowledge Designer.
        TASK: Generate complex distractors for SHRM definitions.
        
        MANDATORY RULES:
        1. CORRECT ANSWER: Use exact input answer.
        2. DISTRACTORS: Generate 3 high-quality distractors.
        3. CONCEPTUAL PROXIMITY: Distractors MUST be 'Neighboring Concepts' from the same SHRM domain. If the term is about compensation, distractors must be about benefits or indirect rewards, not unrelated topics like hiring.
        4. SYMMETRY RULE: All 4 options MUST be similar in length, professional tone, and complexity.
        5. RATIONALE: Focus on the fine lines between the correct term and the neighboring distractors. No "Correct:" labels.
        `;
    }

    const prompt = `
    ${promptSystemInstructions}
    
    Format: JSON Array labeled "results".
    Official 2026 Domains: [People, Organization, Workplace, Competencies]
    
    Cards:
    ${cards.map(c => `ID: ${c.id}\nQ: ${c.question}\nA: ${c.answer}`).join('\n---\n')}
    
    Return JSON:
    {
        "results": [
            {
                "id": "original_id",
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

    // 2. Try Gemini 3.1 Flash-Lite (Primary)
    try {
        if (geminiKey) {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            
            const parsedData = parseAIResponse(responseText);
            if (parsedData) return res.status(200).json(parsedData);
        }
    } catch (geminiError) {
        console.warn("Gemini Primary Failed, falling back to Groq:", geminiError.message);
    }

    // 3. Try Groq Qwen 3 (Fallback)
    try {
        if (groqKey) {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${groqKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'qwen/qwen3-32b',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                })
            });

            if (response.ok) {
                const groqData = await response.json();
                const responseText = groqData.choices[0].message.content;
                const parsedData = parseAIResponse(responseText);
                if (parsedData) return res.status(200).json(parsedData);
            }
        }
    } catch (groqError) {
        console.error("Groq Fallback also failed:", groqError.message);
    }

    return res.status(500).json({ message: "Both AI Providers Failed", error: "Quota or Network issue" });
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
