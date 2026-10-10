import { chromium } from "playwright";
const brands: Record<string,string> = {Saily:"https://saily.com",BillionConnect:"https://www.billionconnect.net",Truely:"https://truely.com",Ubigi:"https://ubigi.com",BNESIM:"https://bnesim.com",esim4u:"https://esim4u.io",Instabridge:"https://store.instabridge.com/mobile-data/SE/10gb",Xummer:"https://www.xummer.com"};
(async()=>{const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome"});
const entries=Object.entries(brands);let idx=0;await Promise.all([0,1,2,3].map(async()=>{while(idx<entries.length){const [n,u]=entries[idx++];const c=await b.newContext({userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"});const p=await c.newPage();
 try{await p.goto(u,{waitUntil:"load",timeout:60000});await p.waitForTimeout(4000);
 const links=await p.evaluate(()=>[...new Set([...document.querySelectorAll("a")].map(a=>(a as HTMLAnchorElement).href))]);
 console.log("==",n,p.url(),links.length);console.log(links.filter(h=>/esim|countr|destin|plan|region|europe|asia|global|usa|thailand|korea/i.test(h)).slice(0,25).join("\n"));}catch(e){console.log("==",n,"ERR",String(e).slice(0,60))}
 await c.close();}}));await b.close();})();
