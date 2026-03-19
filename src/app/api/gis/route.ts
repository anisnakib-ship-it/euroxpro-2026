import { NextRequest, NextResponse } from "next/server";

const GIS_URL = "https://gis-api.aiesec.org/graphql";
const EXPA_TOKEN = process.env.AIESEC_GIS_TOKEN ?? "";

// ── In-process cache ───────────────────────────────────────────────────────────
// Keyed by the full request body string. TTL: 3 minutes.
// This means identical queries from different visitors share one AIESEC call.
const CACHE_TTL_MS = 3 * 60 * 1000;

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: unknown): void {
  // Evict oldest entries if cache grows beyond 200 entries (memory guard)
  if (cache.size >= 200) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Simple rate limiter ────────────────────────────────────────────────────────
// Max 60 requests per IP per minute.
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 60;

const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const cacheKey = JSON.stringify(body);

  // Return cached response if available
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Cache": "HIT" },
    });
  }

  // Forward to AIESEC GIS API
  try {
    const res = await fetch(GIS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: EXPA_TOKEN,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `GIS API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    setCached(cacheKey, data);

    return NextResponse.json(data, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
