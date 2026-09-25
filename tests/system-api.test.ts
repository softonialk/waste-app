import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays, colomboToday } from "../lib/constants";

// These tests run the real route handlers against a real MongoDB (set MONGODB_URI).
const mongoUri = process.env.MONGODB_URI;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Route = { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> };

let route: Route;
let ipCounter = 0;
let phoneCounter = 0;

const nextPhone = () => `0771${String(100000 + phoneCounter++).padStart(6, "0")}`;
const tomorrow = () => addDays(colomboToday(), 1);

// A browser-like client: keeps its own cookies and IP address.
function client() {
  const cookies = new Map<string, string>();
  const ip = `10.0.0.${++ipCounter}`;
  const headers = () => ({
    "content-type": "application/json",
    "x-real-ip": ip,
    cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
  });
  const remember = (response: Response) => {
    for (const header of response.headers.getSetCookie()) {
      const [pair] = header.split(";");
      const [name, value] = pair.split("=");
      if (value) cookies.set(name, value);
      else cookies.delete(name);
    }
  };
  return {
    cookies,
    async post(body: Json) {
      const response = await route.POST(new Request("http://localhost/api/system", { method: "POST", headers: headers(), body: JSON.stringify(body) }));
      remember(response);
      return { status: response.status, json: (await response.json()) as Json };
    },
    async get() {
      const response = await route.GET(new Request("http://localhost/api/system", { headers: headers() }));
      return (await response.json()) as Json;
    },
  };
}

type Client = ReturnType<typeof client>;

async function requestPickup(household: Client, overrides: Json = {}) {
  const result = await household.post({
    action: "createRequest", householdName: "Nimal Perera", phone: nextPhone(), address: "12 Temple Road, Kandy", district: "Kandy",
    wasteType: "Plastic", quantity: "4", pickupDate: tomorrow(), pickupTime: "09:30", consent: "on", ...overrides,
  });
  return result;
}

async function verifiedCollector(admin: Client) {
  const collector = client();
  const phone = nextPhone();
  const registered = await collector.post({ action: "registerCollector", name: "Kasun Silva", phone, district: "Kandy", serviceArea: "Peradeniya", consent: "on" });
  expect(registered.status).toBe(200);
  const id = registered.json.collector.profile.id;
  expect((await admin.post({ action: "verifyCollector", collectorId: id })).status).toBe(200);
  return { collector, id, phone };
}

async function adminClient() {
  const admin = client();
  const login = await admin.post({ action: "adminLogin", password: "test-admin-password" });
  expect(login.status).toBe(200);
  return admin;
}

describe.skipIf(!mongoUri)("system API", () => {
  beforeAll(async () => {
    process.env.MONGODB_DB = `ecoloop_test_${Date.now()}`;
    process.env.ADMIN_PASSWORD = "test-admin-password";
    route = (await import("../app/api/system/route")) as Route;
  });

  afterAll(async () => {
    const { getDatabase } = await import("../db/mongo");
    const db = await getDatabase();
    await db.dropDatabase();
    await db.client.close();
  });

  it("credits coins only after the household confirms the pickup", async () => {
    const admin = await adminClient();
    const household = client();
    const created = await requestPickup(household, { phone: "+94 77 555 0001" });
    expect(created.status).toBe(200);
    const reference = created.json.reference;
    expect(created.json.household.requests[0]).toMatchObject({ id: reference, status: "Pending", district: "Kandy" });

    const { collector } = await verifiedCollector(admin);
    expect((await collector.post({ action: "acceptRequest", requestId: reference })).status).toBe(200);

    const scheduled = (await household.get()).household.requests[0];
    expect(scheduled).toMatchObject({ status: "Scheduled", collector_name: "Kasun Silva" });

    const completed = await collector.post({ action: "completeRequest", requestId: reference, weight: "3.8", wasteType: "Plastic" });
    expect(completed.json.collector.balance).toBe(0);
    expect(completed.json.collector.jobs[0].status).toBe("Awaiting Confirmation");

    const confirmed = await household.post({ action: "confirmCompletion", requestId: reference });
    expect(confirmed.json.household.requests[0].status).toBe("Completed");
    expect((await collector.get()).collector.balance).toBe(100);

    // Phone numbers are stored in one format whatever the household typed.
    const adminView = await admin.get();
    expect(adminView.admin.requests.find((r: Json) => r.id === reference).phone).toBe("0775550001");
  });

  it("stops a collector from confirming their own pickup or accepting their own request", async () => {
    const admin = await adminClient();
    const { collector, phone } = await verifiedCollector(admin);

    const ownRequest = await requestPickup(client(), { phone });
    expect((await collector.post({ action: "acceptRequest", requestId: ownRequest.json.reference })).status).toBe(403);

    // The collector requests a pickup from their own browser with another number, then tries to confirm it.
    const other = await requestPickup(collector);
    const reference = other.json.reference;
    const helper = await verifiedCollector(admin);
    await helper.collector.post({ action: "acceptRequest", requestId: reference });
    await helper.collector.post({ action: "completeRequest", requestId: reference, weight: "2", wasteType: "Plastic" });
    // Now sign the helper in on the household's device.
    for (const [name, value] of helper.collector.cookies) if (name === "ecoloop_collector") collector.cookies.set(name, value);
    expect((await collector.post({ action: "confirmCompletion", requestId: reference })).status).toBe(403);
  });

  it("lets admins resolve disputes", async () => {
    const admin = await adminClient();
    const household = client();
    const { collector } = await verifiedCollector(admin);
    const reference = (await requestPickup(household)).json.reference;
    await collector.post({ action: "acceptRequest", requestId: reference });
    await collector.post({ action: "completeRequest", requestId: reference, weight: "5", wasteType: "Metal" });
    expect((await household.post({ action: "disputeCompletion", requestId: reference })).json.household.requests[0].status).toBe("Disputed");

    const rejected = await admin.post({ action: "adminRejectCompletion", requestId: reference });
    expect(rejected.json.admin.requests.find((r: Json) => r.id === reference).status).toBe("Scheduled");

    await collector.post({ action: "completeRequest", requestId: reference, weight: "5", wasteType: "Metal" });
    const approved = await admin.post({ action: "adminApproveCompletion", requestId: reference });
    expect(approved.json.admin.requests.find((r: Json) => r.id === reference).status).toBe("Completed");
    expect((await collector.get()).collector.balance).toBe(100);
  });

  it("releases jobs back to the open list and suspends collectors", async () => {
    const admin = await adminClient();
    const { collector, id } = await verifiedCollector(admin);
    const first = (await requestPickup(client())).json.reference;
    const second = (await requestPickup(client())).json.reference;
    await collector.post({ action: "acceptRequest", requestId: first });
    await collector.post({ action: "acceptRequest", requestId: second });

    const released = await collector.post({ action: "releaseRequest", requestId: first });
    expect(released.json.collector.openJobs.some((job: Json) => job.id === first)).toBe(true);

    const suspended = await admin.post({ action: "suspendCollector", collectorId: id });
    expect(suspended.json.admin.requests.find((r: Json) => r.id === second).status).toBe("Pending");
    expect((await collector.post({ action: "acceptRequest", requestId: second })).status).toBe(403);
  });

  it("lets households cancel and reclaim requests on another device", async () => {
    const household = client();
    const phone = nextPhone();
    const reference = (await requestPickup(household, { phone })).json.reference;

    const newDevice = client();
    expect((await newDevice.post({ action: "claimRequest", requestId: reference, phone: nextPhone() })).status).toBe(404);
    const claimed = await newDevice.post({ action: "claimRequest", requestId: reference.toLowerCase(), phone });
    expect(claimed.json.household.requests[0].id).toBe(reference);

    const cancelled = await newDevice.post({ action: "cancelRequest", requestId: reference });
    expect(cancelled.json.household.requests[0].status).toBe("Cancelled");
    expect((await household.get()).household.requests[0].status).toBe("Cancelled");
    expect((await client().post({ action: "cancelRequest", requestId: reference })).status).toBe(401);
  });

  it("validates pickup dates in Sri Lanka time and requires consent", async () => {
    const today = colomboToday();
    expect((await requestPickup(client(), { pickupDate: addDays(today, -1) })).status).toBe(400);
    expect((await requestPickup(client(), { pickupDate: addDays(today, 31) })).status).toBe(400);
    expect((await requestPickup(client(), { pickupDate: today, pickupTime: "00:00" })).json.error).toBe("Choose a pickup time later than now.");
    expect((await requestPickup(client(), { consent: undefined })).status).toBe(400);
    expect((await requestPickup(client(), { district: "Atlantis" })).status).toBe(400);
    expect((await requestPickup(client(), { pickupDate: addDays(today, 30) })).status).toBe(200);
  });

  it("never lets concurrent redemptions overspend coins", async () => {
    const admin = await adminClient();
    const { collector } = await verifiedCollector(admin);
    for (let index = 0; index < 5; index++) {
      const reference = (await requestPickup(client())).json.reference;
      await collector.post({ action: "acceptRequest", requestId: reference });
      await collector.post({ action: "completeRequest", requestId: reference, weight: "1", wasteType: "Glass" });
      await admin.post({ action: "adminApproveCompletion", requestId: reference });
    }
    expect((await collector.get()).collector.balance).toBe(500);

    const results = await Promise.all([1, 2, 3].map(() => collector.post({ action: "redeem", rewardName: "Eco Gift Pack" })));
    expect(results.filter((result) => result.status === 200)).toHaveLength(1);

    const state = await collector.get();
    expect(state.collector.balance).toBe(0);
    const redemption = state.collector.redemptions[0];
    expect(redemption.status).toBe("Requested");

    const delivered = await admin.post({ action: "markRedemptionDelivered", redemptionId: redemption.id });
    expect(delivered.json.admin.redemptions.find((r: Json) => r.id === redemption.id).status).toBe("Delivered");
  });

  it("requires sign-in for protected actions", async () => {
    const anonymous = client();
    expect((await anonymous.post({ action: "verifyCollector", collectorId: "CLR-00000000" })).status).toBe(401);
    expect((await anonymous.post({ action: "acceptRequest", requestId: "REQ-00000000" })).status).toBe(401);
    expect((await anonymous.post({ action: "adminLogin", password: "wrong" })).status).toBe(401);
    const view = await anonymous.get();
    expect(view.admin).toBeNull();
    expect(view.collector).toBeNull();
  });
});
