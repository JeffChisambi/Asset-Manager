import { pgTable, serial, text, timestamp, integer, doublePrecision, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const merchantsTable = pgTable("merchants", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const storesTable = pgTable("stores", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id")
    .references(() => merchantsTable.id, { onDelete: "cascade" })
    .notNull(),
  merchantType: text("merchant_type").default("basic_shop").notNull(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  description: text("description"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id")
    .references(() => merchantsTable.id, { onDelete: "cascade" })
    .notNull(),
  storeId: integer("store_id")
    .references(() => storesTable.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: doublePrecision("price").notNull(),
  stock: integer("stock").notNull(),
  category: text("category"),
  sku: text("sku").notNull(),
  brand: text("brand"),
  imageUrl: text("image_url"),
  discountPrice: doublePrecision("discount_price"),
  weight: doublePrecision("weight"),
  tags: text("tags"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("sku_store_idx").on(table.storeId, table.sku)
]);

export const uploadLogsTable = pgTable("upload_logs", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id")
    .references(() => merchantsTable.id, { onDelete: "cascade" })
    .notNull(),
  storeId: integer("store_id")
    .references(() => storesTable.id, { onDelete: "cascade" })
    .notNull(),
  filename: text("filename").notNull(),
  status: text("status").notNull(), // 'pending', 'success', 'failed', 'partial'
  totalRows: integer("total_rows").notNull(),
  importedCount: integer("imported_count").notNull(),
  failedCount: integer("failed_count").notNull(),
  errors: text("errors"), // JSON stringified array of row errors
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deliveryPartnersTable = pgTable("delivery_partners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => usersTable.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  dob: text("dob").notNull(),
  gender: text("gender").notNull(),
  profilePhotoUrl: text("profile_photo_url"),
  
  // Identity
  nationalId: text("national_id").notNull().unique(),
  idFrontUrl: text("id_front_url").notNull(),
  idBackUrl: text("id_back_url").notNull(),
  selfieUrl: text("selfie_url").notNull(),
  
  // Address
  address: text("address").notNull(),
  city: text("city").notNull(),
  area: text("area").notNull(),
  landmark: text("landmark"),
  gpsLocation: text("gps_location"),
  
  // Vehicle
  vehicleType: text("vehicle_type").notNull(), // 'Motorcycle', 'Car'
  vehicleBrand: text("vehicle_brand").notNull(),
  vehicleReg: text("vehicle_reg").notNull(),
  vehicleColor: text("vehicle_color").notNull(),
  vehiclePhotoUrl: text("vehicle_photo_url").notNull(),
  drivingLicenseUrl: text("driving_license_url").notNull(),
  proofOfOwnershipUrl: text("proof_of_ownership_url").notNull(),
  
  // Status
  verificationStatus: text("verification_status").default("pending").notNull(),
  availabilityStatus: text("availability_status").default("offline").notNull(),
  
  // Emergency Contact
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relationships
export const merchantsRelations = relations(merchantsTable, ({ many }) => ({
  stores: many(storesTable),
}));

export const usersRelations = relations(usersTable, ({ one }) => ({
  deliveryPartner: one(deliveryPartnersTable, {
    fields: [usersTable.id],
    references: [deliveryPartnersTable.userId],
  }),
}));

export const storesRelations = relations(storesTable, ({ one, many }) => ({
  merchant: one(merchantsTable, {
    fields: [storesTable.merchantId],
    references: [merchantsTable.id],
  }),
  products: many(productsTable),
  uploadLogs: many(uploadLogsTable),
}));

export const productsRelations = relations(productsTable, ({ one }) => ({
  store: one(storesTable, {
    fields: [productsTable.storeId],
    references: [storesTable.id],
  }),
}));

export const uploadLogsRelations = relations(uploadLogsTable, ({ one }) => ({
  store: one(storesTable, {
    fields: [uploadLogsTable.storeId],
    references: [storesTable.id],
  }),
}));