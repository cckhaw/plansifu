# Telco crawler: one parser per page

The nightly crawl makes **no model calls and costs nothing**. Every page a provider is crawled from has its own
deterministic parser that turns the rendered page into plans. When a site changes its layout the parser finds nothing,
that page fails loudly (the crawl report shows why) and the provider keeps its existing plans until the parser is fixed.

```
render page (Playwright, free)  ->  target.parse(page)  ->  normalizePlans (filters)  ->  database
```

A parser is `(page: PageData) => RawPlan[]` (see `types.ts`). `page` has the rendered `html`, the page `text` (one text
node per line), and `feeds` (JSON the page itself loaded that contains prices). Helpers are in `parse-utils.ts`
(`dom` = cheerio, `price`, `dataGb`, `speedMbps`, `contractMonths`, `feedJson`, `jsonLd`, `walkJson`, `lines`, `plan`).

## Writing or fixing a parser

1. `npm run crawl:capture -- "Maxis"` renders the provider's pages and saves them in `fixtures/<country>-<provider>/`.
   (Pages the nightly crawl fetches through the Vercel relay are captured the same way: raw HTML, no JavaScript.)
2. Find where the plan data really lives, in this order of preference:
   - the site's own JSON (`page.feeds`, or a JSON blob embedded in the HTML such as `__NEXT_DATA__` / `window.__STATE__`),
   - JSON-LD (`jsonLd(page)`),
   - the DOM, with selectors on stable structure (data attributes, semantic class names, element order within a card),
   - the text lines, only for pages with a regular layout.
   Do not hard-code plan names, prices or lists: that would show invented data after the site changes.
3. Replace the provider's `todo("...")` with the parser in `providers/<provider>.ts`.
4. `npm run crawl:try -- "Maxis"` prints the plans on the saved pages; `-- "Maxis" --live` re-renders the live pages.
   Compare the output to the live page by eye: every plan, price, data, speed and contract must match.
5. `npm run crawl:try -- "Maxis" --update` writes `<page>.expected.json`; review it, then `npm run test:parsers`.

## Rules

- **No network, no model, no randomness inside a parser.** It only reads `page`.
- Prices are what the page charges **per month**; for prepaid packs the pack price shown. Use the regular price and put a
  limited-time price in `promotion_badge`. Never divide, convert or average.
- Return **principal-line, standalone consumer plans** only: skip business plans, devices, add-ons, roaming/IDD passes,
  call-rate tables and supplementary/extra-line plans (put a stated extra-line price in `supplementary_line_price`).
- `data_gb`: -1 = unlimited, null = not stated. `speed_mbps`: 1 Gbps = 1000. `contract_months`: 0 = none.
- `category` must be one of `mobile_postpaid`, `mobile_prepaid`, `broadband`; it only takes effect on `t.mixed(...)` pages.
- Titles are the plan names as the site shows them, without prices (`normalizePlans` strips and filters them).
- A page that legitimately lists no plans is marked `t.expectEmpty(...)`; every other page must return at least one plan.
- Be tolerant of cosmetic changes (class-name hashes, extra wrappers) but strict about meaning: if a card has no
  price, skip it, do not guess.
- Pages render the same in CI as here, except sites that block datacenter networks; those go through `t.relay(...)`.

Provider-wide parsers (`starhub.ts`, `zym.ts`) read several pages with their own `scrape()`.
