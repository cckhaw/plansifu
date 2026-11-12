import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const giga = defineProvider("Giga", "SG", "https://www.giga.com.sg", [
  t.mixed("https://www.giga.com.sg/", todo("Giga")),
]);
