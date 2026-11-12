import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const cuniq = defineProvider("Cuniq", "SG", "https://www.cuniq.sg", [
  t.mixed("https://www.cuniq.sg/en/plans/listing", todo("Cuniq")),
]);
