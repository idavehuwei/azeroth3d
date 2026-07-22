/* ============================================================
   熔火之心 · companions.js
   AI 队友（STEP 20）· 3 人小队框架（STEP 26）：玩家 + 最多 2 AI
   队伍栏 · 职责槽 · 共享集火 · 小队经验加成
   治疗职责优先级（STEP 27）与 threat.js 协作
   ------------------------------------------------------------
   [依赖] THREE · core.js（BAL $ clamp rand R scene makeLabel）
          combat.js（S CLASSES CLS log announce fct getFocusTarget setCurrentTarget
            isTargetAlive）
          threat.js 运行时（threatKeyCompanion checkPartyWipe）
          world.js（player MOBS）· main/raid 运行时 · save.js · vfx/sfx
   [导出] PARTY COMPANION（兼容：首名同伴）
          recruitCompanion dismissCompanion dismissAllCompanions companionAlive
          formParty partySize partyAliveCount
          tickCompanion companionHit transferCompanionZone
          openRecruitDialogue getCompanionSave restoreCompanion
          updateCompanionHud disposeCompanionMesh
   ============================================================ */
"use strict";

/** @type {Array<object>} STEP 26：最多 BAL.party.aiSlots 名 AI */
const PARTY=[];
/** 兼容旧代码：指向 PARTY[0] */
let COMPANION=null;
function syncCompanionAlias(){COMPANION=PARTY[0]||null;}

const CMP_NAMES={
  warrior:"同伴 · 石盾",
  mage:"同伴 · 余烬",
  archer:"同伴 · 疾羽",
  priest:"同伴 · 晨光",
  shaman:"同伴 · 风暴",
  rogue:"同伴 · 影刃",
};
const ROLE_ICON={tank:"🛡",healer:"✚",dps:"⚔"};

function partySize(){return PARTY.length;}
function partyAliveCount(){return PARTY.filter(c=>c&&c.alive&&c.mesh).length;}
function companionAlive(){return partyAliveCount()>0;}
function aiSlotMax(){return(BAL.party&&BAL.party.aiSlots)|2;}

function disposeCompanionMesh(c){
  if(!c)return;
  if(c.label){
    if(c.label.parent)c.label.parent.remove(c.label);
    if(c.label.material){
      if(c.label.material.map)c.label.material.map.dispose();
      c.label.material.dispose();
    }
  }
  if(c.mesh){
    if(c.mesh.parent)c.mesh.parent.remove(c.mesh);
    c.mesh.traverse(o=>{
      if(o.geometry)o.geometry.dispose();
      if(o.material){
        if(Array.isArray(o.material))o.material.forEach(m=>m&&m.dispose&&m.dispose());
        else if(o.material.dispose)o.material.dispose();
      }
    });
  }
}

function dismissAllCompanions(opts){
  opts=opts||{};
  while(PARTY.length){
    const c=PARTY.pop();
    disposeCompanionMesh(c);
  }
  syncCompanionAlias();
  updateCompanionHud();
  if(!opts.silent){
    log("小队已解散。","lg-sys");
    announce("小队解散");
  }
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
}

function dismissCompanion(opts){
  opts=opts||{};
  /* 无参：解散全部（兼容旧调用）；有 index/classKey 解散单个 */
  if(opts.index==null&&!opts.classKey&&!opts.one){
    if(!PARTY.length)return;
    dismissAllCompanions(opts);
    return;
  }
  let i=-1;
  if(opts.index!=null)i=opts.index|0;
  else if(opts.classKey)i=PARTY.findIndex(c=>c.classKey===opts.classKey);
  else if(opts.one)i=PARTY.length-1;
  if(i<0||i>=PARTY.length)return;
  const c=PARTY.splice(i,1)[0];
  disposeCompanionMesh(c);
  syncCompanionAlias();
  updateCompanionHud();
  if(!opts.silent){
    log(`${CMP_NAMES[c.classKey]||"同伴"}已离开小队。`,"lg-sys");
  }
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
}

function spawnOffsetForIndex(idx){
  const offs=BAL.party&&BAL.party.spawnOffsets;
  if(offs&&offs[idx])return offs[idx];
  return BAL.companion.spawnOffset||{x:2.2,z:1.4};
}

function recruitCompanion(classKey,opts){
  opts=opts||{};
  if(!CLASSES[classKey]){log("未知职业，无法招募。","lg-sys");return false;}
  const max=aiSlotMax();
  if(PARTY.length>=max){
    if(opts.replace)dismissCompanion({index:0,silent:true,noSave:true});
    else{log(`小队已满（最多 ${max} 名同伴）。`,"lg-sys");return false;}
  }
  /* 旧行为：单人时招募会替换 —— 仅当 max===1 或显式 replace */
  if(opts.replaceAll)dismissAllCompanions({silent:true,noSave:true});

  const C=BAL.companion;
  const cls=CLASSES[classKey];
  const idx=PARTY.length;
  const off=spawnOffsetForIndex(idx);
  const mesh=cls.build();
  mesh.position.set(
    player.position.x+(off.x||2),
    0,
    player.position.z+(off.z||1.5)
  );
  if(typeof clampArena==="function")clampArena(mesh.position);
  scene.add(mesh);
  const role=opts.role||guessRole(classKey);
  const name=CMP_NAMES[classKey]||"同伴";
  const label=makeNameplate(`${ROLE_ICON[role]||""} ${name}`,S.p.level,{w:5.8,friendly:true,color:"#b8e0ff",glow:"rgba(80,140,220,.9)"});
  label.position.set(mesh.position.x,3.6,mesh.position.z);
  scene.add(label);

  const hpMax=Math.round(cls.hp*(C.hpMul||.72));
  updateNameplateHp(label,hpMax,hpMax);
  const member={
    classKey, role, mesh, label, cls,
    hp:hpMax, hpMax,
    rage:cls.resStart, rageMax:cls.resMax,
    alive:true,
    state:"FOLLOW",
    atkTimer:C.atkTimerStart||.4, healCd:0,
    face:0, walkPhase:0, attackAnim:0,
    reviveT:0, moving:false,
  };
  PARTY.push(member);
  syncCompanionAlias();
  updateCompanionHud();
  if(!opts.silent){
    const rl=(BAL.party.roleLabel&&BAL.party.roleLabel[role])||role;
    announce(`招募 · ${name}`);
    log(`【${name}】加入小队（${rl}）。当前 ${1+PARTY.length}/3 人。`,"lg-sys");
  }
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
  return true;
}

function guessRole(classKey){
  if(classKey==="warrior")return"tank";
  if(classKey==="priest"||classKey==="shaman")return"healer";
  return"dps";
}

/** 一键组成 3 人小队：按玩家职业补齐 2 个职责 */
function formParty(opts){
  opts=opts||{};
  const fill=BAL.party&&BAL.party.fill;
  const ck=typeof talentClassKey==="function"?talentClassKey():(S.talents&&S.talents.classKey)||"warrior";
  const plan=fill&&fill[ck]?fill[ck]:fill.warrior;
  dismissAllCompanions({silent:true,noSave:true});
  let ok=true;
  for(const slot of plan){
    if(!recruitCompanion(slot.classKey,{role:slot.role,silent:true,noSave:true}))ok=false;
  }
  if(!opts.silent){
    announce("小队集结");
    log(`3 人小队已组成（你 + ${PARTY.map(c=>CMP_NAMES[c.classKey]).join(" · ")}）。自由拾取，共享集火目标。`,"lg-sys");
  }
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
  return ok;
}

function getCompanionSave(){
  if(!PARTY.length)return null;
  /* 新格式：数组；旧读档仍接受单对象 */
  return PARTY.map(c=>({classKey:c.classKey,hp:Math.round(c.hp),role:c.role||guessRole(c.classKey)}));
}

function restoreCompanion(data){
  dismissAllCompanions({silent:true,noSave:true});
  if(!data)return;
  const list=Array.isArray(data)?data:[data];
  for(const row of list){
    if(!row||!row.classKey||!CLASSES[row.classKey])continue;
    recruitCompanion(row.classKey,{role:row.role||guessRole(row.classKey),silent:true,noSave:true});
    const c=PARTY[PARTY.length-1];
    if(c&&typeof row.hp==="number"&&isFinite(row.hp))c.hp=clamp(row.hp,1,c.hpMax);
  }
  updateCompanionHud();
}

function transferCompanionZone(toScene,gate){
  if(!toScene||!PARTY.length)return;
  const gx=gate&&gate.x!=null?gate.x:player.position.x;
  const gz=gate&&gate.z!=null?gate.z:player.position.z;
  PARTY.forEach((c,i)=>{
    if(!c.mesh)return;
    if(c.mesh.parent)c.mesh.parent.remove(c.mesh);
    if(c.label&&c.label.parent)c.label.parent.remove(c.label);
    toScene.add(c.mesh);
    if(c.label)toScene.add(c.label);
    const off=spawnOffsetForIndex(i);
    c.mesh.position.set(gx+(off.x||2),0,gz+(off.z||1.5));
    if(typeof clampArena==="function")clampArena(c.mesh.position);
    if(c.label){
      c.label.position.set(c.mesh.position.x,3.6,c.mesh.position.z);
      if(typeof updateNameplateHp==="function")updateNameplateHp(c.label,c.hp,c.hpMax);
    }
    if(c.alive)c.state="FOLLOW";
  });
}

function companionHit(amount,source,target){
  const c=target||pickNearestCompanion(null,999);
  if(!c||!c.alive)return;
  amount=Math.round(amount*R(BAL.variance.player));
  c.hp-=amount;
  fct(c.mesh.position.clone().setY(3),`-${amount}`,"#ff8a7a",15);
  if(typeof SFX!=="undefined")SFX.play("hit");
  log(`${source} 击中了${CMP_NAMES[c.classKey]||"同伴"}，造成 ${amount} 点伤害！`,"lg-dmg");
  if(c.hp<=0){
    c.hp=0; c.alive=false; c.state="IDLE";
    c.reviveT=BAL.companion.reviveT;
    if(typeof beginDeathRoll==="function")beginDeathRoll(c);
    else{c.mesh.rotation.z=Math.PI/2; c.mesh.position.y=.25;}
    if(c.label)c.label.visible=false;
    announce("同伴倒下了！");
    log(`${CMP_NAMES[c.classKey]||"同伴"}倒下了，将在 ${BAL.companion.reviveT} 秒后振作。`,"lg-sys");
    if(typeof checkPartyWipe==="function")checkPartyWipe();
  }
  updateCompanionHud();
}

/** 选取在 pos 附近的存活同伴（供野怪/Boss 溅射） */
function pickNearestCompanion(fromPos,maxR){
  let best=null,bd=maxR!=null?maxR:999;
  const ox=fromPos?fromPos.x:player.position.x;
  const oz=fromPos?fromPos.z:player.position.z;
  for(const c of PARTY){
    if(!c||!c.alive||!c.mesh)continue;
    const d=Math.hypot(c.mesh.position.x-ox,c.mesh.position.z-oz);
    if(d<bd){bd=d;best=c;}
  }
  return best;
}

function companionDeal(c,tgt,amount,label){
  if(!tgt)return;
  amount=Math.round(amount*(BAL.companion.dmgMul||1));
  const thr={sourceKey:typeof threatKeyCompanion==="function"?threatKeyCompanion(c):null,skillId:"companionAuto"};
  if(tgt.type==="mob")mobDamage(tgt.m,amount,label,thr);
  else if(tgt.type==="boss")dmgBoss(amount,label,thr);
  else if(tgt.type==="add")addDamage(tgt.a,amount,thr);
}

function companionFireShot(c,tgt,dmg,label){
  if(!c||!tgt)return;
  const color=c.cls.shotColor||0xfff0a0;
  if(typeof SFX!=="undefined")SFX.play(c.cls.sfx||"fireball");
  const m=new THREE.Mesh(new THREE.SphereGeometry(.28,8,8),
    new THREE.MeshBasicMaterial({color}));
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.5,8,8),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:.32}));
  m.add(glow);
  m.position.copy(c.mesh.position); m.position.y=1.85;
  scene.add(m);
  S.pShots.push({
    mesh:m,tgt,dmg:Math.round(dmg*(BAL.companion.dmgMul||1)),label,speed:26,shotColor:color,
    sourceKey:typeof threatKeyCompanion==="function"?threatKeyCompanion(c):null,
    skillId:"companionAuto",
  });
}

function companionApplyHeal(healer,targetIsPlayer,ally,amount,label){
  const heal=Math.round(amount*(BAL.companion.healMul||1));
  if(targetIsPlayer){
    if(!S.p.alive||S.p.hp>=S.p.hpMax)return false;
    S.p.hp=Math.min(S.p.hpMax,S.p.hp+heal);
    fct(player.position.clone().setY(3),`+${heal}`,"#8aff9a",16);
    if(typeof VFX!=="undefined")VFX.spawn("heal_cross",{pos:player.position.clone().setY(1.4)});
  }else if(ally&&ally.alive){
    if(ally.hp>=ally.hpMax)return false;
    ally.hp=Math.min(ally.hpMax,ally.hp+heal);
    fct(ally.mesh.position.clone().setY(3),`+${heal}`,"#8aff9a",15);
    if(typeof VFX!=="undefined")VFX.spawn("heal_cross",{pos:ally.mesh.position.clone().setY(1.4)});
  }else return false;
  if(typeof SFX!=="undefined")SFX.play("heal");
  log(`${CMP_NAMES[healer.classKey]}施放【${label}】，恢复 ${heal} 点生命。`,"lg-heal");
  updateCompanionHud();
  return true;
}

function companionMoveToward(c,dest,spd,dt){
  const dx=dest.x-c.mesh.position.x, dz=dest.z-c.mesh.position.z;
  const d=Math.hypot(dx,dz);
  if(d<0.15){c.moving=false;return d;}
  const step=Math.min(d,spd*dt);
  c.mesh.position.x+=dx/d*step;
  c.mesh.position.z+=dz/d*step;
  c.face=Math.atan2(dx,dz);
  c.mesh.rotation.y=c.face;
  c.moving=true;
  if(typeof clampArena==="function")clampArena(c.mesh.position);
  return d-step;
}

function companionTryHeal(c,dt){
  const C=BAL.companion;
  const T=BAL.threat||{};
  if((c.classKey!=="priest"&&c.classKey!=="shaman")||c.healCd>0)return false;
  const tankPct=T.healTankHpPct!=null?T.healTankHpPct:.30;
  const selfPct=T.healSelfHpPct!=null?T.healSelfHpPct:.40;
  const dpsPct=T.healDpsHpPct!=null?T.healDpsHpPct:.50;
  const isShaman=c.classKey==="shaman";
  const bigHeal=getSkillBal(isShaman?"healingWave":"heal");
  const smallHeal=getSkillBal(isShaman?"healingWave":"flashHeal");
  const bigLabel=isShaman?"治疗波":"治疗术";
  const smallLabel=isShaman?"治疗波":"快速治疗";

  /* 找坦克职责同伴；若无坦克槽则战士玩家视为坦克 */
  let tank=null;
  for(const o of PARTY){
    if(o&&o.alive&&o.role==="tank"){tank=o;break;}
  }
  const playerIsTank=!tank&&CLS===CLASSES.warrior;

  let amount,label,ok=false;
  c.state="HEAL";
  c.attackAnim=1;

  /* 1) 坦克 <30% */
  if(tank&&(tank.hp/tank.hpMax)<tankPct){
    amount=R(bigHeal.heal);
    ok=companionApplyHeal(c,false,tank,amount,bigLabel);
  }else if(playerIsTank&&S.p.alive&&(S.p.hp/S.p.hpMax)<tankPct){
    amount=R(smallHeal.heal);
    ok=companionApplyHeal(c,true,null,amount,smallLabel);
  }
  /* 2) 自己 <40% */
  else if((c.hp/c.hpMax)<selfPct){
    amount=R(bigHeal.heal);
    ok=companionApplyHeal(c,false,c,amount,bigLabel);
  }
  /* 3) 最低血 DPS（含非坦克玩家） */
  else{
    let best=null,bestPct=1,bestIsPlayer=false;
    if(S.p.alive&&!playerIsTank){
      const pct=S.p.hp/S.p.hpMax;
      if(pct<dpsPct&&pct<bestPct){bestPct=pct;best=null;bestIsPlayer=true;}
    }
    for(const o of PARTY){
      if(!o||o===c||!o.alive)continue;
      if(o.role==="tank"||o.role==="healer")continue;
      const pct=o.hp/o.hpMax;
      if(pct<dpsPct&&pct<bestPct){bestPct=pct;best=o;bestIsPlayer=false;}
    }
    if(bestIsPlayer){
      amount=R(smallHeal.heal);
      ok=companionApplyHeal(c,true,null,amount,smallLabel);
    }else if(best){
      amount=R(bigHeal.heal);
      ok=companionApplyHeal(c,false,best,amount,bigLabel);
    }else return false;
  }
  if(ok)c.healCd=C.healCd;
  return ok;
}

function companionAttack(c,tgt){
  const cls=c.cls, C=BAL.companion;
  c.state="COMBAT";
  const dmg=rand(cls.autoMin,cls.autoMax);
  if(cls.ranged){
    c.attackAnim=1;
    companionFireShot(c,tgt,dmg,null);
    c.atkTimer=(cls.autoSpd||1.8)*(C.attackCdMul||1);
    setCurrentTarget(tgt);
    return;
  }
  const pos=tgt.type==="boss"?boss.position
    :(tgt.type==="mob"?tgt.m.mesh.position:tgt.a.mesh.position);
  const d=Math.hypot(c.mesh.position.x-pos.x,c.mesh.position.z-pos.z);
  if(d>C.meleeR)return;
  c.attackAnim=1;
  companionDeal(c,tgt,dmg,null);
  if(typeof SFX!=="undefined")SFX.play("swing");
  c.atkTimer=(cls.autoSpd||1.8)*(C.attackCdMul||1);
  setCurrentTarget(tgt);
}

function tickOneCompanion(c,dt){
  const C=BAL.companion, cls=c.cls;
  if(!c.alive){
    if(typeof tickDeathRoll==="function")tickDeathRoll(c.mesh,dt);
    c.reviveT-=dt;
    if(c.reviveT<=0&&S.p.alive){
      c.alive=true; c.hp=Math.max(1,Math.round(c.hpMax*(C.reviveHpPct||.45)));
      if(typeof resetDeathRoll==="function")resetDeathRoll(c.mesh);
      else{c.mesh.rotation.z=0; c.mesh.position.y=0;}
      c.mesh.position.y=0;
      if(c.label)c.label.visible=true;
      c.state="FOLLOW";
      log(`${CMP_NAMES[c.classKey]}振作起来了！`,"lg-heal");
      if(typeof VFX!=="undefined")VFX.spawn("heal_cross",{pos:c.mesh.position.clone().setY(1.5)});
    }
    if(c.label){
      c.label.position.set(c.mesh.position.x,3.6,c.mesh.position.z);
      if(typeof updateNameplateHp==="function")updateNameplateHp(c.label,c.hp,c.hpMax);
    }
    return;
  }

  if(c.healCd>0)c.healCd-=dt;
  if(c.atkTimer>0)c.atkTimer-=dt;
  if(c.attackAnim>0)c.attackAnim=Math.max(0,c.attackAnim-dt*4);

  if(c.state==="RETREAT"||c.state==="FOLLOW"||c.state==="IDLE"){
    c.hp=Math.min(c.hpMax,c.hp+c.hpMax*(C.regenPct||.04)*dt);
  }

  const dPlayer=Math.hypot(player.position.x-c.mesh.position.x,player.position.z-c.mesh.position.z);
  const hpPct=c.hp/c.hpMax;

  if(hpPct<C.retreatHpPct)c.state="RETREAT";
  else if(c.state==="RETREAT"&&hpPct>=C.retreatRecoverPct)c.state="FOLLOW";

  if(c.state==="RETREAT"){
    if(dPlayer>C.followStop)companionMoveToward(c,player.position,cls.speed*(C.speedMul||1)*(C.retreatSpeedMul||1.15),dt);
    else c.moving=false;
  }else if(companionTryHeal(c,dt)){
    /* HEAL */
  }else{
    const tgt=S.p.alive?getFocusTarget(C.combatEngageR):null;
    if(tgt&&isTargetAlive(tgt)){
      const tpos=tgt.type==="boss"?boss.position
        :(tgt.type==="mob"?tgt.m.mesh.position:tgt.a.mesh.position);
      const dT=Math.hypot(c.mesh.position.x-tpos.x,c.mesh.position.z-tpos.z);
      const range=cls.ranged?(cls.range||24):C.meleeR;
      c.mesh.rotation.y=Math.atan2(tpos.x-c.mesh.position.x,tpos.z-c.mesh.position.z);
      if(dT>range){
        c.state="COMBAT";
        companionMoveToward(c,{x:tpos.x,z:tpos.z},cls.speed*(C.speedMul||1),dt);
      }else if(c.atkTimer<=0){
        companionAttack(c,tgt);
        c.moving=false;
      }else{
        c.state="COMBAT";
        c.moving=false;
      }
    }else{
      c.state=dPlayer>C.followDist?"FOLLOW":"IDLE";
      if(dPlayer>C.followStop)companionMoveToward(c,player.position,cls.speed*(C.speedMul||1),dt);
      else c.moving=false;
    }
  }

  const U=c.mesh.userData;
  if(c.moving)c.walkPhase+=dt*9;
  if(U.legR&&U.legL){
    const swing=c.moving?Math.sin(c.walkPhase)*.55:0;
    U.legR.rotation.x=swing; U.legL.rotation.x=-swing;
  }
  if(U.armR&&U.armL){
    if(c.attackAnim>0)U.armR.rotation.x=-2.2*Math.sin(Math.min(1,c.attackAnim)*Math.PI);
    else U.armR.rotation.x=c.moving?Math.sin(c.walkPhase)*.3:0;
    U.armL.rotation.x=c.moving?-Math.sin(c.walkPhase)*.3:0;
  }
  c.mesh.position.y=c.moving?Math.abs(Math.sin(S.t*9+c.walkPhase))*.12:0;
  if(c.label){
    c.label.position.set(c.mesh.position.x,3.6,c.mesh.position.z);
    if(typeof updateNameplateHp==="function")updateNameplateHp(c.label,c.hp,c.hpMax);
  }
}

function tickCompanion(dt){
  updateCompanionHud();
  for(const c of PARTY)tickOneCompanion(c,dt);
}

function updateCompanionHud(){
  const root=$("#partyFrame")||$("#cmpFrame");
  if(!root)return;
  if(!PARTY.length){root.style.display="none";return;}
  root.style.display="block";
  /* 多槽：#partySlot0 / #partySlot1；单槽回退旧 DOM */
  for(let i=0;i<aiSlotMax();i++){
    const slot=$("#partySlot"+i);
    const c=PARTY[i];
    if(slot){
      if(!c){slot.style.display="none";continue;}
      slot.style.display="block";
      const nameEl=slot.querySelector(".pname");
      const hpEl=slot.querySelector(".hpP");
      const hpTx=slot.querySelector(".barText");
      const stEl=slot.querySelector(".cmp-st");
      const rl=(BAL.party.roleLabel&&BAL.party.roleLabel[c.role])||"";
      if(nameEl)nameEl.textContent=`${ROLE_ICON[c.role]||""} ${CMP_NAMES[c.classKey]||"同伴"}${rl?" · "+rl:""}`;
      const ratio=c.hpMax?Math.max(0,c.hp/c.hpMax):0;
      if(hpEl)hpEl.style.transform=`scaleX(${c.alive?ratio:0})`;
      if(hpTx)hpTx.textContent=c.alive
        ?`${Math.max(0,Math.round(c.hp))} / ${c.hpMax}`
        :`倒下（${Math.max(0,c.reviveT|0)}s）`;
      if(stEl){
        const map={IDLE:"待机",FOLLOW:"跟随",COMBAT:"战斗",HEAL:"治疗",RETREAT:"撤退"};
        stEl.textContent=c.alive?(map[c.state]||c.state):"倒下";
      }
      continue;
    }
  }
  /* 无 partySlot 时兼容旧 #cmpFrame 单槽 */
  if(!$("#partySlot0")&&PARTY[0]){
    const c=PARTY[0];
    const nameEl=$("#cmpName"), hpEl=$("#cmpHp"), hpTx=$("#cmpHpTx"), stEl=$("#cmpState");
    if(nameEl)nameEl.textContent=CMP_NAMES[c.classKey]||"同伴";
    const ratio=c.hpMax?Math.max(0,c.hp/c.hpMax):0;
    if(hpEl)hpEl.style.transform=`scaleX(${c.alive?ratio:0})`;
    if(hpTx)hpTx.textContent=c.alive
      ?`${Math.max(0,Math.round(c.hp))} / ${c.hpMax}`
      :`倒下（${Math.max(0,c.reviveT|0)}s）`;
    if(stEl){
      const map={IDLE:"待机",FOLLOW:"跟随",COMBAT:"战斗",HEAL:"治疗",RETREAT:"撤退"};
      stEl.textContent=c.alive?(map[c.state]||c.state):"倒下";
    }
  }
}

function openRecruitDialogue(){
  S.vendorOpen=false;
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🐂 长老 · 岩蹄";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};

  const n=PARTY.length, max=aiSlotMax();
  if(n>0){
    const names=PARTY.map(c=>CMP_NAMES[c.classKey]).join("、");
    tx.textContent=`当前小队 ${1+n}/3：你与 ${names}。可一键成队、补招或解散。`;
    btn("✦ 一键组成 3 人小队",()=>{formParty();closeDialogue();});
    if(n<max){
      btn("⚔️ 补招战士（坦克）",()=>{recruitCompanion("warrior",{role:"tank"});closeDialogue();});
      btn("✨ 补招牧师（治疗）",()=>{recruitCompanion("priest",{role:"healer"});closeDialogue();});
      btn("🌀 补招萨满（治疗）",()=>{recruitCompanion("shaman",{role:"healer"});closeDialogue();});
      btn("🔮 补招法师（输出）",()=>{recruitCompanion("mage",{role:"dps"});closeDialogue();});
      btn("🏹 补招弓箭手（输出）",()=>{recruitCompanion("archer",{role:"dps"});closeDialogue();});
      btn("🗡 补招盗贼（输出）",()=>{recruitCompanion("rogue",{role:"dps"});closeDialogue();});
    }
    btn("解散小队",()=>{dismissAllCompanions();closeDialogue();});
    btn("返回",()=>{closeDialogue();if(typeof openDialogue==="function")openDialogue();});
    return;
  }

  tx.textContent="草原危险，你不必独行。可一键组成 3 人小队（坦克+治疗+输出），或单独招募同伴。";
  btn("✦ 一键组成 3 人小队",()=>{formParty();closeDialogue();});
  btn("⚔️ 招募战士",()=>{recruitCompanion("warrior",{role:"tank"});closeDialogue();});
  btn("🔮 招募法师",()=>{recruitCompanion("mage",{role:"dps"});closeDialogue();});
  btn("🏹 招募弓箭手",()=>{recruitCompanion("archer",{role:"dps"});closeDialogue();});
  btn("✨ 招募牧师",()=>{recruitCompanion("priest",{role:"healer"});closeDialogue();});
  btn("🌀 招募萨满",()=>{recruitCompanion("shaman",{role:"healer"});closeDialogue();});
  btn("🗡 招募盗贼",()=>{recruitCompanion("rogue",{role:"dps"});closeDialogue();});
  btn("返回",()=>{closeDialogue();if(typeof openDialogue==="function")openDialogue();});
}

console.info("[companions] STEP 26 就绪：3 人小队 · PARTY[]");
