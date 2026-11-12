import { maxis } from "./maxis";
import { celcomdigi } from "./celcomdigi";
import { unifi } from "./unifi";
import { yes } from "./yes";
import { umobile } from "./umobile";
import { spark } from "./spark";
import { hotlink } from "./hotlink";
import { cmlinkMy } from "./cmlink-my";
import { vibe } from "./vibe";
import { redone } from "./redone";
import { tunetalk } from "./tunetalk";
import { xox } from "./xox";
import { ansar } from "./ansar";
import { eastel } from "./eastel";
import { hellosim } from "./hellosim";
import { singtel } from "./singtel";
import { singtelHi } from "./singtel-hi";
import { m1 } from "./m1";
import { simba } from "./simba";
import { giga } from "./giga";
import { maxx } from "./maxx";
import { gomo } from "./gomo";
import { cmlinkSg } from "./cmlink-sg";
import { zero1 } from "./zero1";
import { cuniq } from "./cuniq";
import { eight } from "./eight";
import { vivifi } from "./vivifi";
import { starhub } from "./starhub";
import { zym } from "./zym";
import type { ProviderScraper } from "../types";

/** Every telco provider the nightly crawl covers, in crawl order. */
export const providers: ProviderScraper[] = [
  maxis, singtel, celcomdigi, m1, unifi, yes, umobile, spark, hotlink, cmlinkMy, vibe, redone, tunetalk, xox, ansar, eastel, hellosim, singtelHi, simba, giga, maxx, gomo, cmlinkSg, zero1, cuniq, eight, vivifi, starhub, zym,
];
