import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const eastel = defineProvider("Eastel", "MY", "https://eastel.com.my", [
  t.pre("https://eastel.com.my/mobile-plan/", todo("Eastel")),
]);
