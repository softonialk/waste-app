import { MongoServerError } from "mongodb";
import type { Collections } from "../../db/mongo";

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Hash both sides first so the comparison always runs over equal-length buffers.
export async function safeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([a, b].map((value) => crypto.subtle.digest("SHA-256", encoder.encode(value))));
  const a1 = new Uint8Array(left), b1 = new Uint8Array(right);
  let diff = 0;
  for (let index = 0; index < a1.length; index++) diff |= a1[index] ^ b1[index];
  return diff === 0;
}

export const randomSecret = () => crypto.randomUUID().replace(/-/g, "");
export const randomId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

export const cookieValue = (request: Request, name: string) =>
  request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";

export const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

// Optional secrets fall back to values derived from MONGODB_URI, which is already secret and always set.
export async function derivedSecret(purpose: string) {
  return sha256(`${purpose}:${process.env.MONGODB_URI ?? ""}`);
}

export const isDuplicateKey = (cause: unknown) => cause instanceof MongoServerError && cause.code === 11000;

// Vercel sets x-real-ip itself, so clients cannot spoof it to dodge limits.
export const clientIp = (request: Request) =>
  request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

async function rateLimitKey(parts: string[]) {
  const salt = process.env.RATE_LIMIT_SALT || await derivedSecret("rate-limit");
  return sha256(`${salt}:${parts.join(":")}`);
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

export type LimitCheck = { scope: string; value: string; maximum: number };

// Returns 0 when allowed, otherwise the number of seconds until the window resets.
export async function consumeLimit(db: Collections, action: string, windowSeconds: number, checks: LimitCheck[]) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const expiresAt = new Date((windowStart + windowSeconds) * 1000);
  for (const check of checks) {
    const key = await rateLimitKey([action, check.scope, check.value, String(windowStart)]);
    if (await countAttempt(db, key, action, expiresAt) > check.maximum) return Math.max(1, windowStart + windowSeconds - now);
  }
  return 0;
}

export function rateLimited(retryAfter: number) {
  return Response.json({ error: "Too many attempts. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
}
