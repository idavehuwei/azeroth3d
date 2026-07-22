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
assert(modelsSrc.includes("function buildRogue"),"models.js 导出 buildRogue");
assert(modelsSrc.includes("rogue:")||modelsSrc.includes("rogue:{"),"models.js 有 rogue 人形配方");
assert(talentsSrc.includes("rogue:{"),"talents.js 有 TALENTS.rogue");
assert(talentsSrc.includes('id:"assassination"')&&talentsSrc.includes('id:"subtlety"'),"盗贼天赋双枝 刺杀/敏锐");
assert(coreSrc.includes("backstab")&&coreSrc.includes("sinisterStrike"),"BALANCE.skills 含盗贼技能");
assert(coreSrc.includes("stealth:{aggroMul")||coreSrc.includes("aggroMul:"),"BALANCE.stealth 含 aggroMul");
assert(/fill:[\s\S]*rogue:/.test(coreSrc),"BAL.party.fill 含 rogue");
assert(iconsSrc.includes("backstab(cx)")&&iconsSrc.includes("stealth(cx)")&&iconsSrc.includes("sprint(cx)"),"icons.js 有盗贼图标");
assert(sfxSrc.includes("stealth"),"sfx.js 有 stealth 音效");
assert(html.includes('data-cls="rogue"'),"启程界面有盗贼职业卡");

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
assert(cmpSrc.includes("function recruitCompanion"),"companions.js 有 recruitCompanion");
assert(cmpSrc.includes("function dismissCompanion"),"companions.js 有 dismissCompanion");
assert(cmpSrc.includes("function tickCompanion"),"companions.js 有 tickCompanion");
assert(cmpSrc.includes("const PARTY")||cmpSrc.includes("PARTY="),"companions.js 有 PARTY 小队");
assert(cmpSrc.includes("function formParty"),"companions.js 有 formParty 一键成队");
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
assert(modelsSrc.includes("buildMeleeHumanoid")&&modelsSrc.includes("kodo"),"科多/人形敌对工厂");
assert(html.includes("#questLogBody")&&html.includes("ql-split")&&html.includes("overflow-y:auto"),"L 任务日志左右分栏可滚动");
assert(itemsSrc.includes("quest_sacred_oil")&&itemsSrc.includes("quest_winterhoof_totem")&&itemsSrc.includes("barrens_cleaver")&&itemsSrc.includes("ochre_fang"),"V1-B2 任务物与分区装备");
assert(worldSrc.includes("placeTalkNpc")&&worldSrc.includes("_mulgoreInteractNpcs")&&worldSrc.includes("registerNpcInteract"),"莫高雷 NPC 统一 F 对话注册");
assert((worldSrc.match(/placeTalkNpc\(/g)||[]).length>=24,"莫高雷可对话 NPC≥24");
assert(barrensSrc.includes("barrensWow")&&barrensSrc.includes("CROSSROADS")&&barrensSrc.includes("placeBarrensTalkNpc"),"贫瘠十字路口 POI/NPC 工厂");
const mainSrc=fs.readFileSync(path.join(__dirname,"main.js"),"utf8");
assert(barrensSrc.includes("nearBarrensNpc")&&mainSrc.includes("nearBarrensNpc"),"贫瘠全量 NPC F 提示");
assert(questsSrc.includes('id:"crossroads_trouble"')&&questsSrc.includes("野猪人的威胁")&&questsSrc.includes("darsok"),"贫瘠刺背威胁主线");
assert(questsSrc.includes("mankrik")&&questsSrc.includes("serra")&&questsSrc.includes("lal")&&questsSrc.includes("thom"),"十字路口经典任务 NPC");
assert((barrensSrc.match(/placeBarrensTalkNpc\(/g)||[]).length>=8,"十字路口可对话 NPC≥8");
assert(mainSrc.includes("nearMulgoreNpc"),"主循环用全量 NPC 距离判断 F 提示");
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
assert(raresSrc.includes("centaur_warbringer")||raresSrc.includes("centaurHerald"),"世界 Boss 半人马战争使者");
assert(raresSrc.includes("greyjaw_mulgore")&&raresSrc.includes("ashmane_barrens"),"莫高雷/贫瘠各一只稀有");
assert(coreSrc.includes("centaurHerald")&&coreSrc.includes("rares:"),"BALANCE 含 centaurHerald / rares");
assert(itemsSrc.includes("warbringer_spear")&&itemsSrc.includes("warbringer_plate"),"战争使者掉落物品");
assert(worldSrc.includes("centaurHerald")&&worldSrc.includes("worldBoss"),"world.js 支持世界 Boss 类型");
assert(barrensSrc.includes("spawnRaresForZone"),"barrens.js 挂接稀有表");
const mapSrc=fs.readFileSync(path.join(__dirname,"map.js"),"utf8");
assert(mapSrc.includes("getRareMapEntries")||mapSrc.includes("m.rare"),"map.js 稀有点走 rare 标记");
assert(mapSrc.includes("Math.PI-")&&mapSrc.includes("playerMapFace"),"小地图箭头对齐角色面向");
assert(coreSrc.includes("miniRadius:")||mapSrc.includes("miniRadius"),"小地图本地视野半径");
assert(mapSrc.includes("collectNearbyMobs")&&mapSrc.includes("drawQuestMark"),"小地图含野怪与任务标记");
assert(mapSrc.includes("血蹄村")&&mapSrc.includes("纳拉其营地")&&mapSrc.includes("乱风岗")&&mapSrc.includes("十字路口"),"小地图可见莫高雷经典地标");

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
assert(mainSrc.includes("mouselook")&&mainSrc.includes("strafe")&&mainSrc.includes("keys.q"),"魔兽式 A/D 转向 · Q/E 平移");
assert(mainSrc.includes("recenterSpd")||mainSrc.includes("yawOff"),"前进回正视角");
assert(combatSrc.includes("camApplyDrag")||combatSrc.includes("S.cam.lmb"),"左键环绕 / 右键转向");
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
assert(modelsSrcA1.includes("userData={legs")||modelsSrcA1.includes("legs,"),"buildQuadruped 导出腿枢轴");
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

if(process.exitCode){
  console.error("\n部分断言失败");
  process.exit(1);
}
console.log("\n全部通过 · STEP 17–29 … / V1 · plan-V2 R0–R5 冒烟");
