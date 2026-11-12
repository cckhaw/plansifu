/** Tests for importing pages captured in a real browser (the /import page): matching, parsing, partial vs complete saves. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalUrl } from "./canonical-url";
import type { ImportSource } from "./import-sources";
import { importPages, type ImportPersist } from "./import-pages";
import { textLinesOf } from "./page-from-html";
import type { RawPlan } from "./types";

const parseMarker = (marker: string, price: number) => (page: { html: string }): RawPlan[] =>
  page.html.includes(marker) ? [{ title: `Plan ${marker}`, monthly_price: price, data_gb: 10, contract_months: 0 }] : [];

const source: ImportSource = {
  name: "Fake",
  country: "SG",
  website: "https://www.fake.sg",
  hosts: ["www.fake.sg"],
  targets: [
    { url: "https://www.fake.sg/a", category: "mobile_postpaid", parse: parseMarker("AAA", 30) },
    { url: "https://www.fake.sg/b", category: "mobile_prepaid", parse: parseMarker("BBB", 12) },
  ],
};

const recorder = () => {
  const calls: { count: number; complete: boolean }[] = [];
  const persist: ImportPersist = async ({ plans, complete }) => {
    calls.push({ count: plans.length, complete });
    return { count: plans.length };
  };
  return { calls, persist };
};

describe("importPages", () => {
  it("saves everything and marks the crawl complete when every page is supplied", async () => {
    const { calls, persist } = recorder();
    const r = await importPages(source, [
      { url: "https://www.fake.sg/a?utm=1#x", html: "<p>AAA</p>" },
      { url: "https://www.fake.sg/b/", html: "<p>BBB</p>" },
    ], persist);
    assert.equal(r.complete, true);
    assert.equal(r.saved, true);
    assert.deepEqual(calls, [{ count: 2, complete: true }]);
    assert.deepEqual(r.pages.map((p) => p.status), ["ok", "ok"]);
  });

  it("saves a partial import without letting missing plans be deactivated", async () => {
    const { calls, persist } = recorder();
    const r = await importPages(source, [{ url: "https://www.fake.sg/a", html: "AAA" }], persist);
    assert.equal(r.complete, false);
    assert.deepEqual(calls, [{ count: 1, complete: false }]);
    assert.equal(r.pages[1].status, "missing");
  });

  it("only checks (saves nothing) without a persist function", async () => {
    const r = await importPages(source, [{ url: "https://www.fake.sg/a", html: "AAA" }]);
    assert.equal(r.saved, false);
    assert.equal(r.plans.length, 1);
  });

  it("ignores pages from other sites or other pages", async () => {
    const r = await importPages(source, [
      { url: "https://evil.example/a", html: "AAA" },
      { url: "https://www.fake.sg/other", html: "AAA" },
      { url: "not a url", html: "AAA" },
    ]);
    assert.equal(r.ignored.length, 3);
    assert.equal(r.plans.length, 0);
    assert.match(r.message, /Nothing to save/);
  });

  it("reports a page the parser cannot read and still saves the good one as partial", async () => {
    const { calls, persist } = recorder();
    const r = await importPages(source, [
      { url: "https://www.fake.sg/a", html: "AAA" },
      { url: "https://www.fake.sg/b", html: "<p>a CAPTCHA page</p>" },
    ], persist);
    assert.equal(r.pages[1].status, "error");
    assert.match(r.pages[1].error ?? "", /found no plans/);
    assert.equal(r.complete, false);
    assert.deepEqual(calls, [{ count: 1, complete: false }]);
  });

  it("does not save when nothing could be parsed", async () => {
    const { calls, persist } = recorder();
    const r = await importPages(source, [{ url: "https://www.fake.sg/a", html: "nothing" }], persist);
    assert.equal(r.saved, false);
    assert.equal(calls.length, 0);
  });
});

describe("helpers", () => {
  it("canonicalUrl ignores www, query, fragment, trailing slash and case", () => {
    assert.equal(canonicalUrl("https://WWW.M1.com.sg/Personal/sim-plan/?a=1#b"), canonicalUrl("https://m1.com.sg/Personal/sim-plan"));
    assert.equal(canonicalUrl("nonsense"), null);
  });

  it("textLinesOf reads text nodes like the renderer", () => {
    const text = textLinesOf("<body><h1>Plans</h1><script>var x=1</script><div><b>RM</b> 30<br>per month</div><div>per month</div></body>");
    assert.deepEqual(text.split("\n"), ["Plans", "RM", "30", "per month"]);
  });
});
