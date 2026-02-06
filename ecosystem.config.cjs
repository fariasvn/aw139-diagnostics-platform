const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envVars = {};
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex).trim();
        let value = line.substring(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envVars[key] = value;
      }
    }
  });
} catch (err) {
  console.error(`[PM2] CRITICAL: Could not load .env file: ${err.message}`);
  console.error(`[PM2] Ensure /app/aw139/.env exists with OPENAI_API_KEY, DATABASE_URL, SESSION_SECRET`);
}

function requireEnv(key) {
  const val = envVars[key] || process.env[key];
  if (!val) {
    console.error(`[PM2] CRITICAL: ${key} is not set in .env or environment`);
  }
  return val || undefined;
}

module.exports = {
  apps: [
    {
      name: "aw139-web",
      script: "./dist/index.js",
      cwd: "/app/aw139",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      kill_timeout: 10000,
      restart_delay: 5000,
      max_restarts: 10,
      env: Object.assign({}, envVars, {
        NODE_ENV: "production",
        OPENAI_API_KEY: requireEnv("OPENAI_API_KEY"),
        DATABASE_URL: requireEnv("DATABASE_URL"),
        SESSION_SECRET: requireEnv("SESSION_SECRET")
      })
    },
    {
      name: "rag-api",
      script: "./rag_api.py",
      interpreter: "/app/aw139/venv/bin/python",
      cwd: "/app/aw139",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      kill_timeout: 10000,
      restart_delay: 8000,
      max_restarts: 10,
      env: {
        OPENAI_API_KEY: requireEnv("OPENAI_API_KEY")
      }
    },
    {
      name: "crew-server",
      script: "./crew_server.py",
      interpreter: "/app/aw139/venv/bin/python",
      cwd: "/app/aw139",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      kill_timeout: 10000,
      restart_delay: 10000,
      max_restarts: 10,
      env: {
        OPENAI_API_KEY: requireEnv("OPENAI_API_KEY")
      }
    }
  ]
};
