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
        Analyze the student's current progress and provide a highly personalized, encouraging one-sentence coaching insight.
        
        Current Stats:
        - Completion: ${masteryPercent}%
        - Average Confidence: ${masteryIndex} / 5.0
        - Detailed Breakdown:
          * Perfect (5): ${counts['difficulty-5'] || 0}
          * Mastered (4): ${counts['difficulty-4'] || 0}
          * Learning (3): ${counts['difficulty-3'] || 0}
          * Growing (2): ${counts['difficulty-2'] || 0}
          * Struggling (1): ${counts['difficulty-1'] || 0}

        Requirements:
        1. Be conversational and human.
        2. Specifically mention one of their strengths (e.g., their Mastered count) or their biggest opportunity (e.g., their Struggling count).
        3. Do not use generic corporate speak.
        4. Keep it to exactly ONE or TWO concise sentences.
        5. Do not include any JSON or formatting, just the plain text.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        return res.status(200).json({ insight: text });
    } catch (error) {
        console.error("Coach API Error:", error);
        return res.status(500).json({ insight: "Keep pushing forward! Every card studied brings you closer to certification." });
    }
}
