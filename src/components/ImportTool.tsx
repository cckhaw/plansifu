"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canonicalUrl } from "../../scripts/scrapers/canonical-url";

interface Source {
  name: string;
  hosts: string[];
  pages: string[];
}

interface Captured {
  url: string;
  html: string;
  at: number;
}

interface ImportResponse {
  error?: string;
  message?: string;
  saved?: boolean;
  complete?: boolean;
  ignored?: string[];
  pages?: { url: string; status: "ok" | "missing" | "error"; plans: number; titles: string[]; error?: string }[];
  plans?: { title: string; category: string; monthly_price: number; currency: string; data_gb: number | null; speed_mbps: number | null; contract_months: number }[];
}

/** Keep what parsers read (markup, text, JSON-LD / JSON data scripts); drop scripts, styles, SVG and the like so the upload stays small. */
function trimHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, svg, noscript, iframe, link, meta, template").forEach((el) => {
    const type = el.getAttribute("type") ?? "";
    const keep = el.tagName === "SCRIPT" && (/ld\+json|application\/json/i.test(type) || el.id === "__NEXT_DATA__");
    if (!keep) el.remove();
  });
  doc.querySelectorAll("*").forEach((el) => {
    el.removeAttribute("style");
    for (const attr of ["src", "href", "srcset"]) if (/^data:/i.test(el.getAttribute(attr) ?? "")) el.removeAttribute(attr);
  });
  return "<!doctype html>" + doc.documentElement.outerHTML;
}

const kb = (n: number) => `${Math.round(n / 1024)} KB`;

/** The text of the bookmarklet: opens (or reuses) this page's window and posts it the page you are looking at. */
function bookmarkletCode(origin: string, key: string): string {
  const url = `${origin}/import?key=${encodeURIComponent(key)}`;
  return (
    "javascript:" +
    `(function(){var U=${JSON.stringify(url)},O=${JSON.stringify(origin)};` +
    "var w=window.open('','plansifu-import','width=640,height=820');" +
    "if(!w){alert('Allow pop-ups for this site, then click the bookmark again');return}" +
    "try{if(w.location.href==='about:blank')w.location.href=U}catch(e){}" +
    "var m={type:'plansifu-page',url:location.href,html:'<!doctype html>'+document.documentElement.outerHTML};" +
    "var n=0,iv=setInterval(function(){n++;try{w.postMessage(m,O)}catch(e){}if(n>100)clearInterval(iv)},300);" +
    "window.addEventListener('message',function(e){if(e.origin===O&&e.data&&e.data.type==='plansifu-ack'){clearInterval(iv);alert('Sent to PlanSifu: '+location.pathname)}})" +
    "})()"
  );
}

export function ImportTool({ apiKey, sources }: { apiKey: string; sources: Source[] }) {
  const [captured, setCaptured] = useState<Record<string, Captured>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ImportResponse>>({});
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [code, setCode] = useState("");

  const sourceOfHost = useCallback((host: string) => sources.find((s) => s.hosts.includes(host.toLowerCase())), [sources]);

  useEffect(() => {
    const c = bookmarkletCode(window.location.origin, apiKey);
    setCode(c);
    // React refuses javascript: URLs in JSX, so the bookmarklet link is set directly on the element.
    linkRef.current?.setAttribute("href", c);
  }, [apiKey]);

  const store = useCallback((url: string, html: string) => {
    const canon = canonicalUrl(url);
    if (!canon) return;
    setCaptured((prev) => ({ ...prev, [canon]: { url, html: trimHtml(html), at: Date.now() } }));
  }, []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const d = e.data as { type?: string; url?: string; html?: string } | null;
      if (!d || d.type !== "plansifu-page" || typeof d.url !== "string" || typeof d.html !== "string") return;
      let host = "";
      try {
        host = new URL(e.origin).hostname;
      } catch {
        return;
      }
      // Only the providers' own sites may send pages, and the page must belong to the site that sent it.
      if (!sourceOfHost(host) || new URL(d.url).hostname !== host) return;
      store(d.url, d.html);
      (e.source as Window | null)?.postMessage({ type: "plansifu-ack", url: d.url }, e.origin);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sourceOfHost, store]);

  const pagesOf = (s: Source) => s.pages.map((url) => ({ url, got: captured[canonicalUrl(url) ?? ""] }));

  async function run(s: Source, save: boolean) {
    setBusy(`${s.name}:${save ? "save" : "check"}`);
    try {
      const pages = pagesOf(s).flatMap((p) => (p.got ? [{ url: p.url, html: p.got.html }] : []));
      const res = await fetch("/api/import-page", {
        method: "POST",
        headers: { "content-type": "application/json", "x-import-key": apiKey },
        body: JSON.stringify({ provider: s.name, pages, save }),
      });
      const json = (await res.json().catch(() => ({ error: `Server answered ${res.status}` }))) as ImportResponse;
      setResults((r) => ({ ...r, [s.name]: res.ok ? json : { error: json.error ?? `Server answered ${res.status}` } }));
    } catch (err) {
      setResults((r) => ({ ...r, [s.name]: { error: (err as Error).message } }));
    } finally {
      setBusy(null);
    }
  }

  function download(s: Source) {
    const pages = pagesOf(s).flatMap((p) => (p.got ? [{ url: p.url, html: p.got.html }] : []));
    const blob = new Blob([JSON.stringify({ provider: s.name, pages }, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `plansifu-${s.name.toLowerCase()}-pages.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const total = useMemo(() => Object.keys(captured).length, [captured]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[28px] font-bold tracking-tight">Import pages</h1>
        <p className="mt-1 text-[15px] text-label-2">
          For sites that block the nightly crawler. Open the page in your own browser, click the bookmark, and the page arrives here. Nothing is saved until you press Save.
        </p>
      </header>

      <section className="rounded-[22px] bg-surface p-5 shadow-card">
        <h2 className="text-[17px] font-semibold">1. Add the bookmark (once)</h2>
        <p className="mt-1 text-[14px] text-label-2">
          Drag this button to your bookmarks bar. If dragging doesn&apos;t work, create a bookmark by hand and paste the code below as its address.
        </p>
        <a ref={linkRef} onClick={(e) => e.preventDefault()} draggable className="mt-3 inline-block rounded-full bg-accent-fill px-4 py-2 text-[15px] font-semibold text-accent-on-fill">
          Send to PlanSifu
        </a>
        <details className="mt-3 text-[13px] text-label-2">
          <summary className="cursor-pointer">Show the bookmark code</summary>
          <textarea readOnly value={code} onFocus={(e) => e.currentTarget.select()} rows={4} className="mt-2 w-full rounded-[12px] bg-fill p-2 font-mono text-[12px]" />
        </details>
        <p className="mt-3 text-[14px] text-label-2">
          2. Open each page below in your browser, wait for the plans to show, click <strong>Send to PlanSifu</strong> (allow the pop-up the first time), and keep this window open. 3. Press Check, then Save.
        </p>
      </section>

      {sources.map((s) => {
        const res = results[s.name];
        const got = pagesOf(s);
        return (
          <section key={s.name} className="rounded-[22px] bg-surface p-5 shadow-card">
            <h2 className="text-[20px] font-bold">{s.name}</h2>
            <ul className="mt-3 divide-y divide-sep">
              {got.map((p) => (
                <li key={p.url} className="flex items-center gap-3 py-2 text-[14px]">
                  <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-full text-[12px] font-bold ${p.got ? "bg-good-tint text-good" : "bg-fill-strong text-label-3"}`}>
                    {p.got ? "✓" : ""}
                  </span>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-accent">
                    {p.url.replace(/^https?:\/\//, "")}
                  </a>
                  <span className="shrink-0 text-label-3">{p.got ? `${kb(p.got.html.length)}, ${new Date(p.got.at).toLocaleTimeString()}` : "not received"}</span>
                  <label className="shrink-0 cursor-pointer text-[13px] text-label-2 underline">
                    or upload
                    <input
                      type="file"
                      accept=".html,.htm,text/html"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) store(p.url, await file.text());
                        e.target.value = "";
                      }}
                    />
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={!!busy || !got.some((p) => p.got)} onClick={() => run(s, false)} className="press rounded-full bg-fill-strong px-4 py-2 text-[15px] font-semibold disabled:opacity-40">
                {busy === `${s.name}:check` ? "Checking…" : "Check"}
              </button>
              <button disabled={!!busy || !got.some((p) => p.got)} onClick={() => run(s, true)} className="press rounded-full bg-accent-fill px-4 py-2 text-[15px] font-semibold text-accent-on-fill disabled:opacity-40">
                {busy === `${s.name}:save` ? "Saving…" : "Save to PlanSifu"}
              </button>
              <button disabled={!got.some((p) => p.got)} onClick={() => download(s)} className="press rounded-full px-3 py-2 text-[14px] text-label-2 underline disabled:opacity-40">
                Download the captured pages
              </button>
            </div>

            {res && (
              <div className="mt-4 text-[14px]" aria-live="polite">
                {res.error ? (
                  <p className="rounded-[12px] bg-fill p-3 text-[#b42318]">{res.error}</p>
                ) : (
                  <>
                    <p className={res.saved ? "font-semibold text-good" : "font-medium"}>{res.message}</p>
                    {res.ignored && res.ignored.length > 0 && <p className="mt-1 text-label-2">Ignored (not one of this provider&apos;s pages): {res.ignored.join(", ")}</p>}
                    <ul className="mt-2 space-y-1">
                      {res.pages?.map((p) => (
                        <li key={p.url} className="text-label-2">
                          <span className="font-medium text-label">{p.url.replace(/^https?:\/\//, "")}</span>: {p.status === "ok" ? `${p.plans} plans` : p.status === "missing" ? "not received" : p.error}
                        </li>
                      ))}
                    </ul>
                    {res.plans && res.plans.length > 0 && (
                      <div className="mt-3 overflow-x-auto rounded-[12px] bg-fill">
                        <table className="w-full text-left text-[13px]">
                          <thead className="text-label-3">
                            <tr>
                              <th className="px-3 py-2">Plan</th>
                              <th className="px-3 py-2">Type</th>
                              <th className="px-3 py-2">Price</th>
                              <th className="px-3 py-2">Data / speed</th>
                              <th className="px-3 py-2">Contract</th>
                            </tr>
                          </thead>
                          <tbody>
                            {res.plans.map((p) => (
                              <tr key={p.title} className="border-t border-sep">
                                <td className="px-3 py-1.5 font-medium">{p.title}</td>
                                <td className="px-3 py-1.5">{p.category.replace("mobile_", "")}</td>
                                <td className="px-3 py-1.5 tabular-nums">
                                  {p.currency} {p.monthly_price}
                                </td>
                                <td className="px-3 py-1.5">{p.speed_mbps ? `${p.speed_mbps} Mbps` : p.data_gb === -1 ? "Unlimited" : p.data_gb !== null ? `${p.data_gb} GB` : "–"}</td>
                                <td className="px-3 py-1.5">{p.contract_months ? `${p.contract_months} mo` : "None"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        );
      })}
      <p className="text-[12px] text-label-3">{total} page{total === 1 ? "" : "s"} held in this window. Closing it forgets them. Pages are parsed on the server and are never stored.</p>
    </div>
  );
}
