import { defineProvider, t } from "./define";

export const singaporeProviders = [
  defineProvider("Singtel hi!", "SG", "https://www.singtel.com/personal/products-services/mobile/hi", [
    t.pre("https://www.singtel.com/personal/products-services/mobile/hi"),
    t.pre("https://www.singtel.com/personal/mobile/plans/prepaid-new"),
  ]),
  defineProvider("SIMBA", "SG", "https://simba.sg", [t.mixed("https://simba.sg/")]),
  defineProvider("Giga", "SG", "https://www.giga.com.sg", [t.mixed("https://www.giga.com.sg/")]),
  defineProvider("Maxx", "SG", "https://maxxonline.sg", [t.mixed("https://maxxonline.sg")]),
  defineProvider("Gomo", "SG", "https://www.gomo.sg", [
    t.post("https://www.gomo.sg/personal/mobile/plans"),
    t.bb("https://www.gomo.sg/personal/broadband"),
  ]),
  defineProvider("CMLink", "SG", "https://www.cmlink.com/sg/en/", [t.mixed("https://www.cmlink.com/sg/en/plans/")]),
  defineProvider("Zym", "SG", "https://zym.sg", [t.mixed("https://zym.sg/promotion/"), t.mixed("https://zym.sg/")]),
  defineProvider("Zero1", "SG", "https://zero1.sg", [t.mixed("https://zero1.sg/plan-categories"), t.mixed("https://zero1.sg/plans")]),
  defineProvider("Cuniq", "SG", "https://www.cuniq.sg", [t.mixed("https://www.cuniq.sg/en/plans/listing")]),
  defineProvider("Vivifi", "SG", "https://www.vivifi.me", [t.mixed("https://www.vivifi.me/")]),
];
