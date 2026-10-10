export function DealBadge({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-tint px-3 py-2 text-[13px] font-semibold leading-snug text-accent">
      <span aria-hidden>🏆</span>
      <span>{text}</span>
    </div>
  );
}
