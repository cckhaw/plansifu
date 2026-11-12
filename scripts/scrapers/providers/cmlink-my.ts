import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const cmlinkMy = defineProvider("CMLink", "MY", "https://my.cmlink.com/en/", [
  t.pre("https://my.cmlink.com/en/plans/", todo("CMLink")),
]);
