import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const celcomdigi = defineProvider("CelcomDigi", "MY", "https://www.celcomdigi.com", [
  t.relay(t.post("https://www.celcomdigi.com/postpaid", todo("CelcomDigi"))),
  t.relay(t.bb("https://www.celcomdigi.com/fibre/home-fibre", todo("CelcomDigi"))),
  t.relay(t.bb("https://www.celcomdigi.com/fibre/home-wifi", todo("CelcomDigi"))),
]);
