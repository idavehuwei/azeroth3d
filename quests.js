/* ============================================================
   熔火之心 · quests.js
   任务枢纽（STEP 22）：QUESTS[] 注册表 · 前置 · zone · 奖励 · 多条目日志
   ------------------------------------------------------------
   [依赖] core.js（BAL clamp）
          combat.js（S · gainXP gainCopper log announce）
          items.js 运行时（ITEMS）
          world.js / barrens.js 运行时（QUEST BARRENS_QUEST 兼容别名）
          save.js / panels.js 运行时（saveGame renderQuestLog）
   [导出] QUESTS getQuestDef questStatus questProgress
          acceptQuest turnInQuest completeQuestObjective
          onQuestMobKill onQuestBossKill onQuestZoneEnter
          canAcceptQuest canTurnInQuest questsForNpc
          getActiveQuestEntries getQuestLogEntries
          collectQuestSave applyQuestSave resetAllQuests
          syncLegacyQuestAliases applyQuestRewards
          updateQuestTracker updateQuest
   ============================================================ */
"use strict";

/* ---- 静态任务表（加任务 = 加一条；数值引用 BAL） ---- */
const QUESTS=[
  /* —— 主线：莫高雷 → 熔火 → 贫瘠 —— */
  {id:"elder_boars", title:"长老的试炼", subtitle:"狂躁的野猪",
    chapter:"main", zone:"mulgore", sort:10,
    minLevel:1, prereq:[],
    giver:"elder", turnIn:"elder",
    objectives:[{type:"kill", mob:"boar", countKey:"boar"}],
    rewards:{xpKey:"quest", copperKey:"boarCopper", hpMaxKey:"boarHp", dmgMulAddKey:"boarDmg"},
    acceptLog:"接受任务【长老的试炼】：猎杀草原野猪。",
    readyAnnounce:"任务目标完成 · 回去找长老",
    completeAnnounce:"获得 · 大地母亲的祝福",
    next:"ragnaros_whisper"},
  {id:"ragnaros_whisper", title:"炎魔的低语", subtitle:"讨伐拉戈斯",
    chapter:"main", zone:"molten_core", sort:20,
    minLevel:1, prereq:["elder_boars"],
    giver:"elder", turnIn:null, autoComplete:true,
    objectives:[{type:"boss", bossId:"ragnaros", countKey:"boss"}],
    rewards:{xpKey:null, copper:0},
    acceptLog:"接受任务【炎魔的低语】：进入北方传送门，击败炎魔领主拉戈斯。",
    completeAnnounce:"炎魔的低语 · 完成",
    completeLog:"拉戈斯沉回熔岩——长老的预言应验了。"},
  {id:"crossroads_trouble", title:"十字路口的麻烦",
    chapter:"main", zone:"barrens", sort:30,
    minLevel:10, prereq:[],
    giver:"crossroads", turnIn:"crossroads",
    objectives:[{type:"kill", mob:"quilboar", countKey:"quilboar"}],
    rewards:{xpKey:"barrensQuest", copperKey:"barrensCopper"},
    acceptLog:"接受任务【十字路口的麻烦】：清剿野猪人斥候。",
    readyAnnounce:"任务目标完成 · 回十字路口找哨兵",
    completeAnnounce:"完成 · 十字路口的麻烦"},

  /* —— 莫高雷支线 —— */
  {id:"plains_patrol", title:"草原巡视",
    chapter:"side", zone:"mulgore", sort:40,
    minLevel:3, prereq:["elder_boars"],
    giver:"elder", turnIn:"elder",
    objectives:[{type:"kill", mob:"wolf", countKey:"plains_patrol"}],
    rewards:{sideKey:"plains_patrol"},
    acceptLog:"接受任务【草原巡视】：猎杀草原狼 0/5。",
    readyAnnounce:"草原巡视目标完成 · 回长老处"},
  {id:"harpy_nest", title:"鹰身女妖的巢穴",
    chapter:"side", zone:"mulgore", sort:50,
    minLevel:6, prereq:["elder_boars"],
    giver:"elder", turnIn:"elder",
    objectives:[{type:"kill", mob:"harpy", countKey:"harpy_nest"}],
    rewards:{sideKey:"harpy_nest"},
    acceptLog:"接受任务【鹰身女妖的巢穴】：消灭东边的鹰身女妖首领。",
    readyAnnounce:"鹰身女妖已除 · 回长老处"},
  {id:"greyjaw_bounty", title:"老灰鬃的悬赏",
    chapter:"side", zone:"mulgore", sort:60,
    minLevel:8, prereq:["elder_boars"],
    giver:"vendor", turnIn:"vendor",
    objectives:[{type:"kill", mob:"boarKing", countKey:"greyjaw_bounty"}],
    rewards:{sideKey:"greyjaw_bounty"},
    acceptLog:"接受任务【老灰鬃的悬赏】：猎人商人要那头稀有野猪王的獠牙。",
    readyAnnounce:"老灰鬃倒下了 · 回商人处领赏"},

  /* —— 贫瘠之地支线 —— */
  {id:"supply_run", title:"失落的补给",
    chapter:"side", zone:"barrens", sort:70,
    minLevel:10, prereq:["crossroads_trouble"],
    giver:"crossroads", turnIn:"crossroads",
    objectives:[{type:"kill", mob:"zebra", countKey:"supply_run"}],
    rewards:{sideKey:"supply_run"},
    acceptLog:"接受任务【失落的补给】：猎杀斑马，为十字路口收集肉干。",
    readyAnnounce:"肉干够了 · 回哨兵处"},
  {id:"centaur_threat", title:"半人马的威胁",
    chapter:"side", zone:"barrens", sort:80,
    minLevel:12, prereq:["crossroads_trouble"],
    giver:"crossroads", turnIn:"crossroads",
    objectives:[{type:"kill", mob:"centaur", countKey:"centaur_threat"}],
    rewards:{sideKey:"centaur_threat"},
    acceptLog:"接受任务【半人马的威胁】：清剿东南半人马营地。",
    readyAnnounce:"半人马已退 · 回哨兵处"},
  {id:"wailing_call", title:"洞穴的呼唤",
    chapter:"side", zone:"barrens", sort:90,
    minLevel:15, prereq:["crossroads_trouble"],
    giver:"crossroads", turnIn:"crossroads",
    objectives:[{type:"enter", zone:"wailing_caverns", countKey:"wailing_call"}],
    rewards:{sideKey:"wailing_call"},
    acceptLog:"接受任务【洞穴的呼唤】：踏入南方哀嚎洞穴一探究竟。",
    readyAnnounce:"你已踏入洞穴 · 回哨兵汇报",
    autoReadyOnEnter:true},

  /* —— 哀嚎洞穴 —— */
  {id:"wailing_cobrahn", title:"毒牙领主",
    chapter:"dungeon", zone:"wailing_caverns", sort:100,
    minLevel:15, prereq:["crossroads_trouble"],
    giver:null, turnIn:null, autoComplete:true,
    objectives:[{type:"boss", bossId:"cobrahn", countKey:"boss"}],
    rewards:{xpKey:null, copper:0},
    acceptLog:"任务【毒牙领主】：击败考布莱恩。",
    completeAnnounce:"毒牙领主已除",
    next:"wailing_verdan"},
  {id:"wailing_verdan", title:"吞噬永生",
    chapter:"dungeon", zone:"wailing_caverns", sort:110,
    minLevel:15, prereq:["wailing_cobrahn"],
    giver:null, turnIn:null, autoComplete:true,
    objectives:[{type:"boss", bossId:"verdan", countKey:"boss"}],
    rewards:{xpKey:null, copper:0},
    acceptLog:"任务【吞噬永生】：击败吞噬者。",
    completeAnnounce:"哀嚎洞穴肃清"},

  /* —— 熔火支线 —— */
  {id:"magmadar_hunt", title:"熔岩猎犬",
    chapter:"dungeon", zone:"molten_core", sort:120,
    minLevel:5, prereq:["elder_boars"],
    giver:null, turnIn:null, autoComplete:true,
    objectives:[{type:"boss", bossId:"magmadar", countKey:"boss"}],
    rewards:{xpKey:null, copper:0},
    acceptLog:"任务【熔岩猎犬】：击败玛格曼达。",
    completeAnnounce:"玛格曼达已倒下"},
];

const QUEST_BY_ID={};
QUESTS.forEach(q=>{QUEST_BY_ID[q.id]=q;});

/** 目标数量：优先 BAL，其次定义表 */
function objectiveCount(obj){
  if(obj.count!=null)return obj.count|0;
  if(obj.countKey==="boar")return BAL.quest.boarKills|0;
  if(obj.countKey==="quilboar")return(BAL.quest.barrens&&BAL.quest.barrens.quilboarKills)|0;
  if(obj.countKey==="boss")return 1;
  if(obj.countKey&&BAL.quest.side&&BAL.quest.side[obj.countKey])
    return BAL.quest.side[obj.countKey].kills|0;
  return 1;
}

function getQuestDef(id){return QUEST_BY_ID[id]||null;}

function ensureQuestState(){
  if(!S.quests)S.quests={};
  return S.quests;
}

function questProgress(id){
  const st=ensureQuestState();
  if(!st[id])st[id]={status:"none",kills:0,flags:{}};
  return st[id];
}

function questStatus(id){return questProgress(id).status;}

function prereqMet(q){
  if(!q)return false;
  if(q.minLevel&&S.p.level<(q.minLevel|0))return false;
  const pre=q.prereq||[];
  for(const id of pre){
    if(questStatus(id)!=="done")return false;
  }
  return true;
}

function canAcceptQuest(id){
  const q=getQuestDef(id);
  if(!q)return false;
  if(questStatus(id)!=="none")return false;
  return prereqMet(q);
}

function canTurnInQuest(id){
  return questStatus(id)==="ready";
}

function objectiveProgressText(q,prog){
  const obj=q.objectives&&q.objectives[0];
  if(!obj)return "";
  if(obj.type==="kill"){
    const need=objectiveCount(obj);
    const n=Math.min(prog.kills|0,need);
    const names={boar:"草原野猪",quilboar:"野猪人斥候",wolf:"草原狼",zebra:"斑马",
      centaur:"半人马",harpy:"鹰身女妖",boarKing:"老灰鬃"};
    return `猎杀${names[obj.mob]||obj.mob} ${n}/${need}`;
  }
  if(obj.type==="boss"){
    const names={ragnaros:"炎魔领主拉戈斯",magmadar:"玛格曼达",cobrahn:"考布莱恩",verdan:"吞噬者"};
    return prog.status==="done"||(prog.kills|0)>=1
      ?`已击败${names[obj.bossId]||obj.bossId}`
      :`击败${names[obj.bossId]||obj.bossId}`;
  }
  if(obj.type==="enter"){
    return(prog.kills|0)>=1?"已进入目标区域":"进入目标区域";
  }
  return "";
}

function applyQuestRewards(q,opts){
  opts=opts||{};
  if(!q||!q.rewards)return;
  const r=q.rewards;
  const side=r.sideKey&&BAL.quest.side?BAL.quest.side[r.sideKey]:null;
  if(!opts.skipXp){
    let xp=0;
    if(side&&side.xp!=null)xp=side.xp|0;
    else if(r.xp!=null)xp=r.xp|0;
    else if(r.xpKey&&BAL.levels.xp[r.xpKey]!=null)xp=BAL.levels.xp[r.xpKey]|0;
    if(xp&&typeof gainXP==="function")gainXP(xp);
  }
  if(!opts.skipCopper){
    let copper=0;
    if(side&&side.copper!=null)copper=side.copper|0;
    else if(r.copper!=null)copper=r.copper|0;
    else if(r.copperKey==="boarCopper")copper=BAL.quest.rewardCopper|0;
    else if(r.copperKey==="barrensCopper")copper=(BAL.quest.barrens&&BAL.quest.barrens.rewardCopper)|0;
    if(copper&&typeof gainCopper==="function")gainCopper(copper,{noSave:true});
  }
  if(!opts.skipStats){
    let hp=0;
    if(r.hpMax!=null)hp=r.hpMax|0;
    else if(r.hpMaxKey==="boarHp")hp=BAL.quest.rewardHp|0;
    if(hp){S.p.hpMax+=hp; if(!opts.keepHp)S.p.hp=S.p.hpMax; else S.p.hp=Math.min(S.p.hpMax,S.p.hp);}

    let dmgAdd=0;
    if(r.dmgMulAdd!=null)dmgAdd=+r.dmgMulAdd;
    else if(r.dmgMulAddKey==="boarDmg")dmgAdd=(BAL.quest.rewardDmgMul||1)-1;
    if(dmgAdd)S.p.dmgMul+=dmgAdd;

    if(!opts.silent&&(hp||dmgAdd)){
      const bits=[];
      if(hp)bits.push(`生命上限 +${hp}`);
      if(dmgAdd)bits.push(`伤害 +${Math.round(dmgAdd*100)}%`);
      if(bits.length)log(`奖励：${bits.join("，")}！`,"lg-heal");
    }
  }
  if(!opts.skipItems&&Array.isArray(r.items)){
    for(const id of r.items){
      if(ITEMS[id]&&S.inv.length<BAL.bag.size&&!S.inv.includes(id)&&S.eq.weapon!==id&&S.eq.armor!==id)
        S.inv.push(id);
    }
  }
}

function acceptQuest(id,opts){
  opts=opts||{};
  const q=getQuestDef(id);
  if(!q||!canAcceptQuest(id))return false;
  const prog=questProgress(id);
  prog.status="active";
  prog.kills=0;
  prog.flags={};
  if(q.acceptLog&&!opts.silent)log(q.acceptLog,"lg-sys");
  if(!opts.silent)announce(`接受任务 · ${q.title}`);
  if(!opts.silent&&typeof SFX!=="undefined"&&SFX.playUI)SFX.playUI("quest_accept");
  /* 无交任务 NPC 的自动任务：接受后即跟踪 */
  if(q.autoComplete&&q.objectives&&q.objectives[0]&&q.objectives[0].type==="boss"){
    /* 保持 active，等 boss 击杀 */
  }
  syncLegacyQuestAliases();
  updateQuestTracker();
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
  return true;
}

function markQuestReady(id,opts){
  opts=opts||{};
  const q=getQuestDef(id);
  const prog=questProgress(id);
  if(!q||prog.status!=="active")return false;
  if(q.autoComplete||!q.turnIn){
    return finishQuest(id,opts);
  }
  prog.status="ready";
  if(q.readyAnnounce&&!opts.silent)announce(q.readyAnnounce);
  syncLegacyQuestAliases();
  updateQuestTracker();
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
  return true;
}

function finishQuest(id,opts){
  opts=opts||{};
  const q=getQuestDef(id);
  const prog=questProgress(id);
  if(!q)return false;
  if(prog.status!=="active"&&prog.status!=="ready")return false;
  prog.status="done";
  if(!opts.skipRewards)applyQuestRewards(q,opts);
  if(q.completeAnnounce&&!opts.silent)announce(q.completeAnnounce);
  if(q.completeLog&&!opts.silent)log(q.completeLog,"lg-sys");
  if(!opts.silent&&typeof SFX!=="undefined"&&SFX.playUI)SFX.playUI("quest_complete");
  syncLegacyQuestAliases();
  updateQuestTracker();
  if(q.next&&canAcceptQuest(q.next))acceptQuest(q.next,{silent:opts.silent,noSave:true});
  if(typeof onDeedQuestComplete==="function")onDeedQuestComplete(id);
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
  return true;
}

function turnInQuest(id,opts){
  if(!canTurnInQuest(id))return false;
  return finishQuest(id,opts);
}

function completeQuestObjective(id,amount,opts){
  opts=opts||{};
  const q=getQuestDef(id);
  const prog=questProgress(id);
  if(!q||prog.status!=="active")return false;
  const obj=q.objectives&&q.objectives[0];
  if(!obj)return false;
  const need=objectiveCount(obj);
  prog.kills=Math.min(need,(prog.kills|0)+(amount|0||1));
  if(prog.kills>=need)markQuestReady(id,opts);
  else{
    syncLegacyQuestAliases();
    updateQuestTracker();
    if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
  }
  return true;
}

function onQuestMobKill(m){
  if(!m||!m.type)return;
  for(const q of QUESTS){
    if(questStatus(q.id)!=="active")continue;
    const obj=q.objectives&&q.objectives[0];
    if(!obj||obj.type!=="kill")continue;
    if(obj.mob!==m.type)continue;
    completeQuestObjective(q.id,1);
  }
}

function onQuestBossKill(bossId){
  if(!bossId)return;
  for(const q of QUESTS){
    if(questStatus(q.id)!=="active")continue;
    const obj=q.objectives&&q.objectives[0];
    if(!obj||obj.type!=="boss")continue;
    if(obj.bossId!==bossId)continue;
    completeQuestObjective(q.id,1,{silent:false});
  }
}

function onQuestZoneEnter(zoneId){
  if(!zoneId)return;
  /* 踏入副本时自动接取副本内任务（洞穴的呼唤仍由哨兵发放） */
  if(zoneId==="wailing_caverns"){
    if(canAcceptQuest("wailing_cobrahn"))acceptQuest("wailing_cobrahn",{silent:true,noSave:true});
  }
  if(zoneId==="molten_core"){
    if(canAcceptQuest("magmadar_hunt"))acceptQuest("magmadar_hunt",{silent:true,noSave:true});
    if(canAcceptQuest("ragnaros_whisper"))acceptQuest("ragnaros_whisper",{silent:true,noSave:true});
  }
  for(const q of QUESTS){
    if(questStatus(q.id)!=="active")continue;
    const obj=q.objectives&&q.objectives[0];
    if(!obj||obj.type!=="enter")continue;
    if(obj.zone!==zoneId)continue;
    completeQuestObjective(q.id,1,{noSave:true});
  }
  if(typeof saveGame==="function")saveGame(true);
}

function questsForNpc(npcId){
  return QUESTS.filter(q=>{
    if(q.giver===npcId&&canAcceptQuest(q.id))return true;
    if(q.turnIn===npcId&&canTurnInQuest(q.id))return true;
    return false;
  }).sort((a,b)=>(a.sort||0)-(b.sort||0));
}

function getActiveQuestEntries(){
  const out=[];
  for(const q of QUESTS){
    const st=questStatus(q.id);
    if(st!=="active"&&st!=="ready")continue;
    const prog=questProgress(q.id);
    out.push({
      id:q.id, title:q.title, zone:q.zone, chapter:q.chapter,
      obj:objectiveProgressText(q,prog),
      done:st==="ready",
      tip:st==="ready"
        ?(q.turnIn?`回去找任务人交任务`:`目标已完成`)
        :(q.subtitle||q.title),
      status:st, sort:q.sort||0,
    });
  }
  return out.sort((a,b)=>a.sort-b.sort);
}

function getQuestLogEntries(){
  const active=getActiveQuestEntries();
  const done=[];
  for(const q of QUESTS){
    if(questStatus(q.id)!=="done")continue;
    done.push({
      id:q.id, title:q.title, zone:q.zone, chapter:q.chapter,
      obj:q.subtitle?`${q.subtitle} · 已完成`:"已完成",
      done:true, tip:"任务完成", status:"done", sort:q.sort||0,
    });
  }
  done.sort((a,b)=>a.sort-b.sort);
  return active.concat(done);
}

/** 兼容旧 QUEST / BARRENS_QUEST 状态机（对话与测试过渡期） */
function syncLegacyQuestAliases(){
  if(typeof QUEST!=="undefined"){
    const boar=questStatus("elder_boars");
    const whisper=questStatus("ragnaros_whisper");
    const bk=questProgress("elder_boars").kills|0;
    if(whisper==="done"){QUEST.state=3;QUEST.kills=BAL.quest.boarKills;}
    else if(whisper==="active"||whisper==="ready"){QUEST.state=2;QUEST.kills=BAL.quest.boarKills;}
    else if(boar==="done"){QUEST.state=2;QUEST.kills=BAL.quest.boarKills;}
    else if(boar==="active"||boar==="ready"){QUEST.state=1;QUEST.kills=bk;}
    else{QUEST.state=0;QUEST.kills=0;}
  }
  if(typeof BARRENS_QUEST!=="undefined"){
    const st=questStatus("crossroads_trouble");
    const k=questProgress("crossroads_trouble").kills|0;
    if(st==="done"){BARRENS_QUEST.state=2;BARRENS_QUEST.kills=BAL.quest.barrens.quilboarKills;}
    else if(st==="active"||st==="ready"){BARRENS_QUEST.state=1;BARRENS_QUEST.kills=k;}
    else{BARRENS_QUEST.state=0;BARRENS_QUEST.kills=0;}
  }
}

function collectQuestSave(){
  const out={};
  const st=ensureQuestState();
  for(const id in st){
    const p=st[id];
    if(!p||p.status==="none")continue;
    out[id]={status:p.status,kills:p.kills|0};
  }
  return out;
}

function applyQuestSave(rawQuests,legacy){
  resetAllQuests({silent:true});
  const st=ensureQuestState();
  if(rawQuests&&typeof rawQuests==="object"){
    for(const id in rawQuests){
      if(!QUEST_BY_ID[id])continue;
      const r=rawQuests[id];
      if(!r||typeof r!=="object")continue;
      const status=["none","active","ready","done"].includes(r.status)?r.status:"none";
      if(status==="none")continue;
      st[id]={status,kills:Math.max(0,r.kills|0),flags:{}};
    }
  }else if(legacy){
    /* v1：quest.state / barrensQuest.state → 新表 */
    const qs=legacy.quest||{};
    const state=qs.state|0, kills=qs.kills|0;
    if(state===1)st.elder_boars={status:kills>=BAL.quest.boarKills?"ready":"active",kills,flags:{}};
    else if(state===2){
      st.elder_boars={status:"done",kills:BAL.quest.boarKills,flags:{}};
      st.ragnaros_whisper={status:"active",kills:0,flags:{}};
    }else if(state>=3){
      st.elder_boars={status:"done",kills:BAL.quest.boarKills,flags:{}};
      st.ragnaros_whisper={status:"done",kills:1,flags:{}};
    }
    const bq=legacy.barrensQuest||{};
    const bs=bq.state|0, bk=bq.kills|0;
    const need=BAL.quest.barrens.quilboarKills|0;
    if(bs===1)st.crossroads_trouble={status:bk>=need?"ready":"active",kills:bk,flags:{}};
    else if(bs>=2)st.crossroads_trouble={status:"done",kills:need,flags:{}};
  }
  /* 已完成任务的永久属性奖励回放（不重复发经验/铜币） */
  if(questStatus("elder_boars")==="done"){
    applyQuestRewards(getQuestDef("elder_boars"),{silent:true,skipXp:true,skipCopper:true,skipItems:true,keepHp:true});
  }
  syncLegacyQuestAliases();
}

function resetAllQuests(opts){
  S.quests={};
  syncLegacyQuestAliases();
  if(!(opts&&opts.silent))updateQuestTracker();
}

function updateQuestTracker(){
  const qel=typeof $==="function"?$("#quest"):null;
  if(!qel)return;
  const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
  let list=getActiveQuestEntries();
  /* 当前区域任务优先，其次主线，最多显示 3 条 */
  list=list.slice().sort((a,b)=>{
    const az=a.zone===zid?-1:0, bz=b.zone===zid?-1:0;
    if(az!==bz)return az-bz;
    const ac=a.chapter==="main"?-1:0, bc=b.chapter==="main"?-1:0;
    if(ac!==bc)return ac-bc;
    return a.sort-b.sort;
  }).slice(0,(BAL.quest.trackerMax|0)||3);
  if(!list.length){
    qel.style.display="none";
    if(typeof renderQuestLog==="function")renderQuestLog();
    return;
  }
  qel.innerHTML=list.map(e=>
    `<div class="qt${e.done?" qd":""}">${e.done?"✔ ":""}任务 · ${e.title}</div>`+
    `<div class="qo">${e.obj}</div>`+
    (e.done?`<div class="qd">${e.tip}</div>`:"")
  ).join("");
  qel.style.display="block";
  if(typeof renderQuestLog==="function")renderQuestLog();
  if(typeof setMarker==="function")setMarker();
  if(typeof updateBarrensMarkers==="function")updateBarrensMarkers();
}

/* 兼容旧名 */
function updateQuest(){updateQuestTracker();}
