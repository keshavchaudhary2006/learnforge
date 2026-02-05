import os
import hashlib
from typing import List, Dict, Any, Optional
from pathlib import Path

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.embeddings import Embeddings

from config import (
    CHROMA_PERSIST_DIRECTORY,
    CHROMA_COLLECTION_NAME,
    OPENAI_API_KEY,
    EMBEDDING_MODEL,
    LLM_MODEL
)

# Socratic Prompt Template
SOCRATIC_PROMPT = """You are the Socratic Mentor for "Learnforge", an elite Socratic AI learning platform.
Your guiding philosophy: Genuine learning comes from guided inquiry, critical thinking, and uncovering principles, not from passive spoon-feeding.

PEDAGOGICAL RULES:
1. NEVER reveal the direct final answer or write the complete solution.
2. Even if the student asks for the answer, gently deflect and redirect their attention with a thought experiment or guiding question.
3. Use the provided educational context to frame questions around the specific mechanisms, edge cases, and principles.
4. Structure your response:
   - Step 1: Validate their line of curiosity or identify the hidden assumption in their query.
   - Step 2: Formulate 1-2 sharp, thought-provoking guiding questions that prompt the student to break the problem into smaller parts.
   - Step 3: Provide a small conceptual clue or real-world analogy grounded in the course materials.
   - Step 4: Ask what test, hypothesis, or thought experiment they want to run next.

Educational Context retrieved from Knowledge Base:
---------------------
{context}
---------------------

Student's Question:
{question}

Socratic Guidance:"""

class LocalDeterministicEmbeddings(Embeddings):
    """
    Lightweight, deterministic local embeddings for testing or when no OpenAI API key is configured.
    Generates a consistent 128-dimensional vector using cryptographic hashing.
    """
    def _hash_text(self, text: str) -> List[float]:
        vector = []
        for i in range(128):
            seed = f"{text}_{i}".encode("utf-8")
            val = int(hashlib.sha256(seed).hexdigest(), 16) % 1000000 / 1000000.0
            vector.append(val * 2.0 - 1.0)
        # Normalize
        norm = sum(x * x for x in vector) ** 0.5 or 1.0
        return [x / norm for x in vector]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._hash_text(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._hash_text(text)


def get_embedding_function() -> Embeddings:
    """Returns OpenAI embeddings if API key is present, otherwise returns local fallback."""
    if OPENAI_API_KEY and OPENAI_API_KEY.startswith("sk-") and len(OPENAI_API_KEY) > 20:
        try:
            from langchain_openai import OpenAIEmbeddings
            return OpenAIEmbeddings(
                model=EMBEDDING_MODEL,
                openai_api_key=OPENAI_API_KEY
            )
        except Exception as e:
            print(f"[RAG Service] Notice: Falling back to local embeddings: {e}")
    return LocalDeterministicEmbeddings()


def get_vector_store():
    """Initializes and returns the Chroma vector store instance."""
    try:
        from langchain_chroma import Chroma
    except ImportError:
        try:
            from langchain_community.vectorstores import Chroma
        except ImportError:
            raise RuntimeError(
                "Chroma vector store package is not installed. Please run 'pip install -r requirements.txt'"
            )

    embedding_fn = get_embedding_function()
    
    # Ensure directory exists
    Path(CHROMA_PERSIST_DIRECTORY).mkdir(parents=True, exist_ok=True)
    
    vector_store = Chroma(
        collection_name=CHROMA_COLLECTION_NAME,
        embedding_function=embedding_fn,
        persist_directory=CHROMA_PERSIST_DIRECTORY
    )
    return vector_store


class SocraticRAGPipeline:
    def __init__(self):
        self._vector_store = None
        self._prompt = ChatPromptTemplate.from_template(SOCRATIC_PROMPT)

    @property
    def vector_store(self):
        if self._vector_store is None:
            self._vector_store = get_vector_store()
        return self._vector_store

    def _get_llm(self):
        """Returns ChatOpenAI if API key is present, otherwise returns simulated Socratic tutor."""
        if OPENAI_API_KEY and OPENAI_API_KEY.startswith("sk-") and len(OPENAI_API_KEY) > 20:
            try:
                from langchain_openai import ChatOpenAI
                return ChatOpenAI(
                    model=LLM_MODEL,
                    temperature=0.7,
                    openai_api_key=OPENAI_API_KEY
                )
            except Exception as e:
                print(f"[RAG Service] ChatOpenAI init failed: {e}")
        return None

    def query(self, question: str, k: int = 3) -> Dict[str, Any]:
        """
        Executes Socratic RAG pipeline:
        1. Retrieves relevant documents from ChromaDB.
        2. Formats context.
        3. Generates Socratic guidance question and hints.
        """
        # 1. Retrieve relevant contexts
        docs = []
        try:
            retriever = self.vector_store.as_retriever(search_kwargs={"k": k})
            docs = retriever.invoke(question)
        except Exception as e:
            print(f"[RAG Service] Retrieval error (database may be empty or unindexed): {e}")

        # Format context
        if docs:
            context_text = "\n\n".join(
                [f"[Source {i+1}: {d.metadata.get('source', 'Unknown')} (Page {d.metadata.get('page', 1)})]\n{d.page_content}" 
                 for i, d in enumerate(docs)]
            )
            sources = [
                {
                    "source": Path(d.metadata.get("source", "doc")).name,
                    "page": d.metadata.get("page", 1),
                    "snippet": d.page_content[:200] + "..." if len(d.page_content) > 200 else d.page_content
                }
                for d in docs
            ]
        else:
            context_text = "No direct course materials matched. Fall back to foundational reasoning principles."
            sources = []

        # 2. Invoke LLM or Fallback Socratic generator
        llm = self._get_llm()
        if llm:
            chain = self._prompt | llm | StrOutputParser()
            response_text = chain.invoke({
                "context": context_text,
                "question": question
            })
        else:
            # Pedagogical fallback generator when running in demo/offline mode
            response_text = self._generate_simulated_socratic_response(question, docs)

        return {
            "socratic_response": response_text,
            "sources": sources,
            "context_retrieved_count": len(docs)
        }

    def _generate_simulated_socratic_response(self, question: str, docs: list) -> str:
        """
        High quality fallback Socratic responses demonstrating inquiry-based learning
        when an OpenAI key is not configured.
        """
        q_lower = question.lower()
        if "sort" in q_lower or "binary search" in q_lower:
            return (
                "That's a vital question in algorithmic efficiency! Let's think through this together.\n\n"
                "• Imagine you have a physical telephone directory where the names were shuffled completely at random. "
                "If you opened to the exact middle page and saw 'Miller', what could you deduce about whether 'Adams' is in the left half or the right half?\n\n"
                "• What mathematical guarantee does an ordered sequence give you when you compare a target against the middle element?\n\n"
                "What would happen to your ability to discard half the remaining entries if that guarantee did not exist?"
            )
        elif "recursion" in q_lower or "stack" in q_lower or "base case" in q_lower:
            return (
                "A wonderful exploration into the structure of computation!\n\n"
                "• Consider a set of Russian nesting dolls. If every doll contained another doll with no solid wooden doll at the center, when would you ever finish opening them?\n\n"
                "• In code, what role does the 'base case' play in preventing the computer's call stack from growing forever?\n\n"
                "If you were tracing your function step-by-step on paper, how would the computer know when to begin returning values back up the stack?"
            )
        else:
            top_snippet = docs[0].page_content if docs else "the core principles of the topic"
            return (
                f"That's an insightful question about this problem! Rather than looking at the solution, let's step back to first principles.\n\n"
                f"• Looking at the concept: consider that \"{top_snippet[:120]}...\".\n\n"
                "• If you had to break your question down into the smallest possible sub-problem or an extreme edge case (e.g., input size of 0 or 1), what would the expected behavior be?\n\n"
                "What hypothesis do you have right now about what happens under those simple conditions?"
            )

# Global singleton instance
rag_pipeline = SocraticRAGPipeline()
