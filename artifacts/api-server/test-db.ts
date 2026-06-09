import { db, storesTable } from "@workspace/db";

async function main() {
  const stores = await db.select().from(storesTable);
  console.log("STORES:", stores);
  process.exit(0);
}
main().catch(console.error);
