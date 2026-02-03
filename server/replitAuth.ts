import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import memorystore from "memorystore";

let authEnabled = true;
let authError: string | null = null;

export function isAuthEnabled(): boolean {
  return authEnabled;
}

export function getAuthError(): string | null {
  return authError;
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
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
        tableName: "sessions",
      });
      
      return session({
        secret: sessionSecret || "insecure-dev-secret-change-in-production",
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: sessionTtl,
        },
      });
    } catch (error: any) {
      console.warn("[AUTH] Failed to create PostgreSQL session store:", error.message);
      console.warn("[AUTH] Falling back to memory session store");
    }
  }
  
  const MemoryStore = memorystore(session);
  return session({
    secret: sessionSecret || "insecure-dev-secret-change-in-production",
    store: new MemoryStore({
      checkPeriod: 86400000
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  try {
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
  } catch (error: any) {
    console.error("[AUTH] Failed to upsert user:", error.message);
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

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

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    const registeredStrategies = new Set<string>();

    const ensureStrategy = (domain: string) => {
      const strategyName = `replitauth:${domain}`;
      if (!registeredStrategies.has(strategyName)) {
        const strategy = new Strategy(
          {
            name: strategyName,
            config,
            scope: "openid email profile offline_access",
            callbackURL: `https://${domain}/api/callback`,
          },
          verify,
        );
        passport.use(strategy);
        registeredStrategies.add(strategyName);
      }
    };

    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));

    app.get("/api/login", (req, res, next) => {
      ensureStrategy(req.hostname);
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      ensureStrategy(req.hostname);
      passport.authenticate(`replitauth:${req.hostname}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: replId,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    });

    console.log("[AUTH] Replit authentication configured successfully");
  } catch (error: any) {
    console.error("[AUTH] Failed to configure authentication:", error.message);
    console.warn("[AUTH] Server will continue without authentication.");
    authEnabled = false;
    authError = error.message;
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check session-based auth first (for VPS email/password login)
  const sessionReq = req as any;
  if (sessionReq.session?.userId) {
    // Set user claims from session for compatibility with routes
    if (!sessionReq.user) {
      sessionReq.user = {
        claims: {
          sub: sessionReq.session.userId,
          email: sessionReq.session.user?.email || "",
          first_name: sessionReq.session.user?.firstName || "",
          last_name: sessionReq.session.user?.lastName || "",
        },
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      };
    }
    return next();
  }
  
  if (!authEnabled) {
    (req as any).user = {
      claims: {
        sub: "anonymous-user",
        email: "anonymous@localhost",
        first_name: "Anonymous",
        last_name: "User",
      },
      expires_at: Math.floor(Date.now() / 1000) + 86400,
    };
    return next();
  }

  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
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
