import { MongoServerError } from "mongodb";
import { collections } from "../../../db/mongo";

export const dynamic = "force-dynamic";

type ActionBody = Record<string, unknown> & { action?: string };
type Row = Record<string, unknown>;
type Collector = { id: string; name: string; phone: string; service_area: string; organization: string; verification_status: string };

const ADMIN_COOKIE = "ecoloop_admin";
const COLLECTOR_COOKIE = "ecoloop_collector";
const HOUSEHOLD_COOKIE = "ecoloop_household";
const WASTE_TYPES = ["Plastic", "Paper & Cardboard", "Metal", "Glass", "E-Waste", "Organic", "Mixed Recyclables"];
const REWARDS: Record<string, number> = { "Eco Gift Pack": 500, "Shopping Voucher": 1000, "Special Reward": 1500 };
const COINS_PER_PICKUP = 100;

const id = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
const secret = () => crypto.randomUUID().replace(/-/g, "");
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const cookieValue = (request: Request, name: string) => request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";
const cookie = (name: string, value: string, maxAge: number) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
const validName = (value: unknown) => {
  const name = text(value);
  return name.length >= 2 && name.length <= 60 && /^[\p{L}\p{M}.' -]+$/u.test(name) && /\p{L}/u.test(name);
};
const validPhone = (value: unknown) => /^(?:\+94|0)7\d{8}$/.test(text(value).replace(/[\s-]/g, ""));
const normalizedPhone = (value: unknown) => text(value).replace(/[\s-]/g, "");
const validWeight = (value: number) => Number.isFinite(value) && value >= 0.1 && value <= 1000;
const validPickupDate = (value: unknown) => {
  const date = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const latest = new Date(today); latest.setDate(latest.getDate() + 30);
  const selected = new Date(`${date}T00:00:00`);
  return !Number.isNaN(selected.getTime()) && selected >= today && selected <= latest;
};
const error = (message: string, status: number) => Response.json({ error: message }, { status });

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Hash both sides first so the comparison always runs over equal-length buffers.
async function safeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([a, b].map((value) => crypto.subtle.digest("SHA-256", encoder.encode(value))));
  const a1 = new Uint8Array(left), b1 = new Uint8Array(right);
  let diff = 0;
  for (let index = 0; index < a1.length; index++) diff |= a1[index] ^ b1[index];
  return diff === 0;
}


type Collections = Awaited<ReturnType<typeof collections>>;
const isDuplicateKey = (cause: unknown) => cause instanceof MongoServerError && cause.code === 11000;
const COLLECTOR_FIELDS = { _id: 0, id: 1, name: 1, phone: 1, service_area: 1, organization: 1, verification_status: 1 } as const;

async function isAdmin(request: Request) {
  const token = cookieValue(request, ADMIN_COOKIE);
  return Boolean(process.env.ADMIN_SESSION_TOKEN && token) && await safeEqual(token, process.env.ADMIN_SESSION_TOKEN!);
}

async function collectorFromKey(db: Collections, field: "id" | "phone", value: string, key: string): Promise<Collector | null> {
  const row = await db.collectors.findOne({ [field]: value }, { projection: { ...COLLECTOR_FIELDS, access_key_hash: 1 } });
  if (!row?.access_key_hash || !/^[0-9a-f]{32}$/.test(key)) return null;
  if (!await safeEqual(await sha256(key), row.access_key_hash)) return null;
  return { id: row.id, name: row.name, phone: row.phone, service_area: row.service_area, organization: row.organization, verification_status: row.verification_status };
}

async function currentCollector(db: Collections, request: Request) {
  const [collectorId, key] = cookieValue(request, COLLECTOR_COOKIE).split(".");
  if (!collectorId || !key) return null;
  return collectorFromKey(db, "id", collectorId, key);
}

async function householdOwner(request: Request) {
  const token = cookieValue(request, HOUSEHOLD_COOKIE);
  return /^[0-9a-f]{32}$/.test(token) ? sha256(token) : null;
}

async function rateLimitKey(parts: string[]) {
  if (!process.env.RATE_LIMIT_SALT) throw new Error("Rate limiting is not configured.");
  return sha256(`${process.env.RATE_LIMIT_SALT}:${parts.join(":")}`);
}

async function countAttempt(db: Collections, key: string, action: string, expiresAt: Date) {
  const update = { $inc: { attempts: 1 }, $setOnInsert: { action, expires_at: expiresAt } };
  try {
    return (await db.rateLimits.findOneAndUpdate({ key }, update, { upsert: true, returnDocument: "after" }))?.attempts ?? 1;
  } catch (cause) {
    // Two first attempts can race on the upsert; the loser retries against the now-existing document.
    if (!isDuplicateKey(cause)) throw cause;
    return (await db.rateLimits.findOneAndUpdate({ key }, update, { returnDocument: "after" }))?.attempts ?? 1;
  }
}

async function consumeLimit(db: Collections, request: Request, action: string, windowSeconds: number, ipMaximum: number, phone?: { value: string; maximum: number }) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const expiresAt = new Date((windowStart + windowSeconds) * 1000);
  const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const checks = [{ scope: "ip", value: ip, maximum: ipMaximum }, ...(phone ? [{ scope: "phone", ...phone }] : [])];
  for (const check of checks) {
    const key = await rateLimitKey([action, check.scope, check.value, String(windowStart)]);
    if (await countAttempt(db, key, action, expiresAt) > check.maximum) return Math.max(1, windowStart + windowSeconds - now);
  }
  return 0;
}

function rateLimited(retryAfter: number) {
  return Response.json({ error: "Too many attempts. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
}

async function coinsEarned(db: Collections, collectorId: string) {
  const [row] = await db.requests.aggregate<{ total: number }>([
    { $match: { collector_id: collectorId, status: "Completed" } },
    { $group: { _id: null, total: { $sum: "$coins_awarded" } } },
  ]).toArray();
  return row?.total ?? 0;
}

// Each viewer only receives the records their session is entitled to.
async function viewState(request: Request, overrides: { admin?: boolean; collector?: Collector | null; owner?: string | null } = {}) {
  const db = await collections();
  const admin = overrides.admin ?? await isAdmin(request);
  const collector = overrides.collector !== undefined ? overrides.collector : await currentCollector(db, request);
  const owner = overrides.owner !== undefined ? overrides.owner : await householdOwner(request);

  const household = owner
    ? await db.requests.find({ owner_hash: owner }, { projection: { _id: 0, id: 1, household_name: 1, address: 1, waste_type: 1, quantity: 1, pickup_date: 1, pickup_time: 1, status: 1, collector_name: 1 } }).sort({ created_at: -1 }).limit(50).toArray()
    : [];

  let collectorState: Row | null = null;
  if (collector) {
    const verified = collector.verification_status === "Verified";
    const [openJobs, myJobs, redemptions, earned, account] = await Promise.all([
      verified ? db.requests.find({ status: "Pending" }, { projection: { _id: 0, id: 1, address: 1, waste_type: 1, quantity: 1, pickup_date: 1, pickup_time: 1, status: 1 } }).sort({ pickup_date: 1 }).limit(100).toArray() : Promise.resolve([]),
      db.requests.find({ collector_id: collector.id }, { projection: { _id: 0, id: 1, household_name: 1, phone: 1, address: 1, waste_type: 1, quantity: 1, pickup_date: 1, pickup_time: 1, notes: 1, status: 1, recorded_weight: 1, coins_awarded: 1 } }).sort({ created_at: -1 }).toArray(),
      db.redemptions.find({ collector_id: collector.id }, { projection: { _id: 0, id: 1, reward_name: 1, points: 1, reference: 1, created_at: 1 } }).sort({ created_at: -1 }).toArray(),
      coinsEarned(db, collector.id),
      db.collectors.findOne({ id: collector.id }, { projection: { _id: 0, coins_spent: 1 } }),
    ]);
    collectorState = { profile: collector, openJobs, jobs: myJobs, redemptions, balance: earned - (account?.coins_spent ?? 0) };
  }

  let adminState: Row | null = null;
  if (admin) {
    const [requests, collectorRows] = await Promise.all([
      db.requests.find({}, { projection: { _id: 0, owner_hash: 0 } }).sort({ created_at: -1 }).toArray(),
      db.collectors.find({}, { projection: { ...COLLECTOR_FIELDS, access_key_hash: 1, created_at: 1 } }).sort({ created_at: -1 }).toArray(),
    ]);
    const collectorList = collectorRows.map(({ access_key_hash, ...row }) => ({ ...row, has_access_key: access_key_hash ? 1 : 0 }));
    adminState = { requests, collectors: collectorList };
  }

  return { adminAuthenticated: admin, household: { requests: household }, collector: collectorState, admin: adminState };
}

export async function GET(request: Request) {
  try { return Response.json(await viewState(request), { headers: { "Cache-Control": "no-store" } }); }
  catch { return error("System data is temporarily unavailable.", 503); }
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 10_000) return error("Request is too large.", 413);
    let body: ActionBody;
    try { body = await request.json() as ActionBody; } catch { return error("Invalid request.", 400); }
    if (!body || typeof body !== "object") return error("Invalid request.", 400);
    if (text(body.website)) return error("Submission rejected.", 400);
    const db = await collections();

    if (body.action === "adminLogin") {
      if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_TOKEN) return error("Admin login is not configured.", 503);
      const retryAfter = await consumeLimit(db, request, "admin-login", 15 * 60, 10);
      if (retryAfter) return rateLimited(retryAfter);
      if (!await safeEqual(text(body.password), process.env.ADMIN_PASSWORD)) return error("Incorrect admin password.", 401);
      return Response.json(await viewState(request, { admin: true }), { headers: { "Set-Cookie": cookie(ADMIN_COOKIE, process.env.ADMIN_SESSION_TOKEN, 60 * 60 * 8) } });
    }
    if (body.action === "adminLogout") {
      return Response.json(await viewState(request, { admin: false }), { headers: { "Set-Cookie": cookie(ADMIN_COOKIE, "", 0) } });
    }
    if (body.action === "collectorLogin") {
      const phone = normalizedPhone(body.phone);
      if (!validPhone(phone)) return error("Enter a valid Sri Lankan mobile number, for example 0771234567.", 400);
      const retryAfter = await consumeLimit(db, request, "collector-login", 15 * 60, 10, { value: phone, maximum: 5 });
      if (retryAfter) return rateLimited(retryAfter);
      const key = text(body.accessKey).toLowerCase().replace(/[\s-]/g, "");
      const collector = await collectorFromKey(db, "phone", phone, key);
      if (!collector) return error("Phone number or access key is incorrect.", 401);
      return Response.json(await viewState(request, { collector }), { headers: { "Set-Cookie": cookie(COLLECTOR_COOKIE, `${collector.id}.${key}`, 60 * 60 * 24 * 30) } });
    }
    if (body.action === "collectorLogout") {
      return Response.json(await viewState(request, { collector: null }), { headers: { "Set-Cookie": cookie(COLLECTOR_COOKIE, "", 0) } });
    }

    if (body.action === "createRequest") {
      const required = ["householdName", "phone", "address", "wasteType", "quantity", "pickupDate", "pickupTime"];
      if (required.some((key) => !text(body[key]))) return error("Please complete every required field.", 400);
      if (!validName(body.householdName)) return error("Enter a valid full name using letters only.", 400);
      if (!validPhone(body.phone)) return error("Enter a valid Sri Lankan mobile number, for example 0771234567.", 400);
      if (!WASTE_TYPES.includes(text(body.wasteType))) return error("Select a valid waste type.", 400);
      const weight = Number(body.quantity);
      if (!validWeight(weight)) return error("Estimated weight must be between 0.1 and 1000 kg.", 400);
      if (!validPickupDate(body.pickupDate)) return error("Choose a pickup date from today up to 30 days ahead.", 400);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text(body.pickupTime))) return error("Choose a valid pickup time.", 400);
      if (text(body.address).length < 8 || text(body.address).length > 250) return error("Enter a complete pickup address.", 400);
      if (text(body.notes).length > 200) return error("Notes must be 200 characters or fewer.", 400);
      const retryAfter = await consumeLimit(db, request, "pickup", 60 * 60, 5, { value: normalizedPhone(body.phone), maximum: 2 });
      if (retryAfter) return rateLimited(retryAfter);
      const existing = cookieValue(request, HOUSEHOLD_COOKIE);
      const token = /^[0-9a-f]{32}$/.test(existing) ? existing : secret();
      const owner = await sha256(token);
      await db.requests.insertOne({ id: id("REQ"), household_name: text(body.householdName), phone: normalizedPhone(body.phone), address: text(body.address), waste_type: text(body.wasteType), quantity: `${weight} kg`, pickup_date: text(body.pickupDate), pickup_time: text(body.pickupTime), notes: text(body.notes), status: "Pending", collector_id: null, collector_name: null, recorded_weight: null, coins_awarded: 0, owner_hash: owner, created_at: new Date().toISOString() });
      return Response.json(await viewState(request, { owner }), { headers: { "Set-Cookie": cookie(HOUSEHOLD_COOKIE, token, 60 * 60 * 24 * 365) } });
    }

    if (body.action === "registerCollector") {
      if (!text(body.name) || !text(body.phone) || !text(body.serviceArea)) return error("Name, phone and service area are required.", 400);
      if (!validName(body.name)) return error("Enter a valid collector name using letters only.", 400);
      if (!validPhone(body.phone)) return error("Enter a valid Sri Lankan mobile number, for example 0771234567.", 400);
      if (text(body.serviceArea).length < 2 || text(body.serviceArea).length > 80) return error("Enter a valid service area.", 400);
      if (text(body.organization).length > 100) return error("Organization name must be 100 characters or fewer.", 400);
      const retryAfter = await consumeLimit(db, request, "collector", 60 * 60 * 24, 3, { value: normalizedPhone(body.phone), maximum: 1 });
      if (retryAfter) return rateLimited(retryAfter);
      const collectorId = id("CLR"); const accessKey = secret();
      const collector = { id: collectorId, name: text(body.name), phone: normalizedPhone(body.phone), service_area: text(body.serviceArea), organization: text(body.organization) || "Independent Collector", verification_status: "Verification Pending" };
      try {
        await db.collectors.insertOne({ ...collector, access_key_hash: await sha256(accessKey), coins_spent: 0, created_at: new Date().toISOString() });
      } catch (cause) {
        if (isDuplicateKey(cause)) return error("A collector is already registered with this phone number.", 409);
        throw cause;
      }
      return Response.json({ ...(await viewState(request, { collector })), accessKey }, { headers: { "Set-Cookie": cookie(COLLECTOR_COOKIE, `${collectorId}.${accessKey}`, 60 * 60 * 24 * 30) } });
    }

    if (["acceptRequest", "completeRequest", "redeem"].includes(body.action ?? "")) {
      const collector = await currentCollector(db, request);
      if (!collector) return error("Collector login required.", 401);
      if (collector.verification_status !== "Verified") return error("Only a verified collector can do this.", 403);

      if (body.action === "acceptRequest") {
        const result = await db.requests.updateOne({ id: text(body.requestId), status: "Pending" }, { $set: { status: "Scheduled", collector_id: collector.id, collector_name: collector.name } });
        if (!result.modifiedCount) return error("This pickup is no longer available.", 409);
      } else if (body.action === "completeRequest") {
        const weight = Number(body.weight);
        if (!validWeight(weight)) return error("Enter the verified collected weight between 0.1 and 1000 kg.", 400);
        if (!WASTE_TYPES.includes(text(body.wasteType))) return error("Select a valid waste type.", 400);
        const result = await db.requests.updateOne({ id: text(body.requestId), collector_id: collector.id, status: "Scheduled" }, { $set: { status: "Completed", recorded_weight: weight, waste_type: text(body.wasteType), coins_awarded: COINS_PER_PICKUP } });
        if (!result.modifiedCount) return error("This pickup is not scheduled for you.", 409);
      } else {
        const rewardName = text(body.rewardName); const points = REWARDS[rewardName];
        if (!points) return error("Select a valid reward.", 400);
        const [earned, account] = await Promise.all([coinsEarned(db, collector.id), db.collectors.findOne({ id: collector.id }, { projection: { _id: 0, coins_spent: 1 } })]);
        const spent = account?.coins_spent ?? 0;
        if (earned - spent < points) return error("Not enough collector coins for this reward.", 400);
        // Earned coins only grow, so reserving against the spent total we read cannot overdraw; a concurrent redemption changes it and fails this match.
        const reserved = await db.collectors.updateOne({ id: collector.id, coins_spent: spent }, { $inc: { coins_spent: points } });
        if (!reserved.modifiedCount) return error("Your balance changed. Please try again.", 409);
        try {
          await db.redemptions.insertOne({ id: id("RED"), collector_id: collector.id, reward_name: rewardName, points, reference: `ECO-${secret().slice(0, 8).toUpperCase()}`, created_at: new Date().toISOString() });
        } catch (cause) {
          await db.collectors.updateOne({ id: collector.id }, { $inc: { coins_spent: -points } });
          throw cause;
        }
      }
      return Response.json(await viewState(request, { collector }));
    }

    if (["rejectRequest", "verifyCollector", "issueCollectorKey"].includes(body.action ?? "")) {
      if (!await isAdmin(request)) return error("Admin login required.", 401);
      if (body.action === "rejectRequest") {
        await db.requests.updateOne({ id: text(body.requestId), status: "Pending" }, { $set: { status: "Cancelled" } });
      } else if (body.action === "verifyCollector") {
        await db.collectors.updateOne({ id: text(body.collectorId) }, { $set: { verification_status: "Verified" } });
      } else {
        const accessKey = secret();
        const result = await db.collectors.updateOne({ id: text(body.collectorId) }, { $set: { access_key_hash: await sha256(accessKey) } });
        if (!result.matchedCount) return error("Collector not found.", 404);
        return Response.json({ ...(await viewState(request, { admin: true })), accessKey });
      }
      return Response.json(await viewState(request, { admin: true }));
    }

    return error("Unknown action.", 400);
  } catch { return error("The request could not be completed. Please try again.", 500); }
}
