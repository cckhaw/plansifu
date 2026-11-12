import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const singtelHi = defineProvider("Singtel hi!", "SG", "https://www.singtel.com/personal/products-services/mobile/hi", [
  t.pre("https://www.singtel.com/personal/products-services/mobile/hi", todo("Singtel hi!")),
]);
