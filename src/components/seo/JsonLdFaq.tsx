import { JsonLd } from "./JsonLd";

export interface Faq {
  q: string;
  a: string;
}

/**
 * FAQPage. Google only accepts FAQ markup that matches visible page content, so this is always rendered together
 * with <FaqSection> from the same array.
 */
export function JsonLdFaq({ faqs }: { faqs: Faq[] }) {
  if (!faqs.length) return null;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }}
    />
  );
}
