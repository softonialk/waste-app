import { env } from "cloudflare:workers";
import { getDatabase } from "../../../db/raw";

export const dynamic = "force-dynamic";

type ActionBody = Record<string, unknown> & { action?: string };
const ADMIN_COOKIE = "ecoloop_admin";
const id = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const cookieValue = (request: Request, name: string) => request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";
const isAdmin = (request: Request) => Boolean(env.ADMIN_SESSION_TOKEN) && cookieValue(request, ADMIN_COOKIE) === env.ADMIN_SESSION_TOKEN;
const adminCookie = (value: string, maxAge: number) => `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
const validName = (value: unknown) => {
  const name = text(value);
  return name.length >= 2 && name.length <= 60 && /^[\p{L}\p{M}.' -]+$/u.test(name) && /\p{L}/u.test(name);
};
const validPhone = (value: unknown) => /^(?:\+94|0)7\d{8}$/.test(text(value).replace(/[\s-]/g, ""));
const normalizedPhone = (value: unknown) => text(value).replace(/[\s-]/g, "");
const validPickupDate = (value: unknown) => {
  const date = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const latest = new Date(today); latest.setDate(latest.getDate() + 30);
  const selected = new Date(`${date}T00:00:00`);
  return !Number.isNaN(selected.getTime()) && selected >= today && selected <= latest;
};

async function rateLimitKey(parts: string[]) {
  if (!env.RATE_LIMIT_SALT) throw new Error("Rate limiting is not configured.");
  const bytes = new TextEncoder().encode(`${env.RATE_LIMIT_SALT}:${parts.join(":")}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function consumeLimit(db: D1Database, request: Request, action: string, phone: string, windowSeconds: number, ipMaximum: number, phoneMaximum: number) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const checks = [
    { scope: "ip", value: ip, maximum: ipMaximum },
    { scope: "phone", value: phone, maximum: phoneMaximum },
  ];
  for (const check of checks) {
    const key = await rateLimitKey([action, check.scope, check.value, String(windowStart)]);
    const result = await db.prepare(`INSERT INTO submission_rate_limits (key, action, window_start, attempts) VALUES (?, ?, ?, 1) ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1 RETURNING attempts`).bind(key, action, windowStart).first<{ attempts: number }>();
    if ((result?.attempts ?? 1) > check.maximum) return Math.max(1, windowStart + windowSeconds - now);
  }
  return 0;
}

function rateLimited(retryAfter: number) {
  return Response.json({ error: "Too many submissions. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
}

async function snapshot() {
  const db = getDatabase();
  const [requests, collectors, redemptions] = await Promise.all([
    db.prepare("SELECT * FROM collection_requests ORDER BY created_at DESC").all(),
    db.prepare("SELECT * FROM collectors ORDER BY created_at DESC").all(),
    db.prepare("SELECT * FROM redemptions ORDER BY created_at DESC").all(),
  ]);
  return { requests: requests.results, collectors: collectors.results, redemptions: redemptions.results };
}

async function withAdminState(request: Request) {
  return { ...(await snapshot()), adminAuthenticated: isAdmin(request) };
}

export async function GET(request: Request) {
  try { return Response.json(await withAdminState(request)); }
  catch { return Response.json({ error: "System data is temporarily unavailable." }, { status: 503 }); }
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 10_000) return Response.json({ error: "Request is too large." }, { status: 413 });
    const body = await request.json() as ActionBody;
    if (text(body.website)) return Response.json({ error: "Submission rejected." }, { status: 400 });
    if (body.action === "adminLogin") {
      if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_TOKEN) return Response.json({ error: "Admin login is not configured." }, { status: 503 });
      if (text(body.password) !== env.ADMIN_PASSWORD) return Response.json({ error: "Incorrect admin password." }, { status: 401 });
      return Response.json({ ...(await snapshot()), adminAuthenticated: true }, { headers: { "Set-Cookie": adminCookie(env.ADMIN_SESSION_TOKEN, 60 * 60 * 8) } });
    }
    if (body.action === "adminLogout") {
      return Response.json({ ...(await snapshot()), adminAuthenticated: false }, { headers: { "Set-Cookie": adminCookie("", 0) } });
    }
    const db = getDatabase();
    if (body.action === "createRequest") {
      const required = ["householdName", "phone", "address", "wasteType", "quantity", "pickupDate", "pickupTime"];
      if (required.some((key) => !text(body[key]))) return Response.json({ error: "Please complete every required field." }, { status: 400 });
      if (!validName(body.householdName)) return Response.json({ error: "Enter a valid full name using letters only." }, { status: 400 });
      if (!validPhone(body.phone)) return Response.json({ error: "Enter a valid Sri Lankan mobile number, for example 0771234567." }, { status: 400 });
      const weight = Number(body.quantity);
      if (!Number.isFinite(weight) || weight < 0.1 || weight > 1000) return Response.json({ error: "Estimated weight must be between 0.1 and 1000 kg." }, { status: 400 });
      if (!validPickupDate(body.pickupDate)) return Response.json({ error: "Choose a pickup date from today up to 30 days ahead." }, { status: 400 });
      if (text(body.address).length < 8 || text(body.address).length > 250) return Response.json({ error: "Enter a complete pickup address." }, { status: 400 });
      const retryAfter = await consumeLimit(db, request, "pickup", normalizedPhone(body.phone), 60 * 60, 5, 2);
      if (retryAfter) return rateLimited(retryAfter);
      await db.prepare(`INSERT INTO collection_requests (id, household_name, phone, address, waste_type, quantity, pickup_date, pickup_time, notes, status, coins_awarded, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 0, ?)`).bind(id("REQ"), text(body.householdName), normalizedPhone(body.phone), text(body.address), text(body.wasteType), `${weight} kg`, text(body.pickupDate), text(body.pickupTime), text(body.notes), new Date().toISOString()).run();
    } else if (body.action === "registerCollector") {
      if (!text(body.name) || !text(body.phone) || !text(body.serviceArea)) return Response.json({ error: "Name, phone and service area are required." }, { status: 400 });
      if (!validName(body.name)) return Response.json({ error: "Enter a valid collector name using letters only." }, { status: 400 });
      if (!validPhone(body.phone)) return Response.json({ error: "Enter a valid Sri Lankan mobile number, for example 0771234567." }, { status: 400 });
      const existing = await db.prepare("SELECT id FROM collectors WHERE phone = ? LIMIT 1").bind(normalizedPhone(body.phone)).first();
      if (existing) return Response.json({ error: "A collector is already registered with this phone number." }, { status: 409 });
      const retryAfter = await consumeLimit(db, request, "collector", normalizedPhone(body.phone), 60 * 60 * 24, 3, 1);
      if (retryAfter) return rateLimited(retryAfter);
      await db.prepare(`INSERT INTO collectors (id, name, phone, service_area, organization, verification_status, created_at) VALUES (?, ?, ?, ?, ?, 'Verification Pending', ?)`).bind(id("CLR"), text(body.name), normalizedPhone(body.phone), text(body.serviceArea), text(body.organization) || "Independent Collector", new Date().toISOString()).run();
    } else if (body.action === "acceptRequest") {
      const collector = await db.prepare("SELECT * FROM collectors WHERE id = ? AND verification_status = 'Verified'").bind(text(body.collectorId)).first<Record<string, unknown>>();
      if (!collector) return Response.json({ error: "Only a verified collector can accept requests." }, { status: 403 });
      await db.prepare("UPDATE collection_requests SET status = 'Scheduled', collector_id = ?, collector_name = ? WHERE id = ? AND status = 'Pending'").bind(text(body.collectorId), collector.name, text(body.requestId)).run();
    } else if (body.action === "rejectRequest") {
      if (!isAdmin(request)) return Response.json({ error: "Admin login required." }, { status: 401 });
      await db.prepare("UPDATE collection_requests SET status = 'Cancelled' WHERE id = ? AND status = 'Pending'").bind(text(body.requestId)).run();
    } else if (body.action === "completeRequest") {
      const weight = Number(body.weight);
      if (!Number.isFinite(weight) || weight <= 0) return Response.json({ error: "Enter the verified collected weight." }, { status: 400 });
      await db.prepare("UPDATE collection_requests SET status = 'Completed', recorded_weight = ?, waste_type = ?, coins_awarded = 100 WHERE id = ? AND collector_id = ? AND status = 'Scheduled'").bind(weight, text(body.wasteType), text(body.requestId), text(body.collectorId)).run();
    } else if (body.action === "verifyCollector") {
      if (!isAdmin(request)) return Response.json({ error: "Admin login required." }, { status: 401 });
      await db.prepare("UPDATE collectors SET verification_status = 'Verified' WHERE id = ?").bind(text(body.collectorId)).run();
    } else if (body.action === "redeem") {
      const collectorId = text(body.collectorId); const points = Number(body.points);
      const earned = await db.prepare("SELECT COALESCE(SUM(coins_awarded), 0) total FROM collection_requests WHERE collector_id = ? AND status = 'Completed'").bind(collectorId).first<{ total: number }>();
      const spent = await db.prepare("SELECT COALESCE(SUM(points), 0) total FROM redemptions WHERE collector_id = ?").bind(collectorId).first<{ total: number }>();
      if ((earned?.total ?? 0) - (spent?.total ?? 0) < points) return Response.json({ error: "Not enough collector coins for this reward." }, { status: 400 });
      const reference = `ECO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await db.prepare("INSERT INTO redemptions (id, collector_id, reward_name, points, reference, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(id("RED"), collectorId, text(body.rewardName), points, reference, new Date().toISOString()).run();
    } else return Response.json({ error: "Unknown action." }, { status: 400 });
    return Response.json(await withAdminState(request));
  } catch { return Response.json({ error: "The request could not be completed. Please try again." }, { status: 500 }); }
}
