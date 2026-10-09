export function DealBadge({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-sifu-gold/30 bg-sifu-gold-light px-3 py-2 text-sm font-semibold text-sifu-gold-dark">
      <span aria-hidden>🏆</span>
      <span>{text}</span>
    </div>
  );
}
