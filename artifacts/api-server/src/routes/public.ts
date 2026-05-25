// artifacts/api-server/src/routes/public.ts
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, storesTable, productsTable } from "@workspace/db";

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

export default router;
