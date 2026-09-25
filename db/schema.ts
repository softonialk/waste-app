import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const collectionRequests = sqliteTable("collection_requests", {
  id: text("id").primaryKey(),
  householdName: text("household_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  wasteType: text("waste_type").notNull(),
  quantity: text("quantity").notNull(),
  pickupDate: text("pickup_date").notNull(),
  pickupTime: text("pickup_time").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("Pending"),
  collectorId: text("collector_id"),
  collectorName: text("collector_name"),
  recordedWeight: real("recorded_weight"),
  coinsAwarded: integer("coins_awarded").notNull().default(0),
  ownerHash: text("owner_hash"),
  createdAt: text("created_at").notNull(),
});

export const collectors = sqliteTable("collectors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  serviceArea: text("service_area").notNull(),
  organization: text("organization").notNull().default("Independent Collector"),
  verificationStatus: text("verification_status").notNull().default("Verification Pending"),
  accessKeyHash: text("access_key_hash"),
  createdAt: text("created_at").notNull(),
});

export const redemptions = sqliteTable("redemptions", {
  id: text("id").primaryKey(),
  collectorId: text("collector_id").notNull(),
  rewardName: text("reward_name").notNull(),
  points: integer("points").notNull(),
  reference: text("reference").notNull(),
  createdAt: text("created_at").notNull(),
});

export const submissionRateLimits = sqliteTable("submission_rate_limits", {
  key: text("key").primaryKey(),
  action: text("action").notNull(),
  windowStart: integer("window_start").notNull(),
  attempts: integer("attempts").notNull().default(1),
});
