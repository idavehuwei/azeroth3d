/* ============================================================
   熔火之心 · vfx.js
   特效注册表（STEP 9a）：三类模板 projectile / impact / aura + 配方表
   ------------------------------------------------------------
   [依赖] THREE · core.js（scene rand BAL）
          combat.js（S）· world.js（boss，投射物默认起点）
   [导出] VFX fireProjectile spawnTelegraph spawnBurst disposeVfxMesh
   ============================================================ */
"use strict";

/* ---- 配方表：Boss / 技能只写 vfx:'lava_bolt'，运行时 VFX.spawn 解析 ---- */
const VFX_RECIPES={
  lava_bolt    :{type:"projectile"},   /* 参数见 BAL.vfx.lava_bolt */
  venom_bolt   :{type:"projectile"},   /* STEP 21 毒液弹 */
  eruption_ring:{type:"aura"},         /* 地面预警红圈 */
  venom_ring   :{type:"aura"},         /* STEP 21 毒液圈 */
  melee_impact :{type:"impact"},
  roar_aura    :{type:"impact"},
  heal_cross   :{type:"impact"},
  loot_spark   :{type:"impact"},
};

/* 合并：BALANCE 默认 ← 配方 ← 调用方 ctx */
function vfxParams(id,ctx){
  const base=(BAL.vfx&&BAL.vfx[id])||{};
  const recipe=VFX_RECIPES[id]||{};
  return Object.assign({},base,recipe,ctx||{});
}

/* ---------- 模板① projectile：弹道球体 + 辉光 ---------- */
function vfxProjectile(p){
  const sc=p.origin? (p.originScale!=null?p.originScale:.7):1;
  const m=new THREE.Mesh(new THREE.SphereGeometry(p.radius*sc,p.segs,p.segs),
    new THREE.MeshBasicMaterial({color:p.color}));
  const glow=new THREE.Mesh(new THREE.SphereGeometry(p.glowR*sc,p.segs,p.segs),
    new THREE.MeshBasicMaterial({color:p.glow,transparent:true,opacity:p.glowOp}));
  m.add(glow);
  if(p.origin)m.position.copy(p.origin);
  else{
    const py=(typeof getBossCfg==="function"&&getBossCfg().projectileY!=null)?getBossCfg().projectileY:9;
    m.position.set(boss.position.x+2.5,py,boss.position.z+2);
  }
  scene.add(m);
  const opt=p.opt||BAL.boss.fireball;
  S.projectiles.push({mesh:m,target:p.targetPos.clone().setY(.8),speed:opt.speed,
    dmg:opt.dmg,hitR:opt.hitR,label:opt.name||"烈焰冲击"});
  return m;
}

/* ---------- 模板② aura：地面环 + 盘（预警 / 光环） ---------- */
function vfxAura(p){
  const r=p.r, delay=p.delay;
  const ring=new THREE.Mesh(new THREE.RingGeometry(r*(p.innerMul!=null?p.innerMul:.86),r,40),
    new THREE.MeshBasicMaterial({color:p.ringColor,transparent:true,opacity:p.ringOp,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.set(p.x,p.yRing,p.z);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(r,40),
    new THREE.MeshBasicMaterial({color:p.discColor,transparent:true,opacity:p.discOp,side:THREE.DoubleSide}));
  disc.rotation.x=-Math.PI/2;disc.position.set(p.x,p.yDisc,p.z);
  scene.add(ring);scene.add(disc);
  S.telegraphs.push({ring,disc,x:p.x,z:p.z,r,t:0,delay,
    dmg:p.dmg,label:p.label});
  return {ring,disc};
}

/* ---------- 模板③ impact：粒子爆发 ---------- */
function vfxImpact(p){
  const pos=p.pos, color=p.color, count=p.count|0, spread=p.spread;
  const size=p.size!=null?p.size:BAL.vfx.impact.size;
  const geo=new THREE.BufferGeometry();
  const arr=new Float32Array(count*3),vel=[];
  for(let i=0;i<count;i++){
    arr[i*3]=pos.x;arr[i*3+1]=pos.y;arr[i*3+2]=pos.z;
    const a=rand(0,6.28),e=rand(.3,1.4);
    vel.push(new THREE.Vector3(Math.cos(a)*spread*rand(.4,1),e*spread*1.6,Math.sin(a)*spread*rand(.4,1)));
  }
  geo.setAttribute("position",new THREE.BufferAttribute(arr,3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({color,size,transparent:true,
    opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));
  scene.add(pts);
  S.bursts.push({pts,vel,life:0});
  return pts;
}

/* 释放动态 VFX 网格（投射物 / 预警 / 粒子） */
function disposeVfxMesh(obj){
  if(!obj)return;
  obj.traverse(o=>{
    if(o.geometry)o.geometry.dispose();
    if(o.material){
      if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());
      else o.material.dispose();
    }
  });
}

const VFX={
  recipes:VFX_RECIPES,
  /** @param {string} id 配方键，或自定义时传 type 于 ctx */
  spawn(id,ctx){
    const p=vfxParams(id,ctx);
    if(p.type==="projectile"){
      if(!p.targetPos){console.warn("VFX.spawn projectile 需要 targetPos");return null;}
      return vfxProjectile(p);
    }
    if(p.type==="aura"){
      if(p.x==null||p.z==null||p.r==null){console.warn("VFX.spawn aura 需要 x,z,r");return null;}
      return vfxAura(p);
    }
    /* impact（含未知 id 且 ctx 带齐参数） */
    if(!p.pos){console.warn("VFX.spawn impact 需要 pos");return null;}
    if(p.color==null||p.count==null||p.spread==null){
      console.warn("VFX.spawn impact 需要 color/count/spread（或有效配方 id）");return null;
    }
    return vfxImpact(p);
  },
};

/* ---- 兼容薄包装：旧调用方仍可用；实现全部走模板 ---- */
function fireProjectile(targetPos,origin,opt){
  return VFX.spawn("lava_bolt",{targetPos,origin,opt});
}
function spawnTelegraph(x,z,r,delay){
  return VFX.spawn("eruption_ring",{x,z,r,delay});
}
function spawnBurst(pos,color,count,spread){
  /* 通用爆发：走 impact 模板，参数由调用方给定（配方默认可被覆盖） */
  return VFX.spawn("melee_impact",{pos,color,count,spread});
}
