/* ============================================================
   熔火之心 · world.js
   莫高雷世界：实体放置 / 草原与营地 / 传送门与进本 / 野怪与 NPC 任务系统
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ rand srand worldRng BAL makeLabel scene camera setZoneSeed）
          zones.js（registerZone enterZone）
          models.js（buildPlayer buildBoss buildElder buildVendor buildSpiritHealer
            tintNpcCloth buildHut buildTent buildFence buildWatchtower buildCampfire
            buildTotem buildMarketStall buildCratePile BUILD_PAL placeProp）
          anim.js 运行时（beginDeathRoll resetDeathRoll）
          items.js（dropLoot rollLoot LOOT tryLoot buyVendorItem）
          combat.js 运行时（S log announce fct spawnBurst hitEntity closeDialogue
            gainCopper rollCopperRange …）
          companions.js 运行时（openRecruitDialogue companionAlive）
          quests.js 运行时（acceptQuest turnInQuest onQuestMobKill questsForNpc）
          professions.js 运行时（buildWorkbench spawnGatherNodesForZone tryProfessionInteract）
          rares.js 运行时（spawnRaresForZone onRareKill）
          vfx.js 运行时（VFX spawnBurst）
          save.js 运行时（saveGame；接任务/交任务/离本）
   [导出] player boss BOSS_MESHES WORLD_R sceneWorld heli sun worldFlames PORTAL_POS portalUni
          portalLabel enterRaid fadeTo MOBS QUEST moveToward mobDamage mobDie
          mobTargetable addTargetable setCorpse updateQuest setMarker tryInteract openDialogue closeDialogue
          openVendor refreshVendorPanel closeVendorPanel openSpiritDialogue
          leaveRaid resetBoss spawnExitPortal removeExitPortal exitPortal
          fireflies FIREFLIES ffPhases elder elderDist vendor vendorDist hunter hunterDist
          spiritHealer spiritDist spawnMob MOBS MOB_TYPES PORTAL_BARRENS
          appendNpcQuestButtons pickNearestNpc updateNpcQuestMarkers setMarker
   ============================================================ */
"use strict";
/* 莫高雷分区种子：地形 / 野怪摆放全部走此流（STEP 17） */
setZoneSeed("mulgore");

/* ---------------- 实体放置 ---------------- */
let player=buildPlayer(); player.position.set(0,0,14); scene.add(player);
let boss=buildBoss(); boss.position.set(0,-16,-14); sceneRaid.add(boss);
const BOSS_MESHES={ragnaros:boss};

/* ============================================================
   莫高雷 · 外部世界（草原 / 红岩台地 / 牛头人营地 / 副本传送门）
   ============================================================ */
const WORLD_R=176; /* V1-B2：开放区半径×2 */
const sceneWorld=new THREE.Scene();
sceneWorld.background=new THREE.Color(0x8fc0e8);
sceneWorld.fog=new THREE.FogExp2(0xa8c8e0,0.0062);
sceneWorld.add(new THREE.HemisphereLight(0xcfe8ff,0x5a7a3a,0.95));
const heli=sceneWorld.children.find(c=>c.isHemisphereLight);  /* 昼夜循环需要调节 */
const sun=new THREE.DirectionalLight(0xfff2d8,1.05);
sun.position.set(40,70,30); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-110;sun.shadow.camera.right=110;
sun.shadow.camera.top=110;sun.shadow.camera.bottom=-110;
sceneWorld.add(sun);

/* 草原地面 + 通往传送门的土路 */
const grass=new THREE.Mesh(new THREE.CircleGeometry(WORLD_R+50,64),
  new THREE.MeshStandardMaterial({color:0x6f9e46,roughness:1}));
grass.rotation.x=-Math.PI/2; grass.receiveShadow=true; sceneWorld.add(grass);
const dirtMat=new THREE.MeshStandardMaterial({color:0x9a7a4a,roughness:1});
for(let i=0;i<15;i++){
  const seg=new THREE.Mesh(new THREE.CircleGeometry(srand(2.6,3.4),10),dirtMat);
  seg.rotation.x=-Math.PI/2;
  seg.position.set(Math.sin(i*.7)*3,.03,48-i*7.6);
  seg.receiveShadow=true; sceneWorld.add(seg);
}
/* 湖泊 */
const pond=new THREE.Mesh(new THREE.CircleGeometry(13,32),
  new THREE.MeshStandardMaterial({color:0x4a90c8,roughness:.25,metalness:.3}));
pond.rotation.x=-Math.PI/2; pond.position.set(-38,.05,14); sceneWorld.add(pond);

/* 环绕的红岩台地（莫高雷标志性平顶山） */
const mesaMat=new THREE.MeshStandardMaterial({color:0xa8613a,roughness:1,flatShading:true});
const mesaTop=new THREE.MeshStandardMaterial({color:0x7a9e46,roughness:1});
for(let i=0;i<9;i++){
  const a=i/9*Math.PI*2+srand(-.2,.2), r=WORLD_R+srand(4,22);
  const h=srand(22,42), rad=srand(9,16);
  const mesa=new THREE.Mesh(new THREE.CylinderGeometry(rad*.85,rad,h,9),mesaMat);
  mesa.position.set(Math.cos(a)*r,h/2-1,Math.sin(a)*r);
  mesa.castShadow=true; sceneWorld.add(mesa);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(rad*.86,rad*.86,1.2,9),mesaTop);
  cap.position.set(mesa.position.x,h-.4,mesa.position.z); sceneWorld.add(cap);
}
/* 散布的树木与巨石 */
const trunkMat=new THREE.MeshStandardMaterial({color:0x6a4520,roughness:.9});
const leafMat=new THREE.MeshStandardMaterial({color:0x4a7a2e,roughness:.95});
const boulderMat=new THREE.MeshStandardMaterial({color:0x8a6a4a,roughness:1,flatShading:true});
for(let i=0;i<14;i++){
  const a=srand(0,6.28),r=srand(20,WORLD_R-10);
  const x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(Math.abs(x)<8&&z<50&&z>-70)continue; /* 避开土路 */
  if(worldRng()<.65){
    const th=srand(3,5);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.35,.5,th,6),trunkMat);
    trunk.position.set(x,th/2,z); trunk.castShadow=true; sceneWorld.add(trunk);
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(srand(1.8,2.8),7,6),leafMat);
    leaf.position.set(x,th+1.4,z); leaf.scale.y=.8; leaf.castShadow=true; sceneWorld.add(leaf);
  }else{
    const b=new THREE.Mesh(new THREE.DodecahedronGeometry(srand(1,2.4),0),boulderMat);
    b.position.set(x,.6,z); b.castShadow=true; b.receiveShadow=true; sceneWorld.add(b);
  }
}

/* 牛头人风格营地：兽皮帐篷 + 图腾柱 + 篝火 */
const hideMat=new THREE.MeshStandardMaterial({color:0xc9a06a,roughness:.95});
const hideMat2=new THREE.MeshStandardMaterial({color:0xb5854e,roughness:.95});
[[16,50],[-18,46],[10,66]].forEach(([x,z],i)=>{
  const tent=new THREE.Mesh(new THREE.ConeGeometry(4.2,6.8,8),i%2?hideMat:hideMat2);
  tent.position.set(x,3.4,z); tent.castShadow=true; sceneWorld.add(tent);
  for(let k=0;k<3;k++){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,2.4,5),trunkMat);
    pole.position.set(x+srand(-.5,.5),7.4,z+srand(-.5,.5));
    pole.rotation.set(srand(-.3,.3),0,srand(-.3,.3)); sceneWorld.add(pole);
  }
});
/* 图腾柱 */
const paintA=new THREE.MeshStandardMaterial({color:0xd94f2a,roughness:.8});
const paintB=new THREE.MeshStandardMaterial({color:0x3a7ac9,roughness:.8});
[[-6,58],[22,60]].forEach(([x,z])=>{
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.55,.7,7.5,7),trunkMat);
  pole.position.set(x,3.75,z); pole.castShadow=true; sceneWorld.add(pole);
  [[1.8,paintA],[3.6,paintB],[5.4,paintA]].forEach(([y,m])=>{
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.55,7),m);
    ring.position.set(x,y,z); sceneWorld.add(ring);
  });
  const wing=new THREE.Mesh(new THREE.BoxGeometry(3.4,.55,.25),paintB);
  wing.position.set(x,7,z); sceneWorld.add(wing);
});
/* 篝火（存引用做火光闪烁） */
const worldFlames=[];
[[0,55]].forEach(([x,z])=>{
  for(let k=0;k<6;k++){
    const a=k/6*Math.PI*2;
    const st=new THREE.Mesh(new THREE.DodecahedronGeometry(.4,0),boulderMat);
    st.position.set(x+Math.cos(a)*1.1,.3,z+Math.sin(a)*1.1); sceneWorld.add(st);
  }
  const fl=new THREE.Mesh(new THREE.ConeGeometry(.7,1.8,7),
    new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.92}));
  fl.position.set(x,1.1,z); sceneWorld.add(fl);
  const li=new THREE.PointLight(0xff8a30,1.4,22,1.8); li.position.set(x,2.2,z); sceneWorld.add(li);
  worldFlames.push({fl,li});
});

/* ---------------- 副本传送门：熔火之心入口 ---------------- */
const PORTAL_POS=new THREE.Vector3(0,0,-(WORLD_R-8));
const obsidian=new THREE.MeshStandardMaterial({color:0x241812,roughness:.85,flatShading:true,
  emissive:0x661a00,emissiveIntensity:.2});
const pPlat=new THREE.Mesh(new THREE.CylinderGeometry(8,9.5,1,12),obsidian);
pPlat.position.set(PORTAL_POS.x,.5,PORTAL_POS.z); pPlat.receiveShadow=true; sceneWorld.add(pPlat);
[[-3.8],[3.8]].forEach(([sx])=>{
  const pil=new THREE.Mesh(new THREE.BoxGeometry(1.7,9.5,1.7),obsidian);
  pil.position.set(PORTAL_POS.x+sx,5.7,PORTAL_POS.z); pil.castShadow=true; sceneWorld.add(pil);
  const spike=new THREE.Mesh(new THREE.ConeGeometry(.8,2.2,5),obsidian);
  spike.position.set(PORTAL_POS.x+sx,11.5,PORTAL_POS.z); sceneWorld.add(spike);
});
const lintel=new THREE.Mesh(new THREE.BoxGeometry(10.4,1.7,1.9),obsidian);
lintel.position.set(PORTAL_POS.x,10.4,PORTAL_POS.z); lintel.castShadow=true; sceneWorld.add(lintel);
/* 旋涡传送门（Shader 动画） */
const portalUni={uTime:{value:0}};
const portalDisc=new THREE.Mesh(new THREE.CircleGeometry(3.1,40),new THREE.ShaderMaterial({
  uniforms:portalUni,transparent:true,side:THREE.DoubleSide,depthWrite:false,
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
    varying vec2 vUv;uniform float uTime;
    void main(){
      vec2 p=vUv-.5; float r=length(p)*2.; float ang=atan(p.y,p.x);
      float sw=sin(ang*3.-uTime*3.2+r*9.);
      vec3 c=mix(vec3(1.,.78,.32),vec3(.85,.2,.02),smoothstep(-.6,.8,sw));
      c=mix(c,vec3(.14,.02,0.),smoothstep(.7,1.,r));
      c+=vec3(1.,.6,.2)*smoothstep(.25,0.,r);
      gl_FragColor=vec4(c*1.25,smoothstep(1.,.9,r));
    }`}));
portalDisc.position.set(PORTAL_POS.x,5.2,PORTAL_POS.z); sceneWorld.add(portalDisc);
/* 门前火盆 */
[[-6.5],[6.5]].forEach(([sx])=>{
  const bz=new THREE.Mesh(new THREE.CylinderGeometry(.8,.5,1.4,7),obsidian);
  bz.position.set(PORTAL_POS.x+sx,.9,PORTAL_POS.z+4); sceneWorld.add(bz);
  const fl=new THREE.Mesh(new THREE.ConeGeometry(.55,1.5,7),
    new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.92}));
  fl.position.set(PORTAL_POS.x+sx,2.2,PORTAL_POS.z+4); sceneWorld.add(fl);
  const li=new THREE.PointLight(0xff6a20,1.2,18,1.8);
  li.position.set(PORTAL_POS.x+sx,2.6,PORTAL_POS.z+4); sceneWorld.add(li);
  worldFlames.push({fl,li});
});
/* 门楣悬浮文字（makeLabel 已迁入 core.js，供掉落系统等全局复用） */
const portalLabel=makeLabel("熔火之心",14);
portalLabel.position.set(PORTAL_POS.x,13.6,PORTAL_POS.z); sceneWorld.add(portalLabel);
const portalLabel2=makeLabel("· 副本入口 ·",8);
portalLabel2.position.set(PORTAL_POS.x,12,PORTAL_POS.z); sceneWorld.add(portalLabel2);

/* ---------------- 贫瘠之地传送门（营地南，STEP 18）：Lv10+ 可见可进 ---------------- */
const PORTAL_BARRENS=new THREE.Vector3(0,0,WORLD_R-8);
const barrensGateMat=new THREE.MeshStandardMaterial({color:0x5a4028,roughness:.9,flatShading:true,
  emissive:0x6a4a20,emissiveIntensity:.18});
const bPlat=new THREE.Mesh(new THREE.CylinderGeometry(7,8.5,1,12),barrensGateMat);
bPlat.position.set(PORTAL_BARRENS.x,.5,PORTAL_BARRENS.z); bPlat.receiveShadow=true; sceneWorld.add(bPlat);
[[-3.4],[3.4]].forEach(([sx])=>{
  const pil=new THREE.Mesh(new THREE.BoxGeometry(1.5,8.5,1.5),barrensGateMat);
  pil.position.set(PORTAL_BARRENS.x+sx,4.8,PORTAL_BARRENS.z); pil.castShadow=true; sceneWorld.add(pil);
});
const bLintel=new THREE.Mesh(new THREE.BoxGeometry(9.2,1.4,1.6),barrensGateMat);
bLintel.position.set(PORTAL_BARRENS.x,9.2,PORTAL_BARRENS.z); bLintel.castShadow=true; sceneWorld.add(bLintel);
const southPortalUni={uTime:{value:0}};
const barrensPortalDisc=new THREE.Mesh(new THREE.CircleGeometry(2.8,36),new THREE.ShaderMaterial({
  uniforms:southPortalUni,transparent:true,side:THREE.DoubleSide,depthWrite:false,
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
    varying vec2 vUv;uniform float uTime;
    void main(){
      vec2 p=vUv-.5; float r=length(p)*2.; float ang=atan(p.y,p.x);
      float sw=sin(ang*2.5-uTime*2.4+r*7.);
      vec3 c=mix(vec3(.95,.78,.4),vec3(.55,.35,.12),smoothstep(-.5,.7,sw));
      c=mix(c,vec3(.12,.06,0.),smoothstep(.7,1.,r));
      gl_FragColor=vec4(c*1.1,smoothstep(1.,.88,r));
    }`}));
barrensPortalDisc.position.set(PORTAL_BARRENS.x,4.6,PORTAL_BARRENS.z); sceneWorld.add(barrensPortalDisc);
const southPortalLabel=makeLabel("贫瘠之地",12,"#e8c898","rgba(160,100,40,.9)");
southPortalLabel.position.set(PORTAL_BARRENS.x,12.2,PORTAL_BARRENS.z); sceneWorld.add(southPortalLabel);
const southPortalLabel2=makeLabel(`十字路口 · 需要 Lv.${BAL.barrens.minLevel}+`,7,"#ffb060","rgba(160,80,20,.9)");
southPortalLabel2.position.set(PORTAL_BARRENS.x,10.8,PORTAL_BARRENS.z); sceneWorld.add(southPortalLabel2);

/* STEP 23：营地制作台 + 莫高雷采集点（在传送门坐标定义之后） */
if(typeof buildWorkbench==="function")buildWorkbench(sceneWorld);
if(typeof spawnGatherNodesForZone==="function"){
  spawnGatherNodesForZone("mulgore",sceneWorld,{
    radius:WORLD_R,
    camp:{x:0,z:55},
    portals:[{x:PORTAL_POS.x,z:PORTAL_POS.z},{x:PORTAL_BARRENS.x,z:PORTAL_BARRENS.z}],
  });
}

/* ---------------- 萤火虫粒子（STEP 7 昼夜）：夜晚浮现，白天透明 ---------------- */
const FIREFLIES=80;
const fireflyGeo=new THREE.BufferGeometry();
const ffPos=new Float32Array(FIREFLIES*3), ffPhases=new Float32Array(FIREFLIES);
for(let i=0;i<FIREFLIES;i++){
  const a=srand(0,6.28),r=srand(5,WORLD_R-8);
  ffPos[i*3]=Math.cos(a)*r; ffPos[i*3+1]=srand(1,4); ffPos[i*3+2]=Math.sin(a)*r;
  ffPhases[i]=srand(0,6.28);
}
fireflyGeo.setAttribute("position",new THREE.BufferAttribute(ffPos,3));
const fireflies=new THREE.Points(fireflyGeo,new THREE.PointsMaterial({
  color:0xd0ffa0,size:.35,transparent:true,opacity:0,
  blending:THREE.AdditiveBlending,depthWrite:false}));
sceneWorld.add(fireflies);

/* 玩家移入莫高雷出生点（营地旁），当前场景切换为外部世界 */
sceneRaid.remove(player); sceneWorld.add(player);
player.position.set(0,0,52);
scene=sceneWorld;
camera.position.set(0,14,72);

/* ---------------- 进入 / 离开副本（薄包装 → enterZone，STEP 17） ---------------- */
function fadeTo(op,cb){
  const f=$("#fade");
  f.style.opacity=op;
  if(cb)setTimeout(cb,BAL.zones&&BAL.zones.fadeMs!=null?BAL.zones.fadeMs:650);
}
function enterRaid(){
  if(S.mode!=="world"||!S.p.alive)return;
  announce("正在进入 · 熔火之心");
  enterZone("molten_core","entrance");
}
function leaveRaid(){
  if(S.mode!=="raid")return;
  S.difficulty="normal";
  const D=typeof getDungeon==="function"?getDungeon():null;
  const hub=(D&&D.exitZone)||"mulgore";
  const gate=(D&&D.exitGate)||"from_raid";
  enterZone(hub,gate);
}

/* 注册莫高雷（场景已在模块顶层 build-once） */
registerZone({
  id:"mulgore",
  name:"莫高雷",
  scene:sceneWorld,
  build:null,
  _built:true,
  music:"world",
  mode:"world",
  levelRange:[1,10],
  boundsR:()=>WORLD_R,
  dayNight:true,
  gates:{
    camp:{x:0,z:52},
    from_raid:{x:0,z:52},
    from_barrens:{x:0,z:WORLD_R-22},   /* 远离南口传送门，避免进出乒乓 */
    spirit:{x:0,z:58},
    default:{x:0,z:52},
  },
  portals:[{
    id:"to_molten_core",
    pos:()=>PORTAL_POS,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:"熔火之心 · 副本入口",
    logHint:"灼热的气息从旋涡中渗出……走进传送门即可进入副本。",
    requireAlive:true,
    autoEnter:true,
    targetZone:"molten_core",
    targetGate:"entrance",
  },{
    id:"to_barrens",
    pos:()=>PORTAL_BARRENS,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:"贫瘠之地 · 十字路口",
    logHint:"南行土路通往干燥荒原……靠近传送门即可前往贫瘠之地。",
    requireAlive:true,
    autoEnter:true,
    minLevel:()=>BAL.barrens.minLevel,
    lockedAnnounce:()=>`等级不足！需要 Lv.${BAL.barrens.minLevel}`,
    lockedLog:()=>`贫瘠之地 · 十字路口需要更强的勇士——当前 Lv.${S.p.level}，升到 Lv.${BAL.barrens.minLevel} 后再来。`,
    targetZone:"barrens",
    targetGate:"from_mulgore",
  }],
  lights:{heli,sun,flames:worldFlames,fireflies},
  onEnter(fromId,gateId,opts){
    if(opts&&opts.silent)return;
    if(fromId==="molten_core"){
      log("你回到莫高雷草原，炎魔的咆哮在远方回荡……","lg-sys");
    }else if(fromId==="barrens"){
      log("你回到圣山草原，牛头人营地的炊烟在远处升起。","lg-sys");
    }
    if(typeof updateQuest==="function")updateQuest();
  },
  onLeave(){},
});

/* ---------------- 出口传送门（击杀 Boss 后出现在副本入口） ---------------- */
let exitPortal=null;
const EXIT_PORTAL_POS=new THREE.Vector3(0,0,15);
function spawnExitPortal(){
  if(exitPortal)return;
  const grp=new THREE.Group();
  /* 底座 */
  const base=new THREE.Mesh(new THREE.CylinderGeometry(3.5,4.5,.8,12),
    new THREE.MeshStandardMaterial({color:0x241812,roughness:.85,flatShading:true,
      emissive:0x4a1a00,emissiveIntensity:.3}));
  base.position.y=.4; grp.add(base);
  /* 门柱 */
  const pillarMat=new THREE.MeshStandardMaterial({color:0x1a120e,roughness:.9,emissive:0x6a2200,emissiveIntensity:.15});
  [[-1.8],[1.8]].forEach(([sx])=>{
    const p=new THREE.Mesh(new THREE.BoxGeometry(.6,4.2,.6),pillarMat);
    p.position.set(sx,2.5,0); grp.add(p);
    const sp=new THREE.Mesh(new THREE.ConeGeometry(.35,1,5),pillarMat);
    sp.position.set(sx,5,0); grp.add(sp);
  });
  /* 门楣 */
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(4.6,.6,.5),pillarMat);
  lintel.position.set(0,5,0).y=5; grp.add(lintel);
  /* 旋涡盘（复用传送门 shader 风格） */
  const disc=new THREE.Mesh(new THREE.CircleGeometry(2.2,32),new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0}},transparent:true,side:THREE.DoubleSide,depthWrite:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;uniform float uTime;
      void main(){
        vec2 p=vUv-.5;float r=length(p)*2.;float ang=atan(p.y,p.x);
        float sw=sin(ang*4.+uTime*2.8+r*12.);
        vec3 c=mix(vec3(.6,1.,.8),vec3(.2,.8,.4),smoothstep(-.6,.8,sw));
        c=mix(c,vec3(0,.2,0.),smoothstep(.7,1.,r));
        c+=vec3(.4,1.,.4)*smoothstep(.25,0.,r);
        gl_FragColor=vec4(c*1.3,smoothstep(1.,.8,r));
      }`}));
  disc.position.y=2.2; disc.rotation.x=0; grp.add(disc);
  /* 发光粒子 */
  const glowPts=new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({color:0x66ffaa,size:.18,transparent:true,opacity:.7,
      blending:THREE.AdditiveBlending,depthWrite:false}));
  const gp=new Float32Array(60*3);
  for(let i=0;i<60;i++){const a=rand(0,6.28),r=rand(1,2.8);
    gp[i*3]=Math.cos(a)*r;gp[i*3+1]=rand(1.2,4.5);gp[i*3+2]=Math.sin(a)*r;}
  glowPts.geometry.setAttribute("position",new THREE.BufferAttribute(gp,3));
  grp.add(glowPts);
  grp.position.copy(EXIT_PORTAL_POS);
  sceneRaid.add(grp);
  exitPortal={grp,disc,discUni:disc.material.uniforms.uTime,glowPts};
}
function removeExitPortal(){
  if(!exitPortal)return;
  sceneRaid.remove(exitPortal.grp);
  exitPortal=null;
}

/* ============================================================
   野怪（草原野猪）与 NPC 任务系统
   ============================================================ */
const MOBS=[];
const QUEST={state:0,kills:0};   /* 0未接 1猎杀野猪 2讨伐拉戈斯 3完成 */

/* 长老 NPC + 头顶名字与任务标记 */
const _npcLy=(BAL.npc&&BAL.npc.labelY)||4.05, _npcMy=(BAL.npc&&BAL.npc.markerY)||5.15, _npcLw=(BAL.npc&&BAL.npc.labelW)||6.2;
const elder=buildElder();
elder.position.set(8,0,48); elder.rotation.y=Math.PI*.85; sceneWorld.add(elder);
const elderLabel=makeNameplate("长老 · 岩蹄",BAL.npcLevel.elder,{w:_npcLw,friendly:true});
elderLabel.position.set(8,_npcLy,48); sceneWorld.add(elderLabel);
const markerExcl=makeLabel("❗",2.6);
markerExcl.position.set(8,_npcMy,48); sceneWorld.add(markerExcl);
const markerQ=makeLabel("❓",2.6);
markerQ.position.copy(markerExcl.position); markerQ.visible=false; sceneWorld.add(markerQ);
function setMarker(){
  if(typeof npcHasQuestOffer==="function"){
    markerExcl.visible=npcHasQuestOffer("elder");
    markerQ.visible=npcHasQuestTurnIn("elder");
    return;
  }
  const none=typeof questStatus==="function"?questStatus("elder_boars")==="none":QUEST.state===0;
  const ready=typeof questStatus==="function"?questStatus("elder_boars")==="ready"
    :(QUEST.state===1&&QUEST.kills>=BAL.quest.boarKills);
  markerExcl.visible=none;
  markerQ.visible=ready;
}
function updateNpcQuestMarkers(){
  setMarker();
  if(typeof updateBarrensMarkers==="function")updateBarrensMarkers();
  if(typeof updateDurotarMarkers==="function")updateDurotarMarkers();
  /* 猎手 / 商人头顶感叹号：复用 nameplate 旁小标记或依赖对话列表 */
}
/* 营地商人（STEP 13） */
const vendor=buildVendor();
vendor.position.set(-16,0,48); vendor.rotation.y=Math.PI*1.15; sceneWorld.add(vendor);
const vendorLabel=makeNameplate("商人 · 火蹄",BAL.npcLevel.vendor,{w:_npcLw,friendly:true,color:"#a8e8c0"});
vendorLabel.position.set(-16,_npcLy,48); sceneWorld.add(vendorLabel);
updateNameplateHp(vendorLabel,1,1);
/* 猎手：狩猎类支线 */
const hunter=tintNpcCloth(buildElder(),0x5a6a38);
hunter.position.set(18,0,54); hunter.rotation.y=Math.PI*1.05; sceneWorld.add(hunter);
const hunterLabel=makeNameplate("猎手 · 迅羽",BAL.npcLevel.hunter,{w:_npcLw,friendly:true,color:"#d0e8a0"});
hunterLabel.position.set(18,_npcLy,54); sceneWorld.add(hunterLabel);
updateNameplateHp(hunterLabel,1,1);
/* 灵魂医者（STEP 15） */
const spiritHealer=buildSpiritHealer();
spiritHealer.position.set(0,0,64); spiritHealer.rotation.y=Math.PI; sceneWorld.add(spiritHealer);
const spiritLabel=makeNameplate("灵魂医者 · 风语",BAL.npcLevel.spirit,{w:_npcLw+.2,friendly:true,color:"#c8e8ff",glow:"rgba(80,160,255,.95)"});
spiritLabel.position.set(0,_npcLy,64); sceneWorld.add(spiritLabel);
updateNameplateHp(spiritLabel,1,1);
updateNameplateHp(elderLabel,1,1);
function spiritDist(){return Math.hypot(player.position.x-spiritHealer.position.x,player.position.z-spiritHealer.position.z);}

/* ---------------- 营地建筑（扩大：木屋街区 + 市集 + 图腾 + 围栏） ---------------- */
(function placeMulgoreCampBuildings(){
  const P=BUILD_PAL.mulgore;
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1.1}),14,42,.35);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1.0}),-18,42,-.55);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:0x7a4a28,w:3.8,d:3.4,h:2.4,size:.95}),10,60,Math.PI*.95);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,w:3.4,d:3.0,size:.88}),-8,62,-.4);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:0x8a5a30,size:.9}),22,50,Math.PI*1.2);
  placeProp(sceneWorld,buildTent({hide:P.hide,stake:P.stake,r:2.9,h:3.9,size:1.05}),-4,40,.2);
  placeProp(sceneWorld,buildTent({hide:0xb89060,stake:P.stake,r:2.5,h:3.5,size:.95}),16,56,-.7);
  placeProp(sceneWorld,buildTent({hide:0xc9a06a,stake:P.stake,r:2.6,h:3.6,size:1}),-20,54,.5);
  placeProp(sceneWorld,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:.9}),-22,60,.25);
  placeProp(sceneWorld,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:.72}),20,40,-.3);
  placeProp(sceneWorld,buildMarketStall({wood:P.wood,woodD:P.woodD,cloth:0x2a6a4a,size:1}),-14,45,Math.PI*.15);
  placeProp(sceneWorld,buildCratePile({wood:P.wood,woodD:P.woodD,size:1}),-12,51,.4);
  placeProp(sceneWorld,buildTotem({wood:P.woodD,paintA:0xd94f2a,paintB:0x3a7ac9,size:.95}),-6,60,0);
  placeProp(sceneWorld,buildTotem({wood:P.woodD,paintA:0x3a7ac9,paintB:0xd94f2a,size:.85}),12,64,.2);
  placeProp(sceneWorld,buildFence({wood:P.wood,woodD:P.woodD,length:12,posts:7}),-2,38,0);
  placeProp(sceneWorld,buildFence({wood:P.wood,woodD:P.woodD,length:10,posts:6}),10,38.2,.1);
  placeProp(sceneWorld,buildFence({wood:P.wood,woodD:P.woodD,length:14,posts:8}),-24,50,Math.PI/2);
  placeProp(sceneWorld,buildFence({wood:P.wood,woodD:P.woodD,length:10,posts:6}),24,48,-Math.PI/2);
  placeProp(sceneWorld,buildFence({wood:P.wood,woodD:P.woodD,length:11,posts:7}),4,66,Math.PI);
  const cf=placeProp(sceneWorld,buildCampfire({flame:0xffa030,light:0xff8a30,size:1.05}),2,52,0);
  if(cf&&cf.userData.flame)worldFlames.push(cf.userData.flame);
  const cf2=placeProp(sceneWorld,buildCampfire({flame:0xff9030,light:0xff7a20,size:.85}),-10,56,0);
  if(cf2&&cf2.userData.flame)worldFlames.push(cf2.userData.flame);
})();

/* ============================================================
   野怪类型表（STEP 5）：模型配方 + 数值 + 掉落表 + 名字标签
   加新怪 = 这里加一条 + BALANCE.mobs 加一条 + 一行 spawnMob
   ============================================================ */
const MOB_TYPES={
  boar    :{name:"草原野猪",    build:()=>buildQuadruped(QUADS.boar),    stats:"boar",    loot:"boar",    labelW:4.6,labelY:2.7},
  wolf    :{name:"草原狼",      build:()=>buildQuadruped(QUADS.wolf),    stats:"wolf",    loot:"wolf",    labelW:4.2,labelY:2.7},
  bird    :{name:"陆行鸟",      build:()=>buildQuadruped(QUADS.bird),    stats:"bird",    loot:"bird",    labelW:4.2,labelY:3.4},
  harpy   :{name:"鹰身女妖首领",build:()=>buildHumanoidMob(MOB_HUMANOIDS.harpy),stats:"harpy",loot:"harpy",labelW:8.5,labelY:5.6,elite:true,color:"#ff9ad0",auraColor:0xff66bb},
  boarKing:{name:"老灰鬃野猪王",build:()=>buildQuadruped(QUADS.boarKing),stats:"boarKing",loot:"boarKing",labelW:9,labelY:5.8,elite:true,rare:true,color:"#ffd700",auraColor:0xffd76a},
  ashmane :{name:"灰蹄野猪王",  build:()=>buildQuadruped(QUADS.boarKing),stats:"boarKing",loot:"boarKing",labelW:9,labelY:5.8,elite:true,rare:true,color:"#ffd700",auraColor:0xffd76a},
  quilboar:{name:"野猪人斥候",  build:()=>buildQuadruped(QUADS.quilboar),stats:"quilboar",loot:"quilboar",labelW:5.2,labelY:2.9},
  centaur :{name:"半人马战士",  build:()=>buildCentaur(MOB_HUMANOIDS.centaur),stats:"centaur",loot:"centaur",labelW:6.5,labelY:4.8},
  zebra   :{name:"平原斑马",    build:()=>buildQuadruped(QUADS.zebra),   stats:"zebra",   loot:"zebra",   labelW:4.6,labelY:2.8},
  /* V1-B1 赭岩谷 */
  scorp     :{name:"赭岩巨蝎",    build:()=>buildQuadruped(QUADS.scorp),    stats:"scorp",    loot:"scorp",    labelW:5.0,labelY:2.6},
  razorback :{name:"刺脊野猪人",  build:()=>buildQuadruped(QUADS.razorback),stats:"razorback",loot:"razorback",labelW:5.8,labelY:3.2},
  cliffHarpy:{name:"崖风鹰身",    build:()=>buildHumanoidMob(MOB_HUMANOIDS.cliffHarpy),stats:"cliffHarpy",loot:"cliffHarpy",
    labelW:9,labelY:6.0,elite:true,color:"#ff9a70",auraColor:0xff7040},
  /* STEP 24 世界 Boss */
  centaurHerald:{name:"半人马战争使者",build:()=>buildCentaur(MOB_HUMANOIDS.centaurHerald),
    stats:"centaurHerald",loot:"centaurHerald",labelW:11,labelY:7.2,
    elite:true,rare:true,worldBoss:true,color:"#ffd700",auraColor:0xffb040},
};
function attachEliteAura(m,colorHex,auraCfg){
  const E=auraCfg||BAL.elite.aura;
  const col=colorHex!=null?colorHex:E.color||0xffd76a;
  const ring=new THREE.Mesh(
    new THREE.RingGeometry(E.innerR,E.outerR,40),
    new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:E.opacity,side:THREE.DoubleSide,depthWrite:false})
  );
  ring.rotation.x=-Math.PI/2; ring.position.y=.06;
  ring.userData.eliteAura=true;
  m.mesh.add(ring);
  const glow=new THREE.Mesh(
    new THREE.CircleGeometry(E.innerR*.85,28),
    new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:E.opacity*.35,side:THREE.DoubleSide,depthWrite:false})
  );
  glow.rotation.x=-Math.PI/2; glow.position.y=.04;
  glow.userData.eliteAura=true;
  m.mesh.add(glow);
  const light=new THREE.PointLight(col,1.4,14);
  light.position.y=2.2;
  light.userData.eliteAura=true;
  m.mesh.add(light);
  m.aura={ring,glow,light,baseOp:E.opacity};
}
function spawnEliteMinions(elite,typeKey){
  const cfg=BAL.elite.minions[typeKey];
  if(!cfg)return;
  const group=elite.group||("elite_"+typeKey);
  elite.group=group;
  for(let i=0;i<cfg.count;i++){
    const a=srand(0,Math.PI*2);
    const r=srand(cfg.radius*.5,cfg.radius);
    spawnMob(cfg.type, elite.home.x+Math.cos(a)*r, elite.home.z+Math.sin(a)*r, group, {minion:true,zoneId:elite.zoneId||"mulgore"});
  }
}
function spawnMob(type,x,z,group,opts){
  opts=opts||{};
  const zoneId=opts.zoneId||"mulgore";
  const T=MOB_TYPES[type], st=BAL.mobs[T.stats];
  const mesh=T.build(); mesh.position.set(x,0,z);
  mesh.rotation.y=srand(0,6.28);
  let labelY=T.labelY;
  const isWB=!!(opts.worldBoss||T.worldBoss)&&!opts.minion;
  const isElite=!!(T.elite||opts.rare||isWB)&&!opts.minion;
  if(isElite){
    const mul=isWB?(BAL.elite.worldBossScaleMul||BAL.elite.scaleMul||1):(BAL.elite.scaleMul||1);
    mesh.scale.multiplyScalar(mul);
    labelY+=isWB?(BAL.elite.worldBossLabelYBonus||BAL.elite.labelYBonus||0):(BAL.elite.labelYBonus||0);
  }
  const scn=(typeof ZONES!=="undefined"&&ZONES[zoneId]&&ZONES[zoneId].scene)||sceneWorld;
  scn.add(mesh);
  const dispName=opts.name||T.name;
  const nameColor=opts.color||T.color||(isWB||opts.rare||T.rare?(BAL.rares&&BAL.rares.gold)||"#ffd700":"#ffd9a0");
  const mobLv=st.level!=null?st.level:1;
  const label=makeNameplate(dispName,mobLv,{w:T.labelW+(isWB?1.5:0),color:nameColor,glow:nameColor});
  label.position.set(x,labelY,z); scn.add(label);
  updateNameplateHp(label,st.hp,st.hp);
  const m={type,name:dispName,level:mobLv,mesh,label,stats:st,loot:LOOT[T.loot],
    elite:isElite,
    rare:!!(opts.rare||T.rare||isWB)&&!opts.minion,
    worldBoss:isWB,
    rareId:opts.rareId||null,
    group:group||null,labelY,zoneId,
    hp:st.hp,hpMax:st.hp,state:"wander",home:{x,z},dest:null,wanderT:rand(0,3),
    atkT:0,rootT:0,respawnT:0,corpseT:0,castCd:0,casting:null,moving:false,aura:null,
    attackAnim:0,
    variance:BAL.variance.mob,
    dead(){return this.state==="dead"||this.state==="return";},
    fctPos(){return this.mesh.position.clone().setY(this.labelY-.4);},
    fctSize(){return this.worldBoss?18:this.elite?16:14;},
    onHit(amount,label){
      if(this.state==="wander")aggroMob(this);
      if(label)log(`你的【${label}】命中${this.name}，造成 ${amount} 伤害。`,"lg-me");
    },
    onDeath(){mobDie(this);},
  };
  if(m.elite){
    const auraCfg=m.worldBoss&&BAL.elite.worldBossAura?BAL.elite.worldBossAura:BAL.elite.aura;
    attachEliteAura(m,T.auraColor,auraCfg);
    spawnEliteMinions(m,type);
  }
  MOBS.push(m); return m;
}
/* 可否被选中/命中：死亡与脱战回巢中的怪不可打 */
/* 可否被选中/命中：死亡、回巢、尸体阶段均不可打 */
function mobTargetable(m){
  if(!m||!m.mesh)return false;
  if(m.state==="dead"||m.state==="return")return false;
  if((m.hp|0)<=0)return false;
  if(m.corpseT>0)return false;
  if(m.mesh.visible===false)return false;
  return true;
}
function addTargetable(a){
  if(!a||!a.mesh)return false;
  if(a.state==="dead"||(a.corpseT|0)>0)return false;
  if((a.hp|0)<=0)return false;
  if(a.mesh.visible===false)return false;
  if(typeof S!=="undefined"&&S.adds&&!S.adds.includes(a))return false;
  return true;
}
/* 进入仇恨（STEP 5 含社群仇恨 social pull）：同群且在社群半径内的伙伴全体跟进 */
function aggroMob(m){
  if(m.state!=="wander")return;
  m.state="aggro";
  SFX.play("growl");   /* 族群共用吼叫音色（STEP 6） */
  log(`${m.name}向你扑来！`,"lg-dmg");
  if(m.group){
    let pulled=0;
    for(const o of MOBS){
      if(o!==m&&o.group===m.group&&o.state==="wander"&&
         Math.hypot(o.mesh.position.x-m.mesh.position.x,o.mesh.position.z-m.mesh.position.z)<(m.stats.socialR||18)){
        o.state="aggro"; pulled++;
      }
    }
    if(pulled)log(`整群${m.name}都被激怒了！`,"lg-dmg");
  }
}

/* ---------------- 野怪放置（V1-B2：坐标×2 + 增驻点，世界确定性） ---------------- */
/* 野猪群（营地周围，任务目标） */
[[40,44],[-48,52],[54,-8],[-36,-20],[20,64],[32,28],[-20,40],[48,16],[-56,36],[12,72]].forEach(([x,z])=>spawnMob("boar",x,z));
/* 草原狼：两群 */
[[-84,-52],[-76,-62],[-90,-66],[-70,-48]].forEach(([x,z])=>spawnMob("wolf",x,z,"wolfpack"));
[[60,70],[68,78],[54,82]].forEach(([x,z])=>spawnMob("wolf",x,z,"wolfpack2"));
/* 陆行鸟：湖边中立被动 */
[[-56,4],[-92,52],[-48,28],[-70,16],[-40,40]].forEach(([x,z])=>spawnMob("bird",x,z));
/* 稀有/精英：rares.js 加载后 spawnRaresForZone("mulgore") */
function moveToward(m,dest,spd,dt){
  const dx=dest.x-m.mesh.position.x,dz=dest.z-m.mesh.position.z;
  const d=Math.hypot(dx,dz);
  if(d<.4){m.moving=false;return;}
  m.moving=true;
  m.mesh.position.x+=dx/d*spd*dt; m.mesh.position.z+=dz/d*spd*dt;
  m.mesh.rotation.y=Math.atan2(dx,dz);
}
/* 野猪受击：薄包装 → 统一受击入口 hitEntity（STEP 1） */
function mobDamage(m,amount,label,opts){hitEntity(m,amount,label,opts);}
/* ---------------- 尸体灰化 / 复原（STEP 2）----------------
   死亡：倒地 + 全部材质换灰（原材质暂存 userData.liveMat）；重生时还原 */
const corpseMat=new THREE.MeshStandardMaterial({color:0x8a8a8a,roughness:1,flatShading:true});
function setCorpse(m,on){
  if(on){
    if(typeof beginDeathRoll==="function")beginDeathRoll(m);
    else{m.mesh.rotation.z=Math.PI/2;m.mesh.position.y=.25;}
  }else{
    if(typeof resetDeathRoll==="function")resetDeathRoll(m.mesh);
    else{m.mesh.rotation.z=0;m.mesh.position.y=0;}
    m.mesh.position.y=0;
    if(m.attackAnim!=null)m.attackAnim=0;
  }
  m.mesh.traverse(o=>{
    if(o.userData&&o.userData.eliteAura){o.visible=!on;return;}
    if(!o.isMesh)return;
    if(on){o.userData.liveMat=o.material;o.material=corpseMat;}
    else if(o.userData.liveMat){o.material=o.userData.liveMat;o.userData.liveMat=null;}
  });
  if(m.aura&&m.aura.light)m.aura.light.visible=!on;
}
/* 野怪死亡（STEP 1 onDeath 唯一挂接点）：留尸 + 掉落（STEP 2）+ 经验（STEP 3）
   STEP 5 泛化：数值/掉落/经验全部来自实体自身配置；精英走 eliteWeights 必掉优秀以上 */
function mobDie(m){
  m.state="dead"; m.respawnT=m.stats.respawnT; m.corpseT=BAL.loot.corpseT; m.moving=false;
  m.casting=null;
  if(typeof clearCurrentTargetIf==="function")clearCurrentTargetIf(m);
  if(typeof clearThreat==="function")clearThreat(m);
  m.label.visible=false;
  setCorpse(m,true);
  spawnBurst(m.mesh.position.clone().setY(1),0xc9a06a,22,1.6);
  log(`你击杀了${m.name}！`,"lg-me");
  if(typeof onRareKill==="function")onRareKill(m);
  else if(m.elite)announce(`${m.name} 被击败！`);
  dropLoot(m.mesh.position.clone().add(new THREE.Vector3(1.2,0,.6)),
    [rollLoot(m.loot,m.elite?BAL.loot.eliteWeights:null)],m);
  gainXP(m.stats.xp);
  const cu=rollCopperRange(m.stats.copper);
  if(cu)gainCopper(cu);
  if(typeof onQuestMobKill==="function")onQuestMobKill(m);
  else if(m.type==="boar"&&QUEST.state===1&&QUEST.kills<BAL.quest.boarKills){
    QUEST.kills++; updateQuest();
    if(QUEST.kills>=BAL.quest.boarKills){announce("任务目标完成 · 回去找长老"); setMarker();}
    if(typeof saveGame==="function")saveGame(true);
  }
  if(typeof onDeedMobKill==="function")onDeedMobKill(m);
  if(typeof onBarrensQuestKill==="function")onBarrensQuestKill(m);
  if(typeof updateDurotarMarkers==="function")updateDurotarMarkers();
}

/* ---------------- 任务追踪 HUD（右上角；详情见 L 任务日志）· STEP 22 走 quests.js ---- */
function updateQuest(){
  if(typeof updateQuestTracker==="function"){updateQuestTracker();return;}
  const q=$("#quest");
  q.style.display="none";
}

/* ---------------- NPC 对话 ---------------- */
function elderDist(){return Math.hypot(player.position.x-elder.position.x,player.position.z-elder.position.z);}
function vendorDist(){return Math.hypot(player.position.x-vendor.position.x,player.position.z-vendor.position.z);}
function hunterDist(){return Math.hypot(player.position.x-hunter.position.x,player.position.z-hunter.position.z);}

function pickNearestNpc(entries){
  const R=BAL.economy.interactR;
  let best=null,bestD=R;
  for(const e of entries){
    if(!e||!e.mesh)continue;
    const d=Math.hypot(player.position.x-e.mesh.position.x,player.position.z-e.mesh.position.z);
    if(d<bestD){bestD=d;best=e;}
  }
  return best;
}
function appendNpcQuestButtons(npcId,btn,refreshFn,skipIds){
  if(typeof questsForNpc!=="function")return;
  const skip=skipIds||[];
  for(const q of questsForNpc(npcId)){
    if(skip.indexOf(q.id)>=0)continue;
    if(canTurnInQuest(q.id))btn(`✦ 交任务：${q.title}`,()=>{turnInQuest(q.id);if(refreshFn)refreshFn();else closeDialogue();});
    else if(canAcceptQuest(q.id))btn(`✦ 接受：${q.title}`,()=>{
      acceptQuest(q.id);
      if(typeof updateNpcQuestMarkers==="function")updateNpcQuestMarkers();
      if(refreshFn)refreshFn();else closeDialogue();
    });
  }
}

function tryInteract(){
  if(!S.started||!S.p.alive)return;
  if(tryLoot())return;
  if(S.mode==="raid"&&S.b.canLeave&&exitPortal&&player.position.distanceTo(EXIT_PORTAL_POS)<BAL.zones.exitPortalEnterR){
    leaveRaid(); return;
  }
  if(S.mode!=="world")return;
  if(typeof tryProfessionInteract==="function"&&tryProfessionInteract())return;
  if(typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="barrens"
    &&typeof tryInteractBarrens==="function"){tryInteractBarrens();return;}
  if(typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="durotar"
    &&typeof tryInteractDurotar==="function"){tryInteractDurotar();return;}
  const near=pickNearestNpc([
    {mesh:spiritHealer,open:openSpiritDialogue},
    {mesh:vendor,open:()=>openVendor("vendor","🏕️ 商人 · 火蹄")},
    {mesh:elder,open:openDialogue},
    {mesh:hunter,open:openHunterDialogue},
  ]);
  if(near)near.open();
}
function openSpiritDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="👻 灵魂医者 · 风语";
  dlg.style.display="block"; bts.innerHTML="";
  tx.textContent="旅人，若你在战场上倒下，释放灵魂后我会在此接引你归来。大地母亲护佑着所有勇敢的灵魂。";
  const b=document.createElement("button");
  b.className="dbtn";b.textContent="感谢您，医者";b.onclick=closeDialogue;bts.appendChild(b);
}
function closeDialogue(){
  $("#dlg").style.display="none";
  closeVendorPanel();
  S.craftOpen=false;
  if(typeof renderBag==="function")renderBag();
}
function closeVendorPanel(){
  const pan=$("#vendorPanel");
  if(pan)pan.style.display="none";
  S.vendorOpen=false;
  S.vendorNpcId=null;
  document.body.classList.remove("trading");
  if(typeof hideItemTip==="function")hideItemTip();
}
function currentVendorStock(){
  const by=BAL.economy.vendorStockByNpc;
  const id=S.vendorNpcId||"vendor";
  if(by&&by[id]&&by[id].length)return by[id];
  return BAL.economy.vendorStock||[];
}
function refreshVendorPanel(){
  if(!S.vendorOpen)return;
  const pan=$("#vendorPanel"); if(!pan)return;
  const goldEl=$("#vendorGold"), stockEl=$("#vendorStock"), questEl=$("#vendorQuests");
  const titleEl=$("#vendorTitle");
  if(titleEl&&!titleEl.dataset.locked){/* set by openVendor */}
  if(goldEl)goldEl.innerHTML=`钱袋：<b>${formatCopperText(S.p.gold|0)}</b>`;
  if(questEl){
    questEl.innerHTML="";
    const btn=(t,fn)=>{const b=document.createElement("button");
      b.className="dbtn";b.textContent=t;b.onclick=fn;questEl.appendChild(b);};
    appendNpcQuestButtons(S.vendorNpcId||"vendor",btn,refreshVendorPanel);
    questEl.style.display=questEl.children.length?"block":"none";
  }
  if(stockEl){
    stockEl.innerHTML="";
    for(const id of currentVendorStock()){
      const it=ITEMS[id]; if(!it||it.vendorBuy==null)continue;
      const q=QUALITY[it.quality]||QUALITY.common;
      const card=document.createElement("button");
      card.type="button";
      card.className="vendor-card";
      card.innerHTML=
        `<img src="${Icons.get(it.icon,q.color)}" style="border-color:${q.color}" alt="">`+
        `<div class="vb"><div class="vn" style="color:${q.color}">${it.name}</div>`+
        `<div class="vp">${formatCopperText(it.vendorBuy)}</div></div>`;
      card.onclick=()=>{buyVendorItem(id);};
      if(typeof bindItemTip==="function")bindItemTip(card,it,"点击购买");
      stockEl.appendChild(card);
    }
  }
}
function openVendor(npcId,title){
  S.vendorOpen=true;
  S.vendorNpcId=npcId||"vendor";
  $("#dlg").style.display="none";
  const pan=$("#vendorPanel");
  if(pan)pan.style.display="block";
  const titleEl=$("#vendorTitle");
  if(titleEl)titleEl.textContent=title||"🏕️ 商人";
  document.body.classList.add("trading");
  if(typeof ensureBagOpen==="function")ensureBagOpen();
  else if(typeof bagOpen==="function"&&!bagOpen()){
    $("#bag").style.display="block";
    if(typeof renderBag==="function")renderBag();
  }
  refreshVendorPanel();
}
function openHunterDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🏹 猎手 · 迅羽";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  const offers=typeof questsForNpc==="function"?questsForNpc("hunter"):[];
  if(offers.length)tx.textContent="草原上的猎物很机警。我这里有活计——看看吧。";
  else tx.textContent="草原上的猎物很机警。暂时没有新的委托，有需要再来。";
  appendNpcQuestButtons("hunter",btn);
  btn("离开",closeDialogue);
}
function openDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🐂 长老 · 岩蹄";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};

  if(typeof canTurnInQuest==="function"&&canTurnInQuest("elder_boars")){
    tx.textContent="干得漂亮，勇士！听着——传送门深处沉睡着炎魔领主拉戈斯，他的烈焰迟早会烧到这片草原。收下大地母亲的祝福，北行吧，终结他！";
    btn("✦ 领取奖励 · 长老的试炼",()=>{
      turnInQuest("elder_boars");
      spawnBurst(player.position.clone().setY(1.5),0x8aff9a,30,2);
      closeDialogue();
    });
  }else if(typeof canAcceptQuest==="function"&&canAcceptQuest("elder_boars")){
    tx.textContent="远行的旅人啊，草原并不平静。北方的传送门日夜喷吐着灼热的怨气……但在此之前，先证明你的实力：营地周围的草原野猪近来狂躁伤人，猎杀 3 只，我便告诉你炎魔的秘密。";
    btn("✦ 接受任务：长老的试炼",()=>{
      acceptQuest("elder_boars"); closeDialogue();
    });
  }else if(typeof questStatus==="function"&&questStatus("elder_boars")==="active"){
    const k=questProgress("elder_boars").kills|0;
    tx.textContent=`野猪仍在草原上游荡（${k}/${BAL.quest.boarKills}）。靠近它们，用你的武器说话吧，勇士。`;
  }else{
    let tip="北行吧，勇士。踏入旋涡，愿圣山的风与你同在。";
    if(S.p.level>=BAL.barrens.minLevel){
      tip+=" 营地南边的土路已通向贫瘠之地的十字路口——那里需要新的帮手。";
    }
    tip+=" 市集找火蹄买补给，狩猎事务找迅羽。";
    tx.textContent=tip;
  }

  appendNpcQuestButtons("elder",btn,null,["elder_boars"]);

  if(typeof openRecruitDialogue==="function"){
    if(typeof companionAlive==="function"&&companionAlive())
      btn("解散 / 管理小队",()=>openRecruitDialogue());
    else
      btn("✦ 组建小队同行",()=>openRecruitDialogue());
  }
  btn("离开",closeDialogue);
}

/* 商店面板关闭（保留背包，便于继续整理） */
(()=>{
  const vc=$("#vendorClose");
  if(vc)vc.addEventListener("click",()=>{
    closeVendorPanel();
    if(typeof renderBag==="function")renderBag();
  });
})();
