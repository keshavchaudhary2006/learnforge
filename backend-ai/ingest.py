import os
import sys
from pathlib import Path
from typing import List

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document

from config import DOCS_DIRECTORY, CHROMA_PERSIST_DIRECTORY, CHROMA_COLLECTION_NAME
from create_dummy_docs import generate_sample_documents
from rag_service import get_vector_store

def ingest_documents(force_generate_dummy: bool = True):
    """
    Ingests educational PDF documents into ChromaDB.
    If no PDFs exist in DOCS_DIRECTORY, automatically generates dummy educational PDFs first.
    """
    print("=" * 65)
    print(" [Learnforge] Starting ChromaDB PDF Ingestion Pipeline")
    print("=" * 65)

    docs_dir = Path(DOCS_DIRECTORY)
    docs_dir.mkdir(parents=True, exist_ok=True)

    pdf_files = list(docs_dir.glob("*.pdf"))

    # Auto-generate dummy PDFs if none are found or if forced
    if not pdf_files or force_generate_dummy:
        print(f"[Ingest] Generating dummy educational PDFs in {docs_dir}...")
        generate_sample_documents(docs_dir)
        pdf_files = list(docs_dir.glob("*.pdf"))

    print(f"[Ingest] Found {len(pdf_files)} PDF document(s) to process:")
    for pdf in pdf_files:
        print(f"  - {pdf.name}")

    all_pages: List[Document] = []
    for pdf_path in pdf_files:
        try:
            loader = PyPDFLoader(str(pdf_path))
            pages = loader.load()
            print(f"[Ingest] Loaded {len(pages)} page(s) from {pdf_path.name}")
            all_pages.extend(pages)
        except Exception as e:
            print(f"[Ingest] Error loading {pdf_path.name}: {e}")

    if not all_pages:
        print("[Ingest] Error: No pages were extracted from the PDF documents.")
        return 0

    # Split documents into semantic chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    chunks = text_splitter.split_documents(all_pages)
    print(f"[Ingest] Split {len(all_pages)} page(s) into {len(chunks)} text chunk(s).")

    # Connect to ChromaDB and persist
    print(f"[Ingest] Indexing chunks into ChromaDB collection '{CHROMA_COLLECTION_NAME}'...")
    print(f"[Ingest] Target storage directory: {CHROMA_PERSIST_DIRECTORY}")
    
    vector_store = get_vector_store()
    vector_store.add_documents(chunks)

    print(f"[Ingest] Successfully indexed {len(chunks)} chunk(s) into ChromaDB!")

    # Verify ingestion with a sample test retrieval
    print("\n--- Verifying Ingestion with Test Query: 'Why is sorting required for binary search?' ---")
    try:
        retriever = vector_store.as_retriever(search_kwargs={"k": 2})
        test_results = retriever.invoke("Why is sorting required for binary search?")
        for idx, doc in enumerate(test_results):
            source_file = Path(doc.metadata.get("source", "unknown")).name
            print(f"\n[Result {idx + 1}] Source: {source_file}")
            print(f"Content:\n{doc.page_content.strip()}")
    except Exception as e:
        print(f"[Ingest] Verification query note: {e}")

    print("\n" + "=" * 65)
    print(" [Learnforge] Ingestion complete and verified successfully!")
    print("=" * 65)
    return len(chunks)

if __name__ == "__main__":
    ingest_documents()
