import * as schema from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isNeonUrl = databaseUrl.includes("neon.tech") || databaseUrl.includes("neon.com");

let db: any;
let pool: any;
let dbConnected = false;
let dbError: string | null = null;

if (isNeonUrl) {
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const neonModule = await import("@neondatabase/serverless");
  const { default: ws } = await import("ws");

  neonModule.neonConfig.webSocketConstructor = ws;

  pool = new neonModule.Pool({ connectionString: databaseUrl });
  db = drizzle(pool, { schema });

  pool.on('error', (err: Error) => {
    dbConnected = false;
    dbError = err.message;
    console.error("[database] Pool error (will attempt reconnect):", err.message);
  });

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
      msg.includes('WebSocket was closed') ||
      msg.includes('exceeded the compute time quota');
    if (isDbError) {
      dbConnected = false;
      console.error("[database] Connection lost, will reconnect on next query:", msg);
    } else {
      console.error("[fatal] Uncaught exception:", err);
      process.exit(1);
    }
  });
} else {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pgModule = await import("pg");
  const PgPool = pgModule.default?.Pool || pgModule.Pool;

  pool = new PgPool({ connectionString: databaseUrl });
  db = drizzle(pool, { schema });

  pool.on('error', (err: Error) => {
    dbConnected = false;
    dbError = err.message;
    console.error("[database] Pool error (will attempt reconnect):", err.message);
  });

  process.on('uncaughtException', (err: Error) => {
    const msg = err.message || '';
    const isDbError =
      msg.includes('terminating connection') ||
      msg.includes('Connection terminated') ||
      msg.includes('ECONNRESET') ||
      msg.includes('ECONNREFUSED');
    if (isDbError) {
      dbConnected = false;
      console.error("[database] Connection lost, will reconnect on next query:", msg);
    } else {
      console.error("[fatal] Uncaught exception:", err);
      process.exit(1);
    }
  });
}

pool.connect()
  .then(() => {
    dbConnected = true;
    dbError = null;
    console.log(`[database] Connected to PostgreSQL (${isNeonUrl ? 'Neon' : 'local'})`);
  })
  .catch((err: Error) => {
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

async function ensureDatabaseConnection(): Promise<boolean> {
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

setInterval(async () => {
  if (!dbConnected) {
    console.log("[database] Attempting automatic reconnection...");
    await ensureDatabaseConnection();
  }
}, 30000);

export { db, pool, getDatabaseStatus, ensureDatabaseConnection };
