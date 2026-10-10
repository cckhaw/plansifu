import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
// Singapore: close to Malaysian sites and not on the datacenter ranges some of them block.
export const preferredRegion = "sin1";

/** Only sites that block the scraper's CI network, never an open proxy. */
const ALLOWED_HOSTS = new Set(["www.celcomdigi.com", "www.eight.com.sg"]);

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Fetches a page for the scraper. Auth: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`. */
export async function GET(req: NextRequest) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !timingSafeEqual(digest(given), digest(secret))) {
    return new Response("Not found", { status: 404 });
  }

  let target: URL;
  try {
    target = new URL(req.nextUrl.searchParams.get("url") ?? "");
  } catch {
    return new Response("Bad url", { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return new Response("Host not allowed", { status: 403 });
  }

  const upstream = await fetch(target, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "accept-language": "en-MY,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  }).catch((e) => e as Error);
  if (upstream instanceof Error) return new Response(`Upstream error: ${upstream.message}`, { status: 502 });

  const body = await upstream.text();
  return new Response(upstream.ok ? body : `Upstream ${upstream.status}`, {
    status: upstream.ok ? 200 : 502,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
