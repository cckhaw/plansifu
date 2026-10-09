export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

export async function GET() {
  const out: Record<string, string> = {};
  for (const u of ["https://www.celcomdigi.com/postpaid", "https://www.celcomdigi.com/home/fibre"]) {
    try {
      const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36", "accept-language": "en-MY,en;q=0.9" } });
      const t = await r.text();
      out[u] = `${r.status} ${t.length} RM:${(t.match(/RM\s?\d+/g) ?? []).length}`;
    } catch (e) {
      out[u] = String(e);
    }
  }
  return Response.json(out);
}
