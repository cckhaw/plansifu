import { chromium } from "playwright";
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const p = await b.newPage();
  await p.goto(process.argv[2], { waitUntil: "networkidle", timeout: 60000 });
  await p.waitForTimeout(2000);
  const rows = async (l: string) => console.log(l, JSON.stringify(await p.locator("tr[id^=plan_item_]").allInnerTexts()));
  await rows("initial");
  console.log(await p.locator('[data-track^="plans.type.select"]').allInnerTexts());
  await p.locator('[data-track="plans.type.select.1"]').click(); await p.waitForTimeout(1500);
  await rows("fixed tab");
  await p.locator('[data-track="plans.type.select.0"]').click(); await p.waitForTimeout(1500);
  await rows("unl tab");
  await p.locator('[data-track="plans.duration.open"]').click(); await p.waitForTimeout(1000);
  console.log(await p.locator('[role=listbox], [role=option], .Select_option__, [class*=Select_]').allInnerTexts().then(a=>a.slice(0,60)));
  await b.close();
})();
