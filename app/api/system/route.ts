import { getDatabase } from "../../../db/raw";

export const dynamic = "force-dynamic";

type ActionBody = Record<string, unknown> & { action?: string };
const id = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

async function snapshot() {
  const db = getDatabase();
  const [requests, collectors, redemptions] = await Promise.all([
    db.prepare("SELECT * FROM collection_requests ORDER BY created_at DESC").all(),
    db.prepare("SELECT * FROM collectors ORDER BY created_at DESC").all(),
    db.prepare("SELECT * FROM redemptions ORDER BY created_at DESC").all(),
  ]);
  return { requests: requests.results, collectors: collectors.results, redemptions: redemptions.results };
}

export async function GET() {
  try { return Response.json(await snapshot()); }
  catch { return Response.json({ error: "System data is temporarily unavailable." }, { status: 503 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ActionBody;
    const db = getDatabase();
    if (body.action === "createRequest") {
      const required = ["householdName", "phone", "address", "wasteType", "quantity", "pickupDate", "pickupTime"];
      if (required.some((key) => !text(body[key]))) return Response.json({ error: "Please complete every required field." }, { status: 400 });
      await db.prepare(`INSERT INTO collection_requests (id, household_name, phone, address, waste_type, quantity, pickup_date, pickup_time, notes, status, coins_awarded, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 0, ?)`).bind(id("REQ"), text(body.householdName), text(body.phone), text(body.address), text(body.wasteType), text(body.quantity), text(body.pickupDate), text(body.pickupTime), text(body.notes), new Date().toISOString()).run();
    } else if (body.action === "registerCollector") {
      if (!text(body.name) || !text(body.phone) || !text(body.serviceArea)) return Response.json({ error: "Name, phone and service area are required." }, { status: 400 });
      await db.prepare(`INSERT INTO collectors (id, name, phone, service_area, organization, verification_status, created_at) VALUES (?, ?, ?, ?, ?, 'Verification Pending', ?)`).bind(id("CLR"), text(body.name), text(body.phone), text(body.serviceArea), text(body.organization) || "Independent Collector", new Date().toISOString()).run();
    } else if (body.action === "acceptRequest") {
      const collector = await db.prepare("SELECT * FROM collectors WHERE id = ? AND verification_status = 'Verified'").bind(text(body.collectorId)).first<Record<string, unknown>>();
      if (!collector) return Response.json({ error: "Only a verified collector can accept requests." }, { status: 403 });
      await db.prepare("UPDATE collection_requests SET status = 'Scheduled', collector_id = ?, collector_name = ? WHERE id = ? AND status = 'Pending'").bind(text(body.collectorId), collector.name, text(body.requestId)).run();
    } else if (body.action === "rejectRequest") {
      await db.prepare("UPDATE collection_requests SET status = 'Cancelled' WHERE id = ? AND status = 'Pending'").bind(text(body.requestId)).run();
    } else if (body.action === "completeRequest") {
      const weight = Number(body.weight);
      if (!Number.isFinite(weight) || weight <= 0) return Response.json({ error: "Enter the verified collected weight." }, { status: 400 });
      await db.prepare("UPDATE collection_requests SET status = 'Completed', recorded_weight = ?, waste_type = ?, coins_awarded = 100 WHERE id = ? AND collector_id = ? AND status = 'Scheduled'").bind(weight, text(body.wasteType), text(body.requestId), text(body.collectorId)).run();
    } else if (body.action === "verifyCollector") {
      await db.prepare("UPDATE collectors SET verification_status = 'Verified' WHERE id = ?").bind(text(body.collectorId)).run();
    } else if (body.action === "redeem") {
      const collectorId = text(body.collectorId); const points = Number(body.points);
      const earned = await db.prepare("SELECT COALESCE(SUM(coins_awarded), 0) total FROM collection_requests WHERE collector_id = ? AND status = 'Completed'").bind(collectorId).first<{ total: number }>();
      const spent = await db.prepare("SELECT COALESCE(SUM(points), 0) total FROM redemptions WHERE collector_id = ?").bind(collectorId).first<{ total: number }>();
      if ((earned?.total ?? 0) - (spent?.total ?? 0) < points) return Response.json({ error: "Not enough collector coins for this reward." }, { status: 400 });
      const reference = `ECO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await db.prepare("INSERT INTO redemptions (id, collector_id, reward_name, points, reference, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(id("RED"), collectorId, text(body.rewardName), points, reference, new Date().toISOString()).run();
    } else return Response.json({ error: "Unknown action." }, { status: 400 });
    return Response.json(await snapshot());
  } catch { return Response.json({ error: "The request could not be completed. Please try again." }, { status: 500 }); }
}
