import { defineProvider, t } from "./define";

// m1.com.sg shows a CAPTCHA bot wall to GitHub's network, so its pages go through the Vercel relay.
export const m1 = defineProvider("M1", "SG", "https://www.m1.com.sg", [
  t.relay(t.post("https://www.m1.com.sg/personal/sim-plan")),
  t.relay(t.pre("https://www.m1.com.sg/mobile/prepaid-plans")),
  t.relay(t.bb("https://www.m1.com.sg/home-broadband")),
]);
