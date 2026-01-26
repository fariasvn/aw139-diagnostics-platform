#!/usr/bin/env python3
"""
Dropbox PDF Sync Script
Downloads PDF files from Dropbox /pdf_data folder to local ./pdf_data
Uses Replit's Dropbox connector for secure authentication.
"""
import os
import sys
import requests
import dropbox
from dropbox.exceptions import ApiError, AuthError
from pathlib import Path
from datetime import datetime

LOCAL_PDF_DIR = "./pdf_data"
DROPBOX_PDF_FOLDER = "/pdf_data"

connection_settings = None

def log(message: str, level: str = "INFO"):
    """Log with timestamp and level."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}")

def get_access_token() -> str:
    """
    Get Dropbox access token from Replit's connector API.
    Based on the Replit Dropbox integration blueprint.
    """
    global connection_settings
    
    if (connection_settings and 
        connection_settings.get("settings", {}).get("expires_at") and
        datetime.fromisoformat(connection_settings["settings"]["expires_at"].replace("Z", "+00:00")) > datetime.now()):
        return connection_settings["settings"]["access_token"]
    
    hostname = os.environ.get("REPLIT_CONNECTORS_HOSTNAME")
    repl_identity = os.environ.get("REPL_IDENTITY")
    web_repl_renewal = os.environ.get("WEB_REPL_RENEWAL")
    
    if repl_identity:
        x_replit_token = f"repl {repl_identity}"
    elif web_repl_renewal:
        x_replit_token = f"depl {web_repl_renewal}"
    else:
        raise RuntimeError("X_REPLIT_TOKEN not found for repl/depl")
    
    if not hostname:
        raise RuntimeError("REPLIT_CONNECTORS_HOSTNAME not found")
    
    log("Fetching Dropbox access token from Replit connector...")
    
    response = requests.get(
        f"https://{hostname}/api/v2/connection?include_secrets=true&connector_names=dropbox",
        headers={
            "Accept": "application/json",
            "X_REPLIT_TOKEN": x_replit_token
        }
    )
    response.raise_for_status()
    data = response.json()
    
    connection_settings = data.get("items", [{}])[0] if data.get("items") else None
    
    if not connection_settings:
        raise RuntimeError("Dropbox not connected. Please set up the Dropbox integration.")
    
    access_token = (
        connection_settings.get("settings", {}).get("access_token") or
        connection_settings.get("settings", {}).get("oauth", {}).get("credentials", {}).get("access_token")
    )
    
    if not access_token:
        raise RuntimeError("Dropbox access token not found in connection settings")
    
    return access_token

def get_dropbox_client() -> dropbox.Dropbox:
    """Get a fresh Dropbox client (tokens may expire)."""
    access_token = get_access_token()
    return dropbox.Dropbox(access_token)

def list_pdf_files(dbx: dropbox.Dropbox, folder_path: str) -> list:
    """List all PDF files in the specified Dropbox folder."""
    pdf_files = []
    
    try:
        log(f"Listing files in Dropbox folder: {folder_path}")
        result = dbx.files_list_folder(folder_path)
        
        while True:
            for entry in result.entries:
                if isinstance(entry, dropbox.files.FileMetadata):
                    if entry.name.lower().endswith(".pdf"):
                        pdf_files.append(entry)
                        log(f"  Found PDF: {entry.name} ({entry.size:,} bytes)")
            
            if not result.has_more:
                break
            result = dbx.files_list_folder_continue(result.cursor)
        
        log(f"Total PDF files found: {len(pdf_files)}")
        return pdf_files
        
    except ApiError as e:
        if e.error.is_path() and e.error.get_path().is_not_found():
            log(f"Folder not found: {folder_path}", "ERROR")
            raise FileNotFoundError(f"Dropbox folder '{folder_path}' does not exist")
        raise

def download_pdf(dbx: dropbox.Dropbox, dropbox_path: str, local_path: str) -> bool:
    """Download a single PDF file from Dropbox."""
    try:
        metadata, response = dbx.files_download(dropbox_path)
        
        with open(local_path, "wb") as f:
            f.write(response.content)
        
        log(f"  Downloaded: {os.path.basename(local_path)} ({metadata.size:,} bytes)")
        return True
        
    except ApiError as e:
        log(f"  Failed to download {dropbox_path}: {e}", "ERROR")
        return False

def run_rag_pipeline():
    """Optionally run the RAG/embeddings pipeline if configured."""
    log("Checking for RAG/embeddings pipeline...")
    
    ingest_script = Path("ingest_data.py")
    if ingest_script.exists():
        log("Found ingest_data.py - you can run it to process PDFs:")
        log("  python ingest_data.py")
        return True
    
    log("No RAG pipeline script found. PDFs are ready in ./pdf_data for manual processing.")
    return False

def main():
    """Main function to sync PDFs from Dropbox."""
    print("=" * 60)
    print("DROPBOX PDF SYNC")
    print("=" * 60)
    
    downloaded_files = []
    failed_files = []
    
    try:
        log("Step 1: Connecting to Dropbox...")
        dbx = get_dropbox_client()
        
        account = dbx.users_get_current_account()
        log(f"Connected as: {account.name.display_name} ({account.email})")
        
        log("Step 2: Creating local folder...")
        local_dir = Path(LOCAL_PDF_DIR)
        local_dir.mkdir(parents=True, exist_ok=True)
        log(f"Local folder ready: {local_dir.absolute()}")
        
        log("Step 3: Listing PDF files in Dropbox...")
        pdf_files = list_pdf_files(dbx, DROPBOX_PDF_FOLDER)
        
        if not pdf_files:
            log("No PDF files found in Dropbox folder.", "WARNING")
            return
        
        log(f"Step 4: Downloading {len(pdf_files)} PDF files...")
        for pdf_file in pdf_files:
            dropbox_path = pdf_file.path_display
            local_path = local_dir / pdf_file.name
            
            if download_pdf(dbx, dropbox_path, str(local_path)):
                downloaded_files.append({
                    "name": pdf_file.name,
                    "dropbox_path": dropbox_path,
                    "local_path": str(local_path.absolute()),
                    "size": pdf_file.size
                })
            else:
                failed_files.append(pdf_file.name)
        
        log("Step 5: Checking RAG pipeline...")
        run_rag_pipeline()
        
        print("\n" + "=" * 60)
        print("DOWNLOAD SUMMARY")
        print("=" * 60)
        print(f"Total PDFs found:      {len(pdf_files)}")
        print(f"Successfully downloaded: {len(downloaded_files)}")
        print(f"Failed:                  {len(failed_files)}")
        print()
        
        if downloaded_files:
            print("Downloaded files:")
            for f in downloaded_files:
                print(f"  - {f['name']}")
                print(f"    Local: {f['local_path']}")
                print(f"    Size:  {f['size']:,} bytes")
        
        if failed_files:
            print("\nFailed files:")
            for name in failed_files:
                print(f"  - {name}")
        
        print("\n" + "=" * 60)
        if len(downloaded_files) == len(pdf_files):
            print("SUCCESS: All PDF files downloaded successfully!")
        else:
            print(f"PARTIAL SUCCESS: {len(downloaded_files)}/{len(pdf_files)} files downloaded")
        print("=" * 60)
        
        return downloaded_files
        
    except AuthError:
        log("Authentication failed. Please reconnect your Dropbox account.", "ERROR")
        sys.exit(1)
    except FileNotFoundError as e:
        log(str(e), "ERROR")
        sys.exit(1)
    except Exception as e:
        log(f"Unexpected error: {e}", "ERROR")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
