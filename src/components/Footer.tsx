export function Footer() {
  return (
    <footer className="mx-auto mt-12 max-w-2xl px-4 pb-32 text-center text-xs leading-relaxed text-label-3 md:pb-12">
      <p>
        PlanSifu may earn a commission when you apply through our links, at no cost to you. Prices are collected
        automatically and may change; always confirm with the provider.
      </p>
      <p className="mt-2">© {new Date().getFullYear()} PlanSifu</p>
    </footer>
  );
}
