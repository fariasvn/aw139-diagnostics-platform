var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index-prod.ts
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express2 from "express";

// server/app.ts
import express from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  DEMO_TENANT_ID: () => DEMO_TENANT_ID,
  aircraftConfigurations: () => aircraftConfigurations,
  ataOccurrences: () => ataOccurrences,
  diagnosticQueries: () => diagnosticQueries,
  dmcTools: () => dmcTools,
  expertBookings: () => expertBookings,
  experts: () => experts,
  fleetUnavailability: () => fleetUnavailability,
  insertDiagnosticQuerySchema: () => insertDiagnosticQuerySchema,
  insertExpertSchema: () => insertExpertSchema,
  insertFleetUnavailabilitySchema: () => insertFleetUnavailabilitySchema,
  insertMaintenanceLogSchema: () => insertMaintenanceLogSchema,
  insertPartReplacementSchema: () => insertPartReplacementSchema,
  insertTroubleshootingSchema: () => insertTroubleshootingSchema,
  insertUserSchema: () => insertUserSchema,
  maintenanceLogs: () => maintenanceLogs,
  partEffectivity: () => partEffectivity,
  partReplacements: () => partReplacements,
  parts: () => parts,
  ragDocuments: () => ragDocuments,
  serialEffectivity: () => serialEffectivity,
  sessions: () => sessions,
  solutionSubmissionSchema: () => solutionSubmissionSchema,
  troubleshootingHistory: () => troubleshootingHistory,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var DEMO_TENANT_ID = "omni-demo";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  planType: text("plan_type").notNull().default("BASIC"),
  dailyRequestCount: integer("daily_request_count").notNull().default(0),
  lastRequestDate: text("last_request_date"),
  disclaimerAcknowledgedAt: timestamp("disclaimer_acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var diagnosticQueries = pgTable("diagnostic_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull().default(DEMO_TENANT_ID),
  userId: varchar("user_id").notNull(),
  aircraftModel: text("aircraft_model").notNull(),
  serialNumber: text("serial_number").notNull(),
  aircraftConfiguration: text("aircraft_configuration"),
  // SN, LN, ENH, PLUS
  configurationSource: text("configuration_source"),
  // IETP reference for traceability
  configurationWarning: text("configuration_warning"),
  // Warning if effectivity incomplete
  ata: text("ata").notNull(),
  taskType: text("task_type").default("fault_isolation"),
  problemDescription: text("problem_description").notNull(),
  diagnosisSummary: text("diagnosis_summary"),
  certaintyScore: integer("certainty_score"),
  certaintyStatus: text("certainty_status"),
  responseData: jsonb("response_data"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var experts = pgTable("experts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull().default(DEMO_TENANT_ID),
  name: text("name").notNull(),
  role: text("role").notNull().default("Specialist"),
  // Role/title
  specialty: text("specialty").notNull(),
  specialties: text("specialties"),
  // ATA codes array as comma-separated string
  background: text("background"),
  // Experience, certifications
  experience: text("experience").notNull(),
  whatsappNumber: text("whatsapp_number"),
  available: integer("available").notNull().default(1),
  // 1 = available, 0 = unavailable
  availability: text("availability").notNull().default("AVAILABLE"),
  // Legacy field
  imageUrl: text("image_url"),
  deletedAt: timestamp("deleted_at"),
  // Soft delete timestamp
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var dmcTools = pgTable("dmc_tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectorType: text("connector_type").notNull(),
  pinType: text("pin_type").notNull(),
  crimpTool: text("crimp_tool").notNull(),
  insertTool: text("insert_tool"),
  extractTool: text("extract_tool"),
  crimpForce: text("crimp_force"),
  safetyWarnings: text("safety_warnings")
});
var ataOccurrences = pgTable("ata_occurrences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ataCode: text("ata_code").notNull(),
  aircraftSerial: text("aircraft_serial").notNull(),
  occurrenceDate: timestamp("occurrence_date").notNull(),
  issueSummary: text("issue_summary").notNull(),
  resolution: text("resolution"),
  daysToResolution: integer("days_to_resolution"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var parts = pgTable("parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partNumber: text("part_number").notNull().unique(),
  description: text("description").notNull(),
  ataCode: text("ata_code").notNull(),
  timesReplaced: integer("times_replaced").notNull().default(0),
  failureRate: integer("failure_rate").notNull().default(0),
  daysToFailure: integer("days_to_failure")
});
var ragDocuments = pgTable("rag_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  docId: text("doc_id").notNull(),
  ataCode: text("ata_code").notNull(),
  section: text("section").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull()
});
var expertBookings = pgTable("expert_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queryId: varchar("query_id").notNull(),
  expertId: varchar("expert_id").notNull(),
  bookingType: text("booking_type").notNull(),
  // 'video_call' | 'chat'
  status: text("status").notNull().default("pending"),
  // 'pending' | 'confirmed' | 'completed'
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var maintenanceLogs = pgTable("maintenance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftSerial: text("aircraft_serial").notNull(),
  userId: varchar("user_id").notNull(),
  ata: text("ata").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  tsn: integer("tsn").notNull(),
  date: timestamp("date").notNull(),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var troubleshootingHistory = pgTable("troubleshooting_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull().default(DEMO_TENANT_ID),
  diagnosticQueryId: varchar("diagnostic_query_id"),
  aircraftSerial: text("aircraft_serial").notNull(),
  userId: varchar("user_id").notNull(),
  ata: text("ata").notNull(),
  problem: text("problem").notNull(),
  issueSignature: text("issue_signature"),
  aiSuggestion: text("ai_suggestion"),
  solution: text("solution"),
  solutionStatus: text("solution_status").default("pending"),
  technicianName: text("technician_name"),
  partOffPn: text("part_off_pn"),
  partOffSn: text("part_off_sn"),
  partOnPn: text("part_on_pn"),
  partOnSn: text("part_on_sn"),
  tsn: integer("tsn"),
  date: timestamp("date").notNull(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var partReplacements = pgTable("part_replacements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  troubleshootingId: varchar("troubleshooting_id").notNull(),
  partOffPn: text("part_off_pn").notNull(),
  partOffSn: text("part_off_sn"),
  partOffDescription: text("part_off_description"),
  partOnPn: text("part_on_pn").notNull(),
  partOnSn: text("part_on_sn"),
  partOnDescription: text("part_on_description"),
  ataCode: text("ata_code"),
  quantity: integer("quantity").default(1),
  replacedAt: timestamp("replaced_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var fleetUnavailability = pgTable("fleet_unavailability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull().default(DEMO_TENANT_ID),
  userId: varchar("user_id").notNull(),
  diagnosticQueryId: varchar("diagnostic_query_id"),
  aircraftSerial: text("aircraft_serial").notNull(),
  aircraftModel: text("aircraft_model").notNull().default("AW139"),
  ataCode: text("ata_code").notNull(),
  problemDescription: text("problem_description").notNull(),
  diagnosisStartedAt: timestamp("diagnosis_started_at").notNull().defaultNow(),
  resolutionCompletedAt: timestamp("resolution_completed_at"),
  downtimeMinutes: integer("downtime_minutes"),
  solution: text("solution"),
  technicianName: text("technician_name"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var aircraftConfigurations = pgTable("aircraft_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  // SN, LN, ENH, PLUS
  name: text("name").notNull(),
  // Short Nose, Long Nose, Enhanced, PLUS
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var serialEffectivity = pgTable("serial_effectivity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serialStart: integer("serial_start").notNull(),
  // Starting serial number
  serialEnd: integer("serial_end").notNull(),
  // Ending serial number (inclusive)
  configurationCode: text("configuration_code").notNull(),
  // SN, LN, ENH, PLUS
  effectivityCode: text("effectivity_code"),
  // IETP effectivity code reference
  sourceDocument: text("source_document"),
  // Source document reference (IETP, etc.)
  sourceRevision: text("source_revision"),
  // Document revision
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var partEffectivity = pgTable("part_effectivity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partNumber: text("part_number").notNull(),
  configurationCode: text("configuration_code").notNull(),
  // SN, LN, ENH, PLUS or ALL
  ataCode: text("ata_code"),
  effectivityCode: text("effectivity_code"),
  // IETP effectivity reference
  sourceDocument: text("source_document"),
  // IPD or IETP reference
  sourceRevision: text("source_revision"),
  isApplicable: integer("is_applicable").notNull().default(1),
  // 1 = applicable, 0 = not applicable
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertDiagnosticQuerySchema = createInsertSchema(diagnosticQueries).omit({
  id: true,
  userId: true,
  createdAt: true,
  diagnosisSummary: true,
  certaintyScore: true,
  certaintyStatus: true,
  responseData: true
});
var insertMaintenanceLogSchema = createInsertSchema(maintenanceLogs).omit({
  id: true,
  userId: true,
  createdAt: true
});
var insertTroubleshootingSchema = createInsertSchema(troubleshootingHistory).omit({
  id: true,
  userId: true,
  createdAt: true
});
var insertPartReplacementSchema = createInsertSchema(partReplacements).omit({
  id: true,
  createdAt: true
});
var insertFleetUnavailabilitySchema = createInsertSchema(fleetUnavailability).omit({
  id: true,
  createdAt: true
});
var insertExpertSchema = createInsertSchema(experts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var solutionSubmissionSchema = z.object({
  solution: z.string().min(1, "Solution is required"),
  technicianName: z.string().optional(),
  replacedParts: z.array(z.object({
    partOffPn: z.string().min(1, "Part OFF P/N required"),
    partOffSn: z.string().optional(),
    partOffDescription: z.string().optional(),
    partOnPn: z.string().min(1, "Part ON P/N required"),
    partOnSn: z.string().optional(),
    partOnDescription: z.string().optional(),
    ataCode: z.string().optional(),
    quantity: z.number().default(1)
  })).optional().default([])
});

// db/index.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
process.on("uncaughtException", (err) => {
  if (err.message?.includes("terminating connection") || err.message?.includes("57P01") || err.message?.includes("administrator command")) {
    console.error("[database] Connection terminated by server, will reconnect on next query:", err.message);
  } else {
    console.error("[fatal] Uncaught exception:", err);
    process.exit(1);
  }
});
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });
var dbConnected = false;
var dbError = null;
pool.on("error", (err) => {
  dbConnected = false;
  dbError = err.message;
  console.error("[database] Pool error (will attempt reconnect):", err.message);
});
pool.connect().then(() => {
  dbConnected = true;
  dbError = null;
  console.log("[database] Connected to PostgreSQL");
}).catch((err) => {
  dbConnected = false;
  dbError = err.message;
  console.error("[database] Connection failed:", err.message);
});
function getDatabaseStatus() {
  return {
    connected: dbConnected,
    error: dbError
  };
}

// server/storage.ts
import { eq } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
};
var storage = new DatabaseStorage();

// server/diagnostic-engine.ts
var CREWAI_URL = process.env.CREWAI_URL || "http://127.0.0.1:9000";
var CREWAI_DIAGNOSE_ENDPOINT = `${CREWAI_URL}/diagnose`;
var REQUEST_TIMEOUT = 9e4;
var ATA_NAMES = {
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
  "92": "Electrical System Installation"
};
async function callCrewAI(query, serialNumber, ataCode = "", taskType = "fault_isolation", aircraftConfiguration = "", configurationName = "") {
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
      signal: controller.signal
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
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("CrewAI request timed out after 90 seconds");
    }
    throw error;
  }
}
async function analyzeDiagnosticQuery(query) {
  const inputAtaCode = query.ata || "";
  const taskType = query.taskType || "fault_isolation";
  const configInfo = query.aircraftConfiguration ? ` [Config: ${query.aircraftConfiguration}${query.configurationName ? ` - ${query.configurationName}` : ""}]` : "";
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
    const references = (crewResponse.references || []).map((ref, idx) => {
      if (typeof ref === "string") {
        return { docId: `REF-${idx + 1}`, section: ref, title: ref };
      }
      return {
        docId: ref.docId || ref.doc_id || `REF-${idx + 1}`,
        section: ref.section || "General",
        title: ref.title || ref.docId || `Reference ${idx + 1}`
      };
    });
    const certaintyScore = crewResponse.certainty_score || 0;
    const certaintyStatus = crewResponse.certainty_status === "SAFE_TO_PROCEED" ? "SAFE_TO_PROCEED" : "REQUIRE_EXPERT";
    const diagnosis = crewResponse.diagnosis || "Diagnosis not available";
    const affectedParts = (crewResponse.affected_parts || []).map((part) => ({
      partNumber: part.part_number || "N/A",
      description: part.description || "Component",
      location: part.location || "See maintenance manual",
      status: part.action || "INSPECT"
    }));
    const likelyCauses = (crewResponse.likely_causes || []).map((cause) => ({
      cause: cause.cause || "Unknown",
      probability: cause.probability || 0,
      reasoning: cause.reasoning || "Based on symptom analysis"
    }));
    const recommendedTests = (crewResponse.recommended_tests || []).map((test) => ({
      step: test.step || 1,
      description: test.description || "Perform inspection",
      tool: test.reference || "",
      expectedResult: test.expected_result || "Verify per specifications"
    }));
    return {
      diagnosisSummary: diagnosis,
      certaintyScore,
      certaintyStatus,
      references,
      ataSystem: {
        ataCode: resolvedAtaCode,
        ataName,
        description: `${ataName} - AW139 System Analysis`
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
        mtbf: "N/A"
      },
      smartStock: {
        highFailureParts: [],
        recommendedMinimumStock: [],
        stockAlerts: [],
        fleetUsageRate: "N/A"
      },
      historicalMatches: [],
      predictiveInsights: {
        likelyNextIssue: "Monitor system for recurrence",
        estimatedTimeToFailure: "Unknown - requires trend data",
        preventiveMaintenance: ["Follow scheduled maintenance intervals per AMP"]
      },
      expertSupport: {
        recommended: certaintyStatus === "REQUIRE_EXPERT",
        reason: crewResponse.supervisor_notes || (certaintyStatus === "REQUIRE_EXPERT" ? "Certainty below 95% threshold. Expert consultation recommended for safety-critical diagnostics." : "High confidence diagnosis based on documentation match"),
        specializations: [`ATA ${resolvedAtaCode}`, ataName]
      }
    };
  } catch (error) {
    console.error(`[diagnostic-engine] CrewAI error: ${error.message}`);
    return createFallbackResponse(query, error.message);
  }
}
function extractTestsFromDiagnosis(diagnosis, ataCode) {
  const tests = [];
  const stepPatterns = [
    /(?:step\s*\d+|first|second|third|then|next|finally)[:\s]+([^.]+\.)/gi,
    /(?:\d+\.|•|-)\s*([^.]+(?:test|check|verify|inspect|measure)[^.]*\.)/gi
  ];
  let stepNum = 1;
  for (const pattern of stepPatterns) {
    let match;
    while ((match = pattern.exec(diagnosis)) !== null && stepNum <= 5) {
      tests.push({
        step: stepNum++,
        description: match[1].trim(),
        expectedResult: "Verify per maintenance manual specifications"
      });
    }
  }
  if (tests.length === 0) {
    tests.push({
      step: 1,
      description: `Perform visual inspection of ATA ${ataCode} components`,
      expectedResult: "No visible damage or abnormalities"
    });
    tests.push({
      step: 2,
      description: "Verify electrical continuity where applicable",
      expectedResult: "Continuity within specifications"
    });
    tests.push({
      step: 3,
      description: "Consult IETP for specific test procedures",
      expectedResult: "Follow documented procedures"
    });
  }
  return tests;
}
function extractCausesFromDiagnosis(diagnosis) {
  const causes = [];
  const causeKeywords = [
    { pattern: /fault(?:y|ed)?|defect|failure/gi, cause: "Component Failure" },
    { pattern: /wear|worn|degraded/gi, cause: "Wear and Degradation" },
    { pattern: /connection|connector|wiring/gi, cause: "Electrical Connection Issue" },
    { pattern: /corrosion|corroded/gi, cause: "Corrosion" },
    { pattern: /contamination|contaminated/gi, cause: "Contamination" }
  ];
  let probability = 35;
  for (const { pattern, cause } of causeKeywords) {
    if (pattern.test(diagnosis)) {
      causes.push({
        cause,
        probability: Math.min(probability, 40),
        reasoning: "Based on symptom analysis and documentation match"
      });
      probability -= 10;
      if (causes.length >= 3) break;
    }
  }
  if (causes.length === 0) {
    causes.push({
      cause: "Further investigation required",
      probability: 30,
      reasoning: "Requires detailed inspection per maintenance manual"
    });
  }
  return causes;
}
function extractPartsFromDiagnosis(diagnosis) {
  const parts2 = [];
  const partPatterns = [
    /(?:P\/N|PN|Part\s*(?:No|Number)?)[:\s]*([A-Z0-9-]+)/gi,
    /\b(3G\d{4}[A-Z0-9-]*)\b/g,
    /\b(\d{6,}-\d{2,})\b/g
  ];
  for (const pattern of partPatterns) {
    let match;
    while ((match = pattern.exec(diagnosis)) !== null && parts2.length < 5) {
      parts2.push({
        partNumber: match[1],
        description: "Component identified in diagnosis",
        location: "See maintenance manual",
        status: "INSPECT"
      });
    }
  }
  return parts2;
}
function createFallbackResponse(query, errorMsg) {
  const ataName = ATA_NAMES[query.ata] || `ATA ${query.ata} System`;
  return {
    diagnosisSummary: `Unable to retrieve RAG-based diagnosis. Error: ${errorMsg}. Please ensure CrewAI server (port 9000) and RAG API (port 8000) are running.`,
    certaintyScore: 0,
    certaintyStatus: "REQUIRE_EXPERT",
    references: [],
    ataSystem: {
      ataCode: query.ata,
      ataName,
      description: `${ataName} - Fallback Response`
    },
    recommendedTests: [{
      step: 1,
      description: "Contact system administrator to verify RAG/CrewAI services",
      expectedResult: "Services restored and operational"
    }],
    likelyCauses: [{
      cause: "RAG System Unavailable",
      probability: 100,
      reasoning: errorMsg
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
      mtbf: "N/A"
    },
    smartStock: {
      highFailureParts: [],
      recommendedMinimumStock: [],
      stockAlerts: ["RAG system offline - cannot retrieve stock data"],
      fleetUsageRate: "N/A"
    },
    historicalMatches: [],
    predictiveInsights: {
      likelyNextIssue: "N/A",
      estimatedTimeToFailure: "N/A",
      preventiveMaintenance: []
    },
    expertSupport: {
      recommended: true,
      reason: "RAG system unavailable - expert consultation required",
      specializations: [`ATA ${query.ata}`, ataName]
    }
  };
}

// server/ata-analytics.ts
import { eq as eq2, and, gte } from "drizzle-orm";
async function analyzeATASystem(ataCode) {
  const now = /* @__PURE__ */ new Date();
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
  const days60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1e3);
  const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1e3);
  const occurrences30 = await db.select().from(ataOccurrences).where(
    and(
      eq2(ataOccurrences.ataCode, ataCode),
      gte(ataOccurrences.occurrenceDate, days30)
    )
  );
  const occurrences60 = await db.select().from(ataOccurrences).where(
    and(
      eq2(ataOccurrences.ataCode, ataCode),
      gte(ataOccurrences.occurrenceDate, days60)
    )
  );
  const occurrences90 = await db.select().from(ataOccurrences).where(
    and(
      eq2(ataOccurrences.ataCode, ataCode),
      gte(ataOccurrences.occurrenceDate, days90)
    )
  );
  const mttrValues = occurrences90.filter((o) => o.daysToResolution !== null).map((o) => o.daysToResolution || 0);
  const mttr = mttrValues.length > 0 ? `${(mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length).toFixed(1)}-${Math.max(...mttrValues).toFixed(0)} hours` : "Unknown";
  const recentCount = occurrences30.length;
  const oldCount = occurrences90.length - recentCount;
  const failureRate = recentCount / 30 * 100;
  const trend = recentCount > oldCount / 2 ? "increasing" : "stable";
  const relatedParts = await db.select().from(parts).where(eq2(parts.ataCode, ataCode));
  const mostReplacedParts = relatedParts.sort((a, b) => (b.timesReplaced || 0) - (a.timesReplaced || 0)).slice(0, 5).map((p) => ({ partNumber: p.partNumber, count: p.timesReplaced || 0 }));
  const estimatedHoursBetweenFailures = occurrences90.length > 0 ? `${Math.round(90 * 24 / occurrences90.length)}-${Math.round(120 * 24 / occurrences90.length)} flight hours` : "800-1200 flight hours";
  return {
    ataCode,
    recurrence30d: `${recentCount} occurrences`,
    recurrence60d: `${occurrences60.length} occurrences`,
    recurrence90d: `${occurrences90.length} occurrences`,
    mttr,
    mtbf: estimatedHoursBetweenFailures,
    mostReplacedParts,
    failureRate,
    trend
  };
}

// server/smart-stock.ts
import { eq as eq3 } from "drizzle-orm";
async function analyzeSmartStock(ataCode) {
  const relevantParts = await db.select().from(parts).where(eq3(parts.ataCode, ataCode));
  const highFailureParts = relevantParts.filter((p) => (p.failureRate || 0) > 15).sort((a, b) => (b.failureRate || 0) - (a.failureRate || 0)).slice(0, 3).map((p) => ({
    partNumber: p.partNumber,
    failureRate: p.failureRate || 0,
    recommendation: `${p.failureRate}% failure rate - Monitor stock level closely`
  }));
  const recommendedMinimumStock = relevantParts.filter((p) => (p.timesReplaced || 0) > 2).sort((a, b) => (b.timesReplaced || 0) - (a.timesReplaced || 0)).slice(0, 5).map((p) => {
    const quarterlyUsage = Math.ceil((p.timesReplaced || 0) / 4);
    const recommendedQty = Math.max(3, quarterlyUsage * 2);
    return {
      partNumber: p.partNumber,
      quantity: recommendedQty,
      reason: `Based on ${p.timesReplaced} replacements in 90 days`
    };
  });
  const stockAlerts = [];
  if (highFailureParts.length > 0) {
    stockAlerts.push(`\u26A0\uFE0F High-failure parts detected: ${highFailureParts.map((p) => p.partNumber).join(", ")}`);
  }
  if (relevantParts.filter((p) => (p.failureRate || 0) > 20).length > 0) {
    stockAlerts.push("\u{1F534} Critical: Parts with >20% failure rate detected");
  }
  return {
    highFailureParts,
    recommendedMinimumStock,
    stockAlerts,
    fleetUsageRate: "Fleet-wide average utilization"
  };
}

// server/routes.ts
import { eq as eq5, desc, sql as sql2, and as and3 } from "drizzle-orm";

// server/replitAuth.ts
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import memorystore from "memorystore";
var authEnabled = true;
var authError = null;
function isAuthEnabled() {
  return authEnabled;
}
function getAuthError() {
  return authError;
}
var getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1e3 }
);
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    console.warn("[AUTH] WARNING: SESSION_SECRET not set. Using insecure default for development.");
  }
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const pgStore = connectPg(session);
      const sessionStore = new pgStore({
        conString: dbUrl,
        createTableIfMissing: true,
        ttl: sessionTtl,
        tableName: "sessions"
      });
      return session({
        secret: sessionSecret || "insecure-dev-secret-change-in-production",
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: sessionTtl
        }
      });
    } catch (error) {
      console.warn("[AUTH] Failed to create PostgreSQL session store:", error.message);
      console.warn("[AUTH] Falling back to memory session store");
    }
  }
  const MemoryStore = memorystore(session);
  return session({
    secret: sessionSecret || "insecure-dev-secret-change-in-production",
    store: new MemoryStore({
      checkPeriod: 864e5
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl
    }
  });
}
function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}
async function upsertUser(claims) {
  try {
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"]
    });
  } catch (error) {
    console.error("[AUTH] Failed to upsert user:", error.message);
  }
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.use(passport.initialize());
  app2.use(passport.session());
  const replId = process.env.REPL_ID;
  if (!replId) {
    console.warn("[AUTH] WARNING: REPL_ID not set. Replit authentication disabled.");
    console.warn("[AUTH] Server will continue without authentication.");
    authEnabled = false;
    authError = "REPL_ID not configured";
    return;
  }
  try {
    const config = await getOidcConfig();
    const verify = async (tokens, verified) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };
    const registeredStrategies = /* @__PURE__ */ new Set();
    const ensureStrategy = (domain) => {
      const strategyName = `replitauth:${domain}`;
      if (!registeredStrategies.has(strategyName)) {
        const strategy = new Strategy(
          {
            name: strategyName,
            config,
            scope: "openid email profile offline_access",
            callbackURL: `https://${domain}/api/callback`
          },
          verify
        );
        passport.use(strategy);
        registeredStrategies.add(strategyName);
      }
    };
    passport.serializeUser((user, cb) => cb(null, user));
    passport.deserializeUser((user, cb) => cb(null, user));
    app2.get("/api/login", (req, res, next) => {
      ensureStrategy(req.hostname);
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"]
      })(req, res, next);
    });
    app2.get("/api/callback", (req, res, next) => {
      ensureStrategy(req.hostname);
      passport.authenticate(`replitauth:${req.hostname}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login"
      })(req, res, next);
    });
    app2.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: replId,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`
          }).href
        );
      });
    });
    console.log("[AUTH] Replit authentication configured successfully");
  } catch (error) {
    console.error("[AUTH] Failed to configure authentication:", error.message);
    console.warn("[AUTH] Server will continue without authentication.");
    authEnabled = false;
    authError = error.message;
  }
}
var isAuthenticated = async (req, res, next) => {
  if (!authEnabled) {
    req.user = {
      claims: {
        sub: "anonymous-user",
        email: "anonymous@localhost",
        first_name: "Anonymous",
        last_name: "User"
      },
      expires_at: Math.floor(Date.now() / 1e3) + 86400
    };
    return next();
  }
  const user = req.user;
  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const now = Math.floor(Date.now() / 1e3);
  if (now <= user.expires_at) {
    return next();
  }
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// server/configuration-resolver.ts
import { eq as eq4, and as and2, lte, gte as gte2 } from "drizzle-orm";
var CONFIGURATION_NAMES = {
  SN: "Short Nose",
  LN: "Long Nose",
  ENH: "Enhanced",
  PLUS: "PLUS"
};
async function resolveConfiguration(serialNumber) {
  const numericSerial = parseInt(serialNumber.replace(/\D/g, ""), 10);
  if (isNaN(numericSerial)) {
    return {
      serialNumber,
      configuration: null,
      configurationName: null,
      effectivityCode: null,
      source: null,
      sourceRevision: null,
      warning: "Invalid serial number format. Unable to resolve aircraft configuration.",
      isResolved: false
    };
  }
  try {
    const effectivityMatch = await db.select().from(serialEffectivity).where(
      and2(
        lte(serialEffectivity.serialStart, numericSerial),
        gte2(serialEffectivity.serialEnd, numericSerial)
      )
    ).limit(1);
    if (effectivityMatch.length === 0) {
      return {
        serialNumber,
        configuration: null,
        configurationName: null,
        effectivityCode: null,
        source: null,
        sourceRevision: null,
        warning: `Serial number ${serialNumber} not found in effectivity database. Configuration-aware filtering disabled. Part applicability cannot be verified.`,
        isResolved: false
      };
    }
    const match = effectivityMatch[0];
    const configCode = match.configurationCode;
    return {
      serialNumber,
      configuration: configCode,
      configurationName: CONFIGURATION_NAMES[configCode] || configCode,
      effectivityCode: match.effectivityCode,
      source: match.sourceDocument,
      sourceRevision: match.sourceRevision,
      warning: null,
      isResolved: true
    };
  } catch (error) {
    console.error("Error resolving configuration:", error);
    return {
      serialNumber,
      configuration: null,
      configurationName: null,
      effectivityCode: null,
      source: null,
      sourceRevision: null,
      warning: "Database error while resolving aircraft configuration. Contact system administrator.",
      isResolved: false
    };
  }
}
async function getAllConfigurations() {
  return db.select().from(aircraftConfigurations);
}
async function getSerialEffectivityRanges() {
  return db.select().from(serialEffectivity);
}

// server/routes.ts
async function registerRoutes(app2) {
  app2.get("/api/health", async (_req, res) => {
    const dbStatus = getDatabaseStatus();
    const authStatus = isAuthEnabled();
    const health = {
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      services: {
        database: {
          connected: dbStatus.connected,
          available: dbStatus.available,
          error: dbStatus.error
        },
        authentication: {
          enabled: authStatus,
          error: getAuthError()
        },
        rag_api: {
          url: "http://127.0.0.1:8000",
          status: "spawned"
        },
        crew_server: {
          url: "http://127.0.0.1:9000",
          status: "spawned"
        }
      }
    };
    res.status(200).json(health);
  });
  app2.get("/api/status", async (_req, res) => {
    const dbStatus = getDatabaseStatus();
    res.json({
      version: "2.0.0",
      node_env: process.env.NODE_ENV,
      database_url_set: !!process.env.DATABASE_URL,
      session_secret_set: !!process.env.SESSION_SECRET,
      openai_key_set: !!process.env.OPENAI_API_KEY,
      repl_id_set: !!process.env.REPL_ID,
      database: dbStatus,
      auth_enabled: isAuthEnabled()
    });
  });
  await setupAuth(app2);
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.get("/api/disclaimer/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq5(users.id, userId)).limit(1);
      res.json({
        acknowledged: !!user?.disclaimerAcknowledgedAt,
        acknowledgedAt: user?.disclaimerAcknowledgedAt || null
      });
    } catch (error) {
      console.error("Error checking disclaimer status:", error);
      res.status(500).json({ message: "Failed to check disclaimer status" });
    }
  });
  app2.post("/api/disclaimer/acknowledge", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const [updated] = await db.update(users).set({ disclaimerAcknowledgedAt: /* @__PURE__ */ new Date() }).where(eq5(users.id, userId)).returning();
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        success: true,
        acknowledgedAt: updated.disclaimerAcknowledgedAt
      });
    } catch (error) {
      console.error("Error acknowledging disclaimer:", error);
      res.status(500).json({ message: "Failed to acknowledge disclaimer" });
    }
  });
  app2.get("/api/configuration/resolve/:serialNumber", isAuthenticated, async (req, res) => {
    try {
      const { serialNumber } = req.params;
      const resolution = await resolveConfiguration(serialNumber);
      res.json(resolution);
    } catch (error) {
      console.error("Configuration resolution error:", error);
      res.status(500).json({ error: "Failed to resolve configuration", details: error.message });
    }
  });
  app2.get("/api/configuration/all", isAuthenticated, async (req, res) => {
    try {
      const configurations = await getAllConfigurations();
      res.json(configurations);
    } catch (error) {
      console.error("Error fetching configurations:", error);
      res.status(500).json({ error: "Failed to fetch configurations" });
    }
  });
  app2.get("/api/configuration/effectivity", isAuthenticated, async (req, res) => {
    try {
      const ranges = await getSerialEffectivityRanges();
      res.json(ranges);
    } catch (error) {
      console.error("Error fetching effectivity ranges:", error);
      res.status(500).json({ error: "Failed to fetch effectivity ranges" });
    }
  });
  app2.post("/api/diagnostic", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertDiagnosticQuerySchema.parse(req.body);
      const configResolution = await resolveConfiguration(validatedData.serialNumber);
      const taskType = req.body.taskType || "fault_isolation";
      const stopWords = /* @__PURE__ */ new Set([
        "the",
        "with",
        "that",
        "this",
        "from",
        "have",
        "been",
        "will",
        "would",
        "could",
        "should",
        "which",
        "when",
        "where",
        "what",
        "about",
        "into",
        "there",
        "their",
        "they",
        "them",
        "then",
        "than",
        "also",
        "just",
        "only",
        "some",
        "such",
        "very",
        "after",
        "before",
        "during",
        "while",
        "show",
        "shows",
        "showing",
        "shown",
        "aircraft",
        "helicopter",
        "ground",
        "total",
        "display",
        "displayed",
        "indication"
      ]);
      const keywords = validatedData.problemDescription.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w)).slice(0, 8);
      const allHistory = await db.select().from(troubleshootingHistory).where(eq5(troubleshootingHistory.solutionStatus, "resolved")).orderBy(desc(troubleshootingHistory.resolvedAt)).limit(100);
      const previousSolutions = await Promise.all(
        allHistory.filter((entry) => entry.ata === validatedData.ata).map((entry) => {
          const problemLower = entry.problem.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
          const matchScore = keywords.filter((kw) => problemLower.includes(kw)).length;
          const serialMatch = entry.aircraftSerial === validatedData.serialNumber ? 1 : 0;
          return { ...entry, score: matchScore + serialMatch, keywordMatches: matchScore };
        }).filter((entry) => entry.keywordMatches >= 2).sort((a, b) => b.score - a.score).slice(0, 3).map(async (entry) => {
          const replacements = await db.select().from(partReplacements).where(eq5(partReplacements.troubleshootingId, entry.id));
          return {
            id: entry.id,
            aircraftSerial: entry.aircraftSerial,
            problem: entry.problem,
            solution: entry.solution,
            technicianName: entry.technicianName,
            ata: entry.ata,
            resolvedAt: entry.resolvedAt,
            replacedParts: replacements,
            matchScore: entry.score
          };
        })
      );
      const analysis = await analyzeDiagnosticQuery({
        ...validatedData,
        taskType,
        aircraftConfiguration: configResolution.configuration,
        configurationName: configResolution.configurationName
      });
      const [savedQuery] = await db.insert(diagnosticQueries).values({
        userId,
        aircraftModel: validatedData.aircraftModel,
        serialNumber: validatedData.serialNumber,
        aircraftConfiguration: configResolution.configuration,
        configurationSource: configResolution.source,
        configurationWarning: configResolution.warning,
        ata: validatedData.ata,
        taskType,
        problemDescription: validatedData.problemDescription,
        diagnosisSummary: analysis.diagnosisSummary,
        certaintyScore: analysis.certaintyScore,
        certaintyStatus: analysis.certaintyStatus,
        responseData: analysis
      }).returning();
      const response = {
        aircraft: {
          model: validatedData.aircraftModel,
          serialNumber: validatedData.serialNumber,
          configuration: configResolution.isResolved ? {
            code: configResolution.configuration,
            name: configResolution.configurationName,
            effectivityCode: configResolution.effectivityCode,
            source: configResolution.source,
            sourceRevision: configResolution.sourceRevision
          } : null,
          configurationWarning: configResolution.warning
        },
        query_id: savedQuery.id,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        diagnosis_summary: analysis.diagnosisSummary,
        certainty_score: analysis.certaintyScore,
        certainty_status: analysis.certaintyStatus,
        ata_system: analysis.ataSystem,
        references: analysis.references,
        recommended_tests: analysis.recommendedTests,
        likely_causes: analysis.likelyCauses,
        affected_parts: analysis.affectedParts,
        ata_occurrence_browser: analysis.ataOccurrenceBrowser,
        smart_stock: analysis.smartStock,
        historical_matches: analysis.historicalMatches,
        dmc_tool_selection: analysis.dmcToolSelection,
        predictive_insights: analysis.predictiveInsights,
        expert_support: {
          recommended: analysis.expertSupport.recommended,
          reason: analysis.expertSupport.reason,
          specializations: analysis.expertSupport.specializations,
          booking_options: ["video_call", "chat"]
        },
        suggest_book_expert: analysis.certaintyStatus === "REQUIRE_EXPERT" ? {
          recommended: true,
          reason: "Certainty score below 95% threshold requires expert validation for safety-critical diagnostics."
        } : null,
        previous_solutions: previousSolutions.length > 0 ? {
          found: true,
          count: previousSolutions.length,
          message: `This problem has been solved ${previousSolutions.length} time(s) before. Review previous solutions below.`,
          solutions: previousSolutions
        } : null,
        quota: {
          plan_type: "FREE",
          remaining: 999999
        }
      };
      res.json(response);
    } catch (error) {
      console.error("Diagnostic error:", error);
      res.status(500).json({ error: "Failed to process diagnostic query", details: error.message });
    }
  });
  app2.get("/api/experts", async (req, res) => {
    try {
      const experts2 = await db.select().from(experts);
      res.json(experts2);
    } catch (error) {
      console.error("Error fetching experts:", error);
      res.status(500).json({ error: "Failed to fetch experts" });
    }
  });
  app2.get("/api/dmc-tools", async (req, res) => {
    try {
      const { connector } = req.query;
      if (connector) {
        const tools = await db.select().from(dmcTools);
        const matches = tools.filter(
          (tool) => tool.connectorType.toLowerCase().includes(connector.toLowerCase())
        );
        res.json(matches);
      } else {
        const tools = await db.select().from(dmcTools);
        res.json(tools);
      }
    } catch (error) {
      console.error("Error fetching DMC tools:", error);
      res.status(500).json({ error: "Failed to fetch DMC tools" });
    }
  });
  app2.get("/api/queries", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const queries = await db.select().from(diagnosticQueries).where(eq5(diagnosticQueries.userId, userId)).limit(20).orderBy(desc(diagnosticQueries.createdAt));
      res.json(queries);
    } catch (error) {
      console.error("Error fetching queries:", error);
      res.status(500).json({ error: "Failed to fetch query history" });
    }
  });
  app2.get("/api/ata-analytics/:ataCode", async (req, res) => {
    try {
      const { ataCode } = req.params;
      const analytics = await analyzeATASystem(ataCode);
      res.json(analytics);
    } catch (error) {
      console.error("Error analyzing ATA system:", error);
      res.status(500).json({ error: "Failed to analyze ATA system" });
    }
  });
  app2.get("/api/smart-stock/:ataCode", async (req, res) => {
    try {
      const { ataCode } = req.params;
      const analysis = await analyzeSmartStock(ataCode);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing smart stock:", error);
      res.status(500).json({ error: "Failed to analyze smart stock" });
    }
  });
  app2.post("/api/expert-booking", async (req, res) => {
    try {
      const { queryId, expertId, bookingType } = req.body;
      if (!queryId || !expertId || !bookingType) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (!["video_call", "chat"].includes(bookingType)) {
        return res.status(400).json({ error: "Invalid booking type" });
      }
      const [booking] = await db.insert(expertBookings).values({
        queryId,
        expertId,
        bookingType,
        status: "pending"
      }).returning();
      res.json({
        id: booking.id,
        status: "pending",
        message: `Expert consultation booked via ${bookingType}. Awaiting confirmation.`
      });
    } catch (error) {
      console.error("Error booking expert:", error);
      res.status(500).json({ error: "Failed to book expert", details: error.message });
    }
  });
  app2.get("/api/expert-bookings/:queryId", async (req, res) => {
    try {
      const { queryId } = req.params;
      const bookings = await db.select().from(expertBookings).where(eq5(expertBookings.queryId, queryId));
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });
  app2.get("/api/parts/:ataCode", async (req, res) => {
    try {
      const { ataCode } = req.params;
      const partsList = await db.select().from(parts).where(eq5(parts.ataCode, ataCode));
      res.json(partsList);
    } catch (error) {
      console.error("Error fetching parts:", error);
      res.status(500).json({ error: "Failed to fetch parts" });
    }
  });
  app2.get("/api/ata-occurrences/:ataCode", async (req, res) => {
    try {
      const { ataCode } = req.params;
      const occurrences = await db.select().from(ataOccurrences).where(eq5(ataOccurrences.ataCode, ataCode)).orderBy(ataOccurrences.occurrenceDate);
      res.json(occurrences);
    } catch (error) {
      console.error("Error fetching occurrences:", error);
      res.status(500).json({ error: "Failed to fetch occurrences" });
    }
  });
  app2.post("/api/ietp", async (req, res) => {
    try {
      const { ata, query } = req.body;
      if (!ata || !query) {
        return res.status(400).json({
          status: "error",
          message: "Missing required fields: ata, query"
        });
      }
      const connectorUrl = process.env.IETP_CONNECTOR_URL;
      if (!connectorUrl) {
        return res.status(500).json({
          status: "error",
          message: "IETP Connector URL not configured"
        });
      }
      const fullUrl = `${connectorUrl}`;
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ata, query }),
        signal: AbortSignal.timeout(25e3)
      });
      if (!response.ok) {
        return res.status(500).json({
          status: "error",
          message: "IETP connector failed",
          connector_status: response.status
        });
      }
      const data = await response.json();
      if (data.certainty < 0.95) {
        return res.status(200).json({
          status: "low_certainty",
          certainty: data.certainty,
          message: "Confidence below 95%. Expert consultation recommended.",
          expert_required: true,
          results: data.results || null
        });
      }
      res.status(200).json({
        status: "ok",
        certainty: data.certainty || 1,
        results: data.results || [],
        metadata: data.metadata || {}
      });
    } catch (err) {
      console.error("IETP route error:", err);
      res.status(500).json({
        status: "error",
        message: "Unexpected IETP processing failure",
        details: err.message
      });
    }
  });
  app2.post("/api/troubleshooting/:id/solution", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const validatedData = solutionSubmissionSchema.parse(req.body);
      const [updated] = await db.update(troubleshootingHistory).set({
        solution: validatedData.solution,
        technicianName: validatedData.technicianName || null,
        solutionStatus: "resolved",
        resolvedAt: /* @__PURE__ */ new Date()
      }).where(eq5(troubleshootingHistory.id, id)).returning();
      if (!updated) {
        return res.status(404).json({ error: "Troubleshooting entry not found" });
      }
      if (validatedData.replacedParts && validatedData.replacedParts.length > 0) {
        for (const part of validatedData.replacedParts) {
          await db.insert(partReplacements).values({
            troubleshootingId: id,
            partOffPn: part.partOffPn,
            partOffSn: part.partOffSn || null,
            partOffDescription: part.partOffDescription || null,
            partOnPn: part.partOnPn,
            partOnSn: part.partOnSn || null,
            partOnDescription: part.partOnDescription || null,
            ataCode: part.ataCode || updated.ata,
            quantity: part.quantity || 1
          });
          const existingPart = await db.select().from(parts).where(eq5(parts.partNumber, part.partOnPn)).limit(1);
          if (existingPart.length > 0) {
            await db.update(parts).set({ timesReplaced: sql2`${parts.timesReplaced} + 1` }).where(eq5(parts.partNumber, part.partOnPn));
          } else {
            await db.insert(parts).values({
              partNumber: part.partOnPn,
              description: part.partOnDescription || "Added from troubleshooting",
              ataCode: part.ataCode || updated.ata,
              timesReplaced: 1,
              failureRate: 0
            });
          }
        }
      }
      res.json({
        success: true,
        message: "Solution saved successfully",
        troubleshooting: updated
      });
    } catch (error) {
      console.error("Error saving solution:", error);
      res.status(500).json({ error: "Failed to save solution", details: error.message });
    }
  });
  app2.get("/api/troubleshooting/history", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { serial, ata, limit: queryLimit } = req.query;
      const history = await db.select().from(troubleshootingHistory).where(eq5(troubleshootingHistory.userId, userId)).orderBy(desc(troubleshootingHistory.createdAt)).limit(parseInt(queryLimit) || 50);
      const historyWithParts = await Promise.all(
        history.map(async (entry) => {
          const replacements = await db.select().from(partReplacements).where(eq5(partReplacements.troubleshootingId, entry.id));
          return { ...entry, replacedParts: replacements };
        })
      );
      res.json(historyWithParts);
    } catch (error) {
      console.error("Error fetching troubleshooting history:", error);
      res.status(500).json({ error: "Failed to fetch troubleshooting history" });
    }
  });
  app2.get("/api/troubleshooting/search", async (req, res) => {
    try {
      const { problem, serial, ata } = req.query;
      if (!problem) {
        return res.status(400).json({ error: "Problem description required" });
      }
      const stopWords = /* @__PURE__ */ new Set([
        "the",
        "with",
        "that",
        "this",
        "from",
        "have",
        "been",
        "will",
        "would",
        "could",
        "should",
        "which",
        "when",
        "where",
        "what",
        "about",
        "into",
        "there",
        "their",
        "they",
        "them",
        "then",
        "than",
        "also",
        "just",
        "only",
        "some",
        "such",
        "very",
        "after",
        "before",
        "during",
        "while",
        "show",
        "shows",
        "showing",
        "shown",
        "aircraft",
        "helicopter",
        "ground",
        "total",
        "display",
        "displayed",
        "indication"
      ]);
      const keywords = problem.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w)).slice(0, 8);
      const allHistory = await db.select().from(troubleshootingHistory).where(eq5(troubleshootingHistory.solutionStatus, "resolved")).orderBy(desc(troubleshootingHistory.resolvedAt)).limit(100);
      const matches = allHistory.filter((entry) => !ata || entry.ata === ata).map((entry) => {
        const problemLower = entry.problem.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
        const matchScore = keywords.filter((kw) => problemLower.includes(kw)).length;
        const serialMatch = serial && entry.aircraftSerial === serial ? 1 : 0;
        return { ...entry, score: matchScore + serialMatch, keywordMatches: matchScore };
      }).filter((entry) => entry.keywordMatches >= 2).sort((a, b) => b.score - a.score).slice(0, 5);
      const matchesWithParts = await Promise.all(
        matches.map(async (entry) => {
          const replacements = await db.select().from(partReplacements).where(eq5(partReplacements.troubleshootingId, entry.id));
          return { ...entry, replacedParts: replacements };
        })
      );
      res.json({
        matches: matchesWithParts,
        searchedKeywords: keywords
      });
    } catch (error) {
      console.error("Error searching troubleshooting history:", error);
      res.status(500).json({ error: "Failed to search troubleshooting history" });
    }
  });
  app2.get("/api/inventory/parts", async (req, res) => {
    try {
      const { ata, limit: queryLimit } = req.query;
      let partsData = await db.select().from(parts).orderBy(desc(parts.timesReplaced)).limit(parseInt(queryLimit) || 50);
      if (ata) {
        partsData = partsData.filter((p) => p.ataCode === ata);
      }
      const recentReplacements = await db.select({
        partOnPn: partReplacements.partOnPn,
        count: sql2`count(*)`.as("count"),
        ataCode: partReplacements.ataCode
      }).from(partReplacements).groupBy(partReplacements.partOnPn, partReplacements.ataCode).orderBy(desc(sql2`count(*)`)).limit(20);
      res.json({
        parts: partsData,
        recentReplacements,
        summary: {
          totalTrackedParts: partsData.length,
          topReplacedPart: partsData[0]?.partNumber || null,
          totalReplacements: partsData.reduce((sum, p) => sum + (p.timesReplaced || 0), 0)
        }
      });
    } catch (error) {
      console.error("Error fetching inventory parts:", error);
      res.status(500).json({ error: "Failed to fetch inventory parts" });
    }
  });
  app2.post("/api/troubleshooting", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { diagnosticQueryId, aircraftSerial, ata, problem, aiSuggestion } = req.body;
      const issueSignature = `${ata}:${problem.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50)}`;
      const [entry] = await db.insert(troubleshootingHistory).values({
        diagnosticQueryId,
        aircraftSerial,
        userId,
        ata,
        problem,
        issueSignature,
        aiSuggestion,
        solutionStatus: "pending",
        date: /* @__PURE__ */ new Date()
      }).returning();
      res.json(entry);
    } catch (error) {
      console.error("Error creating troubleshooting entry:", error);
      res.status(500).json({ error: "Failed to create troubleshooting entry", details: error.message });
    }
  });
  app2.get("/api/fleet-unavailability", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const records = await db.select().from(fleetUnavailability).where(eq5(fleetUnavailability.userId, userId)).orderBy(desc(fleetUnavailability.diagnosisStartedAt));
      res.json(records);
    } catch (error) {
      console.error("Error fetching fleet unavailability:", error);
      res.status(500).json({ error: "Failed to fetch fleet unavailability data" });
    }
  });
  app2.post("/api/fleet-unavailability", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { diagnosticQueryId, aircraftSerial, aircraftModel, ataCode, problemDescription } = req.body;
      const [record] = await db.insert(fleetUnavailability).values({
        userId,
        diagnosticQueryId,
        aircraftSerial,
        aircraftModel: aircraftModel || "AW139",
        ataCode,
        problemDescription,
        diagnosisStartedAt: /* @__PURE__ */ new Date(),
        status: "open"
      }).returning();
      res.json(record);
    } catch (error) {
      console.error("Error creating fleet unavailability record:", error);
      res.status(500).json({ error: "Failed to create unavailability record", details: error.message });
    }
  });
  app2.put("/api/fleet-unavailability/:id/resolve", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { solution, technicianName } = req.body;
      const [original] = await db.select().from(fleetUnavailability).where(eq5(fleetUnavailability.id, id));
      if (!original) {
        return res.status(404).json({ error: "Unavailability record not found" });
      }
      if (original.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const now = /* @__PURE__ */ new Date();
      const startTime = new Date(original.diagnosisStartedAt);
      const downtimeMinutes = Math.round((now.getTime() - startTime.getTime()) / (1e3 * 60));
      const [updated] = await db.update(fleetUnavailability).set({
        resolutionCompletedAt: now,
        downtimeMinutes,
        solution,
        technicianName,
        status: "resolved"
      }).where(eq5(fleetUnavailability.id, id)).returning();
      if (original.diagnosticQueryId) {
        await db.update(troubleshootingHistory).set({
          solution,
          solutionStatus: "resolved",
          technicianName,
          resolvedAt: now
        }).where(eq5(troubleshootingHistory.diagnosticQueryId, original.diagnosticQueryId));
      }
      res.json(updated);
    } catch (error) {
      console.error("Error resolving fleet unavailability:", error);
      res.status(500).json({ error: "Failed to resolve unavailability", details: error.message });
    }
  });
  app2.get("/api/fleet-unavailability/open", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const records = await db.select().from(fleetUnavailability).where(and3(
        eq5(fleetUnavailability.status, "open"),
        eq5(fleetUnavailability.userId, userId)
      )).orderBy(desc(fleetUnavailability.diagnosisStartedAt));
      res.json(records);
    } catch (error) {
      console.error("Error fetching open unavailability:", error);
      res.status(500).json({ error: "Failed to fetch open unavailability data" });
    }
  });
  app2.get("/api/admin/experts", async (req, res) => {
    try {
      const expertsList = await db.select().from(experts).where(eq5(experts.tenantId, DEMO_TENANT_ID)).orderBy(desc(experts.createdAt));
      res.json(expertsList);
    } catch (error) {
      console.error("Error fetching experts:", error);
      res.status(500).json({ error: "Failed to fetch experts" });
    }
  });
  app2.get("/api/admin/experts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [expert] = await db.select().from(experts).where(and3(
        eq5(experts.id, id),
        eq5(experts.tenantId, DEMO_TENANT_ID)
      )).limit(1);
      if (!expert) {
        return res.status(404).json({ error: "Expert not found" });
      }
      res.json(expert);
    } catch (error) {
      console.error("Error fetching expert:", error);
      res.status(500).json({ error: "Failed to fetch expert" });
    }
  });
  app2.post("/api/admin/experts", async (req, res) => {
    try {
      const data = insertExpertSchema.parse({
        ...req.body,
        tenantId: DEMO_TENANT_ID,
        availability: req.body.available ? "AVAILABLE" : "UNAVAILABLE"
      });
      const [created] = await db.insert(experts).values(data).returning();
      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating expert:", error);
      res.status(400).json({ error: "Failed to create expert", details: error.message });
    }
  });
  app2.patch("/api/admin/experts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      if (typeof updates.available !== "undefined") {
        updates.availability = updates.available ? "AVAILABLE" : "UNAVAILABLE";
      }
      updates.updatedAt = /* @__PURE__ */ new Date();
      const [updated] = await db.update(experts).set(updates).where(and3(
        eq5(experts.id, id),
        eq5(experts.tenantId, DEMO_TENANT_ID)
      )).returning();
      if (!updated) {
        return res.status(404).json({ error: "Expert not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating expert:", error);
      res.status(400).json({ error: "Failed to update expert", details: error.message });
    }
  });
  app2.delete("/api/admin/experts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [deleted] = await db.update(experts).set({
        deletedAt: /* @__PURE__ */ new Date(),
        available: 0,
        availability: "DELETED"
      }).where(and3(
        eq5(experts.id, id),
        eq5(experts.tenantId, DEMO_TENANT_ID)
      )).returning();
      if (!deleted) {
        return res.status(404).json({ error: "Expert not found" });
      }
      res.json({ success: true, deleted });
    } catch (error) {
      console.error("Error deleting expert:", error);
      res.status(500).json({ error: "Failed to delete expert" });
    }
  });
  app2.post("/api/admin/experts/:id/toggle-availability", async (req, res) => {
    try {
      const { id } = req.params;
      const [current] = await db.select().from(experts).where(and3(
        eq5(experts.id, id),
        eq5(experts.tenantId, DEMO_TENANT_ID)
      )).limit(1);
      if (!current) {
        return res.status(404).json({ error: "Expert not found" });
      }
      const newAvailable = current.available === 1 ? 0 : 1;
      const [updated] = await db.update(experts).set({
        available: newAvailable,
        availability: newAvailable === 1 ? "AVAILABLE" : "UNAVAILABLE",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(experts.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error toggling availability:", error);
      res.status(500).json({ error: "Failed to toggle availability" });
    }
  });
  app2.get("/api/experts/contact", async (req, res) => {
    try {
      const { expertId, method, message } = req.query;
      if (!expertId || !method) {
        return res.status(400).json({ error: "expertId and method are required" });
      }
      const [expert] = await db.select().from(experts).where(and3(
        eq5(experts.id, expertId),
        eq5(experts.tenantId, DEMO_TENANT_ID)
      )).limit(1);
      if (!expert) {
        return res.status(404).json({ error: "Expert not found" });
      }
      if (expert.available !== 1) {
        return res.status(400).json({ error: "Expert is currently unavailable" });
      }
      if (method === "whatsapp") {
        const whatsappNumber = expert.whatsappNumber?.replace(/\D/g, "") || "";
        if (!whatsappNumber) {
          return res.json({
            url: null,
            message: "WhatsApp number not configured for this expert"
          });
        }
        const prefilledMessage = encodeURIComponent(
          message || `Hello ${expert.name}, I need assistance with a diagnostic issue.`
        );
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;
        res.json({ url: whatsappUrl, expert: { id: expert.id, name: expert.name } });
      } else if (method === "video") {
        const whatsappNumber = expert.whatsappNumber?.replace(/\D/g, "") || "";
        if (!whatsappNumber) {
          return res.json({
            url: null,
            message: "WhatsApp number not configured for this expert"
          });
        }
        const videoUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("AW139 Diagnostics - Video Call Request")}`;
        res.json({
          url: videoUrl,
          type: "video",
          expert: { id: expert.id, name: expert.name },
          instructions: "Open WhatsApp and initiate a video call with the expert"
        });
      } else {
        res.status(400).json({ error: "Invalid method. Use 'whatsapp' or 'video'" });
      }
    } catch (error) {
      console.error("Error getting expert contact:", error);
      res.status(500).json({ error: "Failed to get contact information" });
    }
  });
  app2.post("/api/experts/contact", async (req, res) => {
    try {
      const { expertId, type, diagnosticId, message } = req.body;
      if (!expertId || !type) {
        return res.status(400).json({ error: "expertId and type are required" });
      }
      const [expert] = await db.select().from(experts).where(and3(
        eq5(experts.id, expertId),
        eq5(experts.tenantId, DEMO_TENANT_ID)
      )).limit(1);
      if (!expert) {
        return res.status(404).json({ error: "Expert not found" });
      }
      if (expert.available !== 1) {
        return res.status(400).json({ error: "Expert is currently unavailable" });
      }
      if (type === "chat") {
        const whatsappNumber = expert.whatsappNumber?.replace(/\D/g, "") || "";
        const prefilledMessage = encodeURIComponent(
          message || `Hello ${expert.name}, I need assistance with a diagnostic issue.${diagnosticId ? ` (Ref: ${diagnosticId})` : ""}`
        );
        if (!whatsappNumber) {
          return res.status(400).json({
            error: "WhatsApp number not configured for this expert",
            fallback: "Please contact support to reach this expert"
          });
        }
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;
        res.json({
          type: "chat",
          action: "redirect",
          url: whatsappUrl,
          expert: {
            id: expert.id,
            name: expert.name
          }
        });
      } else if (type === "video") {
        res.json({
          type: "video",
          action: "placeholder",
          message: "Video call feature ready for WhatsApp API / UAZAPI integration after deployment.",
          expert: {
            id: expert.id,
            name: expert.name
          },
          integrationReady: true
        });
      } else {
        res.status(400).json({ error: "Invalid contact type. Use 'chat' or 'video'" });
      }
    } catch (error) {
      console.error("Error requesting expert contact:", error);
      res.status(500).json({ error: "Failed to process contact request" });
    }
  });
  app2.get("/api/experts/available", async (req, res) => {
    try {
      const availableExperts = await db.select().from(experts).where(and3(
        eq5(experts.tenantId, DEMO_TENANT_ID),
        eq5(experts.available, 1),
        sql2`${experts.deletedAt} IS NULL`
        // Exclude soft-deleted experts
      )).orderBy(experts.name);
      res.json(availableExperts);
    } catch (error) {
      console.error("Error fetching available experts:", error);
      res.status(500).json({ error: "Failed to fetch available experts" });
    }
  });
  app2.get("/api/experts", async (req, res) => {
    try {
      const allExperts = await db.select().from(experts).where(and3(
        eq5(experts.tenantId, DEMO_TENANT_ID),
        sql2`${experts.deletedAt} IS NULL`
        // Exclude soft-deleted experts
      )).orderBy(experts.name);
      res.json(allExperts);
    } catch (error) {
      console.error("Error fetching experts:", error);
      res.status(500).json({ error: "Failed to fetch experts" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/app.ts
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
var app = express();
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse;
  const originalResJson = res.json.bind(res);
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson, ...args);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
async function runApp(setup) {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  await setup(app, server);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
}

// server/index-prod.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
console.log("[startup] Production server initializing...");
console.log("[startup] NODE_ENV:", process.env.NODE_ENV || "not set");
console.log("[startup] PORT:", process.env.PORT || "5000 (default)");
console.log(
  "[startup] DATABASE_URL:",
  process.env.DATABASE_URL ? "configured" : "NOT SET"
);
async function serveStatic(app2, _server) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(`[startup] Build directory not found: ${distPath}`);
    app2.use("*", (_req, res) => {
      res.status(503).json({
        error: "Application not built",
        message: "Frontend assets not found. Run build first."
      });
    });
    return;
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
(async () => {
  try {
    await runApp(serveStatic);
  } catch (err) {
    console.error("[startup] Fatal error:", err?.message || err);
    process.exit(1);
  }
})();
export {
  serveStatic
};
