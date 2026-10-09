import type { Provider } from "@/types/database";

const COLORS = ["bg-red-600", "bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-rose-600", "bg-cyan-700", "bg-orange-600"];

export function ProviderLogo({ provider, size = 40 }: { provider: Pick<Provider, "name" | "logo_url">; size?: number }) {
  if (provider.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={provider.logo_url} alt={provider.name} width={size} height={size} className="rounded-lg object-contain" style={{ width: size, height: size }} />;
  }
  const hash = [...provider.name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const initials = provider.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      aria-label={provider.name}
      className={`flex shrink-0 items-center justify-center rounded-lg font-bold text-white ${COLORS[hash % COLORS.length]}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}
