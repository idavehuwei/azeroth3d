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

/* plan-V3 · C0 文本数据化 */
const stringsSrc=fs.readFileSync(path.join(__dirname,"js/sim/strings.js"),"utf8");
assert(html.includes('src="js/sim/strings.js"'),"game.html 加载 strings.js");
assert(stringsSrc.includes("const NAMES=")&&stringsSrc.includes("const TEXTS=")&&stringsSrc.includes("function T("),"strings.js 导出 NAMES/TEXTS/T");
assert(stringsSrc.includes("赤蹄草甸")&&stringsSrc.includes("炽心熔窟")&&stringsSrc.includes("卡尔戈"),"C0 原创名在 strings.js");
assert(stringsSrc.includes("火裔")&&stringsSrc.includes("熔渊之柄")&&stringsSrc.includes("蹄人"),"C0 火裔/熔渊之柄/蹄人");
(function(){
  const vm=require("vm");
  const ctx={console};
  vm.runInNewContext(stringsSrc,ctx);
  assert(typeof ctx.T==="function"&&ctx.T("zone.mulgore")==="赤蹄草甸","T('zone.mulgore') 可用");
  assert(ctx.T("boss.ragnaros_short")==="卡尔戈"&&ctx.T("mob.flame_spawn")==="火裔","Boss/小怪名走 T()");
  assert(ctx.T("item.sulfuras_haft")==="熔渊之柄","橙武名走 T()");
})();
const proprietary=/莫高雷|熔火之心|拉戈斯|萨弗拉斯|烈焰之子|牛头人|哀嚎洞穴|怒焰裂谷|奥妮克希亚|考布莱恩|玛格曼达/;
for(const f of ["world.js","raid.js","quests.js","items.js","map.js","game.html","core.js","deeds.js"]){
  const src=fs.readFileSync(path.join(__dirname,f),"utf8");
  assert(!proprietary.test(src),"C0 无旧专有名词字面量: "+f);
}

/* STEP 19 牧师冒烟 */
const combatSrc=fs.readFileSync(path.join(__dirname,"combat.js"),"utf8");
assert(combatSrc.includes("priest:{"),"combat.js 有 CLASSES.priest");
assert(combatSrc.includes("function powerWordShield"),"combat.js 有 powerWordShield");
assert(combatSrc.includes("function applyHeal"),"combat.js 有 applyHeal");
assert(combatSrc.includes("S.p.absorb"),"combat.js 使用 S.p.absorb 吸收盾");
assert(combatSrc.includes("applyAbsorbShield")||/S\.p\.absorb\s*>\s*0/.test(combatSrc),"hitEntity(incoming) 先扣吸收盾");
assert(combatSrc.includes("incoming:true")||combatSrc.includes("opts.incoming"),"hitEntity 支持 incoming 受击");
assert(combatSrc.includes("applyAbsorb:true"),"playerHit 经 hitEntity 走吸收盾");
assert(!/S\.p\.hp\s*-=/.test(combatSrc),"玩家扣血不直接 S.p.hp-=");
assert(combatSrc.includes("applyEntityHpDamage"),"hitEntity 扣血走 applyEntityHpDamage");

const modelsSrc=fs.readFileSync(path.join(__dirname,"models.js"),"utf8");
assert(modelsSrc.includes("function buildPriest"),"models.js 导出 buildPriest");
assert(modelsSrc.includes("priest:")||modelsSrc.includes("HUMANOIDS.priest")||modelsSrc.includes("priest:{"),"models.js 有 priest 人形配方");

const talentsSrc=fs.readFileSync(path.join(__dirname,"talents.js"),"utf8");
assert(talentsSrc.includes("priest:{"),"talents.js 有 TALENTS.priest");
assert(talentsSrc.includes('id:"holy"')&&talentsSrc.includes('id:"discipline"'),"牧师天赋双枝 神圣/戒律");

const balSrc=fs.readFileSync(path.join(__dirname,"js/sim/balance.js"),"utf8");
const coreSrc=fs.readFileSync(path.join(__dirname,"core.js"),"utf8")+balSrc;
assert(coreSrc.includes("powerWordShield"),"BALANCE.skills 含 powerWordShield");
assert(coreSrc.includes("flashHeal")&&coreSrc.includes("smite"),"BALANCE.skills 含 flashHeal/smite");
assert(coreSrc.includes("renew:")&&combatSrc.includes("castRenew")&&combatSrc.includes('bal:"renew"'),"牧师恢复术 HoT");
assert(fs.readFileSync(path.join(__dirname,"js/sim/content.js"),"utf8").includes('name:"恢复"'),"SIM_CONTENT.auras.renew");
assert(fs.existsSync(path.join(__dirname,"js/sim/balance.js")),"js/sim/balance.js 存在");
assert(html.includes('src="js/sim/balance.js"'),"game.html 加载 balance.js");
assert(html.includes('src="js/sim/rules.js"'),"game.html 加载 rules.js");
assert(html.includes('src="js/sim/auras.js"'),"game.html 加载 auras.js");
assert(fs.existsSync(path.join(__dirname,"js/sim/auras.js")),"js/sim/auras.js 存在");
assert(fs.existsSync(path.join(__dirname,"test_auras.js")),"test_auras.js 存在");
assert(combatSrc.includes("applyCorruptionToTarget")||combatSrc.includes("corruption"),"combat 含腐蚀 DoT 入口");
assert(combatSrc.includes("applyAura")&&fs.readFileSync(path.join(__dirname,"main.js"),"utf8").includes("tickAuras"),"光环施加与推进接线");
assert(html.includes('src="js/ui/static-strings.js"'),"game.html 加载 static-strings.js");
assert(fs.existsSync(path.join(__dirname,"scripts/lint-sim.sh")),"scripts/lint-sim.sh 存在");
assert(fs.existsSync(path.join(__dirname,"package.json")),"package.json 存在");
assert(balSrc.includes("const BAL=BALANCE")&&balSrc.includes("SIM_CONTENT"),"balance.js 导出 BAL 并合并 SIM_CONTENT");
assert(worldSrc.includes("m.view")&&worldSrc.includes("simStats"),"spawnMob 含 view/simStats 分层");
assert(fs.readFileSync(path.join(__dirname,"js/sim/entity.js"),"utf8").includes("function allocEntityId"),"entity.js 导出 allocEntityId");
assert(fs.readFileSync(path.join(__dirname,"js/sim/entity.js"),"utf8").includes("function applyEntityHpDamage"),"entity.js 导出 applyEntityHpDamage");
assert(fs.readFileSync(path.join(__dirname,"js/ui/static-strings.js"),"utf8").includes("function applyStaticUiStrings"),"static-strings 含 applyStaticUiStrings");
assert(!fs.readFileSync(path.join(__dirname,"js/sim/strings.js"),"utf8").includes("document"),"strings.js 无 document");

const iconsSrc=fs.readFileSync(path.join(__dirname,"icons.js"),"utf8");
assert(iconsSrc.includes("holy(cx)")&&iconsSrc.includes("holy_shield(cx)")&&iconsSrc.includes("flash_heal(cx)"),"icons.js 有牧师图标配方");
assert(iconsSrc.includes("renew(cx)"),"icons.js 有恢复术图标");

const sfxSrc=fs.readFileSync(path.join(__dirname,"sfx.js"),"utf8");
assert(sfxSrc.includes("heal")&&sfxSrc.includes("holy"),"sfx.js 有 heal/holy 音效");

assert(html.includes('data-cls="priest"'),"启程界面有牧师职业卡");

/* V1-C1 萨满冒烟 */
assert(combatSrc.includes("shaman:{"),"combat.js 有 CLASSES.shaman");
assert(combatSrc.includes("function placeHealingTotem"),"combat.js 有 placeHealingTotem");
assert(combatSrc.includes("function tickTotems"),"combat.js 有 tickTotems");
assert(combatSrc.includes("function clearAllTotems"),"combat.js 有 clearAllTotems");
assert(combatSrc.includes("function lightningBolt")&&combatSrc.includes("function earthShock"),"combat.js 有闪电箭/大地震击");
assert(modelsSrc.includes("function buildShaman"),"models.js 导出 buildShaman");
assert(modelsSrc.includes("shaman:")||modelsSrc.includes("shaman:{"),"models.js 有 shaman 人形配方");
assert(talentsSrc.includes("shaman:{"),"talents.js 有 TALENTS.shaman");
assert(talentsSrc.includes('id:"enhancement"')&&talentsSrc.includes('id:"restoration"'),"萨满天赋双枝 增强/恢复");
assert(coreSrc.includes("lightningBolt")&&coreSrc.includes("healingTotem"),"BALANCE.skills 含萨满技能");
assert(coreSrc.includes("shaman:")&&coreSrc.includes("totemic_call"),"BALANCE.talents 含 shaman");
assert(/fill:[\s\S]*shaman:/.test(coreSrc),"BAL.party.fill 含 shaman");
assert(iconsSrc.includes("lightning(cx)")&&iconsSrc.includes("totem(cx)")&&iconsSrc.includes("earth_shock(cx)"),"icons.js 有萨满图标");
assert(sfxSrc.includes("lightning"),"sfx.js 有 lightning 音效");
assert(html.includes('data-cls="shaman"'),"启程界面有萨满职业卡");

/* V1-C2 盗贼冒烟 */
assert(combatSrc.includes("rogue:{"),"combat.js 有 CLASSES.rogue");
assert(combatSrc.includes("function stealth")||combatSrc.includes("function enterStealth"),"combat.js 有潜行");
assert(combatSrc.includes("function backstab"),"combat.js 有背刺");
assert(combatSrc.includes("function getPlayerAggroMul"),"combat.js 有 getPlayerAggroMul");
assert(combatSrc.includes("function isBehindTarget"),"combat.js 有背后判定");
assert(combatSrc.includes("function eviscerate")&&combatSrc.includes("spendCombo"),"combat.js 有剔骨终结技");
assert(coreSrc.includes("eviscerate:")||balSrc.includes("eviscerate:"),"BALANCE.skills 含 eviscerate");
assert(html.includes("comboDots"),"HUD 含连击点指示");
assert(modelsSrc.includes("function buildRogue"),"models.js 导出 buildRogue");
assert(modelsSrc.includes("rogue:")||modelsSrc.includes("rogue:{"),"models.js 有 rogue 人形配方");
assert(talentsSrc.includes("rogue:{"),"talents.js 有 TALENTS.rogue");
assert(talentsSrc.includes('id:"assassination"')&&talentsSrc.includes('id:"subtlety"'),"盗贼天赋双枝 刺杀/敏锐");
assert(coreSrc.includes("backstab")&&coreSrc.includes("sinisterStrike"),"BALANCE.skills 含盗贼技能");
assert(coreSrc.includes("stealth:{aggroMul")||coreSrc.includes("aggroMul:"),"BALANCE.stealth 含 aggroMul");
assert(/fill:[\s\S]*rogue:/.test(coreSrc),"BAL.party.fill 含 rogue");
assert(iconsSrc.includes("backstab(cx)")&&iconsSrc.includes("stealth(cx)")&&iconsSrc.includes("eviscerate(cx)"),"icons.js 有盗贼图标");
assert(sfxSrc.includes("stealth"),"sfx.js 有 stealth 音效");
assert(html.includes('data-cls="rogue"'),"启程界面有盗贼职业卡");

/* 术士冒烟 */
assert(combatSrc.includes("warlock:{"),"combat.js 有 CLASSES.warlock");
assert(combatSrc.includes("function shadowBolt")&&combatSrc.includes("function castCorruption"),"combat.js 有暗影箭/腐蚀术");
assert(combatSrc.includes("function drainLifeTick")&&combatSrc.includes("function lifeTap"),"combat.js 有生命吸取/生命分流");
assert(combatSrc.includes("channelTick")&&combatSrc.includes("prepaid"),"combat 引导技能预付与周期跳");
assert(modelsSrc.includes("function buildWarlock"),"models.js 导出 buildWarlock");
assert(modelsSrc.includes("warlock:")||modelsSrc.includes("warlock:{"),"models.js 有 warlock 人形配方");
assert(talentsSrc.includes("warlock:{"),"talents.js 有 TALENTS.warlock");
assert(talentsSrc.includes('id:"affliction"')&&talentsSrc.includes('id:"destruction"'),"术士天赋双枝 痛苦/毁灭");
assert(coreSrc.includes("shadowBolt")&&coreSrc.includes("drainLife")&&coreSrc.includes("lifeTap"),"BALANCE.skills 含术士技能");
assert(coreSrc.includes("warlock:")&&coreSrc.includes("improved_corr"),"BALANCE.talents 含 warlock");
assert(/fill:[\s\S]*warlock:/.test(coreSrc),"BAL.party.fill 含 warlock");
assert(iconsSrc.includes("shadow_bolt(cx)")&&iconsSrc.includes("drain_life(cx)")&&iconsSrc.includes("life_tap(cx)"),"icons.js 有术士图标");
assert(iconsSrc.includes("portrait_warlock"),"icons.js 有术士肖像");
assert(sfxSrc.includes("shadow"),"sfx.js 有 shadow 音效");
assert(html.includes('data-cls="warlock"'),"启程界面有术士职业卡");

/* plan-v4 STEP 23 · 牧师/盗贼/术士子系统压测冒烟 */
assert(combatSrc.includes("castRenew")&&combatSrc.includes("applyAura(S.p,\"renew\""),"牧师 HoT 走 auras");
assert(combatSrc.includes("isBehindTarget")&&combatSrc.includes("背刺必须位于目标背后"),"盗贼背刺背后门禁");
assert(combatSrc.includes("spendComboPoints")||fs.readFileSync(path.join(__dirname,"js/sim/resources.js"),"utf8").includes("spendComboPoints"),"连击点消费 API");
assert(combatSrc.includes("channelTick")&&combatSrc.includes("drainLifeTick"),"术士引导吸血");
assert(combatSrc.includes("function skillRank")&&balSrc.includes("ranks:["),"法术 ranks 升阶");
assert(fs.readFileSync(path.join(__dirname,"panels.js"),"utf8").includes("Rank")||fs.readFileSync(path.join(__dirname,"panels.js"),"utf8").includes("skillRank"),"法术书展示 Rank");

/* 德鲁伊冒烟 */
assert(combatSrc.includes("druid:{"),"combat.js 有 CLASSES.druid");
assert(combatSrc.includes("function wrath")&&combatSrc.includes("function castMoonfire"),"combat.js 有愤怒/月火");
assert(combatSrc.includes("function castRejuvenation")&&combatSrc.includes("function entanglingRoots"),"combat.js 有回春/纠缠根须");
assert(combatSrc.includes("bindDruidSkills"),"combat 德鲁伊技能惰性挂接");
assert(modelsSrc.includes("function buildDruid"),"models.js 导出 buildDruid");
assert(modelsSrc.includes("druid:")||modelsSrc.includes("druid:{"),"models.js 有 druid 人形配方");
assert(talentsSrc.includes("druid:{"),"talents.js 有 TALENTS.druid");
assert(talentsSrc.includes('id:"balance"')&&talentsSrc.includes('id:"restoration"'),"德鲁伊天赋双枝 平衡/恢复");
assert(coreSrc.includes("wrath")&&coreSrc.includes("moonfire")&&coreSrc.includes("rejuvenation")&&coreSrc.includes("entanglingRoots"),"BALANCE.skills 含德鲁伊技能");
assert(coreSrc.includes("druid:")&&coreSrc.includes("improved_moon"),"BALANCE.talents 含 druid");
assert(/fill:[\s\S]*druid:/.test(coreSrc),"BAL.party.fill 含 druid");
assert(iconsSrc.includes("wrath(cx)")&&iconsSrc.includes("moonfire(cx)")&&iconsSrc.includes("rejuvenation(cx)"),"icons.js 有德鲁伊图标");
assert(iconsSrc.includes("portrait_druid"),"icons.js 有德鲁伊肖像");
assert(sfxSrc.includes("nature"),"sfx.js 有 nature 音效");
assert(html.includes('data-cls="druid"'),"启程界面有德鲁伊职业卡");

/* 圣骑士冒烟 */
assert(combatSrc.includes("paladin:{"),"combat.js 有 CLASSES.paladin");
assert(combatSrc.includes("function crusaderStrike")&&combatSrc.includes("function judgement"),"combat.js 有十字军打击/审判");
assert(combatSrc.includes("function holyLight")&&combatSrc.includes("function divineShield"),"combat.js 有圣光术/圣盾术");
assert(combatSrc.includes("bindPaladinSkills"),"combat 圣骑士技能惰性挂接");
assert(modelsSrc.includes("function buildPaladin"),"models.js 导出 buildPaladin");
assert(modelsSrc.includes("paladin:")||modelsSrc.includes("paladin:{"),"models.js 有 paladin 人形配方");
assert(talentsSrc.includes("paladin:{"),"talents.js 有 TALENTS.paladin");
assert(talentsSrc.includes('id:"retribution"')&&talentsSrc.includes('id:"holy"'),"圣骑士天赋双枝 惩戒/神圣");
assert(coreSrc.includes("crusaderStrike")&&coreSrc.includes("judgement")&&coreSrc.includes("holyLight")&&coreSrc.includes("divineShield"),"BALANCE.skills 含圣骑士技能");
assert(coreSrc.includes("paladin:")&&coreSrc.includes("improved_judge"),"BALANCE.talents 含 paladin");
assert(/fill:[\s\S]*paladin:/.test(coreSrc),"BAL.party.fill 含 paladin");
assert(iconsSrc.includes("crusader(cx)")&&iconsSrc.includes("judgement(cx)")&&iconsSrc.includes("divine_shield(cx)"),"icons.js 有圣骑士图标");
assert(iconsSrc.includes("portrait_paladin"),"icons.js 有圣骑士肖像");
assert(html.includes('data-cls="paladin"'),"启程界面有圣骑士职业卡");

/* V1-C3 Buff / Debuff 条冒烟 */
const buffsSrc=fs.readFileSync(path.join(__dirname,"buffs.js"),"utf8");
assert(buffsSrc.includes("function applyBuff"),"buffs.js 有 applyBuff");
assert(buffsSrc.includes("function tickBuffs"),"buffs.js 有 tickBuffs");
assert(buffsSrc.includes("function renderBuffHud"),"buffs.js 有 renderBuffHud");
assert(buffsSrc.includes("power_word_shield")&&buffsSrc.includes("weakness")&&buffsSrc.includes("fear"),"buffs.js 含盾/虚弱/恐惧");
assert(buffsSrc.includes("whetstone")&&buffsSrc.includes("eating"),"buffs.js 含磨刀石/进食");
assert(html.includes('src="buffs.js"'),"game.html 加载 buffs.js");
assert(html.includes('id="buffRow"'),"game.html 有 #buffRow HUD");
assert(iconsSrc.includes("weakness(cx)")&&iconsSrc.includes("fear(cx)"),"icons.js 有虚弱/恐惧图标");
assert(fs.readFileSync(path.join(__dirname,"main.js"),"utf8").includes("tickBuffs"),"main.js 调用 tickBuffs");

/* V1-C4 技能 Rank 冒烟 */
assert(coreSrc.includes("skillRank:")&&coreSrc.includes("ranks:["),"BALANCE 含 skillRank / ranks");
assert(combatSrc.includes("function getSkillBal")&&combatSrc.includes("function skillRank"),"combat.js 有 getSkillBal/skillRank");
assert(!/BAL\.skills\.[A-Za-z]+/.test(combatSrc.replace(/function getSkillBal[\s\S]*?function useSkill/,"")),"combat 技能取值走 getSkillBal（声明内除外）");
assert(fs.readFileSync(path.join(__dirname,"panels.js"),"utf8").includes("Rank ${rk}")||fs.readFileSync(path.join(__dirname,"panels.js"),"utf8").includes("Rank "),
  "法术书面板显示 Rank");
assert(coreSrc.includes("heroicStrike:{ranks:"),"heroicStrike 使用 ranks 表");
/* 无头：Lv1=R1 · Lv8=R2 · Lv14=R3 */
(function(){
  assert(/unlock:\s*\[\s*1\s*,\s*8\s*,\s*14\s*\]/.test(coreSrc),"默认解锁 1/8/14");
  const hs=coreSrc.match(/heroicStrike:\{ranks:\[([\s\S]*?)\]\}/);
  assert(hs&&(hs[1].match(/minLevel:/g)||[]).length>=3,"heroicStrike 至少 3 档 Rank");
})();

/* STEP 20 AI 队友冒烟 */
const cmpSrc=fs.readFileSync(path.join(__dirname,"companions.js"),"utf8");
assert(cmpSrc.includes('shaman:"同伴')||cmpSrc.includes('shaman:"同伴 ·'),"companions.js 有萨满同伴名");
assert(cmpSrc.includes('rogue:"同伴')||cmpSrc.includes("rogue:\"同伴"),"companions.js 有盗贼同伴名");
assert(cmpSrc.includes('warlock:"同伴')||cmpSrc.includes("warlock:\"同伴"),"companions.js 有术士同伴名");
assert(cmpSrc.includes('druid:"同伴')||cmpSrc.includes("druid:\"同伴"),"companions.js 有德鲁伊同伴名");
assert(cmpSrc.includes('paladin:"同伴')||cmpSrc.includes("paladin:\"同伴"),"companions.js 有圣骑士同伴名");
assert(cmpSrc.includes("function recruitCompanion"),"companions.js 有 recruitCompanion");
assert(cmpSrc.includes("function dismissCompanion"),"companions.js 有 dismissCompanion");
assert(cmpSrc.includes("function tickCompanion"),"companions.js 有 tickCompanion");
assert(cmpSrc.includes("const PARTY")||cmpSrc.includes("PARTY="),"companions.js 有 PARTY 小队");
assert(cmpSrc.includes("function formParty"),"companions.js 有 formParty 一键成队");
assert(cmpSrc.includes("hitEntity(")&&cmpSrc.includes("incoming:true"),"companionHit 走 hitEntity(incoming)");
assert(!/c\.hp\s*-=/.test(cmpSrc),"队友扣血不直接 c.hp-=");
assert(cmpSrc.includes("FOLLOW")&&cmpSrc.includes("COMBAT")&&cmpSrc.includes("HEAL")&&cmpSrc.includes("RETREAT"),"同伴状态机含 FOLLOW/COMBAT/HEAL/RETREAT");
assert(cmpSrc.includes("disposeCompanionMesh"),"解散有 disposeCompanionMesh");
assert(html.includes('src="companions.js"'),"game.html 加载 companions.js");
assert(html.includes("partyFrame")||html.includes("cmpFrame"),"game.html 有队伍/同伴 HUD");
assert(coreSrc.includes("companion:{")||coreSrc.includes("companion:"),"BALANCE 含 companion 表");
assert(coreSrc.includes("party:")&&coreSrc.includes("xpMul"),"BALANCE 含 party 小队表");
assert(combatSrc.includes("getFocusTarget")&&combatSrc.includes("currentTarget"),"combat.js 有集火目标 API");
assert(combatSrc.includes("partyAliveCount")||combatSrc.includes("BAL.party"),"combat.js 小队经验加成");

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

/* STEP 22 任务枢纽冒烟 */
const questsSrc=fs.readFileSync(path.join(__dirname,"quests.js"),"utf8");
assert(html.includes('src="quests.js"'),"game.html 加载 quests.js");
assert(questsSrc.includes("const QUESTS=")&&questsSrc.includes('id:"elder_boars"'),"quests.js 有 QUESTS 注册表");
assert(questsSrc.includes("QUEST_DB"),"C9 QUEST_DB 别名");
assert(coreSrc.includes("activeMax:10")&&questsSrc.includes("countActiveQuests"),"C9 同时任务上限");
assert(questsSrc.includes('kind==="giver"')&&questsSrc.includes('kind==="turnin"'),"任务地图可标记接取/交还 NPC");
assert(html.includes("mapTabs")&&html.includes('data-map-tab="zone"')&&html.includes('data-map-tab="world"'),"地图面板区域/世界 Tab");
assert(fs.readFileSync(path.join(__dirname,"map.js"),"utf8").includes("setMapPanelTab")&&fs.readFileSync(path.join(__dirname,"map.js"),"utf8").includes("drawZoneMapPanel"),"区域地图绘制 API");
assert(questsSrc.includes("normalizeObjectiveType")&&questsSrc.includes("interact"),"C9 目标别名/interact");
assert(questsSrc.includes("npcHasQuestOfferLowLevel")&&questsSrc.includes("applyNpcQuestMarkerVisual"),"C9 灰色感叹号");
assert(questsSrc.includes("tryQuestGroundInteract")&&questsSrc.includes("spawnQuestGroundForQuest"),"C9 地面闪光物");
assert(questsSrc.includes("openQuestRewardChoice"),"C9 职业自选奖励");
assert(questsSrc.includes("setQuestMapFocus"),"C9 日志地图标记 API");
assert(questsSrc.includes('id:"camp_cache"'),"C9 样例任务 camp_cache");
assert(questsSrc.includes('id:"crossroads_trouble"')&&questsSrc.includes('id:"ragnaros_whisper"'),"主线贯通三章 id");
assert(questsSrc.includes("function acceptQuest")&&questsSrc.includes("function turnInQuest"),"quests.js 有接交 API");
assert(questsSrc.includes("function onQuestMobKill")&&questsSrc.includes("function onQuestBossKill"),"quests.js 有击杀钩子");
assert(questsSrc.includes("function getQuestLogEntries")&&questsSrc.includes("function collectQuestSave"),"quests.js 有日志与存档");
assert(questsSrc.includes("function applyQuestSave")&&questsSrc.includes("function syncLegacyQuestAliases"),"quests.js 有读档迁移");
assert(coreSrc.includes("side:")&&coreSrc.includes("plains_patrol"),"BALANCE.quest.side 支线奖励表");
assert(questsSrc.includes('type:"deliver"')&&questsSrc.includes('type:"use"')&&questsSrc.includes('type:"arrive"')&&questsSrc.includes('type:"escort"'),"V1-B2 四类新目标");
assert(coreSrc.includes("function makeNameplate")&&coreSrc.includes("function updateNameplateHp"),"姓名板工厂");
assert(coreSrc.includes("camera:")&&coreSrc.includes("turnSpd"),"BALANCE.camera 转向/视角");
assert(coreSrc.includes("level:3")||coreSrc.includes("boar    :{level:"),"野怪含 level");
assert(html.includes("Q/E 平移")||html.includes("A/D 转向"),"操作提示含魔兽式键位");
assert(questsSrc.includes("function tickQuestWorld")&&questsSrc.includes("function onQuestUseItem"),"V1-B2 到达/使用/护送 API");
assert(questsSrc.includes("flags:")&&questsSrc.includes("collectQuestSave"),"任务存档含 flags");
assert(coreSrc.includes("radius:368")||coreSrc.includes("radius:352"),"V2 开放区半径再×2");
assert(worldSrc.includes("WORLD_R=352")||worldSrc.includes("WORLD_R = 352"),"莫高雷 WORLD_R×2→352");
assert(worldSrc.includes("BLOODHOOF")&&worldSrc.includes("REDROCK_LAKE")&&worldSrc.includes("CAMP_NARACHE"),"血蹄村/石牛湖/纳拉其常量");
assert(worldSrc.includes("MULGORE")&&worldSrc.includes("mulgoreWow")&&worldSrc.includes("*.82"),"经典莫高雷坐标映射铺满");
assert(worldSrc.includes("palemane")&&worldSrc.includes("windfury")&&worldSrc.includes("baeldun"),"莫高雷分区怪种");
const creaturesSrcEarly=fs.readFileSync(path.join(__dirname,"creatures.js"),"utf8");
assert(creaturesSrcEarly.includes("buildMeleeHumanoid")&&creaturesSrcEarly.includes("kodo"),"科多/人形敌对工厂");
assert(html.includes("#questLogBody")&&html.includes("ql-split")&&html.includes("overflow-y:auto"),"L 任务日志左右分栏可滚动");
assert(itemsSrc.includes("quest_sacred_oil")&&itemsSrc.includes("quest_winterhoof_totem")&&itemsSrc.includes("barrens_cleaver")&&itemsSrc.includes("ochre_fang"),"V1-B2 任务物与分区装备");
assert(worldSrc.includes("placeTalkNpc")&&worldSrc.includes("_mulgoreInteractNpcs")&&worldSrc.includes("registerNpcInteract"),"莫高雷 NPC 统一 F 对话注册");
assert((worldSrc.match(/placeTalkNpc\(/g)||[]).length>=24,"莫高雷可对话 NPC≥24");
assert(barrensSrc.includes("barrensWow")&&barrensSrc.includes("CROSSROADS")&&barrensSrc.includes("placeBarrensTalkNpc"),"贫瘠十字路口 POI/NPC 工厂");
const mainSrc=fs.readFileSync(path.join(__dirname,"main.js"),"utf8");

/* plan-V3 · C10 死亡·墓地·尸体跑·进食饮水 */
assert(coreSrc.includes("ghostSpeedMul")&&coreSrc.includes("respawnResPct")&&coreSrc.includes("weaknessStatMul"),"BALANCE.death 含灵魂/虚弱参数");
assert(coreSrc.includes("fallSafe")&&coreSrc.includes("fallDmgPer"),"BALANCE.move 含摔落参数");
assert(coreSrc.includes("drink:")&&/food:\{[^}]*duration:\s*18/.test(coreSrc),"BALANCE 进食 18s + 饮水");
assert(itemsSrc.includes('use:"drink"')&&itemsSrc.includes("spring_water"),"items 含水饮");
assert(buffsSrc.includes("drinking"),"buffs 含饮水");
assert(raidSrc.includes("enterGhostForm")&&raidSrc.includes("tryResurrectAtCorpse")&&raidSrc.includes("resurrectAtSpiritHealer"),"raid 含灵魂/跑尸/医者复活");
assert(raidSrc.includes("tickGhostWorld")&&raidSrc.includes("spawnCorpseMark"),"raid 含尸体标记与幽灵 tick");
assert(raidSrc.includes("restoreDeathFromSave")&&raidSrc.includes("nearestGraveyardSpawn"),"STEP 17 读档死亡态 + 最近墓地");
assert(coreSrc.includes("corpseWeaknessT")&&coreSrc.includes("swimMul"),"BALANCE 含跑尸短虚弱与游泳");
assert(fs.existsSync(path.join(__dirname,"test_death.js")),"test_death.js 存在");
assert(fs.existsSync(path.join(__dirname,"test_economy.js")),"test_economy.js 存在");
assert(fs.existsSync(path.join(__dirname,"test_quests.js")),"test_quests.js 存在");
assert(fs.existsSync(path.join(__dirname,"test_ui.js")),"test_ui.js 存在");
assert(html.includes("playerAvatar")&&fs.readFileSync(path.join(__dirname,"icons.js"),"utf8").includes("portrait_warrior"),"STEP 20 单位肖像");
assert(combatSrc.includes("showUnitCastBar")&&combatSrc.includes("skillTargetOutOfRange"),"STEP 20 施法条/OOR");
assert(itemsSrc.includes("可与饮水同时")||itemsSrc.includes("可与饮水并行"),"STEP 19 进食可与饮水并行");
assert(questsSrc.includes("byClass")&&(questsSrc.includes('type==="reach"')||questsSrc.includes('"reach"')),"STEP 19 byClass/reach 别名");
assert(coreSrc.includes("weaponsmith")&&coreSrc.includes("camp_shortsword"),"BALANCE 含武器匠货架");
assert(itemsSrc.includes("frayed_cloth")&&itemsSrc.includes("getVendorSell"),"灰装与 vendor 价助手");
assert(worldSrc.includes("武器匠 · 石刃")&&worldSrc.includes("杂货商 · 瓦尔格"),"营地双商人");
assert(html.includes("pGoldHud"),"金币 HUD 右下容器");
assert(combatSrc.includes("formatMoney")&&combatSrc.includes("gainCopper"),"货币 format/gain");
assert(mainSrc.includes("tickGhostWorld")&&mainSrc.includes("fallPeakY")&&mainSrc.includes("S.p.ghost"),"main 驱动幽灵移动/摔落");
assert(mainSrc.includes("playerInWater"),"main 含游泳判定");
assert(fs.readFileSync(path.join(__dirname,"models.js"),"utf8").includes("buildGraveyard"),"models 含墓地石碑");
assert(mainSrc.includes("S.p.drinking")&&combatSrc.includes("cancelConsume"),"进食饮水受击/主循环");
assert(html.includes("ghostBanner")&&html.includes("corpseHint")&&html.includes("ghost-mode"),"HUD 含灵魂横幅/尸体提示/灰阶");
assert(html.includes('id="btnReleaseRaid"')&&/btnReleaseRaid[^>]*>释放灵魂</.test(html),"副本死亡主按钮=释放灵魂");
assert(fs.readFileSync(path.join(__dirname,"save.js"),"utf8").includes("death:{")&&fs.readFileSync(path.join(__dirname,"save.js"),"utf8").includes("restoreDeathFromSave"),"存档含死亡态");
assert(worldSrc.includes("在此复活（虚弱）"),"灵魂医者远程虚弱复活");
assert(worldSrc.includes("registerGraveyard"),"莫高雷注册墓地");

assert(barrensSrc.includes("nearBarrensNpc")&&mainSrc.includes("nearBarrensNpc"),"贫瘠全量 NPC F 提示");
assert(questsSrc.includes('id:"crossroads_trouble"')&&questsSrc.includes('T("mob.quilboar")')&&questsSrc.includes("darsok"),"贫瘠刺背威胁主线");
assert(questsSrc.includes("mankrik")&&questsSrc.includes("serra")&&questsSrc.includes("lal")&&questsSrc.includes("thom"),"十字路口经典任务 NPC");
assert((barrensSrc.match(/placeBarrensTalkNpc\(/g)||[]).length>=8,"十字路口可对话 NPC≥8");
assert(mainSrc.includes("nearMulgoreNpc"),"主循环用全量 NPC 距离判断 F 提示");

/* plan-V3 · C11 野怪 AI · 精英 · 稀有 */
assert(coreSrc.includes("aggro:")&&coreSrc.includes("greySkip")&&coreSrc.includes("perLevelAbove"),"BALANCE.aggro 等级差仇恨");
assert(coreSrc.includes("hpMul:2.3")&&coreSrc.includes("dmgMul:1.5"),"BALANCE.elite C11 倍率");
assert(coreSrc.includes("respawnT:3600")&&coreSrc.includes("worldBossRespawnT:7200"),"BALANCE.rares 小时级刷新");
assert(coreSrc.includes("rareWeights"),"BALANCE.loot 稀有必掉优秀权重");
assert(combatSrc.includes("function getMobAggroRadius"),"combat 有 getMobAggroRadius");
assert(mainSrc.includes("getMobAggroRadius"),"main 主动仇恨走等级差半径");
assert(worldSrc.includes("eliteBaked")||coreSrc.includes("eliteBaked"),"精英手调表标 eliteBaked");
assert(worldSrc.includes("respawnBase")&&worldSrc.includes("hpMul"),"spawnMob 含精英倍率/稀有刷新基线");
assert(itemsSrc.includes("rareWeights")||itemsSrc.includes("m.rare"),"rollMobLoot 稀有权重");
assert(worldSrc.includes("function aggroMob")&&coreSrc.includes("socialR"),"社群拉怪仍在");
assert(coreSrc.includes("aggroR:0")&&mainSrc.includes("getMobAggroRadius"),"中立 aggroR:0 + 半径函数");

assert(questsSrc.includes('id:"elder_boars"')&&questsSrc.includes("开始狩猎")&&questsSrc.includes('id:"mulgore_crisis"')&&questsSrc.includes('id:"bloodhoof_journey"'),"莫高雷经典主线链");
assert(questsSrc.includes("grayhorn")&&questsSrc.includes("windfury_sentinel")&&questsSrc.includes("thunderhorn_guard"),"莫高雷表内 NPC 绑定");
assert(worldSrc.includes("bristleback")&&worldSrc.includes("plainslion")&&worldSrc.includes("waterElement"),"刺背/平原狮/水元素");
assert((questsSrc.match(/chapter:"side", zone:"mulgore"/g)||[]).length>=10,"莫高雷支线≥10");
assert((questsSrc.match(/chapter:"side", zone:"barrens"/g)||[]).length>=10,"贫瘠支线≥10");
assert((questsSrc.match(/chapter:"side", zone:"durotar"/g)||[]).length>=10,"赭岩支线≥10");
assert(combatSrc.includes("quests:{}")||combatSrc.includes("quests:"),"combat S 含 quests 运行时");
const saveSrc=fs.readFileSync(path.join(__dirname,"save.js"),"utf8");
const panelsSrc=fs.readFileSync(path.join(__dirname,"panels.js"),"utf8");
assert(saveSrc.includes("collectQuestSave")&&saveSrc.includes("applyQuestSave"),"save.js 读写 quests");
assert(panelsSrc.includes("getQuestLogEntries"),"panels.js 多条目任务日志");
assert(panelsSrc.includes("标记接取 NPC")&&panelsSrc.includes("标记交还 NPC")&&panelsSrc.includes("进行中")&&panelsSrc.includes("已完成"),"C9 日志分组与地图按钮");
assert(zonesSrc.includes("onQuestZoneEnter"),"zones.js 切入触发区域任务");

/* STEP 23 专业技能冒烟 */
const profSrc=fs.readFileSync(path.join(__dirname,"professions.js"),"utf8");
assert(html.includes('src="professions.js"'),"game.html 加载 professions.js");
assert(profSrc.includes("const MATS=")&&profSrc.includes("const RECIPES="),"professions.js 有材料与配方表");
assert(profSrc.includes("function spawnGatherNodesForZone")&&profSrc.includes("function tryCraft"),"professions.js 有采集/制作 API");
assert(profSrc.includes("function buildWorkbench")&&profSrc.includes("function tickGatherNodes"),"professions.js 有制作台与 tick");
assert(coreSrc.includes("professions:")&&coreSrc.includes("minorPotion")&&coreSrc.includes("whetstone:"),"BALANCE 含 professions / 药水 / 磨刀石");
assert(itemsSrc.includes("minor_potion")&&itemsSrc.includes("whetstone"),"items.js 有制作产出物");
assert(itemsSrc.includes('use:"potion"')&&itemsSrc.includes('use:"whetstone"'),"items.js 有 potion/whetstone 使用");
assert(saveSrc.includes("collectMatsSave")&&saveSrc.includes("applyMatsSave"),"save.js 读写 mats");
assert(worldSrc.includes("buildWorkbench")||worldSrc.includes("spawnGatherNodesForZone"),"world.js 挂接制作台/采集");
assert(barrensSrc.includes("spawnGatherNodesForZone"),"barrens.js 挂接采集点");
assert(combatSrc.includes("mats:{}")||combatSrc.includes("mats:"),"combat S 含 mats");

/* STEP 24 稀有 / 世界 Boss 冒烟 */
const raresSrc=fs.readFileSync(path.join(__dirname,"rares.js"),"utf8");
assert(html.includes('src="rares.js"'),"game.html 加载 rares.js");
assert(raresSrc.includes("const RARES=")&&raresSrc.includes("const WORLD_BOSSES="),"rares.js 有 RARES/WORLD_BOSSES 表");
assert(raresSrc.includes("function spawnRaresForZone")&&raresSrc.includes("function getRareMapEntries"),"rares.js 有 spawn/map API");
assert(raresSrc.includes("respawnT:3600")||raresSrc.includes("respawnT:7200"),"C11 RARES/WORLD_BOSSES 含长刷新");
assert(raresSrc.includes("centaur_warbringer")||raresSrc.includes("centaurHerald"),"世界 Boss 半人马战争使者");
assert(raresSrc.includes("greyjaw_mulgore")&&raresSrc.includes("ashmane_barrens"),"莫高雷/贫瘠各一只稀有");
assert(coreSrc.includes("centaurHerald")&&coreSrc.includes("rares:"),"BALANCE 含 centaurHerald / rares");
assert(itemsSrc.includes("warbringer_spear")&&itemsSrc.includes("warbringer_plate"),"战争使者掉落物品");
assert(worldSrc.includes("centaurHerald")&&worldSrc.includes("worldBoss"),"world.js 支持世界 Boss 类型");
assert(barrensSrc.includes("spawnRaresForZone"),"barrens.js 挂接稀有表");
const mapSrc=fs.readFileSync(path.join(__dirname,"map.js"),"utf8");
assert(mapSrc.includes("getRareMapEntries")||mapSrc.includes("m.rare"),"map.js 稀有点走 rare 标记");

/* plan-V3 · C13 第二区域 + 小地图 + 世界地图 */
assert(zonesSrc.includes("showZoneSplash")||fs.readFileSync(path.join(__dirname,"zones.js"),"utf8").includes("showZoneSplash"),"zones 含区域名淡入");
assert(html.includes("zoneSplash")&&html.includes("zoneSplashName"),"game.html 含 #zoneSplash");
assert(mapSrc.includes("continental")||coreSrc.includes("continental:"),"大陆拼贴布局");
assert(mapSrc.includes("collectGatherBlips")&&mapSrc.includes("ensureTerrainThumb"),"小地图采集光点 + 地形缩略图");
assert(mapSrc.includes("getContinentalTile")||mapSrc.includes("drawWorldMap"),"世界地图多区绘制");
assert(html.includes("worldMapTitle")&&html.includes("ui.world_map"),"世界地图动态标题");
assert(coreSrc.includes("minLevel:6")&&barrensSrc.includes("levelRange:[6,13]"),"C13 贫瘠 6–13 入口/等级带");
assert(coreSrc.includes("miniGather")&&coreSrc.includes("zoneSplash"),"BALANCE.map/zoneSplash C13 参数");

/* plan-V3 · Track E UI 收口 */
assert(html.includes('id="pCastShell"')&&html.includes('id="pCastFill"'),"Track E 玩家施法条 DOM");
assert(html.includes('id="lootPanel"')&&html.includes('id="lootAll"'),"Track E 拾取窗 DOM");
assert(html.includes("fct-miss")&&html.includes("fct-dodge")&&html.includes("fct-parry"),"Track E 飘字分型 CSS");
assert(combatSrc.includes("function beginPlayerCast")&&combatSrc.includes("function tickPlayerCast"),"combat 玩家读条");
assert(combatSrc.includes("function cancelPlayerCast")&&mainSrc.includes("tickPlayerCast"),"读条打断 + main tick");
assert(combatSrc.includes('kind:"miss"')||combatSrc.includes('kind:outcome'),"fct miss/dodge 分型接线");
assert(coreSrc.includes("moveInterrupt")&&coreSrc.includes("panel:true"),"BALANCE.cast / loot.panel");
assert(panelsSrc.includes("function closeTopHudPanel"),"Esc 逐层 closeTopHudPanel");
assert(combatSrc.includes("closeTopHudPanel"),"combat Esc 调 closeTopHudPanel");
assert(itemsSrc.includes("function openLootPanel")&&itemsSrc.includes("function closeLootPanel"),"items 拾取窗 API");
assert(buffsSrc.includes("buffTipHtml")&&buffsSrc.includes("bindTipHtml"),"Buff 金边 tip");

assert(mapSrc.includes("Math.PI-")&&mapSrc.includes("playerMapFace"),"小地图箭头对齐角色面向");
assert(coreSrc.includes("miniRadius:")||mapSrc.includes("miniRadius"),"小地图本地视野半径");
assert(mapSrc.includes("collectNearbyMobs")&&mapSrc.includes("drawQuestMark"),"小地图含野怪与任务标记");
assert(mapSrc.includes('T("poi.bloodhoof")')&&mapSrc.includes('T("poi.camp_narache")')&&mapSrc.includes('T("poi.freewind")')&&mapSrc.includes('T("poi.crossroads")'),"小地图地标走 T() 键");

/* STEP 25 功绩之书冒烟 */
const deedsSrc=fs.readFileSync(path.join(__dirname,"deeds.js"),"utf8");
assert(html.includes('src="deeds.js"'),"game.html 加载 deeds.js");
assert(html.includes('id="deedsPanel"'),"game.html 有功绩面板");
assert(deedsSrc.includes("const DEEDS=")&&deedsSrc.includes("function grantDeed"),"deeds.js 有 DEEDS 与 grantDeed");
assert(deedsSrc.includes("function toggleDeedsPanel")&&deedsSrc.includes("function collectDeedsSave"),"deeds.js 有面板与存档");
assert(deedsSrc.includes("function onDeedMobKill")&&deedsSrc.includes("function onDeedDungeonClear"),"deeds.js 有击杀/副本钩子");
assert(deedsSrc.includes("updatePlayerNameplate"),"deeds.js 有姓名板更新");
assert(combatSrc.includes("toggleDeedsPanel")&&combatSrc.includes("shiftKey"),"combat.js 绑定 Shift+Z");
assert(saveSrc.includes("collectDeedsSave")&&saveSrc.includes("applyDeedsSave"),"save.js 读写 deeds");
assert(worldSrc.includes("onDeedMobKill"),"world.js 挂接功绩击杀");
assert(DEEDS_COUNT_OK(deedsSrc),"DEEDS 条目不少于 15");

/* STEP 27 仇恨与职责冒烟 */
const threatSrc=fs.readFileSync(path.join(__dirname,"threat.js"),"utf8");
assert(mainSrc.includes("getPlayerAggroMul"),"main.js aggro 挂接潜行倍率");
assert(mainSrc.includes("mouselook")||mainSrc.includes("getMoveIntent"),"魔兽式移动意图 / 朝向相对");
assert(mainSrc.includes("strafe")||combatSrc.includes("strafeL"),"Q/E 平移意图");
assert(mainSrc.includes("recenterSpd")||mainSrc.includes("yawOff"),"前进回正视角");
assert(combatSrc.includes("camApplyDrag")||combatSrc.includes("S.cam.lmb"),"左键环绕 / 右键转向");
assert(combatSrc.includes("function getMoveIntent")&&combatSrc.includes("autoRun"),"C1 输入意图 + 自动跑");
assert(combatSrc.includes("_wantJump")||combatSrc.includes('key===" "'),"C1 Space 跳跃键");
assert(coreSrc.includes("move:")&&coreSrc.includes("jumpVel")&&coreSrc.includes("gravity"),"BALANCE.move 跳跃物理");
assert(coreSrc.includes("distMin:")&&coreSrc.includes("firstPersonDist")&&coreSrc.includes("collision")&&coreSrc.includes("yawOffMax"),"BALANCE.camera C1 球坐标/碰撞/第一人称");
assert(mainSrc.includes("resolveCamCollision")&&mainSrc.includes("playerGroundY"),"C1 相机碰撞 + 落地高度");
assert(mainSrc.includes("firstPerson")||mainSrc.includes("firstPersonDist"),"C1 近距第一人称");
assert(combatSrc.includes("touchLook")&&combatSrc.includes("pinch"),"C1 移动端右半屏视角 / 捏合缩放");
assert(combatSrc.includes("clearMoveTarget")&&combatSrc.includes("Escape"),"C1 Esc 取消目标");
/* plan-V3 · C3–C5 sim / 命中表 / 资源 */
assert(fs.existsSync(path.join(__dirname,"js/sim/content.js"))&&fs.existsSync(path.join(__dirname,"js/sim/stats.js")),"C3 sim content/stats");
assert(fs.existsSync(path.join(__dirname,"js/sim/formulas.js"))&&fs.existsSync(path.join(__dirname,"js/sim/resources.js")),"C4/C5 formulas/resources");
assert(fs.existsSync(path.join(__dirname,"js/sim/entity.js"))&&fs.existsSync(path.join(__dirname,"test_formulas.js")),"entity.js + test_formulas.js");
assert(combatSrc.includes("settleDamage")&&combatSrc.includes("initPlayerStats")&&combatSrc.includes("playerResKind"),"combat 接线 C3–C5");
assert(balSrc.includes("BALANCE.sim")||balSrc.includes("SIM_CONTENT")||coreSrc.includes("SIM_CONTENT"),"balance 合并 SIM_CONTENT");
assert(html.includes('src="js/sim/formulas.js"')&&html.includes('src="js/sim/resources.js"'),"game.html 加载 sim 公式/资源");
assert(mainSrc.includes("tickResources")&&mainSrc.includes("minRange"),"main 资源 tick + 远程死区");
/* plan-V3 · C2 目标系统 + 姓名板 + 目标框 */
assert(combatSrc.includes("function resolveSkillTarget")&&combatSrc.includes("function cycleHostileTargets"),"C2 resolveSkillTarget / Tab 循环");
assert(combatSrc.includes("S.currentTarget")&&combatSrc.includes("S.target"),"C2 currentTarget / target 别名");
assert(combatSrc.includes('key==="Tab"')&&combatSrc.includes("nameplatesShowAll"),"C2 Tab 选目标 + V 姓名板全显");
assert(combatSrc.includes('T("combat.no_target")')||combatSrc.includes("你没有目标"),"C2 无目标提示");
assert(coreSrc.includes("target:")&&coreSrc.includes("tabRange")&&coreSrc.includes("threatTint"),"BALANCE.target / nameplate.threatTint");
assert(mainSrc.includes("refreshTargetFrame"),"main.js 每帧刷新目标框");
assert(fs.existsSync(path.join(__dirname,"js/ui/frames.js")),"js/ui/frames.js 存在");
assert(fs.existsSync(path.join(__dirname,"js/ui/target.js")),"js/ui/target.js 存在");
const framesSrc=fs.readFileSync(path.join(__dirname,"js/ui/frames.js"),"utf8");
const targetUiSrc=fs.readFileSync(path.join(__dirname,"js/ui/target.js"),"utf8");
assert(framesSrc.includes("function refreshTargetFrame")&&framesSrc.includes("totFrame"),"frames.js 目标框 + ToT");
assert(targetUiSrc.includes("pickTargetAtScreen")&&targetUiSrc.includes("tryTargetContext"),"target.js 点击/右键选取");
assert(html.includes('id="targetFrame"')&&html.includes('src="js/ui/frames.js"')&&html.includes('src="js/ui/target.js"'),"game.html 目标框 DOM + 脚本");
assert(html.includes("Tab 选目标")&&html.includes("V 姓名板"),"登录提示含 Tab/V");
assert(html.includes("Space 跳跃")&&html.includes("R 自动跑"),"登录提示含跳跃/自动跑");
assert(html.includes('src="threat.js"'),"game.html 加载 threat.js");
assert(threatSrc.includes("function addThreat")&&threatSrc.includes("function getTopThreatActor"),"threat.js 有 addThreat/getTopThreatActor");
assert(threatSrc.includes("function meleeHitFromThreat")&&threatSrc.includes("function checkPartyWipe"),"threat.js 有 meleeHitFromThreat/checkPartyWipe");
assert(threatSrc.includes("function applyTaunt")&&threatSrc.includes("tauntLock"),"threat.js 有嘲讽 applyTaunt/tauntLock");
assert(combatSrc.includes("function taunt")&&combatSrc.includes("function tryInterrupt"),"combat.js 有 taunt/tryInterrupt");
assert(combatSrc.includes('bal:"taunt"'),"战士 4 槽为嘲讽");
assert(raidSrc.includes("function interruptBossCast"),"raid.js 有 interruptBossCast");
assert(coreSrc.includes("taunt:{ranks:")&&coreSrc.includes("interrupt:{ranks:"),"BALANCE 含 taunt/interrupt");
assert(coreSrc.includes("playerTank")&&coreSrc.includes("tauntDur"),"BALANCE.threat 含坦克嘲讽参数");
assert(iconsSrc.includes("taunt(cx)"),"icons.js 有嘲讽图标");
assert(coreSrc.includes("threat:")&&coreSrc.includes("healTankHpPct"),"BALANCE 含 threat 表");
assert(combatSrc.includes("addThreat")&&combatSrc.includes('skillId:"heroicStrike"'),"combat.js 挂接仇恨（英勇打击）");
assert(cmpSrc.includes("healTankHpPct")||cmpSrc.includes("BAL.threat"),"companions.js 治疗走职责优先级");
assert(raidSrc.includes("meleeHitFromThreat"),"raid.js Boss 近战打最高仇恨");
assert(mainSrc.includes("meleeHitFromThreat"),"main.js 野怪近战打最高仇恨");

/* STEP 28 奥妮克希亚巢穴冒烟 */
const onyxiaSrc=fs.readFileSync(path.join(__dirname,"onyxia.js"),"utf8");
assert(html.includes('src="onyxia.js"'),"game.html 加载 onyxia.js");
assert(onyxiaSrc.includes('id:"onyxias_lair"')&&onyxiaSrc.includes("ONYXIA_DUNGEON"),"onyxia.js 注册 onyxias_lair");
assert(onyxiaSrc.includes("buildOnyxiaZone")&&onyxiaSrc.includes("activateRaidBoss"),"onyxia.js 有场景与 Boss 激活");
assert(raidSrc.includes('id:"onyxia"')&&raidSrc.includes('onEnter:"fly"'),"raid.js 定义奥妮克希亚三阶段（飞天）");
assert(raidSrc.includes('onEnter:"land"')&&raidSrc.includes("deepBreath"),"raid.js 有落地/深呼吸");
assert(coreSrc.includes("onyxia:")&&coreSrc.includes("onyxiasLair:")&&coreSrc.includes("onyxiaAdd"),"BALANCE 含奥妮克希亚数值");
assert(coreSrc.includes("onyxia:2200")||coreSrc.includes("onyxia:"),"BALANCE.levels.xp 含 onyxia");
assert(barrensSrc.includes("to_onyxia")&&barrensSrc.includes("BARRENS_PORTAL_E"),"barrens 东口指向奥妮克希亚");
assert(itemsSrc.includes("onyxia_fang")&&itemsSrc.includes("dragonscale"),"奥妮克希亚史诗掉落物品");
const modelsSrc28=fs.readFileSync(path.join(__dirname,"models.js"),"utf8");
assert(modelsSrc28.includes("function buildOnyxia"),"models.js 有 buildOnyxia");
const mapSrc28=fs.readFileSync(path.join(__dirname,"map.js"),"utf8");
assert(mapSrc28.includes("onyxias_lair"),"map.js 有巢穴图层");

/* STEP 29 地下城查找器冒烟 */
const finderSrc=fs.readFileSync(path.join(__dirname,"finder.js"),"utf8");
assert(html.includes('src="finder.js"'),"game.html 加载 finder.js");
assert(html.includes('id="finderPanel"'),"game.html 有查找器面板");
assert(finderSrc.includes("function toggleDungeonFinderPanel"),"finder.js 有 toggle");
assert(finderSrc.includes("function renderDungeonFinderPanel"),"finder.js 有 render");
assert(finderSrc.includes("function queueDungeonFinder"),"finder.js 有 queueDungeonFinder");
assert(finderSrc.includes("formParty")&&finderSrc.includes("enterZone"),"finder.js 组队+传送");
assert(coreSrc.includes("molten_core")&&coreSrc.includes("wailing_caverns")&&coreSrc.includes("onyxias_lair")&&coreSrc.includes("ragefire_chasm"),"四副本均在 BAL.lfg 目录");
assert(coreSrc.includes("lfg:")&&coreSrc.includes('difficulty:"normal"'),"BALANCE 含 lfg 表");
assert(coreSrc.includes("difficulties")&&coreSrc.includes('"heroic"'),"LFG 支持英雄难度");
assert(coreSrc.includes("difficulty:")&&coreSrc.includes("hpMul")&&coreSrc.includes("lootWeights"),"BALANCE.difficulty 英雄倍率表");
assert(finderSrc.includes("setLfgDifficulty")||finderSrc.includes("lfgPick"),"finder 可选难度");
assert(finderSrc.includes("heroic")&&finderSrc.includes("difficulty:S.difficulty"),"finder 进本传 difficulty");
assert(raidSrc.includes("getDifficultyCfg")&&raidSrc.includes("getRaidLootWeights"),"raid 难度倍率 API");
assert(raidSrc.includes("hpMul")&&raidSrc.includes("dmgMul"),"createBoss/spawnAdd 乘难度倍率");
assert(combatSrc.includes('difficulty:"normal"'),"S 含 difficulty 运行时");
assert(combatSrc.includes("toggleDungeonFinderPanel")&&combatSrc.includes('"i"'),"combat.js 绑定 Shift+I");
assert(panelsSrc.includes('"finder"')||panelsSrc.includes("'finder'"),"panels.js closeAllHudPanels 含 finder");
assert(finderSrc.includes("getLfgMinLevel")||finderSrc.includes("minLevel"),"等级门槛检查");

/* plan-v1 · V1-A1 城镇建筑工厂冒烟 */
const modelsSrcA1=fs.readFileSync(path.join(__dirname,"models.js"),"utf8");
assert(modelsSrcA1.includes("function buildHut")&&modelsSrcA1.includes("function buildTent"),"models.js 有 buildHut/buildTent");
assert(modelsSrcA1.includes("function buildFence")&&modelsSrcA1.includes("function buildWatchtower"),"models.js 有 buildFence/buildWatchtower");
assert(modelsSrcA1.includes("BUILD_PAL")&&modelsSrcA1.includes("function placeProp"),"models.js 有 BUILD_PAL/placeProp");
assert(worldSrc.includes("placeMulgoreCampBuildings")||worldSrc.includes("buildHut"),"world.js 莫高雷营地落建筑");
assert(barrensSrc.includes("buildWatchtower")&&barrensSrc.includes("buildHut"),"barrens.js 十字路口用建筑工厂");
assert(!modelsSrcA1.match(/function buildHut[\s\S]*?Math\.random/),"建筑工厂几何不含 Math.random");

/* plan-v1 · V1-A2 图标全面替换冒烟 */
const iconsSrcA2=fs.readFileSync(path.join(__dirname,"icons.js"),"utf8");
assert(iconsSrcA2.includes("whirlwind(cx)")&&iconsSrcA2.includes("ice_block(cx)"),"icons.js 有旋风/寒冰屏障配方");
assert(iconsSrcA2.includes("dungeon(cx)")&&iconsSrcA2.includes("venom(cx)"),"icons.js 有副本/毒液配方");
assert(combatSrc.includes('icon:"sword"')&&combatSrc.includes('icon:"fireball"'),"CLASSES.skills 用配方名非 emoji");
assert(combatSrc.includes("function applySkillBarIcons")&&combatSrc.includes("Icons.get"),"combat 技能栏走 Icons.get");
assert(html.includes('id="skillBar"')&&html.includes('<img class="ic"'),"技能栏槽位为 <img>");
assert(!/<div class="skill"[^>]*>[\s\S]*?<span class="ic">/.test(html),"技能栏无 span.ic emoji");
assert(panelsSrc.includes("Icons.get(sk.icon")||panelsSrc.includes('Icons.get(sk.icon'),"法术书面板用 Icons");
assert(finderSrc.includes("Icons.get(e.icon")||finderSrc.includes("Icons.get("),"查找器标题用 Icons");
assert(deedsSrc.includes("DEED_CAT_ICON")&&deedsSrc.includes("Icons.get"),"功绩面板分类图标用 Icons");
assert(itemsSrc.includes('epic')&&itemsSrc.includes("#a335ee"),"QUALITY.epic 史诗紫边框");
assert(talentsSrc.includes('icon:"frost"')&&talentsSrc.includes('icon:"ice_block"'),"法师霜枝用 frost/ice_block 图标");

/* plan-v1 · V1-A3 生物动画挂点冒烟 */
const animSrc=fs.readFileSync(path.join(__dirname,"anim.js"),"utf8");
assert(html.includes('src="anim.js"'),"game.html 加载 anim.js");
assert(animSrc.includes("function updateMobAnim")&&animSrc.includes("function beginDeathRoll"),"anim.js 有走/死 API");
assert(animSrc.includes("function updateBossWingAnim")&&animSrc.includes("function tickDeathRoll"),"anim.js 有翼拍/侧倒插值");
assert(coreSrc.includes("anim:")&&coreSrc.includes("deathRollSpd")&&coreSrc.includes("wingFlap"),"BALANCE 含 anim 表");
const creaturesSrcA3=fs.readFileSync(path.join(__dirname,"creatures.js"),"utf8");
assert(creaturesSrcA3.includes("userData={")&&creaturesSrcA3.includes("legs"),"buildQuadruped 导出腿枢轴");
assert(modelsSrcA1.includes("wingL")&&modelsSrcA1.includes('kind="dragon"'),"buildOnyxia 有翼挂点");
assert(modelsSrcA1.includes('kind:"humanoid"')||modelsSrcA1.includes("anim:{state"),"人形 userData.anim");
assert(worldSrc.includes("beginDeathRoll")&&worldSrc.includes("resetDeathRoll"),"setCorpse 走死亡插值");
assert(mainSrc.includes("updateMobAnim")&&mainSrc.includes("updateBossWingAnim"),"main.js 驱动 mob/Boss 动画");
assert(raidSrc.includes("beginDeathRoll"),"raid.js addDie/Boss 死亡插值");
assert(cmpSrc.includes("beginDeathRoll")&&cmpSrc.includes("tickDeathRoll"),"同伴死亡侧倒插值");

/* plan-v1 · V1-A4 天气层冒烟 */
const weatherSrc=fs.readFileSync(path.join(__dirname,"weather.js"),"utf8");
assert(html.includes('src="weather.js"'),"game.html 加载 weather.js");
assert(weatherSrc.includes("function setWeather")&&weatherSrc.includes("function updateWeather"),"weather.js 有 set/update");
assert(weatherSrc.includes("function clearWeather")&&weatherSrc.includes("disposeWeatherMesh"),"weather.js 有清理/dispose");
assert(weatherSrc.includes("render-only")||weatherSrc.includes("禁止改"),"weather.js 标明 render-only");
assert(coreSrc.includes("weather:")&&coreSrc.includes("enabled:true")&&coreSrc.includes("dust:"),"BALANCE 含 weather 可关表");
assert(coreSrc.includes('barrens:"dust"')||coreSrc.includes("barrens:\"dust\""),"贫瘠默认沙尘");
assert(zonesSrc.includes("setWeather"),"enterZone 挂接 setWeather");
assert(mainSrc.includes("updateWeather"),"main.js tick 更新天气");
assert(!/aggroR|leashR|dmg\[/.test(weatherSrc),"weather.js 不碰战斗数值");

/* plan-v1 · V1-A5 SFX 扩表 + 材质脚步冒烟 */
assert(sfxSrc.includes("foot_grass")&&sfxSrc.includes("foot_stone")&&sfxSrc.includes("foot_wood"),"脚步草/石/木");
assert(sfxSrc.includes("hit_flesh")&&sfxSrc.includes("hit_shell"),"受击肉体/甲壳");
assert(sfxSrc.includes("breath_fire")&&sfxSrc.includes("breath_poison"),"龙息/毒液音色");
assert(sfxSrc.includes("function playFoot")&&sfxSrc.includes("function playHit"),"SFX.playFoot/playHit");
assert(coreSrc.includes("sfx:")&&coreSrc.includes("footThrottleMs"),"BALANCE.sfx");
assert(mainSrc.includes("zoneFootSurface")&&mainSrc.includes("playFoot"),"main 脚步接线");
assert(combatSrc.includes("playHit"),"hitEntity 受击分层");
assert(raidSrc.includes('sfx:"breath_fire"')&&raidSrc.includes('sfx:"breath_poison"'),"Boss 吐息绑音色");
const rootAudio=fs.readdirSync(__dirname).filter(f=>/\.(mp3|ogg|wav)$/i.test(f));
assert(rootAudio.length===0,"无音频二进制");

/* plan-v1 · V1-B1 赭岩谷冒烟 */
const durotarSrc=fs.readFileSync(path.join(__dirname,"durotar.js"),"utf8");
assert(html.includes('src="durotar.js"'),"game.html 加载 durotar.js");
assert(durotarSrc.includes('id:"durotar"')&&durotarSrc.includes("buildDurotarZone"),"durotar.js 注册并建造");
assert(durotarSrc.includes('targetZone:"barrens"'),"赭岩有回贫瘠门");
assert(barrensSrc.includes("to_durotar")&&barrensSrc.includes("BARRENS_PORTAL_W"),"贫瘠西口→赭岩");
assert(coreSrc.includes("durotar:")&&coreSrc.includes("durotarMinLevel"),"BALANCE 含 durotar / 等级门");
assert(coreSrc.includes("scorp")&&coreSrc.includes("razorback")&&coreSrc.includes("cliffHarpy"),"BALANCE 含巨蝎/刺脊/崖风");
assert(worldSrc.includes("scorp")&&worldSrc.includes("razorback")&&worldSrc.includes("cliffHarpy"),"MOB_TYPES 含赭岩怪");
assert(mapSrc.includes('id:"durotar"')||mapSrc.includes("durotar:{"),"MAP_ZONES 含赭岩谷");
assert(saveSrc.includes('"durotar"')||saveSrc.includes("durotar"),"save 识别 durotar zoneId");
assert(questsSrc.includes("ochre_sting"),"赭岩入口任务");
assert(deedsSrc.includes("enter_durotar"),"进区功绩");

/* plan-v4 STEP 22 · 灰烬峡谷冒烟 */
const ashenSrc=fs.readFileSync(path.join(__dirname,"ashen_canyon.js"),"utf8");
assert(html.includes('src="ashen_canyon.js"'),"game.html 加载 ashen_canyon.js");
assert(ashenSrc.includes('id:"ashen_canyon"')&&ashenSrc.includes("buildAshenZone"),"ashen_canyon.js 注册并建造");
assert(ashenSrc.includes("ASHEN_PORTAL_E")&&ashenSrc.includes("to_mulgore_from_ashen"),"灰烬东口回草甸山口");
assert(ashenSrc.includes("to_hollow_crypt")&&ashenSrc.includes("autoEnter:false"),"西口地穴 stub 不自动进");
assert(worldSrc.includes("PORTAL_ASHEN")&&worldSrc.includes("to_ashen_canyon"),"莫高雷西口山口→灰烬");
assert(coreSrc.includes("ashenCanyon:")&&coreSrc.includes("minLevel:6"),"BALANCE.ashenCanyon 6–12");
assert(coreSrc.includes("ashboar")&&coreSrc.includes("cinderwolf")&&coreSrc.includes("slagimp")&&coreSrc.includes("scorchtusk"),"BALANCE 含灰烬峡谷怪");
assert(worldSrc.includes("ashboar")&&worldSrc.includes("cinderwolf")&&worldSrc.includes("slagimp"),"MOB_TYPES 含灰烬怪");
assert(mapSrc.includes("ashen_canyon"),"MAP_ZONES 含灰烬峡谷");
assert(saveSrc.includes("ashen_canyon"),"save 识别 ashen_canyon");
assert(questsSrc.includes("ash_ember_path")&&questsSrc.includes("crypt_seal"),"灰烬 6 节支线");
assert(deedsSrc.includes("enter_ashen"),"进灰烬功绩");
assert(raresSrc.includes("scorchtusk_ashen")||fs.readFileSync(path.join(__dirname,"rares.js"),"utf8").includes("scorchtusk_ashen"),"稀有焦牙");
assert(stringsSrc.includes("ashen_canyon")||fs.readFileSync(path.join(__dirname,"js/sim/strings.js"),"utf8").includes('ashen_canyon:"灰烬峡谷"'),"strings 含灰烬峡谷");

/* plan-v1 · V1-B3 怒焰裂谷冒烟 */
const ragefireSrc=fs.readFileSync(path.join(__dirname,"ragefire.js"),"utf8");
assert(html.includes('src="ragefire.js"'),"game.html 加载 ragefire.js");
assert(ragefireSrc.includes('id:"ragefire_chasm"')&&ragefireSrc.includes("RAGEFIRE_DUNGEON"),"ragefire.js 注册 ragefire_chasm");
assert(ragefireSrc.includes("buildRagefireZone")&&ragefireSrc.includes("activateRaidBoss"),"ragefire.js 有场景与 Boss 激活");
assert(ragefireSrc.includes("oggleflint")&&ragefireSrc.includes("taragaman"),"怒焰分段含奥格弗林特/塔拉加曼");
assert(raidSrc.includes('id:"oggleflint"')&&raidSrc.includes('id:"taragaman"'),"raid.js 定义怒焰双 Boss");
assert(coreSrc.includes("ragefire:")&&coreSrc.includes("ragefireAdd")&&coreSrc.includes("oggleflint:")&&coreSrc.includes("taragaman:"),"BALANCE 含怒焰数值");
assert(coreSrc.includes("taragaman:1500")||coreSrc.includes("oggleflint:850"),"BALANCE.levels.xp 含怒焰 Boss");
assert(durotarSrc.includes("to_ragefire")&&durotarSrc.includes("DUROTAR_PORTAL_W"),"赭岩西口指向怒焰裂谷");
assert(itemsSrc.includes("rage_blade")&&itemsSrc.includes("ember_band"),"怒焰掉落物品");
assert(mapSrc28.includes("ragefire_chasm"),"map.js 有怒焰图层");
assert(deedsSrc.includes("dungeon_ragefire_clear"),"功绩含怒焰通关");
assert(saveSrc.includes("ragefire_chasm"),"save 识别 ragefire_chasm");

function DEEDS_COUNT_OK(src){
  const m=src.match(/id:"[^"]+"/g)||[];
  /* DEEDS 表内 id 约 18；过滤 DEED_BY_ID 等 */
  return m.filter(s=>/id:"(kill_|rare_|world_|quest_|enter_|dungeon_|boss_|level_|talents_)/.test(s)).length>=15;
}

/* plan-V2 · R0 色板与共享材质工厂 */
assert(html.includes('src="palette.js"'),"game.html 加载 palette.js");
const paletteSrc=fs.readFileSync(path.join(__dirname,"palette.js"),"utf8");
assert(paletteSrc.includes("const PALETTE=")&&paletteSrc.includes("grass"),"palette.js 导出 PALETTE");
assert(paletteSrc.includes("const MAT=")&&paletteSrc.includes("get(key"),"palette.js 导出 MAT.get");
assert(paletteSrc.includes("new THREE.MeshStandardMaterial"),"MeshStandardMaterial 仅应出现在 palette.js 工厂内");
assert(paletteSrc.includes("function disposeMaterial"),"palette.js 导出 disposeMaterial");
const jsFiles=fs.readdirSync(__dirname).filter(f=>f.endsWith(".js")&&f!=="palette.js"&&!f.startsWith("test_"));
let strayMat=0;
for(const f of jsFiles){
  const src=fs.readFileSync(path.join(__dirname,f),"utf8");
  if(src.includes("new THREE.MeshStandardMaterial")){console.error("FAIL: 残留 MeshStandardMaterial →",f);strayMat++;}
}
assert(strayMat===0,"全局无 palette.js 外的 new THREE.MeshStandardMaterial");
assert(modelsSrc.includes("MAT.get")&&worldSrc.includes("heightAt"),"models/world 走 MAT / heightAt");
assert(modelsSrc.includes("PALETTE.grass.dark"),"弓箭手皮甲绿绑定 PALETTE.grass");

/* R0 运行时：MAT 去重（stub THREE） */
(function testMatCache(){
  const THREE={
    FrontSide:0, DoubleSide:2,
    MeshStandardMaterial:function(p){this.userData={};Object.assign(this,p);this.dispose=function(){};},
  };
  const api=new Function("THREE", paletteSrc+"\nreturn {MAT,PALETTE,disposeMaterial};")(THREE);
  const a=api.MAT.get("grass.ground");
  const b=api.MAT.get("grass.ground");
  const c=api.MAT.get("grass.canopy");
  assert(a===b,"MAT.get 同 key 返回同一实例");
  assert(a!==c,"MAT.get 不同 key 不同实例");
  assert(a.userData.sharedMat===true,"MAT 材质标记 sharedMat");
  const before=api.MAT.size();
  api.MAT.get("grass.ground");
  assert(api.MAT.size()===before,"重复 get 不增加缓存");
  const d=api.MAT.get("fur.hide",{roughness:.5});
  assert(d!==api.MAT.get("fur.hide"),"覆写参数产生独立缓存条目");
  api.disposeMaterial(a);
  assert(api.MAT.get("grass.ground")===a,"disposeMaterial 不销毁共享材质");
})();

/* plan-V2 · R1 程序化纹理库 */
assert(html.includes('src="textures.js"'),"game.html 加载 textures.js");
const texSrc=fs.readFileSync(path.join(__dirname,"textures.js"),"utf8");
assert(texSrc.includes("const Tex=")&&texSrc.includes("Tex.get"),"textures.js 导出 Tex");
assert(texSrc.includes("valueNoise")&&texSrc.includes("streaks")&&texSrc.includes("speckle")&&texSrc.includes("cracks"),"textures.js 含底层画笔");
["grass","dirt","rock","bark","leaf","fur","hide","plate","cloth","bone","magma"].forEach(k=>{
  assert(texSrc.includes(k+":"),"textures.js 配方含 "+k);
});
assert(texSrc.includes("SeededRng")&&texSrc.includes('tex:'),"贴图 RNG 走 SeededRng 确定性种子");
assert(texSrc.includes("Tex.bind")&&texSrc.includes("hookMat")||texSrc.includes("MAT.get="),"Tex 挂接到 MAT");
assert(fs.existsSync(path.join(__dirname,"tools","tex_preview.html")),"存在 tools/tex_preview.html");
const preview=fs.readFileSync(path.join(__dirname,"tools","tex_preview.html"),"utf8");
assert(preview.includes("textures.js")&&preview.includes("Tex.keys"),"预览页加载 Tex 并铺开配方");

(function testTexRuntime(){
  function makeCx(c){
    let buf=null;
    const ensure=()=>{if(!buf)buf=new Uint8ClampedArray(c.width*c.height*4);};
    return{
      fillStyle:"#000",strokeStyle:"#000",lineWidth:1,globalAlpha:1,globalCompositeOperation:"source-over",
      lineCap:"butt",lineJoin:"miter",
      fillRect(){ensure();},
      stroke(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},save(){},restore(){},
      createImageData(w,h){return{width:w,height:h,data:new Uint8ClampedArray(w*h*4)};},
      getImageData(){ensure();return{width:c.width,height:c.height,data:new Uint8ClampedArray(buf)};},
      putImageData(img){ensure();buf=new Uint8ClampedArray(img.data);},
      drawImage(){},
    };
  }
  const document={createElement(tag){
    if(tag!=="canvas")return{};
    const c={width:0,height:0};
    c.getContext=()=>makeCx(c);
    return c;
  }};
  const THREE={
    FrontSide:0, DoubleSide:2, RepeatWrapping:1000,
    LinearFilter:1006, LinearMipmapLinearFilter:1008,
    MeshStandardMaterial:function(p){this.userData={};Object.assign(this,p);this.needsUpdate=false;},
    CanvasTexture:function(img){
      this.image=img; this.userData={}; this.needsUpdate=true;
      this.repeat={x:1,y:1,set(a,b){this.x=a;this.y=b;},copy(o){this.x=o.x;this.y=o.y;}};
      this.wrapS=0;this.wrapT=0;this.magFilter=0;this.minFilter=0;this.generateMipmaps=false;
    },
    Vector2:function(x,y){this.x=x;this.y=y;},
  };
  const pal=new Function("THREE", paletteSrc+"\nreturn {MAT,PALETTE};")(THREE);
  const api=new Function(
    "THREE","PALETTE","MAT","WORLD_SEED","SeededRng","hashZoneId","document",
    texSrc+"\nreturn {Tex,MAT};"
  )(THREE,pal.PALETTE,pal.MAT,WORLD_SEED,SeededRng,hashZoneId,document);

  const g1=api.Tex.get("grass");
  const g2=api.Tex.get("grass");
  assert(g1===g2,"Tex.get 同 key 返回同一 CanvasTexture");
  assert(api.Tex.keys().length===11,"Tex 配方数为 11");
  assert(api.Tex.size()<=16,"Tex 缓存纹理数 ≤16（预热后）");
  assert(api.Tex.rough("grass")===null,"grass 不生成 roughnessMap");
  assert(!!api.Tex.rough("rock")&&!!api.Tex.normal("rock"),"rock 有 rough + normal");
  assert(api.Tex.normal("fur")===null,"fur 无 normalMap");
  const mat=api.MAT.get("grass.ground");
  assert(mat.map===api.Tex.get("grass"),"MAT grass.ground 挂上 grass 贴图");
  const rock=api.MAT.get("rock.boulder");
  assert(rock.map&&rock.roughnessMap&&rock.normalMap,"MAT rock.boulder 挂 map/rough/normal");

  /* 确定性：两次独立加载同像素 */
  const apiB=new Function(
    "THREE","PALETTE","MAT","WORLD_SEED","SeededRng","hashZoneId","document",
    texSrc+"\nreturn {Tex};"
  )(THREE,pal.PALETTE,pal.MAT,WORLD_SEED,SeededRng,hashZoneId,document);
  const A=api.Tex.get("bark").image.getContext("2d").getImageData(0,0,api.Tex.SIZE,api.Tex.SIZE).data;
  const B=apiB.Tex.get("bark").image.getContext("2d").getImageData(0,0,apiB.Tex.SIZE,apiB.Tex.SIZE).data;
  let same=A.length===B.length;
  for(let i=0;i<A.length&&same;i++)if(A[i]!==B[i])same=false;
  assert(same,"世界种子固定时贴图像素一致");
})();

/* plan-V2 · R2 高度场地形 */
assert(html.includes('src="terrain.js"'),"game.html 加载 terrain.js");
const terrainSrc=fs.readFileSync(path.join(__dirname,"terrain.js"),"utf8");
assert(terrainSrc.includes("heightAt"),"terrain.js 导出 heightAt");
assert(terrainSrc.includes("buildMulgoreTerrain"),"terrain.js 导出 buildMulgoreTerrain");
assert(terrainSrc.includes("vertexColor")||terrainSrc.includes("vertexColors"),"terrain.js 含顶点着色");
assert(terrainSrc.includes("mesas")&&terrainSrc.includes("pits")&&terrainSrc.includes("roads"),"地形含台地/矿洞/多段路");
assert(worldSrc.includes("buildMulgoreTerrain"),"world.js 使用高度场");
assert(worldSrc.includes("mesas:")&&worldSrc.includes("pits:")&&worldSrc.includes("roads:"),"world 传入经典地貌配置");
assert(!/CircleGeometry\(WORLD_R\+50/.test(worldSrc),"莫高雷不再用大圆盘草皮");
(function testHeightAt(){
  const PALETTE={
    grass:{base:0x6f9e46,dark:0x4a7a2e,light:0x7a9e46},
    dirt:{base:0x9a7a4a,dark:0x6a4a28,light:0xb89060},
    rock:{base:0x8a6a4a,dark:0x5a4028,light:0xa89078},
  };
  const THREE={
    PlaneGeometry:function(){
      this.attributes={position:{
        count:1,_x:[0],_y:[0],_z:[0],
        getX(i){return this._x[i];},getY(i){return this._y[i];},getZ(i){return this._z[i];},
        setY(i,v){this._y[i]=v;},needsUpdate:false
      }};
      this.rotateX=function(){};
      this.setAttribute=function(){};
      this.computeVertexNormals=function(){};
    },
    BufferAttribute:function(){},
    MeshStandardMaterial:function(p){Object.assign(this,p||{});this.userData={};},
    Mesh:function(){this.userData={};this.receiveShadow=false;this.name="";},
    Color:function(){},
  };
  const api=new Function("THREE","WORLD_SEED","hashZoneId","PALETTE",
    terrainSrc+"\nreturn {heightAt,TERRAIN};"
  )(THREE,WORLD_SEED,hashZoneId,PALETTE);
  api.TERRAIN._arm({
    ready:true,
    camp:{x:-36,z:40},
    portalMC:{x:0,z:-344},
    portalBarrens:{x:0,z:344},
    lakes:[{x:-126,z:33,inner:16,outer:34,depth:.7}],
    flats:[
      {x:-36,z:40,inner:34,outer:58},
      {x:-90,z:281,inner:22,outer:40},
      {x:-72,z:-208,inner:28,outer:50},
    ],
    mesas:[
      {x:-72,z:-208,rInner:42,rOuter:72,h:14,cliff:1.65},
      {x:-180,z:208,rInner:48,rOuter:78,h:11,cliff:1.5},
    ],
    pits:[{x:216,z:-26,rInner:10,rOuter:22,depth:5.2}],
    roads:[
      {halfW:5,pts:[{x:-90,z:281},{x:-36,z:40}]},
      {halfW:5.5,pts:[{x:-36,z:40},{x:-72,z:-208},{x:0,z:-344}]},
    ],
    ampLarge:2.6,ampMid:1.1,ampDetail:.32,
  });
  const a=api.heightAt(10,20);
  const b=api.heightAt(10,20);
  assert(a===b,"heightAt 同参数同结果");
  assert(Math.abs(api.heightAt(-36,40))<0.5,"血蹄村掩膜近似压平");
  assert(Math.abs(api.heightAt(0,-344))<0.5,"熔火传送门掩膜近似压平");
  assert(api.heightAt(-72,-208)>8,"雷霆崖台地抬升");
  assert(api.heightAt(216,-26)<-2,"风投矿洞凹陷");
  assert(api.heightAt(-126,33)<0,"石牛湖盆底低于平原");
  const mid=api.heightAt(180,-180);
  assert(Number.isFinite(mid)&&mid>-10&&mid<12,"heightAt 值域合理");
})();

/* plan-V2 · R3 植被 · 水体 · 场景道具 */
assert(html.includes('src="props.js"'),"game.html 加载 props.js");
assert(coreSrc.includes("props:{")&&coreSrc.includes("grassCount:"),"BALANCE.props 草数量");
const propsSrc=fs.readFileSync(path.join(__dirname,"props.js"),"utf8");
assert(propsSrc.includes("InstancedMesh")||propsSrc.includes("buildGrassField"),"props.js 含草丛 InstancedMesh 工厂");
assert(propsSrc.includes("buildPine")&&propsSrc.includes("buildOak"),"props.js 含松/橡工厂");
assert(propsSrc.includes("buildMirrorLake")&&propsSrc.includes("buildCloudField"),"props.js 含镜湖/云");
assert(propsSrc.includes("spawnMulgoreProps")&&propsSrc.includes("updateProps"),"props.js 导出 spawn/update");
assert(worldSrc.includes("spawnMulgoreProps"),"world.js 调用 spawnMulgoreProps");
assert(!worldSrc.includes('MAT.get("water.pond")'),"莫高雷不再用静态 water.pond 圆盘");
assert(modelsSrc.includes("柴堆")||modelsSrc.includes("多层火焰")||modelsSrc.includes("layers"),"营火已升级多层火焰");
assert(modelsSrc.includes("门帘")||modelsSrc.includes("缝线"),"帐篷含细节几何");
assert(mainSrc.includes("updateProps"),"main.js 驱动 props 动画");

/* plan-V2 · R4 天空 · 光照 · 阴影 · 昼夜 */
assert(html.includes('src="sky.js"'),"game.html 加载 sky.js");
assert(coreSrc.includes("sky:{")&&coreSrc.includes("shadowHalf:"),"BALANCE.sky 阴影跟随参数");
assert(coreSrc.includes("dawn:")&&coreSrc.includes("dusk:"),"BALANCE.dayNight 含黎明/黄昏");
const skySrc=fs.readFileSync(path.join(__dirname,"sky.js"),"utf8");
assert(skySrc.includes("render-only")||skySrc.includes("铁律"),"sky.js 标明 render-only 铁律");
assert(skySrc.includes("createSkyDome")&&skySrc.includes("SphereGeometry"),"sky.js 含天空穹顶");
assert(skySrc.includes("configureSunShadow")||skySrc.includes("shadowHalf"),"sky.js 含阴影跟随配置");
assert(skySrc.includes("updateSky")&&skySrc.includes("initZoneSky"),"sky.js 导出 update/init");
assert(skySrc.includes("disposeSky"),"sky.js 有 disposeSky");
assert(worldSrc.includes("initZoneSky"),"world.js 初始化天空");
assert(!/shadow\.camera\.left=-220/.test(worldSrc),"莫高雷不再用 ±220 全图阴影");
assert(mainSrc.includes("updateSky"),"main.js 驱动 updateSky");
assert(!mainSrc.includes("scn.background=skyCol"),"main 不再直接写 background Color 昼夜");

/* plan-V2 · R5 人形骨架 · Anim */
assert(html.includes('src="rig.js"'),"game.html 加载 rig.js");
assert(coreSrc.includes("blendDur:"),"BALANCE.anim 含 blendDur");
const rigSrc=fs.readFileSync(path.join(__dirname,"rig.js"),"utf8");
assert(rigSrc.includes("createRigSkeleton")&&rigSrc.includes("assembleHumanoidRig"),"rig.js 含骨架装配");
assert(rigSrc.includes("updateHumanoidAnim")&&rigSrc.includes("Anim"),"rig.js 含 Anim 状态机");
assert(rigSrc.includes("handR")&&rigSrc.includes("forearmR")&&rigSrc.includes("thighL"),"rig 含手肘膝层级");
assert(modelsSrc.includes("assembleHumanoidRig")||modelsSrc.includes("CLASS_LOOK"),"models 走 CLASS_LOOK / rig");
assert(modelsSrc.includes("buildFromClassLook"),"models 导出 buildFromClassLook");
assert(mainSrc.includes("updateHumanoidAnim"),"main.js 驱动人形 Anim");
(function testRigSkeleton(){
  const THREE={
    Group:function(){
      this.children=[];
      this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};
      this.rotation={x:0,y:0,z:0};
      this.userData={}; this.name="";
      this.add=function(c){this.children.push(c);c.parent=this;};
    },
  };
  const BAL={anim:{walkFreq:9,walkAmp:.55,blendDur:.15}};
  const api=new Function("THREE","BAL",rigSrc+"\nreturn {createRigSkeleton,Anim,blendPose};")(THREE,BAL);
  const sk=api.createRigSkeleton({arm:{x:.55,y:2.1},leg:{x:.25,y:.9},build:{height:1}});
  assert(!!sk.hips&&!!sk.chest&&!!sk.head,"骨架含 hips/chest/head");
  assert(!!sk.upperArmR&&!!sk.forearmR&&!!sk.handR,"骨架含右臂三段");
  assert(!!sk.thighL&&!!sk.shinL&&!!sk.footL,"骨架含左腿三段");
  assert(typeof api.Anim.walk==="function"&&typeof api.Anim.idle==="function","Anim.walk/idle 为函数");
  const p0=api.Anim.idle(sk,0,{});
  const p1=api.Anim.walk(sk,1,{phase:1.2,amp:.55});
  assert(p1.thighR&&p1.thighL,"walk 产出大腿姿态");
  assert(p0.head&&p1.upperArmR,"idle/walk 产出上身姿态");
  const blended=api.blendPose(p0,p1,.5);
  assert(blended.thighR&&Number.isFinite(blended.thighR.x),"blendPose 可混合姿态");
})();

/* plan-V2 · R6 生物族群工厂 */
assert(html.includes('src="creatures.js"'),"game.html 加载 creatures.js");
const creaturesSrc=fs.readFileSync(path.join(__dirname,"creatures.js"),"utf8");
assert(creaturesSrc.includes("function buildQuadruped")&&creaturesSrc.includes("function buildElemental"),"creatures 含四足/元素工厂");
assert(creaturesSrc.includes("function buildHumanoidMob")&&creaturesSrc.includes("buildHumanoid"),"人形怪复用 buildHumanoid");
assert(creaturesSrc.includes("MOB_LOOK")&&creaturesSrc.includes("QUADS"),"creatures 含 MOB_LOOK/QUADS 配方");
assert(creaturesSrc.includes("shins")&&creaturesSrc.includes("spine1"),"四足含小腿/脊柱挂点");
assert(creaturesSrc.includes("rocks")&&creaturesSrc.includes("flames"),"元素含碎岩/火焰层");
assert(creaturesSrc.includes("lavabeast")&&creaturesSrc.includes("imp:"),"含熔岩巨兽/小恶魔配方");
assert(!modelsSrc.includes("function buildQuadruped"),"models.js 不再内联 buildQuadruped");
assert(modelsSrc.includes("forearmR")&&modelsSrc.includes("ripple"),"buildBoss 含肘关节/涟漪");
assert(animSrc.includes("updateBossHammerAnim")&&animSrc.includes("quadSide"),"anim 含挥锤三段/四足侧倒");
assert(animSrc.includes("scatter")||animSrc.includes("deathStyle"),"anim 含元素碎散死亡");
assert(coreSrc.includes("bossHammerDecay")&&coreSrc.includes("bossShakeAmp"),"BALANCE.anim 含 Boss 挥锤参数");
assert(mainSrc.includes("updateBossHammerAnim")&&mainSrc.includes("camShake"),"main 驱动挥锤/震屏");
assert(worldSrc.includes('build:()=>buildQuadruped(QUADS.wolf)'),"草原狼仍为配方接线");

/* plan-V2 · R7 战斗表现层 */
assert(html.includes('src="vfx.js"'),"game.html 加载 vfx.js");
const vfxSrc=fs.readFileSync(path.join(__dirname,"vfx.js"),"utf8");
assert(vfxSrc.includes('type:"ground_warn"')&&vfxSrc.includes('type:"projectile"'),"vfx 含 ground_warn/projectile");
assert(vfxSrc.includes('type:"impact"')&&vfxSrc.includes('type:"aura"'),"vfx 含 impact/aura");
assert(vfxSrc.includes("VFX_POOL")&&vfxSrc.includes("function tickVfx"),"vfx 含粒子池与 tickVfx");
assert(vfxSrc.includes("trailLen")||vfxSrc.includes("trailArr"),"projectile 含拖尾");
assert(vfxSrc.includes("uFill")&&vfxSrc.includes("_warnShaderMat"),"ground_warn 含填充 shader");
assert(vfxSrc.includes("pulseHitFlash")&&vfxSrc.includes("attachShieldAura"),"vfx 含受击闪白/护盾");
assert(coreSrc.includes("critChance")&&coreSrc.includes("hit:{dur"),"BALANCE.vfx 含暴击/受击参数");
assert(coreSrc.includes("updateNameplatePresentation")&&coreSrc.includes("eliteBorder"),"姓名板距离/精英描边");
assert(combatSrc.includes("fct-crit")||combatSrc.includes("opts.crit"),"FCT 支持暴击样式");
assert(combatSrc.includes("pulseHitFlash"),"hitEntity 挂受击闪白");
assert(mainSrc.includes("tickVfx")&&mainSrc.includes("updateNameplatePresentation"),"main 驱动 tickVfx/姓名板");
assert(html.includes("bossHpTicks")&&html.includes("fct-crit"),"HUD 含 Boss 刻度与暴击 FCT");
assert(raidSrc.includes("refreshBossHpTicks"),"raid 刷新 Boss 血条刻度");
assert(vfxSrc.includes("eruption_ring")&&vfxSrc.includes("ground_warn"),"喷发预警走 ground_warn");

/* 登录页画面设置（齿轮） */
assert(html.includes("btnGfxGear")&&html.includes("gfxPanel"),"登录页含画面设置齿轮");
assert(coreSrc.includes("GFX_PRESETS")&&coreSrc.includes("applyGraphicsSettings"),"core 含画面预设");
assert(coreSrc.includes("azeroth3d_gfx_v1"),"画面设置独立 localStorage 键");
assert(vfxSrc.includes("rebuildVfxPool")&&vfxSrc.includes("BAL.vfx.trails"),"vfx 尊重拖尾开关/池重建");
assert(saveSrc.includes("wireGraphicsUI"),"save 绑定画面设置 UI");

/* plan-V2 · R8 性能预算与可选后期 */
assert(html.includes('src="debug.js"'),"game.html 加载 debug.js");
const debugSrc=fs.readFileSync(path.join(__dirname,"debug.js"),"utf8");
assert(debugSrc.includes("toggleDebugHud")&&debugSrc.includes("tickDebugHud"),"debug 含面板开关/tick");
assert(debugSrc.includes("getPerfBudget")&&debugSrc.includes("cheat.tp"),"debug 含预算与 cheat.tp");
assert(debugSrc.includes("cheatLevel")&&debugSrc.includes("cheatTime")&&debugSrc.includes("cheatSeed"),"debug 含 level/time/seed");
assert(coreSrc.includes("BAL.perf")||coreSrc.includes("perf:{"),"BALANCE 含 perf 预算表");
assert(coreSrc.includes("shadowMapMobile")&&coreSrc.includes("fakeBloom"),"含移动阴影档与假 Bloom");
assert(coreSrc.includes("isMobileClient")&&coreSrc.includes("effectiveWorldSeed"),"含移动检测/种子覆盖");
assert(skySrc.includes("refreshSunShadows")&&skySrc.includes("shadowMapSizeForDevice"),"sky 含阴影刷新/移动档");
assert(vfxSrc.includes("fakeBloom")&&vfxSrc.includes("BackSide"),"vfx 假 Bloom 外扩壳");
assert(mainSrc.includes("tickDebugHud"),"main 驱动 tickDebugHud");
assert(html.includes("debugHud")||debugSrc.includes("debugHud"),"含 debugHud 面板");
assert(html.includes("gfxBloom"),"登录页含假 Bloom 开关");

/* plan-V2 · G1 图标/掉落/尸体拾取 + 溶解延迟 */
assert(html.includes('src="icons.js"')&&html.includes('src="items.js"'),"game.html 加载 icons/items");
assert(iconsSrc.includes("Icons.canvas")||iconsSrc.includes("canvas("),"icons 含 canvas 工厂");
assert(itemsSrc.includes("function dropLoot")&&itemsSrc.includes("function tryLoot"),"items 含 dropLoot/tryLoot");
assert(itemsSrc.includes("function nearbyDrops")&&itemsSrc.includes("nearbyDrops(R)"),"F 真空拾取 nearbyDrops");
assert(coreSrc.includes("pickupR:5")||balSrc.includes("pickupR:5"),"BALANCE.loot.pickupR=5");
assert(itemsSrc.includes("onLooted"),"dropLoot 支持 onLooted 回调");
assert(worldSrc.includes("requestCorpseDissolve")&&worldSrc.includes("awaitLoot"),"尸体溶解延迟到拾取");
assert(worldSrc.includes("requestCorpseDissolve(m)")||worldSrc.includes("()=>requestCorpseDissolve"),"mobDie 挂 onLooted 溶解");
assert(animSrc.includes("awaitLoot")&&animSrc.includes("requestCorpseDissolve"),"anim 有掉落时不抢先溶解");
assert(raidSrc.includes("awaitLoot")&&raidSrc.includes("requestCorpseDissolve"),"副本小怪同样延迟溶解");

/* plan-V2 · G2 经验与等级 / plan-V3 C6–C7 */
assert(coreSrc.includes("levels:{max:20")||coreSrc.includes("max:20")||coreSrc.includes("maxLevel:20"),"BALANCE.levels.max=20（C6）");
assert(combatSrc.includes("unlock:1")&&combatSrc.includes("isSkillKnown")&&combatSrc.includes("actionBar"),"C7 技能解锁 + actionBar");
assert(combatSrc.includes("notifyNewSpells")&&combatSrc.includes("学会了新法术"),"C7 学会新法术提示");
assert(panelsSrc.includes("draggable")||panelsSrc.includes("spell-tab"),"C7 法术书拖拽/分页");
assert(html.includes(".skill.oor"),"C7 动作条射程着色");
assert(html.includes(".skill.nores"),"C7 动作条资源着色");
assert(html.includes("conic-gradient")&&html.includes("--cd"),"C7 CD 扫描动画");

assert(coreSrc.includes("xpMax:[")&&coreSrc.includes("perLevel:"),"含 xpMax 曲线与 perLevel 成长");
assert(combatSrc.includes("gainMobXP")&&combatSrc.includes("tickRestXp"),"C6 gainMobXP / 休息经验");
assert(html.includes("pXpRest")||html.includes("xpRest"),"经验条休息蓝段");
assert(fs.existsSync(path.join(__dirname,"js/sim/xp.js")),"js/sim/xp.js 存在");
assert(html.includes('src="js/sim/xp.js"'),"game.html 加载 xp.js");
assert(coreSrc.includes("levelUp:")&&coreSrc.includes("burstCount"),"含升级金光参数");
assert(coreSrc.includes("xp:120")||coreSrc.includes("add:{")&&coreSrc.includes("xp:"),"副本小怪 BAL.add 含 xp");
assert(combatSrc.includes("function gainXP")&&combatSrc.includes("updateLevelUI"),"combat 含 gainXP/updateLevelUI");
assert(combatSrc.includes("spawnBurst")&&combatSrc.includes("loot_spark"),"升级金光含 spawnBurst+loot_spark");
assert(html.includes('id="pXp"')||html.includes("id=\"pXp\""),"HUD 含经验条 #pXp");
assert(worldSrc.includes("gainMobXP")||worldSrc.includes("gainXP(m.stats.xp)"),"野怪 onDeath 给经验");
assert(raidSrc.includes("gainXP")&&raidSrc.includes("xpAdd"),"副本小怪 onDeath 给经验");
assert(mainSrc.includes("pXp")||mainSrc.includes("#pXp")||mainSrc.includes("p.xp"),"main 刷新经验条");

/* plan-V2 · G3 背包 / 装备 / 真换装 */
assert(html.includes('id="bag"')||html.includes("id=\"bag\""),"HUD 含背包 #bag");
assert(itemsSrc.includes("EQUIP_SLOTS")&&itemsSrc.includes("function equipItem")&&itemsSrc.includes("function unequipItem"),"items 含装备 API");
assert(itemsSrc.includes("function applyEquipStats")&&itemsSrc.includes("dmgMul")&&itemsSrc.includes("hpMax"),"装备叠加 dmgMul/hpMax");
assert(itemsSrc.includes("function toggleBag")&&itemsSrc.includes("function renderBag"),"含 B 键背包开关/渲染");
assert(itemsSrc.includes("setWeapon(player")&&modelsSrc.includes("function setWeapon"),"主手装备调用 setWeapon");
assert(modelsSrc.includes("userData.weapon")&&modelsSrc.includes("weaponMount"),"setWeapon 替换挂点上的武器组");
assert(rigSrc.includes("handR")&&rigSrc.includes("weaponMount"),"R5 武器挂 handR/handL");
assert(combatSrc.includes('==="b"')||combatSrc.includes("toggleBag()"),"B 键打开背包");
assert(panelsSrc.includes("unequipItem")||panelsSrc.includes("S.eq"),"C 面板可卸装");
assert(coreSrc.includes("bag:{size:")||coreSrc.includes("bag:{"),"BALANCE.bag 背包容量");

/* plan-V3 · C8 装备属性 → 派生 / 纸娃娃 / tip */
assert(itemsSrc.includes('poor')&&itemsSrc.includes('QUALITY')&&itemsSrc.includes("#9d9d9d"),"C8 品质含灰 poor");
assert(itemsSrc.includes('"waist"')&&itemsSrc.includes('"wrist"')&&itemsSrc.includes('"offhand"')&&itemsSrc.includes('"ranged"'),"C8 装备槽含腰腕副手远程");
assert(itemsSrc.includes("equipStats")&&combatSrc.includes("rebuildPlayerStatsFromEquip"),"装备汇入 equipStats → rebuild");
assert(itemsSrc.includes("dmgRange")&&itemsSrc.includes("getPlayerWeaponRange"),"武器 dmgRange / 普攻区间");
assert(itemsSrc.includes("itemTipHtml")&&itemsSrc.includes("力量"),"物品 tip 含属性行");
assert(itemsSrc.includes("当前已装备")&&itemsSrc.includes("beginItemDrag"),"tip 已装备对比 + 拖拽载荷");
assert(panelsSrc.includes("getItemDrag")&&panelsSrc.includes("itemFitsEqSlot"),"人物槽拖放装备校验");
assert(html.includes("bagGold")&&html.includes("bag-title-txt"),"背包金钱条 + 标题结构");
assert(fs.existsSync(path.join(__dirname,"js/ui/tooltip.js")),"js/ui/tooltip.js 存在");
assert(html.includes('src="js/ui/tooltip.js"'),"game.html 加载 tooltip.js");
assert(panelsSrc.includes("攻击强度")&&panelsSrc.includes("wireCharDollRotate"),"纸娃娃显示 AP + 可旋转");
assert(itemsSrc.includes("右键装备")||itemsSrc.includes("contextmenu"),"背包右键装备");
assert(coreSrc.includes("poor:8")||coreSrc.includes("poor:"),"掉落权重含 poor");

/* plan-V2 · G4 野怪 AI / 新怪 / 稀有 */
assert(worldSrc.includes("function aggroMob")&&worldSrc.includes("socialR"),"社群仇恨 aggroMob/socialR");
assert(coreSrc.includes("leash:")&&coreSrc.includes("regenPct"),"脱战回巢 BAL.leash");
assert(worldSrc.includes("QUADS.wolf")||worldSrc.includes("QUADS.bird")||creaturesSrc.includes("wolf:"),"含狼/陆行鸟配方接线");
assert(worldSrc.includes("harpy")&&(worldSrc.includes("greyjaw")||raresSrc.includes("greyjaw")||raresSrc.includes("老灰鬃")),"含鹰身女妖/稀有");
assert(raresSrc.includes("RARES")||raresSrc.includes("spawnRaresForZone"),"rares.js 稀有框架");

/* plan-V2 · G5 程序化音效 */
assert(html.includes('src="sfx.js"'),"game.html 加载 sfx.js");
assert(sfxSrc.includes("SOUNDS")&&sfxSrc.includes("AudioContext"),"sfx 音色表 + WebAudio");
assert(sfxSrc.includes("growl")&&sfxSrc.includes("playHit"),"族群吼叫/受击分层");
assert(worldSrc.includes('SFX.play("growl")')||worldSrc.includes("SFX.play('growl')"),"仇恨播 growl");

/* plan-V2 · G6 副本工厂 + 熔岩巨兽 */
assert(raidSrc.includes("function createBoss")&&raidSrc.includes("defineBoss"),"raid 含 createBoss 工厂");
assert(raidSrc.includes("corridor")&&raidSrc.includes("boss1")&&raidSrc.includes("bridge"),"副本分段 corridor/boss1/bridge");
assert(raidSrc.includes("magmadar")&&raidSrc.includes("lavabeast"),"第二 Boss 熔岩巨兽接线");
assert(creaturesSrc.includes("lavabeast"),"creatures 含 lavabeast 配方");

/* plan-V2 · G7 天赋 + 存档 */
assert(talentsSrc.includes("TALENTS")&&talentsSrc.includes("tier:"),"天赋树含 tier 层级");
assert(html.includes('src="talents.js"')&&html.includes('src="save.js"'),"加载 talents/save");
assert(saveSrc.includes("exportSaveCode")&&saveSrc.includes("importSaveCode"),"Base64 导出/导入");
assert(saveSrc.includes("localStorage")&&saveSrc.includes("collectSaveData"),"纯数据 localStorage 存档");
assert(saveSrc.includes("function saveKeyFor")&&coreSrc.includes("keyPrefix"),"每职业存档键 saveKeyFor");
assert(saveSrc.includes("listClassSaves")&&saveSrc.includes("migrateLegacySave"),"多槽列表与旧档迁移");
assert(saveSrc.includes("saveKeyFor(ck)")&&saveSrc.includes("重新启程"),"新游戏仅清当前职业槽");
assert(html.includes("csave")||html.includes("save-chip"),"职业卡存档徽章 / 继续芯片");
assert(saveSrc.includes("talents")||saveSrc.includes("spent"),"存档含天赋字段");

if(process.exitCode){
  console.error("\n部分断言失败");
  process.exit(1);
}
console.log("\n全部通过 · STEP 17–29 … / V1 · plan-V2 R0–R8 / G1–G7 冒烟");
