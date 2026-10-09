import { defineProvider, t } from "./define";

export const malaysiaProviders = [
  defineProvider("Unifi", "MY", "https://unifi.com.my", [
    t.bb("https://unifi.com.my/fibre-broadband"),
    t.post("https://unifi.com.my/mobile/postpaid"),
    t.pre("https://unifi.com.my/mobile/prepaid"),
  ]),
  defineProvider("Yes", "MY", "https://www.yes.my", [
    t.post("https://www.yes.my/yes-postpaid-plans/"),
    t.pre("https://www.yes.my/yes-prepaid-plans/"),
    t.bb("https://www.yes.my/yes-5g-broadband/"),
    t.bb("https://www.yes.my/yes-fibre/"),
  ]),
  defineProvider("U Mobile", "MY", "https://www.u.com.my", [
    // The page is tabbed; the fragment selects the individual-plans tab (the default tab is Family).
    t.post(
      "https://www.u.com.my/en/personal/mobile-plans/postpaid/postpaid-plans#postpaid-plans",
      "The monthly price is not shown as text on this page; the number at the end of each plan name is its price in RM per month (e.g. 'ULTRA Postpaid 68' costs RM68, 'ULTRA Global 98' RM98). Skip the Family plan card unless it states its own price.",
    ),
    t.pre("https://www.u.com.my/en/personal/mobile-plans/prepaid/data-plans"),
    t.bb("https://www.u.com.my/en/personal/broadband"),
  ]),
  defineProvider("CMLink", "MY", "https://my.cmlink.com/en/", [t.pre("https://my.cmlink.com/en/plans/")]),
  defineProvider("Vibe", "MY", "https://www.vibemobile.com.my", [t.pre("https://www.vibemobile.com.my/prepaid/prepaid-plans/")]),
  defineProvider("redONE", "MY", "https://www.redonemobile.com.my/en/", [
    t.post("https://www.redonemobile.com.my/en/hot-selling-postpaid-plans/"),
    t.pre("https://www.redonemobile.com.my/en/theoneprepaid/"),
    t.bb("https://www.redonemobile.com.my/en/redonehome"),
  ]),
  defineProvider("TuneTalk", "MY", "https://www.tunetalk.com", [t.pre("https://www.tunetalk.com/prepaid/epik-plans/")]),
  defineProvider("XOX", "MY", "https://xox.com.my", [
    t.post("https://onlinestore.xox.com.my/postpaid/postpaid5g"),
    t.mixed("https://onlinestore.xox.com.my/"),
  ]),
  defineProvider("Ansar", "MY", "https://www.ansarmobile.com.my", [t.pre("https://www.ansarmobile.com.my/our-plans/")]),
  defineProvider("Eastel", "MY", "https://eastel.com.my", [t.pre("https://eastel.com.my/mobile-plan/")]),
  defineProvider("HelloSIM", "MY", "https://hellosim.com.my", [
    t.pre("https://hellosim.com.my/sim-packs"),
    t.pre("https://hellosim.com.my/data"),
  ]),
];
