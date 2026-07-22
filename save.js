/* ============================================================
   炽心 · save.js
   存档系统（STEP 11）：只序列化纯数据；localStorage + Base64 导出/导入
   加载时按来源重建等级/任务奖励/天赋/装备修饰，不碰 Three.js 对象
   ------------------------------------------------------------
   [依赖] core.js（BAL $ clamp）· combat.js（S CLASSES CLS setClass updateLevelUI gainXP）
          items.js（ITEMS applyEquipStats）· models.js（setWeapon）
          talents.js（talentClassKey syncTalentPointsFromLevel recomputeTalentMods
            getTalentNode updateSkillBarStats）
          world.js（QUEST updateQuest setMarker player scene sceneWorld）
          zones.js 运行时（enterZone）
          companions.js 运行时（getCompanionSave restoreCompanion dismissCompanion）
          quests.js 运行时（collectQuestSave applyQuestSave resetAllQuests）
          professions.js 运行时（collectMatsSave applyMatsSave resetMats）
          deeds.js 运行时（collectDeedsSave applyDeedsSave resetDeeds）
   [导出] saveGame loadGame hasSave clearSave collectSaveData applySaveData
          exportSaveCode importSaveCode beginNewGame beginContinue
          refreshStartMenu wireGraphicsUI
          （存档字段含 companion · quests{} · mats{} · deeds{} · STEP 20–25）
   ============================================================ */
"use strict";

const SAVE_SLOTS=typeof EQUIP_SLOTS!=="undefined"?EQUIP_SLOTS.slice():[
  "head","neck","shoulder","back","chest",
  "hands","legs","feet","finger","mainhand",
];

function normalizeSaveZoneId(z){
  if(z==="molten_core"||z==="raid")return "molten_core";
  if(z==="wailing_caverns"||z==="wailing")return "wailing_caverns";
  if(z==="onyxias_lair"||z==="onyxia")return "onyxias_lair";
  if(z==="ragefire_chasm"||z==="ragefire")return "ragefire_chasm";
  if(z==="barrens")return "barrens";
  if(z==="durotar")return "durotar";
  if(z==="mulgore"||z==="world"||!z)return "mulgore";
  return(typeof ZONES!=="undefined"&&ZONES[z])?z:"mulgore";
}
function utf8ToB64(str){
  const bytes=new TextEncoder().encode(str);
  let bin=""; for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToUtf8(b64){
  const bin=atob(b64);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function collectSaveData(){
  const inWorld=S.mode==="world";
  const zoneId=normalizeSaveZoneId(S.zoneId||(S.mode==="raid"?"molten_core":"mulgore"));
  const corpse=S.p.corpsePos;
  return {
    v:BAL.save.version,
    classKey:typeof talentClassKey==="function"?talentClassKey():"warrior",
    level:S.p.level|0,
    xp:S.p.xp|0,
    restXp:S.p.restXp|0,
    lastSeenAt:Date.now(),
    hp:Math.round(S.p.hp),
    gold:S.p.gold|0,
    inv:S.inv.slice(),
    eq:(typeof normalizeEquipment==="function"?normalizeEquipment(S.eq):{...S.eq}),
    talents:{
      spent:{...(S.talents&&S.talents.spent||{})},
      bonusPoints:(S.talents&&S.talents.bonusPoints)|0,
    },
    quest:{state:QUEST.state|0,kills:QUEST.kills|0},
    barrensQuest:typeof BARRENS_QUEST!=="undefined"
      ?{state:BARRENS_QUEST.state|0,kills:BARRENS_QUEST.kills|0}
      :{state:0,kills:0},
    quests:typeof collectQuestSave==="function"?collectQuestSave():{},
    zone:zoneId==="molten_core"?"raid":"world",   /* 旧字段兼容 */
    zoneId,
    pos:inWorld
      ?{x:+player.position.x.toFixed(2),z:+player.position.z.toFixed(2)}
      :{x:BLOODHOOF?BLOODHOOF.x:-36,z:BLOODHOOF?BLOODHOOF.z:40},
    companion:typeof getCompanionSave==="function"?getCompanionSave():null,
    mats:typeof collectMatsSave==="function"?collectMatsSave():{},
    deeds:typeof collectDeedsSave==="function"?collectDeedsSave():{},
    /* STEP 17：死亡 / 灵魂 / 虚弱 */
    death:{
      alive:!!S.p.alive,
      ghost:!!S.p.ghost,
      weaknessT:Math.max(0,+(S.p.weaknessT||0).toFixed(2)),
      corpsePos:corpse?{
        x:+corpse.x.toFixed(2),
        y:+(corpse.y||0).toFixed(2),
        z:+corpse.z.toFixed(2),
        zone:corpse.zone||null,
        face:+(corpse.face||0)
      }:null
    },
    savedAt:Date.now(),
    actionBar:(S.actionBar||[]).map(v=>v==null?null:(v|0)),
  };
}

function validateSave(raw){
  if(!raw||typeof raw!=="object")return {ok:false,reason:"无效存档"};
  if((raw.v|0)!==BAL.save.version)return {ok:false,reason:`存档版本不兼容（v${raw.v}）`};
  if(!CLASSES[raw.classKey])return {ok:false,reason:"未知职业"};
  const maxLv=BAL.levels.max;
  const level=raw.level|0;
  if(level<1||level>maxLv)return {ok:false,reason:"等级非法"};
  const xp=Math.max(0,raw.xp|0);
  const gold=Math.max(0,raw.gold|0);
  const inv=[];
  const seen={};
  const srcInv=Array.isArray(raw.inv)?raw.inv:[];
  for(const id of srcInv){
    if(typeof id!=="string"||!ITEMS[id]||seen[id])continue;
    seen[id]=1; inv.push(id);
    if(inv.length>=BAL.bag.size)break;
  }
  const eq=typeof normalizeEquipment==="function"
    ?normalizeEquipment(raw.eq)
    :(()=>{const o={};for(const s of SAVE_SLOTS)o[s]=null;return o;})();
  if(typeof reclaimUnequippedGear==="function")reclaimUnequippedGear(raw.eq,inv,eq);
  const spent={};
  const rawSpent=raw.talents&&typeof raw.talents.spent==="object"?raw.talents.spent:{};
  for(const id in rawSpent){
    const node=getTalentNode(raw.classKey,id);
    if(!node)continue;
    const r=Math.max(0,Math.min(node.maxRank,rawSpent[id]|0));
    if(r>0)spent[id]=r;
  }
  const q=raw.quest&&typeof raw.quest==="object"?raw.quest:{};
  const state=clamp(q.state|0,0,3);
  const kills=Math.max(0,q.kills|0);
  const bq=raw.barrensQuest&&typeof raw.barrensQuest==="object"?raw.barrensQuest:{};
  const bqState=clamp(bq.state|0,0,2);
  const bqKills=Math.max(0,bq.kills|0);
  const pos=raw.pos&&typeof raw.pos==="object"?raw.pos:{};
  const x=typeof pos.x==="number"&&isFinite(pos.x)?pos.x:(typeof CAMP_NARACHE!=="undefined"?CAMP_NARACHE.x:-90);
  const z=typeof pos.z==="number"&&isFinite(pos.z)?pos.z:(typeof CAMP_NARACHE!=="undefined"?CAMP_NARACHE.z:281);
  const zoneId=normalizeSaveZoneId(raw.zoneId||raw.zone);
  let companion=null;
  if(Array.isArray(raw.companion)){
    companion=raw.companion.filter(r=>r&&CLASSES[r.classKey]).map(r=>({
      classKey:r.classKey,
      hp:typeof r.hp==="number"&&isFinite(r.hp)?r.hp:null,
      role:r.role||null,
    }));
    if(!companion.length)companion=null;
  }else if(raw.companion&&typeof raw.companion==="object"&&CLASSES[raw.companion.classKey]){
    companion={
      classKey:raw.companion.classKey,
      hp:typeof raw.companion.hp==="number"&&isFinite(raw.companion.hp)?raw.companion.hp:null,
    };
  }
  let quests=null;
  if(raw.quests&&typeof raw.quests==="object"){
    quests={};
    for(const id in raw.quests){
      const r=raw.quests[id];
      if(!r||typeof r!=="object")continue;
      const status=["none","active","ready","done"].includes(r.status)?r.status:"none";
      if(status==="none")continue;
      const row={status,kills:Math.max(0,r.kills|0)};
      if(r.flags&&typeof r.flags==="object")row.flags=r.flags;
      if(typeof r.giver==="string"||r.giver===null)row.giver=r.giver;
      if(typeof r.turnIn==="string"||r.turnIn===null)row.turnIn=r.turnIn;
      quests[id]=row;
    }
  }
  let mats={};
  if(raw.mats&&typeof raw.mats==="object"&&typeof MATS!=="undefined"){
    const max=(BAL.professions&&BAL.professions.matsMax)|0||99;
    for(const id in raw.mats){
      if(!MATS[id])continue;
      const n=Math.max(0,Math.min(max,raw.mats[id]|0));
      if(n)mats[id]=n;
    }
  }
  let deeds=null;
  if(raw.deeds&&typeof raw.deeds==="object"){
    deeds={done:{},progress:{},zones:{},bosses:{},dungeons:{},activeTitle:null,activeBorder:null};
    if(raw.deeds.done&&typeof raw.deeds.done==="object"){
      for(const id in raw.deeds.done){
        if(typeof DEED_BY_ID==="undefined"||DEED_BY_ID[id])deeds.done[id]=1;
      }
    }
    if(raw.deeds.progress&&typeof raw.deeds.progress==="object"){
      for(const k in raw.deeds.progress)deeds.progress[k]=Math.max(0,raw.deeds.progress[k]|0);
    }
    ["zones","bosses","dungeons"].forEach(key=>{
      if(raw.deeds[key]&&typeof raw.deeds[key]==="object"){
        for(const id in raw.deeds[key])if(raw.deeds[key][id])deeds[key][id]=true;
      }
    });
    if(typeof raw.deeds.activeTitle==="string")deeds.activeTitle=raw.deeds.activeTitle;
    if(typeof raw.deeds.activeBorder==="string")deeds.activeBorder=raw.deeds.activeBorder;
  }
  /* STEP 17：死亡态（可选；旧档无此字段） */
  let death=null;
  if(raw.death&&typeof raw.death==="object"){
    let corpsePos=null;
    const c=raw.death.corpsePos;
    if(c&&typeof c==="object"&&typeof c.x==="number"&&typeof c.z==="number"&&isFinite(c.x)&&isFinite(c.z)){
      corpsePos={
        x:c.x, z:c.z,
        y:typeof c.y==="number"&&isFinite(c.y)?c.y:0,
        zone:typeof c.zone==="string"?c.zone:null,
        face:typeof c.face==="number"&&isFinite(c.face)?c.face:0
      };
    }
    death={
      alive:!!raw.death.ghost?false:(raw.death.alive!==false),
      ghost:!!raw.death.ghost,
      weaknessT:Math.max(0,+(raw.death.weaknessT||0)),
      corpsePos
    };
  }
  return {
    ok:true,
    data:{
      v:BAL.save.version,
      classKey:raw.classKey,
      level,xp,gold,
      restXp:Math.max(0,raw.restXp|0),
      lastSeenAt:raw.lastSeenAt|0,
      hp:typeof raw.hp==="number"&&isFinite(raw.hp)?raw.hp:null,
      inv,eq,
      talents:{spent,bonusPoints:Math.max(0,(raw.talents&&raw.talents.bonusPoints)|0)},
      quest:{state,kills},
      barrensQuest:{state:bqState,kills:bqKills},
      quests,
      mats,
      deeds,
      death,
      zone:zoneId==="molten_core"?"raid":"world",
      zoneId,
      pos:{x,z},
      companion,
      savedAt:raw.savedAt|0,
      actionBar:Array.isArray(raw.actionBar)?raw.actionBar.map(v=>v==null?null:Math.max(0,Math.min(3,v|0))):null,
    },
  };
}

/** 静默按等级重建基础成长（不触发 announce / 天赋点提示） */
function rebuildLevelStats(level){
  const L=BAL.levels;
  S.p.level=1; S.p.xp=0;
  S.p.xpMax=(typeof xpToNext==="function"?xpToNext(1):null)||L.xpMax[0];
  S.p.dmgMul=1; S.p.hpMax=CLS.hp; S.p.hp=CLS.hp;
  S.p._appliedHpBonus=0; S.p._appliedManaBonus=0;
  /* 读开局属性；等级成长叠在 baseStats 上 */
  if(typeof initPlayerStats==="function")initPlayerStats(CLS.key);
  for(let lv=2;lv<=level;lv++){
    S.p.level=lv;
    const hpGain=Math.round(CLS.hp*L.perLevel.hpMax);
    S.p.hpMax+=hpGain;
    S.p.dmgMul+=L.perLevel.dmgMul;
    S.p.xpMax=(typeof xpToNext==="function"?xpToNext(lv):null)||L.xpMax[lv-1]||S.p.xpMax;
    if(S.p.baseStats){
      S.p.baseStats.str=(S.p.baseStats.str|0)+2;
      S.p.baseStats.sta=(S.p.baseStats.sta|0)+2;
      S.p.baseStats.agi=(S.p.baseStats.agi|0)+1;
    }
  }
  if(typeof rebuildPlayerStatsFromEquip==="function")rebuildPlayerStatsFromEquip();
  else if(typeof refreshPlayerDerived==="function")refreshPlayerDerived();
}

function applySaveData(data){
  /* 副本态不恢复遭遇，回世界；野外按 zoneId 重建 */
  const wantZone=normalizeSaveZoneId(data.zoneId||data.zone);
  /* 副本遭遇不恢复：熔火回赤蹄草甸，哀嚎/奥妮回贫瘠，怒焰回赭岩 */
  const restoreZone=wantZone==="molten_core"?"mulgore"
    :(wantZone==="wailing_caverns"||wantZone==="onyxias_lair"?"barrens"
      :(wantZone==="ragefire_chasm"?"durotar":wantZone));
  const gate=restoreZone==="durotar"
    ?(wantZone==="ragefire_chasm"?"from_ragefire":"outpost")
    :(restoreZone==="barrens"
      ?(wantZone==="wailing_caverns"?"from_wailing":wantZone==="onyxias_lair"?"from_onyxia":"crossroads")
      :"camp");
  if(S.mode==="raid"||(typeof getCurrentZoneId==="function"&&getCurrentZoneId()!==restoreZone)||scene!==(ZONES[restoreZone]&&ZONES[restoreZone].scene)){
    if(typeof enterZone==="function"){
      enterZone(restoreZone,gate,{skipFade:true,skipSave:true,silent:true,force:true});
    }else if(typeof leaveRaid==="function"&&S.mode==="raid"){
      S.pShots.forEach(s=>s.mesh.parent&&s.mesh.parent.remove(s.mesh));
      S.pShots.length=0;
      if(player.parent)player.parent.remove(player);
      sceneWorld.add(player);
      scene=sceneWorld;
      S.mode="world";
      if(typeof removeExitPortal==="function")removeExitPortal();
      $("#bossFrame").classList.remove("show");
    }else if(player.parent!==sceneWorld){
      if(player.parent)player.parent.remove(player);
      sceneWorld.add(player);
      scene=sceneWorld;
      S.mode="world";
    }
  }
  S.zoneId=restoreZone;

  setClass(data.classKey);
  rebuildLevelStats(data.level);
  if(data.level>=BAL.levels.max)S.p.xp=0;
  else S.p.xp=clamp(data.xp,0,S.p.xpMax);
  S.p.restXp=Math.max(0,data.restXp|0);
  if(typeof restPoolCap==="function")
    S.p.restXp=Math.min(S.p.restXp,restPoolCap(S.p.xpMax));
  S.p.lastSeenAt=data.lastSeenAt|0;
  if(typeof applyOfflineRestXp==="function")applyOfflineRestXp();
  S.p.lastSeenAt=Date.now();
  if(Array.isArray(data.actionBar)&&typeof bindSkillToBar==="function"){
    S.actionBar=[null,null,null,null];
    for(let s=0;s<4;s++){
      const idx=data.actionBar[s];
      if(idx==null)continue;
      if(SKILLS[idx]&&typeof isSkillKnown==="function"&&isSkillKnown(SKILLS[idx]))
        S.actionBar[s]=idx;
    }
    /* 若全空则回退默认 */
    if(S.actionBar.every(v=>v==null)&&typeof defaultActionBar==="function")
      S.actionBar=defaultActionBar();
    if(typeof refreshActionBarUI==="function")refreshActionBarUI();
  }

  if(typeof applyQuestSave==="function"){
    applyQuestSave(data.quests,{quest:data.quest,barrensQuest:data.barrensQuest});
  }else{
    QUEST.state=data.quest.state;
    QUEST.kills=data.quest.kills;
    if(QUEST.state>=2){
      S.p.hpMax+=BAL.quest.rewardHp;
      S.p.dmgMul+=BAL.quest.rewardDmgMul-1;
    }
    if(typeof BARRENS_QUEST!=="undefined"){
      const bq=data.barrensQuest||{state:0,kills:0};
      BARRENS_QUEST.state=bq.state|0;
      BARRENS_QUEST.kills=bq.kills|0;
    }
  }
  if(typeof updateBarrensMarkers==="function")updateBarrensMarkers();

  S.talents={
    points:0,
    spent:{...data.talents.spent},
    classKey:data.classKey,
    bonusPoints:data.talents.bonusPoints|0,
  };
  syncTalentPointsFromLevel();
  recomputeTalentMods();

  S.inv=data.inv.slice();
  S.eq=typeof emptyEquipment==="function"?emptyEquipment():{};
  if(typeof applyMatsSave==="function")applyMatsSave(data.mats);
  else S.mats={...(data.mats||{})};
  if(typeof applyDeedsSave==="function")applyDeedsSave(data.deeds);
  else if(data.deeds)S.deeds=data.deeds;
  for(const slot of SAVE_SLOTS){
    const id=data.eq[slot];
    if(!id||!ITEMS[id])continue;
    const idx=S.inv.indexOf(id);
    if(idx>=0)S.inv.splice(idx,1);
    S.eq[slot]=id;
    applyEquipStats(ITEMS[id],+1);
    if(slot==="mainhand")setWeapon(player,ITEMS[id].model||player.userData.defaultWeapon);
  }

  S.p.gold=data.gold|0;
  S.p.alive=true; S.over=false;
  S.p.ghost=false; S.p.corpsePos=null; S.p.sitting=false; S.p.fallPeakY=null;
  if(typeof clearGhostForm==="function")clearGhostForm();
  S.p.rage=CLS.resStart;
  S.p.hp=data.hp!=null?clamp(data.hp,0,S.p.hpMax):S.p.hpMax;
  if(S.p.hp<=0)S.p.hp=1;
  S.p.knock=null;
  S.p.bandaging=null; S.p.gathering=null;
  if(typeof clearAllBuffs==="function")clearAllBuffs("load");
  else{
    S.p.fear=null; S.p.eating=null; S.p.drinking=null;
    if(S.p.whetstoneAdd){S.p.dmgMul-=S.p.whetstoneAdd;S.p.whetstoneAdd=0;}
    S.p.whetstoneT=0; S.p.absorb=0; S.p.absorbT=0; S.p.weaknessT=0;
  }
  S.craftOpen=false;

  player.position.set(data.pos.x,0,data.pos.z);
  player.rotation.y=0;

  /* STEP 17：恢复死亡 / 灵魂 / 虚弱 */
  const death=data.death;
  let restoredDeath=false;
  if(death&&typeof restoreDeathFromSave==="function")
    restoredDeath=!!restoreDeathFromSave(death);
  if(!restoredDeath&&death&&death.weaknessT>0){
    if(typeof applyBuff==="function")applyBuff("weakness",{duration:death.weaknessT});
    else S.p.weaknessT=death.weaknessT;
  }

  updateLevelUI();
  if(typeof updateSkillBarStats==="function")updateSkillBarStats();
  updateQuest();
  setMarker();
  if(typeof renderBag==="function")renderBag();
  if(typeof renderTalentPanel==="function")renderTalentPanel();
  if(typeof restoreCompanion==="function"){
    if(data.companion)restoreCompanion(data.companion);
    else if(typeof dismissCompanion==="function")dismissCompanion({silent:true,noSave:true});
  }
}

function saveGame(silent){
  if(!S.started)return false;
  try{
    const data=collectSaveData();
    localStorage.setItem(BAL.save.key,JSON.stringify(data));
    if(!silent)log("进度已保存。","lg-sys");
    refreshStartMenu();
    return true;
  }catch(err){
    log("存档失败（存储可能已满或不可用）。","lg-sys");
    return false;
  }
}

function readStoredSave(){
  try{
    const raw=localStorage.getItem(BAL.save.key);
    if(!raw)return null;
    return validateSave(JSON.parse(raw));
  }catch(e){
    return {ok:false,reason:"存档损坏"};
  }
}

function hasSave(){
  const r=readStoredSave();
  return !!(r&&r.ok);
}

function clearSave(){
  try{localStorage.removeItem(BAL.save.key);}catch(e){}
  refreshStartMenu();
}

function loadGame(){
  const r=readStoredSave();
  if(!r)return {ok:false,reason:"没有存档"};
  if(!r.ok)return r;
  applySaveData(r.data);
  return {ok:true,data:r.data};
}

function exportSaveCode(){
  let payload=null;
  if(S.started)payload=collectSaveData();
  else{
    const r=readStoredSave();
    if(r&&r.ok)payload=r.data;
  }
  if(!payload)return null;
  return utf8ToB64(JSON.stringify(payload));
}

function importSaveCode(code){
  if(typeof code!=="string"||!code.trim())return {ok:false,reason:"空存档码"};
  try{
    const json=b64ToUtf8(code.trim().replace(/\s+/g,""));
    const checked=validateSave(JSON.parse(json));
    if(!checked.ok)return checked;
    localStorage.setItem(BAL.save.key,JSON.stringify(checked.data));
    refreshStartMenu();
    return {ok:true,data:checked.data};
  }catch(e){
    return {ok:false,reason:"存档码无法解析"};
  }
}

function finishStart(msg){
  $("#startOv").classList.add("hide");
  S.started=true;
  if(typeof SFX!=="undefined"){SFX.init();SFX.music("world");}
  if(msg)announce(msg);
  saveGame(true);
}

function beginNewGame(classKey){
  clearSave();
  if(typeof resetAllQuests==="function")resetAllQuests({silent:true});
  else{
    QUEST.state=0; QUEST.kills=0;
    if(typeof BARRENS_QUEST!=="undefined"){BARRENS_QUEST.state=0;BARRENS_QUEST.kills=0;}
  }
  if(typeof dismissCompanion==="function")dismissCompanion({silent:true,noSave:true});
  if(typeof resetMats==="function")resetMats({silent:true});
  else S.mats={};
  if(typeof resetDeeds==="function")resetDeeds({silent:true});
  S.inv=[]; S.eq=typeof emptyEquipment==="function"?emptyEquipment():{};
  S.p.gold=0; S.over=false; S.mode="world"; S.zoneId="mulgore";
  S.currentTarget=null;
  setClass(classKey||"warrior");
  S.god=$("#godChk")&&$("#godChk").checked;
  if(typeof enterZone==="function"&&(typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore")!=="mulgore"){
    enterZone("mulgore","camp",{skipFade:true,skipSave:true,silent:true,force:true});
  }else if(player.parent!==sceneWorld){
    if(player.parent)player.parent.remove(player);
    sceneWorld.add(player); scene=sceneWorld;
  }
  player.position.set(
    typeof CAMP_NARACHE!=="undefined"?CAMP_NARACHE.x:-90,
    0,
    typeof CAMP_NARACHE!=="undefined"?CAMP_NARACHE.z:281
  );
  updateQuest(); setMarker();
  if(typeof updateBarrensMarkers==="function")updateBarrensMarkers();
  finishStart(T("zone.mulgore")+" · "+T("poi.camp_narache"));
  log("你从"+T("poi.camp_narache")+"醒来。北上红云台地猎杀野兽，再前往"+T("poi.bloodhoof")+"拜见长老。","lg-sys");
  if(S.god)log(`⚡ 上帝模式已开启：你的每一次攻击都将造成 ${BAL.god.dmg.toLocaleString()} 点伤害。`,"lg-sys");
  setTimeout(()=>log(CLS.tip,"lg-sys"),2200);
}

function beginContinue(){
  const r=loadGame();
  if(!r.ok){log(r.reason||"无法读取存档","lg-sys");return false;}
  S.god=false;
  finishStart(r.data.zone==="raid"?"你在"+T("zone.molten_core")+"外苏醒……":"继续冒险");
  log(`读取存档：${CLASSES[r.data.classKey].title} · Lv.${r.data.level}`,"lg-sys");
  if(r.data.zone==="raid")log("副本遭遇不保留——请再次踏入传送门。","lg-sys");
  return true;
}

function refreshStartMenu(){
  const cont=$("#btnContinue"), meta=$("#saveMeta");
  const r=readStoredSave();
  const ok=r&&r.ok;
  if(cont)cont.style.display=ok?"inline-block":"none";
  if(meta){
    if(ok){
      const d=r.data, t=d.savedAt?new Date(d.savedAt).toLocaleString():"";
      meta.textContent=`存档：${CLASSES[d.classKey].title} · Lv.${d.level}${t?" · "+t:""}`;
      meta.style.display="block";
    }else{
      meta.textContent=""; meta.style.display="none";
    }
  }
  const exp=$("#btnExportSave");
  if(exp)exp.style.display=ok?"inline-block":"none";
  /* 无存档时直接展开职业选择，减少多点一次 */
  if(!S.started)showNewGamePanel(!ok);
}

function showNewGamePanel(show){
  const menu=$("#startMenu"), panel=$("#newGamePanel"), tools=$("#saveImportBox");
  if(menu)menu.style.display=show?"none":"flex";
  if(panel)panel.style.display=show?"block":"none";
  if(tools)tools.style.display=show?"none":"block";
}

/* ---------------- 登录页 · 画面设置齿轮 ---------------- */
function _gfxCollectUI(){
  const on=$("#gfxPresets button.on");
  return {
    preset:on&&on.dataset.preset?on.dataset.preset:(BAL.graphics.defaultPreset||"balanced"),
    trails:!!($("#gfxTrails")&&$("#gfxTrails").checked),
    hitFlash:!!($("#gfxHitFlash")&&$("#gfxHitFlash").checked),
    dissolve:!!($("#gfxDissolve")&&$("#gfxDissolve").checked),
    useLights:!!($("#gfxLights")&&$("#gfxLights").checked),
    fakeBloom:!!($("#gfxBloom")&&$("#gfxBloom").checked),
  };
}
function syncGraphicsUI(state){
  state=state||(typeof getGraphicsSettings==="function"?getGraphicsSettings():null);
  if(!state)return;
  const presets=$("#gfxPresets");
  if(presets){
    presets.querySelectorAll("button").forEach(b=>{
      b.classList.toggle("on",b.dataset.preset===state.preset);
    });
  }
  const hint=$("#gfxHint");
  if(hint&&typeof GFX_PRESETS!=="undefined"){
    const pre=GFX_PRESETS[state.preset];
    hint.textContent=pre?(pre.hint||""):"";
  }
  const map=[
    ["gfxTrails","trails"],["gfxHitFlash","hitFlash"],["gfxDissolve","dissolve"],
    ["gfxLights","useLights"],["gfxBloom","fakeBloom"],
  ];
  for(let i=0;i<map.length;i++){
    const el=$("#"+map[i][0]);
    if(el)el.checked=!!state[map[i][1]];
  }
}
function wireGraphicsUI(){
  const gear=$("#btnGfxGear"), panel=$("#gfxPanel"), close=$("#gfxClose");
  if(!gear||!panel||typeof getGraphicsSettings!=="function")return;
  syncGraphicsUI(getGraphicsSettings());
  const setOpen=open=>{
    panel.classList.toggle("open",!!open);
    gear.setAttribute("aria-expanded",open?"true":"false");
  };
  gear.addEventListener("click",e=>{
    e.stopPropagation();
    setOpen(!panel.classList.contains("open"));
  });
  if(close)close.addEventListener("click",e=>{e.stopPropagation();setOpen(false);});
  const presets=$("#gfxPresets");
  if(presets){
    presets.addEventListener("click",e=>{
      const btn=e.target.closest("button[data-preset]");
      if(!btn||typeof GFX_PRESETS==="undefined")return;
      const pre=GFX_PRESETS[btn.dataset.preset];
      if(!pre)return;
      const next={
        preset:btn.dataset.preset,
        useLights:!!pre.useLights,
        trails:!!pre.trails,
        hitFlash:!!pre.hitFlash,
        dissolve:!!pre.dissolve,
        fakeBloom:!!pre.fakeBloom,
      };
      const state=saveGraphicsSettings(next);
      syncGraphicsUI(state);
      if(typeof announce==="function")announce("画面："+(pre.label||btn.dataset.preset));
    });
  }
  ["gfxTrails","gfxHitFlash","gfxDissolve","gfxLights","gfxBloom"].forEach(id=>{
    const el=$("#"+id);
    if(!el)return;
    el.addEventListener("change",()=>{
      const state=saveGraphicsSettings(_gfxCollectUI());
      syncGraphicsUI(state);
    });
  });
}

/* ---------------- 启动页绑定 ---------------- */
function wireSaveUI(){
  refreshStartMenu();
  wireGraphicsUI();
  const btnCont=$("#btnContinue");
  if(btnCont)btnCont.addEventListener("click",()=>beginContinue());
  const btnNew=$("#btnNew");
  if(btnNew)btnNew.addEventListener("click",()=>showNewGamePanel(true));
  const btnBack=$("#btnBackMenu");
  if(btnBack)btnBack.addEventListener("click",()=>showNewGamePanel(false));
  const btnStart=$("#btnStart");
  if(btnStart)btnStart.addEventListener("click",()=>{
    const cls=(typeof chosenClass!=="undefined"?chosenClass:"warrior");
    beginNewGame(cls);
  });
  const btnImp=$("#btnImportSave");
  if(btnImp)btnImp.addEventListener("click",()=>{
    const ta=$("#saveCodeIn");
    const code=ta?ta.value:"";
    const r=importSaveCode(code);
    if(!r.ok){announce(r.reason||"导入失败");return;}
    if(ta)ta.value="";
    announce("存档已导入");
    refreshStartMenu();
  });
  const btnExp=$("#btnExportSave");
  if(btnExp)btnExp.addEventListener("click",()=>{
    const code=exportSaveCode();
    if(!code){announce("没有可导出的存档");return;}
    const ta=$("#saveCodeOut");
    if(ta){ta.value=code;ta.style.display="block";ta.select();}
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(code).then(()=>announce("存档码已复制")).catch(()=>announce("请手动复制存档码"));
    }else announce("请手动复制存档码");
  });
  addEventListener("beforeunload",()=>{if(S.started)saveGame(true);});
  addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"&&S.started)saveGame(true);});
}

window.cheatSave={
  save:()=>saveGame(false),
  load:()=>loadGame(),
  clear:clearSave,
  export:exportSaveCode,
  import:importSaveCode,
  dump:()=>collectSaveData(),
};

wireSaveUI();
console.info("[save] STEP 11 就绪：继续冒险 / cheatSave.export() / .import(code)");
