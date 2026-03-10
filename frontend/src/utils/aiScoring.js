/**
 * Evaluates an answer by calling the backend AI Grader (Gemini API).
 * Expected backend return:
 * {
 *   "percentage": 0-100,
 *   "grade": "green" | "yellow" | "red",
 *   "feedback": "string"
 * }
 */
export async function evaluateAnswerViaAI(question, actual_answer, user_answer) {
    try {
        const response = await fetch('/api/grade-answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: question,
                actual_answer: actual_answer,
                user_answer: user_answer
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Failed to connect to AI Grader:", error);
        // Graceful offline fallback (or simple fail)
        return {
            percentage: 0,
            grade: 'red',
            feedback: 'Failed to connect to the backend AI grader. Ensure the Python server is running.'
        };
    }
}
