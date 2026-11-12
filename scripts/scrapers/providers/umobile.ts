import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const umobile = defineProvider("U Mobile", "MY", "https://www.u.com.my", [
  t.post("https://www.u.com.my/en/personal/mobile-plans/postpaid/postpaid-plans#postpaid-plans", todo("U Mobile")),
  t.pre("https://www.u.com.my/en/personal/mobile-plans/prepaid/data-plans", todo("U Mobile")),
  t.bb("https://www.u.com.my/en/personal/broadband", todo("U Mobile")),
]);
