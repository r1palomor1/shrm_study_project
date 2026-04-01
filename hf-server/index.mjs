import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 7860; // MANDATORY HF PORT

app.use(cors());
app.use(express.json());

// HEALTH CHECK ENDPOINT
app.get('/', (req, res) => {
    res.json({ status: 'active', engine: 'SHRM 2026 BASK Sync', node: process.version });
});

app.post('/generate-distractors', async (req, res) => {
    const { cards, quizType = 'intelligent', certLevel = 'CP' } = req.body;
    
    if (!cards || !Array.isArray(cards)) {
        return res.status(400).json({ message: 'Invalid card data' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
        return res.status(500).json({ message: "AI Provider Failed", error: "GEMINI_API_KEY is missing from HF Secrets" });
    }

    // ELITE MONOLITHIC PROMPT: Restored from Vercel era logic
    const promptSystemInstructions = `ROLE: Senior SHRM 2026 Psychometrician & SJI Architect.
TASK: Generate high-fidelity Situational Judgment Items (SJI) that mirror the cognitive complexity of the 2026 SHRM-CP/SCP exams.

MANDATORY "FOUR ANCHOR" ARCHITECTURE:
1. ORGANIZATIONAL CONTEXT: Define a nuanced environment (e.g., a multi-generational workforce, a merger, or digital transformation).
2. STAKEHOLDER TENSION: Inject competing interests. The scenario must pit two valid business needs against each other.
3. BASK LOGIC CONFLICT: Explicitly test Behavioral Competencies. Force the user to choose between "Ethical Practice" and "Business Acumen."
4. GREY-AREA DISTRACTORS: All four options must be plausible and professional. Only one is BEST per 2026 BASK logic.

VISUAL PARITY & "CLONAL DNA" MANDATE (EXTREME SYMMETRY):
- STRUCTURAL MIRRORING: All 3 distractors MUST share the EXACT same sentence structure and rhetorical rhythm as the "Correct Answer" (Verb + Noun + Clause).
- WORD-COUNT LOCK: Distractors MUST be within ±2 words of the correct answer (Universal Elite Requirement).
- PUNCTUATION CLONING: Identical use of commas, semicolons, and lists across all 4 options.
- LINGUISTIC DENSITY: Ensure each distractor has the same "Visual Weight" (line density) when displayed.
- LEADING VERB ANCHOR: Start all options with a verb from the ${certLevel} taxonomy: ${certLevel === 'SCP' ? '[Design, Evaluate, Analyze, Interpret, Champion]' : '[Implement, Coordinate, Apply, Review, Identify]'}.

OUTPUT REQUIREMENTS (JSON):
- scenario: A 3-5 sentence "High-Fidelity Theater" conflict. Add 2026 themes like AI Ethics or Psychological Safety where appropriate.
- question: Ends with "What is the BEST action for the HR Professional to take?"
- correct_answer: The provided answer, refined for professional tone.
- distractors: 3 psychometric distractors that match the visual and genomic footprint of the correct answer perfectly.
- rationale: A 2-part expert breakdown: (1) Why the correct answer is the most effective and (2) Why the distractors are sub-optimal.
- gap_analysis: Identify the specific "Cognitive Gap" this item tests.
- tag_bask: exactly one of: [People, Organization, Workplace].
- tag_behavior: exactly one of: [Leadership & Navigation, Ethical Practice, Relationship Management, Communication, Inclusive Mindset, Business Acumen, Consultation, Analytical Aptitude].`;

    const prompt = `${promptSystemInstructions}\nInput Cards:\n${cards.map(c => `ID: ${c.id}\nTerm: ${c.question}\nCorrect Answer: ${c.answer}\nPunctuation: ${c.originalPunctuation}`).join('\n---\n')}\nReturn JSON: { "results": [{ "id": "string", "scenario": "string", "question": "string", "correct_answer": "string", "distractors": ["3 items"], "rationale": "string", "gap_analysis": "string", "tag_bask": "People|Organization|Workplace", "tag_behavior": "string" }] }`;

    try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite-preview", 
            generationConfig: { 
                responseMimeType: "application/json", 
                temperature: 0.1,
                maxOutputTokens: 4096
            }
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        try {
            const cleanText = responseText.trim();
            const startIdx = cleanText.indexOf('{');
            const endIdx = cleanText.lastIndexOf('}');
            const parsed = JSON.parse(cleanText.substring(startIdx, endIdx + 1));
            res.status(200).json(parsed);
        } catch (parseErr) {
            console.error("AI_TRACE_FAIL (Raw):", responseText);
            res.status(500).json({ message: "Invalid Response Format", raw: responseText });
        }
    } catch (err) {
        console.error('GENERATE ERROR:', err.message);
        res.status(500).json({ message: 'AI_PROVIDER_ERROR', error: err.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`BASK Sync Engine listening at http://0.0.0.0:${port}`);
});
