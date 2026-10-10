/**
 * Two-letter code and colour for each telco's badge. Every telco gets a unique pair so
 * badges are never confused. `fg` is the text colour (dark on light backgrounds).
 */
export interface ProviderBrand {
  abbr: string;
  bg: string;
  fg: string;
}

const LIGHT = "#0F172A";
const DARK = "#FFFFFF";

export const PROVIDER_BRANDS: Record<string, ProviderBrand> = {
  maxis: { abbr: "MX", bg: "#15803D", fg: DARK },
  celcomdigi: { abbr: "CD", bg: "#A16207", fg: DARK },
  unifi: { abbr: "UF", bg: "#C2410C", fg: DARK },
  "u mobile": { abbr: "UM", bg: "#BE185D", fg: DARK },
  singtel: { abbr: "ST", bg: "#DC2626", fg: DARK },
  m1: { abbr: "M1", bg: "#1D4ED8", fg: DARK },
  starhub: { abbr: "SH", bg: "#0F766E", fg: DARK },
  yes: { abbr: "YS", bg: "#7C3AED", fg: DARK },
  cmlink: { abbr: "CM", bg: "#0E7490", fg: DARK },
  vibe: { abbr: "VB", bg: "#C026D3", fg: DARK },
  redone: { abbr: "RO", bg: "#7F1D1D", fg: DARK },
  tunetalk: { abbr: "TT", bg: "#4D7C0F", fg: DARK },
  xox: { abbr: "XX", bg: "#111827", fg: DARK },
  ansar: { abbr: "AN", bg: "#78350F", fg: DARK },
  hotlink: { abbr: "HL", bg: "#14B8A6", fg: LIGHT },
  eastel: { abbr: "ET", bg: "#0284C7", fg: DARK },
  hellosim: { abbr: "HS", bg: "#FDA4AF", fg: LIGHT },
  "singtel hi!": { abbr: "HI", bg: "#FACC15", fg: LIGHT },
  simba: { abbr: "SB", bg: "#FB923C", fg: LIGHT },
  giga: { abbr: "GG", bg: "#34D399", fg: LIGHT },
  maxx: { abbr: "MA", bg: "#22D3EE", fg: LIGHT },
  gomo: { abbr: "GO", bg: "#A3E635", fg: LIGHT },
  zym: { abbr: "ZY", bg: "#C4B5FD", fg: LIGHT },
  zero1: { abbr: "Z1", bg: "#64748B", fg: DARK },
  cuniq: { abbr: "CQ", bg: "#A8A29E", fg: LIGHT },
  eight: { abbr: "EI", bg: "#1E3A8A", fg: DARK },
  vivifi: { abbr: "VF", bg: "#6366F1", fg: DARK },
};

/** Fallback for telcos added later: first two letters + a colour derived from the name. */
export function getProviderBrand(name: string): ProviderBrand {
  const known = PROVIDER_BRANDS[name.trim().toLowerCase()];
  if (known) return known;
  const letters = name.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const hash = [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return { abbr: (letters.slice(0, 2) || "??").padEnd(2, "?"), bg: `hsl(${hash % 360} 55% 38%)`, fg: DARK };
}
