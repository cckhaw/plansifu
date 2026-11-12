import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const vibe = defineProvider("Vibe", "MY", "https://www.vibemobile.com.my", [
  t.pre("https://www.vibemobile.com.my/prepaid/prepaid-plans/", todo("Vibe")),
]);
