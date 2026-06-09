import { Router } from "express";
import { and, avg, count, eq, sql } from "drizzle-orm";
import {
  db,
  storesTable,
  storeReviewsTable,
  storeFollowersTable,
  chatProfilesTable,
} from "@workspace/db";
import { chatAuth, type AuthedRequest } from "../middlewares/chatAuth";

const router = Router();

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Validates the store exists and returns its DB id (or null). */
async function requireStore(storeId: number) {
  const [store] = await db
    .select({ id: storesTable.id })
    .from(storesTable)
    .where(eq(storesTable.id, storeId))
    .limit(1);
  return store ?? null;
}

/**
 * Returns the current aggregate stats for a store in a single query.
 * Production-grade: both aggregates are computed by the DB, not application code.
 */
async function getStoreStats(storeId: number) {
  const [reviewStats] = await db
    .select({
      avgRating: sql<string>`coalesce(avg(${storeReviewsTable.rating})::numeric(3,1), 0.0)`,
      reviewCount: sql<string>`count(*)`,
    })
    .from(storeReviewsTable)
    .where(eq(storeReviewsTable.storeId, storeId));

  const [followerStats] = await db
    .select({
      followerCount: sql<string>`count(*)`,
    })
    .from(storeFollowersTable)
    .where(eq(storeFollowersTable.storeId, storeId));

  return {
    rating: parseFloat(reviewStats?.avgRating ?? "0"),
    reviews: parseInt(reviewStats?.reviewCount ?? "0", 10),
    followers: parseInt(followerStats?.followerCount ?? "0", 10),
  };
}

// ── Status ────────────────────────────────────────────────────────────────────

/**
 * GET /:storeId/status
 * Returns the authenticated user's follow and review state for a store,
 * plus the latest aggregate stats (so the client can sync the header).
 */
router.get("/:storeId/status", chatAuth, async (req, res) => {
  const storeId = parseInt(req.params.storeId, 10);
  if (isNaN(storeId)) { res.status(400).json({ error: "Invalid store ID" }); return; }
  const userId = (req as AuthedRequest).chatUser.id;

  try {
    const [follow] = await db
      .select()
      .from(storeFollowersTable)
      .where(and(eq(storeFollowersTable.storeId, storeId), eq(storeFollowersTable.userId, userId)))
      .limit(1);

    const [review] = await db
      .select({
        id: storeReviewsTable.id,
        rating: storeReviewsTable.rating,
        text: storeReviewsTable.text,
        createdAt: storeReviewsTable.createdAt,
        updatedAt: storeReviewsTable.updatedAt,
        user: {
          id: chatProfilesTable.id,
          username: chatProfilesTable.username,
          displayName: chatProfilesTable.displayName,
          avatarUrl: chatProfilesTable.avatarUrl,
        },
      })
      .from(storeReviewsTable)
      .innerJoin(chatProfilesTable, eq(storeReviewsTable.userId, chatProfilesTable.id))
      .where(and(eq(storeReviewsTable.storeId, storeId), eq(storeReviewsTable.userId, userId)))
      .limit(1);

    const stats = await getStoreStats(storeId);

    res.json({
      isFollowing: !!follow,
      userReview: review ?? null,
      stats,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Followers ─────────────────────────────────────────────────────────────────

/**
 * POST /:storeId/followers  →  follow a store
 * Returns { success, stats } so the client can immediately update the header.
 */
router.post("/:storeId/followers", chatAuth, async (req, res) => {
  const storeId = parseInt(req.params.storeId, 10);
  if (isNaN(storeId)) { res.status(400).json({ error: "Invalid store ID" }); return; }
  const userId = (req as AuthedRequest).chatUser.id;

  try {
    if (!(await requireStore(storeId))) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    await db
      .insert(storeFollowersTable)
      .values({ storeId, userId })
      .onConflictDoNothing();

    const stats = await getStoreStats(storeId);
    res.status(201).json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /:storeId/followers  →  unfollow a store
 * Returns { success, stats }.
 */
router.delete("/:storeId/followers", chatAuth, async (req, res) => {
  const storeId = parseInt(req.params.storeId, 10);
  if (isNaN(storeId)) { res.status(400).json({ error: "Invalid store ID" }); return; }
  const userId = (req as AuthedRequest).chatUser.id;

  try {
    await db
      .delete(storeFollowersTable)
      .where(and(eq(storeFollowersTable.storeId, storeId), eq(storeFollowersTable.userId, userId)));

    const stats = await getStoreStats(storeId);
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reviews ───────────────────────────────────────────────────────────────────

/**
 * POST /:storeId/reviews  →  create or update the user's review (one per user per store)
 * Returns { success, review, stats } — stats carry the freshly recalculated
 * average rating and review count so the header updates without a second round-trip.
 */
router.post("/:storeId/reviews", chatAuth, async (req, res) => {
  const storeId = parseInt(req.params.storeId, 10);
  if (isNaN(storeId)) { res.status(400).json({ error: "Invalid store ID" }); return; }
  const userId = (req as AuthedRequest).chatUser.id;

  const { rating, text } = req.body;
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    res.status(400).json({ error: "Rating must be an integer 1–5" });
    return;
  }

  try {
    if (!(await requireStore(storeId))) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    // Upsert: one review per user per store
    const [upserted] = await db
      .insert(storeReviewsTable)
      .values({ storeId, userId, rating: ratingNum, text: text ?? null })
      .onConflictDoUpdate({
        target: [storeReviewsTable.storeId, storeReviewsTable.userId],
        set: { rating: ratingNum, text: text ?? null, updatedAt: new Date() },
      })
      .returning();

    // Join the chat profile so the client gets the full review shape
    const [fullReview] = await db
      .select({
        id: storeReviewsTable.id,
        rating: storeReviewsTable.rating,
        text: storeReviewsTable.text,
        createdAt: storeReviewsTable.createdAt,
        updatedAt: storeReviewsTable.updatedAt,
        user: {
          id: chatProfilesTable.id,
          username: chatProfilesTable.username,
          displayName: chatProfilesTable.displayName,
          avatarUrl: chatProfilesTable.avatarUrl,
        },
      })
      .from(storeReviewsTable)
      .innerJoin(chatProfilesTable, eq(storeReviewsTable.userId, chatProfilesTable.id))
      .where(eq(storeReviewsTable.id, upserted.id))
      .limit(1);

    // Fresh aggregate stats from the DB — single source of truth
    const stats = await getStoreStats(storeId);

    res.status(201).json({ success: true, review: fullReview, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /:storeId/reviews/:reviewId
 * Returns { success, stats } with recalculated aggregates.
 */
router.delete("/:storeId/reviews/:reviewId", chatAuth, async (req, res) => {
  const storeId = parseInt(req.params.storeId, 10);
  const reviewId = parseInt(req.params.reviewId, 10);
  if (isNaN(storeId) || isNaN(reviewId)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const userId = (req as AuthedRequest).chatUser.id;

  try {
    const deleted = await db
      .delete(storeReviewsTable)
      .where(
        and(
          eq(storeReviewsTable.id, reviewId),
          eq(storeReviewsTable.storeId, storeId),
          eq(storeReviewsTable.userId, userId)
        )
      )
      .returning();

    if (!deleted.length) {
      res.status(404).json({ error: "Review not found or unauthorized" });
      return;
    }

    const stats = await getStoreStats(storeId);
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
