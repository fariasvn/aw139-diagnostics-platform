import os
import requests
import logging
import time

IETP_CONNECTOR_URL = os.getenv("IETP_CONNECTOR_URL")
IETP_CONNECTOR_TOKEN = os.getenv("IETP_CONNECTOR_TOKEN", None)

def request_ietp_snippet(ata: str, query: str, timeout=25):
    if not IETP_CONNECTOR_URL:
        raise RuntimeError("IETP_CONNECTOR_URL not configured in .env")

    payload = {"ata": ata, "query": query}
    headers = {"Content-Type": "application/json"}

    if IETP_CONNECTOR_TOKEN:
        headers["Authorization"] = f"Bearer {IETP_CONNECTOR_TOKEN}"

    try:
        t0 = time.time()
        r = requests.post(IETP_CONNECTOR_URL, json=payload, headers=headers, timeout=timeout)
        r.raise_for_status()
        data = r.json()
        data["elapsed_ms"] = int((time.time() - t0) * 1000)
        return data

    except Exception as e:
        logging.exception("IETP connector failed")
        return {
            "error": True,
            "message": str(e),
            "ata": ata,
            "query": query
        }
