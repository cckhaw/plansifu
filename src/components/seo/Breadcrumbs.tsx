import Link from "next/link";
import { JsonLdBreadcrumbs, type Crumb } from "./JsonLdBreadcrumbs";

/** Visible breadcrumb trail with matching BreadcrumbList JSON-LD. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 px-1 text-[13px] text-label-3">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {crumbs.map((c, i) => (
          <li key={c.name} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>›</span>}
            {c.path && i < crumbs.length - 1 ? (
              <Link href={c.path} className="hover:text-label hover:underline">{c.name}</Link>
            ) : (
              <span aria-current="page" className="text-label-2">{c.name}</span>
            )}
          </li>
        ))}
      </ol>
      <JsonLdBreadcrumbs crumbs={crumbs} />
    </nav>
  );
}
