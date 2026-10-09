import { defineProvider, t } from "./define";

export const celcomdigi = defineProvider("CelcomDigi", "MY", "https://www.celcomdigi.com", [
  t.post("https://www.celcomdigi.com/postpaid"),
  t.bb("https://www.celcomdigi.com/home/fibre"),
]);
