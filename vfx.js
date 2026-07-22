/* ============================================================
   炽心 · vfx.js
   战斗表现层（plan-V2 · R7）：四类模板 + 配方表 + 粒子池
   ------------------------------------------------------------
   [依赖] THREE · core.js（scene rand BAL disposeMaterial）
          combat.js（S）· world.js（boss，投射物默认起点）
   [导出] VFX fireProjectile spawnTelegraph spawnBurst disposeVfxMesh
          tickVfx pulseHitFlash tickHitFlash beginDissolve attachShieldAura
          rebuildVfxPool
   ------------------------------------------------------------
   新增特效 = VFX_RECIPES 一条 + BAL.vfx 参数；不写新粒子循环。
   ============================================================ */
"use strict";

/* ---- 配方表：Boss / 技能只写 vfx:'lava_bolt' ---- */
const VFX_RECIPES={
  lava_bolt    :{type:"projectile"},
  venom_bolt   :{type:"projectile"},
  eruption_ring:{type:"ground_warn"},  /* AoE 填充预警（对齐 eruption.delay） */
  venom_ring   :{type:"ground_warn"},
  melee_impact :{type:"impact"},
  roar_aura    :{type:"impact"},
  heal_cross   :{type:"impact"},
  loot_spark   :{type:"impact"},
  holy_shield  :{type:"aura", mode:"shield"},
  rune_ring    :{type:"aura", mode:"rune"},
};

function vfxParams(id,ctx){
  const base=(BAL.vfx&&BAL.vfx[id])||{};
  const recipe=VFX_RECIPES[id]||{};
  return Object.assign({},base,recipe,ctx||{});
}

/* ============================================================
   共享几何缓存 + 粒子池（少分配 / 无动态 PointLight）
   ============================================================ */
const VFX_GEO={
  _sph:Object.create(null),
  sphere(r,seg){
    const k=(r*100|0)+"_"+seg;
    let g=this._sph[k];
    if(!g){g=new THREE.SphereGeometry(r,seg,seg); g.userData.sharedGeo=true; this._sph[k]=g;}
    return g;
  },
  _ring:null,
  ring(){
    if(!this._ring){
      this._ring=new THREE.RingGeometry(.2,1.0,16);
      this._ring.userData.sharedGeo=true;
    }
    return this._ring;
  },
};

const VFX_POOL={
  get capacity(){return (BAL.vfx&&BAL.vfx.pool&&BAL.vfx.pool.capacity)||8;},
  get maxCount(){return (BAL.vfx&&BAL.vfx.pool&&BAL.vfx.pool.maxCount)||24;},
  free:[],
  active:0,
  acquire(count){
    count=Math.min(count|0,this.maxCount);
    let slot=this.free.pop();
    if(!slot){
      if(this.active>=this.capacity){
        /* 池满：回收最老爆发，绝不临时 new 几何 */
        if(S.bursts&&S.bursts.length){
          const old=S.bursts.shift();
          if(old&&old.pool)this.release(old.slot);
        }
        slot=this.free.pop();
      }
      if(!slot){
        if(this.active>=this.capacity)return null;
        const n=this.maxCount;
        const geo=new THREE.BufferGeometry();
        geo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(n*3),3));
        geo.setDrawRange(0,0);
        geo.userData.pooled=true;
        const mat=new THREE.PointsMaterial({
          color:0xffffff,size:.4,transparent:true,opacity:1,
          blending:THREE.AdditiveBlending,depthWrite:false,
        });
        mat.userData.vfxOwned=true;
        const pts=new THREE.Points(geo,mat);
        pts.frustumCulled=false;
        const ring=new THREE.Mesh(VFX_GEO.ring(),new THREE.MeshBasicMaterial({
          color:0xffffff,transparent:true,opacity:.8,side:THREE.DoubleSide,
          depthWrite:false,blending:THREE.AdditiveBlending,
        }));
        ring.rotation.x=-Math.PI/2;
        ring.userData.vfxOwned=true;
        ring.visible=false;
        /* velXYZ：平坦 Float32，避免每粒子 new Vector3 */
        slot={pts,ring,velXYZ:new Float32Array(n*3),count:0,life:0};
      }
    }
    /* 旧槽位缓冲可能小于当前 maxCount（切换华丽档前未 rebuild 时） */
    const bufN=slot.velXYZ?(slot.velXYZ.length/3)|0:count;
    count=Math.min(count,bufN);
    this.active++;
    slot.count=count;
    slot.life=0;
    slot.pts.geometry.setDrawRange(0,count);
    return slot;
  },
  release(slot){
    if(!slot)return;
    if(slot.pts.parent)slot.pts.parent.remove(slot.pts);
    if(slot.ring){
      if(slot.ring.parent)slot.ring.parent.remove(slot.ring);
      slot.ring.visible=false;
    }
    slot.pts.material.opacity=0;
    this.free.push(slot);
    this.active=Math.max(0,this.active-1);
  },
  /** 画面预设切换时重建：旧槽位 Buffer 尺寸可能小于新 maxCount */
  disposeSlot(slot){
    if(!slot)return;
    if(slot.pts){
      if(slot.pts.parent)slot.pts.parent.remove(slot.pts);
      if(slot.pts.geometry)slot.pts.geometry.dispose();
      if(slot.pts.material)slot.pts.material.dispose();
    }
    if(slot.ring){
      if(slot.ring.parent)slot.ring.parent.remove(slot.ring);
      if(slot.ring.material)slot.ring.material.dispose();
      /* ring 几何为共享，不 dispose */
    }
  },
};

function rebuildVfxPool(){
  if(typeof S!=="undefined"&&S.bursts){
    while(S.bursts.length){
      const b=S.bursts.pop();
      if(b&&b.pool&&b.slot)VFX_POOL.release(b.slot);
    }
  }
  while(VFX_POOL.free.length)VFX_POOL.disposeSlot(VFX_POOL.free.pop());
  VFX_POOL.active=0;
}

function _vfxUseLights(){
  return !!(BAL.vfx&&BAL.vfx.useLights);
}

/* ---------- ① projectile：共享球几何 + 短拖尾（默认无点光） ---------- */
function vfxProjectile(p){
  const sc=p.origin?(p.originScale!=null?p.originScale:.7):1;
  const seg=p.segs!=null?p.segs:6;
  const g=new THREE.Group();
  const core=new THREE.Mesh(
    VFX_GEO.sphere(p.radius*sc,seg),
    new THREE.MeshBasicMaterial({color:p.color})
  );
  const glow=new THREE.Mesh(
    VFX_GEO.sphere((p.glowR||p.radius*1.5)*sc,Math.max(5,seg-1)),
    new THREE.MeshBasicMaterial({color:p.glow||p.color,transparent:true,opacity:p.glowOp!=null?p.glowOp:.4})
  );
  g.add(core); g.add(glow);
  /* R8：假 bloom——BackSide 外扩壳，零 CDN / 默认关 */
  if(BAL.vfx&&BAL.vfx.fakeBloom){
    const fb=BAL.vfx.fakeBloomShell||{};
    const sm=fb.scale!=null?fb.scale:1.55;
    const op=fb.opacity!=null?fb.opacity:.2;
    const shell=new THREE.Mesh(
      VFX_GEO.sphere((p.glowR||p.radius*1.5)*sc*sm,Math.max(5,seg-1)),
      new THREE.MeshBasicMaterial({
        color:p.glow||p.color,transparent:true,opacity:op,
        side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false,
      })
    );
    g.add(shell);
  }

  const trailsOn=BAL.vfx&&BAL.vfx.trails!==false;
  const trailN=trailsOn?Math.min(p.trailLen!=null?p.trailLen:5,8):0;
  let trail=null, trailArr=null;
  if(trailN>0){
    trailArr=new Float32Array(trailN*3);
    const trailGeo=new THREE.BufferGeometry();
    trailGeo.setAttribute("position",new THREE.BufferAttribute(trailArr,3));
    trailGeo.setDrawRange(0,0);
    trail=new THREE.Points(trailGeo,new THREE.PointsMaterial({
      color:p.trailColor!=null?p.trailColor:(p.glow||p.color),
      size:p.trailSize!=null?p.trailSize:.3,
      transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,
    }));
    g.add(trail);
  }

  let light=null;
  if(_vfxUseLights()&&(p.lightInt==null||p.lightInt>0)){
    light=new THREE.PointLight(p.glow||p.color,p.lightInt!=null?p.lightInt:1.2,p.lightDist!=null?p.lightDist:10,2);
    g.add(light);
  }

  if(p.origin)g.position.copy(p.origin);
  else{
    const py=(typeof getBossCfg==="function"&&getBossCfg().projectileY!=null)?getBossCfg().projectileY:9;
    g.position.set(boss.position.x+2.5,py,boss.position.z+2);
  }
  if(trailArr){
    for(let i=0;i<trailN;i++){
      trailArr[i*3]=g.position.x;
      trailArr[i*3+1]=g.position.y;
      trailArr[i*3+2]=g.position.z;
    }
  }
  scene.add(g);
  const opt=p.opt||BAL.boss.fireball;
  S.projectiles.push({
    mesh:g, target:p.targetPos.clone().setY(.8), speed:opt.speed,
    dmg:opt.dmg, hitR:opt.hitR, label:opt.name||"烈焰冲击",
    trail, trailArr, trailN, trailI:0, light,
  });
  return g;
}

/* ---------- ② impact：池化粒子 + 扩散环（默认无点光） ---------- */
function vfxImpact(p){
  const pos=p.pos, color=p.color;
  const maxC=(BAL.vfx.pool&&BAL.vfx.pool.maxCount)||24;
  const count=Math.min(p.count|0,maxC);
  const spread=p.spread;
  const size=p.size!=null?p.size:((BAL.vfx.impact&&BAL.vfx.impact.size)||.4);
  const slot=VFX_POOL.acquire(count);
  if(!slot)return null;

  const arr=slot.pts.geometry.attributes.position.array;
  const vel=slot.velXYZ;
  for(let i=0;i<slot.count;i++){
    const i3=i*3;
    arr[i3]=pos.x; arr[i3+1]=pos.y; arr[i3+2]=pos.z;
    const a=rand(0,6.28),e=rand(.3,1.4),sp=spread*rand(.4,1);
    vel[i3]=Math.cos(a)*sp;
    vel[i3+1]=e*spread*1.6;
    vel[i3+2]=Math.sin(a)*sp;
  }
  slot.pts.geometry.attributes.position.needsUpdate=true;
  slot.pts.material.color.setHex(color);
  slot.pts.material.size=size;
  slot.pts.material.opacity=1;
  scene.add(slot.pts);
  slot.ring.material.color.setHex(color);
  slot.ring.material.opacity=.75;
  slot.ring.scale.setScalar(.15);
  slot.ring.position.set(pos.x,.05,pos.z);
  slot.ring.visible=true;
  scene.add(slot.ring);
  S.bursts.push({pool:true,slot,life:0});
  return slot.pts;
}

/* ---------- ③ aura：旋转法阵 / 菲涅尔护盾 ---------- */
function _runeShaderMat(color,op){
  return new THREE.ShaderMaterial({
    uniforms:{
      uColor:{value:new THREE.Color(color)},
      uOp:{value:op!=null?op:.55},
      uTime:{value:0},
    },
    vertexShader:[
      "varying vec2 vUv;",
      "void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    ].join("\n"),
    fragmentShader:[
      "uniform vec3 uColor; uniform float uOp; uniform float uTime;",
      "varying vec2 vUv;",
      "void main(){",
      "  vec2 p=vUv*2.0-1.0;",
      "  float d=length(p);",
      "  float ang=atan(p.y,p.x)+uTime*1.2;",
      "  float ring=smoothstep(0.08,0.0,abs(d-0.82));",
      "  float rune=step(0.0,sin(ang*6.0))*smoothstep(0.12,0.0,abs(d-0.55));",
      "  float a=(ring*0.9+rune*0.45+smoothstep(1.0,0.75,d)*0.12)*uOp;",
      "  if(a<0.02) discard;",
      "  gl_FragColor=vec4(uColor,a);",
      "}",
    ].join("\n"),
    transparent:true, depthWrite:false, side:THREE.DoubleSide,
  });
}

function _fresnelShieldMat(color,op){
  return new THREE.ShaderMaterial({
    uniforms:{
      uColor:{value:new THREE.Color(color)},
      uOp:{value:op!=null?op:.35},
      uTime:{value:0},
    },
    vertexShader:[
      "varying vec3 vN; varying vec3 vV;",
      "void main(){",
      "  vN=normalize(normalMatrix*normal);",
      "  vec4 mv=modelViewMatrix*vec4(position,1.0);",
      "  vV=normalize(-mv.xyz);",
      "  gl_Position=projectionMatrix*mv;",
      "}",
    ].join("\n"),
    fragmentShader:[
      "uniform vec3 uColor; uniform float uOp; uniform float uTime;",
      "varying vec3 vN; varying vec3 vV;",
      "void main(){",
      "  float f=pow(1.0-max(dot(normalize(vN),normalize(vV)),0.0),2.4);",
      "  float pulse=0.85+0.15*sin(uTime*3.0);",
      "  float a=f*uOp*pulse;",
      "  gl_FragColor=vec4(uColor,a);",
      "}",
    ].join("\n"),
    transparent:true, depthWrite:false, side:THREE.DoubleSide,
  });
}

function vfxAura(p){
  const mode=p.mode||"rune";
  if(mode==="shield"){
    const parent=p.attach||player;
    const mat=_fresnelShieldMat(p.color!=null?p.color:0xffe9a0,p.op!=null?p.op:.4);
    const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(p.radius||1.85,1),mat);
    mesh.position.y=p.y!=null?p.y:1.75;
    parent.add(mesh);
    if(!S.auras)S.auras=[];
    S.auras.push({mesh,mat,mode:"shield",t:0});
    return mesh;
  }
  /* 脚下旋转法阵 */
  const r=p.r!=null?p.r:2.2;
  const mat=_runeShaderMat(p.ringColor!=null?p.ringColor:(p.color||0xffd76a),p.ringOp!=null?p.ringOp:.55);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(r,48),mat);
  disc.rotation.x=-Math.PI/2;
  disc.position.set(p.x!=null?p.x:0,p.yRing!=null?p.yRing:.06,p.z!=null?p.z:0);
  scene.add(disc);
  if(!S.auras)S.auras=[];
  S.auras.push({mesh:disc,mat,mode:"rune",t:0,life:p.life!=null?p.life:3});
  return disc;
}

function attachShieldAura(parent,opt){
  opt=opt||{};
  return VFX.spawn("holy_shield",Object.assign({attach:parent},opt));
}

/* ---------- ④ ground_warn：由内向外填充，填满 = 伤害落地 ---------- */
function _warnShaderMat(color,op){
  return new THREE.ShaderMaterial({
    uniforms:{
      uFill:{value:0},
      uColor:{value:new THREE.Color(color)},
      uOp:{value:op!=null?op:.55},
      uPulse:{value:0},
    },
    vertexShader:[
      "varying vec2 vUv;",
      "void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    ].join("\n"),
    fragmentShader:[
      "uniform float uFill; uniform vec3 uColor; uniform float uOp; uniform float uPulse;",
      "varying vec2 vUv;",
      "void main(){",
      "  vec2 p=vUv*2.0-1.0;",
      "  float d=length(p);",
      "  if(d>0.995) discard;",
      "  float edge=smoothstep(0.02,0.0,abs(d-0.96));",
      "  float fill=smoothstep(uFill+0.03,uFill-0.02,d);",
      "  float a=(fill*0.38+edge*(0.75+0.25*uPulse))*uOp;",
      "  if(a<0.02) discard;",
      "  gl_FragColor=vec4(uColor,a);",
      "}",
    ].join("\n"),
    transparent:true, depthWrite:false, side:THREE.DoubleSide,
  });
}

function vfxGroundWarn(p){
  const r=p.r, delay=p.delay;
  const col=p.discColor!=null?p.discColor:(p.ringColor||0xff3b00);
  const mat=_warnShaderMat(col,p.discOp!=null?p.discOp+.35:.55);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(r,24),mat);
  disc.rotation.x=-Math.PI/2;
  disc.position.set(p.x,p.yDisc!=null?p.yDisc:.05,p.z);
  /* 外环描边（可读性） */
  const ring=new THREE.Mesh(
    new THREE.RingGeometry(r*(p.innerMul!=null?p.innerMul:.92),r,24),
    new THREE.MeshBasicMaterial({
      color:p.ringColor||col,transparent:true,
      opacity:p.ringOp!=null?p.ringOp:.85,side:THREE.DoubleSide,depthWrite:false,
    })
  );
  ring.rotation.x=-Math.PI/2;
  ring.position.set(p.x,p.yRing!=null?p.yRing:.06,p.z);
  scene.add(disc); scene.add(ring);
  S.telegraphs.push({
    ring,disc,mat,x:p.x,z:p.z,r,t:0,delay,
    dmg:p.dmg,label:p.label,kind:"ground_warn",
  });
  return {ring,disc};
}

/* ---------- dispose（跳过池化几何的共享模板） ---------- */
function disposeVfxMesh(obj){
  if(!obj)return;
  obj.traverse(o=>{
    const g=o.geometry;
    if(g&&!(g.userData&&(g.userData.pooled||g.userData.sharedGeo)))g.dispose();
    if(o.material){
      if(Array.isArray(o.material))o.material.forEach(m=>{
        if(m&&m.userData&&m.userData.vfxOwned)m.dispose();
        else disposeMaterial(m);
      });
      else if(o.material.userData&&o.material.userData.vfxOwned)o.material.dispose();
      else disposeMaterial(o.material);
    }
  });
}

const VFX={
  recipes:VFX_RECIPES,
  spawn(id,ctx){
    const p=vfxParams(id,ctx);
    if(p.type==="projectile"){
      if(!p.targetPos){console.warn("VFX.spawn projectile 需要 targetPos");return null;}
      return vfxProjectile(p);
    }
    if(p.type==="ground_warn"){
      if(p.x==null||p.z==null||p.r==null){console.warn("VFX.spawn ground_warn 需要 x,z,r");return null;}
      return vfxGroundWarn(p);
    }
    if(p.type==="aura"){
      return vfxAura(p);
    }
    /* impact 默认；高 count 调用方（Boss burst）在此封顶 */
    if(!p.pos){console.warn("VFX.spawn impact 需要 pos");return null;}
    if(p.color==null||p.count==null||p.spread==null){
      console.warn("VFX.spawn impact 需要 color/count/spread（或有效配方 id）");return null;
    }
    const cap=(BAL.vfx.pool&&BAL.vfx.pool.maxCount)||24;
    if(p.count>cap)p.count=cap;
    return vfxImpact(p);
  },
};

function fireProjectile(targetPos,origin,opt){
  return VFX.spawn("lava_bolt",{targetPos,origin,opt});
}
function spawnTelegraph(x,z,r,delay){
  return VFX.spawn("eruption_ring",{x,z,r,delay});
}
function spawnBurst(pos,color,count,spread){
  return VFX.spawn("melee_impact",{pos,color,count,spread});
}

/* ---------- 受击闪白（跳过共享材质）+ 后仰标记 ---------- */
function pulseHitFlash(mesh,opts){
  if(!mesh)return;
  if(BAL.vfx&&BAL.vfx.hitFlash===false)return;
  const bal=BAL.vfx&&BAL.vfx.hit||{};
  const dur=opts&&opts.dur!=null?opts.dur:(bal.dur!=null?bal.dur:.12);
  mesh.userData.hitFlashT=1;
  mesh.userData.hitFlashDur=dur;
  mesh.userData.hitLean=1;
}

/** 每帧推进受击闪白/后仰（缓存可闪材质，避免每帧全树 traverse） */
function tickHitFlash(mesh,dt){
  if(!mesh||!mesh.userData)return;
  const U=mesh.userData;
  if(!(U.hitFlashT>0)&&!U.hitLean)return;
  if(!U._hitMats){
    const mats=[];
    mesh.traverse(o=>{
      if(!o.isMesh||!o.material||!o.material.emissive)return;
      if(o.material.userData&&o.material.userData.sharedMat)return;
      mats.push(o.material);
    });
    U._hitMats=mats;
  }
  const mats=U._hitMats;
  if(U.hitFlashT>0){
    const dur=U.hitFlashDur||((BAL.vfx&&BAL.vfx.hit&&BAL.vfx.hit.dur)||.12);
    U.hitFlashT=Math.max(0,U.hitFlashT-dt/dur);
    const pulse=U.hitFlashT*.5;
    for(let i=0;i<mats.length;i++){
      mats[i].emissive.setHex(0xffe8d0);
      mats[i].emissiveIntensity=pulse;
    }
    const lean=(BAL.vfx&&BAL.vfx.hit&&BAL.vfx.hit.lean)||.18;
    if(U.hitLean)mesh.rotation.x=lean*U.hitFlashT*.35;
  }else if(U.hitLean){
    mesh.rotation.x*=Math.max(0,1-dt*8);
    if(Math.abs(mesh.rotation.x)<.01){mesh.rotation.x=0;U.hitLean=0;}
    for(let i=0;i<mats.length;i++)mats[i].emissiveIntensity=0;
  }
}

/** 死亡溶解：噪声 alpha（非共享材质）；共享材质走整体淡出 scale */
function beginDissolve(mesh){
  if(!mesh)return;
  if(BAL.vfx&&BAL.vfx.dissolve===false)return;
  mesh.userData.dissolveT=0;
  mesh.userData.dissolving=true;
}

function tickDissolve(mesh,dt){
  if(!mesh||!mesh.userData||!mesh.userData.dissolving)return false;
  const spd=(BAL.vfx&&BAL.vfx.dissolveSpd)||1.4;
  mesh.userData.dissolveT=Math.min(1,(mesh.userData.dissolveT||0)+dt*spd);
  const t=mesh.userData.dissolveT;
  mesh.traverse(o=>{
    if(!o.isMesh||!o.material)return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    mats.forEach(m=>{
      if(m.userData&&m.userData.sharedMat)return;
      m.transparent=true;
      if(m.opacity==null)m.opacity=1;
      m.opacity=Math.max(0,1-t);
      if(m.emissiveIntensity!=null)m.emissiveIntensity*=(1-dt*2);
    });
  });
  mesh.scale.multiplyScalar(1-dt*.35);
  if(t>=1){mesh.userData.dissolving=false;mesh.visible=false;}
  return true;
}

/**
 * 每帧驱动：拖尾 / 预警填充 / 爆发环光 / 法阵 / 受击闪白
 * 由 main.js 调用；伤害逻辑仍在 main 的 telegraph 结算里。
 */
function tickVfx(dt){
  const t=typeof S!=="undefined"?S.t:0;
  const lifeMax=(BAL.vfx.impact&&BAL.vfx.impact.life)||.75;

  /* 投射物拖尾：每 3 帧采样一次 */
  if(S.projectiles){
    for(let pi=0;pi<S.projectiles.length;pi++){
      const pr=S.projectiles[pi];
      if(!pr.trail||!pr.trailArr)continue;
      pr.trailI=(pr.trailI||0)+1;
      if(pr.trailI%3===0){
        const N=pr.trailN, arr=pr.trailArr;
        for(let i=N-1;i>0;i--){
          const i3=i*3, j3=(i-1)*3;
          arr[i3]=arr[j3]; arr[i3+1]=arr[j3+1]; arr[i3+2]=arr[j3+2];
        }
        arr[0]=pr.mesh.position.x;
        arr[1]=pr.mesh.position.y;
        arr[2]=pr.mesh.position.z;
        pr.trail.geometry.attributes.position.needsUpdate=true;
        pr.trail.geometry.setDrawRange(0,N);
      }
    }
  }

  /* 地面预警填充（脉冲降频） */
  if(S.telegraphs){
    const pulse=.5+.5*Math.sin(t*8);
    for(let ti=0;ti<S.telegraphs.length;ti++){
      const tg=S.telegraphs[ti];
      if(tg.kind!=="ground_warn"||!tg.mat)continue;
      const k=Math.min(1,tg.t/Math.max(.01,tg.delay));
      tg.mat.uniforms.uFill.value=k;
      tg.mat.uniforms.uPulse.value=pulse;
      if(tg.ring&&tg.ring.material)tg.ring.material.opacity=.5+.3*pulse;
    }
  }

  /* 爆发衰减（平坦 velXYZ，无临时 Vector3） */
  if(S.bursts){
    const gdt=dt*6;
    for(let i=S.bursts.length-1;i>=0;i--){
      const b=S.bursts[i]; b.life+=dt;
      if(!b.pool||!b.slot){S.bursts.splice(i,1);continue;}
      const slot=b.slot;
      const pts=slot.pts;
      const arr=pts.geometry.attributes.position.array;
      const vel=slot.velXYZ;
      const n=slot.count;
      for(let j=0;j<n;j++){
        const j3=j*3;
        arr[j3]+=vel[j3]*dt;
        arr[j3+1]+=vel[j3+1]*dt;
        arr[j3+2]+=vel[j3+2]*dt;
        vel[j3+1]-=gdt;
      }
      pts.geometry.attributes.position.needsUpdate=true;
      const lifeK=1-b.life/lifeMax;
      pts.material.opacity=Math.max(0,lifeK);
      if(slot.ring.visible){
        slot.ring.scale.setScalar(.2+b.life*3.2);
        slot.ring.material.opacity=Math.max(0,.75*lifeK);
      }
      if(b.life>lifeMax){
        VFX_POOL.release(slot);
        S.bursts.splice(i,1);
      }
    }
  }

  /* 法阵 / 护盾呼吸 */
  if(S.auras){
    for(let i=S.auras.length-1;i>=0;i--){
      const a=S.auras[i]; a.t+=dt;
      if(a.mat&&a.mat.uniforms&&a.mat.uniforms.uTime)
        a.mat.uniforms.uTime.value=t;
      if(a.mode==="rune"&&a.life!=null&&a.t>=a.life){
        scene.remove(a.mesh); disposeVfxMesh(a.mesh); S.auras.splice(i,1);
      }
    }
  }
}

console.info("[vfx] R7 就绪：projectile/impact/aura/ground_warn · 粒子池");
