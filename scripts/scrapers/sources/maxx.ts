import { todo } from "../parse-utils";
import type { ScrapeTarget } from "../types";

/** Maxx's home page (same situation as M1: a bot wall in CI, so it is imported from a real browser). */
export const MAXX_TARGETS: ScrapeTarget[] = [{ url: "https://maxxonline.sg/", category: "mobile_postpaid", mixed: true, parse: todo("Maxx") }];
