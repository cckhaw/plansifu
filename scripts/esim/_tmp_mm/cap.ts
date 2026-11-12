import { cleanPageText, closeBrowser, renderPage } from "../../scrapers/browser";
import { writeFileSync } from "fs";
(async () => {
  const [out, ...urls] = process.argv.slice(2);
  for (const [i, url] of urls.entries()) {
    const r = await renderPage(url, { minChars: 500, mode: "nodes", feeds: true });
    writeFileSync(`${out}/${i}.json`, JSON.stringify({ url, html: r.html, text: cleanPageText(r.text), feeds: r.feeds }));
    console.log(url, r.text.length);
  }
  await closeBrowser();
})();
