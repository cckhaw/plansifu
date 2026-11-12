import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const yes = defineProvider("Yes", "MY", "https://www.yes.my", [
  t.post("https://www.yes.my/yes-postpaid-plans/", todo("Yes")),
  t.pre("https://www.yes.my/yes-prepaid-plans/", todo("Yes")),
  t.bb("https://www.yes.my/yes-5g-broadband/", todo("Yes")),
  t.expectEmpty(t.bb("https://www.yes.my/yes-fibre/", todo("Yes"))),
]);
