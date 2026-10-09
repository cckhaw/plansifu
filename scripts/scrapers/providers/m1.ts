import { defineProvider, t } from "./define";

export const m1 = defineProvider("M1", "SG", "https://www.m1.com.sg", [
  t.post("https://www.m1.com.sg/personal/sim-plan"),
  t.pre("https://www.m1.com.sg/mobile/prepaid-plans"),
  t.bb("https://www.m1.com.sg/home-broadband"),
]);
