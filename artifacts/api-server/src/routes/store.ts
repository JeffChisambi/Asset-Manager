import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, storesTable } from "@workspace/db";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

// Get current merchant's store
router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;

  try {
    const [store] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.merchantId, merchantId))
      .limit(1);

    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    res.json(store);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create merchant's store
router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const { name, logoUrl, description, phone, email, address, merchantType } = req.body;

  if (!name) {
    res.status(400).json({ error: "Store name is required" });
    return;
  }

  try {
    // Check if store already exists
    const [existing] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.merchantId, merchantId))
      .limit(1);

    if (existing) {
      res.status(400).json({ error: "Merchant already has a store" });
      return;
    }

    const [newStore] = await db
      .insert(storesTable)
      .values({
        merchantId,
        name,
        merchantType: merchantType || "basic_shop",
        logoUrl: logoUrl || null,
        description: description || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
      })
      .returning();

    res.json(newStore);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update merchant's store
router.put("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const { name, logoUrl, coverImageUrl, themeColor, description, phone, email, address, merchantType } = req.body;

  try {
    const [existing] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.merchantId, merchantId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    const [updatedStore] = await db
      .update(storesTable)
      .set({
        name: name !== undefined ? name : existing.name,
        merchantType: merchantType !== undefined ? merchantType : existing.merchantType,
        logoUrl: logoUrl !== undefined ? logoUrl : existing.logoUrl,
        coverImageUrl: coverImageUrl !== undefined ? coverImageUrl : existing.coverImageUrl,
        themeColor: themeColor !== undefined ? themeColor : existing.themeColor,
        description: description !== undefined ? description : existing.description,
        phone: phone !== undefined ? phone : existing.phone,
        email: email !== undefined ? email : existing.email,
        address: address !== undefined ? address : existing.address,
        updatedAt: new Date(),
      })
      .where(eq(storesTable.id, existing.id))
      .returning();

    res.json(updatedStore);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
