/* ============================================================
   炽心 · deeds.js
   功绩之书（STEP 25）：DEEDS[] · 称号前缀 · 外观边框 · Shift+Z 面板
   ------------------------------------------------------------
   [依赖] core.js（BAL $）
          icons.js（Icons）
          combat.js（S CLS announce log updateLevelUI）
          panels.js 运行时（closeAllHudPanels panelOpen setPanel）
          save.js 运行时（saveGame）
   [导出] DEEDS grantDeed isDeedDone deedProgress
          onDeedMobKill onDeedQuestComplete onDeedDungeonClear
          onDeedZoneEnter onDeedLevelUp onDeedTalentChange
          setActiveTitle setActiveBorder
          collectDeedsSave applyDeedsSave resetDeeds
          toggleDeedsPanel renderDeedsPanel deedsOpen
          updatePlayerNameplate DEED_CAT_ICON
   ============================================================ */
"use strict";

/* ---- 功绩表（加成就 = 加一条） ---- */
const DEEDS=[
  {id:"kill_boars_10", title:"草原猎手", desc:"猎杀草原野猪 10 只。",
    cat:"kill", need:{type:"kill", mob:"boar", count:10},
    reward:{title:"猎手", border:"deed-border-bronze"}},
  {id:"kill_wolves_5", title:"狼群克星", desc:"猎杀草原狼 5 只。",
    cat:"kill", need:{type:"kill", mob:"wolf", count:5},
    reward:{title:"巡林者"}},
  {id:"kill_quilboar_8", title:"斥候终结者", desc:"清剿"+T("mob.quilboar")+" 8 只。",
    cat:"kill", need:{type:"kill", mob:"quilboar", count:8},
    reward:{title:"碎牙之友"}},
  {id:"kill_centaur_5", title:"马蹄践踏者", desc:"击败半人马战士 5 只。",
    cat:"kill", need:{type:"kill", mob:"centaur", count:5},
    reward:{title:"平原守护者", border:"deed-border-green"}},
  {id:"rare_greyjaw", title:"灰鬃猎杀", desc:"击败稀有精英「老灰鬃野猪王」。",
    cat:"rare", need:{type:"rare", rareId:"greyjaw_mulgore"},
    reward:{title:"灰鬃克星", border:"deed-border-gold"}},
  {id:"rare_ashmane", title:"灰蹄之怒", desc:"击败稀有精英「灰蹄野猪王」。",
    cat:"rare", need:{type:"rare", rareId:"ashmane_barrens"},
    reward:{title:"灰蹄猎人", border:"deed-border-gold"}},
  {id:"world_boss_warbringer", title:"战争使者之敌", desc:"击败世界首领「半人马战争使者」。",
    cat:"rare", need:{type:"worldBoss", mob:"centaurHerald"},
    reward:{title:"战争克星", border:"deed-border-orange"}},
  {id:"quest_elder_boars", title:"大地祝福", desc:"完成任务「开始狩猎」。",
    cat:"quest", need:{type:"quest", id:"elder_boars"},
    reward:{title:"岩蹄传人"}},
  {id:"quest_crossroads", title:T("poi.crossroads")+"英雄", desc:"完成任务「"+T("poi.crossroads")+"的麻烦」。",
    cat:"quest", need:{type:"quest", id:"crossroads_trouble"},
    reward:{title:"碎牙哨兵"}},
  {id:"quest_side_mulgore", title:T("zone.mulgore")+"守望", desc:"完成"+T("zone.mulgore")+"三条支线任务。",
    cat:"quest", need:{type:"quests", ids:["plains_patrol","harpy_nest","greyjaw_bounty"]},
    reward:{title:T("zone.mulgore")+"卫士", border:"deed-border-blue"}},
  {id:"enter_barrens", title:"南行贫瘠", desc:"首次踏入"+T("zone.barrens")+"。",
    cat:"explore", need:{type:"zone", id:"barrens"},
    reward:{title:"行者"}},
  {id:"enter_durotar", title:"西行赭岩", desc:"首次踏入赭岩谷。",
    cat:"explore", need:{type:"zone", id:"durotar"},
    reward:{title:"焦土旅人"}},
  {id:"enter_wailing", title:"洞穴低语", desc:"首次踏入"+T("zone.wailing")+"。",
    cat:"explore", need:{type:"zone", id:"wailing_caverns"},
    reward:{title:"洞窟探险家"}},
  {id:"enter_ragefire", title:"怒焰之下", desc:"首次踏入"+T("zone.ragefire")+"。",
    cat:"explore", need:{type:"zone", id:"ragefire_chasm"},
    reward:{title:"裂隙旅人"}},
  {id:"dungeon_molten_clear", title:"熔火征服者", desc:"首次通关"+T("zone.molten_core")+"（击败"+T("boss.ragnaros_short")+"）。",
    cat:"dungeon", need:{type:"dungeon", id:"molten_core"},
    reward:{title:T("deed.molten_reward"), border:"deed-border-fire"}},
  {id:"dungeon_wailing_clear", title:T("deed.wailing_clear"), desc:T("deed.wailing_clear_desc"),
    cat:"dungeon", need:{type:"dungeon", id:"wailing_caverns"},
    reward:{title:"洞穴净化者", border:"deed-border-venom"}},
  {id:"dungeon_ragefire_clear", title:T("deed.ragefire_clear"), desc:T("deed.ragefire_clear_desc"),
    cat:"dungeon", need:{type:"dungeon", id:"ragefire_chasm"},
    reward:{title:"燃刃克星", border:"deed-border-fire"}},
  {id:"boss_magmadar", title:"猎犬驯服", desc:"击败"+T("boss.magmadar")+"。",
    cat:"dungeon", need:{type:"boss", id:"magmadar"},
    reward:{title:"熔岩猎手"}},
  {id:"level_10", title:"十级旅人", desc:"达到 10 级。",
    cat:"level", need:{type:"level", min:10},
    reward:{title:"旅人"}},
  {id:"level_max", title:"满级英雄", desc:"达到满级。",
    cat:"level", need:{type:"level", minKey:"max"},
    reward:{title:"英雄", border:"deed-border-purple"}},
  {id:"talents_full", title:"天赋大师", desc:"在满级时花光所有天赋点。",
    cat:"talent", need:{type:"talentsFull"},
    reward:{title:"专精者", border:"deed-border-talent"}},
];

const DEED_BY_ID={};
DEEDS.forEach(d=>{DEED_BY_ID[d.id]=d;});

const DEED_BORDERS=["deed-border-bronze","deed-border-green","deed-border-gold",
  "deed-border-orange","deed-border-blue","deed-border-fire","deed-border-venom",
  "deed-border-purple","deed-border-talent"];

function ensureDeeds(){
  if(!S.deeds)S.deeds={done:{},progress:{},zones:{},bosses:{},dungeons:{},activeTitle:null,activeBorder:null};
  if(!S.deeds.done)S.deeds.done={};
  if(!S.deeds.progress)S.deeds.progress={};
  if(!S.deeds.zones)S.deeds.zones={};
  if(!S.deeds.bosses)S.deeds.bosses={};
  if(!S.deeds.dungeons)S.deeds.dungeons={};
  return S.deeds;
}

function isDeedDone(id){return !!ensureDeeds().done[id];}
function deedProgress(id){return Math.max(0,ensureDeeds().progress[id]|0);}

function levelNeedMin(need){
  if(need.minKey==="max")return BAL.levels.max|0;
  return need.min|0;
}

function grantDeed(id,opts){
  opts=opts||{};
  const d=DEED_BY_ID[id];
  if(!d||isDeedDone(id))return false;
  const st=ensureDeeds();
  st.done[id]=Date.now();
  if(!opts.silent){
    announce(`功绩 · ${d.title}`);
    log(`获得功绩【${d.title}】${d.reward&&d.reward.title?` · 称号「${d.reward.title}」`:""}`,"lg-heal");
    if(typeof SFX!=="undefined")SFX.play("levelup");
  }
  /* 首次获得自动装备称号/边框（若当前未装备） */
  if(d.reward){
    if(d.reward.title&&!st.activeTitle)setActiveTitle(d.reward.title,{silent:true,noSave:true});
    if(d.reward.border&&!st.activeBorder)setActiveBorder(d.reward.border,{silent:true,noSave:true});
  }
  updatePlayerNameplate();
  if(typeof renderDeedsPanel==="function")renderDeedsPanel();
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
  return true;
}

function bumpKillProgress(mobType){
  const st=ensureDeeds();
  const key="kill_"+mobType;
  st.progress[key]=(st.progress[key]|0)+1;
  for(const d of DEEDS){
    if(isDeedDone(d.id))continue;
    const n=d.need;
    if(!n||n.type!=="kill"||n.mob!==mobType)continue;
    if((st.progress[key]|0)>=(n.count|0))grantDeed(d.id);
  }
}

function checkQuestDeeds(){
  for(const d of DEEDS){
    if(isDeedDone(d.id))continue;
    const n=d.need;
    if(!n)continue;
    if(n.type==="quest"){
      if(typeof questStatus==="function"&&questStatus(n.id)==="done")grantDeed(d.id);
    }else if(n.type==="quests"&&Array.isArray(n.ids)){
      if(typeof questStatus!=="function")continue;
      if(n.ids.every(id=>questStatus(id)==="done"))grantDeed(d.id);
    }
  }
}

function checkLevelDeeds(){
  const lv=S.p.level|0;
  for(const d of DEEDS){
    if(isDeedDone(d.id))continue;
    const n=d.need;
    if(!n||n.type!=="level")continue;
    if(lv>=levelNeedMin(n))grantDeed(d.id);
  }
}

function checkTalentDeed(){
  for(const d of DEEDS){
    if(isDeedDone(d.id))continue;
    const n=d.need;
    if(!n||n.type!=="talentsFull")continue;
    if((S.p.level|0)<(BAL.levels.max|0))continue;
    if(typeof talentPointsUnspent==="function"&&talentPointsUnspent()===0
      &&typeof talentPointsSpent==="function"&&talentPointsSpent()>0){
      grantDeed(d.id);
    }
  }
}

function onDeedMobKill(m){
  if(!m||!m.type)return;
  bumpKillProgress(m.type);
  if(m.rareId){
    for(const d of DEEDS){
      if(isDeedDone(d.id))continue;
      const n=d.need;
      if(n&&n.type==="rare"&&n.rareId===m.rareId)grantDeed(d.id);
    }
  }
  if(m.worldBoss||(m.type&&DEEDS.some(d=>d.need&&d.need.type==="worldBoss"&&d.need.mob===m.type))){
    for(const d of DEEDS){
      if(isDeedDone(d.id))continue;
      const n=d.need;
      if(n&&n.type==="worldBoss"&&n.mob===m.type)grantDeed(d.id);
    }
  }
}

function onDeedQuestComplete(questId){
  if(!questId)return;
  checkQuestDeeds();
}

function onDeedDungeonClear(dungeonId){
  if(!dungeonId)return;
  const st=ensureDeeds();
  st.dungeons[dungeonId]=true;
  for(const d of DEEDS){
    if(isDeedDone(d.id))continue;
    const n=d.need;
    if(n&&n.type==="dungeon"&&n.id===dungeonId)grantDeed(d.id);
  }
}

function onDeedBossKill(bossId){
  if(!bossId)return;
  const st=ensureDeeds();
  st.bosses[bossId]=true;
  for(const d of DEEDS){
    if(isDeedDone(d.id))continue;
    const n=d.need;
    if(n&&n.type==="boss"&&n.id===bossId)grantDeed(d.id);
  }
}

function onDeedZoneEnter(zoneId){
  if(!zoneId)return;
  const st=ensureDeeds();
  if(st.zones[zoneId])return;
  st.zones[zoneId]=true;
  for(const d of DEEDS){
    if(isDeedDone(d.id))continue;
    const n=d.need;
    if(n&&n.type==="zone"&&n.id===zoneId)grantDeed(d.id);
  }
  if(typeof saveGame==="function")saveGame(true);
}

function onDeedLevelUp(level){
  checkLevelDeeds();
  checkTalentDeed();
}

function onDeedTalentChange(){
  checkTalentDeed();
}

function setActiveTitle(title,opts){
  opts=opts||{};
  const st=ensureDeeds();
  st.activeTitle=title||null;
  if(!opts.silent&&title)log(`装备称号「${title}」`,"lg-sys");
  updatePlayerNameplate();
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
}
function setActiveBorder(borderClass,opts){
  opts=opts||{};
  const st=ensureDeeds();
  st.activeBorder=borderClass||null;
  applyBorderClass(st.activeBorder);
  if(!opts.silent&&borderClass)log("更换功绩边框。","lg-sys");
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
}

function applyBorderClass(cls){
  const el=$("#playerFrame");
  if(!el)return;
  DEED_BORDERS.forEach(c=>el.classList.remove(c));
  if(cls)el.classList.add(cls);
}

function updatePlayerNameplate(){
  const el=$("#pName");
  if(!el||typeof CLS==="undefined")return;
  const st=ensureDeeds();
  const base=`${CLS.title} · Lv.${S.p.level}`;
  el.textContent=st.activeTitle?`「${st.activeTitle}」 ${base}`:base;
  applyBorderClass(st.activeBorder);
}

function deedProgressText(d){
  const n=d.need;
  if(!n)return "";
  if(isDeedDone(d.id))return "已完成";
  if(n.type==="kill"){
    const cur=Math.min(n.count|0,deedProgress("kill_"+n.mob));
    return `${cur}/${n.count}`;
  }
  if(n.type==="quests"){
    if(typeof questStatus!=="function")return "0/"+n.ids.length;
    const done=n.ids.filter(id=>questStatus(id)==="done").length;
    return `${done}/${n.ids.length}`;
  }
  if(n.type==="level")return `Lv.${S.p.level}/${levelNeedMin(n)}`;
  return "未完成";
}

function deedsOpen(){return panelOpen("#deedsPanel");}

/** V1-A2：功绩分类 → Icons 配方名 */
const DEED_CAT_ICON={kill:"sword",rare:"tusk",quest:"scroll",explore:"map",
  dungeon:"dungeon",level:"star",talent:"title"};

function renderDeedsPanel(){
  if(!deedsOpen())return;
  const body=$("#deedsBody");
  if(!body)return;
  const st=ensureDeeds();
  const doneN=Object.keys(st.done).length;
  let html=`<div class="ph-sec">进度 ${doneN}/${DEEDS.length}</div>`;
  html+=`<div class="ph-row"><span class="k">当前称号</span><span class="v">${st.activeTitle||"无"}</span></div>`;
  html+=`<div class="ph-row"><span class="k">当前边框</span><span class="v">${st.activeBorder?"已装备":"无"}</span></div>`;

  const cats={kill:"击杀",rare:"稀有",quest:"任务",explore:"探索",dungeon:"副本",level:"成长",talent:"天赋"};
  let last="";
  for(const d of DEEDS){
    if(d.cat!==last){
      last=d.cat;
      html+=`<div class="ph-sec">${cats[d.cat]||d.cat}</div>`;
    }
    const done=isDeedDone(d.id);
    const rew=[];
    if(d.reward&&d.reward.title)rew.push(`称号「${d.reward.title}」`);
    if(d.reward&&d.reward.border)rew.push("外观边框");
    const icName=DEED_CAT_ICON[d.cat]||"star";
    const border=done?"#e8b34a":"#6a5a40";
    html+=`<div class="ql-item deed-item${done?" done":""}" data-deed="${d.id}">`+
      `<div class="ttl"><img class="deed-ic" src="${Icons.get(icName,border)}" alt=""> ${d.title}</div>`+
      `<div class="obj">${d.desc}</div>`+
      `<div class="st">${deedProgressText(d)}${rew.length?" · "+rew.join(" · "):""}</div>`+
      (done?`<div class="deed-acts"></div>`:"")+
    `</div>`;
  }
  body.innerHTML=html;

  /* 已完成：可点击装备称号/边框 */
  body.querySelectorAll(".deed-item.done").forEach(el=>{
    const id=el.dataset.deed;
    const d=DEED_BY_ID[id];
    if(!d||!d.reward)return;
    const acts=el.querySelector(".deed-acts");
    if(!acts)return;
    if(d.reward.title){
      const b=document.createElement("button");
      b.className="dbtn deed-btn";
      b.textContent=st.activeTitle===d.reward.title?"称号已装备":`装备「${d.reward.title}」`;
      b.onclick=()=>{setActiveTitle(d.reward.title);renderDeedsPanel();};
      acts.appendChild(b);
    }
    if(d.reward.border){
      const b=document.createElement("button");
      b.className="dbtn deed-btn";
      b.textContent=st.activeBorder===d.reward.border?"边框已装备":"装备边框";
      b.onclick=()=>{setActiveBorder(d.reward.border);renderDeedsPanel();};
      acts.appendChild(b);
    }
  });
}

function toggleDeedsPanel(){
  if(!S.started)return;
  if(deedsOpen()){setPanel("#deedsPanel",false);return;}
  setPanel("#deedsPanel",true);
  renderDeedsPanel();
}

function collectDeedsSave(){
  const st=ensureDeeds();
  return {
    done:{...st.done},
    progress:{...st.progress},
    zones:{...st.zones},
    bosses:{...st.bosses},
    dungeons:{...st.dungeons},
    activeTitle:st.activeTitle||null,
    activeBorder:st.activeBorder||null,
  };
}

function applyDeedsSave(raw){
  resetDeeds({silent:true});
  const st=ensureDeeds();
  if(!raw||typeof raw!=="object"){updatePlayerNameplate();return;}
  if(raw.done&&typeof raw.done==="object"){
    for(const id in raw.done){
      if(DEED_BY_ID[id])st.done[id]=raw.done[id]|0||1;
    }
  }
  if(raw.progress&&typeof raw.progress==="object"){
    for(const k in raw.progress)st.progress[k]=Math.max(0,raw.progress[k]|0);
  }
  if(raw.zones&&typeof raw.zones==="object"){
    for(const z in raw.zones)if(raw.zones[z])st.zones[z]=true;
  }
  if(raw.bosses&&typeof raw.bosses==="object"){
    for(const b in raw.bosses)if(raw.bosses[b])st.bosses[b]=true;
  }
  if(raw.dungeons&&typeof raw.dungeons==="object"){
    for(const d in raw.dungeons)if(raw.dungeons[d])st.dungeons[d]=true;
  }
  const titles=new Set();
  const borders=new Set();
  for(const d of DEEDS){
    if(!st.done[d.id]||!d.reward)continue;
    if(d.reward.title)titles.add(d.reward.title);
    if(d.reward.border)borders.add(d.reward.border);
  }
  st.activeTitle=(raw.activeTitle&&titles.has(raw.activeTitle))?raw.activeTitle:null;
  st.activeBorder=(raw.activeBorder&&borders.has(raw.activeBorder))?raw.activeBorder:null;
  /* 读档后补检（旧档缺 progress 时按当前状态补发） */
  checkQuestDeeds();
  checkLevelDeeds();
  checkTalentDeed();
  for(const d of DEEDS){
    if(isDeedDone(d.id))continue;
    const n=d.need;
    if(n&&n.type==="zone"&&st.zones[n.id])grantDeed(d.id,{silent:true,noSave:true});
    if(n&&n.type==="dungeon"&&st.dungeons[n.id])grantDeed(d.id,{silent:true,noSave:true});
    if(n&&n.type==="boss"&&st.bosses[n.id])grantDeed(d.id,{silent:true,noSave:true});
    if(n&&n.type==="kill"){
      const cur=st.progress["kill_"+n.mob]|0;
      if(cur>=(n.count|0))grantDeed(d.id,{silent:true,noSave:true});
    }
  }
  updatePlayerNameplate();
}

function resetDeeds(opts){
  S.deeds={done:{},progress:{},zones:{},bosses:{},dungeons:{},activeTitle:null,activeBorder:null};
  applyBorderClass(null);
  if(!(opts&&opts.silent))updatePlayerNameplate();
}

/* DOM 关闭 / 底栏按钮 */
(function bindDeedsUi(){
  const close=$("#deedsClose");
  if(close)close.addEventListener("click",toggleDeedsPanel);
  const btn=$("#deedsBtn");
  if(btn)btn.addEventListener("pointerdown",()=>toggleDeedsPanel());
})();

console.info("[deeds] STEP 25 就绪：功绩之书 · Shift+Z");
