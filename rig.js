/* ============================================================
   炽心 · rig.js
   人形骨架层级 + Anim 状态机（plan-V2 · R5）
   ------------------------------------------------------------
   ★ Anim 动作为纯函数：只写关节 rotation/scale，不改 HP / 仇恨 / AI。
   ------------------------------------------------------------
   [依赖] THREE · core.js（BAL）
   [导出] createRigSkeleton assembleHumanoidRig updateHumanoidAnim
          Anim applyPose blendPose CLASS_LOOK_META
          getRig ensureHumanoidAnim
   ============================================================ */
"use strict";

/** 职业外观元数据（几何仍由 models.HUMANOIDS 提供；新增职业 = 一条 HUMANOIDS + 一条 META） */
const CLASS_LOOK_META={
  warrior:{armor:"plate",  animStyle:"melee2h"},
  mage   :{armor:"robe",   animStyle:"cast"},
  archer :{armor:"leather",animStyle:"shoot"},
  priest :{armor:"robe",   animStyle:"cast"},
  shaman :{armor:"leather",animStyle:"cast"},
  rogue  :{armor:"leather",animStyle:"melee1h"},
  warlock:{armor:"robe",   animStyle:"cast"},
  druid  :{armor:"robe",   animStyle:"cast"},
  paladin:{armor:"plate",  animStyle:"melee2h"},
};

function _j(name,x,y,z){
  const g=new THREE.Group();
  g.name=name;
  g.position.set(x||0,y||0,z||0);
  g.userData.joint=name;
  g.userData.baseRot={x:0,y:0,z:0};
  return g;
}

/**
 * 空骨架层级（无 mesh）。尺寸由 cfg 肩/腿坐标驱动。
 * @returns {{root, hips, spine, chest, neck, head, shoulderL, shoulderR,
 *   upperArmL, upperArmR, forearmL, forearmR, handL, handR,
 *   thighL, thighR, shinL, shinR, footL, footR, capeAnchor}}
 */
function createRigSkeleton(cfg){
  const hMul=(cfg.build&&cfg.build.height)||1;
  const armX=(cfg.arm&&cfg.arm.x)||.55;
  const armY=((cfg.arm&&cfg.arm.y)||2.1)*hMul;
  const legX=(cfg.leg&&cfg.leg.x)||.25;
  const legY=((cfg.leg&&cfg.leg.y)||.9)*hMul;
  const hipsY=legY;
  const chestLocalY=Math.max(.35,(armY-hipsY)*.55);
  const shoulderLocalY=Math.max(.15,armY-hipsY-chestLocalY);

  const root=_j("root");
  const hips=_j("hips",0,hipsY,0);
  const spine=_j("spine",0,.22*hMul,0);
  const chest=_j("chest",0,chestLocalY,0);
  const neck=_j("neck",0,.28*hMul,0);
  const head=_j("head",0,.2*hMul,0);
  const shoulderR=_j("shoulderR", armX, shoulderLocalY,0);
  const shoulderL=_j("shoulderL",-armX, shoulderLocalY,0);
  const upperArmR=_j("upperArmR");
  const upperArmL=_j("upperArmL");
  const forearmR=_j("forearmR",0,-.42*hMul,0);
  const forearmL=_j("forearmL",0,-.42*hMul,0);
  const handR=_j("handR",0,-.38*hMul,0);
  const handL=_j("handL",0,-.38*hMul,0);
  const thighR=_j("thighR", legX,0,0);
  const thighL=_j("thighL",-legX,0,0);
  const shinR=_j("shinR",0,-.45*hMul,0);
  const shinL=_j("shinL",0,-.45*hMul,0);
  const footR=_j("footR",0,-.42*hMul,0);
  const footL=_j("footL",0,-.42*hMul,0);
  const capeAnchor=_j("capeAnchor",0,.05,-.02);

  root.add(hips);
  hips.add(spine); spine.add(chest);
  chest.add(neck); neck.add(head);
  chest.add(shoulderR); chest.add(shoulderL);
  chest.add(capeAnchor);
  shoulderR.add(upperArmR); upperArmR.add(forearmR); forearmR.add(handR);
  shoulderL.add(upperArmL); upperArmL.add(forearmL); forearmL.add(handL);
  hips.add(thighR); hips.add(thighL);
  thighR.add(shinR); shinR.add(footR);
  thighL.add(shinL); shinL.add(footL);

  return{
    root,hips,spine,chest,neck,head,
    shoulderL,shoulderR,upperArmL,upperArmR,forearmL,forearmR,handL,handR,
    thighL,thighR,shinL,shinR,footL,footR,capeAnchor,
    scale:hMul,
  };
}

function getRig(mesh){
  return mesh&&mesh.userData&&mesh.userData.rig||null;
}

function ensureHumanoidAnim(mesh){
  if(!mesh.userData)mesh.userData={};
  if(!mesh.userData.anim)
    mesh.userData.anim={
      state:"idle", prev:"idle", blend:1, blendDur:.15,
      walkPhase:0, attackAnim:0, t:0, hitT:0, style:"melee1h",
    };
  return mesh.userData.anim;
}

/* ---------- Pose 表：关节局部欧拉角（弧度） ---------- */
const Anim=(function(){
  function pose(){return{};}
  function set(p,joint,x,y,z){p[joint]={x:x||0,y:y||0,z:z||0};return p;}

  function idle(rig,t,p){
    const out=pose();
    const b=Math.sin(t*1.95)*.012;
    set(out,"chest",b*.4,Math.sin(t*.8)*.04,0);
    set(out,"head",Math.sin(t*.6)*.06,Math.sin(t*.45)*.08,0);
    set(out,"upperArmR",.08+Math.sin(t*1.2)*.04,0,.06);
    set(out,"upperArmL",.08+Math.sin(t*1.2+.5)*.04,0,-.06);
    set(out,"forearmR",.15,0,0);
    set(out,"forearmL",.15,0,0);
    /* 披风 idle 微飘：轻柔呼吸 + 微风横向摆动 */
    if(rig&&rig.cape)set(out,"cape",.15+Math.sin(t*2.2)*.06,Math.sin(t*.7)*.08,0);
    return out;
  }

  function walk(rig,t,p){
    const out=pose();
    const ph=(p&&p.phase!=null)?p.phase:t*9;
    const amp=(p&&p.amp!=null)?p.amp:.55;
    const sw=Math.sin(ph)*amp;
    const run=!!(p&&p.run);
    const mul=run?1.35:1;
    set(out,"hips",0,0,Math.sin(ph)*.04*mul);
    set(out,"spine",0,Math.sin(ph)*.06*mul,0);
    set(out,"chest",run?.12:0,Math.sin(ph)*.05,0);
    set(out,"thighR",sw*mul,0,0);
    set(out,"thighL",-sw*mul,0,0);
    set(out,"shinR",Math.max(0,-sw)*.55*mul,0,0);
    set(out,"shinL",Math.max(0,sw)*.55*mul,0,0);
    set(out,"upperArmR",-sw*.55*mul,0,.05);
    set(out,"upperArmL",sw*.55*mul,0,-.05);
    set(out,"forearmR",.25+Math.abs(sw)*.2,0,0);
    set(out,"forearmL",.25+Math.abs(sw)*.2,0,0);
    set(out,"head",0,Math.sin(ph)*.03,0);
    /* 披风随行走摆动：速度越快飘得越高，横向随风摆动 */
    if(rig&&rig.cape)set(out,"cape",.12+Math.abs(sw)*.35+Math.sin(t*3.5)*.04,Math.sin(ph*.7)*.12,0);
    return out;
  }

  function run(rig,t,p){
    return walk(rig,t,Object.assign({},p||{},{run:true,amp:(p&&p.amp)||.7}));
  }

  function attack1h(rig,t,p){
    const out=idle(rig,t,p);
    const a=Math.min(1,(p&&p.attackAnim)||0);
    const swing=Math.sin(a*Math.PI);
    set(out,"spine",-.15*swing,0,.1*swing);
    set(out,"chest",-.2*swing,.15*swing,0);
    set(out,"upperArmR",-2.2*swing,0,.2);
    set(out,"forearmR",.1+.8*swing,0,0);
    set(out,"upperArmL",.2*swing,0,-.15);
    /* 披风随攻击甩动 */
    if(rig&&rig.cape)set(out,"cape",.15+.35*swing,Math.sin(a*2.5)*.2,0);
    return out;
  }

  function attack2h(rig,t,p){
    const out=idle(rig,t,p);
    const a=Math.min(1,(p&&p.attackAnim)||0);
    const swing=Math.sin(a*Math.PI);
    set(out,"spine",-.22*swing,0,0);
    set(out,"chest",-.25*swing,0,0);
    set(out,"upperArmR",-2.5*swing,.1*swing,0);
    set(out,"forearmR",.05+.9*swing,0,0);
    set(out,"upperArmL",-1.2*swing,0,0);
    set(out,"forearmL",.3*swing,0,0);
    if(rig&&rig.cape)set(out,"cape",.15+.4*swing,Math.sin(a*2.5)*.25,0);
    return out;
  }

  function cast(rig,t,p){
    const out=idle(rig,t,p);
    const a=Math.min(1,(p&&p.attackAnim)||.7);
    set(out,"chest",-.08*a,0,0);
    set(out,"upperArmR",-1.1*a,0,-.35*a);
    set(out,"upperArmL",-1.0*a,0,.35*a);
    set(out,"forearmR",.2+.6*a,0,0);
    set(out,"forearmL",.2+.6*a,0,0);
    set(out,"head",-.1*a,0,0);
    if(rig&&rig.cape)set(out,"cape",.15+.2*Math.sin(a*Math.PI),Math.sin(t*2.5)*.06,0);
    return out;
  }

  function shoot(rig,t,p){
    const out=idle(rig,t,p);
    const a=Math.min(1,(p&&p.attackAnim)||0);
    const pull=Math.sin(Math.min(1,a)*Math.PI);
    set(out,"upperArmL",-.4*pull,0,.5*pull);
    set(out,"forearmL",.8*pull,0,0);
    set(out,"upperArmR",-.9*pull,-.3*pull,-.2*pull);
    set(out,"forearmR",1.1*pull,0,0);
    set(out,"chest",0,.2*pull,0);
    set(out,"head",0,.15*pull,0);
    if(rig&&rig.cape)set(out,"cape",.15+.25*pull,Math.sin(t*2.5)*.06,0);
    return out;
  }

  function hit(rig,t,p){
    const out=idle(rig,t,p);
    const a=Math.min(1,(p&&p.hitT)||0);
    set(out,"spine",.25*a,0,0);
    set(out,"chest",.2*a,0,0);
    set(out,"head",.15*a,0,0);
    if(rig&&rig.cape)set(out,"cape",.15+.2*a,Math.sin(t*3)*.08,0);
    return out;
  }

  function die(rig,t,p){
    const out=pose();
    const a=Math.min(1,(p&&p.death)||0);
    set(out,"hips",0,0,.4*a);
    set(out,"spine",.5*a,0,.3*a);
    set(out,"thighR",.6*a,0,.2*a);
    set(out,"thighL",.7*a,0,-.1*a);
    set(out,"shinR",.8*a,0,0);
    set(out,"shinL",.9*a,0,0);
    set(out,"upperArmR",.5*a,0,.4*a);
    set(out,"upperArmL",.4*a,0,-.3*a);
    if(rig&&rig.cape)set(out,"cape",.15+.5*a,Math.sin(t*4)*.1,0);
    return out;
  }

  const TABLE={idle,walk,run,attack1h,attack2h,cast,shoot,hit,die};

  return{idle,walk,run,attack1h,attack2h,cast,shoot,hit,die,TABLE};
})();

function applyPose(rig,pose){
  if(!rig||!pose)return;
  for(const k in pose){
    const j=rig[k];
    if(!j||!pose[k])continue;
    j.rotation.x=pose[k].x;
    j.rotation.y=pose[k].y;
    j.rotation.z=pose[k].z;
  }
  if(rig.cape&&pose.cape){
    rig.cape.rotation.x=pose.cape.x;
    rig.cape.rotation.y=pose.cape.y||0;
    rig.cape.rotation.z=pose.cape.z||0;
  }
}

function blendPose(a,b,t){
  const out={};
  const keys={};
  if(a)for(const k in a)keys[k]=1;
  if(b)for(const k in b)keys[k]=1;
  const u=Math.max(0,Math.min(1,t));
  for(const k in keys){
    const A=a&&a[k]?a[k]:{x:0,y:0,z:0};
    const B=b&&b[k]?b[k]:{x:0,y:0,z:0};
    out[k]={x:A.x+(B.x-A.x)*u, y:A.y+(B.y-A.y)*u, z:A.z+(B.z-A.z)*u};
  }
  return out;
}

function pickAnimName(state,style){
  if(state==="attack"){
    if(style==="cast")return"cast";
    if(style==="shoot")return"shoot";
    if(style==="melee2h")return"attack2h";
    return"attack1h";
  }
  if(state==="run")return"run";
  if(state==="walk")return"walk";
  if(state==="hit")return"hit";
  if(state==="dead"||state==="die")return"die";
  return"idle";
}

/**
 * 每帧驱动人形 Anim（玩家 / 同伴）
 * params: {moving, speedMul, attackAnim, hitT, alive, dt, phase, style}
 */
function updateHumanoidAnim(mesh,dt,params){
  if(!mesh)return;
  const rig=getRig(mesh);
  const A=ensureHumanoidAnim(mesh);
  const p=params||{};
  const bal=BAL.anim||{};
  A.t=(A.t||0)+dt;
  if(p.style)A.style=p.style;

  let state="idle";
  if(p.alive===false||p.dead)state="die";
  else if(p.hitT>0)state="hit";
  else if(p.attackAnim>0)state="attack";
  else if(p.moving){
    const sp=p.speedMul!=null?p.speedMul:1;
    state=sp>1.25?"run":"walk";
  }

  if(state!==A.state){
    A.prev=A.state;
    A.state=state;
    A.blend=0;
    A.prevPose=A.curPose||null;
  }

  if(state==="walk"||state==="run"){
    A.walkPhase+=(bal.walkFreq||9)*dt*(state==="run"?1.35:1);
  }else{
    A.walkPhase*=1-(bal.walkDecay||8)*dt;
  }

  const style=A.style||"melee1h";
  const name=pickAnimName(state,style);
  const fn=Anim.TABLE[name]||Anim.idle;
  const poseParams={
    phase:p.phase!=null?p.phase:A.walkPhase,
    attackAnim:p.attackAnim||0,
    hitT:p.hitT||0,
    death:p.death||(state==="die"?1:0),
    amp:bal.walkAmp||.55,
    run:state==="run",
  };
  let pose=fn(rig,A.t,poseParams);

  const blendDur=bal.blendDur!=null?bal.blendDur:.15;
  if(A.blend<1){
    A.blend=Math.min(1,A.blend+dt/Math.max(.05,blendDur));
    if(A.prevPose)pose=blendPose(A.prevPose,pose,A.blend);
  }
  A.curPose=pose;

  if(rig)applyPose(rig,pose);
  else{
    /* 无 rig 时回退旧五挂点 */
    const U=mesh.userData;
    const sw=Math.sin(A.walkPhase)*(bal.walkAmp||.55);
    if(U.legR&&U.legL){U.legR.rotation.x=sw;U.legL.rotation.x=-sw;}
    if(U.armR){
      if(p.attackAnim>0)U.armR.rotation.x=-2.4*Math.sin(Math.min(1,p.attackAnim)*Math.PI);
      else U.armR.rotation.x=Math.sin(A.walkPhase)*.3;
    }
    if(U.armL)U.armL.rotation.x=-Math.sin(A.walkPhase)*.3;
    if(U.cape)U.cape.rotation.x=.12+Math.abs(sw)*.25+Math.sin(A.t*3)*.04;
  }

  /* hit 闪白（render-only；跳过共享材质） */
  if(p.hitT>0&&mesh.traverse){
    mesh.userData._hitFlash=true;
    const pulse=Math.min(1,p.hitT)*.45;
    mesh.traverse(o=>{
      if(!o.isMesh||!o.material||!o.material.emissive)return;
      if(o.material.userData&&o.material.userData.sharedMat)return;
      o.material.emissive.setHex(0xffe0c0);
      o.material.emissiveIntensity=pulse;
    });
  }else if(mesh.userData&&mesh.userData._hitFlash){
    mesh.userData._hitFlash=false;
    mesh.traverse(o=>{
      if(!o.isMesh||!o.material||!o.material.emissive)return;
      if(o.material.userData&&o.material.userData.sharedMat)return;
      o.material.emissiveIntensity=0;
    });
  }
}

/**
 * 由 models.buildHumanoid 调用：在已有 cfg / 工厂回调下装配带 mesh 的 rig。
 * hooks: { makeMats, prim, addParts, buildWeapon }
 */
function assembleHumanoidRig(cfg,hooks){
  const H=hooks||{};
  const rig=createRigSkeleton(cfg);
  const root=rig.root;
  const M=H.makeMats(cfg.mats);
  const hMul=rig.scale;

  /* 躯干部件：按高度挂到 hips / chest / head */
  const hipsY=rig.hips.position.y;
  (cfg.parts||[]).forEach(spec=>{
    const mesh=H.prim(spec,M);
    const py=(spec.p&&spec.p[1])||0;
    let parent=rig.chest;
    let oy=hipsY+rig.spine.position.y+rig.chest.position.y;
    if(py>=2.35){
      parent=rig.head;
      oy=hipsY+rig.spine.position.y+rig.chest.position.y+rig.neck.position.y+rig.head.position.y;
    }else if(py<hipsY+.35){
      parent=rig.hips;
      oy=hipsY;
    }
    mesh.position.set(spec.p[0],py-oy,spec.p[2]);
    if(spec.r)mesh.rotation.set(spec.r[0]||0,spec.r[1]||0,spec.r[2]||0);
    parent.add(mesh);
  });

  /* 面部特征：眼睛/嘴/眉毛（挂 head joint，所有职业共用） */
  {
    const skinM=new THREE.MeshBasicMaterial({color:0xd8a37a});
    const whiteM=new THREE.MeshBasicMaterial({color:0xf0eee8});
    const blackM=new THREE.MeshBasicMaterial({color:0x080810});
    const pinkM=new THREE.MeshBasicMaterial({color:0xc06050});
    /* 双眼白 */
    const eL=new THREE.Mesh(new THREE.SphereGeometry(.055,8,8),whiteM);
    eL.position.set(.12,.18,.26);rig.head.add(eL);
    const eR=new THREE.Mesh(new THREE.SphereGeometry(.055,8,8),whiteM);
    eR.position.set(-.12,.18,.26);rig.head.add(eR);
    /* 瞳孔 */
    const pL=new THREE.Mesh(new THREE.SphereGeometry(.03,6,6),blackM);
    pL.position.set(.12,.16,.31);rig.head.add(pL);
    const pR=new THREE.Mesh(new THREE.SphereGeometry(.03,6,6),blackM);
    pR.position.set(-.12,.16,.31);rig.head.add(pR);
    /* 眉毛 */
    const bL=new THREE.Mesh(new THREE.BoxGeometry(.1,.015,.02),skinM);
    bL.position.set(.12,.28,.26);rig.head.add(bL);
    const bR=new THREE.Mesh(new THREE.BoxGeometry(.1,.015,.02),skinM);
    bR.position.set(-.12,.28,.26);rig.head.add(bR);
    /* 嘴 */
    const mouth=new THREE.Mesh(new THREE.BoxGeometry(.12,.018,.02),pinkM);
    mouth.position.set(0,-.02,.26);rig.head.add(mouth);
  }

  /* 上臂 mesh → upperArm；小臂为空关节（动画用） */
  if(cfg.arm&&cfg.arm.mesh){
    const mR=H.prim(cfg.arm.mesh,M);
    const mL=H.prim(cfg.arm.mesh,M);
    rig.upperArmR.add(mR);
    rig.upperArmL.add(mL);
  }
  if(cfg.armExtraR)H.addParts(rig.handR,cfg.armExtraR,M);
  if(cfg.armExtraL)H.addParts(rig.handL,cfg.armExtraL,M);

  /* 大腿 mesh；小腿可空（长袍） */
  if(cfg.leg&&cfg.leg.mesh){
    rig.thighR.add(H.prim(cfg.leg.mesh,M));
    rig.thighL.add(H.prim(cfg.leg.mesh,M));
  }

  /* 披风 */
  let cape=null;
  if(cfg.cape&&H.GEO){
    cape=new THREE.Mesh(H.GEO.plane(cfg.cape.a),M[cfg.cape.m]);
    const cy=(cfg.cape.p[1]||0)-(hipsY+rig.spine.position.y+rig.chest.position.y);
    cape.position.set(cfg.cape.p[0],cy,cfg.cape.p[2]);
    cape.rotation.x=cfg.cape.rx||.12;
    rig.capeAnchor.add(cape);
  }
  rig.cape=cape;

  /* 武器挂 handR / handL */
  const mountName=cfg.weaponMount==="armL"?"handL":"handR";
  const mount=rig[mountName];
  const w=H.buildWeapon(cfg.weapon);
  /* 旧 weaponPos 相对整臂根；现挂 hand，Y 上移约一前臂 */
  const wp=cfg.weaponPos||[0,-.2,.1];
  w.position.set(wp[0],wp[1]+.72,wp[2]);
  mount.add(w);

  root.traverse(o=>{if(o.isMesh)o.castShadow=true;});

  /* 兼容旧挂点名：动画与 companions / setWeapon */
  root.userData={
    rig,
    armR:rig.upperArmR, armL:rig.upperArmL,
    legR:rig.thighR, legL:rig.thighL,
    cape,
    handR:rig.handR, handL:rig.handL,
    weaponMount:mount, weaponPos:[wp[0],wp[1]+.72,wp[2]], defaultWeapon:cfg.weapon,
    kind:"humanoid",
    anim:{state:"idle",walkPhase:0,attackAnim:0,deathRoll:0,style:(cfg.meta&&cfg.meta.animStyle)||"melee1h"},
  };
  return root;
}
