import { load } from "cheerio";
import fs from "fs";
const d = JSON.parse(fs.readFileSync("/home/user/plansifu/scripts/scrapers/fixtures/sg-vivifi/vivifi-me.json","utf8"));
const $ = load(d.html);
$(".ArpPricingTableColumnWrapper.arpricemaincolumn").each((i, el) => {
  const c = $(el);
  const tbl = c.closest("[id^=ArpTable], .arprice_pricing_table_wrapper, .ArpPriceTable");
  const anc = c.parents().filter((_, p) => /^(ArpTable|arp_)/.test($(p).attr("id") ?? "")).map((_, p) => $(p).attr("id")).get();
  console.log(i, c.attr("id"), anc.join(">"), "|", c.find(".bestPlanTitle,.arppricetablecolumntitle").first().children().first().text().trim(), "|", c.find(".arppricetablecolumntitle > div > div").eq(1).text().trim());
});
