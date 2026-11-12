import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const m1 = defineProvider("M1", "SG", "https://www.m1.com.sg", [
  t.relay(t.post("https://www.m1.com.sg/personal/sim-plan", todo("M1"))),
  t.relay(t.pre("https://www.m1.com.sg/mobile/prepaid-plans", todo("M1"))),
  t.relay(t.bb("https://www.m1.com.sg/home-broadband", todo("M1"))),
]);
