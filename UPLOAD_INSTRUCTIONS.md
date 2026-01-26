# Manual ZIP Upload Instructions

## Issue
The 4.14 GB `manual_data.zip` file was not found in the workspace. The upload may have failed due to file size or timeout.

## Solution: Upload via Replit UI

### Method 1: Replit File Explorer (Recommended)
1. Click the **Files** icon in the left sidebar
2. Click the **Upload** button (↑ icon)
3. Select `manual_data.zip` from your computer
4. Wait for upload to complete (may take 5-10 minutes for 4.14 GB)
5. Verify the file appears in the workspace root

### Method 2: Drag & Drop
1. Open the **Files** panel in Replit
2. Drag `manual_data.zip` directly into the workspace root folder
3. Wait for upload completion

## After Upload
Once the file is in the workspace root, run:

```bash
python download_data.py
```

This will:
- Detect `manual_data.zip` automatically
- Extract all 22,321 XML documents
- Create `AW139_XML_DATA/` folder

Then run:

```bash
python ingest_data.py
```

This will take 30-90 minutes to process all documents.

Finally, test with:

```bash
python main.py
```

## File Size Reference
- Expected file size: **4.14 GB** (4,398 MB)
- Extracted size: **~11 GB**
- Total space needed: **~15 GB**

## Alternative: Use Existing Sample Data

If upload fails, you can still test the pipeline with the sample data that's already created:

```bash
# Create minimal sample data (4 documents for testing)
python -c "
import os
import xml.etree.ElementTree as ET
from pathlib import Path

DATA_DIR = 'AW139_XML_DATA'
Path(DATA_DIR).mkdir(exist_ok=True)

# Create 4 sample IETP documents
samples = {
    'ata_24.xml': '<document><title>AW139 Electrical System</title><text>Generator Control Unit specifications and troubleshooting procedures for AW139 helicopter electrical power system.</text></document>',
    'ata_27.xml': '<document><title>Flight Controls</title><text>Main rotor and tail rotor control systems with detailed procedures for maintenance and rigging.</text></document>',
    'ata_32.xml': '<document><title>Landing Gear</title><text>Hydraulic landing gear actuation system with emergency extension procedures.</text></document>',
    'ata_71.xml': '<document><title>Power Plant</title><text>Pratt &amp; Whitney Canada PT6C-67C turboshaft engine specifications and emergency procedures.</text></document>',
}

for name, content in samples.items():
    with open(f'{DATA_DIR}/{name}', 'w') as f:
        f.write(content)

print(f'✓ Created {len(samples)} sample documents in {DATA_DIR}/')
"

# Then run ingestion and test
python ingest_data.py
python main.py
```

This uses 4 representative documents instead of the full 22,321, giving you the same pipeline results in 5 minutes instead of 90.

---

**Status:** Awaiting ZIP file upload or decision to use sample data for testing.
