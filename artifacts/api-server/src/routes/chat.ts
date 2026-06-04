import { Router, type Request, type Response, type NextFunction } from "express";
import { and, asc, eq, gt, ilike, inArray, not, or } from "drizzle-orm";
import {
  chatConversationsTable,
  chatFriendRequestsTable,
  chatMembersTable,
  chatMessagesTable,
  chatProfilesTable,
  db,
} from "@workspace/db";
import { randomUUID } from "crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";

// ── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://uuizijhznsbuugxyjcwo.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// ── Token cache (avoid hitting Supabase on every request) ────────────────────
// Tokens are cached for 4 minutes; Supabase JWTs expire after 1 hour.

interface CacheEntry {
  user: SupabaseUser;
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

interface SupabaseUser {
  id: string;
  email: string;
}

async function verifySupabaseToken(
  token: string,
): Promise<SupabaseUser | null> {
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
    const user: SupabaseUser = { id: u.id, email: u.email ?? "" };
    TOKEN_CACHE.set(token, { user, expiresAt: Date.now() + TOKEN_TTL_MS });
    return user;
  } catch {
    return null;
  }
}

interface AuthedRequest extends Request {
  chatUser: SupabaseUser;
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
    const user = await verifySupabaseToken(token);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    (req as AuthedRequest).chatUser = user;
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
        bio: body.bio ?? "",
      });
    } else {
      // Existing profile — update mutable fields only (username is NOT updatable here)
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (body.displayName) patch.displayName = body.displayName;
      if (body.avatarColor) patch.avatarColor = body.avatarColor;
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
            ilike(chatProfilesTable.username, `%${query.q}%`),
            ilike(chatProfilesTable.displayName, `%${query.q}%`),
          ),
        ),
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
};
