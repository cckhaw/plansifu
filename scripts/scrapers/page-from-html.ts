import { load } from "cheerio";
import type { PageData } from "./types";

/** Text nodes the way the renderer reads them: one trimmed node per line, no scripts, styles or templates. */
export function textLinesOf(html: string): string {
  const $ = load(html);
  $("script, style, noscript, template").remove();
  const out: string[] = [];
  const walk = (nodes: ReturnType<typeof $>["contents"] extends () => infer R ? R : never) => {
    nodes.each((_, node) => {
      if (node.type === "text") {
        const t = (node.data ?? "").replace(/[\s ]+/g, " ").trim();
        if (t) out.push(t);
      } else if (node.type === "tag") {
        walk($(node).contents());
      }
    });
  };
  walk($("body").contents());
  // Same tidy-up as cleanPageText: drop immediately repeated lines.
  return out.filter((line, i) => line !== out[i - 1]).join("\n");
}

/** A page captured outside the crawler (e.g. by the bookmarklet), as a parser expects to see it. */
export function pageFromHtml(url: string, html: string): PageData {
  return { url, html, text: textLinesOf(html), feeds: [] };
}
