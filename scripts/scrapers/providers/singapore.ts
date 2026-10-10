import { defineProvider, t } from "./define";

export const singaporeProviders = [
  defineProvider("Singtel hi!", "SG", "https://www.singtel.com/personal/products-services/mobile/hi", [
    t.pre("https://www.singtel.com/personal/products-services/mobile/hi"),
  ]),
  defineProvider("SIMBA", "SG", "https://simba.sg", [t.mixed("https://simba.sg/")]),
  defineProvider("Giga", "SG", "https://www.giga.com.sg", [t.mixed("https://www.giga.com.sg/")]),
  defineProvider("Maxx", "SG", "https://maxxonline.sg", [t.mixed("https://maxxonline.sg")]),
  defineProvider("Gomo", "SG", "https://www.gomo.sg", [
    t.post("https://www.gomo.sg/personal/mobile/plans"),
    t.bb("https://www.gomo.sg/personal/broadband"),
  ]),
  defineProvider("CMLink", "SG", "https://www.cmlink.com/sg/en/", [t.mixed("https://www.cmlink.com/sg/en/plans/")]),
  defineProvider("Zero1", "SG", "https://zero1.sg", [t.post("https://zero1.sg/plans/zero1-basic"), t.post("https://zero1.sg/plans/zero1-standard"), t.post("https://zero1.sg/plans/zero1-jumbo")]),
  defineProvider("Cuniq", "SG", "https://www.cuniq.sg", [t.mixed("https://www.cuniq.sg/en/plans/listing")]),
  // eight.com.sg renders blank for GitHub's network, so its pages go through the Vercel relay.
  defineProvider("Eight", "SG", "https://www.eight.com.sg", [
    t.relay(t.post("https://www.eight.com.sg/mobile/")),
    t.relay(t.bb("https://www.eight.com.sg/broadband/")),
  ]),
  defineProvider("Vivifi", "SG", "https://www.vivifi.me", [t.mixed("https://www.vivifi.me/")]),
];
