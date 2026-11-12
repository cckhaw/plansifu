import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const ansar = defineProvider("Ansar", "MY", "https://www.ansarmobile.com.my", [
  t.pre("https://www.ansarmobile.com.my/our-plans/", todo("Ansar")),
]);
