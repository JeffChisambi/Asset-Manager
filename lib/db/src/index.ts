import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Ensure pg_trgm extension is available for fuzzy search
pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;").catch((err) => {
  console.warn("Could not create pg_trgm extension. Make sure your database user has sufficient privileges.", err.message);
});

export * from "./schema";
