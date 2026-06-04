import { Router } from "express";
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

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://uuizijhznsbuugxyjcwo.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

interface SupabaseUser {
  id: string;
  email: string;
}

async function verifySupabaseToken(
  token: string,
): Promise<SupabaseUser | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) return null;
    const u = await res.json();
    return { id: u.id, email: u.email ?? "" };
  } catch {
    return null;
  }
}

function chatAuth(req: any, res: any, next: any) {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  verifySupabaseToken(token).then((user) => {
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.chatUser = user;
    req.chatToken = token;
    next();
  });
}

const router = Router();

// ── Profile ────────────────────────────────────────────────────────────────

router.post("/profile/sync", chatAuth, async (req: any, res: any) => {
  const { username, displayName, avatarColor, bio } = req.body ?? {};
  const userId: string = req.chatUser.id;
  const existing = await db
    .select()
    .from(chatProfilesTable)
    .where(eq(chatProfilesTable.id, userId));

  if (existing.length === 0) {
    const un = username || req.chatUser.email?.split("@")[0] || `user_${Date.now()}`;
    const dn = displayName || un;
    await db.insert(chatProfilesTable).values({
      id: userId,
      username: un,
      displayName: dn,
      avatarColor: avatarColor || "#13B734",
      bio: bio || "",
    });
  } else {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (username) patch.username = username;
    if (displayName) patch.displayName = displayName;
    if (avatarColor) patch.avatarColor = avatarColor;
    if (bio !== undefined) patch.bio = bio;
    await db
      .update(chatProfilesTable)
      .set(patch)
      .where(eq(chatProfilesTable.id, userId));
  }
  const profile = await db
    .select()
    .from(chatProfilesTable)
    .where(eq(chatProfilesTable.id, userId));
  res.json(profile[0]);
});

router.get("/profile/me", chatAuth, async (req: any, res: any) => {
  const profile = await db
    .select()
    .from(chatProfilesTable)
    .where(eq(chatProfilesTable.id, req.chatUser.id));
  if (!profile.length) return res.status(404).json({ error: "Not found" });
  res.json(profile[0]);
});

// ── Users ──────────────────────────────────────────────────────────────────

router.get("/users/search", chatAuth, async (req: any, res: any) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json([]);
  const results = await db
    .select()
    .from(chatProfilesTable)
    .where(
      and(
        not(eq(chatProfilesTable.id, req.chatUser.id)),
        or(
          ilike(chatProfilesTable.username, `%${q}%`),
          ilike(chatProfilesTable.displayName, `%${q}%`),
        ),
      ),
    )
    .limit(20);
  res.json(results);
});

router.get("/users", chatAuth, async (req: any, res: any) => {
  const ids = String(req.query.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ids.length) return res.json([]);
  const profiles = await db
    .select()
    .from(chatProfilesTable)
    .where(inArray(chatProfilesTable.id, ids));
  res.json(profiles);
});

// ── Friends ────────────────────────────────────────────────────────────────

router.get("/friends", chatAuth, async (req: any, res: any) => {
  const userId: string = req.chatUser.id;
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
  if (!accepted.length) return res.json([]);
  const friendIds = accepted.map((r) =>
    r.fromId === userId ? r.toId : r.fromId,
  );
  const profiles = await db
    .select()
    .from(chatProfilesTable)
    .where(inArray(chatProfilesTable.id, friendIds));
  res.json(profiles);
});

// ── Friend Requests ────────────────────────────────────────────────────────

router.get("/friend-requests", chatAuth, async (req: any, res: any) => {
  const userId: string = req.chatUser.id;
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
});

router.post("/friend-requests", chatAuth, async (req: any, res: any) => {
  const { toId } = req.body ?? {};
  const fromId: string = req.chatUser.id;
  if (!toId || toId === fromId)
    return res.status(400).json({ error: "Invalid request" });
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
  if (existing.length)
    return res.status(409).json({ error: "Already exists", existing: existing[0] });
  const inserted = await db
    .insert(chatFriendRequestsTable)
    .values({ fromId, toId, status: "pending" })
    .returning();
  res.json(inserted[0]);
});

router.patch("/friend-requests/:id", chatAuth, async (req: any, res: any) => {
  const requestId = parseInt(req.params.id, 10);
  const { action } = req.body ?? {};
  const userId: string = req.chatUser.id;
  const rows = await db
    .select()
    .from(chatFriendRequestsTable)
    .where(eq(chatFriendRequestsTable.id, requestId));
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  const row = rows[0];
  if (action === "cancel") {
    if (row.fromId !== userId)
      return res.status(403).json({ error: "Forbidden" });
    await db
      .delete(chatFriendRequestsTable)
      .where(eq(chatFriendRequestsTable.id, requestId));
    return res.json({ deleted: true });
  }
  if (action === "accept" || action === "reject") {
    if (row.toId !== userId)
      return res.status(403).json({ error: "Forbidden" });
    const updated = await db
      .update(chatFriendRequestsTable)
      .set({ status: action === "accept" ? "accepted" : "rejected", updatedAt: new Date() })
      .where(eq(chatFriendRequestsTable.id, requestId))
      .returning();
    return res.json(updated[0]);
  }
  res.status(400).json({ error: "Invalid action" });
});

// ── Conversations ──────────────────────────────────────────────────────────

router.get("/conversations", chatAuth, async (req: any, res: any) => {
  const userId: string = req.chatUser.id;
  const memberships = await db
    .select({ conversationId: chatMembersTable.conversationId })
    .from(chatMembersTable)
    .where(eq(chatMembersTable.userId, userId));
  if (!memberships.length) return res.json([]);
  const convIds = memberships.map((m) => m.conversationId);
  const convs = await db
    .select()
    .from(chatConversationsTable)
    .where(inArray(chatConversationsTable.id, convIds));
  const allMembers = await db
    .select()
    .from(chatMembersTable)
    .where(inArray(chatMembersTable.conversationId, convIds));
  res.json(
    convs.map((c) => ({
      ...c,
      memberIds: allMembers
        .filter((m) => m.conversationId === c.id)
        .map((m) => m.userId),
    })),
  );
});

router.post("/conversations/direct", chatAuth, async (req: any, res: any) => {
  const { friendId } = req.body ?? {};
  const userId: string = req.chatUser.id;
  if (!friendId) return res.status(400).json({ error: "Missing friendId" });

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
      const conv = await db
        .select()
        .from(chatConversationsTable)
        .where(
          and(
            eq(chatConversationsTable.id, s.conversationId),
            eq(chatConversationsTable.type, "direct"),
          ),
        );
      if (conv.length) return res.json(conv[0].id);
    }
  }

  const convId = randomUUID();
  await db
    .insert(chatConversationsTable)
    .values({ id: convId, type: "direct", createdBy: userId });
  await db
    .insert(chatMembersTable)
    .values([
      { conversationId: convId, userId },
      { conversationId: convId, userId: friendId },
    ]);
  res.json(convId);
});

router.post("/conversations/group", chatAuth, async (req: any, res: any) => {
  const { name, memberIds } = req.body ?? {};
  const userId: string = req.chatUser.id;
  if (!name || !Array.isArray(memberIds))
    return res.status(400).json({ error: "Missing name or memberIds" });
  const convId = randomUUID();
  await db
    .insert(chatConversationsTable)
    .values({ id: convId, type: "group", name, createdBy: userId });
  const allIds = Array.from(new Set([userId, ...memberIds]));
  await db
    .insert(chatMembersTable)
    .values(allIds.map((uid) => ({ conversationId: convId, userId: uid })));
  res.json(convId);
});

router.post(
  "/conversations/:id/members",
  chatAuth,
  async (req: any, res: any) => {
    const { userId: newUserId } = req.body ?? {};
    const convId = req.params.id;
    const existing = await db
      .select()
      .from(chatMembersTable)
      .where(
        and(
          eq(chatMembersTable.conversationId, convId),
          eq(chatMembersTable.userId, newUserId),
        ),
      );
    if (existing.length) return res.json({ already: true });
    await db
      .insert(chatMembersTable)
      .values({ conversationId: convId, userId: newUserId });
    res.json({ added: true });
  },
);

router.delete(
  "/conversations/:id/members/:uid",
  chatAuth,
  async (req: any, res: any) => {
    await db
      .delete(chatMembersTable)
      .where(
        and(
          eq(chatMembersTable.conversationId, req.params.id),
          eq(chatMembersTable.userId, req.params.uid),
        ),
      );
    res.json({ removed: true });
  },
);

// ── Messages ───────────────────────────────────────────────────────────────

router.get(
  "/conversations/:id/messages",
  chatAuth,
  async (req: any, res: any) => {
    const convId = req.params.id;
    const userId: string = req.chatUser.id;
    const membership = await db
      .select()
      .from(chatMembersTable)
      .where(
        and(
          eq(chatMembersTable.conversationId, convId),
          eq(chatMembersTable.userId, userId),
        ),
      );
    if (!membership.length) return res.status(403).json({ error: "Forbidden" });
    const sinceRaw = req.query.since;
    const since = sinceRaw
      ? new Date(parseInt(String(sinceRaw), 10))
      : undefined;
    let q = db
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
    const msgs = await q;
    res.json(msgs);
  },
);

router.post(
  "/conversations/:id/messages",
  chatAuth,
  async (req: any, res: any) => {
    const convId = req.params.id;
    const userId: string = req.chatUser.id;
    const membership = await db
      .select()
      .from(chatMembersTable)
      .where(
        and(
          eq(chatMembersTable.conversationId, convId),
          eq(chatMembersTable.userId, userId),
        ),
      );
    if (!membership.length) return res.status(403).json({ error: "Forbidden" });
    const { type, text, mediaUrl, fileName, fileSize, fileMimeType, audioDuration, sticker } =
      req.body ?? {};
    const msgId = randomUUID();
    const inserted = await db
      .insert(chatMessagesTable)
      .values({
        id: msgId,
        conversationId: convId,
        senderId: userId,
        type: type || "text",
        text: text || null,
        mediaUrl: mediaUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        fileMimeType: fileMimeType || null,
        audioDuration: audioDuration || null,
        sticker: sticker || null,
      })
      .returning();
    res.json(inserted[0]);
  },
);

// ── Poll ───────────────────────────────────────────────────────────────────

router.get("/poll", chatAuth, async (req: any, res: any) => {
  const userId: string = req.chatUser.id;
  const sinceRaw = req.query.since;
  const since = sinceRaw
    ? new Date(parseInt(String(sinceRaw), 10))
    : new Date(Date.now() - 30_000);

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
});

export default router;
