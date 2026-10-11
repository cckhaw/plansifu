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

  let target: string | null = null;
  if (pathname === "/mobile") target = `/${country}/${type === "postpaid" || type === "prepaid" ? type : "mobile"}`;
  else if (pathname === "/broadband") target = `/${country}/broadband`;
  else if (pathname === "/travel-esim") target = `/${country}/travel-esim`;
  if (!target) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = target;
  url.searchParams.delete("country");
  url.searchParams.delete("type");
  return NextResponse.redirect(url, 301);
}

export const config = { matcher: ["/mobile", "/broadband", "/travel-esim"] };
