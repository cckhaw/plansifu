/**
 * Country flag. Windows draws flag emoji as bare letter pairs ("MY"), so from tablet width up we show an
 * SVG image instead; phones keep the native emoji, which looks right there.
 */
export function Flag({ emoji, className = "" }: { emoji: string; className?: string }) {
  const cps = [...emoji].map((c) => c.codePointAt(0) ?? 0);
  const isFlag = cps.length === 2 && cps.every((c) => c >= 0x1f1e6 && c <= 0x1f1ff);
  if (!isFlag) return <span className={className}>{emoji}</span>;
  const iso = String.fromCharCode(...cps.map((c) => c - 0x1f1e6 + 97));
  return (
    <span className={className} aria-hidden>
      <span className="md:hidden">{emoji}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/flags/${iso}.svg`} alt="" loading="lazy" decoding="async" className="hidden h-[0.8em] w-auto rounded-[0.12em] align-[-0.06em] shadow-[0_0_0_0.5px_rgba(0,0,0,0.15)] md:inline-block" />
    </span>
  );
}
