import { defineProvider, t } from "./define";

export const celcomdigi = defineProvider("CelcomDigi", "MY", "https://www.celcomdigi.com", [
  // celcomdigi.com blocks datacenter browsers (CloudFront 403), so fetch through Firecrawl.
  t.viaFirecrawl(t.post("https://www.celcomdigi.com/postpaid")),
  t.viaFirecrawl(t.bb("https://www.celcomdigi.com/home/fibre")),
]);
