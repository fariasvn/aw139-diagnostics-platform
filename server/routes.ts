import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { insertDiagnosticQuerySchema, solutionSubmissionSchema, insertExpertSchema, DEMO_TENANT_ID } from "@shared/schema";
import { analyzeDiagnosticQuery } from "./diagnostic-engine";
import { analyzeATASystem } from "./ata-analytics";
import { analyzeSmartStock } from "./smart-stock";
import { db, getDatabaseStatus } from "../db/index";
import { experts as expertsTable, dmcTools as dmcToolsTable, diagnosticQueries, users, expertBookings, ataOccurrences, parts, troubleshootingHistory, partReplacements, fleetUnavailability } from "../shared/schema";
import { eq, desc, sql, like, ilike, and } from "drizzle-orm";
import { setupAuth, isAuthenticated, isAuthEnabled, getAuthError } from "./replitAuth";
import { resolveConfiguration, getApplicableParts, getAllConfigurations, getSerialEffectivityRanges } from "./configuration-resolver";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ============================================================
  // HEALTH CHECK ENDPOINT - BEFORE ANY AUTH MIDDLEWARE
  // This allows Docker/Portainer to monitor the process status
  // ============================================================
  app.get("/api/health", async (_req, res) => {
    const dbStatus = getDatabaseStatus();
    const authStatus = isAuthEnabled();
    
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      services: {
        database: {
          connected: dbStatus.connected,
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
    
    // Return 200 even if some services are degraded
    // This keeps the container running for debugging
    res.status(200).json(health);
  });

  // Detailed status endpoint for debugging
  app.get("/api/status", async (_req, res) => {
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

  // Setup Replit Auth (with graceful failure)
  await setupAuth(app);

  // ============================================================
  // LOCAL AUTH ROUTES (Email/Password) - For VPS deployments
  // ============================================================
  
  // POST /api/auth/login - Email/password login
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }
      
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }
      
      if (!user.password) {
        return res.status(401).json({ message: "Usuário não possui senha configurada" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }
      
      if (user.isActive === 0) {
        return res.status(403).json({ message: "Conta desativada. Contate o administrador." });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        planType: user.planType
      };
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          planType: user.planType
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno no login" });
    }
  });
  
  // POST /api/auth/logout - Logout
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
  
  // POST /api/auth/register - Admin creates user (requires admin role)
  app.post('/api/auth/register', isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.session?.userId || req.user?.claims?.sub;
      const [admin] = await db.select().from(users).where(eq(users.id, adminId)).limit(1);
      
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ message: "Apenas administradores podem criar usuários" });
      }
      
      const { email, password, firstName, lastName, role, planType } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }
      
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(409).json({ message: "Email já cadastrado" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const [newUser] = await db.insert(users).values({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role || 'user',
        planType: planType || 'ENTERPRISE',
        isActive: 1
      }).returning();
      
      res.status(201).json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          planType: newUser.planType
        }
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  // Auth routes - Updated to support both Replit Auth and local session
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Try session-based auth first (for VPS)
      if (req.session?.userId) {
        const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
        if (user) {
          return res.json(user);
        }
      }
      
      // Fall back to Replit Auth
      if (req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        return res.json(user);
      }
      
      return res.status(401).json({ message: "Não autenticado" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // GET /api/disclaimer/status - Check if user has acknowledged disclaimer
  app.get('/api/disclaimer/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      res.json({
        acknowledged: !!user?.disclaimerAcknowledgedAt,
        acknowledgedAt: user?.disclaimerAcknowledgedAt || null
      });
    } catch (error) {
      console.error("Error checking disclaimer status:", error);
      res.status(500).json({ message: "Failed to check disclaimer status" });
    }
  });

  // POST /api/disclaimer/acknowledge - Acknowledge disclaimer
  app.post('/api/disclaimer/acknowledge', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const [updated] = await db.update(users)
        .set({ disclaimerAcknowledgedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      
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

  // GET /api/configuration/resolve/:serialNumber - Resolve aircraft configuration from serial number
  app.get("/api/configuration/resolve/:serialNumber", isAuthenticated, async (req: any, res) => {
    try {
      const { serialNumber } = req.params;
      const resolution = await resolveConfiguration(serialNumber);
      res.json(resolution);
    } catch (error: any) {
      console.error("Configuration resolution error:", error);
      res.status(500).json({ error: "Failed to resolve configuration", details: error.message });
    }
  });

  // GET /api/configuration/all - Get all aircraft configurations
  app.get("/api/configuration/all", isAuthenticated, async (req: any, res) => {
    try {
      const configurations = await getAllConfigurations();
      res.json(configurations);
    } catch (error: any) {
      console.error("Error fetching configurations:", error);
      res.status(500).json({ error: "Failed to fetch configurations" });
    }
  });

  // GET /api/configuration/effectivity - Get serial effectivity ranges
  app.get("/api/configuration/effectivity", isAuthenticated, async (req: any, res) => {
    try {
      const ranges = await getSerialEffectivityRanges();
      res.json(ranges);
    } catch (error: any) {
      console.error("Error fetching effectivity ranges:", error);
      res.status(500).json({ error: "Failed to fetch effectivity ranges" });
    }
  });

  // POST /api/diagnostic - Submit new diagnostic query
  app.post("/api/diagnostic", isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from Replit Auth
      const userId = req.user.claims.sub;
      
      // Validate input
      const validatedData = insertDiagnosticQuerySchema.parse(req.body);
      
      // AUTOMATIC CONFIGURATION RESOLUTION - No manual selection required
      const configResolution = await resolveConfiguration(validatedData.serialNumber);
      
      // Unlimited requests for all users - no quota restrictions

      // Get taskType from request body (not in schema, passed separately)
      const taskType = req.body.taskType || "fault_isolation";
      
      // Search for previously solved similar problems in troubleshooting history
      // Stop words to exclude from matching - these cause false positives
      const stopWords = new Set([
        'the', 'with', 'that', 'this', 'from', 'have', 'been', 'will', 'would', 'could',
        'should', 'which', 'when', 'where', 'what', 'about', 'into', 'there', 'their',
        'they', 'them', 'then', 'than', 'also', 'just', 'only', 'some', 'such', 'very',
        'after', 'before', 'during', 'while', 'show', 'shows', 'showing', 'shown',
        'aircraft', 'helicopter', 'ground', 'total', 'display', 'displayed', 'indication'
      ]);
      
      // Extract meaningful technical keywords (length > 3, not stop words)
      const keywords = validatedData.problemDescription.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')  // Remove punctuation
        .split(/\s+/)
        .filter((w: string) => w.length > 3 && !stopWords.has(w))
        .slice(0, 8);
      
      const allHistory = await db.select().from(troubleshootingHistory)
        .where(eq(troubleshootingHistory.solutionStatus, "resolved"))
        .orderBy(desc(troubleshootingHistory.resolvedAt))
        .limit(100);
      
      // Score and filter matches for previous solutions
      // STRICT MATCHING: ATA code MUST match, plus meaningful keyword overlap
      const previousSolutions = await Promise.all(
        allHistory
          .filter(entry => entry.ata === validatedData.ata) // ATA MUST match - no exceptions
          .map(entry => {
            const problemLower = entry.problem.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
            // Count matching technical keywords
            const matchScore = keywords.filter((kw: string) => problemLower.includes(kw)).length;
            const serialMatch = entry.aircraftSerial === validatedData.serialNumber ? 1 : 0;
            return { ...entry, score: matchScore + serialMatch, keywordMatches: matchScore };
          })
          .filter(entry => entry.keywordMatches >= 2) // Must have at least 2 matching technical keywords
          .sort((a, b) => b.score - a.score)
          .slice(0, 3) // Top 3 matches
          .map(async (entry) => {
            const replacements = await db.select().from(partReplacements)
              .where(eq(partReplacements.troubleshootingId, entry.id));
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
      
      // Analyze with AI (include taskType and configuration)
      const analysis = await analyzeDiagnosticQuery({ 
        ...validatedData, 
        taskType,
        aircraftConfiguration: configResolution.configuration,
        configurationName: configResolution.configurationName
      });
      
      // Save to database with configuration data
      const [savedQuery] = await db.insert(diagnosticQueries).values({
        userId,
        aircraftModel: validatedData.aircraftModel,
        serialNumber: validatedData.serialNumber,
        aircraftConfiguration: configResolution.configuration,
        configurationSource: configResolution.source,
        configurationWarning: configResolution.warning,
        ata: validatedData.ata,
        taskType: taskType,
        problemDescription: validatedData.problemDescription,
        diagnosisSummary: analysis.diagnosisSummary,
        certaintyScore: analysis.certaintyScore,
        certaintyStatus: analysis.certaintyStatus,
        responseData: analysis as any
      }).returning();

      // Build ENTERPRISE EDITION response with configuration data
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
        timestamp: new Date().toISOString(),
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
          reason: "Certainty score below 95% threshold requires expert validation for safety-critical diagnostics.",
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
    } catch (error: any) {
      console.error("Diagnostic error:", error);
      res.status(500).json({ error: "Failed to process diagnostic query", details: error.message });
    }
  });

  // GET /api/experts - Get available experts
  app.get("/api/experts", async (req, res) => {
    try {
      const experts = await db.select().from(expertsTable);
      res.json(experts);
    } catch (error) {
      console.error("Error fetching experts:", error);
      res.status(500).json({ error: "Failed to fetch experts" });
    }
  });

  // GET /api/dmc-tools - Get DMC tool database
  app.get("/api/dmc-tools", async (req, res) => {
    try {
      const { connector } = req.query;
      
      if (connector) {
        // Search for matching connector
        const tools = await db.select().from(dmcToolsTable);
        const matches = tools.filter(tool => 
          tool.connectorType.toLowerCase().includes((connector as string).toLowerCase())
        );
        res.json(matches);
      } else {
        const tools = await db.select().from(dmcToolsTable);
        res.json(tools);
      }
    } catch (error) {
      console.error("Error fetching DMC tools:", error);
      res.status(500).json({ error: "Failed to fetch DMC tools" });
    }
  });

  // GET /api/queries - Get query history (user-specific)
  app.get("/api/queries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const queries = await db.select().from(diagnosticQueries)
        .where(eq(diagnosticQueries.userId, userId))
        .limit(20)
        .orderBy(desc(diagnosticQueries.createdAt));
      res.json(queries);
    } catch (error) {
      console.error("Error fetching queries:", error);
      res.status(500).json({ error: "Failed to fetch query history" });
    }
  });

  // GET /api/ata-analytics/:ataCode - ATA 100 Analytics
  app.get("/api/ata-analytics/:ataCode", async (req, res) => {
    try {
      const { ataCode } = req.params;
      const analytics = await analyzeATASystem(ataCode);
      res.json(analytics);
    } catch (error) {
      console.error("Error analyzing ATA system:", error);
      res.status(500).json({ error: "Failed to analyze ATA system" });
    }
  });

  // GET /api/smart-stock/:ataCode - Smart Stock Analysis
  app.get("/api/smart-stock/:ataCode", async (req, res) => {
    try {
      const { ataCode } = req.params;
      const analysis = await analyzeSmartStock(ataCode);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing smart stock:", error);
      res.status(500).json({ error: "Failed to analyze smart stock" });
    }
  });

  // POST /api/expert-booking - Book expert consultation
  app.post("/api/expert-booking", async (req, res) => {
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
    } catch (error: any) {
      console.error("Error booking expert:", error);
      res.status(500).json({ error: "Failed to book expert", details: error.message });
    }
  });

  // GET /api/expert-bookings/:queryId - Get bookings for a query
  app.get("/api/expert-bookings/:queryId", async (req, res) => {
    try {
      const { queryId } = req.params;
      const bookings = await db
        .select()
        .from(expertBookings)
        .where(eq(expertBookings.queryId, queryId));
      
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // GET /api/parts/:ataCode - Get parts for ATA code
  app.get("/api/parts/:ataCode", async (req, res) => {
    try {
      const { ataCode } = req.params;
      const partsList = await db
        .select()
        .from(parts)
        .where(eq(parts.ataCode, ataCode));
      
      res.json(partsList);
    } catch (error) {
      console.error("Error fetching parts:", error);
      res.status(500).json({ error: "Failed to fetch parts" });
    }
  });

  // GET /api/ata-occurrences/:ataCode - Get historical occurrences
  app.get("/api/ata-occurrences/:ataCode", async (req, res) => {
    try {
      const { ataCode } = req.params;
      const occurrences = await db
        .select()
        .from(ataOccurrences)
        .where(eq(ataOccurrences.ataCode, ataCode))
        .orderBy(ataOccurrences.occurrenceDate);
      
      res.json(occurrences);
    } catch (error) {
      console.error("Error fetching occurrences:", error);
      res.status(500).json({ error: "Failed to fetch occurrences" });
    }
  });

  // POST /api/ietp - Local IETP Search via NGROK Connector
  app.post("/api/ietp", async (req, res) => {
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
        signal: AbortSignal.timeout(25000)
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
        certainty: data.certainty || 1.0,
        results: data.results || [],
        metadata: data.metadata || {}
      });

    } catch (err: any) {
      console.error("IETP route error:", err);
      res.status(500).json({
        status: "error",
        message: "Unexpected IETP processing failure",
        details: err.message
      });
    }
  });

  // POST /api/troubleshooting/:id/solution - Submit solution for a troubleshooting entry (user-specific)
  app.post("/api/troubleshooting/:id/solution", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const validatedData = solutionSubmissionSchema.parse(req.body);
      
      // Update troubleshooting history with solution
      const [updated] = await db.update(troubleshootingHistory)
        .set({
          solution: validatedData.solution,
          technicianName: validatedData.technicianName || null,
          solutionStatus: "resolved",
          resolvedAt: new Date(),
        })
        .where(eq(troubleshootingHistory.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Troubleshooting entry not found" });
      }
      
      // Insert replaced parts if any
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
            quantity: part.quantity || 1,
          });
          
          // Update parts table for Smart Inventory tracking
          const existingPart = await db.select().from(parts)
            .where(eq(parts.partNumber, part.partOnPn))
            .limit(1);
          
          if (existingPart.length > 0) {
            await db.update(parts)
              .set({ timesReplaced: sql`${parts.timesReplaced} + 1` })
              .where(eq(parts.partNumber, part.partOnPn));
          } else {
            await db.insert(parts).values({
              partNumber: part.partOnPn,
              description: part.partOnDescription || "Added from troubleshooting",
              ataCode: part.ataCode || updated.ata,
              timesReplaced: 1,
              failureRate: 0,
            });
          }
        }
      }
      
      res.json({ 
        success: true, 
        message: "Solution saved successfully",
        troubleshooting: updated
      });
    } catch (error: any) {
      console.error("Error saving solution:", error);
      res.status(500).json({ error: "Failed to save solution", details: error.message });
    }
  });

  // GET /api/troubleshooting/history - Get troubleshooting history with solutions (user-specific)
  app.get("/api/troubleshooting/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { serial, ata, limit: queryLimit } = req.query;
      
      const history = await db.select().from(troubleshootingHistory)
        .where(eq(troubleshootingHistory.userId, userId))
        .orderBy(desc(troubleshootingHistory.createdAt))
        .limit(parseInt(queryLimit as string) || 50);
      
      // Get replaced parts for each entry
      const historyWithParts = await Promise.all(
        history.map(async (entry) => {
          const replacements = await db.select().from(partReplacements)
            .where(eq(partReplacements.troubleshootingId, entry.id));
          return { ...entry, replacedParts: replacements };
        })
      );
      
      res.json(historyWithParts);
    } catch (error) {
      console.error("Error fetching troubleshooting history:", error);
      res.status(500).json({ error: "Failed to fetch troubleshooting history" });
    }
  });

  // GET /api/troubleshooting/search - Search for similar problems in history
  app.get("/api/troubleshooting/search", async (req, res) => {
    try {
      const { problem, serial, ata } = req.query;
      
      if (!problem) {
        return res.status(400).json({ error: "Problem description required" });
      }
      
      // Stop words to exclude from matching - these cause false positives
      const stopWords = new Set([
        'the', 'with', 'that', 'this', 'from', 'have', 'been', 'will', 'would', 'could',
        'should', 'which', 'when', 'where', 'what', 'about', 'into', 'there', 'their',
        'they', 'them', 'then', 'than', 'also', 'just', 'only', 'some', 'such', 'very',
        'after', 'before', 'during', 'while', 'show', 'shows', 'showing', 'shown',
        'aircraft', 'helicopter', 'ground', 'total', 'display', 'displayed', 'indication'
      ]);
      
      // Extract meaningful technical keywords
      const keywords = (problem as string).toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w))
        .slice(0, 8);
      
      const allHistory = await db.select().from(troubleshootingHistory)
        .where(eq(troubleshootingHistory.solutionStatus, "resolved"))
        .orderBy(desc(troubleshootingHistory.resolvedAt))
        .limit(100);
      
      // Score and filter matches - STRICT: ATA must match if provided
      const matches = allHistory
        .filter(entry => !ata || entry.ata === ata) // If ATA provided, it MUST match
        .map(entry => {
          const problemLower = entry.problem.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
          const matchScore = keywords.filter(kw => problemLower.includes(kw)).length;
          const serialMatch = serial && entry.aircraftSerial === serial ? 1 : 0;
          return { ...entry, score: matchScore + serialMatch, keywordMatches: matchScore };
        })
        .filter(entry => entry.keywordMatches >= 2) // Must have at least 2 matching technical keywords
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      // Get replaced parts for matches
      const matchesWithParts = await Promise.all(
        matches.map(async (entry) => {
          const replacements = await db.select().from(partReplacements)
            .where(eq(partReplacements.troubleshootingId, entry.id));
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

  // GET /api/inventory/parts - Smart Inventory: Get most replaced parts
  app.get("/api/inventory/parts", async (req, res) => {
    try {
      const { ata, limit: queryLimit } = req.query;
      
      // Get parts ordered by times replaced
      let partsData = await db.select().from(parts)
        .orderBy(desc(parts.timesReplaced))
        .limit(parseInt(queryLimit as string) || 50);
      
      if (ata) {
        partsData = partsData.filter(p => p.ataCode === ata);
      }
      
      // Get recent replacements for additional insights
      const recentReplacements = await db.select({
        partOnPn: partReplacements.partOnPn,
        count: sql<number>`count(*)`.as('count'),
        ataCode: partReplacements.ataCode,
      })
        .from(partReplacements)
        .groupBy(partReplacements.partOnPn, partReplacements.ataCode)
        .orderBy(desc(sql`count(*)`))
        .limit(20);
      
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

  // POST /api/troubleshooting - Create new troubleshooting entry (from diagnostic) (user-specific)
  app.post("/api/troubleshooting", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { diagnosticQueryId, aircraftSerial, ata, problem, aiSuggestion } = req.body;
      
      // Generate issue signature for matching
      const issueSignature = `${ata}:${problem.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50)}`;
      
      const [entry] = await db.insert(troubleshootingHistory).values({
        diagnosticQueryId,
        aircraftSerial,
        userId,
        ata,
        problem,
        issueSignature,
        aiSuggestion,
        solutionStatus: "pending",
        date: new Date(),
      }).returning();
      
      res.json(entry);
    } catch (error: any) {
      console.error("Error creating troubleshooting entry:", error);
      res.status(500).json({ error: "Failed to create troubleshooting entry", details: error.message });
    }
  });

  // GET /api/fleet-unavailability - Get all fleet unavailability records (user-specific)
  app.get("/api/fleet-unavailability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const records = await db.select().from(fleetUnavailability)
        .where(eq(fleetUnavailability.userId, userId))
        .orderBy(desc(fleetUnavailability.diagnosisStartedAt));
      res.json(records);
    } catch (error) {
      console.error("Error fetching fleet unavailability:", error);
      res.status(500).json({ error: "Failed to fetch fleet unavailability data" });
    }
  });

  // POST /api/fleet-unavailability - Create new unavailability record (called when diagnosis starts)
  app.post("/api/fleet-unavailability", isAuthenticated, async (req: any, res) => {
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
        diagnosisStartedAt: new Date(),
        status: "open",
      }).returning();
      
      res.json(record);
    } catch (error: any) {
      console.error("Error creating fleet unavailability record:", error);
      res.status(500).json({ error: "Failed to create unavailability record", details: error.message });
    }
  });

  // PUT /api/fleet-unavailability/:id/resolve - Resolve unavailability (calculate downtime)
  app.put("/api/fleet-unavailability/:id/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { solution, technicianName } = req.body;
      
      // Get the original record to calculate downtime - ensure it belongs to user
      const [original] = await db.select().from(fleetUnavailability)
        .where(eq(fleetUnavailability.id, id));
      
      if (!original) {
        return res.status(404).json({ error: "Unavailability record not found" });
      }
      
      // Verify ownership
      if (original.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const now = new Date();
      const startTime = new Date(original.diagnosisStartedAt);
      const downtimeMinutes = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60));
      
      const [updated] = await db.update(fleetUnavailability)
        .set({
          resolutionCompletedAt: now,
          downtimeMinutes,
          solution,
          technicianName,
          status: "resolved",
        })
        .where(eq(fleetUnavailability.id, id))
        .returning();
      
      // Also update troubleshooting history if linked to a diagnostic query
      if (original.diagnosticQueryId) {
        await db.update(troubleshootingHistory)
          .set({
            solution: solution,
            solutionStatus: "resolved",
            technicianName: technicianName,
            resolvedAt: now,
          })
          .where(eq(troubleshootingHistory.diagnosticQueryId, original.diagnosticQueryId));
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error resolving fleet unavailability:", error);
      res.status(500).json({ error: "Failed to resolve unavailability", details: error.message });
    }
  });

  // GET /api/fleet-unavailability/open - Get open (unresolved) unavailability records (user-specific)
  app.get("/api/fleet-unavailability/open", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const records = await db.select().from(fleetUnavailability)
        .where(and(
          eq(fleetUnavailability.status, "open"),
          eq(fleetUnavailability.userId, userId)
        ))
        .orderBy(desc(fleetUnavailability.diagnosisStartedAt));
      res.json(records);
    } catch (error) {
      console.error("Error fetching open unavailability:", error);
      res.status(500).json({ error: "Failed to fetch open unavailability data" });
    }
  });

  // ================================================================================
  // USER MANAGEMENT ROUTES (Admin only)
  // ================================================================================

  // GET /api/admin/users - List all users (Admin only)
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      // Verify admin role
      const adminId = req.session?.userId || req.user?.claims?.sub;
      const [admin] = await db.select().from(users).where(eq(users.id, adminId)).limit(1);
      
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ error: "Acesso restrito a administradores" });
      }
      
      const usersList = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        planType: users.planType,
        isActive: users.isActive,
        createdAt: users.createdAt
      }).from(users).orderBy(desc(users.createdAt));
      res.json(usersList);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // PATCH /api/admin/users/:id - Update user (Admin only)
  app.patch("/api/admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Verify admin role
      const adminId = req.session?.userId || req.user?.claims?.sub;
      const [admin] = await db.select().from(users).where(eq(users.id, adminId)).limit(1);
      
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ error: "Acesso restrito a administradores" });
      }
      
      const { id } = req.params;
      const { isActive, role, planType } = req.body;
      
      // Validate payload
      if (isActive !== undefined && typeof isActive !== 'number') {
        return res.status(400).json({ error: "isActive deve ser 0 ou 1" });
      }
      if (role !== undefined && !['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: "role deve ser 'user' ou 'admin'" });
      }
      if (planType !== undefined && !['BASIC', 'ENTERPRISE'].includes(planType)) {
        return res.status(400).json({ error: "planType deve ser 'BASIC' ou 'ENTERPRISE'" });
      }
      
      const updateData: any = { updatedAt: new Date() };
      if (isActive !== undefined) updateData.isActive = isActive;
      if (role !== undefined) updateData.role = role;
      if (planType !== undefined) updateData.planType = planType;
      
      const [updated] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  });

  // ================================================================================
  // EXPERT MANAGEMENT ROUTES (Admin - No authentication required for demo)
  // All queries filter by tenant_id for SaaS multitenancy preparation
  // ================================================================================

  // GET /api/admin/experts - List all experts for current tenant
  app.get("/api/admin/experts", async (req, res) => {
    try {
      const expertsList = await db.select().from(expertsTable)
        .where(eq(expertsTable.tenantId, DEMO_TENANT_ID))
        .orderBy(desc(expertsTable.createdAt));
      res.json(expertsList);
    } catch (error: any) {
      console.error("Error fetching experts:", error);
      res.status(500).json({ error: "Failed to fetch experts" });
    }
  });

  // GET /api/admin/experts/:id - Get single expert
  app.get("/api/admin/experts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [expert] = await db.select().from(expertsTable)
        .where(and(
          eq(expertsTable.id, id),
          eq(expertsTable.tenantId, DEMO_TENANT_ID)
        ))
        .limit(1);
      
      if (!expert) {
        return res.status(404).json({ error: "Expert not found" });
      }
      res.json(expert);
    } catch (error: any) {
      console.error("Error fetching expert:", error);
      res.status(500).json({ error: "Failed to fetch expert" });
    }
  });

  // POST /api/admin/experts - Create new expert
  app.post("/api/admin/experts", async (req, res) => {
    try {
      const data = insertExpertSchema.parse({
        ...req.body,
        tenantId: DEMO_TENANT_ID,
        availability: req.body.available ? "AVAILABLE" : "UNAVAILABLE",
      });
      
      const [created] = await db.insert(expertsTable).values(data).returning();
      res.status(201).json(created);
    } catch (error: any) {
      console.error("Error creating expert:", error);
      res.status(400).json({ error: "Failed to create expert", details: error.message });
    }
  });

  // PATCH /api/admin/experts/:id - Update expert
  app.patch("/api/admin/experts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Sync availability text field with available boolean
      if (typeof updates.available !== 'undefined') {
        updates.availability = updates.available ? "AVAILABLE" : "UNAVAILABLE";
      }
      
      updates.updatedAt = new Date();
      
      const [updated] = await db.update(expertsTable)
        .set(updates)
        .where(and(
          eq(expertsTable.id, id),
          eq(expertsTable.tenantId, DEMO_TENANT_ID)
        ))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Expert not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating expert:", error);
      res.status(400).json({ error: "Failed to update expert", details: error.message });
    }
  });

  // DELETE /api/admin/experts/:id - Soft delete expert
  app.delete("/api/admin/experts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // Soft delete - set deletedAt timestamp instead of hard delete
      const [deleted] = await db.update(expertsTable)
        .set({ 
          deletedAt: new Date(),
          available: 0,
          availability: "DELETED"
        })
        .where(and(
          eq(expertsTable.id, id),
          eq(expertsTable.tenantId, DEMO_TENANT_ID)
        ))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Expert not found" });
      }
      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error("Error deleting expert:", error);
      res.status(500).json({ error: "Failed to delete expert" });
    }
  });

  // POST /api/admin/experts/:id/toggle-availability - Toggle expert availability
  app.post("/api/admin/experts/:id/toggle-availability", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get current state
      const [current] = await db.select().from(expertsTable)
        .where(and(
          eq(expertsTable.id, id),
          eq(expertsTable.tenantId, DEMO_TENANT_ID)
        ))
        .limit(1);
      
      if (!current) {
        return res.status(404).json({ error: "Expert not found" });
      }
      
      const newAvailable = current.available === 1 ? 0 : 1;
      const [updated] = await db.update(expertsTable)
        .set({
          available: newAvailable,
          availability: newAvailable === 1 ? "AVAILABLE" : "UNAVAILABLE",
          updatedAt: new Date(),
        })
        .where(eq(expertsTable.id, id))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error toggling availability:", error);
      res.status(500).json({ error: "Failed to toggle availability" });
    }
  });

  // ================================================================================
  // EXPERT CONTACT ABSTRACTION (WhatsApp + Video placeholder)
  // SaaS-ready abstraction for future WhatsApp API integration
  // ================================================================================

  // GET /api/experts/contact - Get expert contact info (WhatsApp link or video placeholder)
  app.get("/api/experts/contact", async (req, res) => {
    try {
      const { expertId, method, message } = req.query;
      
      if (!expertId || !method) {
        return res.status(400).json({ error: "expertId and method are required" });
      }
      
      const [expert] = await db.select().from(expertsTable)
        .where(and(
          eq(expertsTable.id, expertId as string),
          eq(expertsTable.tenantId, DEMO_TENANT_ID)
        ))
        .limit(1);
      
      if (!expert) {
        return res.status(404).json({ error: "Expert not found" });
      }
      
      if (expert.available !== 1) {
        return res.status(400).json({ error: "Expert is currently unavailable" });
      }
      
      if (method === "whatsapp") {
        const whatsappNumber = expert.whatsappNumber?.replace(/\D/g, '') || '';
        if (!whatsappNumber) {
          return res.json({
            url: null,
            message: "WhatsApp number not configured for this expert"
          });
        }
        const prefilledMessage = encodeURIComponent(
          (message as string) || `Hello ${expert.name}, I need assistance with a diagnostic issue.`
        );
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;
        res.json({ url: whatsappUrl, expert: { id: expert.id, name: expert.name } });
      } else if (method === "video") {
        // WhatsApp video call via wa.me link
        const whatsappNumber = expert.whatsappNumber?.replace(/\D/g, '') || '';
        if (!whatsappNumber) {
          return res.json({
            url: null,
            message: "WhatsApp number not configured for this expert"
          });
        }
        // WhatsApp video call link
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
    } catch (error: any) {
      console.error("Error getting expert contact:", error);
      res.status(500).json({ error: "Failed to get contact information" });
    }
  });

  // POST /api/experts/contact - Request expert contact (generates WhatsApp link or video placeholder)
  app.post("/api/experts/contact", async (req, res) => {
    try {
      const { expertId, type, diagnosticId, message } = req.body;
      
      if (!expertId || !type) {
        return res.status(400).json({ error: "expertId and type are required" });
      }
      
      // Get expert details
      const [expert] = await db.select().from(expertsTable)
        .where(and(
          eq(expertsTable.id, expertId),
          eq(expertsTable.tenantId, DEMO_TENANT_ID)
        ))
        .limit(1);
      
      if (!expert) {
        return res.status(404).json({ error: "Expert not found" });
      }
      
      if (expert.available !== 1) {
        return res.status(400).json({ error: "Expert is currently unavailable" });
      }
      
      if (type === "chat") {
        // Generate WhatsApp link
        const whatsappNumber = expert.whatsappNumber?.replace(/\D/g, '') || '';
        const prefilledMessage = encodeURIComponent(
          message || `Hello ${expert.name}, I need assistance with a diagnostic issue.${diagnosticId ? ` (Ref: ${diagnosticId})` : ''}`
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
            name: expert.name,
          }
        });
      } else if (type === "video") {
        // Video call placeholder - ready for WhatsApp API / UAZAPI integration
        res.json({
          type: "video",
          action: "placeholder",
          message: "Video call feature ready for WhatsApp API / UAZAPI integration after deployment.",
          expert: {
            id: expert.id,
            name: expert.name,
          },
          integrationReady: true,
        });
      } else {
        res.status(400).json({ error: "Invalid contact type. Use 'chat' or 'video'" });
      }
    } catch (error: any) {
      console.error("Error requesting expert contact:", error);
      res.status(500).json({ error: "Failed to process contact request" });
    }
  });

  // GET /api/experts/available - Get available experts (for Dashboard panel)
  app.get("/api/experts/available", async (req, res) => {
    try {
      const availableExperts = await db.select().from(expertsTable)
        .where(and(
          eq(expertsTable.tenantId, DEMO_TENANT_ID),
          eq(expertsTable.available, 1),
          sql`${expertsTable.deletedAt} IS NULL` // Exclude soft-deleted experts
        ))
        .orderBy(expertsTable.name);
      res.json(availableExperts);
    } catch (error: any) {
      console.error("Error fetching available experts:", error);
      res.status(500).json({ error: "Failed to fetch available experts" });
    }
  });

  // GET /api/experts - Get all experts for display (excludes soft-deleted)
  app.get("/api/experts", async (req, res) => {
    try {
      const allExperts = await db.select().from(expertsTable)
        .where(and(
          eq(expertsTable.tenantId, DEMO_TENANT_ID),
          sql`${expertsTable.deletedAt} IS NULL` // Exclude soft-deleted experts
        ))
        .orderBy(expertsTable.name);
      res.json(allExperts);
    } catch (error: any) {
      console.error("Error fetching experts:", error);
      res.status(500).json({ error: "Failed to fetch experts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
