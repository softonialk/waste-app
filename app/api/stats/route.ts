import { collections } from "../../../db/mongo";

export const dynamic = "force-dynamic";

// Public totals for the home page; only aggregate numbers, never personal details.
export async function GET() {
  try {
    const db = await collections();
    const [completed, collectors] = await Promise.all([
      db.requests.aggregate<{ pickups: number; kg: number }>([
        { $match: { status: "Completed" } },
        { $group: { _id: null, pickups: { $sum: 1 }, kg: { $sum: { $ifNull: ["$recorded_weight", 0] } } } },
      ]).toArray(),
      db.collectors.countDocuments({ verification_status: "Verified" }),
    ]);
    const totals = completed[0] ?? { pickups: 0, kg: 0 };
    return Response.json(
      { completedPickups: totals.pickups, kgRecycled: Math.round(totals.kg * 10) / 10, verifiedCollectors: collectors },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    return Response.json({ error: "Statistics are temporarily unavailable." }, { status: 503 });
  }
}
