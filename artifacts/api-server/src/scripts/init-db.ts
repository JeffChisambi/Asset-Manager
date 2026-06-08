// src/scripts/init-db.ts
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = new Client({ connectionString });

const schemaSQL = `
CREATE TABLE IF NOT EXISTS merchants (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  merchant_id INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  merchant_type TEXT DEFAULT 'basic_shop' NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS merchant_type TEXT DEFAULT 'basic_shop' NOT NULL;
-- Link a store to a chat profile UUID (set when user links their store from the mobile profile screen)
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS chat_profile_id TEXT;
CREATE INDEX IF NOT EXISTS stores_chat_profile_idx ON stores (chat_profile_id);
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  merchant_id INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DOUBLE PRECISION NOT NULL,
  stock INTEGER NOT NULL,
  category TEXT,
  sku TEXT NOT NULL,
  brand TEXT,
  image_url TEXT,
  discount_price DOUBLE PRECISION,
  weight DOUBLE PRECISION,
  tags TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT sku_store_idx UNIQUE (store_id, sku)
);
CREATE TABLE IF NOT EXISTS upload_logs (
  id SERIAL PRIMARY KEY,
  merchant_id INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  status TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  imported_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  errors TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Search Extensions & Indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS stores_name_trgm_idx ON stores USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS stores_desc_trgm_idx ON stores USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_category_trgm_idx ON products USING gin (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_brand_trgm_idx ON products USING gin (brand gin_trgm_ops);
`;

(async () => {
  try {
    await client.connect();
    await client.query(schemaSQL);
    console.log("✅ Database schema ensured");
  } catch (err) {
    console.error("❌ Error creating database schema", err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
