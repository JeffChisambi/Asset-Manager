// artifacts/api-server/src/routes/public.ts
import { Router } from "express";
import { eq, ilike, or, inArray } from "drizzle-orm";
import { db, storesTable, productsTable, merchantsTable } from "@workspace/db";

const router = Router();

function getApiOrigin(req: any) {
  return `${req.protocol}://${req.get("host")}`;
}

function toAbsoluteUrl(req: any, url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  return `${getApiOrigin(req)}${normalizedPath}`;
}

// Helper to format products for the mobile app
function formatProduct(req: any, p: any, storeName: string, storeType: string) {
  const tagsList = p.tags ? p.tags.split(",").map((t: string) => t.trim()) : [];
  if (p.category) tagsList.push(p.category);
  const shopType =
    storeType === "basic_shop" ? "Basic Store" :
    storeType === "vendor" ? "Vendor" :
    "Super Store";

  return {
    id: String(p.id),
    store_id: String(p.storeId),
    name: p.name,
    brand: p.brand || storeName || "Doorstep",
    price: Number(p.price),
    originalPrice: p.discountPrice ? Number(p.discountPrice) : undefined,
    image_url: toAbsoluteUrl(req, p.imageUrl),
    category: p.category || "General",
    rating: 5.0,
    reviews: 12,
    availableItems: p.stock,
    description: p.description || `A premium quality item from ${storeName}.`,
    shopType,
    shopId: String(p.storeId),
    shopName: storeName,
    tags: tagsList,
  };
}

// Helper to format stores for the mobile app
function formatStore(req: any, s: any, products: any[]) {
  const storeType = s.merchantType || s.merchant_type || (s.logoUrl && s.logoUrl.includes("vendor") ? "vendor" : "basic_shop");
  const shopTypeLabel = storeType === "basic_shop" ? "Basic Store" : storeType === "vendor" ? "Vendor" : "Super Store";

  return {
    id: String(s.id),
    owner_id: String(s.merchantId),
    chat_profile_id: s.chatProfileId || null,
    name: s.name,
    tagline: s.description || "Your neighborhood Doorstep store",
    emoji: s.name.toLowerCase().includes("kids") ? "👶" : s.name.toLowerCase().includes("run") ? "🏃" : "👟",
    accent_color: storeType === "basic_shop" ? "#13B734" : storeType === "vendor" ? "#F7971E" : "#FF9F43",
    cover_gradient_start: storeType === "basic_shop" ? "#13B734" : storeType === "vendor" ? "#F7971E" : "#FF9F43",
    cover_gradient_end: storeType === "basic_shop" ? "#11998E" : storeType === "vendor" ? "#FF9F43" : "#FFA500",
    cover_image_url: toAbsoluteUrl(req, s.logoUrl),
    merchant_type: storeType,
    is_active: true,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
    products: products.map(p => formatProduct(req, p, s.name, storeType)),
  };
}

// GET /public/stores - List all stores with their products
router.get("/stores", async (req, res) => {
  const merchantType = req.query.merchantType as string; // "basic_shop" | "vendor" | "super_store"

  try {
    const allStores = await db.select().from(storesTable);
    const resultStores = [];

    for (const store of allStores) {
      // Fetch products for this store
      const products = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.storeId, store.id));

      const formatted = formatStore(req, store, products);

      // Filter by merchantType if specified
      if (merchantType && formatted.merchant_type !== merchantType) {
        continue;
      }

      resultStores.push(formatted);
    }

    res.json(resultStores);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /public/products/:id - Single product details (returns product + store wrapper)
router.get("/products/:id", async (req, res) => {
  const idStr = req.params.id;
  const id = parseInt(idStr);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  try {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const [store] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.id, product.storeId))
      .limit(1);

    if (!store) {
      res.status(404).json({ error: "Store not found for this product" });
      return;
    }

    const storeType = store.merchantType || (store.logoUrl && store.logoUrl.includes("vendor") ? "vendor" : "basic_shop");
    res.json({
      product: {
        id: String(product.id),
        store_id: String(product.storeId),
        name: product.name,
        price: Number(product.price),
        image_url: toAbsoluteUrl(req, product.imageUrl),
        brand: product.brand || store.name || "Doorstep",
        category: product.category || "General",
        rating: 5.0,
        availableItems: product.stock,
        description: product.description || `A premium quality item from ${store.name}.`,
        shopId: String(store.id),
        shopName: store.name,
        shopType: storeType === "basic_shop" ? "Basic Store" : storeType === "vendor" ? "Vendor" : "Super Store",
      },
      store: {
        id: String(store.id),
        owner_id: String(store.merchantId),
        name: store.name,
        cover_image_url: toAbsoluteUrl(req, store.logoUrl),
        logo_url: toAbsoluteUrl(req, store.logoUrl),
        tagline: store.description || null,
        description: store.description || null,
        merchant_type: storeType,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /public/search - Global fuzzy search for stores and products
router.get("/search", async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    res.json({ stores: [], products: [] });
    return;
  }

  try {
    const q = `%${query}%`;
    const foundStores = await db
      .select()
      .from(storesTable)
      .where(or(ilike(storesTable.name, q), ilike(storesTable.description, q)))
      .limit(20);

    const formattedStores = foundStores.map(s => {
      return formatStore(req, s, []);
    });

    const foundProducts = await db
      .select()
      .from(productsTable)
      .where(or(ilike(productsTable.name, q), ilike(productsTable.category, q), ilike(productsTable.brand, q)))
      .limit(50);

    const storeIds = [...new Set(foundProducts.map(p => p.storeId))];
    const relatedStores = storeIds.length > 0
      ? await db.select().from(storesTable).where(inArray(storesTable.id, storeIds))
      : [];
    const storeMap = new Map(relatedStores.map(s => [s.id, s]));

    const formattedProducts = foundProducts.map(p => {
      const s = storeMap.get(p.storeId);
      const storeName = s?.name || "Doorstep";
      const storeType = s?.merchantType || "basic_shop";
      return formatProduct(req, p, storeName, storeType);
    });

    res.json({
      stores: formattedStores,
      products: formattedProducts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
// GET /public/stores/by-profile/:chatProfileId - Get all stores linked to a chat profile
router.get("/stores/by-profile/:chatProfileId", async (req, res) => {
  const { chatProfileId } = req.params;
  if (!chatProfileId) {
    res.status(400).json({ error: "chatProfileId is required" });
    return;
  }
  try {
    const foundStores = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.chatProfileId, chatProfileId));

    const result = [];
    for (const store of foundStores) {
      const products = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.storeId, store.id));
      result.push(formatStore(req, store, products));
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /public/stores/link-profile - Link a chat profile UUID to a store by storeId
// Body: { storeId: number, chatProfileId: string, ownerSecret: string }
// ownerSecret is just the merchantId to verify ownership without full auth (lightweight)
router.post("/stores/link-profile", async (req, res) => {
  const { storeId, chatProfileId, merchantId } = req.body;
  if (!storeId || !chatProfileId || !merchantId) {
    res.status(400).json({ error: "storeId, chatProfileId, and merchantId are required" });
    return;
  }
  try {
    const numericMerchantId = parseInt(String(merchantId));
    const numericStoreId = parseInt(String(storeId));
    if (isNaN(numericMerchantId) || isNaN(numericStoreId)) {
      res.status(400).json({ error: "Invalid storeId or merchantId" });
      return;
    }
    // Verify the merchant actually owns this store
    const [store] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.id, numericStoreId))
      .limit(1);

    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }
    if (store.merchantId !== numericMerchantId) {
      res.status(403).json({ error: "Merchant does not own this store" });
      return;
    }

    const [updated] = await db
      .update(storesTable)
      .set({ chatProfileId })
      .where(eq(storesTable.id, numericStoreId))
      .returning();

    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.storeId, numericStoreId));

    res.json(formatStore(req, updated, products));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Helper: find or create a phantom merchant for a mobile chat profile ────
async function findOrCreatePhantomMerchant(chatProfileId: string): Promise<number> {
  const syntheticEmail = `mobile-${chatProfileId}@doorstep.internal`;
  const [existing] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.email, syntheticEmail))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db
    .insert(merchantsTable)
    .values({ email: syntheticEmail, password: `mobile-${Date.now()}` })
    .returning();
  return created.id;
}

// ─── Helper: generate a unique SKU ────────────────────────────────────────────
function generateSku(storeId: number, productName: string): string {
  const slug = productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 20);
  return `${storeId}-${slug}-${Date.now().toString(36)}`;
}

// POST /public/stores/create-from-profile
// Creates a store directly from a mobile chat profile. Auto-creates a phantom
// merchant account so the DB FK constraint is satisfied.
router.post("/stores/create-from-profile", async (req, res) => {
  const {
    chatProfileId,
    name,
    tagline,
    emoji,
    accent_color,
    cover_gradient_start,
    cover_gradient_end,
    cover_image_url,
    merchant_type,
    products = [],
  } = req.body;

  if (!chatProfileId || !name) {
    res.status(400).json({ error: "chatProfileId and name are required" });
    return;
  }

  try {
    // Check if a store already exists for this chatProfileId
    const [existingStore] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.chatProfileId, chatProfileId))
      .limit(1);

    if (existingStore) {
      // Return existing store so the app stays in sync
      const existingProducts = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.storeId, existingStore.id));
      res.json(formatStore(req, existingStore, existingProducts));
      return;
    }

    const merchantId = await findOrCreatePhantomMerchant(chatProfileId);

    const [newStore] = await db
      .insert(storesTable)
      .values({
        merchantId,
        name,
        merchantType: merchant_type || "basic_shop",
        description: tagline || null,
        logoUrl: cover_image_url || null,
        chatProfileId,
      })
      .returning();

    const insertedProducts: any[] = [];
    for (const p of products) {
      try {
        const sku = generateSku(newStore.id, p.name || "product");
        const [prod] = await db
          .insert(productsTable)
          .values({
            merchantId,
            storeId: newStore.id,
            name: String(p.name || "Unnamed"),
            price: Number(p.price) || 0,
            stock: Number(p.stock ?? p.availableItems ?? 0),
            category: p.category || "General",
            sku,
            brand: p.brand || name,
            imageUrl: p.image_url || p.imageUrl || null,
            description: p.description || null,
          })
          .returning();
        insertedProducts.push(prod);
      } catch (prodErr) {
        console.warn("Skipped product during create:", prodErr);
      }
    }

    res.status(201).json(formatStore(req, newStore, insertedProducts));
  } catch (err: any) {
    console.error("create-from-profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /public/stores/update-from-profile/:chatProfileId
// Updates the store linked to a mobile chat profile, replacing all products.
router.put("/stores/update-from-profile/:chatProfileId", async (req, res) => {
  const { chatProfileId } = req.params;
  const {
    name,
    tagline,
    cover_image_url,
    merchant_type,
    products = [],
    is_active,
  } = req.body;

  if (!chatProfileId) {
    res.status(400).json({ error: "chatProfileId is required" });
    return;
  }

  try {
    const [store] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.chatProfileId, chatProfileId))
      .limit(1);

    if (!store) {
      res.status(404).json({ error: "Store not found for this profile" });
      return;
    }

    const [updatedStore] = await db
      .update(storesTable)
      .set({
        name: name || store.name,
        description: tagline !== undefined ? tagline : store.description,
        logoUrl: cover_image_url !== undefined ? cover_image_url : store.logoUrl,
        merchantType: merchant_type || store.merchantType,
        updatedAt: new Date(),
      })
      .where(eq(storesTable.id, store.id))
      .returning();

    // Replace all products: delete existing then re-insert
    await db.delete(productsTable).where(eq(productsTable.storeId, store.id));

    const insertedProducts: any[] = [];
    for (const p of products) {
      try {
        const sku = generateSku(store.id, p.name || "product");
        const [prod] = await db
          .insert(productsTable)
          .values({
            merchantId: store.merchantId,
            storeId: store.id,
            name: String(p.name || "Unnamed"),
            price: Number(p.price) || 0,
            stock: Number(p.stock ?? p.availableItems ?? 0),
            category: p.category || "General",
            sku,
            brand: p.brand || updatedStore.name,
            imageUrl: p.image_url || p.imageUrl || null,
            description: p.description || null,
          })
          .returning();
        insertedProducts.push(prod);
      } catch (prodErr) {
        console.warn("Skipped product during update:", prodErr);
      }
    }

    res.json(formatStore(req, updatedStore, insertedProducts));
  } catch (err: any) {
    console.error("update-from-profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
