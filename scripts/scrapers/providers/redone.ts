import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const redone = defineProvider("redONE", "MY", "https://www.redonemobile.com.my/en/", [
  t.post("https://www.redonemobile.com.my/en/hot-selling-postpaid-plans/", todo("redONE")),
  t.pre("https://www.redonemobile.com.my/en/theoneprepaid/", todo("redONE")),
  t.bb("https://www.redonemobile.com.my/en/redonehome", todo("redONE")),
]);
