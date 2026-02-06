import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Handle uncaught errors from Neon WebSocket connections to prevent crash
process.on('uncaughtException', (err: Error) => {
  const msg = err.message || '';
  const isDbError = 
    msg.includes('terminating connection') || 
    msg.includes('Connection terminated') ||
    msg.includes('57P01') ||
    msg.includes('administrator command') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('socket hang up') ||
    msg.includes('WebSocket was closed');
  if (isDbError) {
    dbConnected = false;
    console.error("[database] Connection lost, will reconnect on next query:", msg);
  } else {
    console.error("[fatal] Uncaught exception:", err);
    process.exit(1);
  }
});

let dbConnected = false;
let dbError: string | null = null;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

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
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    dbConnected = true;
    dbError = null;
    console.log("[database] Connection re-established");
    return true;
  } catch (err: any) {
    dbConnected = false;
    dbError = err.message;
    console.error("[database] Reconnection failed:", err.message);
    return false;
  }
}

// Periodic health check - try to reconnect if disconnected
setInterval(async () => {
  if (!dbConnected) {
    console.log("[database] Attempting automatic reconnection...");
    await ensureDatabaseConnection();
  }
}, 30000);
