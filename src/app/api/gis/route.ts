import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const GIS_URL = "https://gis-api.aiesec.org/graphql";
const EXPA_TOKEN = process.env.AIESEC_GIS_TOKEN ?? "";

const CACHE_TTL_S  = 3 * 60;        // 3 minutes (Upstash / browser)
const CACHE_TTL_MS = CACHE_TTL_S * 1000;
const L1_TTL_MS    = 30 * 1000;     // 30 seconds (in-process)

// ── L1: In-process cache (per instance, ultra-fast) ───────────────────────────

interface L1Entry { data: unknown; expiresAt: number; }
const l1 = new Map<string, L1Entry>();

function l1Get(key: string): unknown | null {
  const entry = l1.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { l1.delete(key); return null; }
  return entry.data;
}

function l1Set(key: string, data: unknown): void {
  if (l1.size >= 200) {
    const first = l1.keys().next().value;
    if (first !== undefined) l1.delete(first);
  }
  l1.set(key, { data, expiresAt: Date.now() + L1_TTL_MS });
}

// ── L2: Upstash Redis (shared across all instances) ───────────────────────────

// Initialise lazily so missing env vars don't crash the module at import time.
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

async function l2Get(key: string): Promise<unknown | null> {
  try {
    const r = getRedis();
    if (!r) return null;
    return await r.get(key);
  } catch {
    return null; // Redis unavailable — fall through to GIS API
  }
}

async function l2Set(key: string, data: unknown): Promise<void> {
  try {
    const r = getRedis();
    if (!r) return;
    await r.set(key, data, { ex: CACHE_TTL_S });
  } catch {
    // Non-fatal — instance cache still works
  }
}

// ── Stable cache key ──────────────────────────────────────────────────────────

function stableKey(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableKey).join(",")}]`;
  if (v !== null && typeof v === "object") {
    return `{${Object.keys(v as object).sort().map(
      k => `"${k}":${stableKey((v as Record<string, unknown>)[k])}`
    ).join(",")}}`;
  }
  return JSON.stringify(v);
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT     = 60;
const rateLimiter    = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (rateLimiter.size > 500) {
    for (const [key, e] of rateLimiter) {
      if (now > e.resetAt) rateLimiter.delete(key);
    }
  }
  const entry = rateLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
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

  const cacheKey = `gis:${stableKey(body)}`;
  const cacheHeaders = {
    "Cache-Control": `public, max-age=${CACHE_TTL_S}, stale-while-revalidate=60`,
  };

  // L1 hit — fastest path (no network)
  const l1Hit = l1Get(cacheKey);
  if (l1Hit) {
    return NextResponse.json(l1Hit, { headers: { ...cacheHeaders, "X-Cache": "L1-HIT" } });
  }

  // L2 hit — shared Redis cache (single network hop, ~5ms)
  const l2Hit = await l2Get(cacheKey);
  if (l2Hit) {
    l1Set(cacheKey, l2Hit); // warm L1 for subsequent requests on this instance
    return NextResponse.json(l2Hit, { headers: { ...cacheHeaders, "X-Cache": "L2-HIT" } });
  }

  // Cache miss — fetch from AIESEC GIS API
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

    // Write to both cache layers (fire-and-forget for L2)
    l1Set(cacheKey, data);
    void l2Set(cacheKey, data);

    return NextResponse.json(data, { headers: { ...cacheHeaders, "X-Cache": "MISS" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
