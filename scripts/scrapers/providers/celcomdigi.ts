import { defineProvider, t } from "./define";

// celcomdigi.com answers 403 to GitHub's network, so both pages are fetched through our Vercel relay.
export const celcomdigi = defineProvider("CelcomDigi", "MY", "https://www.celcomdigi.com", [
  t.relay(
    t.post(
      "https://www.celcomdigi.com/postpaid",
      "The page has Principle line / Supplementary line views of the same plans. Return only the principal-line plans and prices; supplementary-line (discounted) prices go in supplementary_line_price, never as separate plans.",
    ),
  ),
  // /home/fibre no longer exists (404); fibre and Home WiFi plans live under /fibre.
  t.relay(t.bb("https://www.celcomdigi.com/fibre/home-fibre")),
  t.relay(t.bb("https://www.celcomdigi.com/fibre/home-wifi")),
]);
