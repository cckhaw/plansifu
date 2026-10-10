import { chromium } from "playwright";
const brands: Record<string,string> = {
 Saily:"https://saily.com",BillionConnect:"https://www.billionconnect.net",GogoRoaming:"https://www.gogoroaming.my",Xummer:"https://xummer.com",Eskimo:"https://eskimo.travel",Jetpac:"https://jetpacglobal.com",Holafly:"https://holafly.com",Truely:"https://truely.com",Roamless:"https://roamless.com",Airalo:"https://airalo.com",Nomad:"https://getnomad.app",Ubigi:"https://ubigi.com",Maya:"https://maya.net",MobiMatter:"https://mobimatter.com",aloSIM:"https://alosim.com",BNESIM:"https://bnesim.com",Yesim:"https://yesim.app",GigSky:"https://gigsky.com",SimLocal:"https://simlocal.com",easySim:"https://easysim.global",esim4u:"https://esim4u.io",Firsty:"https://www.firsty.app",Flexiroam:"https://www.flexiroam.com",Instabridge:"https://store.instabridge.com/mobile-data/SE/10gb"};
(async()=>{const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome"});
const entries=Object.entries(brands);let idx=0;await Promise.all([0,1,2,3].map(async()=>{while(idx<entries.length){const [n,u]=entries[idx++];const c=await b.newContext({userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"});const p=await c.newPage();
 try{const r=await p.goto(u,{waitUntil:"load",timeout:60000});await p.waitForTimeout(3500);
 const info=await p.evaluate(()=>({len:document.body.innerText.length,jp:[...new Set([...document.querySelectorAll("a")].map(a=>(a as HTMLAnchorElement).href).filter(h=>/japan/i.test(h)))].slice(0,3),title:document.title.slice(0,50)}));
 console.log(n,r?.status(),info.len,info.title,JSON.stringify(info.jp));}catch(e){console.log(n,"ERR",String(e).slice(0,80))}
 await c.close();}}));await b.close();})();
