import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// Edge runtime: renders the social card close to whoever requests it (WhatsApp, Telegram, LinkedIn crawlers).
export const runtime = "edge";

const NAVY = "#0b2a5b";
const GOLD = "#d4900a";

/** Query values come from a URL anyone can craft, so keep them short and printable. */
const clean = (v: string | null, max: number) => (v ?? "").replace(/[^\x20-\x7E]/g, "").slice(0, max).trim();

/**
 * Google Fonts serves a tiny TrueType subset when asked for specific characters, which is all Satori needs.
 * Failure is fine: the card falls back to the built-in font (CJK would then show as boxes, so we skip it).
 */
async function font(family: string, text: string, weight = 700): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const country = sp.get("country") === "SG" ? "SG" : "MY";
  const title = clean(sp.get("title"), 90) || "Compare Telco & Broadband Plans";
  const from = clean(sp.get("from"), 28);
  const badge = clean(sp.get("badge"), 28);
  const flag = country === "SG" ? "🇸🇬" : "🇲🇾";
  const place = country === "SG" ? "Singapore" : "Malaysia";
  const logo = new URL("/logo.png", req.nextUrl.origin).toString();

  const [latin, cjk] = await Promise.all([font("Inter", `${title}${from}${badge}${place}PlanSifu Compare plans. Updated every night.`), font("Noto+Sans+SC", "师傅")]);
  const fonts = [
    ...(latin ? [{ name: "Inter", data: latin, weight: 700 as const, style: "normal" as const }] : []),
    ...(cjk ? [{ name: "Noto Sans SC", data: cjk, weight: 700 as const, style: "normal" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 64px", background: "linear-gradient(135deg, #ffffff 0%, #eef1f8 100%)", fontFamily: fonts.length ? "Inter, Noto Sans SC" : undefined, color: NAVY }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} height={120} width={280} alt="" style={{ objectFit: "contain" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 26px", borderRadius: 999, background: "#ffffff", border: "2px solid #dfe3ee", fontSize: 32, fontWeight: 700 }}>
            <span>{flag}</span>
            <span>{place}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: title.length > 48 ? 62 : 76, lineHeight: 1.08, fontWeight: 700, letterSpacing: -2, maxWidth: 1040 }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 34 }}>
            {from && <div style={{ display: "flex", padding: "16px 34px", borderRadius: 999, background: GOLD, color: "#ffffff", fontSize: 40, fontWeight: 700 }}>{from}</div>}
            {badge && <div style={{ display: "flex", padding: "16px 30px", borderRadius: 999, background: "#e8ecf6", fontSize: 32, fontWeight: 700 }}>{badge}</div>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 30, fontWeight: 700 }}>
          <div style={{ display: "flex", color: "#5b6785" }}>Compare plans. Updated every night.</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span>PlanSifu</span>
            <span style={{ color: GOLD }}>师傅</span>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, background: `linear-gradient(90deg, ${NAVY}, ${GOLD})`, display: "flex" }} />
      </div>
    ),
    { width: 1200, height: 630, fonts: fonts.length ? fonts : undefined, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" } },
  );
}
