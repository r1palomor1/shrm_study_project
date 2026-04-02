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
const MANDATORY_MODEL = "gemini-3.1-flash-lite-preview";

app.get('/', (req, res) => {
    res.json({ status: 'active', engine: 'V7.4 Surgical Orchestrator', model: MANDATORY_MODEL });
});

// STABLE PROMPT (V7.2 SOVEREIGNTY SOUL - BALANCED 2026 BASK)
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

// V7.4 SMART PARSER: Prevents the "7/67" metadata gap via Fuzzy Key Mapping
const extractHighYieldResults = (text) => {
    const results = [];
    const objectRegex = /\{[^{}]*"id":\s*"[^"]*"[^{}]*\}/g;
    const matches = text.match(objectRegex);
    
    if (matches) {
        for (const match of matches) {
            try {
                const cleaned = match.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
                const obj = JSON.parse(cleaned);
                
                // FUZZY MAPPING: Standardizes inconsistent AI keys to your Vault schema
                const standardized = {
                    id: String(obj.id || '').replace(/[\s\n\r]/g, ''),
                    scenario: obj.scenario || obj.content_scenario || obj.text_scenario,
                    question: obj.question || obj.item_question,
                    correct_answer: obj.correct_answer || obj.correct || obj.answer,
                    distractors: obj.distractors || obj.incorrect_options || obj.wrong_answers,
                    rationale: obj.rationale || obj.explanation || obj.feedback,
                    gap_analysis: obj.gap_analysis || obj.cognitive_gap || obj.assessment_gap,
                    tag_bask: obj.tag_bask || obj.bask_tag || obj.bask_domain || "General",
                    tag_behavior: obj.tag_behavior || obj.behavior_tag || obj.behavior_competency || "Professionalism"
                };
                
                if (standardized.id && standardized.scenario) results.push(standardized);
            } catch (e) { continue; }
        }
    }
    return results;
};

async function processInBursts(jobId, cards, certLevel, geminiKey) {
    const job = JOBS.get(jobId);
    if (!job) return;

    const BATCH_SIZE = 4;
    const CONCURRENCY = 2; // REDUCED TO 2 for 15 RPM Safety (Gemini Free Tier)

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
        model: MANDATORY_MODEL, 
        generationConfig: { temperature: 0.1, maxOutputTokens: 3800 }
    });

    for (let i = 0; i < cards.length; i += (BATCH_SIZE * CONCURRENCY)) {
        const currentJob = JOBS.get(jobId);
        if (!currentJob || currentJob.status === 'aborted') return;

        const currentBatches = [];
        for (let j = 0; j < CONCURRENCY; j++) {
            const start = i + (j * BATCH_SIZE);
            if (start < cards.length) currentBatches.push(cards.slice(start, start + BATCH_SIZE));
        }

        console.log(`[V7.4 BURST] Processing ${currentBatches.length * BATCH_SIZE} cards...`);

        await Promise.all(currentBatches.map(async (batch) => {
            try {
                const prompt = `${getSystemInstructions(certLevel)}\nInput Batch:\n${JSON.stringify(batch)}`;
                const result = await model.generateContent(prompt);
                const results = extractHighYieldResults(result.response.text());
                
                if (results.length > 0) {
                    job.results.push(...results);
                    job.completed += results.length;
                    console.log(`[V7.4 SAVED] ${results.length} cards extracted.`);
                }

                // SURGICAL RECOVERY: Hunt down missing IDs with 1-by-1 precision
                const receivedIds = new Set(results.map(r => r.id));
                const missingCards = batch.filter(c => !receivedIds.has(String(c.id).replace(/[\s\n\r]/g, '')));

                if (missingCards.length > 0) {
                    console.log(`[V7.4 RECOVERY] ${missingCards.length} missing. Initiating Surgical 1-by-1...`);
                    for (const card of missingCards) {
                        try {
                            const single = await model.generateContent(`${getSystemInstructions(certLevel)}\nInput Single: ${JSON.stringify([card])}`);
                            const sResults = extractHighYieldResults(single.response.text());
                            if (sResults?.[0]) {
                                job.results.push(sResults[0]);
                                job.completed += 1;
                                console.log(`[V7.4 RECOVERY] Success for ${card.id}`);
                            }
                        } catch (e) { console.error(`[V7.4 FATAL] Failed ${card.id}`); }
                    }
                }
            } catch (err) {
                console.error("[V7.4 BURST ERROR]", err.message);
            }
        }));

        if (i + (BATCH_SIZE * CONCURRENCY) < cards.length) {
            console.log(`[V7.4 THROTTLE] Cooling down 6s for RPM Safety... Progress: ${job.completed}/${job.total}`);
            await new Promise(r => setTimeout(r, 6000));
        }
    }
    job.status = 'done';
    console.log(`[V7.4 COMPLETED] Job Finished at ${job.completed}/${job.total}`);
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
    if (job) { job.status = 'aborted'; return res.json({ status: 'aborted' }); }
    res.status(404).json({ error: 'Not found' });
});

app.listen(port, '0.0.0.0', () => console.log(`V7.4 SURGICAL LIVE ON ${port}`));
