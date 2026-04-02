import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const port = 7860; // MANDATORY HF PORT

app.use(cors());
app.use(express.json());

// GLOBAL JOB STORE (InMemory - Reset on Space Restart)
const JOBS = new Map();

// HEALTH CHECK ENDPOINT
app.get('/', (req, res) => {
    res.json({ status: 'active', engine: 'SHRM 2026 BASK Sync V6.1 Strict Sync', jobs: JOBS.size });
});

// STABLE PROMPT (Elite V3.1 - DO NOT TOUCH)
const getSystemInstructions = (certLevel) => `ROLE: Senior SHRM 2026 Psychometrician & SJI Architect.
TASK: Generate high-fidelity Situational Judgment Items (SJI) that mirror the cognitive complexity of the 2026 SHRM-CP/SCP exams.

MANDATORY "FOUR ANCHOR" ARCHITECTURE:
1. ORGANIZATIONAL CONTEXT: Define a nuanced environment.
2. STAKEHOLDER TENSION: Inject competing interests.
3. BASK LOGIC CONFLICT: Explicitly test Behavioral Competencies.
4. GREY-AREA DISTRACTORS: All four options must be plausible. Only one is BEST per 2026 BASK logic.

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

// BACKGROUND WORKER (V6.1 STRICT SYNC)
async function processSyncJob(jobId, cards, quizType, certLevel, geminiKey) {
    const job = JOBS.get(jobId);
    if (!job) return;

    let i = 0;
    let currentBurstSize = 6; 

    while (i < cards.length) {
        // Slice the next batch starting from 'i'
        const batch = cards.slice(i, i + currentBurstSize);
        console.log(`[JOB ${jobId}] Requesting ${batch.length} cards starting at index ${i}`);

        const prompt = `${getSystemInstructions(certLevel)}\nInput Cards:\n${batch.map(c => `ID: ${c.id}\nTerm: ${c.question}\nCorrect Answer: ${c.answer}\nPunctuation: ${c.originalPunctuation}`).join('\n---\n')}\nReturn JSON: { "results": [{ "id": "string", "scenario": "string", "question": "string", "correct_answer": "string", "distractors": ["3 items"], "rationale": "string", "gap_analysis": "string", "tag_bask": "People|Organization|Workplace", "tag_behavior": "string" }] }`;

        try {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ 
                model: "gemini-3.1-flash-lite-preview", 
                generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 4096 } 
            });

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            
            const startIdx = responseText.indexOf('{');
            const endIdx = responseText.lastIndexOf('}');
            const parsed = JSON.parse(responseText.substring(startIdx, endIdx + 1));

            if (parsed && parsed.results && Array.isArray(parsed.results)) {
                job.results = [...job.results, ...parsed.results];
                job.completed += parsed.results.length;
                
                // CRITICAL FIX: Advance pointer ONLY by the number of cards received
                i += parsed.results.length; 
                
                console.log(`[JOB ${jobId}] Successfully saved ${parsed.results.length} cards. Total: ${job.completed}/${cards.length}`);

                // Optional: Gentle ramp back up if we were downshifted
                if (currentBurstSize < 6 && (i % 12 === 0)) currentBurstSize = 6;
            } else {
                throw new Error("Invalid JSON structure from AI");
            }

        } catch (err) {
            console.error(`[JOB ${jobId}] ERROR at index ${i}:`, err.message);
            
            if (currentBurstSize > 2) {
                console.warn(`[GEARBOX] Reducing burst to 2 for stability.`);
                currentBurstSize = 2;
                // Pointer 'i' does NOT move; we retry the same cards in a smaller batch.
            } else {
                console.error(`[JOB ${jobId}] FATAL: Skipping card ${cards[i].id} after repeated failure.`);
                i += 1; // Move forward by 1 to prevent infinite loop on a "bad" card
            }
        }
        
        // Brief rest between AI calls to respect RPM
        await new Promise(r => setTimeout(r, 2000));
    }

    job.status = 'done';
    console.log(`[JOB ${jobId}] FINAL COMPLETION: ${job.completed}/${cards.length}`);
}

// ENDPOINT: SUBMIT
app.post('/generate-distractors', async (req, res) => {
    const { cards, quizType = 'intelligent', certLevel = 'CP' } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) return res.status(500).json({ status: 'error', message: 'API Key Missing' });
    if (!cards || !Array.isArray(cards)) return res.status(400).json({ status: 'error', message: 'Invalid Input Cards' });

    const jobId = uuidv4();
    JOBS.set(jobId, {
        id: jobId,
        status: 'processing',
        completed: 0,
        total: cards.length,
        results: [],
        createdAt: new Date()
    });

    // SPAWN BACKGROUND EXECUTION (Non-blocking)
    processSyncJob(jobId, cards, quizType, certLevel, geminiKey);

    res.json({ job_id: jobId, status: 'processing', total: cards.length });
});

// ENDPOINT: STATUS
app.get('/sync-status/:jobId', (req, res) => {
    const job = JOBS.get(req.params.jobId);
    if (!job) return res.status(404).json({ status: 'error', message: 'Job not found' });

    // Send partial results and then clear them from the server cache to save memory
    // The client will accumulate them.
    const resultsToSend = [...job.results];
    job.results = []; // CLEAR CACHE (IMPORTANT FOR LONG SYNC STABILITY)

    res.json({
        status: job.status,
        completed: job.completed,
        total: job.total,
        results: resultsToSend
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`BASK Sync Engine V6.1 STRICT ASYNC listening at http://0.0.0.0:${port}`);
});
