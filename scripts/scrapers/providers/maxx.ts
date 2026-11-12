import { MAXX_TARGETS } from "../sources/maxx";
import { defineProvider, t } from "./define";

// Same as M1: a CAPTCHA bot wall in CI, so the page is imported from a real browser (src/app/import).
export const maxx = defineProvider("Maxx", "SG", "https://maxxonline.sg", MAXX_TARGETS.map(t.relay));
