import { jsonLd, lines, walkJson } from "../../scrapers/parse-utils";
import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";

/**
 * Jetpac (jetpacglobal.com). Each product page carries a schema.org Product/AggregateOffer in JSON-LD with one Offer per
 * pack (all validity tabs, not only the default one the UI shows), e.g.
 *   name "Japan eSIM - 10 GB - 30 Days", price 16, priceCurrency "USD",
 *   additionalProperty: [{name:"Data allowance", value:"10 GB"}, {name:"Validity", value:"30 Days"}]
 * Prices equal the visible (already discounted) pack prices. A missing page renders "Page not found" with no Product JSON-LD.
 */
const prop = (o: Record<string, unknown>, name: string): string | null => {
  const arr = o.additionalProperty;
  if (!Array.isArray(arr)) return null;
  const hit = arr.find((p) => p && typeof p === "object" && (p as Record<string, unknown>).name === name) as Record<string, unknown> | undefined;
  return hit && hit.value != null ? String(hit.value) : null;
};

export const jetpac: EsimParser = (page, destination) => {
  const offers: Record<string, unknown>[] = [];
  let area: string | null = null;
  for (const block of jsonLd(page)) {
    walkJson(block, (o) => {
      if (o["@type"] === "Product" && o.areaServed && typeof o.areaServed === "object") {
        const n = (o.areaServed as Record<string, unknown>).name;
        if (typeof n === "string") area = n;
      }
      if (o["@type"] === "Offer" && o.price != null) offers.push(o);
    });
  }

  // page-level statements (same for every pack on the page)
  const text = lines(page).join("\n");
  const dataOnly = /data roaming only,?\s*no sms/i.test(text);
  const unlimitedNote = text.match(/first (\d+) ?GB every 24 hours/i);
  const freeApps = /free whatsapp/i.test(text);

  const out: RawEsimPlan[] = [];
  for (const o of offers) {
    const allowance = prop(o, "Data allowance") ?? String(o.name ?? "");
    const validity = prop(o, "Validity") ?? String(o.name ?? "");
    const price = Number(o.price);
    const currency = String(o.priceCurrency ?? "");
    const vm = validity.match(/(\d+)\s*days?/i);
    if (!vm || !(price > 0) || !currency) continue;
    const days = Number(vm[1]);
    const unlimited = /unlimited/i.test(allowance);
    const dm = allowance.match(/(\d[\d.,]*)\s*(TB|GB|MB)/i);
    let data: number | null = null;
    if (unlimited) data = -1;
    else if (dm) {
      const n = Number(dm[1].replace(/,/g, ""));
      const u = dm[2].toUpperCase();
      data = u === "TB" ? n * 1000 : u === "MB" ? n / 1000 : n;
    }
    if (data === null) continue;
    const perks: string[] = [];
    if (freeApps && data !== -1 && data >= 3) perks.push("Free WhatsApp & navigation after data runs out");
    out.push(
      esimPlan({
        title: `${unlimited ? "Unlimited" : `${data}GB`} / ${days} ${days === 1 ? "day" : "days"}`,
        coverage: destination.type === "country" ? null : area,
        data_gb: data,
        data_note: unlimited ? (unlimitedNote ? `${unlimitedNote[1]}GB per day at full speed, then 1 Mbps` : "Fair use applies") : null,
        validity_days: days,
        price,
        currency,
        voice_included: dataOnly ? false : null,
        sms_included: dataOnly ? false : null,
        voice_sms_note: dataOnly ? "Data only (calls via in-app voice packs)" : null,
        perks,
      }),
    );
  }
  return out;
};
