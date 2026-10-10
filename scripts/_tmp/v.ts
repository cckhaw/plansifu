import { chromium } from "playwright";
import { ESIM_BRANDS, candidateUrls } from "../esim/brands";
import { ESIM_DESTINATIONS } from "../../src/lib/esim-destinations";
const keys=(process.env.KEYS||"japan,united-states,europe,global").split(",");
const only=process.env.ONLY?.split(",");
(async()=>{const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome"});
const jobs:[string,string,string][]=[];
for(const br of ESIM_BRANDS){if(only&&!only.includes(br.name))continue;for(const k of keys){const d=ESIM_DESTINATIONS.find(x=>x.key===k)!;for(const u of candidateUrls(br,d))jobs.push([br.name,k,u]);}}
let i=0;await Promise.all([0,1,2,3].map(async()=>{while(i<jobs.length){const [n,k,u]=jobs[i++];const c=await b.newContext({userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"});const p=await c.newPage();
 try{const r=await p.goto(u,{waitUntil:"load",timeout:45000});await p.waitForTimeout(3500);
 const t=await p.evaluate(()=>document.body.innerText);const prices=(t.match(/(?:US\$|\$|€|£|RM|S\$|A\$)\s?\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s?(?:USD|EUR|GBP)/g)||[]).length;const gb=(t.match(/\d+\s?GB/gi)||[]).length;
 console.log(`${n.padEnd(11)} ${k.padEnd(14)} ${r?.status()} len=${t.length} prices=${prices} gb=${gb} ${p.url()===u?"":"-> "+p.url()}`);}catch(e){console.log(`${n.padEnd(11)} ${k.padEnd(14)} ERR ${String(e).slice(0,50)}`)}
 await c.close();}}));await b.close();})();
