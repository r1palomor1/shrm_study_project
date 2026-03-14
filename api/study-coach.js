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

    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ message: "API Key Missing", error: "GEMINI_API_KEY environment variable is not defined." });
        }
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        let promptSystemInstructions = "";
        
        if (quizType === 'intelligent') {
            promptSystemInstructions = `
            You are an expert SHRM Content Designer (SHRM-SCP status).
            TASK: Convert flashcards into SHRM Situational Judgment Items (SJI).
            
            STRUCTURE FOR EACH ITEM:
            1. SCENARIO: A realistic 1-3 sentence workplace scenario involving an HR professional.
            2. QUESTION: Ask what the HR professional should do FIRST or what the BEST action is.
            3. CORRECT ANSWER: Must reflect the provided flashcard answer logic.
            4. DISTRACTORS: Must be plausible but sub-optimal HR actions. Use these 4 Trap Patterns:
               - Premature Escalation (e.g., written warning instead of verbal)
               - Over-empathy (investigating personal issues before policy)
               - Strategic but not Tactical (revising policy instead of acting)
               - Delay/Observation (monitoring for another week)
            5. RATIONALE: Explain why the correct answer is the SHRM-Best choice and why each distractor is a trap.
            6. SHRM PRINCIPLE: Label the specific SHRM logic used (e.g., "Address at lowest level first").
            `;
        } else {
            promptSystemInstructions = `
            You are an expert SHRM Knowledge Designer.
            TASK: Generate complex distractors for SHRM flashcard definitions.
            
            STRUCTURE FOR EACH ITEM:
            1. QUESTION: Use the exact flashcard question text.
            2. CORRECT ANSWER: Use the exact flashcard answer text.
            3. DISTRACTORS: Generate 3 high-quality, professional HR terms or concepts that are plausible but technically incorrect definitions for this specific term. Avoid "easy" or "garbage" distractors.
            4. RATIONALE: Briefly explain the distinction between the correct term and the distractors.
            `;
        }

        const prompt = `
        ${promptSystemInstructions}

        Official 2026 Behavioral Competencies (Tag the most relevant one):
        [Leadership & Navigation, Ethical Practice, Inclusive Mindset, Relationship Management, Communication, Business Acumen, Consultation, Analytical Aptitude]

        Official 2026 BASK Domains: [People, Organization, Workplace, Competencies]

        Input Cards:
        ${cards.map(c => `ID: ${c.id}\nTopic: ${c.topic || 'General'}\nQ: ${c.question}\nA: ${c.answer}`).join('\n---\n')}

        Return a JSON object with a results array:
        {
            "results": [
                {
                    "id": "original_id",
                    "quizType": "${quizType}",
                    "scenario": "Scenario text (null if simple mode)",
                    "question": "The actual question text",
                    "distractors": ["Strictly 3 professional HR distractors here"],
                    "rationale": "High-fidelity feedback showing why correct is best and distractors are sub-optimal",
                    "shrm_principle": "The core SHRM rule (null if simple mode)",
                    "tag_bask": "Selected Domain",
                    "tag_behavior": "Selected Competency"
                }
            ]
        }
        `;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        
        // Clean markdown blocks if Gemini added them (failsafe)
        if (responseText.includes('```')) {
            const matches = responseText.match(/```(?:json)?([\s\S]*?)```/);
            if (matches && matches[1]) {
                responseText = matches[1].trim();
            } else {
                responseText = responseText.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
            }
        }

        try {
            const data = JSON.parse(responseText);
            return res.status(200).json(data);
        } catch (parseError) {
            console.error("JSON Parse Error. Raw response:", responseText);
            return res.status(500).json({ 
                message: "AI returned invalid JSON", 
                error: parseError.message,
                raw: responseText.slice(0, 500) 
            });
        }
    } catch (error) {
        console.error("Distractor Generation Error:", error);
        return res.status(500).json({ 
            message: "AI Generation Failed", 
            error: error.message,
            stack: error.stack 
        });
    }
}

async function handleCoachingInsight(req, res) {
    try {
        const { masteryPercent, masteryIndex, counts } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("API Key Missing");
        }
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        You are a supportive, professional SHRM Study Coach. 
        Analyze the student's current progress and provide a highly personalized, tactical one-sentence coaching insight.
        
        Current Stats:
        - Completion: \${masteryPercent}%
        - Average Confidence: \${masteryIndex} / 5.0
        - Detailed Breakdown:
          * Perfect (5): \${counts['difficulty-5'] || 0}
          * Mastered (4): \${counts['difficulty-4'] || 0}
          * Learning (3): \${counts['difficulty-3'] || 0}
          * Growing (2): \${counts['difficulty-2'] || 0}
          * Struggling (1): \${counts['difficulty-1'] || 0}

        Mandatory Instruction:
        1. If the 'Struggling (1)' count is greater than 0, your advice MUST focus on these specific cards first. 
        2. Be conversational and human.
        3. Do not use generic corporate speak like "keep pushing forward."
        4. Give a tactical tip (e.g., "Revisit the 7 struggling cards before the end of the day").
        5. Keep it to exactly ONE concise sentence.
        6. Do not include any JSON or formatting, just the plain text.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        return res.status(200).json({ insight: text });
    } catch (error) {
        console.error("Coach API Error:", error);
        const struggling = (req.body.counts && req.body.counts['difficulty-1']) || 0;
        const msg = struggling > 0 
            ? `Immediate Focus: Revisit those \${struggling} Struggling concepts before moving on to new material.`
            : "Great consistency! Keep polishing those Growing cards to hit that 4.0 mastery target.";
        return res.status(200).json({ insight: msg }); // Return 200 with fallback insight
    }
}
