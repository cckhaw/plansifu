/** Same page, ignoring the query string, fragment, a trailing slash, "www." and the letter case of the host. */
export function canonicalUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.hostname.toLowerCase().replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}
