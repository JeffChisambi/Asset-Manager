import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// ── parseSince (copied from chat.ts for unit testing) ────────────────────────

function parseSince(raw: unknown): Date | undefined {
  if (raw == null) return undefined;
  const ms = parseInt(String(raw), 10);
  if (isNaN(ms) || ms < 0) return undefined;
  return new Date(ms);
}

// ── Validation schemas (mirrors chat.ts) ─────────────────────────────────────

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

const FriendRequestSchema = z.object({
  toId: z.string().uuid("toId must be a valid UUID"),
});

const FriendRequestActionSchema = z.object({
  action: z.enum(["accept", "reject", "cancel"]),
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

const GroupConvSchema = z.object({
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string().uuid()).min(1).max(99),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("parseSince", () => {
  test("returns undefined for null", () => {
    assert.equal(parseSince(null), undefined);
  });

  test("returns undefined for undefined", () => {
    assert.equal(parseSince(undefined), undefined);
  });

  test("returns undefined for NaN-producing string", () => {
    assert.equal(parseSince("abc"), undefined);
  });

  test("returns undefined for negative number", () => {
    assert.equal(parseSince(-1), undefined);
  });

  test("returns undefined for empty string", () => {
    assert.equal(parseSince(""), undefined);
  });

  test("parses a valid millisecond timestamp", () => {
    const ts = 1700000000000;
    const result = parseSince(String(ts));
    assert.ok(result instanceof Date, "should return a Date");
    assert.equal(result.getTime(), ts);
  });

  test("parses zero as epoch", () => {
    const result = parseSince("0");
    assert.ok(result instanceof Date);
    assert.equal(result!.getTime(), 0);
  });

  test("accepts number type directly", () => {
    const ts = 1700000000000;
    const result = parseSince(ts);
    assert.ok(result instanceof Date);
    assert.equal(result!.getTime(), ts);
  });
});

describe("ProfileSyncSchema", () => {
  test("accepts empty object", () => {
    const r = ProfileSyncSchema.safeParse({});
    assert.ok(r.success);
  });

  test("accepts valid username", () => {
    const r = ProfileSyncSchema.safeParse({ username: "john_doe123" });
    assert.ok(r.success);
  });

  test("rejects username with uppercase", () => {
    const r = ProfileSyncSchema.safeParse({ username: "JohnDoe" });
    assert.ok(!r.success);
  });

  test("rejects username shorter than 2 chars", () => {
    const r = ProfileSyncSchema.safeParse({ username: "a" });
    assert.ok(!r.success);
  });

  test("rejects username longer than 30 chars", () => {
    const r = ProfileSyncSchema.safeParse({ username: "a".repeat(31) });
    assert.ok(!r.success);
  });

  test("rejects invalid avatarColor", () => {
    const r = ProfileSyncSchema.safeParse({ avatarColor: "red" });
    assert.ok(!r.success);
  });

  test("accepts valid hex avatarColor", () => {
    const r = ProfileSyncSchema.safeParse({ avatarColor: "#13B734" });
    assert.ok(r.success);
  });

  test("rejects bio longer than 500 chars", () => {
    const r = ProfileSyncSchema.safeParse({ bio: "x".repeat(501) });
    assert.ok(!r.success);
  });
});

describe("FriendRequestSchema", () => {
  test("accepts valid UUID", () => {
    const r = FriendRequestSchema.safeParse({ toId: "123e4567-e89b-12d3-a456-426614174000" });
    assert.ok(r.success);
  });

  test("rejects non-UUID toId", () => {
    const r = FriendRequestSchema.safeParse({ toId: "not-a-uuid" });
    assert.ok(!r.success);
  });

  test("rejects missing toId", () => {
    const r = FriendRequestSchema.safeParse({});
    assert.ok(!r.success);
  });
});

describe("FriendRequestActionSchema", () => {
  test("accepts accept", () => {
    assert.ok(FriendRequestActionSchema.safeParse({ action: "accept" }).success);
  });

  test("accepts reject", () => {
    assert.ok(FriendRequestActionSchema.safeParse({ action: "reject" }).success);
  });

  test("accepts cancel", () => {
    assert.ok(FriendRequestActionSchema.safeParse({ action: "cancel" }).success);
  });

  test("rejects unknown action", () => {
    assert.ok(!FriendRequestActionSchema.safeParse({ action: "delete" }).success);
  });

  test("rejects missing action", () => {
    assert.ok(!FriendRequestActionSchema.safeParse({}).success);
  });
});

describe("SendMessageSchema", () => {
  test("accepts minimal text message", () => {
    const r = SendMessageSchema.safeParse({ type: "text", text: "Hello!" });
    assert.ok(r.success);
  });

  test("rejects unknown message type", () => {
    const r = SendMessageSchema.safeParse({ type: "gif" });
    assert.ok(!r.success);
  });

  test("rejects text longer than 4000 chars", () => {
    const r = SendMessageSchema.safeParse({ type: "text", text: "x".repeat(4001) });
    assert.ok(!r.success);
  });

  test("rejects invalid mediaUrl", () => {
    const r = SendMessageSchema.safeParse({ type: "image", mediaUrl: "not-a-url" });
    assert.ok(!r.success);
  });

  test("accepts valid mediaUrl", () => {
    const r = SendMessageSchema.safeParse({ type: "image", mediaUrl: "https://cdn.example.com/img.jpg" });
    assert.ok(r.success);
  });

  test("rejects fileSize above 100 MB", () => {
    const r = SendMessageSchema.safeParse({ type: "file", fileSize: 200 * 1024 * 1024 });
    assert.ok(!r.success);
  });

  test("accepts fileSize at exactly 100 MB", () => {
    const r = SendMessageSchema.safeParse({ type: "file", fileSize: 100 * 1024 * 1024 });
    assert.ok(r.success);
  });

  test("accepts sticker message", () => {
    const r = SendMessageSchema.safeParse({ type: "sticker", sticker: "🎉" });
    assert.ok(r.success);
  });
});

describe("GroupConvSchema", () => {
  test("accepts valid group", () => {
    const r = GroupConvSchema.safeParse({
      name: "My Group",
      memberIds: ["123e4567-e89b-12d3-a456-426614174000"],
    });
    assert.ok(r.success);
  });

  test("rejects empty name", () => {
    const r = GroupConvSchema.safeParse({
      name: "",
      memberIds: ["123e4567-e89b-12d3-a456-426614174000"],
    });
    assert.ok(!r.success);
  });

  test("rejects empty memberIds", () => {
    const r = GroupConvSchema.safeParse({ name: "Group", memberIds: [] });
    assert.ok(!r.success);
  });

  test("rejects non-UUID memberIds", () => {
    const r = GroupConvSchema.safeParse({ name: "Group", memberIds: ["not-a-uuid"] });
    assert.ok(!r.success);
  });

  test("rejects name longer than 100 chars", () => {
    const r = GroupConvSchema.safeParse({
      name: "x".repeat(101),
      memberIds: ["123e4567-e89b-12d3-a456-426614174000"],
    });
    assert.ok(!r.success);
  });
});
