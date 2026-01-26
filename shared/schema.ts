import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Demo tenant constant for SaaS preparation
export const DEMO_TENANT_ID = "omni-demo";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Updated for Replit Auth
export const users = pgTable("users", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;

export const diagnosticQueries = pgTable("diagnostic_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull().default(DEMO_TENANT_ID),
  userId: varchar("user_id").notNull(),
  aircraftModel: text("aircraft_model").notNull(),
  serialNumber: text("serial_number").notNull(),
  aircraftConfiguration: text("aircraft_configuration"), // SN, LN, ENH, PLUS
  configurationSource: text("configuration_source"), // IETP reference for traceability
  configurationWarning: text("configuration_warning"), // Warning if effectivity incomplete
  ata: text("ata").notNull(),
  taskType: text("task_type").default("fault_isolation"),
  problemDescription: text("problem_description").notNull(),
  diagnosisSummary: text("diagnosis_summary"),
  certaintyScore: integer("certainty_score"),
  certaintyStatus: text("certainty_status"),
  responseData: jsonb("response_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const experts = pgTable("experts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull().default(DEMO_TENANT_ID),
  name: text("name").notNull(),
  role: text("role").notNull().default("Specialist"), // Role/title
  specialty: text("specialty").notNull(),
  specialties: text("specialties"), // ATA codes array as comma-separated string
  background: text("background"), // Experience, certifications
  experience: text("experience").notNull(),
  whatsappNumber: text("whatsapp_number"),
  available: integer("available").notNull().default(1), // 1 = available, 0 = unavailable
  availability: text("availability").notNull().default("AVAILABLE"), // Legacy field
  imageUrl: text("image_url"),
  deletedAt: timestamp("deleted_at"), // Soft delete timestamp
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dmcTools = pgTable("dmc_tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectorType: text("connector_type").notNull(),
  pinType: text("pin_type").notNull(),
  crimpTool: text("crimp_tool").notNull(),
  insertTool: text("insert_tool"),
  extractTool: text("extract_tool"),
  crimpForce: text("crimp_force"),
  safetyWarnings: text("safety_warnings"),
});

export const ataOccurrences = pgTable("ata_occurrences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ataCode: text("ata_code").notNull(),
  aircraftSerial: text("aircraft_serial").notNull(),
  occurrenceDate: timestamp("occurrence_date").notNull(),
  issueSummary: text("issue_summary").notNull(),
  resolution: text("resolution"),
  daysToResolution: integer("days_to_resolution"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const parts = pgTable("parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partNumber: text("part_number").notNull().unique(),
  description: text("description").notNull(),
  ataCode: text("ata_code").notNull(),
  timesReplaced: integer("times_replaced").notNull().default(0),
  failureRate: integer("failure_rate").notNull().default(0),
  daysToFailure: integer("days_to_failure"),
});

export const ragDocuments = pgTable("rag_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  docId: text("doc_id").notNull(),
  ataCode: text("ata_code").notNull(),
  section: text("section").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull(),
});

export const expertBookings = pgTable("expert_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queryId: varchar("query_id").notNull(),
  expertId: varchar("expert_id").notNull(),
  bookingType: text("booking_type").notNull(), // 'video_call' | 'chat'
  status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'completed'
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const maintenanceLogs = pgTable("maintenance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftSerial: text("aircraft_serial").notNull(),
  userId: varchar("user_id").notNull(),
  ata: text("ata").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  tsn: integer("tsn").notNull(),
  date: timestamp("date").notNull(),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const troubleshootingHistory = pgTable("troubleshooting_history", {
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const partReplacements = pgTable("part_replacements", {
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const fleetUnavailability = pgTable("fleet_unavailability", {
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Aircraft configuration types: SN (Short Nose), LN (Long Nose), ENH (Enhanced), PLUS
export const aircraftConfigurations = pgTable("aircraft_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // SN, LN, ENH, PLUS
  name: text("name").notNull(), // Short Nose, Long Nose, Enhanced, PLUS
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Maps serial number ranges to configurations based on IETP List of Effectivity Codes
export const serialEffectivity = pgTable("serial_effectivity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serialStart: integer("serial_start").notNull(), // Starting serial number
  serialEnd: integer("serial_end").notNull(), // Ending serial number (inclusive)
  configurationCode: text("configuration_code").notNull(), // SN, LN, ENH, PLUS
  effectivityCode: text("effectivity_code"), // IETP effectivity code reference
  sourceDocument: text("source_document"), // Source document reference (IETP, etc.)
  sourceRevision: text("source_revision"), // Document revision
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Maps parts to their applicable configurations
export const partEffectivity = pgTable("part_effectivity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partNumber: text("part_number").notNull(),
  configurationCode: text("configuration_code").notNull(), // SN, LN, ENH, PLUS or ALL
  ataCode: text("ata_code"),
  effectivityCode: text("effectivity_code"), // IETP effectivity reference
  sourceDocument: text("source_document"), // IPD or IETP reference
  sourceRevision: text("source_revision"),
  isApplicable: integer("is_applicable").notNull().default(1), // 1 = applicable, 0 = not applicable
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiagnosticQuerySchema = createInsertSchema(diagnosticQueries).omit({
  id: true,
  userId: true,
  createdAt: true,
  diagnosisSummary: true,
  certaintyScore: true,
  certaintyStatus: true,
  responseData: true,
});

export const insertMaintenanceLogSchema = createInsertSchema(maintenanceLogs).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertTroubleshootingSchema = createInsertSchema(troubleshootingHistory).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertPartReplacementSchema = createInsertSchema(partReplacements).omit({
  id: true,
  createdAt: true,
});

export const insertFleetUnavailabilitySchema = createInsertSchema(fleetUnavailability).omit({
  id: true,
  createdAt: true,
});

export const insertExpertSchema = createInsertSchema(experts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const solutionSubmissionSchema = z.object({
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
    quantity: z.number().default(1),
  })).optional().default([]),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type DiagnosticQuery = typeof diagnosticQueries.$inferSelect;
export type InsertDiagnosticQuery = z.infer<typeof insertDiagnosticQuerySchema>;
export type Expert = typeof experts.$inferSelect;
export type DMCTool = typeof dmcTools.$inferSelect;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
export type TroubleshootingHistory = typeof troubleshootingHistory.$inferSelect;
export type PartReplacement = typeof partReplacements.$inferSelect;
export type InsertMaintenanceLog = z.infer<typeof insertMaintenanceLogSchema>;
export type InsertTroubleshooting = z.infer<typeof insertTroubleshootingSchema>;
export type InsertPartReplacement = z.infer<typeof insertPartReplacementSchema>;
export type FleetUnavailability = typeof fleetUnavailability.$inferSelect;
export type InsertFleetUnavailability = z.infer<typeof insertFleetUnavailabilitySchema>;
export type SolutionSubmission = z.infer<typeof solutionSubmissionSchema>;
export type InsertExpert = z.infer<typeof insertExpertSchema>;
export type AircraftConfiguration = typeof aircraftConfigurations.$inferSelect;
export type SerialEffectivity = typeof serialEffectivity.$inferSelect;
export type PartEffectivity = typeof partEffectivity.$inferSelect;

// Configuration resolution result type
export interface ConfigurationResolution {
  serialNumber: string;
  configuration: string | null; // SN, LN, ENH, PLUS
  configurationName: string | null;
  effectivityCode: string | null;
  source: string | null;
  sourceRevision: string | null;
  warning: string | null;
  isResolved: boolean;
}
