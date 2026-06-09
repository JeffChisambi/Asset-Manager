import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://uuizijhznsbuugxyjcwo.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export function getLocalJwtSecret() {
  return process.env.JWT_SECRET || process.env.SESSION_SECRET || "fallback_dev_secret_only";
}

export interface ChatUser {
  id: string;
  email: string;
}

export interface AuthedRequest extends Request {
  chatUser: ChatUser;
  chatToken: string;
}

interface CacheEntry {
  user: ChatUser;
  expiresAt: number;
}

const TOKEN_CACHE = new Map<string, CacheEntry>();
const TOKEN_TTL_MS = 4 * 60 * 1000; // 4 minutes

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of TOKEN_CACHE) {
    if (v.expiresAt <= now) TOKEN_CACHE.delete(k);
  }
}, 5 * 60 * 1000).unref();

function verifyLocalToken(token: string): ChatUser | null {
  const secret = getLocalJwtSecret();
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret) as any;
    if (payload?.id) {
      return { id: String(payload.id), email: payload.email ?? "" };
    }
    if (payload?.sub) {
      return { id: String(payload.sub), email: payload.email ?? "" };
    }
    return null;
  } catch {
    return null;
  }
}

async function verifySupabaseToken(token: string): Promise<ChatUser | null> {
  if (!token) return null;

  const cached = TOKEN_CACHE.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.user;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) {
      TOKEN_CACHE.delete(token);
      return null;
    }
    const u = await res.json();
    if (!u?.id) return null;
    const user: ChatUser = { id: u.id, email: u.email ?? "" };
    TOKEN_CACHE.set(token, { user, expiresAt: Date.now() + TOKEN_TTL_MS });
    return user;
  } catch {
    return null;
  }
}

export async function chatAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = (req.headers.authorization ?? "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const localUser = verifyLocalToken(token);
    if (localUser) {
      (req as AuthedRequest).chatUser = localUser;
      (req as AuthedRequest).chatToken = token;
      next();
      return;
    }

    const supabaseUser = await verifySupabaseToken(token);
    if (!supabaseUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    (req as AuthedRequest).chatUser = supabaseUser;
    (req as AuthedRequest).chatToken = token;
    next();
  } catch (err) {
    next(err);
  }
}
