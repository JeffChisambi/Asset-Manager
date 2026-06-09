import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Enabling pg_trgm extension...");
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  console.log("pg_trgm enabled successfully.");
  process.exit(0);
}

main().catch(console.error);
