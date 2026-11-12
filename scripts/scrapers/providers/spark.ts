import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const spark = defineProvider("Spark", "MY", "https://spark.celcomdigi.com", [
  t.pre("https://spark.celcomdigi.com", todo("Spark")),
]);
