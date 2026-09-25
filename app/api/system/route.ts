import { collections, type Collections, type CollectorDoc, type Pickup } from "../../../db/mongo";
import {
  COINS_PER_PICKUP, DISTRICT_VALUES, MAX_PICKUP_DAYS_AHEAD, REWARDS, WASTE_TYPE_VALUES,
  addDays, colomboTimeNow, colomboToday, isValidPhone, normalizePhone,
} from "../../../lib/constants";
import {
  clientIp, consumeLimit, cookie, cookieValue, derivedSecret, isDuplicateKey, randomId, randomSecret, rateLimited, safeEqual, sha256,
} from "../../../lib/server/security";

export const dynamic = "force-dynamic";

type ActionBody = Record<string, unknown> & { action?: string };
type Row = Record<string, unknown>;
type Collector = Pick<CollectorDoc, "id" | "name" | "phone" | "service_area" | "district" | "organization" | "verification_status">;

const ADMIN_COOKIE = "ecoloop_admin";
const COLLECTOR_COOKIE = "ecoloop_collector";
const HOUSEHOLD_COOKIE = "ecoloop_household";
const HOUSEHOLD_COOKIE_AGE = 60 * 60 * 24 * 365;
const OPEN_STATUSES = ["Pending", "Scheduled", "Awaiting Confirmation", "Disputed"] as const;

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const validName = (value: unknown) => {
  const name = text(value);
  return name.length >= 2 && name.length <= 60 && /^[\p{L}\p{M}.' -]+$/u.test(name) && /\p{L}/u.test(name);
};
const validWeight = (value: number) => Number.isFinite(value) && value >= 0.1 && value <= 1000;
const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const error = (message: string, status: number) => Response.json({ error: message }, { status });
const now = () => new Date().toISOString();

// Dates are compared as YYYY-MM-DD strings in Sri Lanka time, so the server's own time zone never matters.
function pickupScheduleError(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return "Choose a pickup date from today up to 30 days ahead.";
  const today = colomboToday();
  if (date < today || date > addDays(today, MAX_PICKUP_DAYS_AHEAD)) return "Choose a pickup date from today up to 30 days ahead.";
  if (!validTime(time)) return "Choose a valid pickup time.";
  if (date === today && time <= colomboTimeNow()) return "Choose a pickup time later than now.";
  return null;
}

const COLLECTOR_FIELDS = { _id: 0, id: 1, name: 1, phone: 1, service_area: 1, district: 1, organization: 1, verification_status: 1 } as const;
const toCollector = (row: Collector): Collector => ({
  id: row.id, name: row.name, phone: row.phone, service_area: row.service_area, district: row.district ?? "",
  organization: row.organization, verification_status: row.verification_status,
});

// The admin portal stays disabled until ADMIN_PASSWORD is set; changing the password signs out existing sessions.
async function adminSessionToken() {
  if (!process.env.ADMIN_PASSWORD) return null;
  return process.env.ADMIN_SESSION_TOKEN || derivedSecret(`admin-session:${process.env.ADMIN_PASSWORD}`);
}

async function isAdmin(request: Request) {
  const token = cookieValue(request, ADMIN_COOKIE);
  const expected = await adminSessionToken();
  return Boolean(expected && token) && await safeEqual(token, expected!);
}

async function collectorFromKey(db: Collections, field: "id" | "phone", value: string, key: string): Promise<Collector | null> {
  const row = await db.collectors.findOne({ [field]: value }, { projection: { ...COLLECTOR_FIELDS, access_key_hash: 1 } });
  if (!row?.access_key_hash || !/^[0-9a-f]{32}$/.test(key)) return null;
  if (!await safeEqual(await sha256(key), row.access_key_hash)) return null;
  return toCollector(row);
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

// Reuses this device's household token, or mints one the response will set.
async function householdToken(request: Request) {
  const existing = cookieValue(request, HOUSEHOLD_COOKIE);
  const token = /^[0-9a-f]{32}$/.test(existing) ? existing : randomSecret();
  return { token, owner: await sha256(token) };
}

const ownedBy = (owner: string) => ({ $or: [{ owner_hash: owner }, { claimed_by: owner }] });

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
    ? await db.requests.find(ownedBy(owner), {
      projection: {
        _id: 0, id: 1, household_name: 1, address: 1, district: 1, waste_type: 1, quantity: 1, pickup_date: 1, pickup_time: 1, status: 1,
        status_note: 1, collector_name: 1, collector_phone: 1, recorded_weight: 1, created_at: 1,
      },
    }).sort({ created_at: -1 }).limit(50).toArray()
    : [];

  let collectorState: Row | null = null;
  if (collector) {
    const verified = collector.verification_status === "Verified";
    const [openJobs, myJobs, redemptions, earned, account] = await Promise.all([
      verified
        ? db.requests.find({ status: "Pending", pickup_date: { $gte: colomboToday() } }, {
          projection: { _id: 0, id: 1, address: 1, district: 1, waste_type: 1, quantity: 1, pickup_date: 1, pickup_time: 1, status: 1 },
        }).sort({ pickup_date: 1, pickup_time: 1 }).limit(200).toArray()
        : Promise.resolve([]),
      db.requests.find({ collector_id: collector.id }, {
        projection: {
          _id: 0, id: 1, household_name: 1, phone: 1, address: 1, district: 1, waste_type: 1, quantity: 1, pickup_date: 1, pickup_time: 1,
          notes: 1, status: 1, status_note: 1, recorded_weight: 1, coins_awarded: 1,
        },
      }).sort({ created_at: -1 }).limit(200).toArray(),
      db.redemptions.find({ collector_id: collector.id }, { projection: { _id: 0, id: 1, reward_name: 1, points: 1, reference: 1, status: 1, created_at: 1 } })
        .sort({ created_at: -1 }).toArray(),
      coinsEarned(db, collector.id),
      db.collectors.findOne({ id: collector.id }, { projection: { _id: 0, coins_spent: 1 } }),
    ]);
    collectorState = { profile: collector, openJobs, jobs: myJobs, redemptions, earned, balance: earned - (account?.coins_spent ?? 0) };
  }

  let adminState: Row | null = null;
  if (admin) {
    const [requests, collectorRows, redemptions, counts] = await Promise.all([
      db.requests.find({}, { projection: { _id: 0, owner_hash: 0, claimed_by: 0 } }).sort({ created_at: -1 }).limit(500).toArray(),
      db.collectors.find({}, { projection: { ...COLLECTOR_FIELDS, access_key_hash: 1, created_at: 1 } }).sort({ created_at: -1 }).toArray(),
      db.redemptions.find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(200).toArray(),
      db.requests.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
    ]);
    const collectorList = collectorRows.map(({ access_key_hash, ...row }) => ({ ...row, has_access_key: access_key_hash ? 1 : 0 }));
    adminState = { requests, collectors: collectorList, redemptions, counts: Object.fromEntries(counts.map((row) => [row._id, row.count])) };
  }

  return { adminAuthenticated: admin, adminEnabled: Boolean(process.env.ADMIN_PASSWORD), household: { requests: household }, collector: collectorState, admin: adminState };
}

export async function GET(request: Request) {
  try { return Response.json(await viewState(request), { headers: { "Cache-Control": "no-store" } }); }
  catch { return error("System data is temporarily unavailable.", 503); }
}

type Context = { request: Request; body: ActionBody; db: Collections };
type Handler = (context: Context) => Promise<Response>;

const publicActions: Record<string, Handler> = {
  async adminLogin({ request, body, db }) {
    const sessionToken = await adminSessionToken();
    if (!sessionToken) return error("Admin login is not configured.", 503);
    const retryAfter = await consumeLimit(db, "admin-login", 15 * 60, [{ scope: "ip", value: clientIp(request), maximum: 10 }]);
    if (retryAfter) return rateLimited(retryAfter);
    if (!await safeEqual(text(body.password), process.env.ADMIN_PASSWORD!)) return error("Incorrect admin password.", 401);
    return Response.json(await viewState(request, { admin: true }), { headers: { "Set-Cookie": cookie(ADMIN_COOKIE, sessionToken, 60 * 60 * 8) } });
  },

  async adminLogout({ request }) {
    return Response.json(await viewState(request, { admin: false }), { headers: { "Set-Cookie": cookie(ADMIN_COOKIE, "", 0) } });
  },

  async collectorLogin({ request, body, db }) {
    const phone = normalizePhone(body.phone);
    if (!isValidPhone(phone)) return error("Enter a valid Sri Lankan mobile number, for example 0771234567.", 400);
    const retryAfter = await consumeLimit(db, "collector-login", 15 * 60, [
      { scope: "ip", value: clientIp(request), maximum: 10 }, { scope: "phone", value: phone, maximum: 5 },
    ]);
    if (retryAfter) return rateLimited(retryAfter);
    const key = text(body.accessKey).toLowerCase().replace(/[\s-]/g, "");
    const collector = await collectorFromKey(db, "phone", phone, key);
    if (!collector) return error("Phone number or access key is incorrect.", 401);
    return Response.json(await viewState(request, { collector }), { headers: { "Set-Cookie": cookie(COLLECTOR_COOKIE, `${collector.id}.${key}`, 60 * 60 * 24 * 30) } });
  },

  async collectorLogout({ request }) {
    return Response.json(await viewState(request, { collector: null }), { headers: { "Set-Cookie": cookie(COLLECTOR_COOKIE, "", 0) } });
  },

  async createRequest({ request, body, db }) {
    const required = ["householdName", "phone", "address", "district", "wasteType", "quantity", "pickupDate", "pickupTime"];
    if (required.some((key) => !text(body[key]))) return error("Please complete every required field.", 400);
    if (body.consent !== true && body.consent !== "on") return error("Please accept the privacy notice to continue.", 400);
    if (!validName(body.householdName)) return error("Enter a valid full name using letters only.", 400);
    const phone = normalizePhone(body.phone);
    if (!isValidPhone(phone)) return error("Enter a valid Sri Lankan mobile number, for example 0771234567.", 400);
    if (!DISTRICT_VALUES.includes(text(body.district))) return error("Select your district.", 400);
    if (!WASTE_TYPE_VALUES.includes(text(body.wasteType))) return error("Select a valid waste type.", 400);
    const weight = Number(body.quantity);
    if (!validWeight(weight)) return error("Estimated weight must be between 0.1 and 1000 kg.", 400);
    const scheduleError = pickupScheduleError(text(body.pickupDate), text(body.pickupTime));
    if (scheduleError) return error(scheduleError, 400);
    if (text(body.address).length < 8 || text(body.address).length > 250) return error("Enter a complete pickup address.", 400);
    if (text(body.notes).length > 200) return error("Notes must be 200 characters or fewer.", 400);
    const retryAfter = await consumeLimit(db, "pickup", 60 * 60, [
      { scope: "ip", value: clientIp(request), maximum: 5 }, { scope: "phone", value: phone, maximum: 2 },
    ]);
    if (retryAfter) return rateLimited(retryAfter);
    const { token, owner } = await householdToken(request);
    const pickup: Pickup = {
      id: randomId("REQ"), household_name: text(body.householdName), phone, address: text(body.address), district: text(body.district),
      waste_type: text(body.wasteType), quantity: `${weight} kg`, pickup_date: text(body.pickupDate), pickup_time: text(body.pickupTime),
      notes: text(body.notes), status: "Pending", status_note: "", collector_id: null, collector_name: null, collector_phone: null,
      recorded_weight: null, coins_awarded: 0, owner_hash: owner, claimed_by: [], created_at: now(), completed_at: null, confirmed_at: null,
    };
    await db.requests.insertOne(pickup);
    return Response.json({ ...(await viewState(request, { owner })), reference: pickup.id }, { headers: { "Set-Cookie": cookie(HOUSEHOLD_COOKIE, token, HOUSEHOLD_COOKIE_AGE) } });
  },

  // Lets a household reattach a request on a new device with its reference number and phone.
  async claimRequest({ request, body, db }) {
    const reference = text(body.requestId).toUpperCase();
    const phone = normalizePhone(body.phone);
    if (!/^REQ-[0-9A-F]{8}$/.test(reference) || !isValidPhone(phone)) return error("Enter the request reference and the phone number used for it.", 400);
    const retryAfter = await consumeLimit(db, "claim", 60 * 60, [{ scope: "ip", value: clientIp(request), maximum: 10 }]);
    if (retryAfter) return rateLimited(retryAfter);
    const { token, owner } = await householdToken(request);
    const result = await db.requests.updateOne({ id: reference, phone }, { $addToSet: { claimed_by: owner } });
    if (!result.matchedCount) return error("No request matches that reference and phone number.", 404);
    return Response.json(await viewState(request, { owner }), { headers: { "Set-Cookie": cookie(HOUSEHOLD_COOKIE, token, HOUSEHOLD_COOKIE_AGE) } });
  },

  async registerCollector({ request, body, db }) {
    if (!text(body.name) || !text(body.phone) || !text(body.serviceArea) || !text(body.district)) return error("Name, phone, district and service area are required.", 400);
    if (body.consent !== true && body.consent !== "on") return error("Please accept the privacy notice to continue.", 400);
    if (!validName(body.name)) return error("Enter a valid collector name using letters only.", 400);
    const phone = normalizePhone(body.phone);
    if (!isValidPhone(phone)) return error("Enter a valid Sri Lankan mobile number, for example 0771234567.", 400);
    if (!DISTRICT_VALUES.includes(text(body.district))) return error("Select your district.", 400);
    if (text(body.serviceArea).length < 2 || text(body.serviceArea).length > 80) return error("Enter a valid service area.", 400);
    if (text(body.organization).length > 100) return error("Organization name must be 100 characters or fewer.", 400);
    const retryAfter = await consumeLimit(db, "collector", 60 * 60 * 24, [
      { scope: "ip", value: clientIp(request), maximum: 3 }, { scope: "phone", value: phone, maximum: 1 },
    ]);
    if (retryAfter) return rateLimited(retryAfter);
    const accessKey = randomSecret();
    const collector: Collector = {
      id: randomId("CLR"), name: text(body.name), phone, service_area: text(body.serviceArea), district: text(body.district),
      organization: text(body.organization) || "Independent Collector", verification_status: "Verification Pending",
    };
    try {
      await db.collectors.insertOne({ ...collector, access_key_hash: await sha256(accessKey), coins_spent: 0, created_at: now() });
    } catch (cause) {
      if (isDuplicateKey(cause)) return error("A collector is already registered with this phone number.", 409);
      throw cause;
    }
    return Response.json({ ...(await viewState(request, { collector })), accessKey }, { headers: { "Set-Cookie": cookie(COLLECTOR_COOKIE, `${collector.id}.${accessKey}`, 60 * 60 * 24 * 30) } });
  },
};

const householdActions: Record<string, (context: Context & { owner: string }) => Promise<Response | null>> = {
  async cancelRequest({ body, db, owner }) {
    const result = await db.requests.updateOne(
      { id: text(body.requestId), status: { $in: ["Pending", "Scheduled"] }, ...ownedBy(owner) },
      { $set: { status: "Cancelled", status_note: "Cancelled by household" } },
    );
    return result.modifiedCount ? null : error("This request can no longer be cancelled.", 409);
  },

  async confirmCompletion({ request, body, db, owner }) {
    const pickup = await db.requests.findOne({ id: text(body.requestId), status: "Awaiting Confirmation", ...ownedBy(owner) }, { projection: { collector_id: 1 } });
    if (!pickup) return error("This pickup is not waiting for your confirmation.", 409);
    // A collector signed in on this device could otherwise confirm the pickup they completed themselves.
    const collector = await currentCollector(db, request);
    if (collector && collector.id === pickup.collector_id) return error("The collector who completed a pickup cannot confirm it.", 403);
    const result = await db.requests.updateOne(
      { id: text(body.requestId), status: "Awaiting Confirmation" },
      { $set: { status: "Completed", coins_awarded: COINS_PER_PICKUP, confirmed_at: now(), status_note: "Confirmed by household" } },
    );
    return result.modifiedCount ? null : error("This pickup is not waiting for your confirmation.", 409);
  },

  async disputeCompletion({ body, db, owner }) {
    const result = await db.requests.updateOne(
      { id: text(body.requestId), status: "Awaiting Confirmation", ...ownedBy(owner) },
      { $set: { status: "Disputed", status_note: "Household reported the pickup did not happen as recorded" } },
    );
    return result.modifiedCount ? null : error("This pickup is not waiting for your confirmation.", 409);
  },
};

const collectorActions: Record<string, (context: Context & { collector: Collector }) => Promise<Response | null>> = {
  async acceptRequest({ body, db, collector }) {
    const pickup = await db.requests.findOne({ id: text(body.requestId) }, { projection: { phone: 1 } });
    if (pickup?.phone === collector.phone) return error("You cannot accept a pickup requested with your own phone number.", 403);
    const result = await db.requests.updateOne(
      { id: text(body.requestId), status: "Pending" },
      { $set: { status: "Scheduled", status_note: "", collector_id: collector.id, collector_name: collector.name, collector_phone: collector.phone } },
    );
    return result.modifiedCount ? null : error("This pickup is no longer available.", 409);
  },

  async releaseRequest({ body, db, collector }) {
    const result = await db.requests.updateOne(
      { id: text(body.requestId), collector_id: collector.id, status: "Scheduled" },
      { $set: { status: "Pending", status_note: "Released by collector", collector_id: null, collector_name: null, collector_phone: null } },
    );
    return result.modifiedCount ? null : error("This pickup is not scheduled for you.", 409);
  },

  async completeRequest({ body, db, collector }) {
    const weight = Number(body.weight);
    if (!validWeight(weight)) return error("Enter the verified collected weight between 0.1 and 1000 kg.", 400);
    if (!WASTE_TYPE_VALUES.includes(text(body.wasteType))) return error("Select a valid waste type.", 400);
    // Coins are credited only when the household (or an admin) confirms the pickup.
    const result = await db.requests.updateOne(
      { id: text(body.requestId), collector_id: collector.id, status: "Scheduled" },
      { $set: { status: "Awaiting Confirmation", recorded_weight: weight, waste_type: text(body.wasteType), completed_at: now(), status_note: "" } },
    );
    return result.modifiedCount ? null : error("This pickup is not scheduled for you.", 409);
  },

  async redeem({ body, db, collector }) {
    const reward = REWARDS.find((item) => item.name === text(body.rewardName));
    if (!reward) return error("Select a valid reward.", 400);
    const [earned, account] = await Promise.all([coinsEarned(db, collector.id), db.collectors.findOne({ id: collector.id }, { projection: { _id: 0, coins_spent: 1 } })]);
    const spent = account?.coins_spent ?? 0;
    if (earned - spent < reward.points) return error("Not enough collector coins for this reward.", 400);
    // Earned coins only grow, so reserving against the spent total we read cannot overdraw; a concurrent redemption changes it and fails this match.
    const reserved = await db.collectors.updateOne({ id: collector.id, coins_spent: spent }, { $inc: { coins_spent: reward.points } });
    if (!reserved.modifiedCount) return error("Your balance changed. Please try again.", 409);
    try {
      await db.redemptions.insertOne({
        id: randomId("RED"), collector_id: collector.id, collector_name: collector.name, reward_name: reward.name, points: reward.points,
        reference: `ECO-${randomSecret().slice(0, 8).toUpperCase()}`, status: "Requested", created_at: now(), delivered_at: null,
      });
    } catch (cause) {
      await db.collectors.updateOne({ id: collector.id }, { $inc: { coins_spent: -reward.points } });
      throw cause;
    }
    return null;
  },
};

const adminActions: Record<string, (context: Context) => Promise<Response | null>> = {
  async adminCancelRequest({ body, db }) {
    const result = await db.requests.updateOne(
      { id: text(body.requestId), status: { $in: [...OPEN_STATUSES] } },
      { $set: { status: "Cancelled", status_note: "Cancelled by admin" } },
    );
    return result.modifiedCount ? null : error("This request can no longer be cancelled.", 409);
  },

  async adminReopenRequest({ body, db }) {
    const result = await db.requests.updateOne(
      { id: text(body.requestId), status: { $in: ["Scheduled", "Awaiting Confirmation", "Disputed"] } },
      { $set: { status: "Pending", status_note: "Reopened by admin", collector_id: null, collector_name: null, collector_phone: null, recorded_weight: null, completed_at: null } },
    );
    return result.modifiedCount ? null : error("Only scheduled or unconfirmed pickups can be reopened.", 409);
  },

  async adminApproveCompletion({ body, db }) {
    const result = await db.requests.updateOne(
      { id: text(body.requestId), status: { $in: ["Awaiting Confirmation", "Disputed"] } },
      { $set: { status: "Completed", coins_awarded: COINS_PER_PICKUP, confirmed_at: now(), status_note: "Approved by admin" } },
    );
    return result.modifiedCount ? null : error("This pickup is not waiting for approval.", 409);
  },

  async adminRejectCompletion({ body, db }) {
    const result = await db.requests.updateOne(
      { id: text(body.requestId), status: { $in: ["Awaiting Confirmation", "Disputed"] } },
      { $set: { status: "Scheduled", recorded_weight: null, completed_at: null, status_note: "Completion rejected by admin" } },
    );
    return result.modifiedCount ? null : error("This pickup is not waiting for approval.", 409);
  },

  async verifyCollector({ body, db }) {
    const result = await db.collectors.updateOne({ id: text(body.collectorId) }, { $set: { verification_status: "Verified" } });
    return result.matchedCount ? null : error("Collector not found.", 404);
  },

  async suspendCollector({ body, db }) {
    const collectorId = text(body.collectorId);
    const result = await db.collectors.updateOne({ id: collectorId }, { $set: { verification_status: "Suspended" } });
    if (!result.matchedCount) return error("Collector not found.", 404);
    // Hand their upcoming pickups back to other collectors.
    await db.requests.updateMany(
      { collector_id: collectorId, status: "Scheduled" },
      { $set: { status: "Pending", status_note: "Collector suspended", collector_id: null, collector_name: null, collector_phone: null } },
    );
    return null;
  },

  async issueCollectorKey({ request, body, db }) {
    const accessKey = randomSecret();
    const result = await db.collectors.updateOne({ id: text(body.collectorId) }, { $set: { access_key_hash: await sha256(accessKey) } });
    if (!result.matchedCount) return error("Collector not found.", 404);
    return Response.json({ ...(await viewState(request, { admin: true })), accessKey });
  },

  async markRedemptionDelivered({ body, db }) {
    // Rewards redeemed before delivery tracking existed have no status yet.
    const result = await db.redemptions.updateOne({ id: text(body.redemptionId), status: { $ne: "Delivered" } }, { $set: { status: "Delivered", delivered_at: now() } });
    return result.modifiedCount ? null : error("This reward was already delivered.", 409);
  },
};

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 10_000) return error("Request is too large.", 413);
    let body: ActionBody;
    try { body = await request.json() as ActionBody; } catch { return error("Invalid request.", 400); }
    if (!body || typeof body !== "object") return error("Invalid request.", 400);
    if (text(body.website)) return error("Submission rejected.", 400);
    const action = text(body.action);
    const db = await collections();
    const context = { request, body, db };

    if (Object.hasOwn(publicActions, action)) return await publicActions[action](context);

    if (Object.hasOwn(householdActions, action)) {
      const owner = await householdOwner(request);
      if (!owner) return error("This request is not linked to this device.", 401);
      return await householdActions[action]({ ...context, owner }) ?? Response.json(await viewState(request, { owner }));
    }

    if (Object.hasOwn(collectorActions, action)) {
      const collector = await currentCollector(db, request);
      if (!collector) return error("Collector login required.", 401);
      if (collector.verification_status === "Suspended") return error("Your collector account is suspended. Contact an admin.", 403);
      if (collector.verification_status !== "Verified") return error("Only a verified collector can do this.", 403);
      return await collectorActions[action]({ ...context, collector }) ?? Response.json(await viewState(request, { collector }));
    }

    if (Object.hasOwn(adminActions, action)) {
      if (!await isAdmin(request)) return error("Admin login required.", 401);
      return await adminActions[action](context) ?? Response.json(await viewState(request, { admin: true }));
    }

    return error("Unknown action.", 400);
  } catch { return error("The request could not be completed. Please try again.", 500); }
}
