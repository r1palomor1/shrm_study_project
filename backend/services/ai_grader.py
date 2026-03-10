import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Initialize the Gemini GenAI client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

async def grade_answer_semantic(question: str, actual_answer: str, user_answer: str):
    """
    Sends the user's answer to Gemini to semantically evaluate against the actual answer.
    """
    prompt = f"""
    You are an expert SHRM certification grader. 
    You are evaluating a student's flashcard response based on its conceptual accuracy and meaning, NOT its exact spelling or wording.
    
    Question: "{question}"
    Actual Correct Answer: "{actual_answer}"
    Student's Answer: "{user_answer}"
    
    Evaluate the Student's Answer against the Actual Correct Answer.
    Score them strictly based on meaning and comprehension. 
    
    Return your response exactly in this JSON format:
    {{
        "percentage": 0-100, // An integer estimating how conceptually close they were.
        "grade": "green"|"yellow"|"red", // green (>=85%), yellow(60-84%), red (<60%)
        "feedback": "One short sentence explaining why they missed points, or congratulating them."
    }}
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        # Parse the JSON response
        import json
        result = json.loads(response.text)
        return result
    except Exception as e:
        print(f"Gemini API Error: {e}")
        # Fallback to a basic structure if API fails
        return {
            "percentage": 0,
            "grade": "red",
            "feedback": "Error connecting to AI Grader. Please check API key."
        }
