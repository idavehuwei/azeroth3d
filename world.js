/* ============================================================
   炽心 · world.js
   赤蹄草甸世界：实体放置 / 草原与营地 / 传送门与进本 / 野怪与 NPC 任务系统
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ rand srand worldRng BAL makeLabel scene camera setZoneSeed）
          palette.js（PALETTE · MAT）· terrain.js（heightAt · buildMulgoreTerrain）
          props.js（spawnMulgoreProps · updateProps）
          assets.js（可选 ASSETS · GLB 建筑就绪后再摆营地）
          sky.js（initZoneSky · updateSky）
          zones.js（registerZone enterZone）
          models.js（buildPlayer buildBoss buildElder buildVendor buildSpiritHealer
            tintNpcCloth buildHut buildTent buildFence buildWatchtower buildCampfire
            buildTotem buildMarketStall buildCratePile
            buildLonghouse buildWell buildVillageGate buildSignpost buildLanternPole buildHaystack buildTrainingDummy buildWindmill BUILD_PAL placeProp）
          creatures.js（buildQuadruped buildElemental buildHumanoidMob buildMeleeHumanoid buildCentaur
            QUADS MOB_LOOK MOB_HUMANOIDS MELEE_HUMANOIDS）
          anim.js 运行时（beginDeathRoll resetDeathRoll）
          items.js（dropLoot rollLoot rollMobLoot LOOT tryLoot buyVendorItem）
          combat.js 运行时（S log announce fct spawnBurst hitEntity closeDialogue
            gainCopper rollCopperRange …）
          companions.js 运行时（openRecruitDialogue companionAlive）
          quests.js 运行时（acceptQuest turnInQuest onQuestMobKill questsForNpc）
          professions.js 运行时（buildWorkbench spawnGatherNodesForZone tryProfessionInteract）
          rares.js 运行时（spawnRaresForZone onRareKill）
          vfx.js 运行时（VFX spawnBurst beginDissolve）
          save.js 运行时（saveGame；接任务/交任务/离本）
   [导出] player boss BOSS_MESHES WORLD_R MULGORE BLOODHOOF CAMP_NARACHE REDROCK_LAKE sceneWorld heli sun worldFlames PORTAL_POS portalUni
          portalLabel enterRaid fadeTo MOBS QUEST moveToward mobDamage mobDie
          mobTargetable addTargetable setCorpse requestCorpseDissolve updateQuest setMarker tryInteract openDialogue closeDialogue
          openVendor refreshVendorPanel closeVendorPanel openSpiritDialogue
          leaveRaid resetBoss spawnExitPortal removeExitPortal exitPortal
          fireflies FIREFLIES ffPhases elder baine hawkwind grull mull harken morin ruul varg
          elderDist vendor vendorDist hunter hunterDist nearestMulgoreNpcDist nearMulgoreNpc
          spiritHealer spiritDist spawnMob MOBS MOB_TYPES PORTAL_BARRENS PORTAL_ASHEN
          appendNpcQuestButtons pickNearestNpc updateNpcQuestMarkers setMarker
          openHawkwindDialogue openGrullDialogue openNpcQuestDialogue placeTalkNpc registerNpcInteract
   ============================================================ */
"use strict";
/* 主循环/跨文件会读到的绑定：文件顶部即初始化，避免中途抛错落入 TDZ */
let portalUni=null;
let southPortalUni=null;
let portalLabel=null;
let southPortalLabel=null;
let exitPortal=null;
const MOBS=[];
let fireflies=null;
let ffPhases=null;
let FIREFLIES=0;
/* 赤蹄草甸分区种子：地形 / 野怪摆放全部走此流（STEP 17） */
setZoneSeed("mulgore");

/* ---------------- 实体放置 ---------------- */
let player=buildPlayer(); player.position.set(0,0,14); scene.add(player);
let boss=buildBoss(); boss.position.set(0,-16,-14); sceneRaid.add(boss);
const BOSS_MESHES={ragnaros:boss};

/* ============================================================
   赤蹄草甸 · 外部世界（草原 / 红岩台地 / 蹄人营地 / 副本传送门）
   ============================================================ */
const WORLD_R=352; /* V2：开放区半径再×2（相对 V1-B2=176） */
/* 经典赤蹄草甸地图 % → 世界 XZ
   WoW 内容框约 x33–65 / y12–95，单独拉伸铺满圆形地图（避免挤在中间竖条）
   Y 越大越南 = +Z */
function mulgoreWow(wx,wy){
  const x0=33,x1=65,y0=12,y1=95;
  const cx=(x0+x1)*.5, cy=(y0+y1)*.5;
  const hx=(x1-x0)*.5, hy=(y1-y0)*.5;
  const nx=(wx-cx)/hx, nz=(wy-cy)/hy;
  return{x:nx*WORLD_R*.82, z:nz*WORLD_R*.86};
}
const MULGORE={
  narache:mulgoreWow(44,92),       /* 岩蹄营地 1-5 · 出生点 */
  bloodhoof:mulgoreWow(47,59),     /* 赤蹄村 5-10 · 主城 */
  thunderBluff:mulgoreWow(45,25),  /* 雷岩台 10+ */
  redCloud:mulgoreWow(39,82),      /* 红云台地 1-5 */
  palemane:mulgoreWow(36,62),      /* 贫瘠石 / 苍鬃 6-8 */
  golden:mulgoreWow(49,39),        /* 黄金平原 5-8 */
  thunderhorn:mulgoreWow(46,46),   /* 雷角水井 */
  winterhoof:mulgoreWow(55,66),    /* 冬蹄水井 */
  windfury:mulgoreWow(52,14),      /* 风啸岗 9-12 */
  baeldun:mulgoreWow(35,47),       /* 巴尔丹挖掘场 8-10 */
  venture:mulgoreWow(61,50),       /* 风险投资公司矿洞 7-10 */
  stonebull:mulgoreWow(42,58),     /* 石牛湖 */
};
const BLOODHOOF=MULGORE.bloodhoof;
const REDROCK_LAKE=MULGORE.stonebull;
const CAMP_NARACHE=MULGORE.narache;
const sceneWorld=new THREE.Scene();
sceneWorld.fog=new THREE.FogExp2(0xa8c8e0,0.0042);
sceneWorld.add(new THREE.HemisphereLight(0xcfe8ff,0x5a7a3a,0.95));
const heli=sceneWorld.children.find(c=>c.isHemisphereLight);  /* 昼夜循环需要调节 */
const sun=new THREE.DirectionalLight(0xfff2d8,1.05);
sun.position.set(40,70,30); sun.castShadow=true;
sceneWorld.add(sun);
sceneWorld.add(sun.target);
/* plan-V2 · R4：天空穹顶 + 紧阴影 + 补光（替换 background Color / ±220 阴影） */
const _mulgoreSkyInit=initZoneSky(sceneWorld,{heli,sun});

/* 高度场：经典赤蹄草甸 · 台地/矿洞/湖泊 + 多段土路网 */
const _portalMC={x:0,z:-(WORLD_R-8)};
const _portalBarrens={x:0,z:WORLD_R-8};
const _terrainBuilt=buildMulgoreTerrain({
  worldR:WORLD_R,
  camp:BLOODHOOF,
  portalMC:_portalMC,
  portalBarrens:_portalBarrens,
  flats:[
    {x:BLOODHOOF.x,z:BLOODHOOF.z,inner:34,outer:58},
    {x:CAMP_NARACHE.x,z:CAMP_NARACHE.z,inner:22,outer:40},
    {x:MULGORE.thunderBluff.x,z:MULGORE.thunderBluff.z,inner:28,outer:50},
  ],
  mesas:[
    {x:MULGORE.redCloud.x,z:MULGORE.redCloud.z,rInner:48,rOuter:78,h:11,cliff:1.5},
    {x:MULGORE.thunderBluff.x,z:MULGORE.thunderBluff.z,rInner:42,rOuter:72,h:14,cliff:1.65},
    {x:MULGORE.windfury.x,z:MULGORE.windfury.z,rInner:36,rOuter:64,h:10,cliff:1.8},
    {x:MULGORE.palemane.x,z:MULGORE.palemane.z,rInner:22,rOuter:40,h:5.5,cliff:1.25},
  ],
  pits:[
    {x:MULGORE.venture.x,z:MULGORE.venture.z,rInner:10,rOuter:22,depth:5.2},
    {x:MULGORE.baeldun.x,z:MULGORE.baeldun.z,rInner:12,rOuter:26,depth:3.6},
  ],
  lakes:[
    {x:REDROCK_LAKE.x,z:REDROCK_LAKE.z,inner:16,outer:34,depth:.7},
    {x:MULGORE.thunderhorn.x-6,z:MULGORE.thunderhorn.z+4,inner:5,outer:11,depth:.35},
    {x:MULGORE.winterhoof.x+4,z:MULGORE.winterhoof.z-3,inner:4.5,outer:10,depth:.3},
  ],
  roads:[
    {halfW:5.0, pts:[
      CAMP_NARACHE,
      {x:(CAMP_NARACHE.x+MULGORE.redCloud.x)*.5+8,z:(CAMP_NARACHE.z+MULGORE.redCloud.z)*.55},
      {x:BLOODHOOF.x+6,z:BLOODHOOF.z+40},
      BLOODHOOF,
    ]},
    {halfW:5.5, pts:[
      BLOODHOOF,
      {x:MULGORE.thunderhorn.x+10,z:MULGORE.thunderhorn.z+8},
      MULGORE.thunderBluff,
      {x:MULGORE.thunderBluff.x+6,z:MULGORE.thunderBluff.z-50},
      _portalMC,
    ]},
    {halfW:5.2, pts:[
      BLOODHOOF,
      {x:MULGORE.golden.x+60,z:MULGORE.golden.z+80},
      {x:MULGORE.winterhoof.x*.35,z:(BLOODHOOF.z+_portalBarrens.z)*.55},
      {x:_portalBarrens.x+12,z:_portalBarrens.z-40},
      _portalBarrens,
    ]},
    {halfW:4.2, pts:[
      BLOODHOOF,
      {x:(BLOODHOOF.x+MULGORE.winterhoof.x)*.5,z:(BLOODHOOF.z+MULGORE.winterhoof.z)*.5},
      MULGORE.winterhoof,
    ]},
    {halfW:4.0, pts:[
      BLOODHOOF,
      {x:(BLOODHOOF.x+MULGORE.palemane.x)*.5,z:(BLOODHOOF.z+MULGORE.palemane.z)*.5+6},
      MULGORE.palemane,
    ]},
    {halfW:4.0, pts:[
      BLOODHOOF,
      {x:MULGORE.venture.x-20,z:MULGORE.venture.z+20},
      MULGORE.venture,
    ]},
    {halfW:3.8, pts:[
      MULGORE.thunderBluff,
      {x:(MULGORE.thunderBluff.x+MULGORE.windfury.x)*.5+12,z:(MULGORE.thunderBluff.z+MULGORE.windfury.z)*.5},
      {x:MULGORE.windfury.x-8,z:MULGORE.windfury.z+28},
    ]},
    {halfW:3.6, pts:[
      {x:MULGORE.golden.x-10,z:MULGORE.golden.z},
      {x:(MULGORE.golden.x+MULGORE.baeldun.x)*.5,z:(MULGORE.golden.z+MULGORE.baeldun.z)*.5},
      MULGORE.baeldun,
    ]},
  ],
});
sceneWorld.add(_terrainBuilt.mesh);
function _gy(x,z){return heightAt(x,z);}

/* 篝火引用（placeMulgoreCampBuildings 填充；旧散布已迁至 props.js） */
const worldFlames=[];

/* 植被 · 镜湖 · 云（plan-V2 · R3）—— 替换静态 pond / 旧树岩帐篷散布 */
spawnMulgoreProps(sceneWorld,{
  worldR:WORLD_R,
  camp:BLOODHOOF,
  avoid:[
    {x:BLOODHOOF.x,z:BLOODHOOF.z,r:55},
    {x:CAMP_NARACHE.x,z:CAMP_NARACHE.z,r:40},
    {x:MULGORE.thunderBluff.x,z:MULGORE.thunderBluff.z,r:55},
    {x:MULGORE.redCloud.x,z:MULGORE.redCloud.z,r:50},
    {x:MULGORE.windfury.x,z:MULGORE.windfury.z,r:45},
    {x:REDROCK_LAKE.x,z:REDROCK_LAKE.z,r:40},
  ],
});

/* 风投矿洞洞口 */
(function placeVentureCaveMouth(){
  const V=MULGORE.venture;
  const gy=_gy(V.x,V.z);
  const rock=MAT.get("rock.mesa",{color:0x3a4840});
  [-1,1].forEach(s=>{
    const pil=new THREE.Mesh(new THREE.BoxGeometry(2.2,5.5,2.2),rock);
    pil.position.set(V.x+s*4.2,gy+1.2,V.z-6); pil.castShadow=true; sceneWorld.add(pil);
  });
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(11,1.6,2.4),rock);
  lintel.position.set(V.x,gy+4.2,V.z-6); sceneWorld.add(lintel);
  const mouth=new THREE.Mesh(new THREE.CircleGeometry(3.2,20),
    MAT.get("_",{color:0x080c08,roughness:1}));
  mouth.position.set(V.x,gy+1.6,V.z-5.2); sceneWorld.add(mouth);
})();

/* 环绕天际的红岩台地（远景 rim） */
const mesaMat=MAT.get("rock.mesa");
const mesaTop=MAT.get("grass.mesaTop");
for(let i=0;i<10;i++){
  const a=i/10*Math.PI*2+srand(-.15,.15), r=WORLD_R+srand(6,24);
  const h=srand(24,44), rad=srand(10,17);
  const mesa=new THREE.Mesh(new THREE.CylinderGeometry(rad*.85,rad,h,9),mesaMat);
  mesa.position.set(Math.cos(a)*r,h/2-1,Math.sin(a)*r);
  mesa.castShadow=true; sceneWorld.add(mesa);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(rad*.86,rad*.86,1.2,9),mesaTop);
  cap.position.set(mesa.position.x,h-.4,mesa.position.z); sceneWorld.add(cap);
}
/* 红云 / 雷岩台 / 风啸岗崖壁装饰 */
[[MULGORE.redCloud,56],[MULGORE.thunderBluff,48],[MULGORE.windfury,40]].forEach(([c,rad])=>{
  for(let k=0;k<6;k++){
    const a=k/6*Math.PI*2+srand(-.2,.2);
    const x=c.x+Math.cos(a)*(rad*.72+srand(-4,4));
    const z=c.z+Math.sin(a)*(rad*.72+srand(-4,4));
    const h=srand(4,9);
    const cliff=new THREE.Mesh(new THREE.CylinderGeometry(srand(2.5,4.5),srand(3,5.5),h,7),mesaMat);
    cliff.position.set(x,_gy(x,z)+h*.35,z); cliff.castShadow=true; sceneWorld.add(cliff);
  }
});
/* 水井标记（雷角 / 冬蹄） */
[[MULGORE.thunderhorn.x,MULGORE.thunderhorn.z,"雷角水井"],[MULGORE.winterhoof.x,MULGORE.winterhoof.z,"冬蹄水井"]].forEach(([x,z,lab])=>{
  const gy=_gy(x,z);
  const well=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.8,1.2,10),
    MAT.get("rock.boulder",{color:0x6a7a88}));
  well.position.set(x,gy+.6,z); well.castShadow=true; sceneWorld.add(well);
  const wl=makeLabel(lab,7,"#a8d0ff","rgba(40,60,90,.85)");
  wl.position.set(x,gy+3.2,z); sceneWorld.add(wl);
});
/* 巴尔丹挖掘场脚手架 + 风险投资矿洞标记 */
(function placeMulgoreSites(){
  const B=MULGORE.baeldun, V=MULGORE.venture;
  placeProp(sceneWorld,buildCratePile({wood:0x6a5a40,woodD:0x3a3020,size:1.1}),B.x+4,B.z-2,.3);
  placeProp(sceneWorld,buildWatchtower({wood:0x5a6a78,woodD:0x3a4858,flag:0x3a5a8a,size:.85}),B.x-6,B.z+4,.2);
  placeProp(sceneWorld,buildCratePile({wood:0x5a7040,woodD:0x2a3820,size:1}),V.x-3,V.z+2,.5);
  const mine=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.8,1.2,10),
    MAT.get("rock.mesa",{color:0x4a5840}));
  const gy=_gy(V.x,V.z);
  mine.position.set(V.x,gy+.4,V.z); sceneWorld.add(mine);
  const ml=makeLabel("风险投资公司矿洞",9,"#b8d080","rgba(40,60,20,.9)");
  ml.position.set(V.x,gy+4.5,V.z); sceneWorld.add(ml);
  const bl=makeLabel("巴尔丹挖掘场",9,"#a0b0c8","rgba(30,40,60,.9)");
  bl.position.set(B.x,_gy(B.x,B.z)+5,B.z); sceneWorld.add(bl);
})();

/* ---------------- 圣山北麓（原熔火门口改为风景岩脊，无副本入口） ---------------- */
const PORTAL_POS=new THREE.Vector3(0,0,-(WORLD_R-8)); /* 北界地标坐标（采集避让等仍用） */
const _pg=_gy(PORTAL_POS.x,PORTAL_POS.z);
const northRidgeMat=MAT.get("rock.north_ridge",{color:0x4a3a28,roughness:.95,flatShading:true,
  emissive:0x2a1810,emissiveIntensity:.12});
[[-8,0],[8,0],[-4,-6],[4,-6],[0,-10]].forEach(([sx,sz],i)=>{
  const rk=new THREE.Mesh(new THREE.DodecahedronGeometry(2.2+i*.35,0),northRidgeMat);
  rk.position.set(PORTAL_POS.x+sx,_pg+1.2+i*.2,PORTAL_POS.z+sz);
  rk.rotation.set(.2,i, .1); rk.castShadow=true; sceneWorld.add(rk);
});
const northRidgePlat=new THREE.Mesh(new THREE.CylinderGeometry(6,7.5,.8,10),northRidgeMat);
northRidgePlat.position.set(PORTAL_POS.x,_pg+.35,PORTAL_POS.z); northRidgePlat.receiveShadow=true; sceneWorld.add(northRidgePlat);
portalLabel=makeLabel("圣山北麓",11,"#d8c090","rgba(60,40,20,.88)");
portalLabel.position.set(PORTAL_POS.x,_pg+8.5,PORTAL_POS.z); sceneWorld.add(portalLabel);
const portalLabel2=makeLabel(T("zone.molten_core")+"已迁往"+T("zone.blackrock"),6,"#c9a06a","rgba(50,30,15,.85)");
portalLabel2.position.set(PORTAL_POS.x,_pg+7.2,PORTAL_POS.z); sceneWorld.add(portalLabel2);
/* portalUni 保持 null：北界不再有旋涡门 */

/* ---------------- 枯原荒地传送门（营地南，STEP 18）：Lv10+ 可见可进 ---------------- */
const PORTAL_BARRENS=new THREE.Vector3(0,0,WORLD_R-8);
const _bg=_gy(PORTAL_BARRENS.x,PORTAL_BARRENS.z);
const barrensGateMat=MAT.get("wood.gate",{color:0x5a4028,roughness:.9,flatShading:true,
  emissive:0x6a4a20,emissiveIntensity:.18});
const bPlat=new THREE.Mesh(new THREE.CylinderGeometry(7,8.5,1,12),barrensGateMat);
bPlat.position.set(PORTAL_BARRENS.x,_bg+.5,PORTAL_BARRENS.z); bPlat.receiveShadow=true; sceneWorld.add(bPlat);
[[-3.4],[3.4]].forEach(([sx])=>{
  const pil=new THREE.Mesh(new THREE.BoxGeometry(1.5,8.5,1.5),barrensGateMat);
  pil.position.set(PORTAL_BARRENS.x+sx,_bg+4.8,PORTAL_BARRENS.z); pil.castShadow=true; sceneWorld.add(pil);
});
const bLintel=new THREE.Mesh(new THREE.BoxGeometry(9.2,1.4,1.6),barrensGateMat);
bLintel.position.set(PORTAL_BARRENS.x,_bg+9.2,PORTAL_BARRENS.z); bLintel.castShadow=true; sceneWorld.add(bLintel);
southPortalUni={uTime:{value:0}};
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
barrensPortalDisc.position.set(PORTAL_BARRENS.x,_bg+4.6,PORTAL_BARRENS.z); sceneWorld.add(barrensPortalDisc);
southPortalLabel=makeLabel(T("zone.barrens"),12,"#e8c898","rgba(160,100,40,.9)");
southPortalLabel.position.set(PORTAL_BARRENS.x,_bg+12.2,PORTAL_BARRENS.z); sceneWorld.add(southPortalLabel);
const southPortalLabel2=makeLabel(`${T("poi.crossroads")} · 需要 Lv.${BAL.barrens.minLevel}+`,7,"#ffb060","rgba(160,80,20,.9)");
southPortalLabel2.position.set(PORTAL_BARRENS.x,_bg+10.8,PORTAL_BARRENS.z); sceneWorld.add(southPortalLabel2);

/* plan-v4 STEP 22：西侧山口 → 灰烬峡谷（石门通道，无旋涡传送门） */
const PORTAL_ASHEN=new THREE.Vector3(-(WORLD_R-8),0,0);
const _ag=_gy(PORTAL_ASHEN.x,PORTAL_ASHEN.z);
const ashenPassMat=MAT.get("rock.ashen_pass",{color:0x3a2a22,roughness:.95,flatShading:true,
  emissive:0x5a2810,emissiveIntensity:.22});
const aPlat=new THREE.Mesh(new THREE.BoxGeometry(10,1.2,14),ashenPassMat);
aPlat.position.set(PORTAL_ASHEN.x,_ag+.4,PORTAL_ASHEN.z); aPlat.receiveShadow=true; sceneWorld.add(aPlat);
[[-5.5],[5.5]].forEach(([sz])=>{
  const cliff=new THREE.Mesh(new THREE.BoxGeometry(4.5,11,6),ashenPassMat);
  cliff.position.set(PORTAL_ASHEN.x-1,_ag+5.5,PORTAL_ASHEN.z+sz); cliff.castShadow=true; sceneWorld.add(cliff);
});
const aArch=new THREE.Mesh(new THREE.BoxGeometry(3.2,2.2,12),ashenPassMat);
aArch.position.set(PORTAL_ASHEN.x-1,_ag+11.2,PORTAL_ASHEN.z); sceneWorld.add(aArch);
/* 山口阴影口（非旋涡）：深色竖面表示通道 */
const aMouth=new THREE.Mesh(new THREE.PlaneGeometry(7.5,9),
  MAT.get("pass.mouth",{color:0x1a0c06,roughness:1,emissive:0x401808,emissiveIntensity:.35,side:THREE.DoubleSide}));
aMouth.position.set(PORTAL_ASHEN.x+.2,_ag+5.2,PORTAL_ASHEN.z); aMouth.rotation.y=Math.PI/2; sceneWorld.add(aMouth);
const westPassLabel=makeLabel(T("zone.ashen_canyon"),12,"#ffb080","rgba(100,40,15,.9)");
westPassLabel.position.set(PORTAL_ASHEN.x,_ag+13.4,PORTAL_ASHEN.z); sceneWorld.add(westPassLabel);
const westPassLabel2=makeLabel(`山口通道 · Lv.${(BAL.ashenCanyon&&BAL.ashenCanyon.minLevel)||6}+`,7,"#e09060","rgba(80,30,10,.9)");
westPassLabel2.position.set(PORTAL_ASHEN.x,_ag+12,PORTAL_ASHEN.z); sceneWorld.add(westPassLabel2);

/* STEP 23：营地制作台 + 赤蹄草甸采集点（在传送门坐标定义之后） */
if(typeof buildWorkbench==="function")buildWorkbench(sceneWorld);
if(typeof spawnGatherNodesForZone==="function"){
  spawnGatherNodesForZone("mulgore",sceneWorld,{
    radius:WORLD_R,
    camp:BLOODHOOF,
    portals:[{x:PORTAL_BARRENS.x,z:PORTAL_BARRENS.z},{x:PORTAL_ASHEN.x,z:PORTAL_ASHEN.z}],
  });
}

/* ---------------- 萤火虫粒子（STEP 7 / R4 昼夜）：夜晚浮现，白天透明 ---------------- */
FIREFLIES=(BAL.sky&&BAL.sky.fireflies)||100;
const fireflyGeo=new THREE.BufferGeometry();
const ffPos=new Float32Array(FIREFLIES*3);
ffPhases=new Float32Array(FIREFLIES);
for(let i=0;i<FIREFLIES;i++){
  const a=srand(0,6.28),r=srand(5,WORLD_R-8);
  ffPos[i*3]=Math.cos(a)*r; ffPos[i*3+1]=_gy(Math.cos(a)*r,Math.sin(a)*r)+srand(1,4); ffPos[i*3+2]=Math.sin(a)*r;
  ffPhases[i]=srand(0,6.28);
}
fireflyGeo.setAttribute("position",new THREE.BufferAttribute(ffPos,3));
fireflies=new THREE.Points(fireflyGeo,new THREE.PointsMaterial({
  color:0xd0ffa0,size:.35,transparent:true,opacity:0,
  blending:THREE.AdditiveBlending,depthWrite:false}));
sceneWorld.add(fireflies);

/* 玩家移入赤蹄草甸出生点（营地旁），当前场景切换为外部世界 */
sceneRaid.remove(player); sceneWorld.add(player);
player.position.set(CAMP_NARACHE.x,_gy(CAMP_NARACHE.x,CAMP_NARACHE.z),CAMP_NARACHE.z);
scene=sceneWorld;
camera.position.set(CAMP_NARACHE.x,14+_gy(CAMP_NARACHE.x,CAMP_NARACHE.z),CAMP_NARACHE.z+22);

/* ---------------- 进入 / 离开副本（薄包装 → enterZone，STEP 17） ---------------- */
function fadeTo(op,cb){
  const f=$("#fade");
  f.style.opacity=op;
  if(cb)setTimeout(cb,BAL.zones&&BAL.zones.fadeMs!=null?BAL.zones.fadeMs:650);
}
function enterRaid(){
  if(S.mode!=="world"||!S.p.alive)return;
  announce("正在进入 · "+T("zone.molten_core"));
  enterZone("molten_core","entrance");
}
function leaveRaid(){
  if(S.mode!=="raid")return;
  S.difficulty="normal";
  const D=typeof getDungeon==="function"?getDungeon():null;
  const hub=(D&&D.exitZone)||"blackrock";
  const gate=(D&&D.exitGate)||"from_raid";
  enterZone(hub,gate);
}

/* 注册赤蹄草甸（场景已在模块顶层 build-once） */
registerZone({
  id:"mulgore",
  name:T("zone.mulgore"),
  scene:sceneWorld,
  build:null,
  _built:true,
  music:"world",
  mode:"world",
  levelRange:[1,10],
  boundsR:()=>WORLD_R,
  dayNight:true,
  gates:{
    camp:CAMP_NARACHE,
    from_raid:BLOODHOOF, /* 旧存档兼容：曾从熔火回血蹄 */
    from_barrens:{x:0,z:WORLD_R-22},   /* 远离南口传送门，避免进出乒乓 */
    from_ashen:{x:-(WORLD_R-22),z:0}, /* 西侧山口回落点 */
    spirit:{x:BLOODHOOF.x,z:BLOODHOOF.z+22},
    bloodhoof:BLOODHOOF,
    thunder_bluff:MULGORE.thunderBluff,
    default:CAMP_NARACHE,
  },
  portals:[{
    id:"to_barrens",
    pos:()=>PORTAL_BARRENS,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:T("zone.barrens")+" · "+T("poi.crossroads"),
    logHint:"南行土路通往干燥荒原……靠近传送门即可前往"+T("zone.barrens")+"。",
    requireAlive:true,
    autoEnter:true,
    minLevel:()=>BAL.barrens.minLevel,
    lockedAnnounce:()=>`等级不足！需要 Lv.${BAL.barrens.minLevel}`,
    lockedLog:()=>`${T("zone.barrens")} · ${T("poi.crossroads")}需要更强的勇士——当前 Lv.${S.p.level}，升到 Lv.${BAL.barrens.minLevel} 后再来。`,
    targetZone:"barrens",
    targetGate:"from_mulgore",
  },{
    id:"to_ashen_canyon",
    pos:()=>PORTAL_ASHEN,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>(BAL.zones.portalEnterR||4.5)+1.2,
    announce:T("zone.ashen_canyon")+" · 山口通道",
    logHint:"西侧山口焦土味扑鼻……走进石门即可进入"+T("zone.ashen_canyon")+"。",
    requireAlive:true,
    autoEnter:true,
    minLevel:()=>(BAL.ashenCanyon&&BAL.ashenCanyon.minLevel)||6,
    lockedAnnounce:()=>`等级不足！需要 Lv.${(BAL.ashenCanyon&&BAL.ashenCanyon.minLevel)||6}`,
    lockedLog:()=>`${T("zone.ashen_canyon")}危机四伏——当前 Lv.${S.p.level}，升到 Lv.${(BAL.ashenCanyon&&BAL.ashenCanyon.minLevel)||6} 后再穿越山口。`,
    targetZone:"ashen_canyon",
    targetGate:"from_mulgore",
  }],
  lights:{heli,sun,flames:worldFlames,fireflies,fill:_mulgoreSkyInit&&_mulgoreSkyInit.fill},
  onEnter(fromId,gateId,opts){
    if(opts&&opts.silent)return;
    if(fromId==="barrens"){
      log("你回到圣山草原，"+T("race.tauren")+"营地的炊烟在远处升起。","lg-sys");
    }else if(fromId==="ashen_canyon"){
      log("山口风息渐缓——你重回"+T("zone.mulgore")+"。","lg-sys");
    }
    if(typeof updateQuest==="function")updateQuest();
  },
  onLeave(){},
});

/* ---------------- 出口传送门（击杀 Boss 后出现在副本入口） ---------------- */
const EXIT_PORTAL_POS=new THREE.Vector3(0,0,15);
function spawnExitPortal(){
  if(exitPortal)return;
  const grp=new THREE.Group();
  /* 底座 */
  const base=new THREE.Mesh(new THREE.CylinderGeometry(3.5,4.5,.8,12),
    MAT.get("obsidian.gate",{emissive:0x4a1a00,emissiveIntensity:.3}));
  base.position.y=.4; grp.add(base);
  /* 门柱 */
  const pillarMat=MAT.get("obsidian.pillar");
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
const QUEST={state:0,kills:0};   /* 0未接 1猎杀野猪 2讨伐卡尔戈 3完成 */

/* NPC 头顶标记 / F 键对话注册表 */
const _npcLy=(BAL.npc&&BAL.npc.labelY)||4.05, _npcMy=(BAL.npc&&BAL.npc.markerY)||5.15, _npcLw=(BAL.npc&&BAL.npc.labelW)||6.2;
const _mulgoreNpcMarkers=[];
const _mulgoreInteractNpcs=[];
function registerNpcInteract(mesh,open){
  if(!mesh||typeof open!=="function")return;
  /* 避免同 mesh 重复注册 */
  for(const e of _mulgoreInteractNpcs){if(e.mesh===mesh){e.open=open;return;}}
  _mulgoreInteractNpcs.push({mesh,open});
}
function _placeFriendlyNpc(mesh,x,z,rotY,name,level,color){
  const gy=_gy(x,z);
  mesh.position.set(x,gy,z);
  if(rotY!=null)mesh.rotation.y=rotY;
  sceneWorld.add(mesh);
  const lab=makeNameplate(name,level,{w:_npcLw+(name.length>8?.4:0),friendly:true,color:color||"#ffd9a0"});
  lab.position.set(x,gy+_npcLy,z); sceneWorld.add(lab);
  updateNameplateHp(lab,1,1);
  return lab;
}
function registerNpcQuestMarker(npcId,x,z){
  const gy=_gy(x,z);
  const excl=makeQuestMark("offer");
  excl.position.set(x,gy+_npcMy,z); excl.visible=false; sceneWorld.add(excl);
  const exclGrey=makeQuestMark("low");
  exclGrey.position.copy(excl.position); exclGrey.visible=false; sceneWorld.add(exclGrey);
  const q=makeQuestMark("turnin");
  q.position.copy(excl.position); q.visible=false; sceneWorld.add(q);
  _mulgoreNpcMarkers.push({npcId,excl,exclGrey,q,x,z,baseY:gy+_npcMy});
  return {excl,exclGrey,q};
}
/** 放置友好 NPC：姓名板 + 任务感叹号 + F 对话（缺一不可） */
function placeTalkNpc(mesh,x,z,rotY,name,level,color,npcId,openFn){
  _placeFriendlyNpc(mesh,x,z,rotY,name,level,color);
  if(npcId)registerNpcQuestMarker(npcId,x,z);
  if(openFn)registerNpcInteract(mesh,openFn);
  return mesh;
}
function _npcAt(wx,wy,dx,dz){
  const p=mulgoreWow(wx,wy);
  return {x:p.x+(dx||0), z:p.z+(dz||0)};
}

/* —— 岩蹄营地 44,92 —— */
const _pHawk=_npcAt(44,92);
const hawkwind=tintNpcCloth(buildElder(),0x8a6040);
placeTalkNpc(hawkwind,_pHawk.x,_pHawk.z,Math.PI*.2,"酋长 · 鹰风",BAL.npcLevel.hawkwind,"#e8c080","hawkwind",
  ()=>openHawkwindDialogue());

const _pGrull=_npcAt(44,90);
const grull=tintNpcCloth(buildElder(),0x6a5040);
placeTalkNpc(grull,_pGrull.x,_pGrull.z,Math.PI*1.1,"格鲁尔 · 鹰风",BAL.npcLevel.grull,"#d8b090","grull",
  ()=>openGrullDialogue());

const _pGray=_npcAt(45,91);
const grayhorn=tintNpcCloth(buildElder(),0x7a7060);
placeTalkNpc(grayhorn,_pGray.x,_pGray.z,Math.PI*.6,"长者 · 灰角",BAL.npcLevel.grayhorn,"#d0c8a8","grayhorn",
  ()=>openNpcQuestDialogue("grayhorn","🌿 长者 · 灰角","大地母亲护佑着"+T("poi.camp_narache")+"。"));

const _pRaoul=_npcAt(43,93);
const raoul=tintNpcCloth(buildElder(),0x6a5838);
placeTalkNpc(raoul,_pRaoul.x,_pRaoul.z,Math.PI*1.4,"拉乌尔 · 猎蹄",BAL.npcLevel.raoul,"#c8b080","raoul",
  ()=>openNpcQuestDialogue("raoul","📦 拉乌尔 · 猎蹄",T("poi.bloodhoof")+"需要补给。"));

/* —— 红云台地 39,82 —— */
const _pVera=_npcAt(38,83);
const vera=tintNpcCloth(buildElder(),0x8a6850);
placeTalkNpc(vera,_pVera.x,_pVera.z,Math.PI*.3,"维拉 · 猎蹄",BAL.npcLevel.vera,"#e0b898","vera",
  ()=>openNpcQuestDialogue("vera","💎 维拉 · 猎蹄","我的项链丢在台地边缘了……"));

const _pWhite=_npcAt(40,81);
const whiterock=tintNpcCloth(buildElder(),0x9a9888);
placeTalkNpc(whiterock,_pWhite.x,_pWhite.z,Math.PI*.9,"长者 · 白岩",BAL.npcLevel.whiterock,"#e8e0d0","whiterock",
  ()=>openNpcQuestDialogue("whiterock","🪨 长者 · 白岩","灵魂碎片能安抚先祖。"));

/* —— 赤蹄村 47,59 —— */
const _pBaine=_npcAt(47,59);
const baine=buildElder();
placeTalkNpc(baine,_pBaine.x,_pBaine.z,Math.PI*.85,T("npc.baine"),BAL.npcLevel.baine,null,"baine",
  ()=>openDialogue());
const _baineMk=_mulgoreNpcMarkers[_mulgoreNpcMarkers.length-1];
const elder=baine;
const markerExcl=_baineMk?_baineMk.excl:null, markerQ=_baineMk?_baineMk.q:null;

const _pElder=_npcAt(47,58);
const bloodhoofElder=tintNpcCloth(buildElder(),0x5a4a38);
placeTalkNpc(bloodhoofElder,_pElder.x,_pElder.z,Math.PI*.5,T("npc.bloodhoof_elder"),BAL.npcLevel.bloodhoof_elder,"#c8b090","bloodhoof_elder",
  ()=>openNpcQuestDialogue("bloodhoof_elder","🐂 "+T("npc.bloodhoof_elder"),"土地之灵在呼唤。"));

const _pTark=_npcAt(48,60);
const tark=tintNpcCloth(buildElder(),0x5a6a38);
placeTalkNpc(tark,_pTark.x,_pTark.z,Math.PI*1.05,"塔克 · 风蹄",BAL.npcLevel.tark,"#d0e8a0","tark",
  ()=>openNpcQuestDialogue("tark","🦁 塔克 · 风蹄","平原上的猎物很凶猛。"));

const _pMull=_npcAt(46,60);
const mull=tintNpcCloth(buildElder(),0x4a6a88);
placeTalkNpc(mull,_pMull.x,_pMull.z,Math.PI*.4,"穆尔 · 雷角",BAL.npcLevel.mull,"#a8c8e8","mull",
  ()=>openNpcQuestDialogue("mull","💧 穆尔 · 雷角","水井被污染了。"));

const _pHaru=_npcAt(47,61);
const haru=tintNpcCloth(buildElder(),0x6a7048);
placeTalkNpc(haru,_pHaru.x,_pHaru.z,Math.PI*1.2,"哈鲁 · 鹰眼",BAL.npcLevel.haru,"#d0e8a0","haru",
  ()=>openNpcQuestDialogue("haru","🦅 哈鲁 · 鹰眼","狼与雷鹰都是好猎物。"));
const hunter=haru;

const _pMara=_npcAt(48,59);
const mara=tintNpcCloth(buildElder(),0x7a5a48);
placeTalkNpc(mara,_pMara.x,_pMara.z,Math.PI*.7,"玛拉 · 雷蹄",BAL.npcLevel.mara,"#e0c0a0","mara",
  ()=>openNpcQuestDialogue("mara","✉️ 玛拉 · 雷蹄",T("poi.thunder_bluff")+"需要这封信。"));

const _pKur=_npcAt(46,58);
const kur=tintNpcCloth(buildElder(),0x6a6050);
placeTalkNpc(kur,_pKur.x,_pKur.z,Math.PI*1.5,"库尔 · 石蹄",BAL.npcLevel.kur,"#c0b8a0","kur",
  ()=>openNpcQuestDialogue("kur","🧪 库尔 · 石蹄",T("mob.quilboar")+"的毒腺有大用。"));

const _pAska=_npcAt(47,60,10,8);
const aska=tintNpcCloth(buildElder(),0x4a5868);
placeTalkNpc(aska,_pAska.x,_pAska.z,Math.PI*.2,"阿斯卡 · 迷雾行者",BAL.npcLevel.aska,"#b0c8d8","aska",
  ()=>openNpcQuestDialogue("aska","🌫️ 阿斯卡 · 迷雾行者",T("poi.freewind")+"笼罩着迷雾。"));

const vendor=buildVendor();
placeTalkNpc(vendor,_pBaine.x-22,_pBaine.z-6,Math.PI*1.15,"杂货商 · 瓦尔格",BAL.npcLevel.varg,"#a8e8c0","varg",
  ()=>openVendor("varg","🛒 杂货商 · 瓦尔格"));
const varg=vendor;
/* STEP 18：武器匠（白装） */
const weaponsmith=tintNpcCloth(buildVendor(),0x6a5040);
placeTalkNpc(weaponsmith,_pBaine.x-16,_pBaine.z-12,Math.PI*1.05,"武器匠 · 石刃",BAL.npcLevel.weaponsmith,"#e8c898","weaponsmith",
  ()=>openVendor("weaponsmith","⚔️ 武器匠 · 石刃"));

/* —— 雷岩台 45,25 —— */
const _pCairne=_npcAt(45,25);
const cairne=tintNpcCloth(buildElder(),0x9a7040);
placeTalkNpc(cairne,_pCairne.x,_pCairne.z,Math.PI,T("npc.cairne"),BAL.npcLevel.cairne,"#ffd9a0","cairne",
  ()=>openNpcQuestDialogue("cairne","👑 "+T("npc.cairne"),T("zone.mulgore")+"的危机尚未平息。"));

const _pStone=_npcAt(44,26);
const stonetalon=tintNpcCloth(buildElder(),0x7a7870);
placeTalkNpc(stonetalon,_pStone.x,_pStone.z,Math.PI*.4,"长者 · 石塔",BAL.npcLevel.stonetalon,"#d8d0c0","stonetalon",
  ()=>openNpcQuestDialogue("stonetalon","🗻 长者 · 石塔","灵魂高地需要仪式。"));

const _pSeen=_npcAt(46,26);
const seen=tintNpcCloth(buildElder(),0x5a5848);
placeTalkNpc(seen,_pSeen.x,_pSeen.z,Math.PI*1.1,"塞恩 · 石蹄",BAL.npcLevel.seen,"#c8c0a0","seen",
  ()=>openNpcQuestDialogue("seen","⛏️ 塞恩 · 石蹄","巴尔丹矮人必须滚出圣山。"));

const _pPala=_npcAt(45,27);
const pala=tintNpcCloth(buildElder(),0x4a7088);
placeTalkNpc(pala,_pPala.x,_pPala.z,Math.PI*.8,"帕拉 · 逐风",BAL.npcLevel.pala,"#a8d0e8","pala",
  ()=>openNpcQuestDialogue("pala","💨 帕拉 · 逐风","风之元素与鹰身人羽毛……"));

const _pHamya=_npcAt(44,25);
const hamya=tintNpcCloth(buildElder(),0x8a6030);
placeTalkNpc(hamya,_pHamya.x,_pHamya.z,Math.PI*1.3,"哈米亚 · 逐日",BAL.npcLevel.hamya,"#e8c080","hamya",
  ()=>openNpcQuestDialogue("hamya","☀️ 哈米亚 · 逐日","黄金平原藏着太阳之眼。"));

const _pMag=_npcAt(45,25,-14,10);
const magatha=tintNpcCloth(buildElder(),0x3a5040);
placeTalkNpc(magatha,_pMag.x,_pMag.z,Math.PI*.6,"玛加萨 · 野性图腾",BAL.npcLevel.magatha,"#90c090","magatha",
  ()=>openNpcQuestDialogue("magatha","🐍 玛加萨 · 野性图腾","野性图腾注视着"+T("zone.barrens")+"。"));

const _pRune=_npcAt(45,25,12,-8);
const runetotem=tintNpcCloth(buildElder(),0x5a4860);
placeTalkNpc(runetotem,_pRune.x,_pRune.z,Math.PI*1.6,"长者 · 符文图腾",BAL.npcLevel.runetotem,"#c0a0d0","runetotem",
  ()=>openNpcQuestDialogue("runetotem","📜 长者 · 符文图腾","草药样本能揭示智慧。"));

/* —— 水井 / 风啸岗守卫 —— */
const _pThG=_npcAt(46,46);
const thunderhornGuard=tintNpcCloth(buildElder(),0x4a6888);
placeTalkNpc(thunderhornGuard,_pThG.x,_pThG.z,Math.PI,"雷角水井守卫",BAL.npcLevel.thunderhorn_guard,"#a8c8ff","thunderhorn_guard",
  ()=>openNpcQuestDialogue("thunderhorn_guard","🛡️ 雷角水井守卫","水井被元素污染了。"));

const _pWiG=_npcAt(55,66);
const winterhoofGuard=tintNpcCloth(buildElder(),0x5a7080);
placeTalkNpc(winterhoofGuard,_pWiG.x,_pWiG.z,Math.PI,"冬蹄守卫",BAL.npcLevel.winterhoof_guard,"#a0c0d8","winterhoof_guard",
  ()=>openNpcQuestDialogue("winterhoof_guard","🛡️ 冬蹄守卫",T("mob.quilboar")+"侵扰了冬蹄水井。"));

const _pWfS=_npcAt(52,14);
const windfurySentinel=tintNpcCloth(buildElder(),0x6a5080);
placeTalkNpc(windfurySentinel,_pWfS.x,_pWfS.z,Math.PI*.5,T("poi.freewind")+"哨兵",BAL.npcLevel.windfury_sentinel,"#d0b0e8","windfury_sentinel",
  ()=>openNpcQuestDialogue("windfury_sentinel","🗡️ "+T("poi.freewind")+"哨兵","鹰身人盘踞山脊。"));

function setMarker(){
  for(const m of _mulgoreNpcMarkers){
    if(typeof applyNpcQuestMarkerVisual==="function")applyNpcQuestMarkerVisual(m);
    else if(typeof npcHasQuestOffer==="function"){
      m.excl.visible=npcHasQuestOffer(m.npcId);
      m.q.visible=npcHasQuestTurnIn(m.npcId);
    }else{
      m.excl.visible=false; m.q.visible=false;
    }
  }
}
function updateNpcQuestMarkers(){
  setMarker();
  if(typeof updateBarrensMarkers==="function")updateBarrensMarkers();
  if(typeof updateDurotarMarkers==="function")updateDurotarMarkers();
  if(typeof updateAshenMarkers==="function")updateAshenMarkers();
  if(typeof updateOrgrimmarMarkers==="function")updateOrgrimmarMarkers();
  if(typeof updateBlackrockMarkers==="function")updateBlackrockMarkers();
}
/* 灵魂医者（STEP 15） */
const spiritHealer=buildSpiritHealer();
spiritHealer.position.set(_pBaine.x,_gy(_pBaine.x,_pBaine.z+24),_pBaine.z+24); spiritHealer.rotation.y=Math.PI; sceneWorld.add(spiritHealer);
const spiritLabel=makeNameplate("灵魂医者 · 风语",BAL.npcLevel.spirit,{w:_npcLw+.2,friendly:true,color:"#a8d8ff",glow:"rgba(40,80,120,.9)"});
spiritLabel.position.set(_pBaine.x,_gy(_pBaine.x,_pBaine.z+24)+_npcLy,_pBaine.z+24); sceneWorld.add(spiritLabel);
updateNameplateHp(spiritLabel,1,1);
registerNpcInteract(spiritHealer,()=>openSpiritDialogue());
function spiritDist(){return Math.hypot(player.position.x-spiritHealer.position.x,player.position.z-spiritHealer.position.z);}

/* STEP 17：营地墓地（医者旁）；北界不再设熔火门口墓地 */
(function placeMulgoreGraveyards(){
  const sx=spiritHealer.position.x-3.5, sz=spiritHealer.position.z+2.5;
  placeProp(sceneWorld,buildGraveyard(),sx,sz,Math.PI*.2);
  registerGraveyard("mulgore",sx,sz,"camp");
  if(BAL.death&&BAL.death.spawns)BAL.death.spawns.mulgore={x:sx,z:sz};
  if(BAL.death)BAL.death.worldSpawn={x:sx,z:sz};
})();

/* ---------------- 赤蹄村 + 岩蹄 + 雷岩台建筑（V3；A 线等 GLB 就绪） ---------------- */
function placeMulgoreCampBuildings(){
  if(placeMulgoreCampBuildings._done)return;
  placeMulgoreCampBuildings._done=true;
  const P=BUILD_PAL.mulgore;
  const B=BLOODHOOF, N=CAMP_NARACHE, T=MULGORE.thunderBluff;
  /* ===== 赤蹄村（主城，约 18 栋建筑 + 装饰） ===== */
  /* 村口大门 */
  placeProp(sceneWorld,buildVillageGate({wood:P.wood,woodD:P.woodD,roof:P.roof}),B.x+8,B.z-32,.3);
  placeProp(sceneWorld,buildVillageGate({wood:P.wood,woodD:P.woodD,roof:P.roof}),B.x-8,B.z-32,-.3);
  /* 主街两侧木屋 */
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),B.x+22,B.z-16,.35);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),B.x-28,B.z-14,-.55);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:0x7a4a28,size:1}),B.x+16,B.z+14,Math.PI*.95);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),B.x-12,B.z+18,-.4);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:0x8a5a30,size:1}),B.x+32,B.z,-Math.PI*.4);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),B.x+38,B.z+12,.2);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:0x7a4a28,size:1}),B.x-36,B.z+6,-.3);
  /* 长屋（大会堂） */
  placeProp(sceneWorld,buildLonghouse({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),B.x+4,B.z-8,0);
  /* 大帐篷 */
  placeProp(sceneWorld,buildTent({hide:P.hide,stake:P.stake,size:1}),B.x-6,B.z-20,.2);
  placeProp(sceneWorld,buildTent({hide:0xb89060,stake:P.stake,size:1}),B.x+24,B.z+8,-.7);
  placeProp(sceneWorld,buildTent({hide:P.hide,stake:P.stake,size:1}),B.x-30,B.z-20,.5);
  /* 瞭望塔 × 3 */
  placeProp(sceneWorld,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1}),B.x-34,B.z+10,.25);
  placeProp(sceneWorld,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1}),B.x+30,B.z-18,-.3);
  placeProp(sceneWorld,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1}),B.x+4,B.z+28,.1);
  /* 市集 × 2 */
  placeProp(sceneWorld,buildMarketStall({wood:P.wood,woodD:P.woodD,cloth:0x2a6a4a,size:1}),B.x-20,B.z-8,Math.PI*.15);
  placeProp(sceneWorld,buildMarketStall({wood:P.wood,woodD:P.woodD,cloth:0x3a6a9a,size:1}),B.x+24,B.z-6,-.2);
  /* 货箱 × 2 */
  placeProp(sceneWorld,buildCratePile({wood:P.wood,woodD:P.woodD,size:1}),B.x-16,B.z+2,.4);
  placeProp(sceneWorld,buildCratePile({wood:P.wood,woodD:P.woodD,size:1}),B.x+28,B.z+10,-.3);
  /* 图腾 × 2 */
  placeProp(sceneWorld,buildTotem({wood:P.woodD,paintA:0xd94f2a,paintB:0x3a7ac9,size:1}),B.x-8,B.z+14,0);
  placeProp(sceneWorld,buildTotem({wood:P.woodD,paintA:0x3a7ac9,paintB:0xd94f2a,size:1}),B.x+14,B.z-24,0);
  /* 水井 */
  placeProp(sceneWorld,buildWell({stone:0x6a5a50,wood:P.woodD,size:1}),B.x-4,B.z+4,0);
  /* 草垛 × 2 */
  placeProp(sceneWorld,buildHaystack({color:0xd8b060,size:1}),B.x-18,B.z-18,0);
  placeProp(sceneWorld,buildHaystack({color:0xd0a850,size:1}),B.x+18,B.z-22,0);
  /* 训练假人 */
  placeProp(sceneWorld,buildTrainingDummy({wood:0x4a3020,size:1}),B.x-14,B.z+22,0);
  placeProp(sceneWorld,buildTrainingDummy({wood:0x4a3020,size:1}),B.x+10,B.z-26,0);
  /* 灯笼杆 × 3（沿主街） */
  placeProp(sceneWorld,buildLanternPole({wood:0x4a3020,size:1}),B.x+2,B.z-28,0);
  placeProp(sceneWorld,buildLanternPole({wood:0x4a3020,size:1}),B.x-16,B.z-24,0);
  placeProp(sceneWorld,buildLanternPole({wood:0x4a3020,size:1}),B.x+20,B.z-20,0);
  /* 围栏 */
  placeProp(sceneWorld,buildFence({wood:P.wood,woodD:P.woodD,length:22,posts:10}),B.x-4,B.z-24,0);
  placeProp(sceneWorld,buildFence({wood:P.wood,woodD:P.woodD,length:20,posts:9}),B.x+36,B.z,Math.PI/2);
  placeProp(sceneWorld,buildFence({wood:P.wood,woodD:P.woodD,length:16,posts:7}),B.x-38,B.z+16,Math.PI/2);
  /* 营火 × 2 */
  const cf=placeProp(sceneWorld,buildCampfire({flame:0xffa030,light:0xff8a30,size:1}),B.x+4,B.z,0);
  if(cf&&cf.userData.flame)worldFlames.push(cf.userData.flame);
  const cf2=placeProp(sceneWorld,buildCampfire({flame:0xffa030,light:0xff8a30,size:1}),B.x-24,B.z+8,0);
  if(cf2&&cf2.userData.flame)worldFlames.push(cf2.userData.flame);
  /* 路牌 */
  placeProp(sceneWorld,buildSignpost({wood:0x4a3020,size:1}),B.x,B.z-30,0);

  /* ===== 岩蹄营地（出生地，约 8 栋） ===== */
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),N.x+8,N.z-10,.2);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),N.x-10,N.z+6,-.5);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),N.x-14,N.z-8,.6);
  placeProp(sceneWorld,buildTent({hide:P.hide,stake:P.stake,size:1}),N.x+2,N.z+12,.3);
  placeProp(sceneWorld,buildTent({hide:0xb89060,stake:P.stake,size:1}),N.x+12,N.z-6,-.2);
  placeProp(sceneWorld,buildTotem({wood:P.woodD,paintA:0xd94f2a,paintB:0x3a7ac9,size:1}),N.x-4,N.z-4,0);
  placeProp(sceneWorld,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1}),N.x-16,N.z,-.2);
  placeProp(sceneWorld,buildWell({stone:0x6a5a50,wood:P.woodD,size:1}),N.x-2,N.z+4,0);
  placeProp(sceneWorld,buildHaystack({color:0xd8b060,size:1}),N.x+6,N.z-12,0);
  const ncf=placeProp(sceneWorld,buildCampfire({flame:0xff9030,light:0xff7a20,size:1}),N.x+2,N.z-2,0);
  if(ncf&&ncf.userData.flame)worldFlames.push(ncf.userData.flame);

  /* ===== 雷岩台（高阶区，约 10 栋 + 磨坊） ===== */
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:0x8a4a28,size:1}),T.x+10,T.z-8,.2);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),T.x-14,T.z-6,-.4);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:0x7a4a28,size:1}),T.x+6,T.z+12,Math.PI*.8);
  placeProp(sceneWorld,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),T.x-20,T.z+4,.5);
  placeProp(sceneWorld,buildLonghouse({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),T.x+2,T.z-6,0);
  placeProp(sceneWorld,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1}),T.x,T.z,.1);
  placeProp(sceneWorld,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1}),T.x-20,T.z+8,.5);
  placeProp(sceneWorld,buildTotem({wood:P.woodD,paintA:0x3a7ac9,paintB:0xd94f2a,size:1}),T.x+4,T.z-14,0);
  placeProp(sceneWorld,buildTotem({wood:P.woodD,paintA:0xd94f2a,paintB:0x3a7ac9,size:1}),T.x-8,T.z+10,.3);
  placeProp(sceneWorld,buildMarketStall({wood:P.wood,woodD:P.woodD,cloth:0x3a6a9a,size:1}),T.x-6,T.z,.4);
  placeProp(sceneWorld,buildWell({stone:0x6a5a50,wood:P.woodD,size:1}),T.x+2,T.z+8,0);
  placeProp(sceneWorld,buildWindmill({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),T.x-12,T.z-14,0);
  placeProp(sceneWorld,buildFence({wood:P.wood,woodD:P.woodD,length:24,posts:11}),T.x-24,T.z,Math.PI/2);
  placeProp(sceneWorld,buildFence({wood:P.wood,woodD:P.woodD,length:20,posts:9}),T.x+4,T.z-22,0);
  const tcf=placeProp(sceneWorld,buildCampfire({flame:0xffa030,light:0xff8a30,size:1}),T.x+2,T.z+4,0);
  if(tcf&&tcf.userData.flame)worldFlames.push(tcf.userData.flame);
}
if(typeof ASSETS!=="undefined"&&!ASSETS.isReady()){
  ASSETS.whenReady(placeMulgoreCampBuildings);
}else if(typeof ASSETS!=="undefined"&&ASSETS.isReady()){
  placeMulgoreCampBuildings();
}else{
  console.warn("[world] ASSETS 缺失，跳过营地建筑");
}

/* ============================================================
   野怪类型表（STEP 5）：模型配方 + 数值 + 掉落表 + 名字标签
   加新怪 = 这里加一条 + BALANCE.mobs 加一条 + 一行 spawnMob
   ============================================================ */
const MOB_TYPES={
  bird       :{name:"草原漫步者",  build:()=>buildQuadruped(QUADS.bird),         stats:"bird",        loot:"bird",        labelW:4.2,labelY:3.4},
  youngBoar  :{name:"小野猪",      build:()=>buildQuadruped(QUADS.youngBoar),     stats:"youngBoar",    loot:"youngBoar",    labelW:4.0,labelY:2.4},
  bristleback:{name:T("mob.bristleback"),  build:()=>buildQuadruped(QUADS.bristleback),  stats:"bristleback", loot:"bristleback", labelW:5.0,labelY:2.8},
  wolf       :{name:"草原狼",      build:()=>buildQuadruped(QUADS.wolf),         stats:"wolf",        loot:"wolf",        labelW:4.2,labelY:2.7},
  plainslion :{name:"平原狮",      build:()=>buildQuadruped(QUADS.plainslion),   stats:"plainslion",  loot:"plainslion",  labelW:4.8,labelY:2.9},
  boar       :{name:"草原野猪",    build:()=>buildQuadruped(QUADS.boar),         stats:"boar",        loot:"boar",        labelW:4.6,labelY:2.7},
  thunderhawk:{name:"雷鹰",        build:()=>buildQuadruped(QUADS.thunderhawk),  stats:"thunderhawk", loot:"thunderhawk", labelW:4.6,labelY:3.6},
  kodo       :{name:"科多兽",      build:()=>buildQuadruped(QUADS.kodo),         stats:"kodo",        loot:"kodo",        labelW:6.5,labelY:4.2},
  palemane   :{name:"苍鬃豺狼人",  build:()=>buildQuadruped(QUADS.palemane),     stats:"palemane",    loot:"palemane",    labelW:5.0,labelY:2.9},
  windElement:{name:"风元素",      build:()=>buildElemental(ELEMENTALS.wind), stats:"windElement", loot:"windElement", labelW:4.2,labelY:3.0},
  waterElement:{name:"水元素",     build:()=>buildElemental(ELEMENTALS.water), stats:"waterElement", loot:"waterElement", labelW:4.4,labelY:3.1},
  oasisWater :{name:"污染水元素", build:()=>buildElemental(ELEMENTALS.oasis), stats:"oasisWater", loot:"waterElement", labelW:5.0,labelY:3.3},
  earthElement:{name:"土元素",     build:()=>buildElemental(ELEMENTALS.earth), stats:"earthElement", loot:"earthElement", labelW:4.4,labelY:3.1},
  baeldun    :{name:"巴尔丹火枪手",build:()=>buildMeleeHumanoid(MELEE_HUMANOIDS.baeldun), stats:"baeldun", loot:"baeldun", labelW:5.8,labelY:3.2},
  baeldunDigger:{name:"巴尔丹挖掘工",build:()=>buildMeleeHumanoid(MELEE_HUMANOIDS.baeldunDigger),stats:"baeldunDigger",loot:"baeldunDigger",labelW:5.6,labelY:3.1},
  venture    :{name:"风险投资公司工人",build:()=>buildMeleeHumanoid(MELEE_HUMANOIDS.venture),stats:"venture",loot:"venture",labelW:6.2,labelY:3.0},
  ventureBoss:{name:"风险投资公司监工",build:()=>buildMeleeHumanoid(MELEE_HUMANOIDS.ventureBoss),stats:"ventureBoss",loot:"ventureBoss",labelW:6.8,labelY:3.3},
  windfury   :{name:T("poi.freewind")+"鹰身人",build:()=>buildHumanoidMob(MOB_HUMANOIDS.windfury),stats:"windfury",loot:"windfury",labelW:5.8,labelY:4.2},
  oasisHarpy:{name:"绿洲鹰身人",build:()=>buildHumanoidMob(MOB_HUMANOIDS.windfury),stats:"oasisHarpy",loot:"windfury",labelW:5.6,labelY:4.0},
  barrensLion:{name:"草原狮",build:()=>buildQuadruped(QUADS.plainslion),stats:"barrensLion",loot:"plainslion",labelW:4.8,labelY:2.9},
  barrensBristle:{name:T("mob.bristleback"),build:()=>buildQuadruped(QUADS.bristleback),stats:"barrensBristle",loot:"bristleback",labelW:5.0,labelY:2.8},
  quilboarElder:{name:T("mob.quilboarElder"),build:()=>buildQuadruped(QUADS.quilboar),stats:"quilboarElder",loot:"quilboar",labelW:6.2,labelY:3.4,elite:true,color:"#ffb070",auraColor:0xff9030},
  harpy   :{name:"鹰身女妖首领",build:()=>buildHumanoidMob(MOB_HUMANOIDS.harpy),stats:"harpy",loot:"harpy",labelW:8.5,labelY:5.6,elite:true,color:"#ff9ad0",auraColor:0xff66bb},
  boarKing:{name:"老灰鬃野猪王",build:()=>buildQuadruped(QUADS.boarKing),stats:"boarKing",loot:"boarKing",labelW:9,labelY:5.8,elite:true,rare:true,color:"#ffd700",auraColor:0xffd76a},
  ashmane :{name:"灰蹄野猪王",  build:()=>buildQuadruped(QUADS.boarKing),stats:"boarKing",loot:"boarKing",labelW:9,labelY:5.8,elite:true,rare:true,color:"#ffd700",auraColor:0xffd76a},
  quilboar:{name:T("mob.quilboar"),  build:()=>buildQuadruped(QUADS.quilboar),stats:"quilboar",loot:"quilboar",labelW:5.2,labelY:2.9},
  centaur :{name:"半人马战士",  build:()=>buildCentaur(MOB_HUMANOIDS.centaur),stats:"centaur",loot:"centaur",labelW:6.5,labelY:4.8},
  zebra   :{name:"平原斑马",    build:()=>buildQuadruped(QUADS.zebra),   stats:"zebra",   loot:"zebra",   labelW:4.6,labelY:2.8},
  raptor     :{name:"迅猛龙",      build:()=>buildQuadruped(QUADS.raptor),  stats:"raptor",  loot:"raptor",  labelW:5.2,labelY:3.4},
  crocolisk  :{name:"变异鳄鱼",    build:()=>buildQuadruped(QUADS.crocolisk),stats:"crocolisk",loot:"crocolisk",labelW:5.6,labelY:2.8},
  /* V1-B1 赭岩谷 */
  scorp     :{name:"赭岩巨蝎",    build:()=>buildQuadruped(QUADS.scorp),    stats:"scorp",    loot:"scorp",    labelW:5.0,labelY:2.6},
  razorback :{name:T("mob.razorback"),  build:()=>buildQuadruped(QUADS.razorback),stats:"razorback",loot:"razorback",labelW:5.8,labelY:3.2},
  cliffHarpy:{name:"崖风鹰身",    build:()=>buildHumanoidMob(MOB_HUMANOIDS.cliffHarpy),stats:"cliffHarpy",loot:"cliffHarpy",
    labelW:9,labelY:6.0,elite:true,color:"#ff9a70",auraColor:0xff7040},
  /* plan-v4 STEP 22 · 灰烬峡谷 */
  ashboar   :{name:T("mob.ashboar"),   build:()=>buildQuadruped(QUADS.ashboar),   stats:"ashboar",   loot:"ashboar",   labelW:4.8,labelY:2.7},
  cinderwolf:{name:T("mob.cinderwolf"),build:()=>buildQuadruped(QUADS.cinderwolf),stats:"cinderwolf",loot:"cinderwolf",labelW:4.6,labelY:2.8},
  slagimp   :{name:T("mob.slagimp"),   build:()=>buildElemental(ELEMENTALS.slag), stats:"slagimp",   loot:"slagimp",   labelW:4.4,labelY:3.0},
  scorchtusk:{name:T("mob.scorchtusk"),build:()=>buildQuadruped(QUADS.scorchtusk),stats:"scorchtusk",loot:"scorchtusk",
    labelW:9,labelY:5.8,elite:true,rare:true,color:"#ffd700",auraColor:0xff8030},
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
  const T=MOB_TYPES[type], baseSt=BAL.mobs[T.stats];
  const mesh=T.build();
  const gy=(zoneId==="mulgore"&&typeof heightAt==="function")?heightAt(x,z):0;
  mesh.position.set(x,gy,z);
  mesh.rotation.y=srand(0,6.28);
  let labelY=T.labelY;
  const isWB=!!(opts.worldBoss||T.worldBoss)&&!opts.minion;
  const isElite=!!(T.elite||opts.rare||isWB)&&!opts.minion;
  const isRare=!!(opts.rare||T.rare||isWB)&&!opts.minion;
  if(isElite){
    const mul=isWB?(BAL.elite.worldBossScaleMul||BAL.elite.scaleMul||1):(BAL.elite.scaleMul||1);
    mesh.scale.multiplyScalar(mul);
    labelY+=isWB?(BAL.elite.worldBossLabelYBonus||BAL.elite.labelYBonus||0):(BAL.elite.labelYBonus||0);
  }
  /* C11：精英运行时倍率（表内已手调的标 eliteBaked 跳过） */
  let st=baseSt;
  let hp=baseSt.hp, dmg=baseSt.dmg;
  if(isElite&&!baseSt.eliteBaked){
    const hm=(BAL.elite&&BAL.elite.hpMul!=null)?BAL.elite.hpMul:2.3;
    const dm=(BAL.elite&&BAL.elite.dmgMul!=null)?BAL.elite.dmgMul:1.5;
    hp=Math.max(1,Math.round(baseSt.hp*hm));
    dmg=Array.isArray(baseSt.dmg)
      ?[Math.max(1,Math.round(baseSt.dmg[0]*dm)),Math.max(1,Math.round(baseSt.dmg[1]*dm))]
      :baseSt.dmg;
    st=Object.assign({},baseSt,{hp,dmg});
  }
  const scn=(typeof ZONES!=="undefined"&&ZONES[zoneId]&&ZONES[zoneId].scene)||sceneWorld;
  scn.add(mesh);
  const dispName=opts.name||T.name;
  const nameColor=opts.color||T.color||(isWB||isRare?(BAL.rares&&BAL.rares.gold)||"#ffd700":"#ffd9a0");
  const mobLv=st.level!=null?st.level:1;
  const label=makeNameplate(dispName,mobLv,{w:T.labelW+(isWB?1.5:0),color:nameColor,glow:nameColor,elite:isElite});
  label.position.set(x,gy+labelY,z); scn.add(label);
  updateNameplateHp(label,hp,hp);
  /* C11：稀有/世界 Boss 长刷新；条目可覆盖 */
  let respawnBase=st.respawnT;
  if(opts.respawnT!=null)respawnBase=opts.respawnT;
  else if(isWB)respawnBase=(BAL.rares&&BAL.rares.worldBossRespawnT)!=null?BAL.rares.worldBossRespawnT:7200;
  else if(isRare)respawnBase=(BAL.rares&&BAL.rares.respawnT)!=null?BAL.rares.respawnT:3600;
  const id=(typeof allocEntityId==="function"?allocEntityId("mob"):("mob_"+(MOBS.length+1)));
  const armor=st.armor!=null?st.armor:(40+mobLv*12+(isElite?80:0));
  const m={id,type,name:dispName,level:mobLv,mesh,label,stats:st,loot:LOOT[T.loot],
    elite:isElite,
    rare:isRare,
    worldBoss:isWB,
    rareId:opts.rareId||null,
    group:group||null,labelY,zoneId,
    hp,hpMax:hp,state:"wander",home:{x,z},dest:null,wanderT:rand(0,3),
    atkT:0,rootT:0,slowT:0,slowMul:1,respawnT:0,respawnBase,corpseT:0,castCd:0,casting:null,moving:false,aura:null,
    attackAnim:0,
    armor,
    simStats:{level:mobLv,armor,elite:isElite},
    auras:[],
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
  /* plan-v4 STEP 14：表现侧通过 id 关联；扁平字段保持兼容 */
  m.view={id,mesh,label,labelY};
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

/* ---------------- 野怪放置（经典赤蹄草甸分区 · 确定性坐标） ---------------- */
(function spawnMulgorePacks(){
  const R=MULGORE.redCloud, B=BLOODHOOF, P=MULGORE.palemane, G=MULGORE.golden;
  const TH=MULGORE.thunderhorn, W=MULGORE.winterhoof, WF=MULGORE.windfury;
  const BD=MULGORE.baeldun, V=MULGORE.venture, L=REDROCK_LAKE, N=CAMP_NARACHE;
  /* 岩蹄 / 红云：漫步者 · 刺背 · 狼 · 风元素 */
  [[N.x+16,N.z-10],[N.x-14,N.z+12],[N.x+22,N.z+8],[R.x-14,R.z+8],[R.x+10,R.z-12],[R.x+18,R.z+16],[R.x-22,R.z-6]].forEach(([x,z])=>spawnMob("bird",x,z));
  [[N.x+28,N.z-18],[N.x-24,N.z-8],[R.x+20,R.z+4],[R.x-16,R.z-14],[R.x+8,R.z+22],[W.x-8,W.z+10]].forEach(([x,z])=>spawnMob("bristleback",x,z));
  [[R.x-30,R.z+20],[R.x+26,R.z-20],[R.x-8,R.z-28],[N.x-20,N.z+20]].forEach(([x,z])=>spawnMob("wolf",x,z,"redcloud_wolves"));
  [[R.x+12,R.z-8],[R.x-20,R.z+6],[N.x+18,N.z+16]].forEach(([x,z])=>spawnMob("windElement",x,z));
  [[R.x+16,R.z+4],[R.x-18,R.z+14],[R.x+8,R.z-18]].forEach(([x,z])=>spawnMob("youngBoar",x,z));
  /* 赤蹄外围：科多 · 狼 · 雷鹰 · 平原狮 · 野猪 · 土元素 */
  [[B.x+36,B.z+10],[B.x-40,B.z+16],[B.x+20,B.z-32],[G.x-24,G.z-10],[G.x+28,G.z+8]].forEach(([x,z])=>spawnMob("kodo",x,z));
  [[TH.x+12,TH.z-10],[TH.x-14,TH.z+8],[TH.x+8,TH.z+14]].forEach(([x,z])=>spawnMob("wolf",x,z,"thunderhorn_wolves"));
  [[B.x+28,B.z+28],[B.x-22,B.z-26],[W.x-10,W.z+8],[W.x+12,W.z-6]].forEach(([x,z])=>spawnMob("thunderhawk",x,z));
  [[G.x+14,G.z+8],[G.x-12,G.z-10],[B.x+48,B.z-20],[B.x-42,B.z+24]].forEach(([x,z])=>spawnMob("plainslion",x,z));
  [[B.x+44,B.z-8],[B.x-48,B.z+4],[B.x+16,B.z+36],[B.x-12,B.z-40]].forEach(([x,z])=>spawnMob("boar",x,z));
  [[B.x-30,B.z-28],[G.x+6,G.z-14]].forEach(([x,z])=>spawnMob("earthElement",x,z));
  /* 贫瘠石 */
  [[P.x,P.z],[P.x+14,P.z-10],[P.x-12,P.z+12],[P.x+18,P.z+8],[P.x-16,P.z-8],[P.x+6,P.z+18]].forEach(([x,z])=>spawnMob("palemane",x,z,"palemane_pack"));
  /* 黄金平原 / 石牛湖 */
  [[G.x+20,G.z],[G.x-16,G.z+14],[G.x+8,G.z-18],[L.x-20,L.z+10],[L.x+16,L.z-12]].forEach(([x,z])=>spawnMob("bird",x,z));
  /* 雷角水井：水元素 */
  [[TH.x+10,TH.z],[TH.x-8,TH.z+8],[TH.x+4,TH.z-10],[TH.x-12,TH.z-6]].forEach(([x,z])=>spawnMob("waterElement",x,z));
  /* 巴尔丹 */
  [[BD.x+8,BD.z],[BD.x-10,BD.z+8],[BD.x+14,BD.z-12],[BD.x-6,BD.z-10]].forEach(([x,z])=>spawnMob("baeldun",x,z,"baeldun_camp"));
  [[BD.x+4,BD.z+14],[BD.x-14,BD.z-4],[BD.x+16,BD.z+6]].forEach(([x,z])=>spawnMob("baeldunDigger",x,z,"baeldun_camp"));
  /* 风啸岗 */
  [[WF.x,WF.z],[WF.x+18,WF.z-12],[WF.x-16,WF.z+10],[WF.x+10,WF.z+16],[WF.x-20,WF.z-8],[WF.x+22,WF.z+6]].forEach(([x,z])=>spawnMob("windfury",x,z,"windfury_ridge"));
  /* 风投矿洞 */
  [[V.x+10,V.z+6],[V.x-12,V.z-8],[V.x+8,V.z-14],[V.x-16,V.z+10],[V.x+18,V.z+4]].forEach(([x,z])=>spawnMob("venture",x,z,"venture_mine"));
  spawnMob("ventureBoss",V.x-4,V.z+2,"venture_mine");
})();
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
const corpseMat=MAT.get("ash.corpse");
function setCorpse(m,on){
  if(on){
    if(typeof beginDeathRoll==="function")beginDeathRoll(m);
    else{m.mesh.rotation.z=Math.PI/2;m.mesh.position.y=.25;}
  }else{
    if(typeof resetDeathRoll==="function")resetDeathRoll(m.mesh);
    else{m.mesh.rotation.z=0;m.mesh.position.y=0;}
    m.mesh.position.y=0;
    if(m.attackAnim!=null)m.attackAnim=0;
    /* G1：重生时清溶解态 */
    m.awaitLoot=false;
    if(m.mesh.userData){
      m.mesh.userData.dissolving=false;
      m.mesh.userData.dissolveT=0;
    }
    m.mesh.scale.set(1,1,1);
    m.mesh.visible=true;
  }
  m.mesh.traverse(o=>{
    if(o.userData&&o.userData.eliteAura){o.visible=!on;return;}
    if(!o.isMesh)return;
    if(on){o.userData.liveMat=o.material;o.material=corpseMat;}
    else if(o.userData.liveMat){o.material=o.userData.liveMat;o.userData.liveMat=null;}
  });
  if(m.aura&&m.aura.light)m.aura.light.visible=!on;
}
/** G1 / R7：拾取完成或尸体超时后再溶解（共享材质只缩缩放淡出） */
function requestCorpseDissolve(ent){
  if(!ent||!ent.mesh)return;
  ent.awaitLoot=false;
  const mesh=ent.mesh;
  if(mesh.userData&&mesh.userData.dissolving)return;
  if(typeof beginDissolve==="function"&&!(BAL.vfx&&BAL.vfx.dissolve===false)){
    beginDissolve(mesh);
  }else{
    mesh.visible=false;
  }
}
/* 野怪死亡（STEP 1 onDeath 唯一挂接点）：留尸 + 掉落（STEP 2）+ 经验（STEP 3）
   STEP 5 泛化：数值/掉落/经验全部来自实体自身配置；精英走 eliteWeights 必掉优秀以上
   G1：有掉落则 awaitLoot，溶解推迟到拾取或尸体超时 */
function mobDie(m){
  m.state="dead";
  m.respawnT=m.respawnBase!=null?m.respawnBase:m.stats.respawnT;
  m.corpseT=BAL.loot.corpseT; m.moving=false;
  m.casting=null; m.awaitLoot=false;
  if(typeof clearCurrentTargetIf==="function")clearCurrentTargetIf(m);
  if(typeof clearThreat==="function")clearThreat(m);
  m.label.visible=false;
  setCorpse(m,true);
  spawnBurst(m.mesh.position.clone().setY(1),0xc9a06a,22,1.6);
  log(`你击杀了${m.name}！`,"lg-me");
  if(typeof onRareKill==="function")onRareKill(m);
  else if(m.elite)announce(`${m.name} 被击败！`);
  const it=typeof rollMobLoot==="function"?rollMobLoot(m)
    :rollLoot(m.loot,m.rare||m.worldBoss
      ?(BAL.loot.rareWeights||BAL.loot.eliteWeights)
      :(m.elite?BAL.loot.eliteWeights:null));
  if(it){
    m.awaitLoot=true;
    dropLoot(m.mesh.position.clone().add(new THREE.Vector3(1.2,0,.6)),[it],m,
      ()=>requestCorpseDissolve(m));
  }
  gainMobXP(m);
  const cu=rollCopperRange(m.stats.copper);
  if(cu)gainCopper(cu);
  if(typeof onQuestMobKill==="function")onQuestMobKill(m);
  else if(m.type==="boar"&&QUEST.state===1&&QUEST.kills<BAL.quest.boarKills){
    QUEST.kills++; updateQuest();
    if(QUEST.kills>=BAL.quest.boarKills){announce("任务目标完成 · 回格鲁尔处"); setMarker();}
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
function elderDist(){return Math.hypot(player.position.x-baine.position.x,player.position.z-baine.position.z);}
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
/** 距最近可对话赤蹄草甸 NPC 的水平距离；无则 Infinity */
function nearestMulgoreNpcDist(){
  if(!_mulgoreInteractNpcs||!_mulgoreInteractNpcs.length||typeof player==="undefined"||!player)return Infinity;
  let best=Infinity;
  for(const e of _mulgoreInteractNpcs){
    if(!e||!e.mesh)continue;
    const d=Math.hypot(player.position.x-e.mesh.position.x,player.position.z-e.mesh.position.z);
    if(d<best)best=d;
  }
  return best;
}
function nearMulgoreNpc(r){
  const R=r!=null?r:(BAL.economy.interactR||8);
  return nearestMulgoreNpcDist()<R;
}
function appendNpcQuestButtons(npcId,btn,refreshFn,skipIds){
  if(typeof questsForNpc!=="function")return;
  const skip=skipIds||[];
  for(const q of questsForNpc(npcId)){
    if(skip.indexOf(q.id)>=0)continue;
    if(canTurnInQuest(q.id))btn(`✦ 交任务：${q.title}`,()=>{
      const r=turnInQuest(q.id);
      if(r==="choice")return;
      if(refreshFn)refreshFn();else closeDialogue();
    });
    else if(canAcceptQuest(q.id))btn(`✦ 接受：${q.title}`,()=>{
      acceptQuest(q.id);
      if(typeof updateNpcQuestMarkers==="function")updateNpcQuestMarkers();
      if(refreshFn)refreshFn();else closeDialogue();
    });
  }
}

function openNpcQuestDialogue(npcId,title,idleText){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent=title;
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  const offers=typeof questsForNpc==="function"?questsForNpc(npcId):[];
  if(offers.length)tx.textContent=idleText||"大地母亲指引着我们。看看我能为你做什么。";
  else tx.textContent=(idleText||"大地母亲指引着我们。")+" 暂时没有新的委托。";
  appendNpcQuestButtons(npcId,btn);
  btn("离开",closeDialogue);
}

function tryInteract(){
  if(!S.started)return;
  /* C10：灵魂形态 —— 尸体复活 / 灵魂医者 */
  if(S.p.ghost){
    if(typeof nearPlayerCorpse==="function"&&nearPlayerCorpse()
      &&typeof tryResurrectAtCorpse==="function"&&tryResurrectAtCorpse())return;
    if(S.mode!=="world")return;
    const R=BAL.economy.interactR||8;
    const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
    if(zid==="mulgore"&&spiritDist()<R){openSpiritDialogue();return;}
    if(zid==="barrens"&&typeof barrensSpiritDist==="function"&&barrensSpiritDist()<R
      &&typeof openBarrensSpiritDialogue==="function"){openBarrensSpiritDialogue();return;}
    if(zid==="durotar"&&typeof durotarSpiritDist==="function"&&durotarSpiritDist()<R
      &&typeof openDurotarSpiritDialogue==="function"){openDurotarSpiritDialogue();return;}
    if(zid==="ashen_canyon"&&typeof ashenSpiritDist==="function"&&ashenSpiritDist()<R
      &&typeof openAshenSpiritDialogue==="function"){openAshenSpiritDialogue();return;}
    if(zid==="orgrimmar"&&typeof tryInteractOrgrimmar==="function"){tryInteractOrgrimmar();return;}
    if(zid==="blackrock"&&typeof tryInteractBlackrock==="function"){tryInteractBlackrock();return;}
    return;
  }
  if(!S.p.alive)return;
  if(tryLoot())return;
  if(typeof tryQuestGroundInteract==="function"&&tryQuestGroundInteract())return;
  if(S.mode==="raid"&&S.b.canLeave&&exitPortal&&player.position.distanceTo(EXIT_PORTAL_POS)<BAL.zones.exitPortalEnterR){
    leaveRaid(); return;
  }
  if(S.mode!=="world")return;
  if(typeof tryProfessionInteract==="function"&&tryProfessionInteract())return;
  if(typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="barrens"
    &&typeof tryInteractBarrens==="function"){tryInteractBarrens();return;}
  if(typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="durotar"
    &&typeof tryInteractDurotar==="function"){tryInteractDurotar();return;}
  if(typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="ashen_canyon"
    &&typeof tryInteractAshen==="function"){tryInteractAshen();return;}
  if(typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="orgrimmar"
    &&typeof tryInteractOrgrimmar==="function"){tryInteractOrgrimmar();return;}
  if(typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="blackrock"
    &&typeof tryInteractBlackrock==="function"){tryInteractBlackrock();return;}
  const near=pickNearestNpc(_mulgoreInteractNpcs);
  if(near)near.open();
}
function openSpiritDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="👻 灵魂医者 · 风语";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  if(S.p.ghost){
    tx.textContent="我能将你强行拉回人间——但你会虚弱一段时间。若你还能跑回尸体，便不必受此苦。";
    btn("在此复活（虚弱）",()=>{if(typeof resurrectAtSpiritHealer==="function")resurrectAtSpiritHealer();});
    btn("我再想想",closeDialogue);
  }else{
    tx.textContent="旅人，若你在战场上倒下，释放灵魂后我会在此接引你归来。大地母亲护佑着所有勇敢的灵魂。";
    btn("感谢您，医者",closeDialogue);
  }
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
      const it=ITEMS[id];
      const buy=typeof getVendorBuy==="function"?getVendorBuy(it): (it&&it.vendorBuy);
      if(!it||buy==null)continue;
      const q=QUALITY[it.quality]||QUALITY.common;
      const card=document.createElement("button");
      card.type="button";
      card.className="vendor-card";
      card.innerHTML=
        `<img src="${Icons.get(it.icon,q.color)}" style="border-color:${q.color}" alt="">`+
        `<div class="vb"><div class="vn" style="color:${q.color}">${it.name}</div>`+
        `<div class="vp">${formatCopperText(buy)}</div></div>`;
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
  openNpcQuestDialogue("haru","🦅 哈鲁 · 鹰眼","狼与雷鹰都是好猎物。");
}
function openHawkwindDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🐂 酋长 · 鹰风";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  if(typeof canAcceptQuest==="function"&&canAcceptQuest("elder_boars")){
    tx.textContent="年轻的勇士，草原漫步者能为营地提供肉食。去猎杀它们，带回肉块，证明你的蹄印属于这片土地。";
  }else if(typeof canAcceptQuest==="function"&&canAcceptQuest("hunt_continues")){
    tx.textContent=T("mob.bristleback")+"侵扰红云台地。继续狩猎，把他们赶回去！";
  }else{
    tx.textContent=T("poi.camp_narache")+"是我们的摇篮。北上"+T("poi.bloodhoof")+"，西望红云台地——愿风指引你的蹄印。";
  }
  appendNpcQuestButtons("hawkwind",btn);
  btn("离开",closeDialogue);
}
function openGrullDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🐗 格鲁尔 · 鹰风";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  if(typeof canAcceptQuest==="function"&&canAcceptQuest("hawkwind_totem")){
    tx.textContent="把这支鹰风图腾交给营地的长者灰角。他会指引你下一步。";
  }else{
    tx.textContent="力量与智慧并重，勇士。台地上的猎物不会自己送上门。";
  }
  appendNpcQuestButtons("grull",btn);
  btn("离开",closeDialogue);
}
function openDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🐂 "+T("npc.baine");
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};

  if(typeof canTurnInQuest==="function"&&canTurnInQuest("raoul_supply")){
    tx.textContent=T("poi.camp_narache")+"的补给？很好。欢迎来到"+T("poi.bloodhoof")+"，勇士。";
  }else if(typeof canAcceptQuest==="function"&&canAcceptQuest("clear_palemane")){
    tx.textContent="苍鬃豺狼人毁坏了贫瘠石。去清除他们，让土地重归平静。";
  }else if(typeof canAcceptQuest==="function"&&canAcceptQuest("bloodhoof_journey")){
    tx.textContent="你从"+T("poi.camp_narache")+"来？很好。在"+T("poi.bloodhoof")+"报到吧——我们有许多事务。";
  }else{
    let tip=T("world.baine_tip");
    if(S.p.level>=BAL.barrens.minLevel)tip+=" 南边的土路通向"+T("zone.barrens")+"。";
    tx.textContent=tip;
  }

  appendNpcQuestButtons("baine",btn);

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
