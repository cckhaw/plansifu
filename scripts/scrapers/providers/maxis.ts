import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const maxis = defineProvider("Maxis", "MY", "https://www.maxis.com.my", [
  t.post("https://www.maxis.com.my/en/mobile-plans/", todo("Maxis")),
  t.bb("https://www.maxis.com.my/en/broadband/", todo("Maxis")),
]);
