# AW139 RAG Pipeline Setup Guide

## Status: Download Blocked by Google Drive

The direct download link is being intercepted by Google Drive's security layer, which returns an HTML page instead of the binary ZIP file. This is a known limitation of automated downloads from Google Drive.

## Solution: Manual Download Method

### Step 1: Download the Dataset Manually

1. **Copy this URL into your browser:**
   ```
   https://drive.google.com/uc?export=download&id=1zgFgRktfcSSZl0hs6EoWCosOFYsoMrH5
   ```

2. **Google will prompt you with one of these:**
   - A direct download link - click it
   - A "Download anyway" button - click it
   - A confirmation page - click "Download"

3. **Save the file** as `manual_data.zip` to your Replit workspace

4. **Verify the download** - the file should be ~4.14 GB in size

### Step 2: Extract the Dataset

Once you have `manual_data.zip` in your workspace, run:

```bash
python -c "
import zipfile
import shutil
import os

ZIP_FILE = 'manual_data.zip'
DESTINATION = 'AW139_XML_DATA'

print('Extracting ZIP file...')
with zipfile.ZipFile(ZIP_FILE, 'r') as zip_ref:
    root_dir = zip_ref.namelist()[0].split('/')[0]
    zip_ref.extractall('./')

if root_dir != DESTINATION and os.path.exists(root_dir):
    shutil.move(root_dir, DESTINATION)

# Count files
xml_count = sum(len([f for f in files if f.endswith('.xml')]) 
                for _, _, files in os.walk(DESTINATION))
print(f'✓ Extracted {xml_count} XML documents to {DESTINATION}/')
print(f'✓ You can now delete {ZIP_FILE}')
"
```

### Step 3: Run Full RAG Pipeline

Once the dataset is extracted, run these commands sequentially:

```bash
# Etapa C: Ingest and vectorize (30+ minutes)
python ingest_data.py

# Etapa D: Test the RAG system
python main.py
```

## Files Status

| File | Status | Description |
|------|--------|-------------|
| `download_data.py` | ⚠️ Limited | Works if ZIP is manually placed; auto-download blocked by Google Drive |
| `ingest_data.py` | ✅ Ready | Processes XML → embeddings with progress tracking |
| `main.py` | ✅ Ready | Tests RAG with semantic search and GPT-4 responses |
| `embeddings.json` | 📦 Generated | Will be created after ingestion (large file) |

## Expected Output

After successful setup:
- **22,321 XML documents** indexed
- **embeddings.json** file (~2-4 GB) containing vector data
- **Query engine** operational for diagnostic searches

## Troubleshooting

### "File is not a zip file"
- Manual download returned HTML page
- Solution: Download using browser (see Step 1)

### "No XML files found"
- ZIP extraction failed
- Check that `AW139_XML_DATA/` folder exists and has subdirectories
- Use the extraction command above

### Ingestion takes too long
- Normal! Processing 22,321 documents takes 30-90 minutes
- OpenAI API calls are sequential; this cannot be parallelized
- Leave the terminal running

## System Requirements

- **Storage:** ~15 GB (4GB ZIP + 11GB extracted data)
- **Time:** 
  - Download: 30-60 minutes (network dependent)
  - Extraction: 10-15 minutes
  - Ingestion: 30-90 minutes
  - Testing: 2-5 minutes
- **Network:** Stable connection for OpenAI API calls

## Next Steps

1. Download `manual_data.zip` manually
2. Extract using the provided Python command
3. Run `python ingest_data.py`
4. Run `python main.py` for final verification
5. Integration with main diagnostic system will follow

---

**Questions?** All scripts include detailed progress logging and error messages.
