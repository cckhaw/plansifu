/**
 * Save the rendered pages of one provider as test fixtures, so its parsers can be written and tested offline.
 *
 *   npx tsx scripts/scrapers/capture.ts "Maxis"            every page of Maxis
 *   npx tsx scripts/scrapers/capture.ts "Maxis" broadband  only pages whose URL contains "broadband"
 *
 * Pages that go through the Vercel relay in production are fetched with curl (no JavaScript) and turned into a
 * page the same way the relay does, so the parser sees what it will see in the nightly crawl.
 */
import { spawnSync } from "node:child_process";
import { cleanPageText, closeBrowser, getBrowser, pageFromHtml, renderPage } from "./browser";
import { providerKey, saveFixture } from "./fixtures";
import { providers } from "./providers";
import { selectByName } from "./select";
import type { PageData } from "./types";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function capture(url: string, relay: boolean): Promise<PageData> {
  if (relay) {
    const r = spawnSync("curl", ["-sS", "-L", "-m", "60", "-A", UA, "-H", "Accept-Language: en-MY,en;q=0.9", url], { encoding: "utf8", maxBuffer: 50_000_000 });
    if (r.status !== 0) throw new Error(`curl failed: ${r.stderr.slice(0, 200)}`);
    const p = await pageFromHtml(await getBrowser(), r.stdout);
    return { url, html: p.html, text: cleanPageText(p.text), feeds: [] };
  }
  const r = await renderPage(url, { minChars: 800, mode: "nodes", feeds: true });
  return { url, html: r.html, text: cleanPageText(r.text), feeds: r.feeds };
}

async function main() {
  const [name, filter] = process.argv.slice(2);
  if (!name) throw new Error('usage: capture.ts "<provider>" [url-substring]');
  for (const p of selectByName(name, providers, "provider")) {
    for (const t of p.targets ?? []) {
      if (filter && !t.url.includes(filter)) continue;
      try {
        const page = await capture(t.url, !!t.relay);
        const file = saveFixture(providerKey(p), page);
        console.log(`saved ${file} (${page.text.length} chars of text, ${page.feeds.length} feeds)${t.relay ? " [relay-style]" : ""}`);
      } catch (e) {
        console.error(`FAILED ${t.url}: ${(e as Error).message}`);
      }
    }
  }
}

main().finally(closeBrowser);
