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
const mainSrc=fs.readFileSync(path.join(__dirname,"main.js"),"utf8");
assert(html.includes('src="threat.js"'),"game.html 加载 threat.js");
assert(threatSrc.includes("function addThreat")&&threatSrc.includes("function getTopThreatActor"),"threat.js 有 addThreat/getTopThreatActor");
assert(threatSrc.includes("function meleeHitFromThreat")&&threatSrc.includes("function checkPartyWipe"),"threat.js 有 meleeHitFromThreat/checkPartyWipe");
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
assert(coreSrc.includes("molten_core")&&coreSrc.includes("wailing_caverns")&&coreSrc.includes("onyxias_lair"),"三副本均在 BAL.lfg 目录");
assert(coreSrc.includes("lfg:")&&coreSrc.includes('difficulty:"normal"'),"BALANCE 含 lfg 表");
assert(combatSrc.includes("toggleDungeonFinderPanel")&&combatSrc.includes('"i"'),"combat.js 绑定 Shift+I");
assert(panelsSrc.includes('"finder"')||panelsSrc.includes("'finder'"),"panels.js closeAllHudPanels 含 finder");
assert(finderSrc.includes("normal"),"仅普通难度");
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

function DEEDS_COUNT_OK(src){
  const m=src.match(/id:"[^"]+"/g)||[];
  /* DEEDS 表内 id 约 18；过滤 DEED_BY_ID 等 */
  return m.filter(s=>/id:"(kill_|rare_|world_|quest_|enter_|dungeon_|boss_|level_|talents_)/.test(s)).length>=15;
}

if(process.exitCode){
  console.error("\n部分断言失败");
  process.exit(1);
}
console.log("\n全部通过 · STEP 17–29 … / V1-A1–A4 冒烟");
