#!/usr/bin/env python3
"""
PDF-Only Ingestion Script
Processes only PDF files from ./pdf_data and adds to embeddings.json
"""
import os
import json
import time
import requests
import pymupdf as fitz
from tqdm import tqdm
from typing import Optional

EMBEDDINGS_FILE = "embeddings.json"
PDF_DIR = os.getenv("PDF_DATA_PATH", "pdf_data")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
RETRY_COUNT = 3
RETRY_DELAY = 2

def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def list_pdf_files():
    files = []
    if os.path.exists(PDF_DIR):
        for root, _, filenames in os.walk(PDF_DIR):
            for f in filenames:
                if f.lower().endswith(".pdf"):
                    files.append(os.path.join(root, f))
    return sorted(files)

def extract_text_from_pdf(pdf_path: str) -> Optional[str]:
    """Extract text from PDF, chunking by pages."""
    try:
        doc = fitz.open(pdf_path)
        parts = []
        for page in doc:
            txt = page.get_text("text")
            if txt:
                parts.append(txt.strip())
        doc.close()
        text = " ".join(parts)
        if not text or len(text) < 20:
            text = f"[FALLBACK] {os.path.basename(pdf_path)}"
        return text[:8000]
    except Exception as e:
        log(f"  Failed extracting {pdf_path}: {e}")
        return None

def get_embedding(text: str):
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not set")
    for attempt in range(1, RETRY_COUNT + 1):
        try:
            resp = requests.post(
                "https://api.openai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                json={"input": text, "model": EMBEDDING_MODEL},
                timeout=30
            )
            resp.raise_for_status()
            return resp.json()["data"][0]["embedding"]
        except Exception as e:
            log(f"  Embedding error (attempt {attempt}): {e}")
            if attempt < RETRY_COUNT:
                time.sleep(RETRY_DELAY * attempt)
    return None

def load_existing_embeddings():
    if os.path.exists(EMBEDDINGS_FILE):
        try:
            with open(EMBEDDINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass
    return []

def save_embeddings(data):
    with open(EMBEDDINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f)
    log(f"Saved {len(data)} total embeddings to {EMBEDDINGS_FILE}")

def get_existing_paths(embeddings):
    return set(e.get("doc_path", "") for e in embeddings)

def main():
    print("=" * 60)
    print("PDF-ONLY INGESTION")
    print("=" * 60)
    
    pdf_files = list_pdf_files()
    log(f"Found {len(pdf_files)} PDF files in {PDF_DIR}")
    
    if not pdf_files:
        log("No PDF files found. Exiting.")
        return
    
    for f in pdf_files:
        log(f"  - {os.path.basename(f)}")
    
    existing = load_existing_embeddings()
    existing_paths = get_existing_paths(existing)
    log(f"Existing embeddings: {len(existing)}")
    
    new_pdfs = [f for f in pdf_files if f not in existing_paths]
    log(f"New PDFs to process: {len(new_pdfs)}")
    
    if not new_pdfs:
        log("All PDFs already processed. Nothing to do.")
        return
    
    new_embeddings = []
    errors = 0
    
    for pdf_path in tqdm(new_pdfs, desc="Processing PDFs"):
        log(f"Processing: {os.path.basename(pdf_path)}")
        
        text = extract_text_from_pdf(pdf_path)
        if not text:
            errors += 1
            continue
        
        log(f"  Extracted {len(text)} chars, getting embedding...")
        embedding = get_embedding(text)
        
        if embedding:
            new_embeddings.append({
                "doc_path": pdf_path,
                "embedding": embedding,
                "text": text
            })
            log(f"  OK - embedding generated")
        else:
            errors += 1
            log(f"  FAILED - no embedding")
    
    if new_embeddings:
        all_embeddings = existing + new_embeddings
        save_embeddings(all_embeddings)
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"PDFs found:     {len(pdf_files)}")
    print(f"Already done:   {len(pdf_files) - len(new_pdfs)}")
    print(f"Newly processed: {len(new_embeddings)}")
    print(f"Errors:         {errors}")
    print(f"Total embeddings: {len(existing) + len(new_embeddings)}")
    print("=" * 60)

if __name__ == "__main__":
    main()
