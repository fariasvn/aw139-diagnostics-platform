import type { InsertDiagnosticQuery } from "@shared/schema";

const CREWAI_URL = process.env.CREWAI_URL || "http://127.0.0.1:9000";
const CREWAI_DIAGNOSE_ENDPOINT = `${CREWAI_URL}/diagnose`;
const REQUEST_TIMEOUT = 90000;

interface DiagnosticResponse {
  diagnosisSummary: string;
  certaintyScore: number;
  certaintyStatus: "SAFE_TO_PROCEED" | "REQUIRE_EXPERT";
  references: Array<{
    docId: string;
    section: string;
    title: string;
  }>;
  ataSystem: {
    ataCode: string;
    ataName: string;
    description: string;
  };
  recommendedTests: Array<{
    step: number;
    description: string;
    tool?: string;
    expectedResult: string;
  }>;
  likelyCauses: Array<{
    cause: string;
    probability: number;
    reasoning: string;
    ataCode?: string;
  }>;
  affectedParts: Array<{
    partNumber: string;
    description: string;
    location: string;
    status: "INSPECT" | "REPLACE" | "TEST";
  }>;
  ataOccurrenceBrowser: {
    recurrence30d: string;
    recurrence60d: string;
    recurrence90d: string;
    commonSolutions: string[];
    historicalCases: Array<{
      aircraftSerial: string;
      date: string;
      resolution: string;
    }>;
    trendGraphUrl: string;
    mttr: string;
    mtbf: string;
  };
  smartStock: {
    highFailureParts: Array<{
      partNumber: string;
      failureRate: number;
      recommendation: string;
    }>;
    recommendedMinimumStock: Array<{
      partNumber: string;
      quantity: number;
      reason: string;
    }>;
    stockAlerts: string[];
    fleetUsageRate: string;
  };
  historicalMatches: Array<{
    queryId: string;
    timestamp: string;
    similarity: number;
    aircraftSerial: string;
    resolution: string;
  }>;
  dmcToolSelection?: {
    connectorType: string;
    pinType: string;
    crimpTool: string;
    insertTool?: string;
    extractTool?: string;
    crimpForce?: string;
    safetyWarnings?: string;
    status: "exact_match" | "partial_match";
  };
  predictiveInsights: {
    likelyNextIssue: string;
    estimatedTimeToFailure: string;
    preventiveMaintenance: string[];
  };
  expertSupport: {
    recommended: boolean;
    reason: string;
    specializations: string[];
  };
}

const ATA_NAMES: Record<string, string> = {
  "21": "Air Conditioning",
  "22": "Auto Flight",
  "23": "Communications",
  "24": "Electrical Power",
  "25": "Equipment/Furnishings",
  "26": "Fire Protection",
  "27": "Flight Controls",
  "28": "Fuel",
  "29": "Hydraulic Power",
  "30": "Ice and Rain Protection",
  "31": "Indicating/Recording Systems",
  "32": "Landing Gear",
  "33": "Lights",
  "34": "Navigation",
  "35": "Oxygen",
  "36": "Pneumatic",
  "45": "Central Maintenance System",
  "49": "Airborne Auxiliary Power",
  "51": "Standard Practices - Structures",
  "52": "Doors",
  "53": "Fuselage",
  "55": "Stabilizers",
  "56": "Windows",
  "57": "Wings",
  "62": "Rotor",
  "63": "Rotor Drive",
  "64": "Tail Rotor",
  "65": "Tail Rotor Drive",
  "67": "Rotors Flight Control",
  "71": "Powerplant",
  "72": "Turbine/Turboprop Engine",
  "73": "Engine Fuel and Control",
  "74": "Ignition",
  "75": "Air",
  "76": "Engine Controls",
  "77": "Engine Indicating",
  "78": "Exhaust",
  "79": "Oil",
  "80": "Starting",
  "83": "Accessory Gearboxes",
  "91": "Charts",
  "92": "Electrical System Installation",
};

async function callCrewAI(
  query: string, 
  serialNumber: string, 
  ataCode: string = "", 
  taskType: string = "fault_isolation",
  aircraftConfiguration: string = "",
  configurationName: string = ""
): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    console.log(`[diagnostic-engine] Calling CrewAI at ${CREWAI_DIAGNOSE_ENDPOINT}`);
    console.log(`[diagnostic-engine] Query: ${query.substring(0, 100)}...`);
    console.log(`[diagnostic-engine] S/N: ${serialNumber}`);
    console.log(`[diagnostic-engine] ATA/Training: ${ataCode || "Auto-detect"}`);
    console.log(`[diagnostic-engine] Task Type: ${taskType}`);
    console.log(`[diagnostic-engine] Configuration: ${aircraftConfiguration || "Unknown"} (${configurationName || "N/A"})`);

    const response = await fetch(CREWAI_DIAGNOSE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        query, 
        serial_number: serialNumber, 
        ata_code: ataCode, 
        task_type: taskType,
        aircraft_configuration: aircraftConfiguration,
        configuration_name: configurationName
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CrewAI returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[diagnostic-engine] CrewAI response received`);
    console.log(`[diagnostic-engine] Certainty: ${data.certainty_score}% - ${data.certainty_status}`);
    console.log(`[diagnostic-engine] Parts: ${data.affected_parts?.length || 0}`);
    console.log(`[diagnostic-engine] References: ${data.references?.length || 0}`);
    console.log(`[diagnostic-engine] ATA: ${data.ata_chapter || "N/A"}`);

    return data;
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("CrewAI request timed out after 90 seconds");
    }
    throw error;
  }
}

function parseReferencesFromDiagnosis(diagnosis: string): Array<{ docId: string; section: string; title: string }> {
  const refs: Array<{ docId: string; section: string; title: string }> = [];
  
  const patterns = [
    /(?:AMM|IETP|AMP|FIM|CMM|SRM|IPC)\s*[-–]?\s*(\d{2}[-–]\d{2}[-–]\d{2,4})/gi,
    /(?:Section|Ref|Doc)\s*:?\s*([A-Z0-9]+-[A-Z0-9-]+)/gi,
    /IETP-AW139-([A-Z0-9-]+)/gi,
    /AMP-([A-Z0-9-]+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(diagnosis)) !== null) {
      refs.push({
        docId: match[0].trim(),
        section: match[1] || "General",
        title: `AW139 Technical Reference ${match[0].trim()}`,
      });
    }
  }

  return refs;
}

function estimateCertaintyFromRAG(crewResponse: any): number {
  const refCount = crewResponse.references?.length || 0;
  const hasATA = !!crewResponse.ata_reference;
  const diagnosisLength = (crewResponse.diagnosis || "").length;

  let score = 50;
  score += Math.min(refCount * 8, 30);
  if (hasATA) score += 10;
  if (diagnosisLength > 500) score += 5;
  if (diagnosisLength > 1000) score += 5;
  
  const diagLower = (crewResponse.diagnosis || "").toLowerCase();
  if (diagLower.includes("amm") || diagLower.includes("ietp") || diagLower.includes("amp")) {
    score += 5;
  }
  if (diagLower.includes("procedure") || diagLower.includes("step")) {
    score += 3;
  }
  
  return Math.min(score, 100);
}

export async function analyzeDiagnosticQuery(
  query: InsertDiagnosticQuery & { 
    taskType?: string; 
    aircraftConfiguration?: string | null;
    configurationName?: string | null;
  }
): Promise<DiagnosticResponse> {
  const inputAtaCode = query.ata || "";
  const taskType = query.taskType || "fault_isolation";
  const configInfo = query.aircraftConfiguration 
    ? ` [Config: ${query.aircraftConfiguration}${query.configurationName ? ` - ${query.configurationName}` : ""}]`
    : "";
  const fullQuery = `AW139 (S/N: ${query.serialNumber})${configInfo} - ATA ${inputAtaCode}: ${query.problemDescription}`;
  
  try {
    const crewResponse = await callCrewAI(
      fullQuery, 
      query.serialNumber, 
      inputAtaCode, 
      taskType,
      query.aircraftConfiguration || "",
      query.configurationName || ""
    );
    
    const ataChapter = crewResponse.ata_chapter || "";
    const resolvedAtaCode = ataChapter.replace("ATA ", "").split("-")[0] || query.ata;
    const ataName = ATA_NAMES[resolvedAtaCode] || `ATA ${resolvedAtaCode} System`;
    
    const references = (crewResponse.references || []).map((ref: any, idx: number) => {
      if (typeof ref === "string") {
        return { docId: `REF-${idx + 1}`, section: ref, title: ref };
      }
      return {
        docId: ref.docId || ref.doc_id || `REF-${idx + 1}`,
        section: ref.section || "General",
        title: ref.title || ref.docId || `Reference ${idx + 1}`,
      };
    });
    
    const certaintyScore = crewResponse.certainty_score || 0;
    const certaintyStatus = crewResponse.certainty_status === "SAFE_TO_PROCEED" 
      ? "SAFE_TO_PROCEED" 
      : "REQUIRE_EXPERT";

    const diagnosis = crewResponse.diagnosis || "Diagnosis not available";

    const affectedParts = (crewResponse.affected_parts || []).map((part: any) => ({
      partNumber: part.part_number || "N/A",
      description: part.description || "Component",
      location: part.location || "See maintenance manual",
      status: (part.action || "INSPECT") as "INSPECT" | "REPLACE" | "TEST",
    }));

    const likelyCauses = (crewResponse.likely_causes || []).map((cause: any) => ({
      cause: cause.cause || "Unknown",
      probability: cause.probability || 0,
      reasoning: cause.reasoning || "Based on symptom analysis",
    }));

    const recommendedTests = (crewResponse.recommended_tests || []).map((test: any) => ({
      step: test.step || 1,
      description: test.description || "Perform inspection",
      tool: test.reference || "",
      expectedResult: test.expected_result || "Verify per specifications",
    }));

    return {
      diagnosisSummary: diagnosis,
      certaintyScore,
      certaintyStatus,
      references,
      ataSystem: {
        ataCode: resolvedAtaCode,
        ataName,
        description: `${ataName} - AW139 System Analysis`,
      },
      recommendedTests: recommendedTests.length > 0 ? recommendedTests : extractTestsFromDiagnosis(diagnosis, resolvedAtaCode),
      likelyCauses: likelyCauses.length > 0 ? likelyCauses : extractCausesFromDiagnosis(diagnosis),
      affectedParts: affectedParts.length > 0 ? affectedParts : extractPartsFromDiagnosis(diagnosis),
      ataOccurrenceBrowser: {
        recurrence30d: "0",
        recurrence60d: "0",
        recurrence90d: "0",
        commonSolutions: [],
        historicalCases: [],
        trendGraphUrl: "",
        mttr: "N/A",
        mtbf: "N/A",
      },
      smartStock: {
        highFailureParts: [],
        recommendedMinimumStock: [],
        stockAlerts: [],
        fleetUsageRate: "N/A",
      },
      historicalMatches: [],
      predictiveInsights: {
        likelyNextIssue: "Monitor system for recurrence",
        estimatedTimeToFailure: "Unknown - requires trend data",
        preventiveMaintenance: ["Follow scheduled maintenance intervals per AMP"],
      },
      expertSupport: {
        recommended: certaintyStatus === "REQUIRE_EXPERT",
        reason: crewResponse.supervisor_notes || (certaintyStatus === "REQUIRE_EXPERT" 
          ? "Certainty below 95% threshold. Expert consultation recommended for safety-critical diagnostics."
          : "High confidence diagnosis based on documentation match"),
        specializations: [`ATA ${resolvedAtaCode}`, ataName],
      },
    };
  } catch (error: any) {
    console.error(`[diagnostic-engine] CrewAI error: ${error.message}`);
    
    return createFallbackResponse(query, error.message);
  }
}

function extractTestsFromDiagnosis(diagnosis: string, ataCode: string): DiagnosticResponse["recommendedTests"] {
  const tests: DiagnosticResponse["recommendedTests"] = [];
  
  const stepPatterns = [
    /(?:step\s*\d+|first|second|third|then|next|finally)[:\s]+([^.]+\.)/gi,
    /(?:\d+\.|•|-)\s*([^.]+(?:test|check|verify|inspect|measure)[^.]*\.)/gi,
  ];
  
  let stepNum = 1;
  for (const pattern of stepPatterns) {
    let match;
    while ((match = pattern.exec(diagnosis)) !== null && stepNum <= 5) {
      tests.push({
        step: stepNum++,
        description: match[1].trim(),
        expectedResult: "Verify per maintenance manual specifications",
      });
    }
  }
  
  if (tests.length === 0) {
    tests.push({
      step: 1,
      description: `Perform visual inspection of ATA ${ataCode} components`,
      expectedResult: "No visible damage or abnormalities",
    });
    tests.push({
      step: 2,
      description: "Verify electrical continuity where applicable",
      expectedResult: "Continuity within specifications",
    });
    tests.push({
      step: 3,
      description: "Consult IETP for specific test procedures",
      expectedResult: "Follow documented procedures",
    });
  }
  
  return tests;
}

function extractCausesFromDiagnosis(diagnosis: string): DiagnosticResponse["likelyCauses"] {
  const causes: DiagnosticResponse["likelyCauses"] = [];
  
  const causeKeywords = [
    { pattern: /fault(?:y|ed)?|defect|failure/gi, cause: "Component Failure" },
    { pattern: /wear|worn|degraded/gi, cause: "Wear and Degradation" },
    { pattern: /connection|connector|wiring/gi, cause: "Electrical Connection Issue" },
    { pattern: /corrosion|corroded/gi, cause: "Corrosion" },
    { pattern: /contamination|contaminated/gi, cause: "Contamination" },
  ];
  
  let probability = 35;
  for (const { pattern, cause } of causeKeywords) {
    if (pattern.test(diagnosis)) {
      causes.push({
        cause,
        probability: Math.min(probability, 40),
        reasoning: "Based on symptom analysis and documentation match",
      });
      probability -= 10;
      if (causes.length >= 3) break;
    }
  }
  
  if (causes.length === 0) {
    causes.push({
      cause: "Further investigation required",
      probability: 30,
      reasoning: "Requires detailed inspection per maintenance manual",
    });
  }
  
  return causes;
}

function extractPartsFromDiagnosis(diagnosis: string): DiagnosticResponse["affectedParts"] {
  const parts: DiagnosticResponse["affectedParts"] = [];
  
  const partPatterns = [
    /(?:P\/N|PN|Part\s*(?:No|Number)?)[:\s]*([A-Z0-9-]+)/gi,
    /\b(3G\d{4}[A-Z0-9-]*)\b/g,
    /\b(\d{6,}-\d{2,})\b/g,
  ];
  
  for (const pattern of partPatterns) {
    let match;
    while ((match = pattern.exec(diagnosis)) !== null && parts.length < 5) {
      parts.push({
        partNumber: match[1],
        description: "Component identified in diagnosis",
        location: "See maintenance manual",
        status: "INSPECT",
      });
    }
  }
  
  return parts;
}

function createFallbackResponse(query: InsertDiagnosticQuery, errorMsg: string): DiagnosticResponse {
  const ataName = ATA_NAMES[query.ata] || `ATA ${query.ata} System`;
  
  return {
    diagnosisSummary: `Unable to retrieve RAG-based diagnosis. Error: ${errorMsg}. Please ensure CrewAI server (port 9000) and RAG API (port 8000) are running.`,
    certaintyScore: 0,
    certaintyStatus: "REQUIRE_EXPERT",
    references: [],
    ataSystem: {
      ataCode: query.ata,
      ataName,
      description: `${ataName} - Fallback Response`,
    },
    recommendedTests: [{
      step: 1,
      description: "Contact system administrator to verify RAG/CrewAI services",
      expectedResult: "Services restored and operational",
    }],
    likelyCauses: [{
      cause: "RAG System Unavailable",
      probability: 100,
      reasoning: errorMsg,
    }],
    affectedParts: [],
    ataOccurrenceBrowser: {
      recurrence30d: "N/A",
      recurrence60d: "N/A",
      recurrence90d: "N/A",
      commonSolutions: [],
      historicalCases: [],
      trendGraphUrl: "",
      mttr: "N/A",
      mtbf: "N/A",
    },
    smartStock: {
      highFailureParts: [],
      recommendedMinimumStock: [],
      stockAlerts: ["RAG system offline - cannot retrieve stock data"],
      fleetUsageRate: "N/A",
    },
    historicalMatches: [],
    predictiveInsights: {
      likelyNextIssue: "N/A",
      estimatedTimeToFailure: "N/A",
      preventiveMaintenance: [],
    },
    expertSupport: {
      recommended: true,
      reason: "RAG system unavailable - expert consultation required",
      specializations: [`ATA ${query.ata}`, ataName],
    },
  };
}
