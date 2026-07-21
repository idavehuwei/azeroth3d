/* ============================================================
   熔火之心 · rares.js
   稀有精英 + 世界 Boss 框架（STEP 24）
   RARES / WORLD_BOSSES 声明式表 · 长刷新 · 金色姓名板 · 公告 · 必掉
   ------------------------------------------------------------
   [依赖] core.js（BAL）
          world.js（spawnMob MOB_TYPES MOBS）
          barrens.js 运行时（spawnRaresForZone）
          combat.js 运行时（announce log）
   [导出] RARES WORLD_BOSSES
          spawnRaresForZone getRareMapEntries
          onRareRespawn onRareKill
          isRareMob isWorldBossMob
   ============================================================ */
"use strict";

/* ---- 稀有精英表（加一只 = 加一条；坐标相对各区原点） ---- */
const RARES=[
  {id:"greyjaw_mulgore", type:"boarKing", zone:"mulgore",
    x:14, z:-34, rare:true, label:"老灰鬃"},
  {id:"ashmane_barrens", type:"ashmane", zone:"barrens",
    x:-48, z:38, rare:true, label:"灰蹄野猪王",
    name:"灰蹄野猪王"},
  /* 粉色精英也走表，便于小地图统一 */
  {id:"harpy_mulgore", type:"harpy", zone:"mulgore",
    x:48, z:-30, rare:false, label:"鹰身女妖"},
];

/* ---- 世界 Boss 表（野外可摸，非副本分段） ---- */
const WORLD_BOSSES=[
  {id:"centaur_warbringer", type:"centaurHerald", zone:"barrens",
    x:52, z:32, worldBoss:true, rare:true, label:"战争使者",
    name:"半人马战争使者"},
];

function isRareMob(m){return !!(m&&(m.rare||m.worldBoss));}
function isWorldBossMob(m){return !!(m&&m.worldBoss);}

function spawnRareEntry(entry){
  if(!entry||typeof spawnMob!=="function")return null;
  const opts={
    zoneId:entry.zone,
    rare:!!entry.rare,
    worldBoss:!!entry.worldBoss,
    rareId:entry.id,
  };
  if(entry.name)opts.name=entry.name;
  const m=spawnMob(entry.type,entry.x,entry.z,entry.id,opts);
  return m;
}

function spawnRaresForZone(zoneId){
  if(!zoneId)return;
  for(const e of RARES){
    if(e.zone!==zoneId)continue;
    /* 避免 ensureZoneBuilt 二次调用重复刷 */
    if(MOBS.some(m=>m.rareId===e.id))continue;
    spawnRareEntry(e);
  }
  for(const e of WORLD_BOSSES){
    if(e.zone!==zoneId)continue;
    if(MOBS.some(m=>m.rareId===e.id))continue;
    spawnRareEntry(e);
  }
}

function getRareMapEntries(zoneId){
  const out=[];
  const gold=(BAL.rares&&BAL.rares.gold)||"#ffd700";
  const pink=(BAL.rares&&BAL.rares.elitePink)||"#ff9ad0";
  for(const e of RARES){
    if(e.zone!==zoneId)continue;
    out.push({
      id:e.id, label:e.label||e.name||e.type,
      x:e.x, z:e.z,
      color:e.rare||e.worldBoss?gold:pink,
      rare:!!(e.rare||e.worldBoss),
    });
  }
  for(const e of WORLD_BOSSES){
    if(e.zone!==zoneId)continue;
    out.push({
      id:e.id, label:e.label||e.name||e.type,
      x:e.x, z:e.z, color:gold, rare:true, worldBoss:true,
    });
  }
  return out;
}

function onRareRespawn(m){
  if(!m||!(m.rare||m.worldBoss))return;
  if(!(BAL.rares&&BAL.rares.announceSpawn))return;
  const tag=m.worldBoss?"世界首领":"稀有精英";
  announce(`${tag}出现 · ${m.name}`);
  log(`${tag}【${m.name}】已刷新！`,"lg-sys");
}

function onRareKill(m){
  if(!m||!(m.elite||m.rare||m.worldBoss))return;
  if(!(BAL.rares&&BAL.rares.announceKill))return;
  if(m.worldBoss)announce(`世界首领倒下 · ${m.name}`);
  else if(m.rare)announce(`稀有精英被击败 · ${m.name}`);
  else announce(`${m.name} 被击败！`);
}

console.info("[rares] STEP 24 就绪：RARES · WORLD_BOSSES");
/* world.js 先于本文件加载：莫高雷稀有在此补刷 */
if(typeof MOBS!=="undefined")spawnRaresForZone("mulgore");
