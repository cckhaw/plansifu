import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const hellosim = defineProvider("HelloSIM", "MY", "https://hellosim.com.my", [
  t.expectEmpty(t.pre("https://hellosim.com.my/sim-packs", todo("HelloSIM"))),
  t.pre("https://hellosim.com.my/data", todo("HelloSIM")),
]);
