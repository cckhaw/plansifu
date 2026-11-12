import { todo } from "../parse-utils";
import type { ScrapeTarget } from "../types";

/**
 * M1's pages. m1.com.sg shows a CAPTCHA bot wall to GitHub's and Vercel's networks, so the nightly crawler cannot read
 * them: they are imported from a real browser with the bookmarklet (see /import). The parsers below are written
 * against pages saved that way. Until a real page was captured they are placeholders.
 */
export const M1_TARGETS: ScrapeTarget[] = [
  { url: "https://www.m1.com.sg/personal/sim-plan", category: "mobile_postpaid", parse: todo("M1") },
  { url: "https://www.m1.com.sg/mobile/prepaid-plans", category: "mobile_prepaid", parse: todo("M1") },
  { url: "https://www.m1.com.sg/home-broadband", category: "broadband", parse: todo("M1") },
];
