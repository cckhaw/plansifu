import { getAdminClient } from "../scrapers/db-upsert";

/** Prints a quality summary of the active Travel eSIM data (run from CI: Actions -> suite = audit). */
async function main() {
  const db = getAdminClient();
  const all: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("esim_plans").select("*, provider:providers(name)").eq("is_active", true).range(from, from + 999);
    if (error) throw error;
    all.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  type P = { provider: { name: string }; destination_key: string; title: string; data_gb: number | null; validity_days: number | null; price: number; currency: string; voice_included: boolean | null; sms_included: boolean | null; phone_number: boolean | null; perks: string[]; coverage: string | null };
  const rows = all as unknown as P[];
  console.log(`ACTIVE esim plans: ${rows.length}`);

  const by = <K extends string>(f: (p: P) => K) => rows.reduce<Record<string, number>>((m, p) => ((m[f(p)] = (m[f(p)] ?? 0) + 1), m), {});
  console.log("\nPER BRAND:", JSON.stringify(by((p) => p.provider.name)));
  console.log("PER DESTINATION:", JSON.stringify(by((p) => p.destination_key as string)));
  console.log("CURRENCIES:", JSON.stringify(by((p) => p.currency)));
  const pct = (n: number) => `${Math.round((n / rows.length) * 100)}%`;
  console.log(`\nvoice true ${pct(rows.filter((p) => p.voice_included).length)}, false ${pct(rows.filter((p) => p.voice_included === false).length)}, null ${pct(rows.filter((p) => p.voice_included === null).length)}`);
  console.log(`phone_number true ${pct(rows.filter((p) => p.phone_number).length)}, false ${pct(rows.filter((p) => p.phone_number === false).length)}, null ${pct(rows.filter((p) => p.phone_number === null).length)}`);
  console.log(`unlimited ${pct(rows.filter((p) => p.data_gb !== null && p.data_gb < 0).length)}, data null ${pct(rows.filter((p) => p.data_gb === null).length)}, validity null ${pct(rows.filter((p) => p.validity_days === null).length)}`);

  // AUDIT_DEST = "japan" or "japan|GigSky,Ubigi" (destination, optional brand filter)
  const [destArg, brandArg] = (process.env.AUDIT_DEST || "japan").split("|");
  const dest = destArg || "japan";
  const brandFilter = brandArg?.split(",").map((b) => b.trim().toLowerCase());
  const usd: Record<string, number> = { USD: 1, EUR: 1.16, GBP: 1.33, MYR: 0.245, SGD: 0.78, AUD: 0.65 };
  console.log(`\n--- ${dest}: brand | title | GB | days | price | voice/sms/number | perks`);
  rows
    .filter((p) => p.destination_key === dest && (!brandFilter || brandFilter.includes(p.provider.name.toLowerCase())))
    .sort((a, b) => a.provider.name.localeCompare(b.provider.name) || Number(a.price) - Number(b.price))
    .forEach((p) =>
      console.log(`${p.provider.name} | ${p.title} | ${p.data_gb} | ${p.validity_days} | ${p.price} ${p.currency} | ${p.voice_included}/${p.sms_included}/${p.phone_number} | ${p.perks.slice(0, 3).join(", ")}${p.coverage ? ` | cov: ${p.coverage}` : ""}`),
    );

  console.log("\n--- suspicious: price per GB < $0.15 or > $25 (USD est.), or validity > 365");
  rows
    .filter((p) => p.data_gb && p.data_gb > 0 && usd[p.currency])
    .map((p) => ({ p, perGb: (Number(p.price) * usd[p.currency]) / Number(p.data_gb) }))
    .filter((x) => x.perGb < 0.15 || x.perGb > 25)
    .slice(0, 25)
    .forEach(({ p, perGb }) => console.log(`${p.provider.name} ${p.destination_key} | ${p.title} | ${p.data_gb}GB ${p.validity_days}d ${p.price} ${p.currency} => $${perGb.toFixed(2)}/GB`));
  console.log("\n--- brands per destination (count of brands with plans)");
  const m = new Map<string, Set<string>>();
  rows.forEach((p) => m.set(p.destination_key, (m.get(p.destination_key) ?? new Set()).add(p.provider.name)));
  console.log([...m].map(([k, v]) => `${k}:${v.size}`).join("  "));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
