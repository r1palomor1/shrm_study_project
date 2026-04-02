import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();
const app = express();
const port = 7860; 

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const JOBS = new Map();

// HEALTH CHECK ENDPOINT
app.get('/', (req, res) => {
    res.json({ status: 'active', engine: 'V7.3.1 High-Yield Orchestrator', model: MANDATORY_MODEL });
});

// PROTOCOL GUARD: MANDATORY ENGINE - DO NOT ALTER
const MANDATORY_MODEL = "gemini-3.1-flash-lite-preview";

// STABLE PROMPT (V7.2 SOVEREIGNTY - BALANCED 2026 BASK)
const getSystemInstructions = (certLevel) => `ROLE: Senior SHRM 2026 Psychometrician & SJI Architect.
TASK: Generate high-fidelity Situational Judgment Items (SJI) that mirror the cognitive complexity of the 2026 SHRM-CP/SCP exams.

MANDATORY "FOUR ANCHOR" ARCHITECTURE:
1. ORGANIZATIONAL CONTEXT: Define a nuanced environment.
2. STAKEHOLDER TENSION: Inject competing interests.
3. BASK LOGIC CONFLICT: Explicitly test Behavioral Competencies.
4. GREY-AREA DISTRACTORS: Plausible but only one is BEST per 2026 BASK logic.

VISUAL PARITY & "CLONAL DNA" MANDATE:
- STRUCTURAL MIRRORING: All 3 distractors MUST share the EXACT same visual weight and professional tone as the Correct Answer.
- TERMINOLOGY: Use 2026 BASK nomenclature (e.g., "Critical Evaluation", "Inclusive Mindset", "Global & Cultural Effectiveness").

RETURN ONLY RAW JSON:
{ "results": [{ "id": "string", "scenario": "string", "question": "string", "correct_answer": "string", "distractors": ["string", "string", "string"], "rationale": "string", "gap_analysis": "string", "tag_bask": "string", "tag_behavior": "string" }] }`;

/**
 * HIGH-YIELD PARSER (V7.3)
 * Instead of failing the whole block, we try to recover as much as possible.
 */
const extractHighYieldResults = (text) => {
    try {
        // 1. First try a clean parse of the whole block
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) return [];
        
        const jsonStr = text.substring(start, end + 1).replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); 
        const parsed = JSON.parse(jsonStr);
        if (parsed?.results) return parsed.results;
    } catch (e) {
        // 2. If whole block fails, attempt regex-based extraction of individual result objects
        console.warn("[V7.3] Block parse failed. Attempting individual object recovery...");
        const individualResults = [];
        const objectRegex = /\{[^{}]*"id":\s*"[^"]*"[^{}]*\}/g;
        const matches = text.match(objectRegex);
        
        if (matches) {
            for (const match of matches) {
                try {
                    const cleanedMatch = match.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
                    const obj = JSON.parse(cleanedMatch);
                    if (obj.id && obj.scenario) individualResults.push(obj);
                } catch (innerE) { continue; }
            }
        }
        return individualResults;
    }
    return [];
};

async function processInBursts(jobId, cards, certLevel, geminiKey) {
    const job = JOBS.get(jobId);
    if (!job) return;

    const BATCH_SIZE = 4;
    const CONCURRENCY = 3; 
    
    const batches = [];
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
        batches.push(cards.slice(i, i + BATCH_SIZE));
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
        model: MANDATORY_MODEL, 
        generationConfig: { temperature: 0.1, maxOutputTokens: 3800 }
    });

    for (let i = 0; i < batches.length; i += CONCURRENCY) {
        const currentJob = JOBS.get(jobId);
        if (!currentJob || currentJob.status === 'aborted') {
            console.log(`[V7.3] ABORTED.`);
            return; 
        }

        const currentSet = batches.slice(i, i + CONCURRENCY);
        console.log(`[V7.3 BURST] Firing Burst (${currentSet.length * BATCH_SIZE} cards potential)...`);

        await Promise.all(currentSet.map(async (batch) => {
            try {
                const prompt = `${getSystemInstructions(certLevel)}\nInput Batch:\n${JSON.stringify(batch)}`;
                const result = await model.generateContent(prompt);
                const results = extractHighYieldResults(result.response.text());
                
                if (results.length > 0) {
                    job.results.push(...results);
                    job.completed += results.length;
                    console.log(`[V7.3 SAVED] ${results.length} cards extracted from batch.`);
                }

                // If we got fewer results than expected, we trigger the 1-by-1 for the MISSING ones
                const receivedIds = new Set(results.map(r => String(r.id).replace(/[\s\n\r]/g, '')));
                const missingCards = batch.filter(c => !receivedIds.has(String(c.id).replace(/[\s\n\r]/g, '')));

                if (missingCards.length > 0) {
                    console.log(`[V7.3 RECOVERY] ${missingCards.length} cards missing. Initiating Surgical 1-by-1...`);
                    for (const card of missingCards) {
                        try {
                            const single = await model.generateContent(`${getSystemInstructions(certLevel)}\nInput: ${JSON.stringify([card])}`);
                            const sResults = extractHighYieldResults(single.response.text());
                            if (sResults?.[0]) {
                                job.results.push(sResults[0]);
                                job.completed += 1;
                                console.log(`[V7.3 RECOVERY] Successfully recovered ${card.id}`);
                            }
                        } catch (e) { console.error(`[V7.3 FATAL] Totally failed card: ${card.id}`); }
                    }
                }
            } catch (err) {
                console.error("[V7.3 BURST ERROR]", err.message);
            }
        }));

        if (i + CONCURRENCY < batches.length) {
            console.log(`[V7.3 THROTTLE] Cooling down 5s... Progress: ${job.completed}/${job.total}`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    job.status = 'done';
    console.log(`[V7.3 COMPLETED] Job Finished at ${job.completed}/${job.total}`);
}

app.post('/generate-distractors', (req, res) => {
    const { cards, certLevel = 'CP' } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || !cards) return res.status(400).json({ status: 'error' });
    const jobId = uuidv4();
    JOBS.set(jobId, { id: jobId, status: 'processing', completed: 0, total: cards.length, results: [] });
    processInBursts(jobId, cards, certLevel, geminiKey);
    res.json({ job_id: jobId, status: 'processing', total: cards.length });
});

app.get('/sync-status/:jobId', (req, res) => {
    const job = JOBS.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Not found' });
    const chunk = [...job.results];
    job.results = []; 
    res.json({ status: job.status, completed: job.completed, total: job.total, results: chunk });
});

app.delete('/abort-sync/:jobId', (req, res) => {
    const job = JOBS.get(req.params.jobId);
    if (job) {
        job.status = 'aborted';
        return res.json({ status: 'aborted' });
    }
    res.status(404).json({ error: 'Not found' });
});

app.listen(port, '0.0.0.0', () => console.log(`V7.3 HIGH-YIELD LIVE ON ${port}`));
