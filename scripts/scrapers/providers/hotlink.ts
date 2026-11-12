import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const hotlink = defineProvider("Hotlink", "MY", "https://www.hotlink.com.my/en/home/", [
  t.post("https://www.hotlink.com.my/en/products/postpaid/", todo("Hotlink")),
  t.pre("https://www.hotlink.com.my/en/products/prepaid/", todo("Hotlink")),
]);
