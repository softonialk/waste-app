import { collections } from "../../../db/mongo";
import { clientIp, consumeLimit, rateLimited } from "../../../lib/server/security";

export const dynamic = "force-dynamic";

type NominatimResult = { lat?: string; lon?: string; display_name?: string };

const CACHE_DAYS = 30;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return Response.json({ error: "Enter a Sri Lankan location." }, { status: 400 });
  if (query.length > 120) return Response.json({ error: "Location search is too long." }, { status: 400 });
  const cacheKey = query.toLocaleLowerCase().replace(/\s+/g, " ");

  try {
    const db = await collections();
    const cached = await db.geocodeCache.findOne({ query: cacheKey }, { projection: { _id: 0, latitude: 1, longitude: 1, label: 1 } });
    if (cached) return Response.json(cached);

    const retryAfter = await consumeLimit(db, "geocode", 60, [{ scope: "ip", value: clientIp(request), maximum: 10 }]);
    if (retryAfter) return rateLimited(retryAfter);
    // Nominatim's usage policy allows at most one request per second for the whole site.
    const busy = await consumeLimit(db, "geocode-upstream", 1, [{ scope: "site", value: "nominatim", maximum: 1 }]);
    if (busy) return Response.json({ error: "Location search is busy. Please try again in a moment." }, { status: 429, headers: { "Retry-After": "1" } });

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${query}, Sri Lanka`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("countrycodes", "lk");
    url.searchParams.set("limit", "1");
    const response = await fetch(url, {
      headers: { Accept: "application/json", "Accept-Language": "en", "User-Agent": "NextGen-Waste-App/1.0 (+https://www.nextgen.mom)" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Geocoding service failed");
    const result = (await response.json() as NominatimResult[])[0];
    const latitude = Number(result?.lat);
    const longitude = Number(result?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return Response.json({ error: "Location not found in Sri Lanka." }, { status: 404 });
    }
    const place = { latitude, longitude, label: result.display_name ?? query };
    await db.geocodeCache.updateOne(
      { query: cacheKey },
      { $set: { ...place, expires_at: new Date(Date.now() + CACHE_DAYS * 24 * 60 * 60 * 1000) } },
      { upsert: true },
    );
    return Response.json(place);
  } catch {
    return Response.json({ error: "Location search is temporarily unavailable." }, { status: 503 });
  }
}
