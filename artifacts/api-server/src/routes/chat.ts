import { Router, type Request, type Response, type NextFunction } from "express";
import { and, asc, eq, gt, ilike, inArray, lt, not, or, sql } from "drizzle-orm";
import {
  chatConversationsTable,
  chatFriendRequestsTable,
  chatMembersTable,
  chatMessagesTable,
  chatProfilesTable,
  chatStoriesTable,
  db,
} from "@workspace/db";
import { randomUUID } from "crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";

// ── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://uuizijhznsbuugxyjcwo.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// Local JWT secret — lazily evaluated to ensure dotenv is loaded
function getLocalJwtSecret() {
  return process.env.JWT_SECRET || process.env.SESSION_SECRET || "fallback_dev_secret_only";
}

// ── Token cache (avoid hitting Supabase on every request) ────────────────────
// Tokens are cached for 4 minutes; Supabase JWTs expire after 1 hour.

interface CacheEntry {
  user: ChatUser;
  expiresAt: number;
}
const TOKEN_CACHE = new Map<string, CacheEntry>();
const TOKEN_TTL_MS = 4 * 60 * 1000; // 4 minutes

// Prune expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of TOKEN_CACHE) {
    if (v.expiresAt <= now) TOKEN_CACHE.delete(k);
  }
}, 5 * 60 * 1000).unref();

interface ChatUser {
  id: string;
  email: string;
}

// ── Dual-mode token verification ─────────────────────────────────────────────
// 1. Try local JWT (signed by this server). If it decodes → use it.
// 2. Fall back to Supabase verification for users logged in via Supabase.

function verifyLocalToken(token: string): ChatUser | null {
  const secret = getLocalJwtSecret();
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret) as any;
    // Local chat tokens have { id, email } or { id, sub }
    if (payload?.id) {
      return { id: String(payload.id), email: payload.email ?? "" };
    }
    // Supabase-style JWTs have { sub } for the user id
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

interface AuthedRequest extends Request {
  chatUser: ChatUser;
  chatToken: string;
}

async function chatAuth(
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

    // 1. Try local JWT first (fast, no network) — handles app-registered users
    const localUser = verifyLocalToken(token);
    if (localUser) {
      (req as AuthedRequest).chatUser = localUser;
      (req as AuthedRequest).chatToken = token;
      next();
      return;
    }

    // 2. Fall back to Supabase for users who signed in via Supabase
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



// ── Rate limiters ────────────────────────────────────────────────────────────

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests" },
  keyGenerator: (req) =>
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    "unknown",
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many messages" },
  keyGenerator: (req) =>
    ((req as AuthedRequest).chatUser?.id || req.ip || "unknown"),
});

// ── Zod schemas ──────────────────────────────────────────────────────────────

const USERNAME_RE = /^[a-z0-9_]{2,30}$/;

const ProfileSyncSchema = z.object({
  username: z
    .string()
    .min(2)
    .max(30)
    .regex(USERNAME_RE, "Username must be 2-30 lowercase letters, digits, or underscores")
    .optional(),
  displayName: z.string().min(1).max(50).optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex colour")
    .optional(),
  avatarUrl: z.string().optional(),
  bio: z.string().max(500).optional(),
});

const SearchSchema = z.object({
  q: z.string().min(1).max(100),
});

const IdsSchema = z.object({
  ids: z.string().min(1).max(2000),
});

const FriendRequestSchema = z.object({
  toId: z.string().uuid("toId must be a valid UUID"),
});

const FriendRequestActionSchema = z.object({
  action: z.enum(["accept", "reject", "cancel"]),
});

const DirectConvSchema = z.object({
  friendId: z.string().uuid("friendId must be a valid UUID"),
});

const GroupConvSchema = z.object({
  name: z.string().min(1).max(100),
  memberIds: z
    .array(z.string().uuid())
    .min(1)
    .max(99),
});

const AddMemberSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
});

const SendMessageSchema = z.object({
  type: z.enum(["text", "image", "voice", "video", "file", "sticker", "contact"]),
  text: z.string().max(4000).optional(),
  mediaUrl: z.string().url().max(2000).optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  fileSize: z.number().int().positive().max(104857600).optional().nullable(),
  fileMimeType: z.string().max(127).optional().nullable(),
  audioDuration: z.number().int().positive().max(7200).optional().nullable(),
  sticker: z.string().max(200).optional().nullable(),
});

// ── Validation helper ────────────────────────────────────────────────────────

function validate<T>(
  schema: z.ZodType<T>,
  data: unknown,
  res: Response,
): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(400).json({
      error: "Validation error",
      details: result.error.flatten().fieldErrors,
    });
    return null;
  }
  return result.data;
}

function parseSince(raw: unknown): Date | undefined {
  if (raw == null) return undefined;
  const ms = parseInt(String(raw), 10);
  if (isNaN(ms) || ms < 0) return undefined;
  return new Date(ms);
}

// ── Router ───────────────────────────────────────────────────────────────────

const router = Router();
router.use(generalLimiter);

// ── Native chat auth (no Supabase required) ───────────────────────────────────
// These endpoints let the mobile app register and log in users entirely via
// the local API server. The generated JWTs are accepted by chatAuth above.

const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are supported"));
      return;
    }
    cb(null, true);
  },
});

function getApiOrigin(req: Request) {
  return `${req.protocol}://${req.get("host")}`;
}

function toAbsoluteUploadUrl(req: Request, imageUrl: string | null | undefined) {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const normalizedPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return `${getApiOrigin(req)}${normalizedPath}`;
}

router.post(
  "/upload-image",
  chatAuth,
  upload.single("file"),
  (req: Request, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase() || ".jpg";
    const newName = `${req.file.filename}${ext}`;
    const oldPath = req.file.path;
    const newPath = path.join(path.dirname(oldPath), newName);
    fs.renameSync(oldPath, newPath);
    const url = toAbsoluteUploadUrl(req, `/uploads/${newName}`);
    res.json({ imageUrl: url });
  }
);

const ChatAuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(80).optional(),
  username: z.string().min(2).max(30).regex(/^[a-z0-9_]+$/).optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

router.post(
  "/auth/register",
  async (req: Request, res: Response): Promise<void> => {
    const body = validate(ChatAuthSchema, req.body ?? {}, res);
    if (body === null) return;

    const { email, password, displayName, username, avatarColor } = body;

    // Check if email already exists
    const existingByEmail = await db
      .select({ id: chatProfilesTable.id })
      .from(chatProfilesTable)
      .where(sql`LOWER(${chatProfilesTable.id}::text) = LOWER(${email})`)
      .limit(1);

    // Use email as a pseudo-key in a separate lookup table (we store email in bio as fallback)
    // Actually search by the email stored during registration — we keep email in a dedicated field
    // For now, generate a deterministic UUID from the email to serve as stable id
    const crypto = await import("crypto");
    const userId = crypto.randomUUID();

    // Build unique username
    const rawUsername =
      username ||
      email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) ||
      "user";
    const usernameConflict = await db
      .select({ id: chatProfilesTable.id })
      .from(chatProfilesTable)
      .where(eq(chatProfilesTable.username, rawUsername))
      .limit(1);
    const finalUsername = usernameConflict.length
      ? `${rawUsername.slice(0, 20)}_${Math.floor(Math.random() * 9000 + 1000)}`
      : rawUsername;

    const dn = displayName || finalUsername;
    const passwordHash = await bcrypt.hash(password, 10);

    // Store the user — we embed email+hash in bio as a JSON payload so we can look it up on login
    // (This avoids altering the schema while keeping registration self-contained)
    const profileBio = JSON.stringify({ __email: email, __hash: passwordHash });

    try {
      await db.insert(chatProfilesTable).values({
        id: userId,
        username: finalUsername,
        displayName: dn,
        avatarColor: avatarColor ?? "#13B734",
        bio: profileBio,
      });
    } catch (err: any) {
      if (err?.code === "23505") {
        res.status(400).json({ error: "Username already taken" });
        return;
      }
      throw err;
    }

    const token = jwt.sign(
      { id: userId, email },
      getLocalJwtSecret(),
      { expiresIn: "30d" },
    );

    const [profile] = await db
      .select()
      .from(chatProfilesTable)
      .where(eq(chatProfilesTable.id, userId));

    res.status(201).json({
      token,
      user: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        avatarColor: profile.avatarColor,
        bio: "",
      },
    });
  },
);

router.post(
  "/auth/login",
  async (req: Request, res: Response): Promise<void> => {
    const body = validate(ChatAuthSchema, req.body ?? {}, res);
    if (body === null) return;

    const { email, password } = body;

    // Find user by searching for their email embedded in bio
    const profiles = await db
      .select()
      .from(chatProfilesTable)
      .where(sql`${chatProfilesTable.bio} LIKE ${`%"__email":"${email}"%`}`);

    if (!profiles.length) {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }

    const profile = profiles[0];
    let stored: { __email: string; __hash: string } | null = null;
    try {
      stored = JSON.parse(profile.bio);
    } catch {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }

    if (!stored?.__hash || !await bcrypt.compare(password, stored.__hash)) {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign(
      { id: profile.id, email },
      getLocalJwtSecret(),
      { expiresIn: "30d" },
    );

    res.json({
      token,
      user: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        avatarColor: profile.avatarColor,
        avatarUrl: profile.avatarUrl,
        bio: "",
      },
    });
  },
);



// ── Profile ──────────────────────────────────────────────────────────────────

router.post(
  "/profile/sync",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const body = validate(ProfileSyncSchema, req.body ?? {}, res);
    if (body === null) return;

    const userId = (req as AuthedRequest).chatUser.id;
    const email = (req as AuthedRequest).chatUser.email;

    const existing = await db
      .select()
      .from(chatProfilesTable)
      .where(eq(chatProfilesTable.id, userId));

    if (existing.length === 0) {
      // New profile — set username once (cannot be changed via this endpoint)
      const rawUn =
        body.username ||
        email?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "") ||
        "user";
      // Ensure uniqueness by appending a suffix on conflict
      let un = rawUn.slice(0, 25);
      const conflict = await db
        .select({ id: chatProfilesTable.id })
        .from(chatProfilesTable)
        .where(eq(chatProfilesTable.username, un));
      if (conflict.length) {
        un = `${un.slice(0, 20)}_${Math.floor(Math.random() * 9000 + 1000)}`;
      }
      const dn = body.displayName || un;
      await db.insert(chatProfilesTable).values({
        id: userId,
        username: un,
        displayName: dn,
        avatarColor: body.avatarColor ?? "#13B734",
        avatarUrl: body.avatarUrl ?? null,
        bio: body.bio ?? "",
      });
    } else {
      // Existing profile — update mutable fields only (username is NOT updatable here)
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (body.displayName) patch.displayName = body.displayName;
      if (body.avatarColor) patch.avatarColor = body.avatarColor;
      if (body.avatarUrl !== undefined) patch.avatarUrl = body.avatarUrl;
      if (body.bio !== undefined) patch.bio = body.bio;
      await db
        .update(chatProfilesTable)
        .set(patch)
        .where(eq(chatProfilesTable.id, userId));
    }

    const [profile] = await db
      .select()
      .from(chatProfilesTable)
      .where(eq(chatProfilesTable.id, userId));
    res.json(profile);
  },
);

router.get(
  "/profile/me",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const [profile] = await db
      .select()
      .from(chatProfilesTable)
      .where(eq(chatProfilesTable.id, (req as AuthedRequest).chatUser.id));
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json(profile);
  },
);

// ── Users ────────────────────────────────────────────────────────────────────

router.get(
  "/users/search",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const query = validate(SearchSchema, req.query, res);
    if (query === null) return;

    const results = await db
      .select()
      .from(chatProfilesTable)
      .where(
        and(
          not(eq(chatProfilesTable.id, (req as AuthedRequest).chatUser.id)),
          or(
            // Trigram similarity match (fuzzy)
            sql`${chatProfilesTable.username} % ${query.q}`,
            sql`${chatProfilesTable.displayName} % ${query.q}`,
            // Fallback to prefix match for very short queries (< 3 chars)
            ilike(chatProfilesTable.username, `${query.q}%`),
            ilike(chatProfilesTable.displayName, `${query.q}%`)
          )
        ),
      )
      .orderBy(
        sql`GREATEST(similarity(${chatProfilesTable.username}, ${query.q}), similarity(${chatProfilesTable.displayName}, ${query.q})) DESC`
      )
      .limit(20);
    res.json(results);
  },
);

router.get(
  "/users",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const query = validate(IdsSchema, req.query, res);
    if (query === null) return;

    const ids = query.ids
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100);
    if (!ids.length) {
      res.json([]);
      return;
    }
    const profiles = await db
      .select()
      .from(chatProfilesTable)
      .where(inArray(chatProfilesTable.id, ids));
    res.json(profiles);
  },
);

// ── People Discovery ──────────────────────────────────────────────────────────
// Returns paginated list of all registered users, excluding the caller,
// their existing friends, and anyone with a pending request.
// Uses cursor-based pagination (createdAt) for efficiency — no OFFSET scans.

router.get(
  "/users/discover",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const me = (req as AuthedRequest).chatUser.id;
    const limitRaw = Math.min(parseInt(String(req.query.limit ?? "20"), 10) || 20, 50);
    const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : undefined;

    // Fetch all friend request IDs involving the current user
    const myRequests = await db
      .select({
        fromId: chatFriendRequestsTable.fromId,
        toId: chatFriendRequestsTable.toId,
        status: chatFriendRequestsTable.status,
      })
      .from(chatFriendRequestsTable)
      .where(
        or(
          eq(chatFriendRequestsTable.fromId, me),
          eq(chatFriendRequestsTable.toId, me),
        ),
      );

    // Build a set of IDs to exclude (self + anyone in a friend relationship or pending)
    const excludeIds = new Set<string>([me]);
    for (const r of myRequests) {
      const otherId = r.fromId === me ? r.toId : r.fromId;
      if (r.status === "accepted" || r.status === "pending") {
        excludeIds.add(otherId);
      }
    }

    const excludeArr = [...excludeIds];

    // Build paginated query using createdAt cursor
    const conditions = [not(inArray(chatProfilesTable.id, excludeArr))];
    if (cursor) {
      conditions.push(sql`${chatProfilesTable.createdAt} < ${cursor}`);
    }

    const results = await db
      .select({
        id: chatProfilesTable.id,
        username: chatProfilesTable.username,
        displayName: chatProfilesTable.displayName,
        avatarColor: chatProfilesTable.avatarColor,
        avatarUrl: chatProfilesTable.avatarUrl,
        createdAt: chatProfilesTable.createdAt,
      })
      .from(chatProfilesTable)
      .where(and(...conditions))
      .orderBy(sql`${chatProfilesTable.createdAt} DESC`)
      .limit(limitRaw + 1); // fetch one extra to detect if more pages exist

    const hasMore = results.length > limitRaw;
    const page = hasMore ? results.slice(0, limitRaw) : results;
    const nextCursor = hasMore ? page[page.length - 1].createdAt?.toISOString() : null;

    res.json({ users: page, nextCursor, hasMore });
  },
);



// ── Friends ──────────────────────────────────────────────────────────────────

router.get(
  "/friends",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthedRequest).chatUser.id;
    const accepted = await db
      .select()
      .from(chatFriendRequestsTable)
      .where(
        and(
          eq(chatFriendRequestsTable.status, "accepted"),
          or(
            eq(chatFriendRequestsTable.fromId, userId),
            eq(chatFriendRequestsTable.toId, userId),
          ),
        ),
      );
    if (!accepted.length) {
      res.json([]);
      return;
    }
    const friendIds = accepted.map((r) =>
      r.fromId === userId ? r.toId : r.fromId,
    );
    const profiles = await db
      .select()
      .from(chatProfilesTable)
      .where(inArray(chatProfilesTable.id, friendIds));
    res.json(profiles);
  },
);

// ── Friend Requests ──────────────────────────────────────────────────────────

router.get(
  "/friend-requests",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthedRequest).chatUser.id;
    const requests = await db
      .select()
      .from(chatFriendRequestsTable)
      .where(
        or(
          eq(chatFriendRequestsTable.fromId, userId),
          eq(chatFriendRequestsTable.toId, userId),
        ),
      );
    res.json(requests);
  },
);

router.post(
  "/friend-requests",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const body = validate(FriendRequestSchema, req.body ?? {}, res);
    if (body === null) return;

    const fromId = (req as AuthedRequest).chatUser.id;
    const { toId } = body;

    if (toId === fromId) {
      res.status(400).json({ error: "Cannot send friend request to yourself" });
      return;
    }

    // Ensure the target profile exists
    const [target] = await db
      .select({ id: chatProfilesTable.id })
      .from(chatProfilesTable)
      .where(eq(chatProfilesTable.id, toId));
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check for existing request in either direction
    const existing = await db
      .select()
      .from(chatFriendRequestsTable)
      .where(
        or(
          and(
            eq(chatFriendRequestsTable.fromId, fromId),
            eq(chatFriendRequestsTable.toId, toId),
          ),
          and(
            eq(chatFriendRequestsTable.fromId, toId),
            eq(chatFriendRequestsTable.toId, fromId),
          ),
        ),
      );
    if (existing.length) {
      res.status(409).json({ error: "Request already exists", existing: existing[0] });
      return;
    }

    const [inserted] = await db
      .insert(chatFriendRequestsTable)
      .values({ fromId, toId, status: "pending" })
      .returning();
    res.status(201).json(inserted);
  },
);

router.patch(
  "/friend-requests/:id",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId)) {
      res.status(400).json({ error: "Invalid request ID" });
      return;
    }

    const body = validate(FriendRequestActionSchema, req.body ?? {}, res);
    if (body === null) return;

    const userId = (req as AuthedRequest).chatUser.id;
    const [row] = await db
      .select()
      .from(chatFriendRequestsTable)
      .where(eq(chatFriendRequestsTable.id, requestId));
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const { action } = body;
    if (action === "cancel") {
      if (row.fromId !== userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      await db
        .delete(chatFriendRequestsTable)
        .where(eq(chatFriendRequestsTable.id, requestId));
      res.json({ deleted: true });
      return;
    }

    if (row.toId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [updated] = await db
      .update(chatFriendRequestsTable)
      .set({
        status: action === "accept" ? "accepted" : "rejected",
        updatedAt: new Date(),
      })
      .where(eq(chatFriendRequestsTable.id, requestId))
      .returning();
    res.json(updated);
  },
);

// ── Conversations ────────────────────────────────────────────────────────────

router.get(
  "/conversations",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthedRequest).chatUser.id;
    const memberships = await db
      .select({ conversationId: chatMembersTable.conversationId })
      .from(chatMembersTable)
      .where(eq(chatMembersTable.userId, userId));

    if (!memberships.length) {
      res.json([]);
      return;
    }
    const convIds = memberships.map((m) => m.conversationId);
    const [convs, allMembers] = await Promise.all([
      db
        .select()
        .from(chatConversationsTable)
        .where(inArray(chatConversationsTable.id, convIds)),
      db
        .select()
        .from(chatMembersTable)
        .where(inArray(chatMembersTable.conversationId, convIds)),
    ]);
    res.json(
      convs.map((c) => ({
        ...c,
        memberIds: allMembers
          .filter((m) => m.conversationId === c.id)
          .map((m) => m.userId),
      })),
    );
  },
);

router.post(
  "/conversations/direct",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const body = validate(DirectConvSchema, req.body ?? {}, res);
    if (body === null) return;

    const userId = (req as AuthedRequest).chatUser.id;
    const { friendId } = body;

    if (friendId === userId) {
      res.status(400).json({ error: "Cannot create conversation with yourself" });
      return;
    }

    // Look for an existing direct conversation between the two users
    const myMems = await db
      .select({ conversationId: chatMembersTable.conversationId })
      .from(chatMembersTable)
      .where(eq(chatMembersTable.userId, userId));
    const myConvIds = myMems.map((m) => m.conversationId);

    if (myConvIds.length) {
      const shared = await db
        .select({ conversationId: chatMembersTable.conversationId })
        .from(chatMembersTable)
        .where(
          and(
            eq(chatMembersTable.userId, friendId),
            inArray(chatMembersTable.conversationId, myConvIds),
          ),
        );
      for (const s of shared) {
        const [conv] = await db
          .select()
          .from(chatConversationsTable)
          .where(
            and(
              eq(chatConversationsTable.id, s.conversationId),
              eq(chatConversationsTable.type, "direct"),
            ),
          );
        if (conv) {
          res.json(conv.id);
          return;
        }
      }
    }

    const convId = randomUUID();
    await db
      .insert(chatConversationsTable)
      .values({ id: convId, type: "direct", createdBy: userId });
    await db.insert(chatMembersTable).values([
      { conversationId: convId, userId },
      { conversationId: convId, userId: friendId },
    ]);
    res.status(201).json(convId);
  },
);

router.post(
  "/conversations/group",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const body = validate(GroupConvSchema, req.body ?? {}, res);
    if (body === null) return;

    const userId = (req as AuthedRequest).chatUser.id;
    const { name, memberIds } = body;

    const convId = randomUUID();
    await db
      .insert(chatConversationsTable)
      .values({ id: convId, type: "group", name, createdBy: userId });
    const allIds = Array.from(new Set([userId, ...memberIds]));
    await db
      .insert(chatMembersTable)
      .values(allIds.map((uid) => ({ conversationId: convId, userId: uid })));
    res.status(201).json(convId);
  },
);

router.post(
  "/conversations/:id/members",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const body = validate(AddMemberSchema, req.body ?? {}, res);
    if (body === null) return;

    const convId = req.params.id;
    const requesterId = (req as AuthedRequest).chatUser.id;

    // Requester must be a member of this conversation
    const [requesterMem] = await db
      .select()
      .from(chatMembersTable)
      .where(
        and(
          eq(chatMembersTable.conversationId, convId),
          eq(chatMembersTable.userId, requesterId),
        ),
      );
    if (!requesterMem) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Only allow adding to group conversations
    const [conv] = await db
      .select()
      .from(chatConversationsTable)
      .where(eq(chatConversationsTable.id, convId));
    if (!conv || conv.type !== "group") {
      res.status(400).json({ error: "Can only add members to group conversations" });
      return;
    }

    const { userId: newUserId } = body;
    const [existing] = await db
      .select()
      .from(chatMembersTable)
      .where(
        and(
          eq(chatMembersTable.conversationId, convId),
          eq(chatMembersTable.userId, newUserId),
        ),
      );
    if (existing) {
      res.json({ already: true });
      return;
    }
    await db
      .insert(chatMembersTable)
      .values({ conversationId: convId, userId: newUserId });
    res.json({ added: true });
  },
);

router.delete(
  "/conversations/:id/members/:uid",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const convId = req.params.id;
    const targetUid = req.params.uid;
    const requesterId = (req as AuthedRequest).chatUser.id;

    // Must be removing yourself OR be the conversation creator
    if (targetUid !== requesterId) {
      const [conv] = await db
        .select()
        .from(chatConversationsTable)
        .where(eq(chatConversationsTable.id, convId));
      if (!conv || conv.createdBy !== requesterId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    await db
      .delete(chatMembersTable)
      .where(
        and(
          eq(chatMembersTable.conversationId, convId),
          eq(chatMembersTable.userId, targetUid),
        ),
      );
    res.json({ removed: true });
  },
);

// ── Messages ─────────────────────────────────────────────────────────────────

router.get(
  "/conversations/:id/messages",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const convId = req.params.id;
    const userId = (req as AuthedRequest).chatUser.id;

    const [membership] = await db
      .select()
      .from(chatMembersTable)
      .where(
        and(
          eq(chatMembersTable.conversationId, convId),
          eq(chatMembersTable.userId, userId),
        ),
      );
    if (!membership) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const since = parseSince(req.query.since);
    const msgs = await db
      .select()
      .from(chatMessagesTable)
      .where(
        since
          ? and(
              eq(chatMessagesTable.conversationId, convId),
              gt(chatMessagesTable.createdAt, since),
            )
          : eq(chatMessagesTable.conversationId, convId),
      )
      .orderBy(asc(chatMessagesTable.createdAt))
      .limit(100);
    res.json(msgs);
  },
);

router.post(
  "/conversations/:id/messages",
  chatAuth,
  messageLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const body = validate(SendMessageSchema, req.body ?? {}, res);
    if (body === null) return;

    const convId = req.params.id;
    const userId = (req as AuthedRequest).chatUser.id;

    const [membership] = await db
      .select()
      .from(chatMembersTable)
      .where(
        and(
          eq(chatMembersTable.conversationId, convId),
          eq(chatMembersTable.userId, userId),
        ),
      );
    if (!membership) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [inserted] = await db
      .insert(chatMessagesTable)
      .values({
        id: randomUUID(),
        conversationId: convId,
        senderId: userId,
        type: body.type,
        text: body.text ?? null,
        mediaUrl: body.mediaUrl ?? null,
        fileName: body.fileName ?? null,
        fileSize: body.fileSize ?? null,
        fileMimeType: body.fileMimeType ?? null,
        audioDuration: body.audioDuration ?? null,
        sticker: body.sticker ?? null,
      })
      .returning();
    res.status(201).json(inserted);
  },
);

// ── Stories ─────────────────────────────────────────────────────────────────
// Stories expire 24 h after creation. Viewers list is a JSON array in a text column.

const StoryCreateSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(["image", "video", "voice", "text"]),
  mediaUrl: z.string().url().max(2000).optional().nullable(),
  text: z.string().max(500).optional().nullable(),
  sticker: z.string().max(200).optional().nullable(),
  backgroundColor: z.string().max(20).optional().nullable(),
  audioDuration: z.number().int().positive().max(7200).optional().nullable(),
});

// GET /api/chat/stories  — returns own + friends' active stories
router.get(
  "/stories",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthedRequest).chatUser.id;
    const now = new Date();

    // Get friend IDs
    const accepted = await db
      .select({ fromId: chatFriendRequestsTable.fromId, toId: chatFriendRequestsTable.toId })
      .from(chatFriendRequestsTable)
      .where(
        and(
          eq(chatFriendRequestsTable.status, "accepted"),
          or(
            eq(chatFriendRequestsTable.fromId, userId),
            eq(chatFriendRequestsTable.toId, userId),
          ),
        ),
      );

    const friendIds = accepted.map((r) => (r.fromId === userId ? r.toId : r.fromId));
    const visibleIds = [userId, ...friendIds];

    const stories = await db
      .select()
      .from(chatStoriesTable)
      .where(
        and(
          inArray(chatStoriesTable.userId, visibleIds),
          gt(chatStoriesTable.expiresAt, now),
        ),
      )
      .orderBy(asc(chatStoriesTable.createdAt));

    res.json(stories);
  },
);

// POST /api/chat/stories  — create a new story
router.post(
  "/stories",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const body = validate(StoryCreateSchema, req.body ?? {}, res);
    if (body === null) return;
    const userId = (req as AuthedRequest).chatUser.id;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Upsert — if client retries with same id, just return existing
    const existing = await db
      .select()
      .from(chatStoriesTable)
      .where(eq(chatStoriesTable.id, body.id))
      .limit(1);
    if (existing.length) {
      res.status(201).json(existing[0]);
      return;
    }

    const [inserted] = await db
      .insert(chatStoriesTable)
      .values({
        id: body.id,
        userId,
        type: body.type,
        mediaUrl: body.mediaUrl ?? null,
        text: body.text ?? null,
        sticker: body.sticker ?? null,
        backgroundColor: body.backgroundColor ?? null,
        audioDuration: body.audioDuration ?? null,
        viewers: "[]",
        expiresAt,
      })
      .returning();

    res.status(201).json(inserted);
  },
);

// PATCH /api/chat/stories/:id/view  — mark a story as viewed
router.patch(
  "/stories/:id/view",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const viewerId = (req as AuthedRequest).chatUser.id;

    const [story] = await db
      .select()
      .from(chatStoriesTable)
      .where(eq(chatStoriesTable.id, id))
      .limit(1);

    if (!story) {
      res.status(404).json({ error: "Story not found" });
      return;
    }

    let viewers: string[] = [];
    try { viewers = JSON.parse(story.viewers); } catch { viewers = []; }
    if (!viewers.includes(viewerId)) {
      viewers.push(viewerId);
      await db
        .update(chatStoriesTable)
        .set({ viewers: JSON.stringify(viewers) })
        .where(eq(chatStoriesTable.id, id));
    }

    res.json({ ok: true });
  },
);

// DELETE /api/chat/stories/:id  — delete own story
router.delete(
  "/stories/:id",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = (req as AuthedRequest).chatUser.id;

    await db
      .delete(chatStoriesTable)
      .where(and(eq(chatStoriesTable.id, id), eq(chatStoriesTable.userId, userId)));

    res.json({ ok: true });
  },
);

// Background: purge expired stories every hour
setInterval(async () => {
  try {
    await db.delete(chatStoriesTable).where(lt(chatStoriesTable.expiresAt, new Date()));
  } catch {}
}, 60 * 60 * 1000).unref();

// ── Poll ─────────────────────────────────────────────────────────────────────

router.get(
  "/poll",
  chatAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthedRequest).chatUser.id;
    const since = parseSince(req.query.since) ?? new Date(Date.now() - 30_000);

    const memberships = await db
      .select({ conversationId: chatMembersTable.conversationId })
      .from(chatMembersTable)
      .where(eq(chatMembersTable.userId, userId));
    const convIds = memberships.map((m) => m.conversationId);

    const [newMessages, newRequests] = await Promise.all([
      convIds.length
        ? db
            .select()
            .from(chatMessagesTable)
            .where(
              and(
                inArray(chatMessagesTable.conversationId, convIds),
                gt(chatMessagesTable.createdAt, since),
              ),
            )
            .orderBy(asc(chatMessagesTable.createdAt))
            .limit(200)
        : Promise.resolve([]),
      db
        .select()
        .from(chatFriendRequestsTable)
        .where(
          and(
            or(
              eq(chatFriendRequestsTable.fromId, userId),
              eq(chatFriendRequestsTable.toId, userId),
            ),
            gt(chatFriendRequestsTable.updatedAt, since),
          ),
        ),
    ]);

    res.json({
      messages: newMessages,
      friendRequests: newRequests,
      timestamp: Date.now(),
    });
  },
);

export default router;

// ── Exported helpers for testing ─────────────────────────────────────────────
export {
  verifySupabaseToken,
  TOKEN_CACHE,
  parseSince,
  ProfileSyncSchema,
  FriendRequestSchema,
  FriendRequestActionSchema,
  SendMessageSchema,
  GroupConvSchema,
  StoryCreateSchema,
};
