import type { Country } from "../../src/types/database";

export interface Selectable {
  name: string;
  /** Telco providers have one; Travel eSIM brands are global. */
  country?: Country;
}

const COUNTRY_WORDS: Record<string, Country> = { malaysia: "MY", my: "MY", singapore: "SG", sg: "SG" };

/** "CMLink (MY)" - the only way to tell apart two providers that share a name. */
const labelOf = (i: Selectable) => (i.country ? `${i.name} (${i.country})` : i.name);

/**
 * Pick the providers (or brands) a run should crawl from a comma-separated spec:
 *   ""/"all"            everything
 *   "none"              nothing
 *   "Malaysia"/"MY"     every provider of that country (telco only)
 *   "Maxis, M1"         by name, case-insensitive; "CMLink" matches both countries, "CMLink (SG)" just one
 * Unknown entries are an error that lists the valid values, so a typo never silently crawls nothing.
 */
export function selectByName<T extends Selectable>(spec: string | undefined, items: T[], kind: string): T[] {
  const tokens = (spec ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!tokens.length || tokens.includes("all")) return items;
  if (tokens.includes("none")) {
    if (tokens.length > 1) throw new Error(`"none" can't be combined with other ${kind} values`);
    return [];
  }
  const hasCountries = items.some((i) => i.country);
  const chosen = new Set<T>();
  const unknown: string[] = [];
  for (const token of tokens) {
    const country = hasCountries ? COUNTRY_WORDS[token] : undefined;
    const matches = country
      ? items.filter((i) => i.country === country)
      : items.filter((i) => i.name.toLowerCase() === token || labelOf(i).toLowerCase() === token);
    if (!matches.length) unknown.push(token);
    matches.forEach((m) => chosen.add(m));
  }
  if (unknown.length) {
    const valid = ["all", "none", ...(hasCountries ? ["Malaysia", "Singapore"] : []), ...items.map(labelOf)];
    throw new Error(`Unknown ${kind}: ${unknown.join(", ")}. Valid values: ${valid.join(", ")}`);
  }
  return items.filter((i) => chosen.has(i));
}
