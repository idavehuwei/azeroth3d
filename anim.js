/* ============================================================
   熔火之心 · anim.js
   生物动画挂点（plan-v1 · V1-A3 / plan-V2 · R6）：走 / 攻 / 死 + 族群特化
   ------------------------------------------------------------
   [依赖] core.js（BAL）· THREE 运行时（mesh.rotation）
          world.js 运行时（requestCorpseDissolve）· vfx.js 运行时（beginDissolve tickDissolve）
   [导出] ensureAnim beginDeathRoll tickDeathRoll resetDeathRoll
          updateMobAnim updateBossWingAnim updateBossHammerAnim
   ============================================================ */
"use strict";

function ensureAnim(mesh){
  if(!mesh.userData)mesh.userData={};
  if(!mesh.userData.anim)
    mesh.userData.anim={state:"idle",walkPhase:0,attackAnim:0,deathRoll:0,deathActive:false};
  return mesh.userData.anim;
}

/** 开始侧倒插值（不瞬切 rotation.z）；四足额外软化前腿 */
function beginDeathRoll(entOrMesh){
  const mesh=entOrMesh&&(entOrMesh.mesh||entOrMesh);
  if(!mesh)return;
  const A=ensureAnim(mesh);
  A.state="dead";
  A.deathRoll=mesh.rotation.z||0;
  A.deathTarget=Math.PI/2;
  A.deathActive=true;
  A.deathSoft=0;
  if(mesh.position.y<0.2)mesh.position.y=.25;
  const U=mesh.userData||{};
  if(U.kind==="elemental"){
    A.deathStyle="scatter";
    A.deathTarget=0;
  }else if(U.kind==="quad"||U.kind==="biped"||U.kind==="centaur"){
    A.deathStyle="quadSide";
  }else{
    A.deathStyle="roll";
  }
}

function tickDeathRoll(mesh,dt){
  if(!mesh)return false;
  const A=mesh.userData&&mesh.userData.anim;
  if(!A||!A.deathActive)return false;
  const spd=(BAL.anim&&BAL.anim.deathRollSpd)||6;
  const U=mesh.userData||{};

  if(A.deathStyle==="scatter"){
    A.deathSoft=Math.min(1,(A.deathSoft||0)+dt*2.2);
    const t=A.deathSoft;
    if(U.rocks){
      U.rocks.forEach((orb,i)=>{
        const ang=orb.userData.phase||0;
        orb.position.x+=Math.cos(ang)*(1.8*dt);
        orb.position.z+=Math.sin(ang)*(1.8*dt);
        orb.position.y+=(0.6+((i%3)*.2))*dt;
        orb.scale.setScalar(Math.max(.05,1-t));
      });
    }
    if(U.core){
      U.core.scale.setScalar(Math.max(.05,1-t));
      if(U.core.material&&U.core.material.opacity!=null)
        U.core.material.opacity=Math.max(0,.88*(1-t));
    }
    if(U.flames)U.flames.forEach(f=>{
      if(f.material)f.material.opacity=Math.max(0,(f.material.opacity||.8)*(1-dt*3));
      f.scale.setScalar(Math.max(.05,1-t));
    });
    if(U.light)U.light.intensity=Math.max(0,(U.light.intensity||1)*(1-dt*3));
    if(t>=1)A.deathActive=false;
    return true;
  }

  /* 四足：前腿先软 → 再侧倒 */
  if(A.deathStyle==="quadSide"){
    A.deathSoft=Math.min(1,(A.deathSoft||0)+dt*3.5);
    const soft=A.deathSoft;
    const legs=U.legs;
    if(legs&&legs.length>=2){
      /* 前腿索引：0 左前、2 右前（四足）；双足全软 */
      const front=legs.length===2?[0,1]:[0,2];
      front.forEach(i=>{
        if(legs[i])legs[i].rotation.x=soft*1.1;
      });
    }
    if(soft<1)return true;
  }

  const t=A.deathTarget!=null?A.deathTarget:Math.PI/2;
  A.deathRoll+=(t-A.deathRoll)*Math.min(1,spd*dt);
  mesh.rotation.z=A.deathRoll;
  if(Math.abs(t-A.deathRoll)<0.02){
    A.deathRoll=t; mesh.rotation.z=t; A.deathActive=false;
  }
  return true;
}

function resetDeathRoll(mesh){
  if(!mesh)return;
  const A=ensureAnim(mesh);
  A.deathRoll=0; A.deathTarget=0; A.deathActive=false; A.deathSoft=0; A.state="idle";
  mesh.rotation.z=0;
}

/**
 * 野怪 / 副本小怪 / 半人马 / 元素：腿摆 + 攻击 + 死亡 + 轨道
 * 实体字段：m.moving · m.attackAnim · m.state（"dead" 时只做侧倒）
 */
function updateMobAnim(m,dt){
  const mesh=m&&m.mesh; if(!mesh)return;
  const U=mesh.userData||{};
  const A=ensureAnim(mesh);
  const bal=BAL.anim||{};

  if(m.state==="dead"||A.deathActive){
    const wasRolling=!!A.deathActive;
    tickDeathRoll(mesh,dt);
    /* G1：有掉落待拾取时不溶解；无掉落则侧倒结束后溶解 */
    if(wasRolling&&!A.deathActive&&!mesh.userData.dissolving&&!m.awaitLoot){
      if(typeof requestCorpseDissolve==="function")requestCorpseDissolve(m);
      else if(typeof beginDissolve==="function")beginDissolve(mesh);
    }
    if(typeof tickDissolve==="function")tickDissolve(mesh,dt);
    return;
  }

  /* R7：受击闪白（跳过共享材质）+ 后仰 */
  if(U.hitFlashT>0){
    const dur=U.hitFlashDur||((BAL.vfx&&BAL.vfx.hit&&BAL.vfx.hit.dur)||.12);
    U.hitFlashT=Math.max(0,U.hitFlashT-dt/dur);
    const pulse=U.hitFlashT*.5;
    mesh.traverse(o=>{
      if(!o.isMesh||!o.material||!o.material.emissive)return;
      if(o.material.userData&&o.material.userData.sharedMat)return;
      o.material.emissive.setHex(0xffe8d0);
      o.material.emissiveIntensity=pulse;
    });
    const lean=(BAL.vfx&&BAL.vfx.hit&&BAL.vfx.hit.lean)||.18;
    if(U.hitLean)mesh.rotation.x=lean*U.hitFlashT;
  }else if(U.hitLean){
    mesh.rotation.x*=Math.max(0,1-dt*8);
    if(Math.abs(mesh.rotation.x)<.01){mesh.rotation.x=0;U.hitLean=0;}
    mesh.traverse(o=>{
      if(!o.isMesh||!o.material||!o.material.emissive)return;
      if(o.material.userData&&o.material.userData.sharedMat)return;
      o.material.emissiveIntensity=0;
    });
  }

  if(m.moving){
    A.state="walk";
    const gait=U.gait||{};
    const freq=(gait.freq!=null?gait.freq*4:(bal.walkFreq||9));
    A.walkPhase+=freq*dt;
  }else{
    A.walkPhase*=1-(bal.walkDecay||8)*dt;
    A.state=(m.attackAnim>0)?"attack":"idle";
  }

  if(m.attackAnim>0){
    m.attackAnim-=dt*(bal.attackDecay||4);
    if(m.attackAnim<0)m.attackAnim=0;
    A.attackAnim=m.attackAnim;
    A.state="attack";
  }

  const gait=U.gait||{};
  const amp=(gait.lift!=null?gait.lift*3:(bal.walkAmp||.55));
  const legs=U.legs;
  if(legs&&legs.length){
    if(legs.length===2){
      const sw=Math.sin(A.walkPhase)*amp;
      legs[0].rotation.x=sw; legs[1].rotation.x=-sw;
    }else if(legs.length===4){
      /* 对角步态：0+3 同相，1+2 反相 */
      legs.forEach((leg,i)=>{
        const off=(i===0||i===3)?0:Math.PI;
        leg.rotation.x=Math.sin(A.walkPhase+off)*amp;
      });
    }else{
      /* 蝎等：相邻反相 */
      legs.forEach((leg,i)=>{
        leg.rotation.x=Math.sin(A.walkPhase+(i%2)*Math.PI)*(amp*.7);
      });
    }
  }
  /* 小腿随步态弯曲 */
  if(U.shins&&U.shins.length){
    U.shins.forEach((shin,i)=>{
      const off=(i===0||i===3)?0:Math.PI;
      shin.rotation.x=Math.max(0,Math.sin(A.walkPhase+off))*amp*.65;
    });
  }

  if(U.legR&&U.legL){
    const sw=Math.sin(A.walkPhase)*amp;
    U.legR.rotation.x=sw; U.legL.rotation.x=-sw;
  }
  if(U.armR){
    if(m.attackAnim>0)
      U.armR.rotation.x=-2.4*Math.sin(Math.min(1,m.attackAnim)*Math.PI);
    else U.armR.rotation.x=Math.sin(A.walkPhase)*.3;
  }
  if(U.armL)U.armL.rotation.x=-Math.sin(A.walkPhase)*.3;

  /* 元素：碎岩公转 + 火焰呼吸 */
  if(U.kind==="elemental"){
    if(U.rocks){
      U.rocks.forEach(orb=>{
        const ud=orb.userData||{};
        ud.phase=(ud.phase||0)+(ud.spd||1)*dt;
        const r=ud.radius||.9;
        orb.position.x=Math.cos(ud.phase)*r;
        orb.position.z=Math.sin(ud.phase)*r;
        orb.position.y=(ud.y||1.1)+Math.sin(ud.phase*2)*.08;
        orb.rotation.y+=dt*1.2;
      });
    }
    if(U.flames){
      const t=typeof S!=="undefined"?S.t:A.walkPhase;
      U.flames.forEach(f=>{
        const freq=f.userData.flameFreq||1;
        const base=f.userData.flameBase!=null?f.userData.flameBase:f.position.y;
        const breath=.92+.08*Math.sin(t*freq*4);
        f.scale.set(breath,1.05+(.1*Math.sin(t*freq*5)),breath);
        f.position.y=base+.05*Math.sin(t*freq*3);
      });
    }
    if(U.core)U.core.rotation.y+=dt*.8;
  }

  /* 四足脊柱微摆 */
  if(U.spine1&&m.moving){
    U.spine1.rotation.y=Math.sin(A.walkPhase*.5)*.04;
    if(U.spine2)U.spine2.rotation.y=-U.spine1.rotation.y;
  }
}

/** 奥妮克希亚等：翼拍打（存活时）；死亡侧倒另调 tickDeathRoll */
function updateBossWingAnim(bossMesh,dt,alive){
  if(!bossMesh)return;
  const U=bossMesh.userData||{};
  if(alive===false){
    tickDeathRoll(bossMesh,dt);
    return;
  }
  if(!U.wingL||!U.wingR)return;
  const wf=(BAL.anim&&BAL.anim.wingFlap)||{};
  const a=Math.sin((typeof S!=="undefined"?S.t:0)*(wf.freq||1.4))*(wf.amp||.35);
  U.wingL.rotation.x=a;
  U.wingR.rotation.x=-a;
}

/**
 * 拉戈斯挥锤：蓄力 → 挥出 → 收势（对齐 delayMs 伤害帧）
 * swingT: 1→0；伤害约在 swingT≈0.28（delayMs=450, decay=1.6）
 */
function updateBossHammerAnim(bossMesh,swingT,dt,opts){
  if(!bossMesh||!bossMesh.userData||!bossMesh.userData.armR)return;
  const U=bossMesh.userData;
  const idle=Math.sin((typeof S!=="undefined"?S.t:0)*1.2)*.12;
  if(!(swingT>0)){
    U.armR.rotation.x=idle;
    if(U.forearmR)U.forearmR.rotation.x=Math.sin((typeof S!=="undefined"?S.t:0)*1.1)*.08;
    if(U.armL)U.armL.rotation.x=Math.sin((typeof S!=="undefined"?S.t:0)*1.2+1)*.15;
    return {phase:"idle",shake:0};
  }
  const t=Math.min(1,swingT);
  let phase="recover", shake=0;
  if(t>0.55){
    /* 蓄力：抬锤 */
    phase="windup";
    const p=(1-t)/(1-0.55);
    U.armR.rotation.x=-0.25-p*1.35;
    if(U.forearmR)U.forearmR.rotation.x=p*1.05;
  }else if(t>0.22){
    /* 挥出：下砸（伤害帧落在此段） */
    phase="strike";
    const p=(0.55-t)/(0.55-0.22);
    U.armR.rotation.x=-1.6+p*2.9;
    if(U.forearmR)U.forearmR.rotation.x=1.05-p*1.55;
    if(p>0.45&&p<0.7)shake=(opts&&opts.shakeAmp)||0.28;
  }else{
    phase="recover";
    const p=t/0.22;
    U.armR.rotation.x=1.3*p;
    if(U.forearmR)U.forearmR.rotation.x=-0.5*p;
  }
  if(U.armL)U.armL.rotation.x=Math.sin((typeof S!=="undefined"?S.t:0)*1.2+1)*.15;
  return {phase,shake};
}

console.info("[anim] V1-A3/R6 就绪：走/攻/死 · 四足对角 · 元素轨道 · Boss 挥锤三段");
