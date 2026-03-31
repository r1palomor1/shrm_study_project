// VERCEL EDGE RUNTIME: REQUIRES PURE WEB FETCH (SDK IS NODE-ONLY)
export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const body = await req.json();
        const { cards, quizType = 'intelligent', certLevel = 'CP', pipelineStage = 'monolithic', mode } = body;
        const geminiKey = process.env.GEMINI_API_KEY;

        if (!cards || !Array.isArray(cards)) {
            return new Response(JSON.stringify({ message: 'Invalid card data' }), { status: 400 });
        }

        if (mode !== 'generate-distractors') {
            const promptInsight = `ROLE: Study Coach. Data: ${JSON.stringify(body)}. Task: Provide 1 coaching bridge using "Inclusive Mindset".`;
            return callGeminiREST(promptInsight, geminiKey);
        }

        let promptSystemInstructions = "";
        if (quizType === 'intelligent') {
            if (pipelineStage === 'seed') {
                const verbTaxonomy = certLevel === 'SCP' ? "[Design, Evaluate, Analyze, Interpret, Champion]" : "[Implement, Coordinate, Apply, Review, Identify]";
                promptSystemInstructions = `ROLE: SHRM 2026 SJI Architect. Situation Scenario + Tethered-Action Correct Answer. Start answer with ${verbTaxonomy}. No [Term] labeling.`;
            } else {
                // SYMMETRY ENGINE (PHASE 2)
                promptSystemInstructions = `ROLE: SHRM 2026 Structural Mirror. TASK: 3 distractors, rationale, gap. STRICT SYMMETRY PROTOCOL: 1. CLONAL STRUCTURE: Analyze Correct Answer DNA. Mirror rhetorical weight/blocks. If semicolon (;), mirror it. 2. LEADING VERB ANCHOR: Start all distractors with same verb tense as startsWithVerb. 3. ELIMINATE MATH.`;
            }
        } else {
            promptSystemInstructions = `ROLE: SHRM 2026 Structural Mirror. Mimic visual density of answer. Naturally vary concepts. Return JSON.`;
        }

        const prompt = `${promptSystemInstructions}\nInput Cards:\n${cards.map(c => `ID: ${c.id}\nTerm: ${c.question}\nCorrect Answer: ${c.answer}\nPunctuation: ${c.originalPunctuation}\nStarts With: ${c.startsWithVerb}${c.scenario ? `\nExisting Scenario: ${c.scenario}` : ''}`).join('\n---\n')}\nReturn JSON: { "results": [{ "id": "string", "scenario": "string", "distractors": ["3 items"], "rationale": "string", "gap_analysis": "string", "tag_bask": "People|Organization|Workplace" }] }`;

        return callGeminiREST(prompt, geminiKey);

    } catch (err) {
        return new Response(JSON.stringify({ message: 'Internal Server Error', error: err.message }), { status: 500 });
    }
}

async function callGeminiREST(prompt, apiKey) {
    if (!apiKey) return new Response(JSON.stringify({ message: "Key Missing" }), { status: 500 });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
        })
    });

    const data = await response.json();
    if (!response.ok) return new Response(JSON.stringify({ message: "AI Error", error: data }), { status: 500 });

    try {
        const text = data.candidates[0].content.parts[0].text;
        const parsed = parseAIResponse(text);
        return new Response(JSON.stringify(parsed), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ message: "Invalid Response Format" }), { status: 500 });
    }
}

function parseAIResponse(text) {
    try {
        let cleanText = text.trim();
        const startIdx = cleanText.indexOf('{');
        const endIdx = cleanText.lastIndexOf('}');
        if (startIdx === -1 || endIdx === -1) return null;
        cleanText = cleanText.substring(startIdx, endIdx + 1);
        return JSON.parse(cleanText);
    } catch (e) { return null; }
}
