import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, merchantsTable } from "@workspace/db";
import { requireAuth, AuthenticatedRequest, JWT_SECRET } from "../middlewares/auth";

const router = Router();

// Signup
router.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const existing = await db
      .select()
      .from(merchantsTable)
      .where(eq(merchantsTable.email, email))
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "Merchant with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [inserted] = await db
      .insert(merchantsTable)
      .values({
        email,
        password: passwordHash,
      })
      .returning();

    const token = jwt.sign({ id: inserted.id, email: inserted.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      merchant: {
        id: inserted.id,
        email: inserted.email,
      },
    });
  } catch (err: any) {
    // If email already exists, PostgreSQL will throw a unique violation
    console.error(err);
    if (err?.code === "23505" || err?.message?.includes("unique")) {
      res.status(400).json({ error: "Merchant with this email already exists" });
    } else {
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const [merchant] = await db
      .select()
      .from(merchantsTable)
      .where(eq(merchantsTable.email, email))
      .limit(1);

    if (!merchant) {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, merchant.password);
    if (!valid) {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign({ id: merchant.id, email: merchant.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      merchant: {
        id: merchant.id,
        email: merchant.email,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Me
router.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
  res.json(req.user);
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

export default router;
