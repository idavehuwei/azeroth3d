/* ============================================================
   熔火之心 · save.js
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
          refreshStartMenu
          （存档字段含 companion · quests{} · mats{} · deeds{} · STEP 20–25）
   ============================================================ */
"use strict";

const SAVE_SLOTS=["weapon","armor"];

function normalizeSaveZoneId(z){
  if(z==="molten_core"||z==="raid")return "molten_core";
  if(z==="wailing_caverns"||z==="wailing")return "wailing_caverns";
  if(z==="onyxias_lair"||z==="onyxia")return "onyxias_lair";
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
  return {
    v:BAL.save.version,
    classKey:typeof talentClassKey==="function"?talentClassKey():"warrior",
    level:S.p.level|0,
    xp:S.p.xp|0,
    hp:Math.round(S.p.hp),
    gold:S.p.gold|0,
    inv:S.inv.slice(),
    eq:{weapon:S.eq.weapon||null,armor:S.eq.armor||null},
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
      :{x:0,z:52},
    companion:typeof getCompanionSave==="function"?getCompanionSave():null,
    mats:typeof collectMatsSave==="function"?collectMatsSave():{},
    deeds:typeof collectDeedsSave==="function"?collectDeedsSave():{},
    savedAt:Date.now(),
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
  const eq={weapon:null,armor:null};
  const rawEq=raw.eq&&typeof raw.eq==="object"?raw.eq:{};
  for(const slot of SAVE_SLOTS){
    const id=rawEq[slot];
    if(typeof id==="string"&&ITEMS[id]&&ITEMS[id].slot===slot)eq[slot]=id;
  }
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
  const x=typeof pos.x==="number"&&isFinite(pos.x)?pos.x:0;
  const z=typeof pos.z==="number"&&isFinite(pos.z)?pos.z:52;
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
      quests[id]={status,kills:Math.max(0,r.kills|0)};
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
  return {
    ok:true,
    data:{
      v:BAL.save.version,
      classKey:raw.classKey,
      level,xp,gold,
      hp:typeof raw.hp==="number"&&isFinite(raw.hp)?raw.hp:null,
      inv,eq,
      talents:{spent,bonusPoints:Math.max(0,(raw.talents&&raw.talents.bonusPoints)|0)},
      quest:{state,kills},
      barrensQuest:{state:bqState,kills:bqKills},
      quests,
      mats,
      deeds,
      zone:zoneId==="molten_core"?"raid":"world",
      zoneId,
      pos:{x,z},
      companion,
      savedAt:raw.savedAt|0,
    },
  };
}

/** 静默按等级重建基础成长（不触发 announce / 天赋点提示） */
function rebuildLevelStats(level){
  const L=BAL.levels;
  S.p.level=1; S.p.xp=0; S.p.xpMax=L.xpMax[0];
  S.p.dmgMul=1; S.p.hpMax=CLS.hp; S.p.hp=CLS.hp;
  for(let lv=2;lv<=level;lv++){
    S.p.level=lv;
    const hpGain=Math.round(CLS.hp*L.perLevel.hpMax);
    S.p.hpMax+=hpGain;
    S.p.dmgMul+=L.perLevel.dmgMul;
    S.p.xpMax=L.xpMax[lv-1]||S.p.xpMax;
  }
}

function applySaveData(data){
  /* 副本态不恢复遭遇，回世界；野外按 zoneId 重建 */
  const wantZone=normalizeSaveZoneId(data.zoneId||data.zone);
  /* 副本遭遇不恢复：熔火回莫高雷，哀嚎回贫瘠之地 */
  const restoreZone=wantZone==="molten_core"?"mulgore"
    :(wantZone==="wailing_caverns"||wantZone==="onyxias_lair"?"barrens":wantZone);
  const gate=restoreZone==="durotar"?"outpost"
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
  S.eq={weapon:null,armor:null};
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
    if(slot==="weapon")setWeapon(player,ITEMS[id].model||player.userData.defaultWeapon);
  }

  S.p.gold=data.gold|0;
  S.p.alive=true; S.over=false;
  S.p.rage=CLS.resStart;
  S.p.hp=data.hp!=null?clamp(data.hp,1,S.p.hpMax):S.p.hpMax;
  S.p.knock=null; S.p.fear=null;
  S.p.eating=null; S.p.bandaging=null; S.p.gathering=null;
  if(S.p.whetstoneAdd){S.p.dmgMul-=S.p.whetstoneAdd;S.p.whetstoneAdd=0;}
  S.p.whetstoneT=0;
  S.craftOpen=false;

  player.position.set(data.pos.x,0,data.pos.z);
  player.rotation.y=0;

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
  S.inv=[]; S.eq={weapon:null,armor:null};
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
  player.position.set(0,0,52);
  updateQuest(); setMarker();
  if(typeof updateBarrensMarkers==="function")updateBarrensMarkers();
  finishStart("莫高雷 · 圣山草原");
  log("你从牛头人营地出发。沿着土路向北，尽头矗立着通往熔火之心的传送门。","lg-sys");
  if(S.god)log(`⚡ 上帝模式已开启：你的每一次攻击都将造成 ${BAL.god.dmg.toLocaleString()} 点伤害。`,"lg-sys");
  setTimeout(()=>log(CLS.tip,"lg-sys"),2200);
}

function beginContinue(){
  const r=loadGame();
  if(!r.ok){log(r.reason||"无法读取存档","lg-sys");return false;}
  S.god=false;
  finishStart(r.data.zone==="raid"?"你在熔火之心外苏醒……":"继续冒险");
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

/* ---------------- 启动页绑定 ---------------- */
function wireSaveUI(){
  refreshStartMenu();
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
