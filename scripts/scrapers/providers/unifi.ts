import { todo } from "../parse-utils";
import { defineProvider, t } from "./define";

export const unifi = defineProvider("Unifi", "MY", "https://unifi.com.my", [
  t.bb("https://unifi.com.my/fibre-broadband", todo("Unifi")),
  t.post("https://unifi.com.my/mobile/postpaid", todo("Unifi")),
  t.pre("https://unifi.com.my/mobile/prepaid", todo("Unifi")),
]);
