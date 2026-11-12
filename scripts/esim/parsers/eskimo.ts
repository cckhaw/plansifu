import { clean, dom, lines } from "../../scrapers/parse-utils";
import { esimPlan, type EsimParser, type RawEsimPlan } from "../types";

/**
 * Eskimo (eskimo.travel). The plan page lists "Fixed Data" plans (no expiry) grouped by coverage area
 * (Global, a region, and the country itself), each a `.plans-section` with a `.cover-note` ("31 countries" / "Japan only")
 * and `.day-card`s: `.day-card__value` + `.day-card__unit` (e.g. 10 GB) and a struck-through `.day-card__old` list price
 * next to the `.day-card__price` actually shown (first-purchase promo price, "35% off first purchase, capped at $12").
 * The "Unlimited" tab (daily pass) is not rendered until clicked, so its prices are not on the captured page.
 */
// The page shows the promo price as the charged one; set to false to report the struck-through list price instead.
const USE_SHOWN_PRICE = true;

const SYMBOLS: [RegExp, string][] = [
  [/^US\$|^USD/i, "USD"],
  [/^A\$|^AU\$|^AUD/i, "AUD"],
  [/^S\$|^SGD/i, "SGD"],
  [/^HK\$|^HKD/i, "HKD"],
  [/^NT\$|^TWD/i, "TWD"],
  [/^RM|^MYR/i, "MYR"],
  [/^€|^EUR/i, "EUR"],
  [/^£|^GBP/i, "GBP"],
  [/^CA\$|^C\$|^CAD/i, "CAD"],
];
const parsePrice = (s: string, fallback: string | null): { amount: number; currency: string } | null => {
  const t = clean(s);
  const m = t.match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!m) return null;
  const currency = SYMBOLS.find(([re]) => re.test(t))?.[1] ?? (/^\$/.test(t) ? fallback : null) ?? fallback;
  return currency ? { amount: Number(m[1].replace(/,/g, "")), currency } : null;
};

export const eskimo: EsimParser = (page) => {
  const $ = dom(page);
  const ls = lines(page);
  const hi = ls.findIndex((l, i) => l === "EN" && /^[A-Z]{3}$/.test(ls[i + 1] ?? ""));
  const headerCur = hi >= 0 ? ls[hi + 1] : null;

  const text = ls.join("\n");
  const perks: string[] = [];
  if (/personal hotspot/i.test(text)) perks.push("Hotspot allowed");
  if (/data never expires|no expiry/i.test(text)) perks.push("Data never expires");
  if (/transferable data|shareable & transferable/i.test(text)) perks.push("Transferable data");
  if (/activates only when you land|validity starts only when you activate/i.test(text)) perks.push("Starts only when you activate");
  if (/money-back guarantee/i.test(text)) perks.push("Money-back guarantee");
  const dataOnly = /data-only plan does not include a number/i.test(text);

  const out: RawEsimPlan[] = [];
  $(".plans-section").each((_, sec) => {
    const area = clean($(sec).find(".plans-title-desc").first().text());
    const cover = clean($(sec).find(".cover-note-country").first().text());
    const coverage = !cover || /only$/i.test(cover) ? null : `${area} (${cover})`;
    $(sec)
      .find(".day-card")
      .each((__, card) => {
        const c = $(card);
        const n = Number(clean(c.find(".day-card__value").first().text()).replace(/,/g, ""));
        const unit = clean(c.find(".day-card__unit").first().text()).toUpperCase();
        const shown = parsePrice(c.find(".day-card__price .day-card__price, .day-card__price > div:last-child").last().text() || "", headerCur);
        const old = parsePrice(c.find(".day-card__old").first().text(), headerCur);
        const p = USE_SHOWN_PRICE ? shown ?? old : old ?? shown;
        if (!p || !Number.isFinite(n) || !(n > 0) || !/^(GB|MB|TB)$/.test(unit)) return;
        const gb = unit === "TB" ? n * 1000 : unit === "MB" ? n / 1000 : n;
        out.push(
          esimPlan({
            title: `${n}GB / no expiry`.replace(/(\d)GB/, `$1${unit === "GB" ? "GB" : unit}`),
            coverage,
            data_gb: gb,
            validity_days: null,
            price: p.amount,
            currency: p.currency,
            voice_included: dataOnly ? false : null,
            sms_included: dataOnly ? false : null,
            phone_number: dataOnly ? false : null,
            perks,
          }),
        );
      });
  });
  return out;
};
