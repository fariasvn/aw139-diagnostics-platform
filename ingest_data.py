"""
Etapa C (corrigida): Ingestão robusta XML/PDF -> embeddings.json
Melhorias:
- extração XML robusta (text + tail + atributos)
- logs claros e listagem de arquivos que falham
- retries para chamadas de embeddings
- checkpoint + escrita segura
"""

import os
import json
import time
import gc
import requests
import xml.etree.ElementTree as ET
from tqdm import tqdm
import pymupdf as fitz  # type: ignore  # PyMuPDF - use pymupdf directly
from typing import Optional

# CONFIG
CHECKPOINT_FILE = "ingestion_checkpoint.json"
EMBEDDINGS_FILE = "embeddings.json"
EXTRACT_DIR = os.getenv("XML_DATA_PATH", "xml_data")  # allow override via env
PDF_DIR = os.getenv("PDF_DATA_PATH", "pdf_data")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "50"))
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
RETRY_COUNT = 3
RETRY_DELAY = 2  # seconds

# -------------------------
# Utilities: checkpoint
# -------------------------
def load_checkpoint():
    if not os.path.exists(CHECKPOINT_FILE):
        return {"processed_files": 0, "total_files": 0, "errors": 0, "timestamp": time.time()}
    try:
        with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        print("⚠️ Checkpoint file corrupted. Starting from zero.")
        return {"processed_files": 0, "total_files": 0, "errors": 0, "timestamp": time.time()}

def save_checkpoint(data):
    data["timestamp"] = time.time()
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# -------------------------
# Safe append embeddings
# -------------------------
def append_embeddings(embeddings_list):
    """Append embeddings atomically; return True on success."""
    if not embeddings_list:
        return True
    temp_file = EMBEDDINGS_FILE + ".tmp"
    try:
        # If file missing, initialize with empty list
        if not os.path.exists(EMBEDDINGS_FILE):
            with open(EMBEDDINGS_FILE, "w", encoding="utf-8") as f:
                json.dump([], f)

        # read existing
        try:
            with open(EMBEDDINGS_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                existing = json.loads(content) if content else []
        except Exception as e:
            print(f"   ⚠️ Could not read existing embeddings.json ({e}), backing up and starting fresh.")
            # backup corrupted file
            try:
                if os.path.exists(EMBEDDINGS_FILE):
                    os.rename(EMBEDDINGS_FILE, EMBEDDINGS_FILE + ".bak")
            except:
                pass
            existing = []

        existing.extend(embeddings_list)
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2)
        # verify
        with open(temp_file, "r", encoding="utf-8") as f:
            _ = json.load(f)
        os.replace(temp_file, EMBEDDINGS_FILE)
        return True
    except Exception as e:
        print(f"❌ Error appending embeddings: {e}")
        try:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        except:
            pass
        return False

# -------------------------
# List files
# -------------------------
def list_xml_files():
    files = []
    # Allow product placeholder or direct folder; previous code used a placeholder that broke discovery
    full_path = EXTRACT_DIR
    if not os.path.exists(full_path):
        print(f"❌ XML data folder not found: {full_path}")
        return []
    for root, dirs, filenames in os.walk(full_path):
        for f in filenames:
            if f.lower().endswith(".xml"):
                files.append(os.path.join(root, f))
    return sorted(files)

def list_pdf_files():
    files = []
    if os.path.exists(PDF_DIR):
        for root, _, filenames in os.walk(PDF_DIR):
            for f in filenames:
                if f.lower().endswith(".pdf"):
                    files.append(os.path.join(root, f))
    return sorted(files)

# -------------------------
# Extract text: XML & PDF
# -------------------------
def extract_text_from_xml(xml_path: str) -> Optional[str]:
    try:
        parser = ET.XMLParser(encoding="utf-8")
        tree = ET.parse(xml_path, parser=parser)
        root = tree.getroot()
        parts = []
        for elem in root.iter():
            if elem.text and elem.text.strip():
                parts.append(elem.text.strip())
            # include tail if present
            tail = getattr(elem, 'tail', None)
            if tail and tail.strip():
                parts.append(tail.strip())
            # include attributes values (helpful for metadata)
            if elem.attrib:
                for k, v in elem.attrib.items():
                    if v and isinstance(v, str):
                        parts.append(v.strip())
        text = " ".join(parts)
        if not text or len(text) < 20:
            # fallback: use filename
            text = f"[FALLBACK] {os.path.basename(xml_path)}"
        # trim but keep enough context
        return text[:4000]
    except Exception as e:
        print(f"   ⚠️ Failed parsing XML {xml_path}: {e}")
        return None

def extract_text_from_pdf(pdf_path: str) -> Optional[str]:
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
        return text[:4000]
    except Exception as e:
        print(f"   ⚠️ Failed extracting PDF {pdf_path}: {e}")
        return None

# -------------------------
# Get embedding (with retries)
# -------------------------
def get_embedding_for_text(text: str):
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
            print(f"     ⚠️ Embedding API error (attempt {attempt}): {e}")
            if attempt < RETRY_COUNT:
                time.sleep(RETRY_DELAY * attempt)
            else:
                return None

# -------------------------
# Process a single file
# -------------------------
def process_document(path: str):
    try:
        if path.lower().endswith(".pdf"):
            text = extract_text_from_pdf(path)
        else:
            text = extract_text_from_xml(path)
        if not text:
            return {"path": path, "error": "no_text"}
        embedding = get_embedding_for_text(text)
        if not embedding:
            return {"path": path, "error": "embedding_failed"}
        return {"doc_path": path, "embedding": embedding, "text": text}
    except Exception as e:
        return {"path": path, "error": f"exception:{e}"}

# -------------------------
# Run pipeline
# -------------------------
def run_ingestion():
    checkpoint = load_checkpoint()
    processed = checkpoint.get("processed_files", 0)
    errors = checkpoint.get("errors", 0)

    xml_files = list_xml_files()
    pdf_files = list_pdf_files()
    all_files = xml_files + pdf_files
    total_docs = len(all_files)
    if total_docs == 0:
        print("❌ No XML/PDF files found. Check your XML_DATA_PATH / pdf_data folder.")
        return

    checkpoint["total_files"] = total_docs
    print(f"Found {len(xml_files)} XML and {len(pdf_files)} PDF -> total {total_docs}")
    print(f"Resuming from processed={processed} errors={errors}")

    saved_so_far = processed
    batch = []
    failed_files = []

    start_time = time.time()
    for idx, path in enumerate(all_files):
        if idx < processed:
            continue
        print(f"\nProcessing [{idx+1}/{total_docs}] {path}")
        result = process_document(path)
        if result is None:
            errors += 1
            failed_files.append((path, "no_result"))
            continue
        if "error" in result:
            errors += 1
            failed_files.append((path, result["error"]))
            print(f"   ✖ {path} -> {result['error']}")
            continue
        batch.append(result)

        # flush batch
        if len(batch) >= BATCH_SIZE or idx == total_docs - 1:
            print(f"   Saving batch of {len(batch)} embeddings...")
            if append_embeddings(batch):
                saved_so_far += len(batch)
                checkpoint["processed_files"] = saved_so_far
                checkpoint["errors"] = errors
                checkpoint["total_files"] = total_docs
                save_checkpoint(checkpoint)
                elapsed = time.time() - start_time
                print(f"   ✓ Saved. progress {saved_so_far}/{total_docs} ({saved_so_far/total_docs*100:.2f}%)")
                batch = []
                gc.collect()
            else:
                print("   ❌ Failed to save batch to disk. Stopping ingestion.")
                break

    checkpoint["processed_files"] = saved_so_far
    checkpoint["errors"] = errors
    save_checkpoint(checkpoint)

    print("\nIngest finished.")
    print(f"Processed: {saved_so_far}/{total_docs}  Errors: {errors}")
    if failed_files:
        print("Failed files (sample):")
        for p, e in failed_files[:10]:
            print(f" - {p} -> {e}")
    print(f"Embeddings saved to: {EMBEDDINGS_FILE}")

if __name__ == "__main__":
    run_ingestion()
