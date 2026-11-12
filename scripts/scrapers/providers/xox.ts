import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const xox = defineProvider("XOX", "MY", "https://xox.com.my", [
  t.post("https://onlinestore.xox.com.my/postpaid/postpaid5g", todo("XOX")),
  t.expectEmpty(t.mixed("https://onlinestore.xox.com.my/", todo("XOX"))),
]);
