const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * AI Study Coach Provider: Structural Integration with Gemini 3.1 Flash-Lite.
 * Locks the app into 'Surgical Auditor' mode for high-fidelity content generation.
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `
You are the "SHRM 2026 Surgical Auditor," an elite expert in HR certification and the 2026 SHRM BASK.
Your mission is to transform simple HR flashcards into high-fidelity, complex Situational Judgment Items (SJIs).

### STRICT STANDARDS (NO EXCEPTIONS):
1. **Model Lock**: Target ONLY SHRM 2026 BASK complexity.
2. **Standard Treatment**: EVERY card, regardless of perceived simplicity, must be treated as a complex Situational Judgment Item (SJI).
3. **Scenario Engineering**: Create a dense, realistic workplace conflict (150-250 characters). The scenario must force the test-taker to choose the "most effective" or "next best" action based on behavioral competencies.
4. **Distractor Complexity**: All four distractors must be plausible, professionally phrased, and of similar length. They must represent "common but incorrect" HR actions.
5. **Strategic Rationale**: Explain why the correct answer is the MOST effective according to SHRM principles.
6. **Behavioral Bridge Tags**: Every card must include one 'BASK Knowledge Item' and one 'Behavioral Competency' (e.g., Ethical Practice, Leadership, or Analytical Aptitude).

### JSON OUTPUT FORMAT:
{
  "results": [
    {
      "id": "original_card_id",
      "rationales": "Detailed explanation of the correct choice...",
      "tag_bask": "Specific BASK Topic",
      "tag_behavior": "Leadership / Ethical Practice / etc.",
      "simple_distractors": ["Wrong 1", "Wrong 2", "Wrong 3"],
      "intelligent_data": {
        "scenario": "The complex workplace conflict description...",
        "question": "The specific task or choice for the HR Professional...",
        "correct_answer": "The most effective action...",
        "distractors": ["Effective but secondary...", "Common mistake...", "Polite but wrong..."]
      }
    }
  ]
}
`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mode, cards } = req.body;

  if (mode === 'generate-distractors') {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Locked to Gemini
      
      const userPrompt = `Audit these ${cards.length} cards. Provide high-fidelity SJIs and simple recall distractors for each. Include behavioral rationales.\n\n` + 
        cards.map(c => `ID: ${c.id}\nTOPIC: ${c.topic}\nTERM: ${c.question}\nANSWER: ${c.answer}`).join('\n\n');

      const result = await model.generateContent([SYSTEM_PROMPT, userPrompt]);
      const response = await result.response;
      let text = response.text();

      // Structural Sanitization: Ensure valid JSON
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const parsed = JSON.parse(text);
      return res.status(200).json(parsed);

    } catch (error) {
      console.error("Gemini Auditor Error:", error);
      if (error.message?.includes('429')) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      return res.status(500).json({ error: 'AI Generation Failed' });
    }
  }

  res.status(400).json({ error: 'Invalid mode' });
};
