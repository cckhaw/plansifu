import { cleanPageText, renderPage } from "./browser";
import { writeFileSync } from "fs";
(async()=>{
 for (const u of ["https://www.u.com.my/en/personal/broadband/wireless","https://www.u.com.my/en/personal/broadband/fibre"]) {
  const r = await renderPage(u,{minChars:800,mode:"nodes",feeds:true});
  const n=u.split("/").pop();
  writeFileSync(`/tmp/claude-0/-home-user-plansifu/fcb6ff50-1e4d-5eed-9ffe-356b66379dce/scratchpad/umb-${n}.json`, JSON.stringify({url:u,html:r.html,text:cleanPageText(r.text),feeds:r.feeds}));
  console.log(u, r.text.length);
 }
})();
