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
    const { cards } = req.body;
    
    if (!cards || !Array.isArray(cards)) {
        return res.status(400).json({ message: 'Invalid card data' });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using flash for speed; distractor generation is a specific tactical task well-suited for Flash
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
        You are an expert SHRM Content Designer specialized in the 2026 BASK (Body of Applied Skills and Knowledge).
        Generate 3 high-quality distractors and a professional rationale for the following SHRM flashcards.
        
        Rules for Distractors:
        1. Difficulty: SHRM Senior Certified Professional (SHRM-SCP) level rigor.
        2. Format: Must match the syntax, length, and tone of the correct answer.
        3. Traps: Use "Tactical Traps" (right concept, wrong application) and "Consultative Gaps" (missing the leadership/strategic nuance).
        4. Indistinguishability: A student should not be able to guess the answer based on grammar or pattern. Avoid negative phrasing (e.g., "None of the above") unless strictly necessary.

        Rules for Rationale:
        1. Be concise (max 3 sentences) but strategic. 
        2. Explain *why* the correct answer is the best choice according to SHRM 2026 standards.
        3. Clarify the specific BASK Domain (People, Organization, or Workplace).

        Official 2026 Behavioral Competencies (Tag the most relevant one from this list):
        [Leadership & Navigation, Ethical Practice, Inclusive Mindset, Relationship Management, Communication, Business Acumen, Consultation, Analytical Aptitude]

        Input Cards:
        ${cards.map(c => `ID: ${c.id}\nQ: ${c.question}\nA: ${c.answer}`).join('\n---\n')}

        Return a JSON object with a results array:
        {
            "results": [
                {
                    "id": "original_id",
                    "distractors": ["Wrong 1", "Wrong 2", "Wrong 3"],
                    "rationale": "Direct rationale explaining the best choice...",
                    "tag_bask": "People | Organization | Workplace",
                    "tag_behavior": "Selected Competency"
                }
            ]
        }
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const data = JSON.parse(responseText);
        
        return res.status(200).json(data);
    } catch (error) {
        console.error("Distractor Generation Error:", error);
        return res.status(500).json({ message: "AI Generation Failed", error: error.message });
    }
}

async function handleCoachingInsight(req, res) {
    try {
        const { masteryPercent, masteryIndex, counts } = req.body;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        You are a supportive, professional SHRM Study Coach. 
        Analyze the student's current progress and provide a highly personalized, tactical one-sentence coaching insight.
        
        Current Stats:
        - Completion: ${masteryPercent}%
        - Average Confidence: ${masteryIndex} / 5.0
        - Detailed Breakdown:
          * Perfect (5): ${counts['difficulty-5'] || 0}
          * Mastered (4): ${counts['difficulty-4'] || 0}
          * Learning (3): ${counts['difficulty-3'] || 0}
          * Growing (2): ${counts['difficulty-2'] || 0}
          * Struggling (1): ${counts['difficulty-1'] || 0}

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
            ? `Immediate Focus: Revisit those ${struggling} Struggling concepts before moving on to new material.`
            : "Great consistency! Keep polishing those Growing cards to hit that 4.0 mastery target.";
        return res.status(500).json({ insight: msg });
    }
}
