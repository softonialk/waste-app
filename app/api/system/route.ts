import { env } from "cloudflare:workers";
import { getDatabase } from "../../../db/raw";

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

async function isAdmin(request: Request) {
  const token = cookieValue(request, ADMIN_COOKIE);
  return Boolean(env.ADMIN_SESSION_TOKEN && token) && await safeEqual(token, env.ADMIN_SESSION_TOKEN!);
}

async function collectorFromKey(db: D1Database, where: string, value: string, key: string) {
  const row = await db.prepare(`SELECT id, name, phone, service_area, organization, verification_status, access_key_hash FROM collectors WHERE ${where} = ? LIMIT 1`).bind(value).first<Collector & { access_key_hash: string | null }>();
  if (!row?.access_key_hash || !/^[0-9a-f]{32}$/.test(key)) return null;
  if (!await safeEqual(await sha256(key), row.access_key_hash)) return null;
  return { id: row.id, name: row.name, phone: row.phone, service_area: row.service_area, organization: row.organization, verification_status: row.verification_status };
}

async function currentCollector(db: D1Database, request: Request) {
  const [collectorId, key] = cookieValue(request, COLLECTOR_COOKIE).split(".");
  if (!collectorId || !key) return null;
  return collectorFromKey(db, "id", collectorId, key);
}

async function householdOwner(request: Request) {
  const token = cookieValue(request, HOUSEHOLD_COOKIE);
  return /^[0-9a-f]{32}$/.test(token) ? sha256(token) : null;
}

async function rateLimitKey(parts: string[]) {
  if (!env.RATE_LIMIT_SALT) throw new Error("Rate limiting is not configured.");
  return sha256(`${env.RATE_LIMIT_SALT}:${parts.join(":")}`);
}

async function consumeLimit(db: D1Database, request: Request, action: string, windowSeconds: number, ipMaximum: number, phone?: { value: string; maximum: number }) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const checks = [{ scope: "ip", value: ip, maximum: ipMaximum }, ...(phone ? [{ scope: "phone", ...phone }] : [])];
  for (const check of checks) {
    const key = await rateLimitKey([action, check.scope, check.value, String(windowStart)]);
    const result = await db.prepare(`INSERT INTO submission_rate_limits (key, action, window_start, attempts) VALUES (?, ?, ?, 1) ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1 RETURNING attempts`).bind(key, action, windowStart).first<{ attempts: number }>();
    if ((result?.attempts ?? 1) > check.maximum) return Math.max(1, windowStart + windowSeconds - now);
  }
  return 0;
}

function rateLimited(retryAfter: number) {
  return Response.json({ error: "Too many attempts. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
}

// Each viewer only receives the records their session is entitled to.
async function viewState(request: Request, overrides: { admin?: boolean; collector?: Collector | null; owner?: string | null } = {}) {
  const db = getDatabase();
  const admin = overrides.admin ?? await isAdmin(request);
  const collector = overrides.collector !== undefined ? overrides.collector : await currentCollector(db, request);
  const owner = overrides.owner !== undefined ? overrides.owner : await householdOwner(request);

  const household = owner
    ? (await db.prepare("SELECT id, household_name, address, waste_type, quantity, pickup_date, pickup_time, status, collector_name FROM collection_requests WHERE owner_hash = ? ORDER BY created_at DESC LIMIT 50").bind(owner).all()).results
    : [];

  let collectorState: Row | null = null;
  if (collector) {
    const verified = collector.verification_status === "Verified";
    const [openJobs, myJobs, redemptions, earned, spent] = await Promise.all([
      verified ? db.prepare("SELECT id, address, waste_type, quantity, pickup_date, pickup_time, status FROM collection_requests WHERE status = 'Pending' ORDER BY pickup_date ASC LIMIT 100").all() : Promise.resolve({ results: [] }),
      db.prepare("SELECT id, household_name, phone, address, waste_type, quantity, pickup_date, pickup_time, notes, status, recorded_weight, coins_awarded FROM collection_requests WHERE collector_id = ? ORDER BY created_at DESC").bind(collector.id).all(),
      db.prepare("SELECT id, reward_name, points, reference, created_at FROM redemptions WHERE collector_id = ? ORDER BY created_at DESC").bind(collector.id).all(),
      db.prepare("SELECT COALESCE(SUM(coins_awarded), 0) total FROM collection_requests WHERE collector_id = ? AND status = 'Completed'").bind(collector.id).first<{ total: number }>(),
      db.prepare("SELECT COALESCE(SUM(points), 0) total FROM redemptions WHERE collector_id = ?").bind(collector.id).first<{ total: number }>(),
    ]);
    collectorState = { profile: collector, openJobs: openJobs.results, jobs: myJobs.results, redemptions: redemptions.results, balance: (earned?.total ?? 0) - (spent?.total ?? 0) };
  }

  let adminState: Row | null = null;
  if (admin) {
    const [requests, collectors] = await Promise.all([
      db.prepare("SELECT id, household_name, phone, address, waste_type, quantity, pickup_date, pickup_time, notes, status, collector_id, collector_name, recorded_weight, coins_awarded, created_at FROM collection_requests ORDER BY created_at DESC").all(),
      db.prepare("SELECT id, name, phone, service_area, organization, verification_status, access_key_hash IS NOT NULL AS has_access_key, created_at FROM collectors ORDER BY created_at DESC").all(),
    ]);
    adminState = { requests: requests.results, collectors: collectors.results };
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
    const db = getDatabase();

    if (body.action === "adminLogin") {
      if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_TOKEN) return error("Admin login is not configured.", 503);
      const retryAfter = await consumeLimit(db, request, "admin-login", 15 * 60, 10);
      if (retryAfter) return rateLimited(retryAfter);
      if (!await safeEqual(text(body.password), env.ADMIN_PASSWORD)) return error("Incorrect admin password.", 401);
      return Response.json(await viewState(request, { admin: true }), { headers: { "Set-Cookie": cookie(ADMIN_COOKIE, env.ADMIN_SESSION_TOKEN, 60 * 60 * 8) } });
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
      await db.prepare(`INSERT INTO collection_requests (id, household_name, phone, address, waste_type, quantity, pickup_date, pickup_time, notes, status, coins_awarded, owner_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 0, ?, ?)`).bind(id("REQ"), text(body.householdName), normalizedPhone(body.phone), text(body.address), text(body.wasteType), `${weight} kg`, text(body.pickupDate), text(body.pickupTime), text(body.notes), owner, new Date().toISOString()).run();
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
      const existing = await db.prepare("SELECT id FROM collectors WHERE phone = ? LIMIT 1").bind(normalizedPhone(body.phone)).first();
      if (existing) return error("A collector is already registered with this phone number.", 409);
      const collectorId = id("CLR"); const accessKey = secret();
      await db.prepare(`INSERT INTO collectors (id, name, phone, service_area, organization, verification_status, access_key_hash, created_at) VALUES (?, ?, ?, ?, ?, 'Verification Pending', ?, ?)`).bind(collectorId, text(body.name), normalizedPhone(body.phone), text(body.serviceArea), text(body.organization) || "Independent Collector", await sha256(accessKey), new Date().toISOString()).run();
      const collector = { id: collectorId, name: text(body.name), phone: normalizedPhone(body.phone), service_area: text(body.serviceArea), organization: text(body.organization) || "Independent Collector", verification_status: "Verification Pending" };
      return Response.json({ ...(await viewState(request, { collector })), accessKey }, { headers: { "Set-Cookie": cookie(COLLECTOR_COOKIE, `${collectorId}.${accessKey}`, 60 * 60 * 24 * 30) } });
    }

    if (["acceptRequest", "completeRequest", "redeem"].includes(body.action ?? "")) {
      const collector = await currentCollector(db, request);
      if (!collector) return error("Collector login required.", 401);
      if (collector.verification_status !== "Verified") return error("Only a verified collector can do this.", 403);

      if (body.action === "acceptRequest") {
        const result = await db.prepare("UPDATE collection_requests SET status = 'Scheduled', collector_id = ?, collector_name = ? WHERE id = ? AND status = 'Pending'").bind(collector.id, collector.name, text(body.requestId)).run();
        if (!result.meta.changes) return error("This pickup is no longer available.", 409);
      } else if (body.action === "completeRequest") {
        const weight = Number(body.weight);
        if (!validWeight(weight)) return error("Enter the verified collected weight between 0.1 and 1000 kg.", 400);
        if (!WASTE_TYPES.includes(text(body.wasteType))) return error("Select a valid waste type.", 400);
        const result = await db.prepare("UPDATE collection_requests SET status = 'Completed', recorded_weight = ?, waste_type = ?, coins_awarded = ? WHERE id = ? AND collector_id = ? AND status = 'Scheduled'").bind(weight, text(body.wasteType), COINS_PER_PICKUP, text(body.requestId), collector.id).run();
        if (!result.meta.changes) return error("This pickup is not scheduled for you.", 409);
      } else {
        const rewardName = text(body.rewardName); const points = REWARDS[rewardName];
        if (!points) return error("Select a valid reward.", 400);
        const reference = `ECO-${secret().slice(0, 8).toUpperCase()}`;
        // Single statement so the balance check and the insert cannot race.
        const result = await db.prepare(`INSERT INTO redemptions (id, collector_id, reward_name, points, reference, created_at)
          SELECT ?, ?, ?, ?, ?, ?
          WHERE (SELECT COALESCE(SUM(coins_awarded), 0) FROM collection_requests WHERE collector_id = ? AND status = 'Completed')
              - (SELECT COALESCE(SUM(points), 0) FROM redemptions WHERE collector_id = ?) >= ?`)
          .bind(id("RED"), collector.id, rewardName, points, reference, new Date().toISOString(), collector.id, collector.id, points).run();
        if (!result.meta.changes) return error("Not enough collector coins for this reward.", 400);
      }
      return Response.json(await viewState(request, { collector }));
    }

    if (["rejectRequest", "verifyCollector", "issueCollectorKey"].includes(body.action ?? "")) {
      if (!await isAdmin(request)) return error("Admin login required.", 401);
      if (body.action === "rejectRequest") {
        await db.prepare("UPDATE collection_requests SET status = 'Cancelled' WHERE id = ? AND status = 'Pending'").bind(text(body.requestId)).run();
      } else if (body.action === "verifyCollector") {
        await db.prepare("UPDATE collectors SET verification_status = 'Verified' WHERE id = ?").bind(text(body.collectorId)).run();
      } else {
        const accessKey = secret();
        const result = await db.prepare("UPDATE collectors SET access_key_hash = ? WHERE id = ?").bind(await sha256(accessKey), text(body.collectorId)).run();
        if (!result.meta.changes) return error("Collector not found.", 404);
        return Response.json({ ...(await viewState(request, { admin: true })), accessKey });
      }
      return Response.json(await viewState(request, { admin: true }));
    }

    return error("Unknown action.", 400);
  } catch { return error("The request could not be completed. Please try again.", 500); }
}
