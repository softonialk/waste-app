import { attachDatabasePool } from "@vercel/functions";
import { MongoClient, type Db } from "mongodb";

export type Pickup = {
  id: string;
  household_name: string;
  phone: string;
  address: string;
  waste_type: string;
  quantity: string;
  pickup_date: string;
  pickup_time: string;
  notes: string;
  status: "Pending" | "Scheduled" | "Completed" | "Cancelled";
  collector_id: string | null;
  collector_name: string | null;
  recorded_weight: number | null;
  coins_awarded: number;
  owner_hash: string;
  created_at: string;
};

export type CollectorDoc = {
  id: string;
  name: string;
  phone: string;
  service_area: string;
  organization: string;
  verification_status: string;
  access_key_hash: string | null;
  coins_spent: number;
  created_at: string;
};

export type Redemption = {
  id: string;
  collector_id: string;
  reward_name: string;
  points: number;
  reference: string;
  created_at: string;
};

export type RateLimit = {
  key: string;
  action: string;
  attempts: number;
  expires_at: Date;
};

// Reuse one client per server instance; hot reload in dev would otherwise open a new pool on every edit.
const globalForMongo = globalThis as typeof globalThis & { mongo?: Promise<Db> };

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Database is unavailable. Set MONGODB_URI.");
  const client = new MongoClient(uri);
  attachDatabasePool(client);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "ecoloop");
  await Promise.all([
    db.collection<Pickup>("collection_requests").createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { owner_hash: 1, created_at: -1 } },
      { key: { status: 1, pickup_date: 1 } },
      { key: { collector_id: 1, created_at: -1 } },
    ]),
    db.collection<CollectorDoc>("collectors").createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { phone: 1 }, unique: true },
    ]),
    db.collection<Redemption>("redemptions").createIndex({ collector_id: 1, created_at: -1 }),
    db.collection<RateLimit>("submission_rate_limits").createIndexes([
      { key: { key: 1 }, unique: true },
      { key: { expires_at: 1 }, expireAfterSeconds: 0 },
    ]),
  ]);
  return db;
}

export function getDatabase() {
  globalForMongo.mongo ??= connect().catch((error) => {
    globalForMongo.mongo = undefined;
    throw error;
  });
  return globalForMongo.mongo;
}

export async function collections() {
  const db = await getDatabase();
  return {
    requests: db.collection<Pickup>("collection_requests"),
    collectors: db.collection<CollectorDoc>("collectors"),
    redemptions: db.collection<Redemption>("redemptions"),
    rateLimits: db.collection<RateLimit>("submission_rate_limits"),
  };
}
