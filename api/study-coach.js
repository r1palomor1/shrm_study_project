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
        You are an expert SHRM Content Designer (SHRM-SCP).
        TASK: Convert cards into SHRM Situational Judgment Items (SJI).
        
        MANDATORY RULES:
        1. SCENARIO: 2-3 sentence realistic workplace scenario.
        2. QUESTION: End with "What should the HR professional do FIRST?" or "What is the BEST action?"
        3. CORRECT ANSWER: Must reflect the provided flashcard answer.
        4. DISTRACTORS: Use SHRM Trap Patterns: (A) Premature Escalation, (B) Over-empathy/Policy Violation, (C) Strategic but not Tactical, (D) Delay/Observation.
        5. RATIONALE: Explain the "Why" behind the best choice and why distractors are sub-optimal.
        6. 2026 BASK: Prioritize "Inclusive Mindset" and "AI Readiness" where applicable.
        `;
    } else {
        promptSystemInstructions = `
        You are an expert SHRM Knowledge Designer.
        TASK: Generate complex distractors for SHRM definitions.
        
        MANDATORY RULES:
        1. CORRECT ANSWER: Use exact input answer.
        2. DISTRACTORS: 3 professional HR terms that are plausible but incorrect definitions.
        3. RATIONALE: Distinguish the correct term from the distractors.
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
