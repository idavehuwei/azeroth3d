/* ============================================================
   熔火之心 · anim.js
   生物动画挂点（plan-v1 · V1-A3 全量）：走/攻/死/吟唱 · 俯冲 · 翼尾 · 终局下沉
   ------------------------------------------------------------
   [依赖] core.js（BAL）· THREE 运行时
   [导出] ensureAnim resolveAnimParams
          beginDeathRoll tickDeathRoll resetDeathRoll beginFinalSink
          updateMobAnim updateBossWingAnim updateNpcIdleAnim
          emitAnimFootstep
   ============================================================ */
"use strict";

function ensureAnim(mesh){
  if(!mesh.userData)mesh.userData={};
  if(!mesh.userData.anim)
    mesh.userData.anim={
      state:"idle",walkPhase:0,attackAnim:0,deathRoll:0,deathActive:false,
      hitReact:0,sinkActive:false,thumpDone:false,_prevSin:null,_lastYaw:null,_yawRate:0
    };
  return mesh.userData.anim;
}

function resolveAnimParams(kind){
  const bal=BAL.anim||{};
  if(bal.enabled===false)return null;
  const base={
    walkFreq:bal.walkFreq||9,
    walkAmp:bal.walkAmp||.55,
    walkDecay:bal.walkDecay||8,
    attackDecay:bal.attackDecay||4,
    bobAmp:bal.bobAmp||.22,
    lungeAmp:bal.lungeAmp||.55,
    castWingMul:bal.castWingMul||1.8,
    hitReactAmp:bal.hitReactAmp||.25,
    hitReactDecay:bal.hitReactDecay||8,
    leanMul:bal.leanMul!=null?bal.leanMul:.04,
    thumpBoost:bal.thumpBoost!=null?bal.thumpBoost:.35,
    hoverAmp:0,
    pulseFreq:5,
    pulseAmp:.12,
    wingFlap:Object.assign({freq:1.4, amp:.35},bal.wingFlap||{}),
    tailAmp:bal.tailAmp!=null?bal.tailAmp:.2,
    tailFreq:bal.tailFreq!=null?bal.tailFreq:1.1,
  };
  const ov=bal.byKind&&kind&&bal.byKind[kind];
  if(!ov)return base;
  const out=Object.assign({},base,ov);
  if(ov.wingFlap)out.wingFlap=Object.assign({},base.wingFlap,ov.wingFlap);
  if(ov.wingFlapFly)out.wingFlapFly=ov.wingFlapFly;
  return out;
}

/**
 * 侧倒插值。opts: { y, restY, thump, finalSink, sinkTargetY, sinkSpd, deathTarget }
 */
function beginDeathRoll(entOrMesh,opts){
  opts=opts||{};
  const mesh=entOrMesh&&(entOrMesh.mesh||entOrMesh);
  if(!mesh)return;
  const A=ensureAnim(mesh);
  A.state="dead";
  A.deathRoll=mesh.rotation.z||0;
  A.deathTarget=opts.deathTarget!=null?opts.deathTarget:Math.PI/2;
  A.deathActive=true;
  A.thumpDone=false;
  A.thump=opts.thump!==false;
  A.restY=opts.restY!=null?opts.restY:(opts.y!=null?opts.y:.25);
  A.sinkActive=!!opts.finalSink;
  A.sinkTargetY=opts.sinkTargetY!=null?opts.sinkTargetY:-3.5;
  A.sinkSpd=opts.sinkSpd!=null?opts.sinkSpd:1.15;
  if(opts.y!=null)mesh.position.y=opts.y;
  else if(mesh.position.y<0.2)mesh.position.y=A.restY;
}

/** Boss 终局：缓慢下沉 + 轻侧倾（替代 setInterval） */
function beginFinalSink(entOrMesh,opts){
  opts=Object.assign({finalSink:true, thump:false, deathTarget:0.45, y:null, sinkTargetY:-4, sinkSpd:1.1},opts||{});
  const mesh=entOrMesh&&(entOrMesh.mesh||entOrMesh);
  if(mesh&&opts.y==null)opts.y=mesh.position.y;
  beginDeathRoll(entOrMesh,opts);
}

function tickDeathRoll(mesh,dt){
  if(!mesh)return false;
  const A=mesh.userData&&mesh.userData.anim;
  if(!A||(!A.deathActive&&!A.sinkActive))return false;
  const bal=BAL.anim||{};
  const spd=bal.deathRollSpd||6;
  let active=false;

  if(A.deathActive){
    active=true;
    const t=A.deathTarget!=null?A.deathTarget:Math.PI/2;
    const before=A.deathRoll;
    A.deathRoll+=(t-A.deathRoll)*Math.min(1,spd*dt);
    mesh.rotation.z=A.deathRoll;
    /* 落地顿挫：过半后短促上弹再落回 restY */
    if(A.thump&&!A.thumpDone&&Math.abs(t)>0.2){
      const prog=Math.abs(A.deathRoll/t);
      if(prog>0.55){
        A.thumpDone=true;
        const boost=bal.thumpBoost!=null?bal.thumpBoost:.35;
        mesh.position.y=(A.restY||.25)+boost;
      }
    }
    if(A.thumpDone&&!A.sinkActive){
      const ry=A.restY!=null?A.restY:.25;
      mesh.position.y+=(ry-mesh.position.y)*Math.min(1,8*dt);
    }
    if(Math.abs(t-A.deathRoll)<0.02){
      A.deathRoll=t; mesh.rotation.z=t; A.deathActive=false;
    }
    if(Math.abs(A.deathRoll-before)<1e-6&&Math.abs(t-A.deathRoll)<0.02)A.deathActive=false;
  }

  if(A.sinkActive){
    active=true;
    const ty=A.sinkTargetY!=null?A.sinkTargetY:-3.5;
    const ss=A.sinkSpd!=null?A.sinkSpd:1.15;
    mesh.position.y+=(ty-mesh.position.y)*Math.min(1,ss*dt);
    if(Math.abs(mesh.position.y-ty)<0.05){
      mesh.position.y=ty; A.sinkActive=false;
    }
  }
  return active||A.deathActive||A.sinkActive;
}

function resetDeathRoll(mesh){
  if(!mesh)return;
  const A=ensureAnim(mesh);
  A.deathRoll=0; A.deathTarget=0; A.deathActive=false; A.sinkActive=false;
  A.thumpDone=false; A.state="idle"; A.hitReact=0;
  mesh.rotation.z=0; mesh.rotation.x=0;
}

function flapWings(U,amp,freq,t){
  if(!U.wingL||!U.wingR)return;
  const a=Math.sin(t*freq)*amp;
  U.wingL.rotation.x=a;
  U.wingR.rotation.x=-a;
}

/** V1-A5 预留：walkPhase 过零发脚步；有 SFX.playFoot 则调用 */
function emitAnimFootstep(m){
  if(typeof SFX==="undefined"||typeof SFX.playFoot!=="function")return;
  const surf=m.footSurface||m._footSurface||"grass";
  SFX.playFoot(surf);
}

function updateMobAnim(m,dt){
  const mesh=m&&m.mesh; if(!mesh)return;
  const U=mesh.userData||{};
  const A=ensureAnim(mesh);
  const P=resolveAnimParams(U.kind);
  if(!P){
    if(m.state==="dead"||A.deathActive||A.sinkActive)tickDeathRoll(mesh,dt);
    return;
  }

  if(m.state==="dead"||A.deathActive||A.sinkActive){
    tickDeathRoll(mesh,dt);
    return;
  }

  const t=(typeof S!=="undefined"&&S.t!=null)?S.t:0;
  const chasing=m.state==="aggro"&&m.moving;
  let walkFreq=P.walkFreq*(chasing?1.15:1);
  let amp=P.walkAmp;
  const sc=mesh.scale&&mesh.scale.x||1;
  if(sc>1.6){amp*=1/Math.sqrt(sc); walkFreq*=0.88;}

  if(m.casting){
    A.state="cast";
    A.walkPhase*=1-P.walkDecay*dt;
  }else if(m.moving){
    A.state="walk";
    A.walkPhase+=walkFreq*dt;
  }else{
    A.walkPhase*=1-P.walkDecay*dt;
    A.state=(m.attackAnim>0)?"attack":"idle";
  }

  /* 脚步：sin 过零（抬腿落地） */
  const sFoot=Math.sin(A.walkPhase);
  if(m.moving&&A._prevSin!=null&&A._prevSin<0&&sFoot>=0)emitAnimFootstep(m);
  A._prevSin=sFoot;

  if(m.attackAnim>0){
    m.attackAnim-=dt*P.attackDecay;
    if(m.attackAnim<0)m.attackAnim=0;
    A.attackAnim=m.attackAnim;
    if(!m.casting)A.state="attack";
  }

  if(m.hitReact>0){
    m.hitReact-=dt*P.hitReactDecay;
    if(m.hitReact<0)m.hitReact=0;
    A.hitReact=m.hitReact;
  }

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

  if(U.head){
    const lung=m.attackAnim>0?(-P.lungeAmp*Math.sin(Math.min(1,m.attackAnim)*Math.PI)):0;
    U.head.rotation.x=lung;
  }

  if(U.armR){
    if(m.casting)U.armR.rotation.x=-1.1;
    else if(m.attackAnim>0)
      U.armR.rotation.x=-2.4*Math.sin(Math.min(1,m.attackAnim)*Math.PI);
    else U.armR.rotation.x=Math.sin(A.walkPhase)*.3;
  }
  if(U.armL){
    if(m.casting)U.armL.rotation.x=-1.0;
    else U.armL.rotation.x=-Math.sin(A.walkPhase)*.3;
  }

  if(U.wingL&&U.wingR){
    const wf=P.wingFlap;
    const mul=m.casting?P.castWingMul:1;
    flapWings(U,wf.amp*mul,wf.freq*mul,t);
  }

  /* 无臂元素：攻击时全身前倾 */
  if(U.kind==="element"){
    if(U.body){
      const s=1+Math.sin(t*(P.pulseFreq||5))*(P.pulseAmp||.12);
      U.body.scale.setScalar(s);
      if(m.attackAnim>0)
        U.body.rotation.x=-0.55*Math.sin(Math.min(1,m.attackAnim)*Math.PI);
      else U.body.rotation.x*=1-dt*8;
    }
    if(U.flame)U.flame.scale.y=1+Math.sin(t*7)*.2;
  }

  /* 转弯外倾（活体；死亡占用 rotation.z） */
  const yaw=mesh.rotation.y;
  if(A._lastYaw==null)A._lastYaw=yaw;
  let dy=yaw-A._lastYaw;
  while(dy>Math.PI)dy-=Math.PI*2; while(dy<-Math.PI)dy+=Math.PI*2;
  A._yawRate=A._yawRate*0.75+dy/Math.max(dt,0.001)*0.25;
  A._lastYaw=yaw;
  if(m.moving&&!m.casting){
    const lean=Math.max(-0.2,Math.min(0.2,A._yawRate*(P.leanMul||.04)));
    mesh.rotation.z=lean;
  }else{
    mesh.rotation.z*=1-dt*6;
    if(Math.abs(mesh.rotation.z)<0.01)mesh.rotation.z=0;
  }

  if(m.hitReact>0){
    mesh.rotation.x=-(P.hitReactAmp||.25)*Math.min(1,m.hitReact);
  }else if(mesh.rotation.x&&U.kind!=="element"){
    mesh.rotation.x*=1-dt*10;
    if(Math.abs(mesh.rotation.x)<0.01)mesh.rotation.x=0;
  }
}

function updateBossWingAnim(bossMesh,dt,alive){
  if(!bossMesh)return;
  const U=bossMesh.userData||{};
  if(alive===false){
    tickDeathRoll(bossMesh,dt);
    return;
  }
  const P=resolveAnimParams(U.kind||"dragon");
  if(!P)return;
  const t=(typeof S!=="undefined"&&S.t!=null)?S.t:0;
  const flying=typeof S!=="undefined"&&S.b&&S.b.flying;
  if(U.wingL&&U.wingR){
    const wf=(flying&&P.wingFlapFly)?P.wingFlapFly:P.wingFlap;
    flapWings(U,wf.amp||.35,wf.freq||1.4,t);
  }
  if(U.tail){
    U.tail.rotation.y=Math.sin(t*(P.tailFreq||1.1))*(P.tailAmp||.2)*(flying?1.35:1);
  }
}

/** 长老/商人/灵魂医者待机手势 */
function updateNpcIdleAnim(npc,dt,phaseOff){
  if(!npc||!npc.userData)return;
  const U=npc.userData;
  const t=((typeof S!=="undefined"&&S.t)||0)+(phaseOff||0);
  if(U.armR)U.armR.rotation.x=Math.sin(t*1.1)*.12;
  if(U.armL)U.armL.rotation.x=Math.sin(t*1.1+1)*.1;
  if(U.staff)U.staff.rotation.z=Math.sin(t*.9)*.06;
}

console.info("[anim] V1-A3 全量：终局下沉 · 顿挫 · 尾摆 · 脚步钩 · NPC 待机");
