from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.pdf_parser import parse_pdf_to_markdown
from services.ai_grader import grade_answer_semantic

app = FastAPI(title="SHRM Study App Backend")

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "SHRM Study App Backend is running!"}

@app.post("/api/parse-pdf")
async def extract_markdown_from_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        content = await file.read()
        markdown_result = await parse_pdf_to_markdown(content, file.filename)
        return {"markdown": markdown_result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class GradeRequest(BaseModel):
    question: str
    actual_answer: str
    user_answer: str

@app.post("/api/grade-answer")
async def extract_grade_via_ai(request: GradeRequest):
    try:
        result = await grade_answer_semantic(
            question=request.question,
            actual_answer=request.actual_answer,
            user_answer=request.user_answer
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

