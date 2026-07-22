/* ============================================================
   炽心 · barrens.js
   枯原荒地：岔路镇枢纽（仿经典 WoW 布局）/ POI / NPC / 分区刷怪
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ srand worldRng BAL makeLabel setZoneSeed）
          zones.js（registerZone）· sky.js（initZoneSky）
          models.js（buildVendor buildSpiritHealer buildElder tintNpcCloth
            buildHut buildTent buildFence buildWatchtower buildCampfire buildTotem
            buildMarketStall buildCratePile
            buildLonghouse buildWell buildVillageGate buildSignpost buildLanternPole buildHaystack buildTrainingDummy BUILD_PAL placeProp）
          creatures.js（buildQuadruped buildCentaur QUADS）
          world.js（spawnMob MOBS pickNearestNpc appendNpcQuestButtons openVendor closeVendorPanel
            openNpcQuestDialogue）
          combat.js 运行时（S log announce）
          quests.js 运行时（acceptQuest turnInQuest questsForNpc）
          professions.js 运行时（spawnGatherNodesForZone）
          rares.js 运行时（spawnRaresForZone）
          save.js 运行时（saveGame）· panels.js 运行时（renderQuestLog）
   [导出] sceneBarrens BARRENS_R BARRENS CROSSROADS barrensWow BARRENS_QUEST
          BARRENS_PORTAL_N BARRENS_PORTAL_S BARRENS_PORTAL_E BARRENS_PORTAL_W
          barrensHeli barrensSun barrensFlames
          buildBarrensZone onBarrensQuestKill tryInteractBarrens
          updateBarrensMarkers nearBarrensNpc nearestBarrensNpcDist
          crossroadsDist barrensSpiritDist barrensVendorDist barrensCookDist
   ============================================================ */
"use strict";

const BARRENS_R=BAL.barrens.radius;
const sceneBarrens=new THREE.Scene();

/** 经典贫瘠坐标 → 世界 XZ；以岔路镇 (51,30) 为原点 */
function barrensWow(wx,wy){
  const cx=51, cy=30, hx=18, hy=28;
  const nx=(wx-cx)/hx, nz=(wy-cy)/hy;
  return{x:nx*BARRENS_R*.78, z:nz*BARRENS_R*.82};
}
const BARRENS={
  crossroads:barrensWow(51,30),
  deadOasis:barrensWow(52,45),
  sweetwater:barrensWow(42,15),
  wailing:barrensWow(42,36),
  ratchet:barrensWow(62,39),
  northWatch:barrensWow(62,18),
  goldRoad:barrensWow(50,50),
  taurajo:barrensWow(45,58),
  warriorGrave:barrensWow(48,22),
  raptors:barrensWow(55,20),
  quilboar:barrensWow(48,38),
  bristleback:barrensWow(49,35),
  centaur:barrensWow(40,28),
  wolves:barrensWow(51,24),
  goodsEast:barrensWow(56,30),
};
const CROSSROADS=BARRENS.crossroads;

const BARRENS_PORTAL_N=new THREE.Vector3(0,0,-(BARRENS_R-8));
const BARRENS_SOUTH_MARK=new THREE.Vector3(0,0,BARRENS_R-12);
const BARRENS_PORTAL_S=BARRENS_SOUTH_MARK;
const BARRENS_PORTAL_E=new THREE.Vector3(BARRENS_R-12,0,8);
const BARRENS_PORTAL_W=new THREE.Vector3(-(BARRENS_R-12),0,-18);

const BARRENS_QUEST={id:"crossroads_trouble",state:0,kills:0};

let barrensHeli=null,barrensSun=null;
const barrensFlames=[];
let crossroadsSentinel=null,crossroadsLabel=null;
let barrensSpirit=null,barrensSpiritLabel=null;
let barrensVendor=null,barrensVendorLabel=null;
let barrensCook=null,barrensCookLabel=null;
let barrensInnkeeper=null,barrensFlight=null,barrensArmor=null;
let barrensKag=null,barrensMankrik=null,barrensThom=null,barrensKil=null,barrensSerra=null,barrensLal=null,barrensZinge=null;
let barrensMarkerExcl=null,barrensMarkerQ=null;
let barrensPortalUni=null;

const _barrensNpcMarkers=[];
const _barrensInteractNpcs=[];
function registerBarrensInteract(mesh,open){
  if(!mesh||typeof open!=="function")return;
  for(const e of _barrensInteractNpcs){if(e.mesh===mesh){e.open=open;return;}}
  _barrensInteractNpcs.push({mesh,open});
}
function registerBarrensQuestMarker(npcId,x,z,root){
  const _npcMy=(BAL.npc&&BAL.npc.markerY)||6.55;
  const excl=makeQuestMark("offer");
  excl.position.set(x,_npcMy,z); excl.visible=false; root.add(excl);
  const exclGrey=makeQuestMark("low");
  exclGrey.position.copy(excl.position); exclGrey.visible=false; root.add(exclGrey);
  const q=makeQuestMark("turnin");
  q.position.copy(excl.position); q.visible=false; root.add(q);
  _barrensNpcMarkers.push({npcId,excl,exclGrey,q,x,z,baseY:_npcMy});
  return {excl,exclGrey,q};
}
function placeBarrensTalkNpc(root,mesh,x,z,rotY,name,level,color,npcId,openFn){
  const ly=(BAL.npc&&BAL.npc.labelY)||4.05, lw=(BAL.npc&&BAL.npc.labelW)||6.2;
  mesh.position.set(x,0,z);
  if(rotY!=null)mesh.rotation.y=rotY;
  root.add(mesh);
  const lab=makeNameplate(name,level,{w:lw+(name.length>8?.4:0),friendly:true,color:color||"#ffd9a0"});
  lab.position.set(x,ly,z); root.add(lab);
  updateNameplateHp(lab,1,1);
  if(npcId)registerBarrensQuestMarker(npcId,x,z,root);
  if(openFn)registerBarrensInteract(mesh,openFn);
  return lab;
}

function buildBarrensZone(scn){
  const root=scn||sceneBarrens;
  const B=BAL.barrens;
  root.background=new THREE.Color(B.sky);
  root.fog=new THREE.FogExp2(B.fog,B.fogDensity);

  barrensHeli=new THREE.HemisphereLight(B.hemiSky,B.hemiGround,B.hemiIntensity);
  root.add(barrensHeli);
  barrensSun=new THREE.DirectionalLight(B.sunColor,B.sunIntensity);
  barrensSun.position.set(35,65,25); barrensSun.castShadow=true;
  root.add(barrensSun);
  root.add(barrensSun.target);
  const _barrensSkyLights={heli:barrensHeli,sun:barrensSun};
  if(typeof initZoneSky==="function"){
    initZoneSky(root,_barrensSkyLights,{
      zenith:0x6a8ab0, horizon:B.sky, ground:B.dirt||0x9a7848,
    });
  }else{
    barrensSun.shadow.mapSize.set(2048,2048);
    barrensSun.shadow.camera.left=-100;barrensSun.shadow.camera.right=100;
    barrensSun.shadow.camera.top=100;barrensSun.shadow.camera.bottom=-100;
  }

  const ground=new THREE.Mesh(new THREE.CircleGeometry(BARRENS_R+40,64),
    MAT.get("dirt.zone",{color:B.ground,roughness:1}));
  ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; root.add(ground);

  const dirtMat=MAT.get("dirt.path",{color:B.dirt,roughness:1});
  for(let i=0;i<18;i++){
    const t=i/17;
    const z=BARRENS_PORTAL_N.z+(BARRENS_SOUTH_MARK.z-BARRENS_PORTAL_N.z)*t;
    const seg=new THREE.Mesh(new THREE.CircleGeometry(srand(2.4,3.2),10),dirtMat);
    seg.rotation.x=-Math.PI/2;
    seg.position.set(Math.sin(i*.55)*2.5,.03,z);
    seg.receiveShadow=true; root.add(seg);
  }

  const trunkMat=MAT.get("wood.dead");
  const deadLeaf=MAT.get("leaf.dead",{color:0x8a6a3a,roughness:1});
  for(let i=0;i<12;i++){
    const a=srand(0,6.28),r=srand(18,BARRENS_R-12);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.abs(x)<10&&Math.abs(z)<BARRENS_R)continue;
    const th=srand(8,14);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.45,.7,th,7),trunkMat);
    trunk.position.set(x,th/2,z); trunk.castShadow=true; root.add(trunk);
    for(let k=0;k<3;k++){
      const br=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,srand(2.5,4),5),trunkMat);
      br.position.set(x+srand(-.8,.8),th*.55+k*.6,z+srand(-.8,.8));
      br.rotation.set(srand(-.8,.8),0,srand(-.8,.8)); root.add(br);
    }
    if(worldRng()<.45){
      const blob=new THREE.Mesh(new THREE.SphereGeometry(srand(1.2,2),6,5),deadLeaf);
      blob.position.set(x,th*.85,z); blob.scale.y=.5; root.add(blob);
    }
  }

  const P=BUILD_PAL.barrens;
  /* 刺背野豕前哨：兽皮帐篷圈（岔路镇南） */
  const Qp=BARRENS.bristleback, Ce=BARRENS.centaur, C0=CROSSROADS;
  [[Qp.x,Qp.z],[Qp.x+8,Qp.z-10],[Qp.x-10,Qp.z+6]].forEach(([cx,cz])=>{
    placeProp(root,buildTent({hide:P.hide,stake:P.stake,r:3.0,h:4.2,stakes:6,size:1}),cx,cz,0);
  });
  /* 半人马营地帐篷（西） */
  [[Ce.x,Ce.z],[Ce.x+10,Ce.z+8],[Ce.x-8,Ce.z+10]].forEach(([x,z],i)=>{
    placeProp(root,buildTent({hide:0xa87840,stake:P.stake,r:3.4,h:5.0,stakes:7,size:1.05}),x,z,i*.4);
  });
  [[Ce.x+4,Ce.z+4]].forEach(([x,z])=>{
    for(let k=0;k<5;k++){
      const a=k/5*Math.PI*2;
      const st=new THREE.Mesh(new THREE.DodecahedronGeometry(.35,0),
        MAT.get("_",{color:0x6a5040,roughness:1,flatShading:true}));
      st.position.set(x+Math.cos(a)*1.0,.25,z+Math.sin(a)*1.0); root.add(st);
    }
    const fl=new THREE.Mesh(new THREE.ConeGeometry(.65,1.6,7),
      new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.9}));
    fl.position.set(x,1.0,z); root.add(fl);
    const li=new THREE.PointLight(0xff8a30,1.3,20,1.8); li.position.set(x,2.0,z); root.add(li);
    barrensFlames.push({fl,li});
  });

  /* 岔路镇：扩大街区 · 市集 · 双塔 · 围栏 · 长屋 · 水井 · 村门 */
  const cx=C0.x, cz=C0.z;
  /* 村口大门 */
  placeProp(root,buildVillageGate({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),cx+6,cz-20,.2);
  placeProp(root,buildVillageGate({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),cx-6,cz-20,-.2);
  /* 双塔 */
  placeProp(root,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1}),cx,cz,0);
  placeProp(root,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1}),cx-18,cz-8,.4);
  placeProp(root,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1}),cx+18,cz+8,-.3);
  /* 房屋群 */
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),cx-14,cz+9,.4);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),cx+16,cz+7,-.55);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:0x9a6840,size:1}),cx-12,cz-14,Math.PI*.65);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),cx+18,cz-8,Math.PI*1.1);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),cx+8,cz+14,-.2);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),cx-20,cz+12,.5);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),cx+22,cz-14,-.6);
  /* 长屋 */
  placeProp(root,buildLonghouse({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),cx-2,cz-4,0);
  /* 帐篷 */
  placeProp(root,buildTent({hide:P.hide,stake:P.stake,size:1}),cx+12,cz-12,.3);
  placeProp(root,buildTent({hide:0xa87840,stake:P.stake,size:1}),cx-8,cz+14,.6);
  placeProp(root,buildTent({hide:P.hide,stake:P.stake,size:1}),cx+20,cz+10,-.4);
  /* 市集 × 2 */
  placeProp(root,buildMarketStall({wood:P.wood,woodD:P.woodD,cloth:0x8a6030,size:1}),cx-6,cz-6,Math.PI*.2);
  placeProp(root,buildMarketStall({wood:P.wood,woodD:P.woodD,cloth:0x6a8a40,size:1}),cx+14,cz+4,-.15);
  /* 货箱 × 2 */
  placeProp(root,buildCratePile({wood:P.wood,woodD:P.woodD,size:1}),cx-4,cz-9,.3);
  placeProp(root,buildCratePile({wood:P.wood,woodD:P.woodD,size:1}),cx+16,cz-6,-.2);
  /* 图腾 × 2 */
  placeProp(root,buildTotem({wood:P.woodD,paintA:0xc04020,paintB:0xa87840,size:1}),cx+10,cz+4,0);
  placeProp(root,buildTotem({wood:P.woodD,paintA:0xa87840,paintB:0xc04020,size:1}),cx-12,cz-8,0);
  /* 水井 */
  placeProp(root,buildWell({stone:0x6a5a50,wood:P.woodD,size:1}),cx-2,cz+2,0);
  /* 草垛 */
  placeProp(root,buildHaystack({color:0xd8b060,size:1}),cx+18,cz-16,0);
  placeProp(root,buildHaystack({color:0xd0a850,size:1}),cx-16,cz+18,0);
  /* 训练假人 */
  placeProp(root,buildTrainingDummy({wood:0x4a3020,size:1}),cx+14,cz+16,0);
  /* 灯笼杆 */
  placeProp(root,buildLanternPole({wood:0x4a3020,size:1}),cx+2,cz-18,0);
  placeProp(root,buildLanternPole({wood:0x4a3020,size:1}),cx-10,cz-16,0);
  placeProp(root,buildLanternPole({wood:0x4a3020,size:1}),cx+14,cz-14,0);
  /* 围栏 */
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:20,posts:9}),cx-20,cz+4,Math.PI/2);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:18,posts:8}),cx+6,cz-18,0);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:18,posts:8}),cx+20,cz+2,-Math.PI/2);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:16,posts:7}),cx-4,cz+18,Math.PI);
  /* 营火 × 2 */
  const bcf=placeProp(root,buildCampfire({flame:0xffa040,light:0xff8a30,size:1}),cx+4,cz+4,0);
  if(bcf&&bcf.userData.flame)barrensFlames.push(bcf.userData.flame);
  const bcf2=placeProp(root,buildCampfire({flame:0xff9030,light:0xff7020,size:1}),cx-10,cz-4,0);
  if(bcf2&&bcf2.userData.flame)barrensFlames.push(bcf2.userData.flame);
  /* 路牌 */
  placeProp(root,buildSignpost({wood:0x4a3020,size:1}),cx+2,cz-18,0);

  /* 死水绿洲水面 + POI 标牌 */
  const DO=BARRENS.deadOasis;
  const oasisWater=new THREE.Mesh(new THREE.CircleGeometry(16,28),
    MAT.get("water.oasis",{color:0x2a5a48,roughness:.35,metalness:.05,transparent:true,opacity:.72}));
  oasisWater.rotation.x=-Math.PI/2; oasisWater.position.set(DO.x,.06,DO.z); root.add(oasisWater);
  const poiLab=(t,p,col)=>{
    const L=makeLabel(t,9,col||"#e8d0a0","rgba(40,28,12,.88)");
    L.position.set(p.x,6.5,p.z); root.add(L);
  };
  poiLab("死水绿洲",BARRENS.deadOasis,"#7ec8a8");
  poiLab(T("zone.wailing")+"入口",BARRENS.wailing,"#a8d080");
  poiLab("棘齿城方向",BARRENS.ratchet,"#c8b070");
  poiLab("黄金之路",BARRENS.goldRoad,"#d8c080");
  poiLab("陶拉祖营地",BARRENS.taurajo,"#c89860");
  poiLab("勇士之墓",BARRENS.warriorGrave,"#a8b0c8");
  poiLab("迅猛龙巢穴",BARRENS.raptors,"#6ab050");
  poiLab("北方城堡",BARRENS.northWatch,"#e8a090");


  const gateMat=MAT.get("_",{color:0x5a4028,roughness:.9,flatShading:true,
    emissive:0x4a6a30,emissiveIntensity:.15});
  const nPlat=new THREE.Mesh(new THREE.CylinderGeometry(7,8.5,1,12),gateMat);
  nPlat.position.set(BARRENS_PORTAL_N.x,.5,BARRENS_PORTAL_N.z); nPlat.receiveShadow=true; root.add(nPlat);
  [[-3.4],[3.4]].forEach(([sx])=>{
    const pil=new THREE.Mesh(new THREE.BoxGeometry(1.5,8.5,1.5),gateMat);
    pil.position.set(BARRENS_PORTAL_N.x+sx,4.8,BARRENS_PORTAL_N.z); pil.castShadow=true; root.add(pil);
  });
  const nLintel=new THREE.Mesh(new THREE.BoxGeometry(9.2,1.4,1.6),gateMat);
  nLintel.position.set(BARRENS_PORTAL_N.x,9.2,BARRENS_PORTAL_N.z); root.add(nLintel);
  barrensPortalUni={uTime:{value:0}};
  const nDisc=new THREE.Mesh(new THREE.CircleGeometry(2.8,36),new THREE.ShaderMaterial({
    uniforms:barrensPortalUni,transparent:true,side:THREE.DoubleSide,depthWrite:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;uniform float uTime;
      void main(){
        vec2 p=vUv-.5; float r=length(p)*2.; float ang=atan(p.y,p.x);
        float sw=sin(ang*2.5-uTime*2.2+r*7.);
        vec3 c=mix(vec3(.55,.75,.4),vec3(.2,.4,.15),smoothstep(-.5,.7,sw));
        c=mix(c,vec3(.05,.08,0.),smoothstep(.7,1.,r));
        gl_FragColor=vec4(c*1.15,smoothstep(1.,.88,r));
      }`}));
  nDisc.position.set(BARRENS_PORTAL_N.x,4.6,BARRENS_PORTAL_N.z); root.add(nDisc);
  const nLab=makeLabel(T("zone.mulgore"),12,"#c8e8a0","rgba(60,120,40,.9)");
  nLab.position.set(BARRENS_PORTAL_N.x,12.2,BARRENS_PORTAL_N.z); root.add(nLab);

  const sPlat=new THREE.Mesh(new THREE.CylinderGeometry(7,8.5,1,12),
    MAT.get("_",{color:0x3a4a30,roughness:.9,flatShading:true,
      emissive:0x2a4a20,emissiveIntensity:.2}));
  sPlat.position.set(BARRENS_PORTAL_S.x,.5,BARRENS_PORTAL_S.z); sPlat.receiveShadow=true; root.add(sPlat);
  [[-3.4],[3.4]].forEach(([sx])=>{
    const pil=new THREE.Mesh(new THREE.BoxGeometry(1.5,8.5,1.5),
      MAT.get("_",{color:0x3a4a30,roughness:.9,flatShading:true,
        emissive:0x2a4a20,emissiveIntensity:.15}));
    pil.position.set(BARRENS_PORTAL_S.x+sx,4.8,BARRENS_PORTAL_S.z); pil.castShadow=true; root.add(pil);
  });
  const sLintel=new THREE.Mesh(new THREE.BoxGeometry(9.2,1.4,1.6),
    MAT.get("_",{color:0x3a4a30,roughness:.9,flatShading:true}));
  sLintel.position.set(BARRENS_PORTAL_S.x,9.2,BARRENS_PORTAL_S.z); root.add(sLintel);
  const sDisc=new THREE.Mesh(new THREE.CircleGeometry(2.8,36),new THREE.ShaderMaterial({
    uniforms:barrensPortalUni,transparent:true,side:THREE.DoubleSide,depthWrite:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;uniform float uTime;
      void main(){
        vec2 p=vUv-.5; float r=length(p)*2.; float ang=atan(p.y,p.x);
        float sw=sin(ang*3.-uTime*1.8+r*6.);
        vec3 c=mix(vec3(.35,.7,.4),vec3(.1,.3,.12),smoothstep(-.5,.7,sw));
        c=mix(c,vec3(.02,.06,.02),smoothstep(.7,1.,r));
        gl_FragColor=vec4(c*1.2,smoothstep(1.,.88,r));
      }`}));
  sDisc.position.set(BARRENS_PORTAL_S.x,4.6,BARRENS_PORTAL_S.z); root.add(sDisc);
  const sLab=makeLabel(T("zone.wailing"),11,"#a8d080","rgba(40,80,30,.9)");
  sLab.position.set(BARRENS_PORTAL_S.x,12.0,BARRENS_PORTAL_S.z); root.add(sLab);
  const sLab2=makeLabel(`需要 Lv.${BAL.barrens.wailingMinLevel||15}+`,6,"#ffb060","rgba(60,80,20,.9)");
  sLab2.position.set(BARRENS_PORTAL_S.x,10.6,BARRENS_PORTAL_S.z); root.add(sLab2);

  /* —— 东口：黑曜巢穴（STEP 28） —— */
  const ePlat=new THREE.Mesh(new THREE.CylinderGeometry(5.5,6,.5,10),
    MAT.get("_",{color:0x4a2820,roughness:1,flatShading:true}));
  ePlat.position.set(BARRENS_PORTAL_E.x,.5,BARRENS_PORTAL_E.z); ePlat.receiveShadow=true; root.add(ePlat);
  [-1,1].forEach(sx=>{
    const pil=new THREE.Mesh(new THREE.BoxGeometry(1.1,9.2,1.1),
      MAT.get("_",{color:0x2a1510,roughness:.95,flatShading:true}));
    pil.position.set(BARRENS_PORTAL_E.x,4.8,BARRENS_PORTAL_E.z+sx*3.2); pil.castShadow=true; root.add(pil);
  });
  const eLintel=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.2,8),
    MAT.get("_",{color:0x3a1a12,roughness:.9,flatShading:true}));
  eLintel.position.set(BARRENS_PORTAL_E.x,9.2,BARRENS_PORTAL_E.z); root.add(eLintel);
  const eDisc=new THREE.Mesh(new THREE.CircleGeometry(2.8,36),new THREE.ShaderMaterial({
    uniforms:barrensPortalUni,transparent:true,side:THREE.DoubleSide,depthWrite:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;uniform float uTime;
      void main(){
        vec2 p=vUv-.5; float r=length(p)*2.; float ang=atan(p.y,p.x);
        float sw=sin(ang*2.8-uTime*2.+r*7.);
        vec3 c=mix(vec3(.85,.4,.2),vec3(.4,.12,.05),smoothstep(-.5,.7,sw));
        c=mix(c,vec3(.08,.02,0.),smoothstep(.7,1.,r));
        gl_FragColor=vec4(c*1.2,smoothstep(1.,.88,r));
      }`}));
  eDisc.position.set(BARRENS_PORTAL_E.x,4.6,BARRENS_PORTAL_E.z); eDisc.rotation.y=Math.PI/2; root.add(eDisc);
  const eLab=makeLabel(T("zone.onyxia"),10,"#e8a080","rgba(80,30,20,.92)");
  eLab.position.set(BARRENS_PORTAL_E.x,12.0,BARRENS_PORTAL_E.z); root.add(eLab);
  const eLab2=makeLabel(`需要 Lv.${BAL.barrens.onyxiaMinLevel||16}+`,6,"#ff9060","rgba(80,40,20,.9)");
  eLab2.position.set(BARRENS_PORTAL_E.x,10.6,BARRENS_PORTAL_E.z); root.add(eLab2);

  /* —— 西口：赭岩谷（V1-B1） —— */
  const wPlat=new THREE.Mesh(new THREE.CylinderGeometry(5.5,6.5,.5,10),
    MAT.get("_",{color:0x8a4820,roughness:1,flatShading:true}));
  wPlat.position.set(BARRENS_PORTAL_W.x,.5,BARRENS_PORTAL_W.z); wPlat.receiveShadow=true; root.add(wPlat);
  [-1,1].forEach(sz=>{
    const pil=new THREE.Mesh(new THREE.BoxGeometry(1.1,8.8,1.1),
      MAT.get("_",{color:0x5a2810,roughness:.95,flatShading:true}));
    pil.position.set(BARRENS_PORTAL_W.x,4.6,BARRENS_PORTAL_W.z+sz*3.0); pil.castShadow=true; root.add(pil);
  });
  const wLintel=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.2,7.5),
    MAT.get("_",{color:0x6a3018,roughness:.9,flatShading:true}));
  wLintel.position.set(BARRENS_PORTAL_W.x,9.0,BARRENS_PORTAL_W.z); root.add(wLintel);
  const wDisc=new THREE.Mesh(new THREE.CircleGeometry(2.6,36),new THREE.ShaderMaterial({
    uniforms:barrensPortalUni,transparent:true,side:THREE.DoubleSide,depthWrite:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;uniform float uTime;
      void main(){
        vec2 p=vUv-.5; float r=length(p)*2.; float ang=atan(p.y,p.x);
        float sw=sin(ang*2.4-uTime*2.1+r*6.5);
        vec3 c=mix(vec3(.95,.5,.2),vec3(.55,.2,.06),smoothstep(-.5,.7,sw));
        c=mix(c,vec3(.1,.03,0.),smoothstep(.7,1.,r));
        gl_FragColor=vec4(c*1.2,smoothstep(1.,.88,r));
      }`}));
  wDisc.position.set(BARRENS_PORTAL_W.x,4.5,BARRENS_PORTAL_W.z); wDisc.rotation.y=Math.PI/2; root.add(wDisc);
  const wLab=makeLabel("赭岩谷",10,"#ffb070","rgba(100,40,15,.92)");
  wLab.position.set(BARRENS_PORTAL_W.x,11.8,BARRENS_PORTAL_W.z); root.add(wLab);
  const wLab2=makeLabel(`需要 Lv.${BAL.barrens.durotarMinLevel||12}+`,6,"#ff9060","rgba(90,40,15,.9)");
  wLab2.position.set(BARRENS_PORTAL_W.x,10.4,BARRENS_PORTAL_W.z); root.add(wLab2);

  /* —— 岔路镇任务 NPC（营地内 · 经典清单） —— */
  _barrensNpcMarkers.length=0; _barrensInteractNpcs.length=0;
  const _bAt=(wx,wy,dx,dz)=>{const p=barrensWow(wx,wy);return{x:p.x+(dx||0),z:p.z+(dz||0)};};

  barrensInnkeeper=tintNpcCloth(buildElder(),0x8a6840);
  {const p=_bAt(50,30,-10,8);placeBarrensTalkNpc(root,barrensInnkeeper,p.x,p.z,Math.PI*.3,
    "旅店老板 · 风蹄",BAL.npcLevel.innkeeper,"#e0c090","innkeeper",
    ()=>openNpcQuestDialogue("innkeeper","🏨 旅店老板 · 风蹄","欢迎来到"+T("poi.crossroads")+"。炉石在此绑定——愿尘土不迷你的眼。"));}

  barrensFlight=tintNpcCloth(buildElder(),0x5a7088);
  {const p=_bAt(51,29,6,10);placeBarrensTalkNpc(root,barrensFlight,p.x,p.z,Math.PI*1.1,
    "飞行管理员 · 云翼",BAL.npcLevel.flightmaster,"#a8d0e8","flightmaster",
    ()=>openNpcQuestDialogue("flightmaster","🦅 飞行管理员 · 云翼","部落的翼兽待命。眼下风沙太大，暂不能起飞——但航线已记入你的地图。"));}

  barrensVendor=buildVendor();
  {const p=_bAt(50,31,-8,-6);barrensVendorLabel=placeBarrensTalkNpc(root,barrensVendor,p.x,p.z,Math.PI*.4,
    "武器商 · 旱蹄",BAL.npcLevel.barrens_vendor,"#a8e8c0","barrens_vendor",
    ()=>openVendor("barrens_vendor","⚔️ 武器商 · 旱蹄"));}

  barrensArmor=tintNpcCloth(buildVendor(),0x6a7a88);
  {const p=_bAt(50,30,-12,-2);placeBarrensTalkNpc(root,barrensArmor,p.x,p.z,Math.PI*.7,
    "护甲商 · 铁鬃",BAL.npcLevel.barrens_armor,"#b0c8d0","barrens_armor",
    ()=>openVendor("barrens_armor","🛡️ 护甲商 · 铁鬃"));}

  barrensCook=tintNpcCloth(buildElder(),0xa86830);
  {const p=_bAt(52,30,10,4);barrensCookLabel=placeBarrensTalkNpc(root,barrensCook,p.x,p.z,Math.PI*1.2,
    "厨子 · 尘粮",BAL.npcLevel.cook,"#ffcf90","barrens_cook",()=>openBarrensCookDialogue());}

  barrensSpirit=buildSpiritHealer();
  {const p=_bAt(50,29,-14,12);barrensSpiritLabel=placeBarrensTalkNpc(root,barrensSpirit,p.x,p.z,Math.PI*.6,
    "灵魂医者 · 尘语",BAL.npcLevel.spirit,"#c8e8ff",null,()=>openBarrensSpiritDialogue());
    /* STEP 17：十字路口墓地 + 哀嚎/奥妮门口墓地 */
    placeProp(root,buildGraveyard(),p.x+3.2,p.z+2.0,Math.PI*.4);
    registerGraveyard("barrens",p.x+3.2,p.z+2.0,"camp");
    if(BAL.death&&BAL.death.spawns)BAL.death.spawns.barrens={x:p.x+3.2,z:p.z+2.0};
  }
  placeProp(root,buildGraveyard({size:.9}),BARRENS_PORTAL_S.x+7,BARRENS_PORTAL_S.z+10,0);
  registerGraveyard("barrens",BARRENS_PORTAL_S.x+7,BARRENS_PORTAL_S.z+10,"portal_wailing");
  placeProp(root,buildGraveyard({size:.9}),BARRENS_PORTAL_E.x-10,BARRENS_PORTAL_E.z+6,Math.PI/2);
  registerGraveyard("barrens",BARRENS_PORTAL_E.x-10,BARRENS_PORTAL_E.z+6,"portal_onyxia");

  {const p=_bAt(52,30);
  crossroadsSentinel=tintNpcCloth(buildVendor(),0x6a5030);
  crossroadsLabel=placeBarrensTalkNpc(root,crossroadsSentinel,p.x,p.z,Math.PI,
    "达索克 · 快刀",BAL.npcLevel.darsok,"#e8c898","darsok",()=>openBarrensDialogue());
  const _crMk=_barrensNpcMarkers[_barrensNpcMarkers.length-1];
  barrensMarkerExcl=_crMk?_crMk.excl:null; barrensMarkerQ=_crMk?_crMk.q:null;}

  barrensKag=tintNpcCloth(buildElder(),0x8a4030);
  {const p=_bAt(51,31);placeBarrensTalkNpc(root,barrensKag,p.x,p.z,Math.PI*.4,
    "卡格 · 血怒",BAL.npcLevel.kag,"#e89870","kag",
    ()=>openNpcQuestDialogue("kag","🗡️ 卡格 · 血怒","黄金之路上的狮群与科多兽，正等着猎人的刀锋。"));}

  barrensMankrik=tintNpcCloth(buildElder(),0x5a4030);
  {const p=_bAt(51,30,-3,2);placeBarrensTalkNpc(root,barrensMankrik,p.x,p.z,Math.PI*1.1,
    "曼科里克",BAL.npcLevel.mankrik,"#c89060","mankrik",
    ()=>openNpcQuestDialogue("mankrik","⚔️ 曼科里克","我的妻子……她失踪在南边。我要复仇。"));}

  barrensThom=tintNpcCloth(buildVendor(),0x6a6840);
  {const p=_bAt(52,31);placeBarrensTalkNpc(root,barrensThom,p.x,p.z,Math.PI*.2,
    "托姆 · 鹰眼",BAL.npcLevel.thom,"#d0c080","thom",
    ()=>openNpcQuestDialogue("thom","🔭 托姆 · 鹰眼","北方城堡的人类据点威胁着部落商路。"));}

  barrensKil=tintNpcCloth(buildElder(),0x708050);
  {const p=_bAt(53,30);placeBarrensTalkNpc(root,barrensKil,p.x,p.z,Math.PI*1.3,
    "基尔 · 斯特雷",BAL.npcLevel.kil,"#b0d080","kil",
    ()=>openNpcQuestDialogue("kil","📦 基尔 · 斯特雷","货物丢了，商路断了——帮我找回箱子，再送到棘齿城。"));}

  barrensSerra=tintNpcCloth(buildElder(),0x905060);
  {const p=_bAt(52,29);placeBarrensTalkNpc(root,barrensSerra,p.x,p.z,Math.PI*.7,
    "塞拉 · 血羽",BAL.npcLevel.serra,"#e890b0","serra",
    ()=>openNpcQuestDialogue("serra","🪶 塞拉 · 血羽","死水绿洲的鹰身人偷走了我们的补给线。"));}

  barrensLal=tintNpcCloth(buildElder(),0x4a6850);
  {const p=_bAt(50,31);placeBarrensTalkNpc(root,barrensLal,p.x,p.z,Math.PI*.9,
    "拉尔 · 野性图腾",BAL.npcLevel.lal,"#90c8a0","lal",
    ()=>openNpcQuestDialogue("lal","🌿 拉尔 · 野性图腾",T("zone.wailing")+"的污染蔓延到了勇士之墓。大地母亲需要勇士。"));}

  barrensZinge=tintNpcCloth(buildElder(),0x608070);
  {const p=_bAt(52,32);placeBarrensTalkNpc(root,barrensZinge,p.x,p.z,Math.PI*1.5,
    "药剂师 · 金格",BAL.npcLevel.zinge,"#90d0c0","zinge",
    ()=>openNpcQuestDialogue("zinge","🧪 药剂师 · 金格","毒液、样本——"+T("poi.crossroads")+"的药剂学需要材料。"));}

  /* —— 分区刷怪（任务指向区） —— */
  const RP=BARRENS.raptors, GR=BARRENS.goldRoad;
  const Bb=BARRENS.bristleback, Ce2=BARRENS.centaur, NW=BARRENS.northWatch, WG=BARRENS.warriorGrave;
  const TA=BARRENS.taurajo, GE=BARRENS.goodsEast;
  [[Bb.x,Bb.z],[Bb.x+14,Bb.z-10],[Bb.x-12,Bb.z+8],[Bb.x+8,Bb.z+14],[Bb.x-16,Bb.z-6],[Bb.x+20,Bb.z+2],[C0.x+28,C0.z+18],[C0.x-24,C0.z+22]].forEach(([x,z])=>spawnMob("barrensBristle",x,z,"bristleback_camps",{zoneId:"barrens"}));
  [[GR.x+10,GR.z],[GR.x-12,GR.z+8],[GR.x+16,GR.z-10],[GR.x-8,GR.z-14],[GR.x+4,GR.z+16],[GR.x-18,GR.z+4]].forEach(([x,z])=>spawnMob("barrensLion",x,z,"gold_road_lions",{zoneId:"barrens"}));
  [[GR.x+22,GR.z-6],[GR.x-20,GR.z+12],[C0.x+48,C0.z+8]].forEach(([x,z])=>spawnMob("kodo",x,z,null,{zoneId:"barrens"}));
  [[DO.x+12,DO.z],[DO.x-10,DO.z+10],[DO.x+8,DO.z-12],[DO.x-14,DO.z-6],[DO.x+4,DO.z+14],[DO.x-6,DO.z+8],[DO.x+16,DO.z-4],[DO.x-16,DO.z+4]].forEach(([x,z])=>spawnMob("oasisHarpy",x,z,"dead_oasis_harpies",{zoneId:"barrens"}));
  [[DO.x+6,DO.z+6],[DO.x-8,DO.z-8]].forEach(([x,z])=>spawnMob("crocolisk",x,z,"dead_oasis",{zoneId:"barrens"}));
  [[WG.x+6,WG.z],[WG.x-6,WG.z+4],[WG.x+2,WG.z-6]].forEach(([x,z])=>spawnMob("oasisWater",x,z,"warrior_grave",{zoneId:"barrens"}));
  [[RP.x,RP.z],[RP.x+12,RP.z-8],[RP.x-10,RP.z+10]].forEach(([x,z])=>spawnMob("raptor",x,z,"raptor_nests",{zoneId:"barrens"}));
  [[Ce2.x,Ce2.z],[Ce2.x+16,Ce2.z+8],[Ce2.x-12,Ce2.z+12]].forEach(([x,z])=>spawnMob("centaur",x,z,"centaur_camp",{zoneId:"barrens"}));
  spawnMob("quilboarElder",TA.x+18,TA.z-12,"quilboar_elder",{zoneId:"barrens"});
  [[NW.x+8,NW.z],[NW.x-6,NW.z+8],[NW.x+4,NW.z-10]].forEach(([x,z])=>spawnMob("baeldun",x,z,"northwatch",{zoneId:"barrens"}));
  [[C0.x+36,C0.z-8],[C0.x-40,C0.z+16],[GE.x,GE.z]].forEach(([x,z])=>spawnMob("zebra",x,z,null,{zoneId:"barrens"}));
  [[C0.x+20,C0.z-28],[C0.x-30,C0.z-20],[NW.x-12,NW.z+6]].forEach(([x,z])=>spawnMob("scorp",x,z,"north_venom",{zoneId:"barrens"}));
  [[TA.x-10,TA.z+8],[TA.x+12,TA.z-6],[TA.x+4,TA.z+14]].forEach(([x,z])=>spawnMob("crocolisk",x,z,"south_venom",{zoneId:"barrens"}));

  if(typeof spawnRaresForZone==="function")spawnRaresForZone("barrens");

  updateBarrensMarkers();
  if(typeof spawnGatherNodesForZone==="function"){
    spawnGatherNodesForZone("barrens",root,{
      radius:BARRENS_R,
      camp:{x:CROSSROADS.x,z:CROSSROADS.z-2},
      portals:[{x:BARRENS_PORTAL_N.x,z:BARRENS_PORTAL_N.z},{x:BARRENS_PORTAL_S.x,z:BARRENS_PORTAL_S.z},{x:BARRENS_PORTAL_E.x,z:BARRENS_PORTAL_E.z},{x:BARRENS_PORTAL_W.x,z:BARRENS_PORTAL_W.z}],
    });
  }
  const z=ZONES.barrens;
  if(z)z.lights={heli:barrensHeli,sun:barrensSun,flames:barrensFlames,fill:_barrensSkyLights.fill};
}

function updateBarrensMarkers(){
  for(const m of _barrensNpcMarkers){
    if(typeof applyNpcQuestMarkerVisual==="function")applyNpcQuestMarkerVisual(m);
    else if(typeof npcHasQuestOffer==="function"){
      m.excl.visible=npcHasQuestOffer(m.npcId);
      m.q.visible=npcHasQuestTurnIn(m.npcId);
    }else{
      m.excl.visible=false; m.q.visible=false;
    }
  }
}

function crossroadsDist(){
  if(!crossroadsSentinel)return 999;
  return Math.hypot(player.position.x-crossroadsSentinel.position.x,player.position.z-crossroadsSentinel.position.z);
}
function barrensSpiritDist(){
  if(!barrensSpirit)return 999;
  return Math.hypot(player.position.x-barrensSpirit.position.x,player.position.z-barrensSpirit.position.z);
}
function barrensVendorDist(){
  if(!barrensVendor)return 999;
  return Math.hypot(player.position.x-barrensVendor.position.x,player.position.z-barrensVendor.position.z);
}
function barrensCookDist(){
  if(!barrensCook)return 999;
  return Math.hypot(player.position.x-barrensCook.position.x,player.position.z-barrensCook.position.z);
}

/* 击杀计数已由 quests.onQuestMobKill 统一处理；此处仅刷新标记 */
function onBarrensQuestKill(m){
  updateBarrensMarkers();
}

function nearestBarrensNpcDist(){
  if(!_barrensInteractNpcs.length||typeof player==="undefined"||!player)return Infinity;
  let best=Infinity;
  for(const e of _barrensInteractNpcs){
    if(!e||!e.mesh)continue;
    const d=Math.hypot(player.position.x-e.mesh.position.x,player.position.z-e.mesh.position.z);
    if(d<best)best=d;
  }
  return best;
}
function nearBarrensNpc(r){
  const R=r!=null?r:(BAL.economy.interactR||8);
  return nearestBarrensNpcDist()<R;
}
function tryInteractBarrens(){
  if(typeof tryQuestGroundInteract==="function"&&tryQuestGroundInteract())return;
  const near=pickNearestNpc(_barrensInteractNpcs);
  if(near)near.open();
}

function openBarrensSpiritDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="👻 灵魂医者 · 尘语";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  if(S.p.ghost){
    tx.textContent="枯原的风很干。我能把你拉回来——但你会虚弱。跑回尸体则不必。";
    btn("在此复活（虚弱）",()=>{if(typeof resurrectAtSpiritHealer==="function")resurrectAtSpiritHealer();});
    btn("我再想想",closeDialogue);
  }else{
    tx.textContent=T("zone.barrens")+"的风很干，旅人。若你倒下，释放灵魂后我会在"+T("poi.crossroads")+"接引你。";
    btn("感谢您，医者",closeDialogue);
  }
}

function openBarrensCookDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🍲 厨子 · 尘粮";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  tx.textContent="锅还热着。营地里的猎人与斥候都有活——你去找达索克、卡格他们吧。";
  appendNpcQuestButtons("barrens_cook",btn);
  btn("离开",closeDialogue);
}

function openBarrensDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🗡️ 达索克 · 快刀";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  const need=BAL.quest.barrens.quilboarKills;

  if(typeof canTurnInQuest==="function"&&canTurnInQuest("crossroads_trouble")){
    tx.textContent=T("mob.bristleback")+"暂时退了。陶拉祖还等着补给信——也去问问卡格、托姆和曼科里克，他们手里都有活。";
    btn("✦ 领取奖励 · "+T("mob.quilboar")+"的威胁",()=>{
      turnInQuest("crossroads_trouble");
      spawnBurst(player.position.clone().setY(1.5),0xe8c898,28,2);
      closeDialogue();
    });
  }else if(typeof canAcceptQuest==="function"&&canAcceptQuest("crossroads_trouble")){
    tx.textContent=T("mob.bristleback")+"在营地南边劫掠商队。清剿他们，"+T("poi.crossroads")+"才能喘口气。";
    btn("✦ 接受任务："+T("mob.quilboar")+"的威胁",()=>{acceptQuest("crossroads_trouble");closeDialogue();});
  }else if(typeof questStatus==="function"&&questStatus("crossroads_trouble")==="active"){
    const k=questProgress("crossroads_trouble").kills|0;
    tx.textContent=`${T("mob.bristleback")}还在南边游荡（${k}/${need}）。`;
  }else{
    tx.textContent=T("poi.crossroads")+"是部落的枢纽。补给、侦察、狩猎——营地里的人都有事要拜托你。";
  }

  appendNpcQuestButtons("darsok",btn,null,["crossroads_trouble"]);
  btn("离开",closeDialogue);
}


registerZone({
  id:"barrens",
  name:T("zone.barrens"),
  scene:sceneBarrens,
  build:buildBarrensZone,
  music:"barrens",
  mode:"world",
  levelRange:[6,13],
  boundsR:()=>BARRENS_R,
  dayNight:true,
  gates:{
    from_mulgore:{x:0,z:-(BARRENS_R-22)},  /* 远离北口，避免与赤蹄草甸南口乒乓 */
    from_wailing:{x:0,z:BARRENS_R-22},     /* 远离南口，避免进出乒乓 */
    from_onyxia:{x:BARRENS_R-28,z:8},      /* 远离东口 */
    from_durotar:{x:-(BARRENS_R-26),z:-18}, /* 远离西口 */
    crossroads:{x:CROSSROADS.x,z:CROSSROADS.z},
    spirit:{x:CROSSROADS.x-8,z:CROSSROADS.z+5},
    default:{x:CROSSROADS.x,z:CROSSROADS.z},
  },
  portals:[{
    id:"to_mulgore_from_barrens",
    pos:()=>BARRENS_PORTAL_N,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:T("zone.mulgore")+" · 圣山草原",
    logHint:"北行土路通往"+T("race.tauren")+"营地……",
    requireAlive:true,
    autoEnter:true,
    targetZone:"mulgore",
    targetGate:"from_barrens",
  },{
    id:"to_wailing",
    pos:()=>BARRENS_PORTAL_S,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:T("zone.wailing")+" · 副本入口",
    logHint:"潮气与毒草的气味从旋涡中渗出……走进即可进入"+T("zone.wailing")+"。",
    requireAlive:true,
    autoEnter:true,
    minLevel:()=>BAL.barrens.wailingMinLevel||15,
    lockedAnnounce:()=>`等级不足！需要 Lv.${BAL.barrens.wailingMinLevel||15}`,
    lockedLog:()=>`${T("zone.wailing")}危机四伏——当前 Lv.${S.p.level}，建议升到 Lv.${BAL.barrens.wailingMinLevel||15} 后再挑战。`,
    targetZone:"wailing_caverns",
    targetGate:"entrance",
  },{
    id:"to_onyxia",
    pos:()=>BARRENS_PORTAL_E,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:T("zone.onyxia")+" · 副本入口",
    logHint:"硫磺与龙息的气味从旋涡中涌出……走进即可挑战黑龙女王。",
    requireAlive:true,
    autoEnter:true,
    minLevel:()=>BAL.barrens.onyxiaMinLevel||16,
    lockedAnnounce:()=>`等级不足！需要 Lv.${BAL.barrens.onyxiaMinLevel||16}`,
    lockedLog:()=>`黑龙巢穴极其危险——当前 Lv.${S.p.level}，建议升到 Lv.${BAL.barrens.onyxiaMinLevel||16} 后再挑战。`,
    targetZone:"onyxias_lair",
    targetGate:"entrance",
  },{
    id:"to_durotar",
    pos:()=>BARRENS_PORTAL_W,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:"赭岩谷 · 兽人哨站风",
    logHint:"西边热浪翻滚——赭岩谷的橙土与哨站旗影隐约可见。",
    requireAlive:true,
    autoEnter:true,
    minLevel:()=>BAL.barrens.durotarMinLevel||12,
    lockedAnnounce:()=>`等级不足！需要 Lv.${BAL.barrens.durotarMinLevel||12}`,
    lockedLog:()=>`赭岩谷危机四伏——当前 Lv.${S.p.level}，建议升到 Lv.${BAL.barrens.durotarMinLevel||12} 后再前往。`,
    targetZone:"durotar",
    targetGate:"from_barrens",
  }],
  onEnter(fromId,gateId,opts){
    if(opts&&opts.silent)return;
    if(fromId==="mulgore")log("干燥的热风扑面而来——你已踏入"+T("zone.barrens")+"。","lg-sys");
    else if(fromId==="wailing_caverns")log("你离开"+T("zone.wailing")+"，"+T("poi.crossroads")+"的风干而炙热。","lg-sys");
    else if(fromId==="durotar")log("你离开赭岩谷，"+T("zone.barrens")+"的热风干涩依旧。","lg-sys");
    updateBarrensMarkers();
    if(typeof updateQuest==="function")updateQuest();
  },
  onLeave(){},
});
