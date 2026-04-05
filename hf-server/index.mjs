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

// FORENSIC ENGINE CONFIGURATION (V8.0 Strategic Orchestrator)
const ENGINE_CONFIG = {
    VERSION: process.env.ENGINE_VERSION || "V8.0",
    LABEL: process.env.ENGINE_LABEL || "Strategic Orchestrator"
};

const JOBS = new Map();
const MANDATORY_MODEL = "gemini-3.1-flash-lite-preview";

app.get('/', (req, res) => {
    res.json({ status: 'active', engine: `${ENGINE_CONFIG.VERSION} ${ENGINE_CONFIG.LABEL}`, model: MANDATORY_MODEL });
});

/**
 * STRATEGIC INSTRUCTION ENGINE (V8.0)
 * Differentiates cognitive depth between Operational (CP) and Strategic (SCP) certifications.
 */
const getSystemInstructions = (certLevel) => {
    const baseRole = certLevel === 'SCP' 
        ? "Senior Strategic Business Partner & Organizational Visionary"
        : "Operational HR Specialist & Compliance Lead";

    const cognitiveLayer = certLevel === 'SCP'
        ? `STRATEGIC LAYER (SCP): 
           - Focus on Macro-Financial impact and Organizational Strategy.
           - Stakeholders: CEO, Board of Directors, and global workforce.
           - Key Conflict: How does this decision drive long-term business goals and organizational culture?`
        : `OPERATIONAL LAYER (CP):
           - Focus on Process Execution and Policy Application.
           - Stakeholders: Mid-level Management and immediate team members.
           - Key Conflict: How do we resolve this specific incident while maintaining consistency and compliance?`;

    return `ROLE: ${baseRole}.
[ENGINE: ${ENGINE_CONFIG.VERSION} | ${ENGINE_CONFIG.LABEL}]
TASK: Generate high-fidelity Situational Judgment Items (SJI) that mirror the cognitive complexity of the 2026 SHRM-${certLevel} exam.

${cognitiveLayer}

MANDATORY "FOUR ANCHOR" ARCHITECTURE:
1. ORGANIZATIONAL CONTEXT: Define a nuanced environment.
2. STAKEHOLDER TENSION: Inject competing interests.
3. BASK LOGIC CONFLICT: Explicitly test Behavioral Competencies.
4. GREY-AREA DISTRACTORS: Plausible but only one is BEST per 2026 BASK logic.

VISUAL PARITY & "CLONAL DNA" MANDATE:
- STRUCTURAL MIRRORING: All distractors MUST share the EXACT same visual weight and professional tone as the Correct Answer.
- TERMINOLOGY: Use 2026 BASK nomenclature exclusively.

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
};

/**
 * REPAIR PROMPTS (SURGICAL PRESERVATION)
 */
const getRepairMetadataInstructions = (certLevel) => `ROLE: Senior SHRM 2026 Psychometrician.
TASK: Analyze the provided SHRM-${certLevel} Scenarios and identify the correct 2026 BASK Tags.
[MANDATE]: DO NOT CHANGE THE SCENARIO. ONLY PROVIDE THE TAGS.

RETURN JSON:
{ 
  "results": [{ 
    "id": "string", 
    "tag_bask": "string", 
    "tag_behavior": "string" 
  }] 
}`;

const getRepairDistractorsInstructions = (certLevel) => `ROLE: Senior SHRM 2026 Psychometrician.
TASK: Analyze the SHRM-${certLevel} Scenario and regenerate 3 modern distractors.
[MANDATE]: DO NOT CHANGE THE SCENARIO. 
[VISUAL MIRROR]: Distractors MUST match the visual length and tone of the Correct Answer perfectly.

RETURN JSON:
{ 
  "results": [{ 
    "id": "string", 
    "distractors": ["string", "string", "string"]
  }] 
}`;

/**
 * HARDENED PARSER: Multi-stage extraction
 */
const extractHighYieldResults = (text) => {
    if (!text) return [];
    const results = [];
    try {
        const cleaned = text.trim().replace(/^```json\n?/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed?.results)) return parsed.results.map(standardizeObject).filter(r => r);
    } catch (e) {}

    const objectRegex = /\{[^{}]*"id":\s*"[^"]*"[^{}]*\}/g;
    const matches = text.match(objectRegex);
    if (matches) {
        for (const match of matches) {
            try {
                const cleanedMatch = match.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
                const obj = JSON.parse(cleanedMatch);
                const std = standardizeObject(obj);
                if (std) results.push(std);
            } catch (e) {}
        }
    }
    return results;
};

const standardizeObject = (obj) => {
    if (!obj || !obj.id) return null;
    const cleanId = String(obj.id).replace(/[\s\n\r]/g, '');
    return {
        ...obj,
        id: cleanId
    };
};

const STAGGER_WAIT = 3000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * TIER A: FULL SYNC ORCHESTRATOR
 */
async function processInBursts(jobId, cards, certLevel, geminiKey) {
    const job = JOBS.get(jobId);
    if (!job) return;

    const BATCH_SIZE = 4;
    const CONCURRENCY = 1;
    const SUB_BATCH_SIZE = 2;

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: MANDATORY_MODEL, generationConfig: { temperature: 0.1, maxOutputTokens: 5000 } });

    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
        const currentJob = JOBS.get(jobId);
        if (!currentJob || currentJob.status === 'aborted') return;

        const batch = cards.slice(i, i + BATCH_SIZE);
        console.log(`[${ENGINE_CONFIG.VERSION} FULL] Target: ${batch.length} cards...`);

        try {
            const prompt = `${getSystemInstructions(certLevel)}\nInput Batch:\n${JSON.stringify(batch)}`;
            const result = await model.generateContent(prompt);
            const results = extractHighYieldResults(result.response.text());
            
            if (results.length > 0) {
                job.results.push(...results);
                job.completed += results.length;
                console.log(`[${ENGINE_CONFIG.VERSION} SAVED] ${results.length} cards.`);
            }

            const receivedIds = new Set(results.map(r => r.id));
            let missingCards = batch.filter(c => !receivedIds.has(String(c.id).replace(/[\s\n\r]/g, '')));

            if (missingCards.length >= SUB_BATCH_SIZE) {
                await sleep(STAGGER_WAIT);
                const miniResult = await model.generateContent(`${getSystemInstructions(certLevel)}\nInput Recovery:\n${JSON.stringify(missingCards)}`);
                const miniResults = extractHighYieldResults(miniResult.response.text());
                if (miniResults.length > 0) {
                    job.results.push(...miniResults);
                    job.completed += miniResults.length;
                }
                const miniReceivedIds = new Set(miniResults.map(r => r.id));
                missingCards = missingCards.filter(c => !miniReceivedIds.has(String(c.id).replace(/[\s\n\r]/g, '')));
            }

            if (missingCards.length > 0) {
                for (const card of missingCards) {
                    await sleep(STAGGER_WAIT);
                    const single = await model.generateContent(`${getSystemInstructions(certLevel)}\nInput Surgical: ${JSON.stringify([card])}`);
                    const sResults = extractHighYieldResults(single.response.text());
                    if (sResults?.[0]) {
                        job.results.push(sResults[0]);
                        job.completed += 1;
                    }
                }
            }
        } catch (err) {
            if (err.message.includes('429')) { job.status = 'error'; return; }
        }
        if (i + BATCH_SIZE < cards.length) await sleep(10000);
    }
    job.status = 'done';
}

/**
 * TIER B/C: REPAIR ORCHESTRATORS
 */
async function processRepair(jobId, cards, certLevel, geminiKey, type) {
    const job = JOBS.get(jobId);
    if (!job) return;

    const BATCH_SIZE = type === 'metadata' ? 20 : 8;
    const instructions = type === 'metadata' ? getRepairMetadataInstructions : getRepairDistractorsInstructions;

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: MANDATORY_MODEL });

    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
        const currentJob = JOBS.get(jobId);
        if (!currentJob || currentJob.status === 'aborted') return;

        const batch = cards.slice(i, i + BATCH_SIZE);
        console.log(`[${ENGINE_CONFIG.VERSION} REPAIR-${type.toUpperCase()}] Batch: ${batch.length} cards...`);

        try {
            const prompt = `${instructions(certLevel)}\nInput Batch:\n${JSON.stringify(batch)}`;
            const result = await model.generateContent(prompt);
            const results = extractHighYieldResults(result.response.text());
            
            if (results.length > 0) {
                job.results.push(...results);
                job.completed += results.length;
            }
        } catch (err) {
            if (err.message.includes('429')) { job.status = 'error'; return; }
        }
        await sleep(5000);
    }
    job.status = 'done';
}

app.post('/generate-distractors', (req, res) => {
    const { cards, certLevel = 'CP', mode = 'full' } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || !cards) return res.status(400).json({ status: 'error' });
    const jobId = uuidv4();
    JOBS.set(jobId, { id: jobId, status: 'processing', completed: 0, total: cards.length, results: [] });
    
    if (mode === 'repair-metadata' || mode === 'repair-distractors') {
        processRepair(jobId, cards, certLevel, geminiKey, mode === 'repair-metadata' ? 'metadata' : 'distractors');
    } else {
        processInBursts(jobId, cards, certLevel, geminiKey);
    }
    
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
