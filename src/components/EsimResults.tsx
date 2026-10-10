import { formatPrice } from "@/lib/currency";
import type { EsimRowView } from "@/lib/esim";
import type { Country } from "@/types/database";
import { COUNTRIES } from "@/lib/currency";
import { ProviderLogo } from "./ProviderLogo";

const money = (n: number | null, currency: "MYR" | "SGD") => (n === null ? "—" : formatPrice(Math.round(n * 100) / 100, currency));

function dataLabel(r: EsimRowView): string {
  if (r.unlimited) return "Unlimited";
  const gb = r.plan.data_gb;
  if (gb === null) return "—";
  return `${Number(gb) < 1 ? Math.round(Number(gb) * 1000) + "MB" : Number(gb) + "GB"}`;
}

function validityLabel(r: EsimRowView): string {
  if (r.plan.validity_days) return `${r.plan.validity_days} days`;
  return r.plan.perks.some((x) => /never expire|no expiry|does not expire/i.test(x)) ? "no expiry" : "validity n/a";
}

function VoiceSms({ r }: { r: EsimRowView }) {
  const p = r.plan;
  if (p.voice_included || p.sms_included) {
    const what = p.voice_included && p.sms_included ? "Voice + SMS" : p.voice_included ? "Voice" : "SMS";
    return (
      <span>
        <span className="font-semibold text-emerald-700">✓ {what}</span>
        {p.voice_sms_note && <span className="block text-xs text-slate-500">{p.voice_sms_note}</span>}
      </span>
    );
  }
  if (p.voice_included === false || p.sms_included === false) return <span className="text-slate-500">Data only</span>;
  return <span className="text-slate-400">Not stated</span>;
}

function PhoneNumber({ r }: { r: EsimRowView }) {
  const v = r.plan.phone_number;
  if (v) return <span className="font-semibold text-emerald-700">✓ Yes</span>;
  if (v === false) return <span className="text-slate-500">No</span>;
  return <span className="text-slate-400">Not stated</span>;
}

function Perks({ perks, limit = 4 }: { perks: string[]; limit?: number }) {
  if (!perks?.length) return <span className="text-slate-400">—</span>;
  return (
    <ul className="flex flex-wrap gap-1">
      {perks.slice(0, limit).map((p) => (
        <li key={p} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{p}</li>
      ))}
    </ul>
  );
}

const href = (r: EsimRowView) => `/api/redirect?plan_id=${r.plan.id}`;

export function EsimResults({ rows, country, bestGbId, cheapestId }: { rows: EsimRowView[]; country: Country; bestGbId: string | null; cheapestId: string | null }) {
  const currency = COUNTRIES[country].currency;
  const tags = (r: EsimRowView) => (
    <>
      {r.plan.id === bestGbId && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Best per GB</span>}
      {r.plan.id === cheapestId && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Cheapest</span>}
    </>
  );
  const original = (r: EsimRowView) =>
    r.plan.currency !== currency ? <span className="block text-[11px] font-normal text-slate-500">{Number(r.plan.price).toFixed(2)} {r.plan.currency}</span> : null;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Brand</th>
              <th className="px-3 py-3">Plan</th>
              <th className="px-3 py-3">Price ({currency})</th>
              <th className="px-3 py-3">Per GB</th>
              <th className="px-3 py-3">Per day</th>
              <th className="px-3 py-3">Voice / SMS</th>
              <th className="px-3 py-3">Phone number</th>
              <th className="px-3 py-3">Perks</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.plan.id} className="align-top hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ProviderLogo provider={r.plan.provider} size={32} />
                    <span className="font-bold">{r.plan.provider.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="font-semibold">{dataLabel(r)} · {validityLabel(r)}</div>
                  {r.plan.coverage && <div className="text-xs text-slate-500">{r.plan.coverage}</div>}
                  {r.plan.data_note && <div className="text-xs text-slate-500">{r.plan.data_note}</div>}
                  <div className="mt-1 flex gap-1">{tags(r)}</div>
                </td>
                <td className="px-3 py-3 text-base font-extrabold text-sifu-gold">{money(r.price, currency)}{original(r)}</td>
                <td className="px-3 py-3 font-bold">{r.unlimited ? <span className="text-slate-500">Unlimited</span> : money(r.perGb, currency)}</td>
                <td className="px-3 py-3">{money(r.perDay, currency)}</td>
                <td className="px-3 py-3"><VoiceSms r={r} /></td>
                <td className="px-3 py-3"><PhoneNumber r={r} /></td>
                <td className="max-w-[220px] px-3 py-3"><Perks perks={r.plan.perks} /></td>
                <td className="px-3 py-3">
                  <a href={href(r)} rel="sponsored nofollow noopener" target="_blank" className="whitespace-nowrap rounded-lg bg-sifu-gold px-3 py-2 text-xs font-bold text-white hover:bg-amber-700">Get eSIM →</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {rows.map((r) => (
          <article key={r.plan.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <header className="flex items-center gap-3">
              <ProviderLogo provider={r.plan.provider} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500">{r.plan.provider.name}</p>
                <h3 className="font-bold">{dataLabel(r)} · {validityLabel(r)}</h3>
              </div>
              <div className="text-right text-xl font-extrabold text-sifu-gold">{money(r.price, currency)}{original(r)}</div>
            </header>
            <div className="mt-1 flex gap-1">{tags(r)}</div>
            {(r.plan.coverage || r.plan.data_note) && <p className="mt-1 text-xs text-slate-500">{[r.plan.coverage, r.plan.data_note].filter(Boolean).join(" · ")}</p>}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-slate-50 px-3 py-2"><dt className="text-[11px] uppercase text-slate-500">Per GB</dt><dd className="font-bold">{r.unlimited ? "Unlimited" : money(r.perGb, currency)}</dd></div>
              <div className="rounded-lg bg-slate-50 px-3 py-2"><dt className="text-[11px] uppercase text-slate-500">Per day</dt><dd className="font-bold">{money(r.perDay, currency)}</dd></div>
              <div className="rounded-lg bg-slate-50 px-3 py-2"><dt className="text-[11px] uppercase text-slate-500">Voice / SMS</dt><dd><VoiceSms r={r} /></dd></div>
              <div className="rounded-lg bg-slate-50 px-3 py-2"><dt className="text-[11px] uppercase text-slate-500">Phone number</dt><dd><PhoneNumber r={r} /></dd></div>
            </dl>
            <div className="mt-3"><Perks perks={r.plan.perks} limit={6} /></div>
            <a href={href(r)} rel="sponsored nofollow noopener" target="_blank" className="mt-3 block rounded-lg bg-sifu-gold py-2.5 text-center text-sm font-bold text-white">Get eSIM →</a>
          </article>
        ))}
      </div>
    </>
  );
}
