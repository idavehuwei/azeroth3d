/* ============================================================
   熔火之心 · companions.js
   AI 队友（STEP 20）：营地招募 1 人 · 状态机 · 集火玩家目标
   ------------------------------------------------------------
   [依赖] THREE · core.js（BAL $ clamp rand R scene makeLabel）
          models.js（CLASSES.build* 经 combat CLASSES）
          combat.js（S CLASSES log announce fct hitEntity
            getFocusTarget setCurrentTarget isTargetAlive pickTarget
            playerHit applyHeal 风格治疗）
          world.js（player MOBS mobTargetable moveToward 风格）
          main.js 运行时（clampArena）
          raid.js 运行时（boss distToBoss bossTargetable addDamage dmgBoss）
          save.js 运行时（saveGame）
          vfx.js / sfx.js 运行时
   [导出] COMPANION recruitCompanion dismissCompanion companionAlive
          tickCompanion companionHit transferCompanionZone
          openRecruitDialogue getCompanionSave restoreCompanion
          updateCompanionHud disposeCompanionMesh
   ============================================================ */
"use strict";

/** @type {null|{classKey:string,mesh:THREE.Object3D,label:THREE.Sprite,cls:object,
 *  hp:number,hpMax:number,rage:number,rageMax:number,alive:boolean,
 *  state:string,atkTimer:number,healCd:number,face:number,walkPhase:number,
 *  attackAnim:number,reviveT:number,moving:boolean}} */
let COMPANION=null;

const CMP_NAMES={
  warrior:"同伴 · 石盾",
  mage:"同伴 · 余烬",
  archer:"同伴 · 疾羽",
  priest:"同伴 · 晨光",
};

function companionAlive(){
  return !!(COMPANION&&COMPANION.alive&&COMPANION.mesh);
}

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

function dismissCompanion(opts){
  opts=opts||{};
  if(!COMPANION)return;
  disposeCompanionMesh(COMPANION);
  COMPANION=null;
  updateCompanionHud();
  if(!opts.silent){
    log("同伴已解散。","lg-sys");
    announce("同伴解散");
  }
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
}

function recruitCompanion(classKey,opts){
  opts=opts||{};
  if(!CLASSES[classKey]){log("未知职业，无法招募。","lg-sys");return false;}
  if(COMPANION)dismissCompanion({silent:true,noSave:true});
  const C=BAL.companion;
  const cls=CLASSES[classKey];
  const mesh=cls.build();
  const off=C.spawnOffset;
  mesh.position.set(
    player.position.x+(off.x||2),
    0,
    player.position.z+(off.z||1.5)
  );
  if(typeof clampArena==="function")clampArena(mesh.position);
  scene.add(mesh);
  const name=CMP_NAMES[classKey]||"同伴";
  const label=makeLabel(name,5.5,"#b8e0ff","rgba(80,140,220,.9)");
  label.position.set(mesh.position.x,3.6,mesh.position.z);
  scene.add(label);

  const hpMax=Math.round(cls.hp*(C.hpMul||.72));
  COMPANION={
    classKey, mesh, label, cls,
    hp:hpMax, hpMax,
    rage:cls.resStart, rageMax:cls.resMax,
    alive:true,
    state:"FOLLOW",
    atkTimer:C.atkTimerStart||.4, healCd:0,
    face:0, walkPhase:0, attackAnim:0,
    reviveT:0, moving:false,
  };
  updateCompanionHud();
  if(!opts.silent){
    announce(`招募 · ${name}`);
    log(`你招募了【${name}】（${cls.title.replace(/^✨ |^⚔️ |^🔮 |^🏹 /,"")}）。按 F 与长老对话可解散。`,"lg-sys");
  }
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
  return true;
}

function getCompanionSave(){
  if(!COMPANION)return null;
  return {classKey:COMPANION.classKey, hp:Math.round(COMPANION.hp)};
}

function restoreCompanion(data){
  dismissCompanion({silent:true,noSave:true});
  if(!data||!data.classKey||!CLASSES[data.classKey])return;
  recruitCompanion(data.classKey,{silent:true,noSave:true});
  if(COMPANION&&typeof data.hp==="number"&&isFinite(data.hp)){
    COMPANION.hp=clamp(data.hp,1,COMPANION.hpMax);
  }
  updateCompanionHud();
}

function transferCompanionZone(toScene,gate){
  if(!COMPANION||!COMPANION.mesh||!toScene)return;
  const c=COMPANION;
  if(c.mesh.parent)c.mesh.parent.remove(c.mesh);
  if(c.label&&c.label.parent)c.label.parent.remove(c.label);
  toScene.add(c.mesh);
  if(c.label)toScene.add(c.label);
  const off=BAL.companion.spawnOffset;
  const gx=gate&&gate.x!=null?gate.x:player.position.x;
  const gz=gate&&gate.z!=null?gate.z:player.position.z;
  c.mesh.position.set(gx+(off.x||2),0,gz+(off.z||1.5));
  if(typeof clampArena==="function")clampArena(c.mesh.position);
  if(c.label)c.label.position.set(c.mesh.position.x,3.6,c.mesh.position.z);
  if(c.alive)c.state="FOLLOW";
}

function companionHit(amount,source){
  if(!companionAlive())return;
  const c=COMPANION;
  amount=Math.round(amount*R(BAL.variance.player));
  c.hp-=amount;
  fct(c.mesh.position.clone().setY(3),`-${amount}`,"#ff8a7a",15);
  if(typeof SFX!=="undefined")SFX.play("hit");
  log(`${source} 击中了${CMP_NAMES[c.classKey]||"同伴"}，造成 ${amount} 点伤害！`,"lg-dmg");
  if(c.hp<=0){
    c.hp=0; c.alive=false; c.state="IDLE";
    c.reviveT=BAL.companion.reviveT;
    c.mesh.rotation.z=Math.PI/2;
    c.mesh.position.y=.25;
    if(c.label)c.label.visible=false;
    announce("同伴倒下了！");
    log(`${CMP_NAMES[c.classKey]||"同伴"}倒下了，将在 ${BAL.companion.reviveT} 秒后振作。`,"lg-sys");
  }
  updateCompanionHud();
}

function companionDeal(tgt,amount,label){
  if(!tgt)return;
  amount=Math.round(amount*(BAL.companion.dmgMul||1));
  if(tgt.type==="mob")mobDamage(tgt.m,amount,label);
  else if(tgt.type==="boss")dmgBoss(amount,label);
  else if(tgt.type==="add")addDamage(tgt.a,amount);
}

function companionFireShot(tgt,dmg,label){
  const c=COMPANION; if(!c||!tgt)return;
  const color=c.cls.shotColor||0xfff0a0;
  if(typeof SFX!=="undefined")SFX.play(c.cls.sfx||"fireball");
  const m=new THREE.Mesh(new THREE.SphereGeometry(.28,8,8),
    new THREE.MeshBasicMaterial({color}));
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.5,8,8),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:.32}));
  m.add(glow);
  m.position.copy(c.mesh.position); m.position.y=1.85;
  scene.add(m);
  S.pShots.push({mesh:m,tgt,dmg:Math.round(dmg*(BAL.companion.dmgMul||1)),label,speed:26,shotColor:color});
}

function companionApplyHeal(targetIsPlayer,amount,label){
  const heal=Math.round(amount*(BAL.companion.healMul||1));
  if(targetIsPlayer){
    if(!S.p.alive||S.p.hp>=S.p.hpMax)return false;
    S.p.hp=Math.min(S.p.hpMax,S.p.hp+heal);
    fct(player.position.clone().setY(3),`+${heal}`,"#8aff9a",16);
    if(typeof VFX!=="undefined")VFX.spawn("heal_cross",{pos:player.position.clone().setY(1.4)});
  }else{
    const c=COMPANION;
    if(!c||!c.alive||c.hp>=c.hpMax)return false;
    c.hp=Math.min(c.hpMax,c.hp+heal);
    fct(c.mesh.position.clone().setY(3),`+${heal}`,"#8aff9a",15);
    if(typeof VFX!=="undefined")VFX.spawn("heal_cross",{pos:c.mesh.position.clone().setY(1.4)});
  }
  if(typeof SFX!=="undefined")SFX.play("heal");
  log(`${CMP_NAMES[COMPANION.classKey]}施放【${label}】，恢复 ${heal} 点生命。`,"lg-heal");
  updateCompanionHud();
  return true;
}

function companionMoveToward(dest,spd,dt){
  const c=COMPANION;
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

function companionTryHeal(dt){
  const c=COMPANION, C=BAL.companion;
  if(c.classKey!=="priest"||c.healCd>0)return false;
  const pLow=S.p.alive&&(S.p.hp/S.p.hpMax)<C.healPlayerHpPct;
  const sLow=(c.hp/c.hpMax)<C.healSelfHpPct;
  if(!pLow&&!sLow)return false;
  c.state="HEAL";
  c.attackAnim=1;
  const bal=pLow?BAL.skills.flashHeal:BAL.skills.heal;
  const amount=R(bal.heal);
  companionApplyHeal(pLow,amount,pLow?"快速治疗":"治疗术");
  c.healCd=C.healCd;
  return true;
}

function companionAttack(tgt){
  const c=COMPANION, cls=c.cls, C=BAL.companion;
  c.state="COMBAT";
  const dmg=rand(cls.autoMin,cls.autoMax);
  if(cls.ranged){
    c.attackAnim=1;
    companionFireShot(tgt,dmg,null);
    c.atkTimer=(cls.autoSpd||1.8)*(C.attackCdMul||1);
    setCurrentTarget(tgt);
    return;
  }
  const pos=tgt.type==="boss"?boss.position
    :(tgt.type==="mob"?tgt.m.mesh.position:tgt.a.mesh.position);
  const d=Math.hypot(c.mesh.position.x-pos.x,c.mesh.position.z-pos.z);
  if(d>C.meleeR)return;
  c.attackAnim=1;
  companionDeal(tgt,dmg,null);
  if(typeof SFX!=="undefined")SFX.play("swing");
  c.atkTimer=(cls.autoSpd||1.8)*(C.attackCdMul||1);
  setCurrentTarget(tgt);
}

function tickCompanion(dt){
  updateCompanionHud();
  if(!COMPANION)return;
  const c=COMPANION, C=BAL.companion, cls=c.cls;

  if(!c.alive){
    c.reviveT-=dt;
    if(c.reviveT<=0&&S.p.alive){
      c.alive=true; c.hp=Math.max(1,Math.round(c.hpMax*(C.reviveHpPct||.45)));
      c.mesh.rotation.z=0; c.mesh.position.y=0;
      if(c.label)c.label.visible=true;
      c.state="FOLLOW";
      log(`${CMP_NAMES[c.classKey]}振作起来了！`,"lg-heal");
      if(typeof VFX!=="undefined")VFX.spawn("heal_cross",{pos:c.mesh.position.clone().setY(1.5)});
    }
    if(c.label)c.label.position.set(c.mesh.position.x,3.6,c.mesh.position.z);
    return;
  }

  if(c.healCd>0)c.healCd-=dt;
  if(c.atkTimer>0)c.atkTimer-=dt;
  if(c.attackAnim>0)c.attackAnim=Math.max(0,c.attackAnim-dt*4);

  /* 被动回血（撤退 / 非战斗） */
  if(c.state==="RETREAT"||c.state==="FOLLOW"||c.state==="IDLE"){
    c.hp=Math.min(c.hpMax,c.hp+c.hpMax*(C.regenPct||.04)*dt);
  }

  const dPlayer=Math.hypot(player.position.x-c.mesh.position.x,player.position.z-c.mesh.position.z);
  const hpPct=c.hp/c.hpMax;

  if(hpPct<C.retreatHpPct){
    c.state="RETREAT";
  }else if(c.state==="RETREAT"&&hpPct>=C.retreatRecoverPct){
    c.state="FOLLOW";
  }

  if(c.state==="RETREAT"){
    if(dPlayer>C.followStop)companionMoveToward(player.position,cls.speed*(C.speedMul||1)*(C.retreatSpeedMul||1.15),dt);
    else c.moving=false;
  }else if(companionTryHeal(dt)){
    /* HEAL 已处理 */
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
        companionMoveToward({x:tpos.x,z:tpos.z},cls.speed*(C.speedMul||1),dt);
      }else if(c.atkTimer<=0){
        companionAttack(tgt);
        c.moving=false;
      }else{
        c.state="COMBAT";
        c.moving=false;
      }
    }else{
      c.state=dPlayer>C.followDist?"FOLLOW":"IDLE";
      if(dPlayer>C.followStop)companionMoveToward(player.position,cls.speed*(C.speedMul||1),dt);
      else c.moving=false;
    }
  }

  /* 动画 */
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
  c.mesh.position.y=c.moving?Math.abs(Math.sin(S.t*9))*.12:0;
  if(c.label)c.label.position.set(c.mesh.position.x,3.6,c.mesh.position.z);
}

function updateCompanionHud(){
  const frame=$("#cmpFrame");
  if(!frame)return;
  if(!COMPANION){frame.style.display="none";return;}
  frame.style.display="block";
  const c=COMPANION;
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

function openRecruitDialogue(){
  S.vendorOpen=false;
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🐂 长老 · 岩蹄";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};

  if(COMPANION){
    tx.textContent=`你的同伴【${CMP_NAMES[COMPANION.classKey]}】仍与你同行。需要换人，先解散再招募。`;
    btn("解散同伴",()=>{dismissCompanion();closeDialogue();});
    btn("返回",()=>{closeDialogue();if(typeof openDialogue==="function")openDialogue();});
    return;
  }

  tx.textContent="草原危险，你不必独行。营地里有几位勇士愿与你并肩——选一位吧（同时仅一名同伴）。";
  btn("⚔️ 招募战士",()=>{recruitCompanion("warrior");closeDialogue();});
  btn("🔮 招募法师",()=>{recruitCompanion("mage");closeDialogue();});
  btn("🏹 招募弓箭手",()=>{recruitCompanion("archer");closeDialogue();});
  btn("✨ 招募牧师",()=>{recruitCompanion("priest");closeDialogue();});
  btn("返回",()=>{closeDialogue();if(typeof openDialogue==="function")openDialogue();});
}
