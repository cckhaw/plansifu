import { M1_TARGETS } from "../sources/m1";
import { defineProvider, t } from "./define";

// Not crawled nightly in practice: m1.com.sg shows a CAPTCHA bot wall to GitHub and Vercel. The pages are imported
// from a real browser instead (src/app/import); the relay targets stay so the crawl works if the wall ever drops.
export const m1 = defineProvider("M1", "SG", "https://www.m1.com.sg", M1_TARGETS.map(t.relay));
