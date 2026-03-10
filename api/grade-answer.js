import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { question, actual_answer, user_answer } = req.body;

        if (!question || !actual_answer || !user_answer) {
             return res.status(400).json({ message: "Missing required fields" });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
    You are an expert SHRM certification grader. 
    You are evaluating a student's flashcard response based on its conceptual accuracy and meaning, NOT its exact spelling or wording.
    
    Question: "${question}"
    Actual Correct Answer: "${actual_answer}"
    Student's Answer: "${user_answer}"
    
    Evaluate the Student's Answer against the Actual Correct Answer.
    Score them strictly based on meaning and comprehension. 
    
    Return your response exactly in this JSON format:
    {
        "percentage": 0-100, // An integer estimating how conceptually close they were.
        "grade": "green"|"yellow"|"red", // green (>=85%), yellow(60-84%), red (<60%)
        "feedback": "One short sentence explaining why they missed points, or congratulating them."
    }
    `;

        const result = await model.generateContent(prompt);
        let textResponse = result.response.text();

        // Clean up markdown wrapping if Gemini includes it
        textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
        
        const parsed = JSON.parse(textResponse);

        return res.status(200).json(parsed);
    } catch (error) {
        console.error("Gemini Grader error:", error);
        return res.status(500).json({
            percentage: 0,
            grade: "red",
            feedback: "Error connecting to AI Grader. Please check API key."
        });
    }
}
