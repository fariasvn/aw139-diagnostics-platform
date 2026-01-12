/**
 * Local IETP Connector Client
 * Connects to Windows-based IETP desktop application via HTTP API
 * Supports Bearer token authentication
 */

interface IETPResponse {
  doc_id: string;
  section: string;
  quote: string;
  elapsed_ms?: number;
}

const IETP_CONNECTOR_URL = process.env.IETP_CONNECTOR_URL || 
  "http://127.0.0.1:5001/local/ietp/search";
const IETP_CONNECTOR_TOKEN = process.env.IETP_CONNECTOR_TOKEN || "";

export async function requestIETPSnippet(
  ata: string,
  query: string,
  timeout: number = 15000
): Promise<IETPResponse | null> {
  const headers: HeadersInit = { 
    "Content-Type": "application/json" 
  };

  if (IETP_CONNECTOR_TOKEN) {
    headers["Authorization"] = `Bearer ${IETP_CONNECTOR_TOKEN}`;
  }

  const t0 = Date.now();

  try {
    const response = await fetch(IETP_CONNECTOR_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ ata, query }),
      signal: AbortSignal.timeout(timeout)
    });

    if (!response.ok) {
      console.error(`IETP Connector HTTP error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const elapsed = Date.now() - t0;
    data.elapsed_ms = elapsed;
    
    console.info(`IETP search completed in ${elapsed}ms for ATA ${ata}`);
    return data;
  } catch (error) {
    console.error(`IETP Connector error for ATA ${ata}:`, error);
    return null;
  }
}

/**
 * Search IETP for ATA-specific troubleshooting procedures
 */
export async function searchIETPTroubleshooting(
  ata: string,
  problemDescription: string
): Promise<Array<{ docId: string; section: string; content: string }>> {
  const ietp = await requestIETPSnippet(ata, problemDescription);
  
  if (!ietp) {
    return [];
  }

  return [{
    docId: ietp.doc_id,
    section: ietp.section,
    content: ietp.quote
  }];
}
