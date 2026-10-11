import { ChevronIcon } from "@/components/Icons";
import { JsonLdFaq, type Faq } from "./JsonLdFaq";

/** Visible FAQ (native <details>, no JS) plus the matching FAQPage JSON-LD. */
export function FaqSection({ title = "Frequently asked questions", faqs, id = "faq" }: { title?: string; faqs: Faq[]; id?: string }) {
  if (!faqs.length) return null;
  return (
    <section aria-labelledby={`${id}-heading`} className="mt-12">
      <h2 id={`${id}-heading`} className="mb-3 px-1 text-[22px] font-bold tracking-tight md:text-[26px]">{title}</h2>
      <div className="divide-y divide-sep overflow-hidden rounded-[22px] bg-surface shadow-card">
        {faqs.map((f) => (
          <details key={f.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
              <h3 className="text-[16px] font-semibold">{f.q}</h3>
              <ChevronIcon className="size-4 shrink-0 text-label-3 transition-transform group-open:rotate-90" />
            </summary>
            <p className="mt-2 text-[15px] leading-relaxed text-label-2">{f.a}</p>
          </details>
        ))}
      </div>
      <JsonLdFaq faqs={faqs} />
    </section>
  );
}
