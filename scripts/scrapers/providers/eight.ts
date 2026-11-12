import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const eight = defineProvider("Eight", "SG", "https://www.eight.com.sg", [
  t.relay(t.post("https://www.eight.com.sg/mobile/", todo("Eight"))),
  t.relay(t.bb("https://www.eight.com.sg/broadband/", todo("Eight"))),
]);
