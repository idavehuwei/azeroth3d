/* ============================================================
   熔火之心 · anim.js
   生物动画挂点（plan-v1 · V1-A3）：走 / 攻 / 死三态 + 龙翼拍打
   ------------------------------------------------------------
   [依赖] core.js（BAL）· THREE 运行时（mesh.rotation）
   [导出] ensureAnim beginDeathRoll tickDeathRoll resetDeathRoll
          updateMobAnim updateBossWingAnim
   ============================================================ */
"use strict";

function ensureAnim(mesh){
  if(!mesh.userData)mesh.userData={};
  if(!mesh.userData.anim)
    mesh.userData.anim={state:"idle",walkPhase:0,attackAnim:0,deathRoll:0,deathActive:false};
  return mesh.userData.anim;
}

/** 开始侧倒插值（不瞬切 rotation.z） */
function beginDeathRoll(entOrMesh){
  const mesh=entOrMesh&&(entOrMesh.mesh||entOrMesh);
  if(!mesh)return;
  const A=ensureAnim(mesh);
  A.state="dead";
  A.deathRoll=mesh.rotation.z||0;
  A.deathTarget=Math.PI/2;
  A.deathActive=true;
  if(mesh.position.y<0.2)mesh.position.y=.25;
}

function tickDeathRoll(mesh,dt){
  if(!mesh)return false;
  const A=mesh.userData&&mesh.userData.anim;
  if(!A||!A.deathActive)return false;
  const spd=(BAL.anim&&BAL.anim.deathRollSpd)||6;
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
  A.deathRoll=0; A.deathTarget=0; A.deathActive=false; A.state="idle";
  mesh.rotation.z=0;
}

/**
 * 野怪 / 副本小怪 / 半人马：腿摆 + 攻击挥肢 + 死亡侧倒
 * 实体字段：m.moving · m.attackAnim · m.state（"dead" 时只做侧倒）
 */
function updateMobAnim(m,dt){
  const mesh=m&&m.mesh; if(!mesh)return;
  const U=mesh.userData||{};
  const A=ensureAnim(mesh);
  const bal=BAL.anim||{};

  if(m.state==="dead"||A.deathActive){
    tickDeathRoll(mesh,dt);
    return;
  }

  if(m.moving){
    A.state="walk";
    A.walkPhase+=(bal.walkFreq||9)*dt;
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

  const amp=bal.walkAmp||.55;
  const legs=U.legs;
  if(legs&&legs.length){
    if(legs.length===2){
      const sw=Math.sin(A.walkPhase)*amp;
      legs[0].rotation.x=sw; legs[1].rotation.x=-sw;
    }else{
      legs.forEach((leg,i)=>{
        const off=(i===0||i===3)?0:Math.PI;
        leg.rotation.x=Math.sin(A.walkPhase+off)*amp;
      });
    }
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

console.info("[anim] V1-A3 就绪：走/攻/死挂点 · 翼拍");
