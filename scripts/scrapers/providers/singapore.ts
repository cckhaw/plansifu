import { defineProvider, t } from "./define";

export const singaporeProviders = [
  defineProvider("Singtel hi!", "SG", "https://www.singtel.com/personal/products-services/mobile/hi", [
    t.pre("https://www.singtel.com/personal/products-services/mobile/hi"),
    t.pre("https://www.singtel.com/personal/mobile/plans/prepaid-new"),
  ]),
  defineProvider("StarHub", "SG", "https://www.starhub.com", [
    t.post("https://www.starhub.com/personal/mobile.html"),
    t.pre("https://www.starhub.com/personal/mobile/starhub-prepaid.html"),
    t.bb("https://www.starhub.com/personal/broadband.html"),
  ]),
  defineProvider("SIMBA", "SG", "https://simba.sg", [t.pre("https://simba.sg/")]),
  defineProvider("Giga", "SG", "https://www.giga.com.sg", [t.post("https://www.giga.com.sg/")]),
  defineProvider("Maxx", "SG", "https://maxxonline.sg", [t.post("https://maxxonline.sg")]),
  defineProvider("Gomo", "SG", "https://www.gomo.sg", [
    t.post("https://www.gomo.sg/personal/mobile/plans"),
    t.bb("https://www.gomo.sg/personal/broadband"),
  ]),
  defineProvider("CMLink", "SG", "https://www.cmlink.com/sg/en/", [t.pre("https://www.cmlink.com/sg/en/plans/")]),
  defineProvider("Zym", "SG", "https://zym.sg", [t.post("https://zym.sg/promotion/"), t.post("https://zym.sg/")]),
  defineProvider("Zero1", "SG", "https://zero1.sg", [t.post("https://zero1.sg/plan-categories"), t.post("https://zero1.sg/plans")]),
  defineProvider("Cuniq", "SG", "https://www.cuniq.sg", [t.pre("https://www.cuniq.sg/en/plans/listing")]),
  defineProvider("Vivifi", "SG", "https://www.vivifi.me", [t.post("https://www.vivifi.me/")]),
];
