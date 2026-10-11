import { NextResponse, type NextRequest } from "next/server";

/**
 * Permanent redirects from the old query-string URLs to the new path-based ones, so existing links and any
 * indexed pages keep working: /mobile?type=prepaid&country=SG -> /sg/prepaid.
 * (country defaults to Malaysia, as before.)
 */
export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const country = searchParams.get("country") === "SG" ? "sg" : "my";
  const type = searchParams.get("type");

  // Previous Travel eSIM URLs: /my/travel-esim?dest=japan (and /travel-esim?dest=japan&country=SG) -> /my/travel-esim/japan
  const dest = searchParams.get("dest");
  const esimDest = dest && /^[a-z0-9-]{2,40}$/.test(dest) ? dest : null;
  const inCountry = pathname.match(/^\/(my|sg)\/travel-esim$/);

  let target: string | null = null;
  if (inCountry && esimDest) {
    const url = req.nextUrl.clone();
    url.pathname = `/${inCountry[1]}/travel-esim/${esimDest}`;
    url.search = "";
    return NextResponse.redirect(url, 301);
  }
  if (pathname === "/mobile") target = `/${country}/${type === "postpaid" || type === "prepaid" ? type : "mobile"}`;
  else if (pathname === "/broadband") target = `/${country}/broadband`;
  else if (pathname === "/travel-esim") target = esimDest ? `/${country}/travel-esim/${esimDest}` : `/${country}/travel-esim`;
  if (!target) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = target;
  url.searchParams.delete("country");
  url.searchParams.delete("type");
  url.searchParams.delete("dest");
  return NextResponse.redirect(url, 301);
}

export const config = { matcher: ["/mobile", "/broadband", "/travel-esim", "/my/travel-esim", "/sg/travel-esim"] };
