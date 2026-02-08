import os
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from config import CHROMA_COLLECTION_NAME, CHROMA_PERSIST_DIRECTORY
from rag_service import rag_pipeline
from ingest import ingest_documents

load_dotenv()

app = FastAPI(
    title="Learnforge AI Service",
    description="Socratic RAG pipeline using LangChain and ChromaDB vector store",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Data Models ---

class ChatRequest(BaseModel):
    question: str = Field(
        ...,
        description="The student's question or problem statement",
        example="Why does binary search require the array to be sorted?"
    )
    topic: Optional[str] = Field(
        None,
        description="Optional subject area or topic tag",
        example="Algorithms"
    )
    chat_history: Optional[List[Dict[str, str]]] = Field(
        default=[],
        description="Optional prior dialogue turns for conversational context"
    )

class SourceContext(BaseModel):
    source: str
    page: int
    snippet: str

class ChatResponse(BaseModel):
    question: str
    socratic_response: str
    sources: List[SourceContext]
    topic: Optional[str] = None

class IngestResponse(BaseModel):
    status: str
    message: str
    chunks_indexed: int

# Legacy format compatibility model
class SocraticQueryRequest(BaseModel):
    student_query: str
    topic: Optional[str] = None
    context: Optional[str] = None

class SocraticQueryResponse(BaseModel):
    guidance_question: str
    hints: List[str]
    concept_summary: Optional[str] = None


# --- Endpoints ---

@app.get("/")
def read_root():
    return {
        "service": "Learnforge AI Service (Socratic RAG)",
        "status": "online",
        "chroma_collection": CHROMA_COLLECTION_NAME,
        "endpoints": {
            "chat": "POST /chat",
            "ingest": "POST /ingest",
            "health": "GET /health",
            "docs": "GET /docs"
        }
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "vector_store_path": CHROMA_PERSIST_DIRECTORY,
        "collection": CHROMA_COLLECTION_NAME
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main Socratic AI endpoint:
    1. Retrieves relevant course materials from ChromaDB using semantic search.
    2. Constructs a Socratic prompt preventing direct answers.
    3. Returns guiding questions and cognitive scaffolding for the student.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        result = rag_pipeline.query(question=request.question, k=3)
        return ChatResponse(
            question=request.question,
            socratic_response=result["socratic_response"],
            sources=[SourceContext(**s) for s in result["sources"]],
            topic=request.topic
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error executing Socratic RAG pipeline: {str(e)}"
        )

@app.post("/ingest", response_model=IngestResponse)
async def trigger_ingest(background_tasks: BackgroundTasks):
    """
    Triggers ingestion of PDF documents from the docs/ directory into ChromaDB.
    """
    try:
        count = ingest_documents(force_generate_dummy=True)
        return IngestResponse(
            status="success",
            message=f"Ingested educational documents into ChromaDB collection '{CHROMA_COLLECTION_NAME}'.",
            chunks_indexed=count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

# Backwards compatibility endpoint for the Node gateway & frontend
@app.post("/api/socratic/dialogue", response_model=SocraticQueryResponse)
async def socratic_dialogue(req: SocraticQueryRequest):
    result = rag_pipeline.query(question=req.student_query, k=3)
    return SocraticQueryResponse(
        guidance_question=result["socratic_response"],
        hints=[
            "Reflect on the necessary preconditions before jumping to edge cases.",
            "Consider what invariance is maintained at each step."
        ],
        concept_summary=f"Exploring: {req.topic or 'Fundamental Concept'}"
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
