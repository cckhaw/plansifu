import { defineProvider, t } from "./define";

export const celcomdigi = defineProvider("CelcomDigi", "MY", "https://www.celcomdigi.com", [
  t.post(
    "https://www.celcomdigi.com/postpaid",
    "The page has Principle line / Supplementary line views of the same plans. Return only the principal-line plans and prices; supplementary-line (discounted) prices go in supplementary_line_price, never as separate plans.",
  ),
  t.bb("https://www.celcomdigi.com/home/fibre"),
]);
