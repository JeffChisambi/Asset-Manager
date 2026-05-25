import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { and, eq, desc } from "drizzle-orm";
import { db, productsTable, storesTable, uploadLogsTable } from "@workspace/db";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

// Setup local uploads storage directory
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /csv|xlsx|xls/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV or Excel files are allowed."));
    }
  },
});

// Helper to get store
async function getMerchantStore(merchantId: number) {
  const [store] = await db
    .select()
    .from(storesTable)
    .where(eq(storesTable.merchantId, merchantId))
    .limit(1);
  return store;
}

// Normalize spreadsheet headers (tolerance check)
function normalizeRow(row: any) {
  const normalized: any = {};
  for (const key of Object.keys(row)) {
    const value = row[key];
    if (value === undefined || value === null) continue;

    const cleanKey = key.trim().toLowerCase().replace(/[\s_-]+/g, "");

    if (cleanKey === "name" || cleanKey === "productname" || cleanKey === "title") {
      normalized.name = value;
    } else if (cleanKey === "description" || cleanKey === "productdescription" || cleanKey === "details") {
      normalized.description = value;
    } else if (cleanKey === "price" || cleanKey === "retailprice") {
      normalized.price = value;
    } else if (cleanKey === "stock" || cleanKey === "quantity" || cleanKey === "qty") {
      normalized.stock = value;
    } else if (cleanKey === "category" || cleanKey === "dept" || cleanKey === "department") {
      normalized.category = value;
    } else if (cleanKey === "sku" || cleanKey === "productcode" || cleanKey === "skunumber") {
      normalized.sku = value;
    } else if (cleanKey === "brand" || cleanKey === "manufacturer") {
      normalized.brand = value;
    } else if (cleanKey === "imageurl" || cleanKey === "image" || cleanKey === "picture") {
      normalized.imageUrl = value;
    } else if (cleanKey === "discountprice" || cleanKey === "discount" || cleanKey === "saleprice") {
      normalized.discountPrice = value;
    } else if (cleanKey === "weight") {
      normalized.weight = value;
    } else if (cleanKey === "tags" || cleanKey === "keywords") {
      normalized.tags = value;
    }
  }
  return normalized;
}

interface RowError {
  row: number;
  sku?: string;
  name?: string;
  message: string;
}

// Upload file, parse, validate, and preview
router.post("/upload", requireAuth, upload.single("file"), async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file was uploaded" });
    return;
  }

  const merchantId = req.user!.id;
  const filePath = req.file.path;

  try {
    const store = await getMerchantStore(merchantId);
    if (!store) {
      // Clean up file
      fs.unlinkSync(filePath);
      res.status(400).json({ error: "No store found. Create a store first." });
      return;
    }

    // Read and parse file using SheetJS (works for csv and xlsx)
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const errors: RowError[] = [];
    const previewRows: any[] = [];
    const fileSkus = new Set<string>();

    // Fetch existing DB SKUs for validation
    const existingProducts = await db
      .select({ sku: productsTable.sku })
      .from(productsTable)
      .where(eq(productsTable.storeId, store.id));
    const dbSkus = new Set(existingProducts.map((p) => p.sku));

    jsonData.forEach((rawRow: any, index: number) => {
      const rowNumber = index + 2; // Row numbers: header is 1, data starts at 2
      const normalized = normalizeRow(rawRow);

      // Skip completely empty rows
      if (Object.keys(normalized).length === 0) return;

      const rowSku = normalized.sku ? String(normalized.sku).trim() : "";
      const rowName = normalized.name ? String(normalized.name).trim() : "";

      previewRows.push({
        rowNumber,
        name: rowName,
        description: normalized.description ? String(normalized.description).trim() : "",
        price: normalized.price !== undefined ? Number(normalized.price) : undefined,
        stock: normalized.stock !== undefined ? Number(normalized.stock) : undefined,
        category: normalized.category ? String(normalized.category).trim() : "",
        sku: rowSku,
        brand: normalized.brand ? String(normalized.brand).trim() : "",
        imageUrl: normalized.imageUrl ? String(normalized.imageUrl).trim() : "",
        discountPrice: normalized.discountPrice !== undefined ? Number(normalized.discountPrice) : undefined,
        weight: normalized.weight !== undefined ? Number(normalized.weight) : undefined,
        tags: normalized.tags ? String(normalized.tags).trim() : "",
      });

      // Validations
      if (!rowName) {
        errors.push({ row: rowNumber, sku: rowSku, message: "Product name is required" });
      }

      if (!rowSku) {
        errors.push({ row: rowNumber, name: rowName, message: "SKU is required" });
      } else {
        if (fileSkus.has(rowSku)) {
          errors.push({
            row: rowNumber,
            sku: rowSku,
            name: rowName,
            message: `Duplicate SKU '${rowSku}' within the uploaded file`,
          });
        } else {
          fileSkus.add(rowSku);
        }

        if (dbSkus.has(rowSku)) {
          errors.push({
            row: rowNumber,
            sku: rowSku,
            name: rowName,
            message: `SKU '${rowSku}' already exists in your store database`,
          });
        }
      }

      const priceNum = Number(normalized.price);
      if (normalized.price === undefined || normalized.price === "" || isNaN(priceNum)) {
        errors.push({ row: rowNumber, sku: rowSku, name: rowName, message: "Price must be a valid number" });
      } else if (priceNum < 0) {
        errors.push({ row: rowNumber, sku: rowSku, name: rowName, message: "Price cannot be negative" });
      }

      const stockNum = Number(normalized.stock);
      if (normalized.stock === undefined || normalized.stock === "" || isNaN(stockNum) || !Number.isInteger(stockNum)) {
        errors.push({ row: rowNumber, sku: rowSku, name: rowName, message: "Stock must be a valid integer" });
      } else if (stockNum < 0) {
        errors.push({ row: rowNumber, sku: rowSku, name: rowName, message: "Stock cannot be negative" });
      }
    });

    res.json({
      success: true,
      filename: req.file.filename,
      totalRows: previewRows.length,
      previewRows,
      errors,
    });
  } catch (err: any) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(500).json({ error: err.message });
  }
});

// Confirm and save parsed rows
router.post("/confirm", requireAuth, async (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const { filename, products } = req.body;

  if (!products || !Array.isArray(products) || !filename) {
    res.status(400).json({ error: "Filename and products array are required" });
    return;
  }

  const filePath = path.join(uploadDir, filename);

  try {
    const store = await getMerchantStore(merchantId);
    if (!store) {
      res.status(400).json({ error: "Store not found" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      let importedCount = 0;
      let failedCount = 0;
      const errorLogs: any[] = [];

      for (const item of products) {
        try {
          // Double check SKU duplicate in case another write happened
          const [conflicting] = await tx
            .select()
            .from(productsTable)
            .where(and(eq(productsTable.storeId, store.id), eq(productsTable.sku, item.sku)))
            .limit(1);

          if (conflicting) {
            failedCount++;
            errorLogs.push({ sku: item.sku, message: `SKU '${item.sku}' already exists` });
            continue;
          }

          await tx.insert(productsTable).values({
            merchantId,
            storeId: store.id,
            name: item.name,
            description: item.description || null,
            price: Number(item.price),
            stock: Number(item.stock),
            category: item.category || null,
            sku: item.sku,
            brand: item.brand || null,
            imageUrl: item.imageUrl || null,
            discountPrice: item.discountPrice !== undefined && item.discountPrice !== null ? Number(item.discountPrice) : null,
            weight: item.weight !== undefined && item.weight !== null ? Number(item.weight) : null,
            tags: item.tags || null,
          });

          importedCount++;
        } catch (err: any) {
          failedCount++;
          errorLogs.push({ sku: item.sku, message: err.message });
        }
      }

      const status = failedCount === 0 ? "success" : importedCount === 0 ? "failed" : "partial";

      await tx.insert(uploadLogsTable).values({
        merchantId,
        storeId: store.id,
        filename,
        status,
        totalRows: products.length,
        importedCount,
        failedCount,
        errors: errorLogs.length > 0 ? JSON.stringify(errorLogs) : null,
      });

      return { importedCount };
    });

    // Try cleaning up the file after successful import
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      count: result.importedCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Import history logs
router.get("/history", requireAuth, async (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;

  try {
    const store = await getMerchantStore(merchantId);
    if (!store) {
      res.status(400).json({ error: "Store not found" });
      return;
    }

    const history = await db
      .select()
      .from(uploadLogsTable)
      .where(eq(uploadLogsTable.storeId, store.id))
      .orderBy(desc(uploadLogsTable.createdAt));

    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
