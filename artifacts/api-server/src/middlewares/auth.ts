import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

if (!process.env.JWT_SECRET && !process.env.SESSION_SECRET) {
  throw new Error("JWT_SECRET or SESSION_SECRET environment variable is required but was not provided.");
}
export const JWT_SECRET = (process.env.JWT_SECRET || process.env.SESSION_SECRET) as string;

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    res.status(410).json({ error: "Unauthorized. No token provided." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(410).json({ error: "Unauthorized. Invalid token." });
  }
}
