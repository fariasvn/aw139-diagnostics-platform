import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Handle uncaught errors from Neon WebSocket connections to prevent crash
process.on('uncaughtException', (err: Error) => {
  if (err.message?.includes('terminating connection') || 
      err.message?.includes('57P01') ||
      err.message?.includes('administrator command')) {
    console.error("[database] Connection terminated by server, will reconnect on next query:", err.message);
  } else {
    console.error("[fatal] Uncaught exception:", err);
    process.exit(1);
  }
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Database status for health checks
let dbConnected = false;
let dbError: string | null = null;

// Handle pool errors to prevent crash on connection drops
pool.on('error', (err: Error) => {
  dbConnected = false;
  dbError = err.message;
  console.error("[database] Pool error (will attempt reconnect):", err.message);
});

pool.connect()
  .then(() => {
    dbConnected = true;
    dbError = null;
    console.log("[database] Connected to PostgreSQL");
  })
  .catch((err: Error) => {
    dbConnected = false;
    dbError = err.message;
    console.error("[database] Connection failed:", err.message);
  });

export function getDatabaseStatus() {
  return {
    connected: dbConnected,
    error: dbError
  };
}

export async function ensureDatabaseConnection(): Promise<boolean> {
  if (dbConnected) return true;
  
  try {
    await pool.connect();
    dbConnected = true;
    dbError = null;
    console.log("[database] Connection established");
    return true;
  } catch (err: any) {
    dbConnected = false;
    dbError = err.message;
    console.error("[database] Connection failed:", err.message);
    return false;
  }
}
