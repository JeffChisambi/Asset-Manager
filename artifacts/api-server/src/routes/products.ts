import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db, productsTable, storesTable } from "@workspace/db";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth";

const router = Router();
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

function getApiOrigin(req: AuthenticatedRequest) {
  return `${req.protocol}://${req.get("host")}`;
}

function toAbsoluteUploadUrl(req: AuthenticatedRequest, imageUrl: string | null | undefined) {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const normalizedPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return `${getApiOrigin(req)}${normalizedPath}`;
}

function cleanOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return String(value);
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Helper to get merchant store
async function getMerchantStore(merchantId: number) {
  const [store] = await db
    .select()
    .from(storesTable)
    .where(eq(storesTable.merchantId, merchantId))
    .limit(1);
  return store;
}

router.post("/upload-image", requireAuth, upload.single("file"), async (req: AuthenticatedRequest, res) => {
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
});
router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const search = req.query.search as string;
  const category = req.query.category as string;
  const sortBy = (req.query.sortBy as string) || "createdAt";
  const sortOrder = (req.query.sortOrder as string) || "desc";
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const store = await getMerchantStore(merchantId);
    if (!store) {
      res.status(400).json({ error: "No store found. Please create a store first." });
      return;
    }

    const conditions = [eq(productsTable.storeId, store.id)];

    if (category) {
      conditions.push(eq(productsTable.category, category));
    }

    if (search) {
      conditions.push(
        or(
          like(productsTable.name, `%${search}%`),
          like(productsTable.sku, `%${search}%`),
          like(productsTable.brand, `%${search}%`)
        )!
      );
    }

    let orderColumn = desc(productsTable.createdAt);
    if (sortBy === "name") {
      orderColumn = sortOrder === "asc" ? asc(productsTable.name) : desc(productsTable.name);
    } else if (sortBy === "price") {
      orderColumn = sortOrder === "asc" ? asc(productsTable.price) : desc(productsTable.price);
    } else if (sortBy === "stock") {
      orderColumn = sortOrder === "asc" ? asc(productsTable.stock) : desc(productsTable.stock);
    }

    const offset = (page - 1) * limit;

    const products = await db
      .select()
      .from(productsTable)
      .where(and(...conditions))
      .orderBy(orderColumn)
      .limit(limit)
      .offset(offset);

    const [countRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productsTable)
      .where(and(...conditions));

    const total = Number(countRes?.count || 0);

    res.json({
      products,
      total,
      page,
      limit,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const {
    name,
    description,
    price,
    stock,
    category,
    sku,
    brand,
    imageUrl,
    discountPrice,
    weight,
    tags,
  } = req.body;

  if (!name || price === undefined || stock === undefined || !sku) {
    res.status(400).json({ error: "Missing required fields (name, price, stock, sku)" });
    return;
  }

  try {
    const store = await getMerchantStore(merchantId);
    if (!store) {
      res.status(400).json({ error: "No store found. Please create a store first." });
      return;
    }

    // Check SKU conflicts within store
    const [existing] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.storeId, store.id), eq(productsTable.sku, sku)))
      .limit(1);

    if (existing) {
      res.status(400).json({ error: `SKU '${sku}' already exists in your store.` });
      return;
    }

    const [newProduct] = await db
      .insert(productsTable)
      .values({
        merchantId,
        storeId: store.id,
        name,
        description: cleanOptionalText(description),
        price: Number(price),
        stock: Number(stock),
        category: cleanOptionalText(category),
        sku,
        brand: cleanOptionalText(brand),
        imageUrl: cleanOptionalText(imageUrl),
        discountPrice: discountPrice !== undefined ? Number(discountPrice) : null,
        weight: weight !== undefined ? Number(weight) : null,
        tags: tags || null,
      })
      .returning();

    res.json(newProduct);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Delete products
router.post("/bulk-delete", requireAuth, async (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "Product IDs array is required" });
    return;
  }

  try {
    const store = await getMerchantStore(merchantId);
    if (!store) {
      res.status(400).json({ error: "No store found" });
      return;
    }

    const deleted = await db
      .delete(productsTable)
      .where(and(eq(productsTable.storeId, store.id), inArray(productsTable.id, ids)))
      .returning();

    res.json({
      success: true,
      count: deleted.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const productId = parseInt(req.params.id as string, 10);
  if (Number.isNaN(productId)) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }
  const {
    name,
    description,
    price,
    stock,
    category,
    sku,
    brand,
    imageUrl,
    discountPrice,
    weight,
    tags,
  } = req.body;

  try {
    const store = await getMerchantStore(merchantId);
    if (!store) {
      res.status(400).json({ error: "No store found" });
      return;
    }

    // Verify product ownership
    const [product] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.storeId, store.id)))
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    // If SKU is changing, check duplicate conflict
    if (sku && sku !== product.sku) {
      const [existing] = await db
        .select()
        .from(productsTable)
        .where(and(eq(productsTable.storeId, store.id), eq(productsTable.sku, sku)))
        .limit(1);

      if (existing) {
        res.status(400).json({ error: `SKU '${sku}' already exists in your store.` });
        return;
      }
    }

    const [updatedProduct] = await db
      .update(productsTable)
      .set({
        name: name !== undefined ? name : product.name,
        description: description !== undefined ? cleanOptionalText(description) : product.description,
        price: price !== undefined ? Number(price) : product.price,
        stock: stock !== undefined ? Number(stock) : product.stock,
        category: category !== undefined ? cleanOptionalText(category) : product.category,
        sku: sku !== undefined ? sku : product.sku,
        brand: brand !== undefined ? cleanOptionalText(brand) : product.brand,
        imageUrl: imageUrl !== undefined ? cleanOptionalText(imageUrl) : product.imageUrl,
        discountPrice: discountPrice !== undefined ? (discountPrice !== null ? Number(discountPrice) : null) : product.discountPrice,
        weight: weight !== undefined ? (weight !== null ? Number(weight) : null) : product.weight,
        tags: tags !== undefined ? tags : product.tags,
        updatedAt: new Date(),
      })
      .where(eq(productsTable.id, productId))
      .returning();

    res.json(updatedProduct);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const productId = parseInt(req.params.id as string);

  try {
    const store = await getMerchantStore(merchantId);
    if (!store) {
      res.status(400).json({ error: "No store found" });
      return;
    }

    const [deleted] = await db
      .delete(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.storeId, store.id)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
