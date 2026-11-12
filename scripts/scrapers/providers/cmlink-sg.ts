import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const cmlinkSg = defineProvider("CMLink", "SG", "https://www.cmlink.com/sg/en/", [
  t.mixed("https://www.cmlink.com/sg/en/plans/", todo("CMLink")),
]);
