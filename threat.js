/* ============================================================
   熔火之心 · threat.js
   仇恨与职责（STEP 27）：简易 threat 表 · 最高仇恨承伤 · 治疗优先级
   ------------------------------------------------------------
   [依赖] core.js（BAL）· combat.js（S）· companions.js（PARTY）
          world.js / raid.js 运行时（player boss）
   [导出] threatKeyPlayer threatKeyCompanion
          addThreat clearThreat getTopThreatActor applyTaunt
          hitByThreat meleeHitFromThreat
          checkPartyWipe resetWipeFlag
   ============================================================ */
"use strict";

function threatKeyPlayer(){return"player";}
function threatKeyCompanion(c){
  if(!c||typeof PARTY==="undefined")return null;
  const i=PARTY.indexOf(c);
  return i>=0?"c"+i:null;
}

function ensureThreatTable(victim){
  if(!victim)return null;
  if(!victim.threat)victim.threat={};
  return victim.threat;
}

function clearThreat(victim){
  if(!victim)return;
  victim.threat={};
  victim.tauntLock=null;
}

function addThreat(victim,sourceKey,dmg,skillId){
  if(!victim||!sourceKey)return;
  const T=BAL.threat||{};
  const table=ensureThreatTable(victim);
  let amt=(dmg|0)*(T.perDmg!=null?T.perDmg:1);
  if(skillId&&T.flat&&T.flat[skillId])amt+=(T.flat[skillId]|0);
  let mul=1;
  if(sourceKey==="player"){
    mul=(T.roleMul&&T.roleMul.player)||1;
    /* V1-C5：玩家战士按坦克仇恨倍率 */
    if(typeof CLS!=="undefined"&&typeof CLASSES!=="undefined"&&CLS===CLASSES.warrior
      &&T.roleMul&&T.roleMul.playerTank!=null)mul=T.roleMul.playerTank;
  }else if(sourceKey[0]==="c"&&typeof PARTY!=="undefined"){
    const c=PARTY[+sourceKey.slice(1)];
    const role=c&&c.role?c.role:"dps";
    mul=(T.roleMul&&T.roleMul[role])||1;
  }
  table[sourceKey]=(table[sourceKey]|0)+Math.round(amt*mul);
}

/**
 * V1-C5 嘲讽：拉至仇恨顶 + 强制锁定一段时间
 * opts: {dur, margin}
 */
function applyTaunt(victim,sourceKey,opts){
  if(!victim||!sourceKey)return false;
  opts=opts||{};
  const T=BAL.threat||{};
  const table=ensureThreatTable(victim);
  let max=0;
  for(const k in table){const v=table[k]|0;if(v>max)max=v;}
  const margin=opts.margin!=null?opts.margin:(T.tauntMargin!=null?T.tauntMargin:50000);
  table[sourceKey]=max+margin;
  const dur=opts.dur!=null?opts.dur:(T.tauntDur!=null?T.tauntDur:3);
  victim.tauntLock={key:sourceKey,until:(typeof S!=="undefined"?S.t:0)+dur};
  return true;
}

function actorInRange(actor,fromPos,maxR){
  if(!actor||!fromPos||maxR==null)return true;
  if(actor.kind==="player"){
    if(!S.p.alive)return false;
    return Math.hypot(player.position.x-fromPos.x,player.position.z-fromPos.z)<=maxR;
  }
  if(actor.kind==="companion"){
    const c=actor.c;
    if(!c||!c.alive||!c.mesh)return false;
    return Math.hypot(c.mesh.position.x-fromPos.x,c.mesh.position.z-fromPos.z)<=maxR;
  }
  return false;
}

function resolveThreatKey(key){
  if(key==="player")return S.p.alive?{kind:"player"}:null;
  if(key&&key[0]==="c"&&typeof PARTY!=="undefined"){
    const c=PARTY[+key.slice(1)];
    if(c&&c.alive&&c.mesh)return{kind:"companion",c};
  }
  return null;
}

/** 返回仇恨最高且在范围内的承伤者；嘲讽锁定期内优先锁定目标 */
function getTopThreatActor(victim,fromPos,maxR){
  if(victim&&victim.tauntLock&&victim.tauntLock.until>(S.t||0)){
    const locked=resolveThreatKey(victim.tauntLock.key);
    if(locked&&actorInRange(locked,fromPos,maxR))return locked;
  }
  const table=victim&&victim.threat;
  let best=null,bestV=-1;
  if(table){
    for(const k in table){
      const v=table[k]|0;
      if(v<=bestV)continue;
      const actor=resolveThreatKey(k);
      if(!actor)continue;
      if(!actorInRange(actor,fromPos,maxR))continue;
      bestV=v; best=actor;
    }
  }
  if(best)return best;
  if(S.p.alive&&actorInRange({kind:"player"},fromPos,maxR))return{kind:"player"};
  if(typeof pickNearestCompanion==="function"){
    const c=pickNearestCompanion(fromPos,maxR);
    if(c)return{kind:"companion",c};
  }
  if(S.p.alive)return{kind:"player"};
  return null;
}

function hitByThreat(actor,amount,label){
  if(!actor)return;
  if(actor.kind==="companion"&&typeof companionHit==="function")
    companionHit(amount,label,actor.c);
  else if(typeof playerHit==="function")
    playerHit(amount,label);
}

/** 近战按仇恨表打最高者；无表回退玩家 */
function meleeHitFromThreat(victim,fromPos,maxR,amount,label){
  const actor=getTopThreatActor(victim,fromPos,maxR);
  if(actor){hitByThreat(actor,amount,label);return true;}
  if(S.p.alive){playerHit(amount,label);return true;}
  return false;
}

/** 全灭：玩家倒下且无存活同伴 */
function checkPartyWipe(){
  if(S.p.alive)return false;
  if(typeof partyAliveCount==="function"&&partyAliveCount()>0)return false;
  if(S._wipeAnnounced)return true;
  S._wipeAnnounced=true;
  announce("全灭！");
  log("小队全灭——无人能够继续战斗。","lg-dmg");
  if(S.mode==="raid"){
    const sub=$("#deathSub");
    if(sub)sub.textContent="小队全灭……";
  }
  return true;
}

function resetWipeFlag(){S._wipeAnnounced=false;}

console.info("[threat] STEP 27 就绪：仇恨表 · 职责承伤");
