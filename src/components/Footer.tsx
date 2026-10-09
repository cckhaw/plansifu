export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
      <p className="mx-auto max-w-2xl px-4">
        PlanSifu may earn a commission when you apply through our links, at no cost to you. Prices are collected
        automatically and may change; always confirm with the provider.
      </p>
      <p className="mt-2">© {new Date().getFullYear()} PlanSifu</p>
    </footer>
  );
}
