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

    // 1. System Instructions for SHRM 2026 BASK (Surgical Auditor Standards)
    let promptSystemInstructions = "";
    if (quizType === 'intelligent') {
        promptSystemInstructions = `
        ROLE: "SHRM 2026 Surgical Auditor" (Elite HR Architect)

        MANDATORY RULES (STRICT COMPLIANCE):
        1. MODEL LOCK: Target ONLY SHRM 2026 BASK high-fidelity complexity.
        2. TREATMENT: EVERY card must be a complex Situational Judgment Item (SJI).
        3. SCENARIO: Create a dense, realistic workplace conflict (150-250 chars). Force a choice between "most effective" or "next best" based on behavioral competencies.
        4. OPTIONS: All four distractors must be professionally phrased, similar length, and represent "common but incorrect" HR actions.
        5. RATIONALE: Explain WHY it is MOST effective per SHRM principles.
        6. TAGS: Include exactly one 'BASK Topic' and one 'Behavioral Competency'.

        OUTPUT REQUIREMENTS:
        - scenario: The workplace conflict.
        - question: Ends with "What is the BEST action?"
        - correct_answer: The high-fidelity strategic answer (No labels).
        - distractors: 3 high-plausibility professional traps.
        - rationale: Expert coaching breakdown.
        `;
    } else {
        promptSystemInstructions = `
        ROLE: SHRM 2026 Knowledge Designer.
        TASK: Generate complex distractors for SHRM definitions.
        
        STRICT RULES:
        1. SIMILARITY: All 4 options MUST be similar in length, tone, and professional complexity.
        2. PROXIMITY: Distractors must be 'Neighboring Concepts' from the same SHRM domain.
        3. RATIONALE: Focus on the fine lines between the correct term and distractors.
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
