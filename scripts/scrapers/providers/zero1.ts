import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const zero1 = defineProvider("Zero1", "SG", "https://zero1.sg", [
  t.post("https://zero1.sg/plans/zero1-basic", todo("Zero1")),
  t.post("https://zero1.sg/plans/zero1-standard", todo("Zero1")),
  t.post("https://zero1.sg/plans/zero1-jumbo", todo("Zero1")),
]);
