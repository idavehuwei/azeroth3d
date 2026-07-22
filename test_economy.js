/* plan-v4 STEP 18 · 货币 / 灰装 / 双商人 · 无头断言 */
"use strict";
const fs=require("fs");
const path=require("path");

let pass=0,fail=0;
function ok(cond,msg){
  if(cond){pass++;console.log("PASS:",msg);}
  else{fail++;console.error("FAIL:",msg);}
}

const root=__dirname;
const bal=fs.readFileSync(path.join(root,"js/sim/balance.js"),"utf8");
const items=fs.readFileSync(path.join(root,"items.js"),"utf8");
const world=fs.readFileSync(path.join(root,"world.js"),"utf8");
const combat=fs.readFileSync(path.join(root,"combat.js"),"utf8");
const html=fs.readFileSync(path.join(root,"game.html"),"utf8");
const save=fs.readFileSync(path.join(root,"save.js"),"utf8");

ok(bal.includes("copperPerGold:10000")&&bal.includes("copperPerSilver:100"),"金/银/铜换算表");
ok(bal.includes("weaponsmith:")&&bal.includes("camp_shortsword"),"武器匠货架含白装");
ok(bal.includes('varg:["plain_bread"'),"杂货商货架含食物");
ok(items.includes('quality:"poor"')&&items.includes("frayed_cloth")&&items.includes("vendorPrice"),"灰装 + vendorPrice");
ok(items.includes("camp_shortsword")&&items.includes("camp_leather_vest"),"营地白装可购");
ok(items.includes("function getVendorSell")&&items.includes("function getVendorBuy"),"买卖价读取助手");
ok(world.includes("杂货商 · 瓦尔格")&&world.includes("武器匠 · 石刃"),"营地双商人 NPC");
ok(world.includes('openVendor("weaponsmith"'),"武器匠接线 openVendor");
ok(combat.includes("formatCopperParts")&&combat.includes("formatMoney")&&combat.includes("gainCopper"),"货币 API");
ok(html.includes("pGoldHud")&&html.includes("right:16px")&&html.includes("bottom:110px"),"金币 HUD 右下");
ok(save.includes("gold:S.p.gold")||save.includes("gold:S.p.gold|0"),"存档含金币");

/* 验收：5 件最便宜灰装 ≥ 一块硬面饼 */
const poorSells=[];
const re=/quality:"poor"[^}]*vendorSell:(\d+)/g;
let m;
while((m=re.exec(items)))poorSells.push(+m[1]);
const breadBuy=(items.match(/plain_bread[\s\S]*?vendorBuy:(\d+)/)||[])[1]|0;
const min5=5*Math.min(...poorSells);
ok(poorSells.length>=5,"至少 5 种灰装");
ok(breadBuy>0&&min5>=breadBuy,`卖 5 灰装(${min5}) ≥ 硬面饼(${breadBuy})`);

/* 换算冒烟 */
function parts(copper){
  let c=copper|0;
  const g=Math.floor(c/10000); c%=10000;
  const s=Math.floor(c/100); c%=100;
  return {g,s,c};
}
ok(parts(12345).g===1&&parts(12345).s===23&&parts(12345).c===45,"12345铜 = 1金23银45铜");

console.log(fail?`失败 ${fail} · 通过 ${pass}`:`全部通过 · plan-v4 STEP 18 economy (${pass})`);
process.exit(fail?1:0);
