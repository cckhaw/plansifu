import type { Faq } from "@/components/seo/JsonLdFaq";
import { COUNTRIES } from "@/lib/currency";
import type { Kind } from "@/lib/routes";
import type { Country } from "@/types/database";

/** Plain-language answers. They are general guidance, hedged where rules or timings vary by provider. */
const PORTING: Record<Country, Faq> = {
  MY: {
    q: "How do I keep my phone number when switching telco in Malaysia?",
    a: "Malaysia supports mobile number portability, so you can move to another telco and keep your number. You apply with your new provider, not your old one: they will ask for your number and ID and arrange the transfer, which normally completes within a few working days (your new provider confirms the date). Keep your old line active until the port finishes, and check any contract early-termination charge or unpaid bill first.",
  },
  SG: {
    q: "How do I keep my phone number when switching telco in Singapore?",
    a: "Singapore lets you keep your mobile number when you change operator. You apply with your new provider, not your old one: they will ask for your number and ID and arrange the transfer, which is usually done within a few working days (your new provider confirms the date). Keep your old line active until the port finishes, and check any contract early-termination charge or unpaid bill first.",
  },
};

const PREPAID_VS_POSTPAID: Faq = {
  q: "What is the difference between prepaid and postpaid?",
  a: "Postpaid plans bill you monthly for a fixed bundle of data, calls and SMS, and often run on a contract. Prepaid plans are paid up front: you buy a pack or top up credit, with no monthly bill and usually no contract. Postpaid tends to give more data per dollar for regular use; prepaid suits light users, visitors and anyone who wants flexibility.",
};

const CONTRACT: Faq = {
  q: "Will I be charged if I leave a contract early?",
  a: "Plans with a contract, especially those bundled with a phone or a promotion, usually carry an early-termination fee. SIM-only and no-contract plans normally do not. The contract length is shown on every plan card, but always read the provider's terms before you sign.",
};

const ESIM: Faq = {
  q: "Can I use an eSIM instead of a physical SIM?",
  a: "Many recent phones support eSIM, and several providers offer it for new lines. Check that your phone is unlocked and eSIM-capable, then ask the provider for eSIM activation. Search PlanSifu for 'eSIM' to find plans that mention it.",
};

const SUPP: Faq = {
  q: "What is a supplementary line?",
  a: "A supplementary line is an extra line added to a postpaid account, often at a lower price than the main plan. PlanSifu lists each provider's main (principal) plans; extra-line prices are noted on a plan when the provider publishes them.",
};

const HOW_WE_RANK: Faq = {
  q: "How does PlanSifu pick the 'best' plans?",
  a: "Automatically, from the prices and specs we collect from provider websites every night: for example price per GB, speed or contract terms. Plans limited to an age group are left out of the headline picks. We may earn a commission if you apply through our links, but that does not change the ranking.",
};

const SPEED: Faq = {
  q: "What broadband speed do I need?",
  a: "As a rule of thumb, 100 to 300Mbps is enough for one to three people streaming and working online, 500Mbps to 1Gbps suits larger households, heavy gamers and big downloads, and 2Gbps or more only matters if many devices are busy at once. Your Wi-Fi router and in-home wiring often limit real-world speeds more than the plan does.",
};

const INSTALL: Faq = {
  q: "Is fibre installation free?",
  a: "Many providers waive installation or router fees when you sign a contract, but this varies and can change with promotions. The plan cards show contract length and any promotion we could read from the provider's page; confirm installation costs with the provider before you apply.",
};

const ESIM_TRAVEL: Faq[] = [
  {
    q: "Does a travel eSIM come with a phone number?",
    a: "Most travel eSIMs are data-only: you use WhatsApp, iMessage or other apps for calls and messages. A few brands include a phone number or voice and SMS; the table on this page shows which, using the 'Phone number' and 'Voice / SMS' columns.",
  },
  {
    q: "How is the cost per GB calculated?",
    a: "Price divided by the total data in the plan, after converting the brand's price into your currency at indicative daily exchange rates. Unlimited plans are compared on price and cost per day instead.",
  },
];

export function faqsFor(country: Country, kind: Kind): Faq[] {
  const place = COUNTRIES[country].label;
  switch (kind) {
    case "postpaid":
      return [PORTING[country], PREPAID_VS_POSTPAID, CONTRACT, SUPP, ESIM, HOW_WE_RANK];
    case "prepaid":
      return [PORTING[country], PREPAID_VS_POSTPAID, { q: `Can I buy a prepaid SIM in ${place} without a contract?`, a: "Yes. Prepaid SIMs and passes are paid up front and have no contract. Registration with your ID is required before the line is active. Check each pack's validity period, since a pack's data usually expires." }, ESIM, HOW_WE_RANK];
    case "broadband":
      return [SPEED, INSTALL, CONTRACT, { q: "Can I switch home fibre provider mid-contract?", a: "You can, but a provider will usually charge an early-termination fee if your contract has not ended, and your new provider arranges its own installation, so allow for a short gap in service. Check the contract end date before you switch." }, HOW_WE_RANK];
    case "travel-esim":
      return [...ESIM_TRAVEL, ESIM, HOW_WE_RANK];
    default:
      return [PORTING[country], PREPAID_VS_POSTPAID, CONTRACT, ESIM, HOW_WE_RANK];
  }
}
