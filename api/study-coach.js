import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { masteryPercent, masteryIndex, counts } = req.body;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using flash for speed and cost efficiency
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
        const struggling = req.body.counts['difficulty-1'] || 0;
        const msg = struggling > 0 
            ? `Immediate Focus: Revisit those ${struggling} Struggling concepts before moving on to new material.`
            : "Great consistency! Keep polishing those Growing cards to hit that 4.0 mastery target.";
        return res.status(500).json({ insight: msg });
    }
}
