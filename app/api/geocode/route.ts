export const dynamic = "force-dynamic";

type NominatimResult = { lat?: string; lon?: string; display_name?: string };

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return Response.json({ error: "Enter a Sri Lankan location." }, { status: 400 });
  if (query.length > 120) return Response.json({ error: "Location search is too long." }, { status: 400 });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${query}, Sri Lanka`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "lk");
  url.searchParams.set("limit", "1");

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "EcoLoop-Waste-App/1.0 (+https://www.nextgen.mom)",
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Geocoding service failed");
    const results = await response.json() as NominatimResult[];
    const result = results[0];
    const latitude = Number(result?.lat);
    const longitude = Number(result?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return Response.json({ error: "Location not found in Sri Lanka." }, { status: 404 });
    }
    return Response.json({ latitude, longitude, label: result.display_name ?? query });
  } catch {
    return Response.json({ error: "Location search is temporarily unavailable." }, { status: 503 });
  }
}
