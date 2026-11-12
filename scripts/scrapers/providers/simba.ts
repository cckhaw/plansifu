import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const simba = defineProvider("SIMBA", "SG", "https://simba.sg", [
  t.mixed("https://simba.sg/", todo("SIMBA")),
]);
