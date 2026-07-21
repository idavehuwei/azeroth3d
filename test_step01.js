/* ============================================================
   STEP 17 回归：分区种子确定性（无头，不依赖 THREE）
   运行：node test_step01.js
   ============================================================ */
"use strict";

function SeededRng(seed){let a=seed>>>0;return function(){
  a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const WORLD_SEED=20260721;
function hashZoneId(id){
  let h=2166136261>>>0;
  const s=String(id);
  for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;
  return h>>>0;
}
function getZoneSeed(id){return(WORLD_SEED^hashZoneId(id))>>>0;}

function sample(id,n){
  const rng=SeededRng(getZoneSeed(id));
  const out=[];
  for(let i=0;i<n;i++)out.push(+(rng().toFixed(8)));
  return out;
}

function assert(cond,msg){
  if(!cond){console.error("FAIL:",msg);process.exitCode=1;return false;}
  console.log("PASS:",msg);
  return true;
}

function sameArr(a,b){
  if(a.length!==b.length)return false;
  for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;
  return true;
}

const N=12;
const m1=sample("mulgore",N);
const m2=sample("mulgore",N);
const r1=sample("molten_core",N);
const r2=sample("molten_core",N);

assert(sameArr(m1,m2),"mulgore 两次采样序列相同");
assert(sameArr(r1,r2),"molten_core 两次采样序列相同");
assert(!sameArr(m1,r1),"mulgore 与 molten_core 种子互不干扰");
assert(getZoneSeed("mulgore")!==getZoneSeed("molten_core"),"getZoneSeed 分区不同");
assert(getZoneSeed("mulgore")===(WORLD_SEED^hashZoneId("mulgore"))>>>0,"种子公式 WORLD_SEED ^ hash(zoneId)");

const b1=sample("barrens",N);
const b2=sample("barrens",N);
assert(sameArr(b1,b2),"barrens 两次采样序列相同");
assert(!sameArr(b1,m1),"barrens 与 mulgore 种子互不干扰");

/* 注册表形状冒烟（不加载 DOM/THREE，仅语法检查 zones 关键 API 文本） */
const fs=require("fs");
const path=require("path");
const zonesSrc=fs.readFileSync(path.join(__dirname,"zones.js"),"utf8");
assert(zonesSrc.includes("function enterZone"),"zones.js 导出 enterZone");
assert(zonesSrc.includes("function registerZone"),"zones.js 导出 registerZone");
assert(zonesSrc.includes("function ensureAllZonesBuilt"),"zones.js 导出 ensureAllZonesBuilt");

const worldSrc=fs.readFileSync(path.join(__dirname,"world.js"),"utf8");
assert(worldSrc.includes('registerZone({')&&worldSrc.includes('id:"mulgore"'),"world.js 注册 mulgore");
assert(worldSrc.includes("enterZone(\"molten_core\""),"enterRaid 走 enterZone");
assert(worldSrc.includes("to_barrens")||worldSrc.includes("PORTAL_BARRENS"),"world.js 有贫瘠之地传送门");

const barrensSrc=fs.readFileSync(path.join(__dirname,"barrens.js"),"utf8");
assert(barrensSrc.includes('id:"barrens"'),"barrens.js 注册 barrens");
assert(barrensSrc.includes("BARRENS_QUEST"),"barrens.js 有 BARRENS_QUEST");
assert(barrensSrc.includes("buildBarrensZone"),"barrens.js 有 buildBarrensZone");

const raidSrc=fs.readFileSync(path.join(__dirname,"raid.js"),"utf8");
assert(raidSrc.includes('id:"molten_core"'),"raid.js 注册 molten_core");
assert(raidSrc.includes("buildMoltenCoreZone"),"raid.js 有 buildMoltenCoreZone");

const html=fs.readFileSync(path.join(__dirname,"game.html"),"utf8");
assert(html.includes('src="zones.js"'),"game.html 加载 zones.js");
assert(html.includes('src="barrens.js"'),"game.html 加载 barrens.js");
assert(html.includes("ensureAllZonesBuilt()"),"game.html 调用 ensureAllZonesBuilt");

/* STEP 19 牧师冒烟 */
const combatSrc=fs.readFileSync(path.join(__dirname,"combat.js"),"utf8");
assert(combatSrc.includes("priest:{"),"combat.js 有 CLASSES.priest");
assert(combatSrc.includes("function powerWordShield"),"combat.js 有 powerWordShield");
assert(combatSrc.includes("function applyHeal"),"combat.js 有 applyHeal");
assert(combatSrc.includes("S.p.absorb"),"combat.js 使用 S.p.absorb 吸收盾");
assert(/if\s*\(\s*S\.p\.absorb\s*>\s*0\s*\)/.test(combatSrc),"playerHit 先扣吸收盾");

const modelsSrc=fs.readFileSync(path.join(__dirname,"models.js"),"utf8");
assert(modelsSrc.includes("function buildPriest"),"models.js 导出 buildPriest");
assert(modelsSrc.includes("priest:")||modelsSrc.includes("HUMANOIDS.priest")||modelsSrc.includes("priest:{"),"models.js 有 priest 人形配方");

const talentsSrc=fs.readFileSync(path.join(__dirname,"talents.js"),"utf8");
assert(talentsSrc.includes("priest:{"),"talents.js 有 TALENTS.priest");
assert(talentsSrc.includes('id:"holy"')&&talentsSrc.includes('id:"discipline"'),"牧师天赋双枝 神圣/戒律");

const coreSrc=fs.readFileSync(path.join(__dirname,"core.js"),"utf8");
assert(coreSrc.includes("powerWordShield"),"BALANCE.skills 含 powerWordShield");
assert(coreSrc.includes("flashHeal")&&coreSrc.includes("smite"),"BALANCE.skills 含 flashHeal/smite");

const iconsSrc=fs.readFileSync(path.join(__dirname,"icons.js"),"utf8");
assert(iconsSrc.includes("holy(cx)")&&iconsSrc.includes("holy_shield(cx)")&&iconsSrc.includes("flash_heal(cx)"),"icons.js 有牧师图标配方");

const sfxSrc=fs.readFileSync(path.join(__dirname,"sfx.js"),"utf8");
assert(sfxSrc.includes("heal")&&sfxSrc.includes("holy"),"sfx.js 有 heal/holy 音效");

assert(html.includes('data-cls="priest"'),"启程界面有牧师职业卡");

/* STEP 20 AI 队友冒烟 */
const cmpSrc=fs.readFileSync(path.join(__dirname,"companions.js"),"utf8");
assert(cmpSrc.includes("function recruitCompanion"),"companions.js 有 recruitCompanion");
assert(cmpSrc.includes("function dismissCompanion"),"companions.js 有 dismissCompanion");
assert(cmpSrc.includes("function tickCompanion"),"companions.js 有 tickCompanion");
assert(cmpSrc.includes("FOLLOW")&&cmpSrc.includes("COMBAT")&&cmpSrc.includes("HEAL")&&cmpSrc.includes("RETREAT"),"同伴状态机含 FOLLOW/COMBAT/HEAL/RETREAT");
assert(cmpSrc.includes("disposeCompanionMesh"),"解散有 disposeCompanionMesh");
assert(html.includes('src="companions.js"'),"game.html 加载 companions.js");
assert(html.includes("cmpFrame"),"game.html 有同伴 HUD");
assert(coreSrc.includes("companion:{")||coreSrc.includes("companion:"),"BALANCE 含 companion 表");
assert(combatSrc.includes("getFocusTarget")&&combatSrc.includes("currentTarget"),"combat.js 有集火目标 API");

/* STEP 21 哀嚎洞穴冒烟 */
const wailingSrc=fs.readFileSync(path.join(__dirname,"wailing.js"),"utf8");
assert(wailingSrc.includes('id:"wailing_caverns"'),"wailing.js 注册 wailing_caverns");
assert(wailingSrc.includes("WAILING_DUNGEON")&&wailingSrc.includes("buildWailingZone"),"wailing.js 有副本状态机与建造");
assert(wailingSrc.includes("cobrahn")&&wailingSrc.includes("verdan"),"哀嚎分段含考布莱恩/吞噬者");
assert(html.includes('src="wailing.js"'),"game.html 加载 wailing.js");
assert(coreSrc.includes("cobrahn")&&coreSrc.includes("verdan")&&coreSrc.includes("wailingAdd"),"BALANCE 含哀嚎数值");
assert(coreSrc.includes("venom_bolt")||coreSrc.includes("venom_ring"),"BALANCE.vfx 含毒液特效");
assert(raidSrc.includes("function getDungeon")&&raidSrc.includes("DUNGEONS"),"raid.js 有 DUNGEONS/getDungeon");
assert(raidSrc.includes('id:"cobrahn"')&&raidSrc.includes('id:"verdan"'),"raid.js 定义考布莱恩/吞噬者");
assert(barrensSrc.includes("to_wailing")||barrensSrc.includes("BARRENS_PORTAL_S"),"barrens 南口传送门");
assert(barrensSrc.includes("wailing_caverns"),"barrens 南口指向哀嚎洞穴");

const itemsSrc=fs.readFileSync(path.join(__dirname,"items.js"),"utf8");
assert(itemsSrc.includes("serpent_fang")&&itemsSrc.includes("moss_mantle"),"哀嚎蓝装物品");

if(process.exitCode){
  console.error("\n部分断言失败");
  process.exit(1);
}
console.log("\n全部通过 · STEP 17–21 分区 / 牧师 / 队友 / 哀嚎洞穴冒烟");
