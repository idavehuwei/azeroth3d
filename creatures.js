/* ============================================================
   炽心 · creatures.js
   生物族群工厂（plan-V2 · R6 + plan-beautify B5 GLB）
   ------------------------------------------------------------
   [依赖] THREE · palette.js（MAT）· models.js（buildHumanoid · makeMats · prim · GEO 运行时）
          assets.js（ASSETS.cloneCreature）
   [导出] buildQuadruped buildScorpion buildElemental buildFlameSpawn
          buildHumanoidMob buildMeleeHumanoid buildCentaur buildBoar
          buildCreatureGLB upgradeAllMobMeshes tryUpgradeMobMesh
          QUAD_TO_CREATURE QUADS MOB_HUMANOIDS MELEE_HUMANOIDS MOB_LOOK ELEMENTALS
   ------------------------------------------------------------
   四足 / 人形怪 / 元素：加怪种 = 配方表一条 + BALANCE.mobs 一条，不改工厂本体。
   GLB 路径：QUADS style → QUAD_TO_CREATURE → ASSETS.cloneCreature；无 GLB 的回退程序化。
   ============================================================ */
"use strict";

function _quadMat(hex,opts){
  opts=opts||{};
  return MAT.get("fur.quad",{
    color:hex,roughness:opts.r!=null?opts.r:1,metalness:opts.mt||0,
    flatShading:true,
    emissive:opts.e||0x000000,emissiveIntensity:opts.ei||0,
  });
}

function _creatureAnim(){
  return {state:"idle",walkPhase:0,attackAnim:0,deathRoll:0,deathActive:false};
}

/* ============================================================
   配方表（R6 · MOB_LOOK = 四足外观；人形/元素另表）
   ============================================================ */
const QUADS={
  boar    :{fur:0x6a4a2e,furD:0x45311e,accent:0x8a6040,tusks:true,mane:true,ears:true,tail:'short',style:"boar",
            head:"boar",neck:"short",gait:{freq:2.2,lift:.18}},
  wolf    :{fur:0x7a7a82,furD:0x4a4a52,accent:0x9a9aa2,snoutLong:true,ears:true,mane:true,tail:'bushy',style:"wolf",
            head:"wolf",neck:"short",gait:{freq:2.6,lift:.2}},
  bird    :{fur:0xd8b060,furD:0xa87830,accent:0xf0d080,legs:2,neck:1.15,beak:true,crest:true,tail:'plume',style:"bird",
            head:"beak",neck:"long",gait:{freq:2.0,lift:.22}},
  boarKing:{fur:0x8a8578,furD:0x55524a,accent:0xb0a898,tusks:true,tuskBig:true,mane:true,ears:true,tail:'short',size:2.15,style:"boar",
            head:"boar",gait:{freq:1.8,lift:.16}},
  magmadar:{fur:0x8a2208,furD:0x3a1008,accent:0xff6020,tusks:true,tuskBig:true,mane:true,ears:true,tail:'bushy',size:5.1,style:"wolf",glow:0xff4400,
            head:"wolf",gait:{freq:1.6,lift:.14}},
  zebra   :{fur:0xe8e0d0,furD:0x2a2820,accent:0xf5f0e8,ears:true,mane:true,tail:'bushy',size:1.05,style:"zebra",stripes:true,
            head:"wolf",gait:{freq:2.4,lift:.2}},
  quilboar:{fur:0xc4783a,furD:0x8a5020,accent:0xe09850,tusks:true,mane:true,ears:true,tail:'short',size:1.15,quills:true,style:"boar",
            head:"boar",gait:{freq:2.1,lift:.17}},
  scorp   :{fur:0xc87828,furD:0x5a3010,accent:0xe09040,size:1.1,style:"scorp",scorpion:true,
            gait:{freq:2.0,lift:.12}},
  razorback:{fur:0x8a4020,furD:0x4a2010,accent:0xb05028,tusks:true,tuskBig:true,mane:true,ears:true,tail:'short',size:1.35,quills:true,style:"boar",
            head:"boar",gait:{freq:2.0,lift:.16}},
  deviate :{fur:0x4a8a3a,furD:0x2a5a20,accent:0x6ab050,tusks:true,mane:true,ears:true,tail:'short',size:1.25,quills:true,style:"boar",
            head:"boar",gait:{freq:2.2,lift:.18}},
  cobrahn :{fur:0x3a7a28,furD:0x1a4010,accent:0x55a040,tusks:true,tuskBig:true,mane:true,ears:true,tail:'bushy',size:4.2,style:"wolf",
            head:"wolf",gait:{freq:1.7,lift:.14}},
  verdan  :{fur:0x2a6a38,furD:0x143820,accent:0x48a050,tusks:true,tuskBig:true,mane:true,ears:true,tail:'bushy',size:5.5,style:"wolf",
            head:"wolf",gait:{freq:1.5,lift:.12}},
  oggleflint:{fur:0x8a3018,furD:0x3a1008,accent:0xff6020,tusks:true,tuskBig:true,mane:true,ears:true,tail:'bushy',size:4.0,style:"wolf",glow:0xff4400,
            head:"wolf",gait:{freq:1.7,lift:.14}},
  taragaman :{fur:0xa82810,furD:0x481008,accent:0xff8030,tusks:true,tuskBig:true,mane:true,ears:true,tail:'bushy',size:5.2,style:"wolf",glow:0xff5500,
            head:"wolf",gait:{freq:1.55,lift:.13}},
  kodo    :{fur:0x8a6a40,furD:0x4a3820,accent:0xb09060,tusks:true,ears:true,mane:true,tail:'bushy',size:2.35,style:"wolf",
            head:"wolf",bulk:1.2,gait:{freq:1.4,lift:.12}},
  youngBoar:{fur:0x7a5a38,furD:0x4a3820,accent:0x9a7848,tusks:true,mane:true,ears:true,tail:'short',size:.78,style:"boar",
            head:"boar",gait:{freq:2.5,lift:.2}},
  palemane:{fur:0xb89870,furD:0x6a5840,accent:0xd0b890,snoutLong:true,ears:true,mane:true,tail:'bushy',size:1.05,style:"wolf",
            head:"wolf",gait:{freq:2.4,lift:.19}},
  thunderhawk:{fur:0x6a7088,furD:0x3a4050,accent:0x90a0b8,legs:2,neck:1.25,beak:true,crest:true,tail:'plume',size:1.15,style:"bird",
            head:"beak",neck:"long",gait:{freq:2.1,lift:.22}},
  plainslion:{fur:0xc8a050,furD:0x6a5028,accent:0xe0c070,snoutLong:true,ears:true,mane:true,tail:'bushy',size:1.12,style:"wolf",
            head:"wolf",gait:{freq:2.5,lift:.2}},
  bristleback:{fur:0xb06830,furD:0x6a3818,accent:0xd09050,tusks:true,mane:true,ears:true,tail:'short',size:.95,quills:true,style:"boar",
            head:"boar",gait:{freq:2.2,lift:.17}},
  raptor  :{fur:0x4a8a38,furD:0x2a5020,accent:0x6ab050,legs:2,neck:1.05,beak:true,crest:true,tail:'plume',size:1.2,style:"bird",
            head:"beak",neck:"long",gait:{freq:2.3,lift:.24}},
  crocolisk:{fur:0x4a6a48,furD:0x2a3a28,accent:0x6a8a58,snoutLong:true,ears:false,mane:false,tail:'whip',size:1.25,style:"wolf",
            head:"wolf",gait:{freq:1.8,lift:.1}},
  /* G6：熔岩巨兽 = 炎喉 Boss 体型（与 magmadar 配方对齐） */
  lavabeast:{fur:0x8a2208,furD:0x3a1008,accent:0xff6020,tusks:true,tuskBig:true,mane:true,ears:true,tail:'bushy',size:5.1,style:"wolf",glow:0xff4400,
            head:"wolf",bulk:1.4,gait:{freq:1.6,lift:.14}},
  /* plan-v4 STEP 22 · 灰烬峡谷 */
  ashboar:{fur:0x4a3830,furD:0x2a2018,accent:0x8a5030,tusks:true,mane:true,ears:true,tail:'short',size:1.05,style:"boar",
            head:"boar",gait:{freq:2.1,lift:.17},glow:0xff6020},
  cinderwolf:{fur:0x3a3030,furD:0x1a1414,accent:0xa84828,snoutLong:true,ears:true,mane:true,tail:'bushy',size:1.08,style:"wolf",
            head:"wolf",gait:{freq:2.5,lift:.2},glow:0xff5010},
  scorchtusk:{fur:0x5a3830,furD:0x2a1810,accent:0xff7030,tusks:true,tuskBig:true,mane:true,ears:true,tail:'short',size:2.05,style:"boar",
            head:"boar",gait:{freq:1.75,lift:.15},glow:0xff6020},
  /* plan-beautify B5 · GLB 生物新增 */
  fox     :{fur:0xd89050,furD:0x8a5028,accent:0xf0c080,ears:true,tail:'bushy',size:.62,style:"fox",
            head:"wolf",gait:{freq:2.8,lift:.22}},
  stag    :{fur:0xb89860,furD:0x6a4828,accent:0xe0c888,ears:true,mane:false,tail:'short',size:.85,style:"stag",
            head:"wolf",antlers:true,gait:{freq:2.4,lift:.22}},
  spider  :{fur:0x2a2828,furD:0x1a1818,accent:0x6a3828,legs:8,size:.75,style:"spider",
            head:"spider",gait:{freq:3.0,lift:.14}},
};

/** plan-V2 R6 名称：与 QUADS 同一对象，加四足怪 = MOB_LOOK.xxx */
const MOB_LOOK=QUADS;

/* ============================================================
   GLB 生物映射：QUADS style → ASSETS creature kind
   有映射 = 优先 GLB；无映射 = 回退程序化
   ============================================================ */
const QUAD_TO_CREATURE={
  boar:"wild_boar", youngBoar:"wild_boar", bristleback:"wild_boar",
  razorback:"wild_boar", deviate:"wild_boar", ashboar:"wild_boar",
  scorchtusk:"wild_boar", quilboar:"wild_boar",
  wolf:"wolf", palemane:"wolf", plainslion:"wolf",
  cinderwolf:"wolf",
  kodo:"bull",
  fox:"fox",
  stag:"stag",
  spider:"spider",
  /* 无 GLB 对应：bird thunderhawk raptor scorp crocolisk zebra
     boarKing magmadar cobrahn verdan oggleflint taragaman lavabeast → 保留程序化
     (可后续映射到 demon/giant 放大版) */
};

const MOB_HUMANOIDS={
  harpy:{size:1.55,skin:0xc9a2b8,feather:0x5a3a6e,featherD:0x3a2450,hair:0x2a1a3e,claw:0xe8e0c8,wings:true,claws:true},
  cliffHarpy:{size:1.75,skin:0xd4a090,feather:0x6a3020,featherD:0x3a1810,hair:0x2a1008,claw:0xe8d0a0,wings:true,claws:true},
  windfury:{size:1.35,skin:0xc8b0d0,feather:0x4a3a70,featherD:0x2a1a48,hair:0x1a1030,claw:0xe8e0c8,wings:true,claws:true},
  /* 小恶魔（R6 配方；世界刷怪可后续接线） */
  imp:{size:.85,skin:0x6a3038,feather:0x4a1820,featherD:0x2a1018,hair:0x1a080c,claw:0xff8030,
       wings:true,claws:true,tail:true,horns:true},
  centaur:{size:1.2,skin:0xc9a080,fur:0x8a6a40,furD:0x5a4028,cloth:0x6a4030},
  centaurHerald:{size:1.55,skin:0xd4a878,fur:0x6a5030,furD:0x3a2818,cloth:0x8a3020,banner:true},
};

const MELEE_HUMANOIDS={
  baeldun:{size:.95,skin:0xc9a090,cloth:0x3a5a7a,clothD:0x1a3048,helm:0x8a9098,weapon:0xc0c8d0},
  baeldunDigger:{size:.9,skin:0xb89070,cloth:0x6a5a40,clothD:0x3a3020,helm:0x8a7848,weapon:0xa09060},
  venture:{size:.88,skin:0x90b070,cloth:0x4a6a38,clothD:0x2a3a20,helm:0x6a8040,weapon:0xc0a040},
  ventureBoss:{size:1.05,skin:0x88a868,cloth:0x3a5028,clothD:0x1a2810,helm:0x506030,weapon:0xd0b050},
};

const ELEMENTALS={
  flame:{color:0xff6020,emissive:0xff4010,size:1,flame:true,rocks:5,light:0xff6a20},
  lavaCore:{color:0xff8030,emissive:0xff5020,size:1.25,flame:true,rocks:6,light:0xff8020},
  wind:{color:0xa8e0ff,emissive:0x66b0e0,size:.95,flame:false,rocks:4,light:0x88c8ff},
  water:{color:0x5090e0,emissive:0x2870c0,size:1.05,flame:false,rocks:4,light:0x4080e0},
  earth:{color:0xa08050,emissive:0x705828,size:1.1,flame:false,rocks:5,light:0xa08050},
  oasis:{color:0x3a7a58,emissive:0x1a5030,size:1.15,flame:false,rocks:4,light:0x3a8a58},
  slag:{color:0x6a4030,emissive:0xff5020,size:1.0,flame:true,rocks:5,light:0xff6020},
  /* plan-beautify B5 · GLB 人形（有骨骼模型时优先 GLB） */
  goblin:{size:.85,skin:0x7a9a48,cloth:0x5a3828,clothD:0x3a2018,glb:"goblin"},
  orc:{size:1.08,skin:0x8a6040,cloth:0x4a3830,clothD:0x2a2018,glb:"orc"},
};

/* ============================================================
   元素族群：核心 + 环绕碎岩 + 多层火焰 + 点光
   ============================================================ */
function buildElemental(cfg){
  const c=Object.assign({color:0x88c8ff,emissive:0x4488cc,size:1,flame:false,rocks:4,light:null},cfg);
  const g=new THREE.Group();
  const mat=MAT.get("elem.core",{color:c.color,roughness:.35,metalness:.25,
    transparent:true,opacity:.88,emissive:c.emissive||c.color,emissiveIntensity:.45,flatShading:true});
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.7,1),mat);
  core.position.y=1.15; g.add(core);

  const rocks=[];
  const n=Math.max(3,Math.min(6,c.rocks|0||4));
  const rockMat=MAT.get("elem.rock",{color:c.emissive||c.color,roughness:.85,metalness:.15,
    flatShading:true,emissive:c.emissive||c.color,emissiveIntensity:.2});
  for(let i=0;i<n;i++){
    const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.18+((i%3)*.04),0),rockMat);
    const orbit=new THREE.Group();
    orbit.userData={phase:(i/n)*Math.PI*2, radius:.85+((i%2)*.15), y:1.05+((i%3)*.12), spd:.7+((i%3)*.25)};
    rock.position.set(orbit.userData.radius,0,0);
    orbit.add(rock); orbit.position.y=orbit.userData.y; g.add(orbit);
    rocks.push(orbit);
  }

  const flames=[];
  if(c.flame){
    const layers=[
      {r:.55,h:1.5,y:2.0,op:.9,col:0xffa030,freq:1.0},
      {r:.4,h:1.1,y:2.15,op:.7,col:0xffd060,freq:1.35},
      {r:.28,h:.75,y:2.25,op:.55,col:0xfff0a0,freq:1.7},
    ];
    layers.forEach((L,i)=>{
      const flame=new THREE.Mesh(new THREE.ConeGeometry(L.r,L.h,6),
        new THREE.MeshBasicMaterial({color:L.col,transparent:true,opacity:L.op}));
      flame.position.y=L.y; flame.userData.flame=true; flame.userData.flameFreq=L.freq; flame.userData.flameBase=L.y;
      g.add(flame); flames.push(flame);
    });
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.14,6,6),new THREE.MeshBasicMaterial({color:0xffe080}));
    eye.position.set(0,1.2,.72); g.add(eye);
  }else{
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.07,6,16),mat);
    ring.position.y=1.15; ring.rotation.x=Math.PI/2; g.add(ring);
  }

  const lightCol=c.light!=null?c.light:(c.emissive||c.color);
  const pLight=new THREE.PointLight(lightCol,c.flame?1.4:.7,c.flame?14:10,2);
  pLight.position.set(0,1.3,0); g.add(pLight);

  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData={kind:"elemental", core, rocks, flames, light:pLight,
    anim:_creatureAnim()};
  return g;
}

function buildFlameSpawn(){
  return buildElemental(ELEMENTALS.flame);
}

/* ============================================================
   赭岩巨蝎
   ============================================================ */
function buildScorpion(cfg){
  const c=Object.assign({size:1.1,fur:0xc87828,furD:0x5a3010,accent:0xe09040},cfg);
  const g=new THREE.Group();
  const shell=_quadMat(c.fur,{r:.75});
  const dark=_quadMat(c.furD,{r:.85});
  const tip=_quadMat(c.accent||0xe09040,{r:.55,mt:.15});
  const claw=_quadMat(0xd0a060,{r:.5,mt:.2});
  const cephal=new THREE.Mesh(new THREE.BoxGeometry(1.15,.55,1.0),shell);
  cephal.position.set(0,.85,.35); g.add(cephal);
  const brow=new THREE.Mesh(new THREE.BoxGeometry(1.05,.22,.35),dark);
  brow.position.set(0,1.15,.55); g.add(brow);
  [-1,1].forEach(s=>{
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.09,6,5),
      _quadMat(0x1a0800,{e:0xff6020,ei:.55,r:.4}));
    eye.position.set(s*.32,1.05,.82); g.add(eye);
  });
  for(let i=0;i<4;i++){
    const seg=new THREE.Mesh(new THREE.BoxGeometry(1.0-i*.08,.48-i*.03,.55),i%2?dark:shell);
    seg.position.set(0,.8-i*.02,-.35-i*.48); g.add(seg);
  }
  [-1,1].forEach(s=>{
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(.1,.12,.7,6),dark);
    arm.position.set(s*.7,.95,.55); arm.rotation.z=s*-1.05; arm.rotation.x=.35; g.add(arm);
    const pincer=new THREE.Mesh(new THREE.BoxGeometry(.22,.18,.55),claw);
    pincer.position.set(s*1.05,.75,1.05); g.add(pincer);
    const dig=new THREE.Mesh(new THREE.ConeGeometry(.08,.28,5),tip);
    dig.position.set(s*1.05,.72,1.38); dig.rotation.x=Math.PI/2; g.add(dig);
  });
  const legs=[];
  for(let i=0;i<4;i++){
    [-1,1].forEach(s=>{
      const pivot=new THREE.Group();
      pivot.position.set(s*.55,.55,.4-i*.35);
      const upper=new THREE.Mesh(new THREE.CylinderGeometry(.07,.06,.45,5),dark);
      upper.position.set(s*.2,-.1,0); upper.rotation.z=s*.9; pivot.add(upper);
      const lower=new THREE.Mesh(new THREE.CylinderGeometry(.055,.04,.4,5),shell);
      lower.position.set(s*.42,-.38,0); lower.rotation.z=s*.35; pivot.add(lower);
      g.add(pivot); legs.push(pivot);
    });
  }
  const tailRoot=new THREE.Group();
  tailRoot.position.set(0,1.0,-1.9);
  [[.22,.35,0],[.18,.4,.25],[.15,.38,.55],[.12,.32,.8]].forEach((arr,i)=>{
    const [r,h,y]=arr;
    const sg=new THREE.Mesh(new THREE.SphereGeometry(r,7,5),i%2?dark:shell);
    sg.position.set(0,y,-i*.05); tailRoot.add(sg);
  });
  const stinger=new THREE.Mesh(new THREE.ConeGeometry(.1,.45,6),tip);
  stinger.position.set(0,1.15,.15); stinger.rotation.x=-2.4; tailRoot.add(stinger);
  tailRoot.rotation.x=-.85; g.add(tailRoot);
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  g.userData={legs, kind:"quad", gait:c.gait||{freq:2.0,lift:.12}, anim:_creatureAnim()};
  return g;
}

/* ============================================================
   GLB 生物工厂（plan-beautify B5）
   从 ASSETS.cloneCreature 取骨骼模型，设置缩放/阴影，
   附加 gait 数据给 anim.js
   ============================================================ */
function buildCreatureGLB(kind,cfg){
  const c=cfg||{};
  if(typeof ASSETS==="undefined"||!ASSETS.cloneCreature){
    console.warn("[creatures] ASSETS.cloneCreature 不可用，回退程序化");
    return null;
  }
  const group=ASSETS.cloneCreature(kind,{scale:c.size||1,seed:c.seed||0});
  if(!group)return null;
  /* 四足动画数据（后续接入 AnimationMixer） */
  group.userData.legs=c.legs!=null?c.legs:4;
  group.userData.kind="quad_glb";
  group.userData.gait=c.gait||{freq:2.0,lift:.12};
  group.userData.anim=_creatureAnim();
  group.userData.creatureKind=kind;
  return group;
}

/* ============================================================
   热替换：ASSETS 就绪后把已有程序化怪换成 GLB
   ============================================================ */
function tryUpgradeMobMesh(mob){
  if(!mob||!mob.mesh||!mob.type)return false;
  /* 四足：通过 MOB_TYPES 找到 QUADS style → creature */
  const T=MOB_TYPES[mob.type];
  if(!T)return false;
  /* 优先用 build 重做（此时 ASSETS 已就绪，GLB 路径会命中） */
  const newMesh=T.build();
  if(!newMesh||newMesh===mob.mesh)return false;
  /* 检查是否拿到了 GLB（quad_glb / humanoid_glb / meleeHumanoid_glb） */
  const isGLB=newMesh.userData&&(
    newMesh.userData.kind==="quad_glb"||
    newMesh.userData.kind==="humanoid_glb"||
    newMesh.userData.kind==="meleeHumanoid_glb"||
    newMesh.userData.creatureKind
  );
  if(!isGLB){newMesh.traverse?.(o=>{if(o.geometry)o.geometry.dispose?.();if(o.material)o.material.dispose?.();});return false;}
  /* 替换：保持位置/朝向，移除旧 mesh，加入新 mesh */
  newMesh.position.copy(mob.mesh.position);
  newMesh.rotation.copy(mob.mesh.rotation);
  if(mob.mesh.scale)newMesh.scale.copy(mob.mesh.scale);
  /* 精英缩放 */
  if(mob.elite&&mob.mesh.scale){
    const mul=mob.worldBoss
      ?(BAL.elite.worldBossScaleMul||BAL.elite.scaleMul||1)
      :(BAL.elite.scaleMul||1);
    newMesh.scale.multiplyScalar(mul);
  }
  const parent=mob.mesh.parent;
  if(parent){
    parent.add(newMesh);
    parent.remove(mob.mesh);
  }
  /* 更新 mob 引用 */
  mob.mesh=newMesh;
  mob.userData=newMesh.userData;
  return true;
}

function upgradeAllMobMeshes(){
  if(typeof MOBS==="undefined"||!MOBS)return;
  let upgraded=0;
  for(let i=0;i<MOBS.length;i++){
    if(tryUpgradeMobMesh(MOBS[i]))upgraded++;
  }
  if(upgraded>0)console.info("[creatures] GLB 热替换完成：",upgraded,"只怪已升级");
}

/* 注册到 ASSETS 就绪回调 */
if(typeof ASSETS!=="undefined"&&ASSETS.whenReady){
  ASSETS.whenReady(()=>{
    /* 等一帧让 GLB clone 缓存就绪 */
    setTimeout(()=>upgradeAllMobMeshes(),100);
  });
}

/* ============================================================
   四足族群：脊柱 2 节 + 颈 + 头 + 四腿（大腿/小腿/蹄）+ 尾
   GLB 优先，无 GLB 回退程序化
   ============================================================ */
function buildQuadruped(cfg){
  const c=Object.assign({size:1,legs:4,tusks:false,tuskBig:false,ears:true,mane:false,
    neck:0,beak:false,crest:false,tail:'short',snoutLong:false,quills:false,
    accent:null,stripes:false,glow:null,scorpion:false,style:"boar",bulk:1,
    head:"boar",gait:{freq:2.2,lift:.18}},cfg);
  if(c.scorpion)return buildScorpion(c);
  /* -- GLB 优先：有对应模型的 style 走骨骼模型 -- */
  const creatureKind=QUAD_TO_CREATURE[c.style];
  if(creatureKind){
    const glb=buildCreatureGLB(creatureKind,c);
    if(glb)return glb;
  }
  /* -- 程序化回退 -- */
  /* 兼容旧 tail:'up' */
  if(c.tail==='up')c.tail='short';

  const g=new THREE.Group();
  const bulk=c.bulk||1;
  const fur=_quadMat(c.fur);
  const furD=_quadMat(c.furD);
  const accent=_quadMat(c.accent!=null?c.accent:c.fur,{r:.85});
  const ivory=_quadMat(0xe8e0c8,{r:.45,mt:.08});
  const dark=_quadMat(0x1a120c,{r:.9});
  const eyeWhite=_quadMat(0xf0ead8,{r:.55});
  const eyeIris=_quadMat(c.glow!=null?c.glow:0x2a1810,{
    r:.4,e:c.glow!=null?c.glow:0x000000,ei:c.glow!=null?.45:0});

  /* 脊柱：胸节 + 腹节（动画可微摆） */
  const spine1=new THREE.Group(); spine1.position.set(0,1.05,.2); g.add(spine1);
  const spine2=new THREE.Group(); spine2.position.set(0,0,-.7); spine1.add(spine2);

  const chest=new THREE.Mesh(new THREE.BoxGeometry(1.15*bulk,1.05,1.0),fur);
  chest.position.set(0,0,.15); spine1.add(chest);
  const belly=new THREE.Mesh(new THREE.BoxGeometry(1.0*bulk,.85,1.0),furD);
  belly.position.set(0,-.08,-.05); spine2.add(belly);
  const haunch=new THREE.Mesh(new THREE.BoxGeometry(1.2*bulk,1.1,.7),fur);
  haunch.position.set(0,0,-.45); spine2.add(haunch);
  const under=new THREE.Mesh(new THREE.BoxGeometry(.7*bulk,.2,1.4),accent);
  under.position.set(0,-.53,.05); spine1.add(under);
  [-1,1].forEach(s=>{
    const sh=new THREE.Mesh(new THREE.BoxGeometry(.28,.55,.55),furD);
    sh.position.set(s*.62*bulk,.2,.2); spine1.add(sh);
    const hp=new THREE.Mesh(new THREE.BoxGeometry(.3,.5,.45),furD);
    hp.position.set(s*.64*bulk,.1,-.4); spine2.add(hp);
  });
  if(c.stripes){
    for(let i=0;i<5;i++){
      const stripe=new THREE.Mesh(new THREE.BoxGeometry(1.22*bulk,.08,.12),furD);
      stripe.position.set(0,.1+((i%2)*.15),.3-i*.35); spine1.add(stripe);
    }
  }
  if(c.mane){
    for(let i=0;i<6;i++){
      const h=.28+((i%3)*.08);
      const tuft=new THREE.Mesh(new THREE.ConeGeometry(.1,h,5),furD);
      tuft.position.set(((i%2)*.08-.04),.5+h*.35,.35-i*.28);
      tuft.rotation.x=-.25-(i*.04); spine1.add(tuft);
    }
    if(c.style==="wolf"||c.head==="wolf"){
      const ruff=new THREE.Mesh(new THREE.SphereGeometry(.42,7,5),furD);
      ruff.position.set(0,.2,.75); ruff.scale.set(1.1,.7,1); spine1.add(ruff);
    }
  }

  /* 颈 + 头（分组，供死亡/攻击微动） */
  const neckLen=typeof c.neck==="number"?c.neck:(c.neck==="long"?1.15:0);
  const neckG=new THREE.Group();
  neckG.position.set(0,.15,.75); spine1.add(neckG);
  let headLocalY=.1, headLocalZ=.45;
  if(neckLen){
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.18,.26,neckLen,7),fur);
    neck.position.set(0,neckLen/2,.2); neck.rotation.x=.22; neckG.add(neck);
    const nRing=new THREE.Mesh(new THREE.TorusGeometry(.22,.04,5,10),furD);
    nRing.position.set(0,neckLen*.4,.3); nRing.rotation.x=Math.PI/2; neckG.add(nRing);
    headLocalY=neckLen*.85; headLocalZ=.5;
  }
  const headG=new THREE.Group();
  headG.position.set(0,headLocalY,headLocalZ); neckG.add(headG);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.78,.72,.72),fur);
  headG.add(head);
  const brow=new THREE.Mesh(new THREE.BoxGeometry(.82,.16,.28),furD);
  brow.position.set(0,.28,.2); headG.add(brow);
  [-1,1].forEach(s=>{
    const socket=new THREE.Mesh(new THREE.SphereGeometry(.11,6,5),dark);
    socket.position.set(s*.22,.08,.38); headG.add(socket);
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.08,6,5),eyeWhite);
    ball.position.set(s*.22,.08,.42); headG.add(ball);
    const iris=new THREE.Mesh(new THREE.SphereGeometry(.045,5,4),eyeIris);
    iris.position.set(s*.22,.08,.48); headG.add(iris);
  });
  const useBeak=c.beak||c.head==="beak";
  if(useBeak){
    const beak=new THREE.Mesh(new THREE.ConeGeometry(.16,.62,6),ivory);
    beak.position.set(0,-.08,.72); beak.rotation.x=Math.PI/2; headG.add(beak);
    const beakTip=new THREE.Mesh(new THREE.ConeGeometry(.07,.22,5),furD);
    beakTip.position.set(0,-.1,1.05); beakTip.rotation.x=Math.PI/2; headG.add(beakTip);
  }else{
    const snZ=(c.snoutLong||c.head==="wolf")?0.72:0.48;
    const snout=new THREE.Mesh(new THREE.BoxGeometry(.42,.36,snZ),furD);
    snout.position.set(0,-.18,.42+snZ*.35); headG.add(snout);
    [-1,1].forEach(s=>{
      const nostril=new THREE.Mesh(new THREE.SphereGeometry(.045,5,4),dark);
      nostril.position.set(s*.1,-.22,.42+snZ*.7); headG.add(nostril);
    });
    if(c.style==="boar"||c.head==="boar"){
      const plate=new THREE.Mesh(new THREE.BoxGeometry(.5,.22,.2),accent);
      plate.position.set(0,-.05,.55); headG.add(plate);
    }
  }
  if(c.crest){
    for(let i=0;i<5;i++){
      const fe=new THREE.Mesh(new THREE.ConeGeometry(.07,.55+i*.04,5),i%2?accent:furD);
      fe.position.set((i-2)*.11,.55,-.1); fe.rotation.x=-.55; headG.add(fe);
    }
  }
  [-1,1].forEach(s=>{
    if(c.tusks){
      const big=!!c.tuskBig;
      const base=new THREE.Mesh(new THREE.ConeGeometry(big?0.13:0.09,big?0.4:0.28,6),ivory);
      base.position.set(s*.3,-.15,.5); base.rotation.x=-.85; base.rotation.z=s*.25; headG.add(base);
      const tip=new THREE.Mesh(new THREE.ConeGeometry(big?0.08:0.05,big?0.38:0.22,5),ivory);
      tip.position.set(s*.38,-.35,.72); tip.rotation.x=-1.15; tip.rotation.z=s*.15; headG.add(tip);
    }
    if(c.ears&&!useBeak){
      const ear=new THREE.Mesh(new THREE.ConeGeometry(.14,.4,5),furD);
      ear.position.set(s*.36,.52,-.08); ear.rotation.z=s*-.35; ear.rotation.x=-.2; headG.add(ear);
      const inner=new THREE.Mesh(new THREE.ConeGeometry(.07,.22,4),accent);
      inner.position.set(s*.36,.48,-.02); inner.rotation.z=s*-.35; headG.add(inner);
    }
  });

  /* 四腿：髋枢轴 → 大腿 → 小腿枢轴 → 蹄 */
  const legs=[];
  const shins=[];
  [-1,1].forEach(s=>{
    (c.legs===4?[[.48],[-.55]]:[[-.25]]).forEach(([dz])=>{
      const legH=c.legs===2?1.05:.78;
      const hip=new THREE.Group();
      hip.position.set(s*(c.legs===2?.22:.42*bulk),legH,dz);
      const thighLen=legH*.55;
      const thigh=new THREE.Mesh(new THREE.CylinderGeometry(.16,.14,thighLen,6),furD);
      thigh.position.y=-thighLen*.45; hip.add(thigh);
      const shinG=new THREE.Group();
      shinG.position.y=-thighLen*.85; hip.add(shinG);
      const shinLen=legH*.42;
      const shin=new THREE.Mesh(new THREE.CylinderGeometry(.12,.1,shinLen,6),fur);
      shin.position.y=-shinLen*.45; shinG.add(shin);
      const hoof=new THREE.Mesh(new THREE.BoxGeometry(.18,.12,.22),useBeak?furD:dark);
      hoof.position.set(0,-shinLen*.95,.04); shinG.add(hoof);
      if(c.legs===2){
        for(let t=0;t<3;t++){
          const claw=new THREE.Mesh(new THREE.ConeGeometry(.035,.16,4),ivory);
          claw.position.set((t-1)*.07,-shinLen*1.05,.14); claw.rotation.x=1.1; shinG.add(claw);
        }
      }
      g.add(hip);
      legs.push(hip);
      shins.push(shinG);
    });
  });

  /* 尾 */
  const tailG=new THREE.Group();
  tailG.position.set(0,.35,-1.05); spine2.add(tailG);
  if(c.tail==='short'){
    const t1=new THREE.Mesh(new THREE.CylinderGeometry(.07,.05,.35,5),furD);
    t1.position.set(0,.2,-.2); t1.rotation.x=.55; tailG.add(t1);
    const t2=new THREE.Mesh(new THREE.CylinderGeometry(.05,.03,.32,5),fur);
    t2.position.set(0,.45,-.4); t2.rotation.x=.9; tailG.add(t2);
  }else if(c.tail==='bushy'){
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,.35,6),furD);
    base.position.set(0,.05,-.2); base.rotation.x=.6; tailG.add(base);
    const bush=new THREE.Mesh(new THREE.SphereGeometry(.28,7,5),furD);
    bush.position.set(0,.25,-.55); bush.scale.set(1,1,1.35); tailG.add(bush);
    for(let i=0;i<4;i++){
      const tip=new THREE.Mesh(new THREE.ConeGeometry(.06,.3,4),accent);
      tip.position.set((i-1.5)*.08,.35,-.8); tip.rotation.x=1.1; tailG.add(tip);
    }
  }else if(c.tail==='plume'){
    for(let i=0;i<5;i++){
      const fe=new THREE.Mesh(new THREE.ConeGeometry(.09,.7,5),i%2?accent:furD);
      fe.position.set((i-2)*.14,.35,.1); fe.rotation.x=-2.35; fe.rotation.z=(i-2)*.08; tailG.add(fe);
    }
  }else if(c.tail==='whip'){
    const w1=new THREE.Mesh(new THREE.CylinderGeometry(.06,.04,.55,5),furD);
    w1.position.set(0,.1,-.25); w1.rotation.x=1.1; tailG.add(w1);
    const w2=new THREE.Mesh(new THREE.CylinderGeometry(.04,.02,.5,5),fur);
    w2.position.set(0,.05,-.7); w2.rotation.x=1.35; tailG.add(w2);
  }

  if(c.quills){
    for(let i=0;i<8;i++){
      const q=new THREE.Mesh(new THREE.ConeGeometry(.05,.5+((i%3)*.12),5),i%2?furD:accent);
      q.position.set((i%2?1:-1)*(.08+(i%3)*.06),.65+((i%2)*.08),.2-i*.18);
      q.rotation.x=-.65-(i*.03); q.rotation.z=(i%2?.2:-.2); spine1.add(q);
    }
  }
  if(c.style==="bird"){
    [-1,1].forEach(s=>{
      const wing=new THREE.Mesh(new THREE.BoxGeometry(.15,.55,.9),furD);
      wing.position.set(s*.62,.15,-.1); wing.rotation.z=s*.4; wing.rotation.x=.2; spine1.add(wing);
      const fold=new THREE.Mesh(new THREE.BoxGeometry(.1,.35,.55),accent);
      fold.position.set(s*.72,0,-.35); fold.rotation.z=s*.5; spine1.add(fold);
    });
  }

  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  g.userData={
    legs, shins, spine1, spine2, neck:neckG, head:headG, tail:tailG,
    kind:c.legs===2?"biped":"quad",
    gait:c.gait||{freq:2.2,lift:.18},
    anim:_creatureAnim(),
  };
  return g;
}

function buildBoar(){return buildQuadruped(QUADS.boar);}

/* 半人马：四足马身 + 人形上半 */
function buildCentaur(cfg){
  const c=Object.assign({fur:0x8a6a40,furD:0x5a4028,skin:0xc9a080,cloth:0x6a4030,size:1.2},cfg||{});
  const g=new THREE.Group();
  const horse=buildQuadruped({fur:c.fur,furD:c.furD,ears:true,mane:true,tail:'bushy',size:1,head:"wolf"});
  g.add(horse);
  const skin=MAT.get("_",{color:c.skin,roughness:.85});
  const cloth=MAT.get("_",{color:c.cloth,roughness:.9});
  const torso=new THREE.Mesh(new THREE.BoxGeometry(.55,.9,.4),cloth);
  torso.position.set(0,2.55,.3); g.add(torso);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.38,.38,.36),skin);
  head.position.set(0,3.3,.35); g.add(head);
  const hair=new THREE.Mesh(new THREE.ConeGeometry(.28,.5,6),
    MAT.get("_",{color:c.furD,roughness:1}));
  hair.position.set(0,3.65,.28); g.add(hair);
  [-1,1].forEach(s=>{
    const arm=new THREE.Mesh(new THREE.BoxGeometry(.16,.7,.16),skin);
    arm.position.set(s*.42,2.7,.35); arm.rotation.z=s*.35; g.add(arm);
  });
  const spear=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,2.2,5),
    MAT.get("_",{color:0x6a5030,roughness:.8}));
  spear.position.set(.55,3.1,.6); spear.rotation.z=-.4; g.add(spear);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.08,.28,5),
    MAT.get("_",{color:0xc0c0c0,roughness:.4,metalness:.6}));
  tip.position.set(.85,3.85,.85); tip.rotation.z=-.4; g.add(tip);
  if(c.banner){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,2.6,5),
      MAT.get("_",{color:0x4a4030,roughness:.8}));
    pole.position.set(-.55,3.4,.2); g.add(pole);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.7),
      MAT.get("_",{color:0xc04020,roughness:.9,side:THREE.DoubleSide}));
    flag.position.set(-1.05,4.3,.2); g.add(flag);
  }
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData={legs:horse.userData.legs, shins:horse.userData.shins, kind:"centaur", horse,
    gait:horse.userData.gait, anim:horse.userData.anim||_creatureAnim()};
  return g;
}

/* ============================================================
   人形怪：复用 R5 buildHumanoid + wings / claws / tail
   ============================================================ */
function _harpyHumanoidCfg(c){
  return {
    mats:{
      skin:{c:c.skin,r:.85}, feather:{c:c.feather,r:.9}, featherD:{c:c.featherD,r:.9},
      hair:{c:c.hair,r:.9}, claw:{c:c.claw||0xe8e0c8,r:.55},
      capeM:{c:c.featherD,r:.9,ds:true},
    },
    parts:[
      {g:'cone',a:[.55,1,7],p:[0,1,0],m:'feather'},
      {g:'box',a:[.62,.9,.4],p:[0,1.85,0],m:'featherD'},
      {g:'box',a:[.42,.42,.4],p:[0,2.6,0],m:'skin'},
      {g:'cone',a:[.38,.75,7],p:[0,2.95,0],r:[0,0,.15],m:'hair'},
    ],
    arm:{x:.55,y:2.15,mesh:{g:'box',a:[.2,.8,.2],p:[0,-.4,0],m:'feather'}},
    armExtraR:c.claws!==false?[{g:'cone',a:[.07,.28,4],p:[0,-.55,.05],r:[1.2,0,0],m:'claw'}]:null,
    armExtraL:c.claws!==false?[{g:'cone',a:[.07,.28,4],p:[0,-.55,.05],r:[1.2,0,0],m:'claw'}]:null,
    leg:{x:.22,y:.9,mesh:{g:'cyl',a:[.09,.07,.9,5],p:[0,-.45,0],m:'featherD'}},
    cape:{a:[.7,1.1],p:[0,1.7,-.28],rx:.15,m:'capeM'},
    weapon:'dagger', weaponMount:'armR', weaponPos:[0,-.5,.08],
    meta:{animStyle:"melee1h"},
  };
}

function buildHumanoidMob(cfg){
  const c=Object.assign({size:1,wings:true,claws:true,tail:false,horns:false},cfg);
  /* -- GLB 优先 -- */
  if(c.glb){
    const glb=buildCreatureGLB(c.glb,c);
    if(glb){glb.userData.kind="humanoid_glb"; return glb;}
  }
  if(typeof buildHumanoid!=="function"){
    /* 无 models 时的极简回退 */
    const g=new THREE.Group();
    g.userData={kind:"humanoidMob", anim:_creatureAnim()};
    return g;
  }
  const root=buildHumanoid(_harpyHumanoidCfg(c));
  const U=root.userData||{};
  const rig=U.rig;

  /* 卸下默认匕首（鹰身用爪） */
  if(U.weaponMount){
    for(let i=U.weaponMount.children.length-1;i>=0;i--){
      const ch=U.weaponMount.children[i];
      if(ch.userData&&ch.userData.weapon)U.weaponMount.remove(ch);
    }
  }

  const feather=MAT.get("_",{color:c.feather,roughness:.9,side:THREE.DoubleSide});
  const clawM=MAT.get("_",{color:c.claw||0xe8e0c8,roughness:.55});
  const attach=rig&&rig.chest?rig.chest:root;

  if(c.wings){
    [-1,1].forEach(s=>{
      const wing=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.9),feather);
      wing.position.set(s*.95,.35,-.25); wing.rotation.set(.15,s*-.6,s*.3);
      attach.add(wing);
      if(s<0)U.wingL=wing; else U.wingR=wing;
    });
  }
  if(c.tail){
    const tail=new THREE.Mesh(new THREE.CylinderGeometry(.06,.02,.7,5),
      MAT.get("_",{color:c.featherD,roughness:.9}));
    tail.position.set(0,-.1,-.45); tail.rotation.x=1.2; attach.add(tail);
    U.tail=tail;
  }
  if(c.horns&&rig&&rig.head){
    [-1,1].forEach(s=>{
      const horn=new THREE.Mesh(new THREE.ConeGeometry(.06,.35,5),clawM);
      horn.position.set(s*.15,.25,.05); horn.rotation.x=-.4; horn.rotation.z=s*-.25;
      rig.head.add(horn);
    });
  }
  /* 鸟爪脚尖 */
  if(rig&&(rig.footR||rig.footL)){
    [rig.footR,rig.footL].forEach((ft,i)=>{
      if(!ft)return;
      const claw=new THREE.Mesh(new THREE.ConeGeometry(.08,.2,4),clawM);
      claw.position.set(0,-.05,.14); claw.rotation.x=1.15; ft.add(claw);
    });
  }

  root.scale.setScalar(c.size);
  U.kind="humanoidMob";
  if(!U.anim)U.anim=_creatureAnim();
  return root;
}

/** 地面人形敌对：走 buildHumanoid 以获得腿/臂动画挂点 */
function buildMeleeHumanoid(cfg){
  const c=Object.assign({size:1,skin:0xc9a080,cloth:0x4a5a6a,clothD:0x2a3038,helm:0x6a7078,weapon:0xb0b0b8},cfg);
  /* -- GLB 优先 -- */
  if(c.glb){
    const glb=buildCreatureGLB(c.glb,c);
    if(glb){glb.userData.kind="meleeHumanoid_glb"; return glb;}
  }
  if(typeof buildHumanoid!=="function"){
    const g=new THREE.Group();
    g.userData={kind:"meleeHumanoid", anim:_creatureAnim()};
    return g;
  }
  const humCfg={
    mats:{
      skin:{c:c.skin,r:.85}, cloth:{c:c.cloth,r:.9}, clothD:{c:c.clothD,r:.9},
      helm:{c:c.helm,r:.55,mt:.35}, weap:{c:c.weapon,r:.45,mt:.5},
      capeM:{c:c.clothD,r:.9,ds:true},
    },
    parts:[
      {g:'box',a:[.7,.85,.45],p:[0,1.55,0],m:'cloth'},
      {g:'box',a:[.42,.42,.4],p:[0,2.25,0],m:'skin'},
      {g:'cyl',a:[.28,.32,.22,7],p:[0,2.52,0],m:'helm'},
    ],
    arm:{x:.5,y:1.55,mesh:{g:'box',a:[.2,.7,.2],p:[0,-.35,0],m:'cloth'}},
    leg:{x:.18,y:.9,mesh:{g:'box',a:[.22,.7,.25],p:[0,-.35,0],m:'clothD'}},
    cape:{a:[.6,.9],p:[0,1.5,-.28],rx:.12,m:'capeM'},
    weapon:'sword', weaponMount:'armR', weaponPos:[0,-.7,.1],
    meta:{animStyle:"melee1h"},
  };
  const root=buildHumanoid(humCfg);
  root.scale.setScalar(c.size);
  root.userData.kind="meleeHumanoid";
  return root;
}

console.info("[creatures] R6 就绪：四足 / 人形怪 / 元素 · MOB_LOOK");
