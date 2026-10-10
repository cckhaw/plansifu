import { getProviderBrand } from "@/lib/provider-brand";
import type { Provider } from "@/types/database";

/** App-icon style badge: continuous-corner "squircle" approximated with a 23% radius. */
export function ProviderLogo({ provider, size = 40 }: { provider: Pick<Provider, "name" | "logo_url">; size?: number }) {
  const radius = Math.round(size * 0.23);
  if (provider.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={provider.logo_url} alt={provider.name} width={size} height={size} className="object-contain" style={{ width: size, height: size, borderRadius: radius }} />;
  }
  const brand = getProviderBrand(provider.name);
  return (
    <div
      role="img"
      aria-label={provider.name}
      title={provider.name}
      className="flex shrink-0 items-center justify-center font-bold tracking-tight shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.22)]"
      style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.4, backgroundColor: brand.bg, color: brand.fg }}
    >
      {brand.abbr}
    </div>
  );
}
