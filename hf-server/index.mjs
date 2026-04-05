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

// FORENSIC ENGINE CONFIGURATION (V7.7.3 Forensic RPM Stagger)
const ENGINE_CONFIG = {
    VERSION: process.env.ENGINE_VERSION || "V7.7.3",
    LABEL: process.env.ENGINE_LABEL || "High-Density Orchestrator"
};

const JOBS = new Map();
const MANDATORY_MODEL = "gemini-3.1-flash-lite-preview";

app.get('/', (req, res) => {
    res.json({ status: 'active', engine: `${ENGINE_CONFIG.VERSION} ${ENGINE_CONFIG.LABEL}`, model: MANDATORY_MODEL });
});

// STABLE PROMPT (SOVEREIGNTY SOUL - BALANCED 2026 BASK)
const getSystemInstructions = (certLevel) => `ROLE: Senior SHRM 2026 Psychometrician & SJI Architect.
[ENGINE: ${ENGINE_CONFIG.VERSION} | ${ENGINE_CONFIG.LABEL}]
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
{ 
  "results": [{ 
    "id": "string", 
    "scenario": "string", 
    "question": "string", 
    "correct_answer": "string", 
    "distractors": ["string", "string", "string"], 
    "rationale": "string", 
    "gap_analysis": "string", 
    "tag_bask": "exactly one of: [People, Organization, Workplace]", 
    "tag_behavior": "exactly one of: [Leadership & Navigation, Ethical Practice, Relationship Management, Communication, Inclusive Mindset, Business Acumen, Consultation, Analytical Aptitude]" 
  }] 
}`;

/**
 * HARDENED PARSER: Multi-stage extraction to avoid false Surgical Recovery triggers
 */
const extractHighYieldResults = (text) => {
    if (!text) return [];
    const results = [];
    
    // Stage 1: Clean & Direct Parse
    try {
        const cleaned = text.trim().replace(/^```json\n?/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed?.results)) return parsed.results.map(standardizeObject).filter(r => r);
    } catch (e) {
        // Fallback to Stage 2
    }

    // Stage 2: Fragment Identification (Regex Fallback)
    const objectRegex = /\{[^{}]*"id":\s*"[^"]*"[^{}]*\}/g;
    const matches = text.match(objectRegex);
    if (matches) {
        for (const match of matches) {
            try {
                const cleanedMatch = match.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
                const obj = JSON.parse(cleanedMatch);
                const std = standardizeObject(obj);
                if (std) results.push(std);
            } catch (e) { continue; }
        }
    }
    return results;
};

// HELPER: Ensures uniform mapping across all extraction paths
const standardizeObject = (obj) => {
    if (!obj || !obj.id || !obj.scenario) return null;
    const cleanId = String(obj.id).replace(/[\s\n\r]/g, '');
    return {
        id: cleanId,
        scenario: obj.scenario || obj.content_scenario || obj.text_scenario,
        question: obj.question || obj.item_question,
        correct_answer: obj.correct_answer || obj.correct || obj.answer,
        distractors: obj.distractors || obj.incorrect_options || obj.wrong_answers,
        rationale: obj.rationale || obj.explanation || obj.feedback,
        gap_analysis: obj.gap_analysis || obj.cognitive_gap || obj.assessment_gap,
        tag_bask: obj.tag_bask || obj.bask_tag || obj.bask_domain || "General",
        tag_behavior: obj.tag_behavior || obj.behavior_tag || obj.behavior_competency || "Professionalism"
    };
};

const STAGGER_WAIT = 3000; // Mandatory 3s stagger between RPM calls
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function processInBursts(jobId, cards, certLevel, geminiKey) {
    const job = JOBS.get(jobId);
    if (!job) return;

    // V7.7.3 RPM STABILITY CONFIG
    const BATCH_SIZE = 4; // CALIBRATED: Maximum stability for Flash-Lite
    const CONCURRENCY = 1; // CALIBRATED: Required for 15 RPM Free Tier Safety
    const SUB_BATCH_SIZE = 2; // MINI-BATCH: Intermediate recovery tier

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
        model: MANDATORY_MODEL, 
        generationConfig: { temperature: 0.1, maxOutputTokens: 5000 } 
    });

    for (let i = 0; i < cards.length; i += (BATCH_SIZE * CONCURRENCY)) {
        const currentJob = JOBS.get(jobId);
        if (!currentJob || currentJob.status === 'aborted') return;

        const batch = cards.slice(i, i + BATCH_SIZE);
        console.log(`[${ENGINE_CONFIG.VERSION} STABILITY] Target: ${batch.length} cards... Pool: ${i}/${cards.length}`);

        try {
            // TIER 1: BASE BATCH
            const prompt = `${getSystemInstructions(certLevel)}\nInput Batch:\n${JSON.stringify(batch)}`;
            const result = await model.generateContent(prompt);
            const results = extractHighYieldResults(result.response.text());
            
            const processBatchResults = (resList) => {
                if (resList.length > 0) {
                    job.results.push(...resList);
                    job.completed += resList.length;
                    console.log(`[${ENGINE_CONFIG.VERSION} SAVED] ${resList.length} cards extracted.`);
                }
            };
            
            processBatchResults(results);

            // IDENTIFY GAPS
            const receivedIds = new Set(results.map(r => r.id));
            let missingCards = batch.filter(c => !receivedIds.has(String(c.id).replace(/[\s\n\r]/g, '')));

            // TIER 2: DOWNSHIFT (MINI-BATCH) - If > 1 missing
            if (missingCards.length >= SUB_BATCH_SIZE) {
                await sleep(STAGGER_WAIT);
                console.log(`[${ENGINE_CONFIG.VERSION} DOWNSHIFT] Recovery tier for ${missingCards.length} missing cards...`);
                const miniPrompt = `${getSystemInstructions(certLevel)}\nInput Mini-Batch (Recovery):\n${JSON.stringify(missingCards)}`;
                const miniResult = await model.generateContent(miniPrompt);
                const miniResults = extractHighYieldResults(miniResult.response.text());
                
                processBatchResults(miniResults);
                
                const miniReceivedIds = new Set(miniResults.map(r => r.id));
                missingCards = missingCards.filter(c => !miniReceivedIds.has(String(c.id).replace(/[\s\n\r]/g, '')));
            }

            // TIER 3: SURGICAL 1-BY-1 (STAGGERED BOLT)
            if (missingCards.length > 0) {
                console.log(`[${ENGINE_CONFIG.VERSION} SURGICAL] ${missingCards.length} Gaps. Extracting Staggered...`);
                for (const card of missingCards) {
                    await sleep(STAGGER_WAIT); 
                    try {
                        const single = await model.generateContent(`${getSystemInstructions(certLevel)}\nInput Single (Surgical): ${JSON.stringify([card])}`);
                        const sResults = extractHighYieldResults(single.response.text());
                        if (sResults?.[0]) {
                            job.results.push(sResults[0]);
                            job.completed += 1;
                            console.log(`[${ENGINE_CONFIG.VERSION} SUCCESS] Recovered ${card.id}`);
                        }
                    } catch (e) {
                        if (e.message.includes('429')) throw e; // Pass 429 up to kill job
                        console.error(`[${ENGINE_CONFIG.VERSION} FATAL] Failed ${card.id}`); 
                    }
                }
            }
        } catch (err) {
            console.error(`[${ENGINE_CONFIG.VERSION} ERROR]`, err.message);
            if (err.message.includes('429')) {
                console.error(`[${ENGINE_CONFIG.VERSION} CRITICAL] 429 RECEIVED. HALTING JOB TO PREVENT RPD WASTE.`);
                job.status = 'error';
                return;
            }
        }

        if (i + BATCH_SIZE < cards.length) {
            console.log(`[${ENGINE_CONFIG.VERSION} COOL-DOWN] 10s Cycle Sleep... Progress: ${job.completed}/${job.total}`);
            await sleep(10000); // 10s cooldown between 4-card cycles
        }
    }
    job.status = 'done';
    console.log(`[${ENGINE_CONFIG.VERSION} COMPLETED] Job Finished at ${job.completed}/${job.total}`);
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

app.listen(port, '0.0.0.0', () => console.log(`${ENGINE_CONFIG.VERSION} ${ENGINE_CONFIG.LABEL} LIVE ON ${port}`));
