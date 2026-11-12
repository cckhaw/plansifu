import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const singtel = defineProvider("Singtel", "SG", "https://www.singtel.com", [
  t.expectEmpty(t.post("https://www.singtel.com/personal/products-services/mobile/mobile-plans", todo("Singtel"))),
  t.post("https://www.singtel.com/personal/mobile/plans/sim-only", todo("Singtel")),
  t.expectEmpty(t.bb("https://www.singtel.com/personal/products-services/broadband", todo("Singtel"))),
]);
