import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const vivifi = defineProvider("Vivifi", "SG", "https://www.vivifi.me", [
  t.mixed("https://www.vivifi.me/", todo("Vivifi")),
]);
