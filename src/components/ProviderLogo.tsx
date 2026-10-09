import { getProviderBrand } from "@/lib/provider-brand";
import type { Provider } from "@/types/database";

export function ProviderLogo({ provider, size = 40 }: { provider: Pick<Provider, "name" | "logo_url">; size?: number }) {
  if (provider.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={provider.logo_url} alt={provider.name} width={size} height={size} className="rounded-lg object-contain" style={{ width: size, height: size }} />;
  }
  const brand = getProviderBrand(provider.name);
  return (
    <div
      role="img"
      aria-label={provider.name}
      title={provider.name}
      className="flex shrink-0 items-center justify-center rounded-lg font-extrabold tracking-tight"
      style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: brand.bg, color: brand.fg }}
    >
      {brand.abbr}
    </div>
  );
}
