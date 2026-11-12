import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const maxx = defineProvider("Maxx", "SG", "https://maxxonline.sg", [
  t.relay(t.mixed("https://maxxonline.sg", todo("Maxx"))),
]);
