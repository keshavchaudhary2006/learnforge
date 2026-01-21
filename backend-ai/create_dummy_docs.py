import os
from pathlib import Path

def create_pure_python_pdf(file_path: Path, title: str, text_content: list[str]):
    """
    Creates a standard, valid PDF 1.4 document purely in Python without external C libraries.
    Ensures PDF ingestion works out-of-the-box before external packages are installed.
    """
    stream_lines = [
        "BT",
        "/F1 18 Tf",
        "50 750 Td",
        f"({title}) Tj",
        "/F1 11 Tf",
        "0 -25 Td",
        "16 TL"
    ]
    for line in text_content:
        # Escape parenthesis
        escaped_line = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        stream_lines.append(f"({escaped_line}) '")
    stream_lines.append("ET")

    stream_data = "\n".join(stream_lines).encode("latin-1")
    stream_len = len(stream_data)

    objects = []
    # 1: Catalog
    objects.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    # 2: Pages
    objects.append(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    # 3: Page
    objects.append(b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n")
    # 4: Stream Contents
    objects.append(f"4 0 obj\n<< /Length {stream_len} >>\nstream\n".encode("latin-1") + stream_data + b"\nendstream\nendobj\n")
    # 5: Font
    objects.append(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

    # Header
    pdf = bytearray(b"%PDF-1.4\n")
    xref_offsets = [0]

    for obj in objects:
        xref_offsets.append(len(pdf))
        pdf.extend(obj)

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(xref_offsets)}\n".encode("latin-1"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in xref_offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))

    pdf.extend(f"trailer\n<< /Size {len(xref_offsets)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF".encode("latin-1"))

    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(pdf)

def generate_sample_documents(docs_dir: Path):
    docs_dir.mkdir(parents=True, exist_ok=True)

    # Document 1: Binary Search & Algorithmic Complexity
    doc1_path = docs_dir / "binary_search_fundamentals.pdf"
    doc1_content = [
        "Binary Search is a divide-and-conquer search algorithm with logarithmic time complexity O(log n).",
        "Fundamental Precondition: The input array or sequence MUST BE SORTED in order for binary search to work.",
        "How it works: Compare the target value to the middle element of the sorted collection.",
        "If the target matches the middle element, the position is returned immediately.",
        "If the target is smaller than the middle element, search continues in the lower half of the array.",
        "If the target is larger than the middle element, search continues in the upper half of the array.",
        "Why sorting is required: If elements are unsorted, you cannot eliminate half of the remaining elements,",
        "because an element could be anywhere in the unsorted portions.",
        "Common edge cases: Empty arrays, duplicate keys, integer overflow when computing mid = (low + high) / 2,",
        "which should safely be computed as mid = low + (high - low) // 2."
    ]

    # Document 2: Recursion & Call Stacks
    doc2_path = docs_dir / "recursion_and_call_stacks.pdf"
    doc2_content = [
        "Recursion is a programming technique where a function solves a problem by calling itself.",
        "Two Essential Components of Every Recursive Function:",
        "1. Base Case: The terminating condition that produces a result directly without further recursion.",
        "Without a base case, recursion leads to infinite calls causing a Stack Overflow error.",
        "2. Recursive Step: The rule that reduces the original input towards the base case.",
        "Call Stack Mechanics: Each recursive call pushes a new stack frame containing local variables and return address.",
        "Once a base case is hit, stack frames unwind in Last-In-First-Out (LIFO) order.",
        "Common Socratic Pitfalls: Students often forget to return the result of the recursive call,",
        "or fail to make progress toward the base case with each step."
    ]

    # Document 3: Socratic Method & Critical Thinking
    doc3_path = docs_dir / "socratic_pedagogy_principles.pdf"
    doc3_content = [
        "The Socratic Method is a cooperative argumentative dialogue between individuals based on asking and answering questions.",
        "Core Philosophy: Deep understanding arises not from passive memorization of answers, but from guided questioning.",
        "The Role of the Teacher/Tutor: Act as a facilitator rather than an oracle of facts.",
        "Key Principles:",
        "1. Clarification: Ask what the student means by specific terms or concepts.",
        "2. Probing Assumptions: Ask what beliefs or presuppositions underlie their reasoning.",
        "3. Examining Reasons and Evidence: Inquire how the student knows something to be true.",
        "4. Considering Alternate Perspectives: Ask what happens under different conditions or counterexamples.",
        "5. Exploring Consequences: Trace the implications of the student's hypothesis to see if contradictions emerge."
    ]

    create_pure_python_pdf(doc1_path, "Binary Search Fundamentals", doc1_content)
    create_pure_python_pdf(doc2_path, "Recursion and Call Stacks", doc2_content)
    create_pure_python_pdf(doc3_path, "Socratic Pedagogy Principles", doc3_content)

    print(f"[Document Generator] Created 3 sample educational PDFs in: {docs_dir}")
    return [doc1_path, doc2_path, doc3_path]

if __name__ == "__main__":
    from config import DOCS_DIRECTORY
    generate_sample_documents(DOCS_DIRECTORY)
