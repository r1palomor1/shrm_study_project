import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const port = 7860; // MANDATORY HF PORT

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const JOBS = new Map();

// HEALTH CHECK ENDPOINT
app.get('/', (req, res) => {
    res.json({ status: 'active', engine: 'SHRM 2026 BASK Sync V7 Orchestrator', jobs: JOBS.size });
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

// 1. THE FORENSIC AUDITOR: Surgically extracts JSON regardless of AI chatter
const extractCleanJson = (text) => {
    try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error("No JSON boundaries found");
        const jsonStr = text.substring(start, end + 1).replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); 
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Forensic Audit Failed on String:", text.substring(0, 100));
        return null;
    }
};

// 2. THE SHADOW WORKER: Parallel Burst Engine with Recovery
async function processInBursts(jobId, cards, certLevel, geminiKey) {
    const job = JOBS.get(jobId);
    const BATCH_SIZE = 4;        // Stability Sweet Spot
    const CONCURRENCY = 3;      // 3 Parallel requests = 12 cards per "Burst"
    
    // Group cards into batches
    const batches = [];
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
        batches.push(cards.slice(i, i + BATCH_SIZE));
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", // Using 1.5 Flash for better reasoning/logic stability
        generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 3000 }
    });

    // Process in sets of 3 parallel batches
    for (let i = 0; i < batches.length; i += CONCURRENCY) {
        // ABORT CHECK
        const currentJob = JOBS.get(jobId);
        if (!currentJob || currentJob.status === 'aborted') {
            console.log(`[JOB ${jobId}] ABORTED.`);
            return; 
        }

        const currentSet = batches.slice(i, i + CONCURRENCY);
        console.log(`[V7 BURST] Firing Burst ${i/CONCURRENCY + 1} (${currentSet.length * BATCH_SIZE} cards)...`);

        await Promise.all(currentSet.map(async (batch) => {
            const prompt = `${getSystemInstructions(certLevel)}\nInput:\n${JSON.stringify(batch)}`;
            try {
                const result = await model.generateContent(prompt);
                const parsed = extractCleanJson(result.response.text());
                
                if (parsed && parsed.results) {
                    job.results.push(...parsed.results);
                    job.completed += parsed.results.length;
                    console.log(`[V7 SAVED] Batch Successful. Total: ${job.completed}/${cards.length}`);
                } else {
                    throw new Error("Audit Fail");
                }
            } catch (err) {
                console.warn(`[V7 RECOVERY] Batch failed. Initiating Surgical 1-by-1 Fallback...`);
                // MACHIAVELLIAN RETRY: Process cards individually if the batch fails
                for (const card of batch) {
                    try {
                        const singleResult = await model.generateContent(`${getSystemInstructions(certLevel)}\nInput Card: ${JSON.stringify(card)}`);
                        const singleParsed = extractCleanJson(singleResult.response.text());
                        if (singleParsed?.results?.[0]) {
                            job.results.push(singleParsed.results[0]);
                            job.completed += 1;
                        }
                    } catch (innerErr) {
                        console.error(`[V7 FATAL] Failed card ${card.id} twice. Skipping.`);
                    }
                }
            }
        }));

        // 429 SHIELD: Delay to stay under 15 RPM
        if (i + CONCURRENCY < batches.length) {
            console.log(`[V7 THROTTLE] Cooling down for 5s...`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    job.status = 'done';
    console.log(`[V7 COMPLETED] Job ID: ${jobId} at ${job.completed}/${cards.length}`);
}

// ENDPOINT: SUBMIT
app.post('/generate-distractors', (req, res) => {
    const { cards, quizType = 'intelligent', certLevel = 'CP' } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return res.status(500).json({ status: 'error', message: 'API Key Missing' });

    const jobId = uuidv4();
    JOBS.set(jobId, { id: jobId, status: 'processing', completed: 0, total: cards.length, results: [], createdAt: new Date() });

    processInBursts(jobId, cards, certLevel, geminiKey);
    res.json({ job_id: jobId, status: 'processing', total: cards.length });
});

// ENDPOINT: STATUS
app.get('/sync-status/:jobId', (req, res) => {
    const job = JOBS.get(req.params.jobId);
    if (!job) return res.status(404).json({ status: 'error', message: 'Job not found' });
    const resultsToSend = [...job.results];
    job.results = []; 
    res.json({ status: job.status, completed: job.completed, total: job.total, results: resultsToSend });
});

// ENDPOINT: ABORT
app.delete('/abort-sync/:jobId', (req, res) => {
    const job = JOBS.get(req.params.jobId);
    if (job) {
        job.status = 'aborted';
        return res.json({ status: 'aborted' });
    }
    res.status(404).json({ status: 'error', message: 'Job not found' });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`BASK V7 ORCHESTRATOR listening at http://0.0.0.0:${port}`);
});
