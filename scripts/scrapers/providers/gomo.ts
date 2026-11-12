import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const gomo = defineProvider("Gomo", "SG", "https://www.gomo.sg", [
  t.post("https://www.gomo.sg/personal/mobile/plans", todo("Gomo")),
  t.bb("https://www.gomo.sg/personal/broadband", todo("Gomo")),
]);
