import { readFileSync } from "fs";
import { load } from "cheerio";
for (const c of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(`scripts/esim/fixtures/mobimatter/${c}.json`, "utf8"));
  const $ = load(d.html);
  const cards = $("[data-offer-id]");
  console.log(c, cards.length);
  cards.each((i, el) => { if (i < 4 || i % 15 == 0) console.log(JSON.stringify($(el).find("p,img").map((_, e) => e.tagName == "img" ? "IMG:" + $(e).attr("alt") : $(e).text().trim()).get())); });
}
