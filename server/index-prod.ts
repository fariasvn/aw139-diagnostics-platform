import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Server } from "node:http";

import express, { type Express } from "express";
import runApp from "./app";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("[startup] Production server initializing...");
console.log("[startup] NODE_ENV:", process.env.NODE_ENV || "not set");
console.log("[startup] PORT:", process.env.PORT || "5000 (default)");
console.log(
  "[startup] DATABASE_URL:",
  process.env.DATABASE_URL ? "configured" : "NOT SET"
);

export async function serveStatic(app: Express, _server: Server) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(`[startup] Build directory not found: ${distPath}`);
    app.use("*", (_req, res) => {
      res.status(503).json({
        error: "Application not built",
        message: "Frontend assets not found. Run build first."
      });
    });
    return;
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

(async () => {
  try {
    await runApp(serveStatic);
  } catch (err: any) {
    console.error("[startup] Fatal error:", err?.message || err);
    process.exit(1);
  }
})();

