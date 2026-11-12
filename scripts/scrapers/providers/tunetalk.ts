import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const tunetalk = defineProvider("TuneTalk", "MY", "https://www.tunetalk.com", [
  t.pre("https://www.tunetalk.com/prepaid/epik-plans/", todo("TuneTalk")),
]);
