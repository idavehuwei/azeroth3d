/* ============================================================
   熔火之心 · barrens.js
   贫瘠之地（STEP 18）：干燥荒原 / 十字路口 / 野猪人与半人马 / 入口任务
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ srand worldRng BAL makeLabel setZoneSeed）
          zones.js（registerZone）
          models.js（buildQuadruped buildCentaur buildVendor buildSpiritHealer buildElder tintNpcCloth QUADS
            buildHut buildTent buildFence buildWatchtower buildCampfire buildTotem
            buildMarketStall buildCratePile BUILD_PAL placeProp）
          world.js（spawnMob MOBS pickNearestNpc appendNpcQuestButtons openVendor closeVendorPanel）
          combat.js 运行时（S log announce）
          quests.js 运行时（acceptQuest turnInQuest questsForNpc）
          professions.js 运行时（spawnGatherNodesForZone）
          rares.js 运行时（spawnRaresForZone）
          save.js 运行时（saveGame）· panels.js 运行时（renderQuestLog）
   [导出] sceneBarrens BARRENS_R BARRENS_QUEST BARRENS_PORTAL_N BARRENS_PORTAL_S BARRENS_PORTAL_E BARRENS_PORTAL_W
          barrensHeli barrensSun barrensFlames
          buildBarrensZone onBarrensQuestKill tryInteractBarrens
          updateBarrensMarkers crossroadsDist barrensSpiritDist barrensVendorDist barrensCookDist
   ============================================================ */
"use strict";

const BARRENS_R=BAL.barrens.radius;
const sceneBarrens=new THREE.Scene();
const BARRENS_PORTAL_N=new THREE.Vector3(0,0,-(BARRENS_R-8));
const BARRENS_SOUTH_MARK=new THREE.Vector3(0,0,BARRENS_R-12);
const BARRENS_PORTAL_S=BARRENS_SOUTH_MARK;
const BARRENS_PORTAL_E=new THREE.Vector3(BARRENS_R-12,0,8);
const BARRENS_PORTAL_W=new THREE.Vector3(-(BARRENS_R-12),0,-18);

/* 入口任务：0 未接 | 1 清野猪人 | 2 已交（完整任务网见 STEP 22） */
const BARRENS_QUEST={id:"crossroads_trouble",state:0,kills:0};

let barrensHeli=null,barrensSun=null;
const barrensFlames=[];
let crossroadsSentinel=null,crossroadsLabel=null;
let barrensSpirit=null,barrensSpiritLabel=null;
let barrensVendor=null,barrensVendorLabel=null;
let barrensCook=null,barrensCookLabel=null;
let barrensMarkerExcl=null,barrensMarkerQ=null;
let barrensPortalUni=null;

function buildBarrensZone(scn){
  const root=scn||sceneBarrens;
  const B=BAL.barrens;
  root.background=new THREE.Color(B.sky);
  root.fog=new THREE.FogExp2(B.fog,B.fogDensity);

  barrensHeli=new THREE.HemisphereLight(B.hemiSky,B.hemiGround,B.hemiIntensity);
  root.add(barrensHeli);
  barrensSun=new THREE.DirectionalLight(B.sunColor,B.sunIntensity);
  barrensSun.position.set(35,65,25); barrensSun.castShadow=true;
  barrensSun.shadow.mapSize.set(2048,2048);
  barrensSun.shadow.camera.left=-100;barrensSun.shadow.camera.right=100;
  barrensSun.shadow.camera.top=100;barrensSun.shadow.camera.bottom=-100;
  root.add(barrensSun);

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
  /* 野猪人前哨：兽皮帐篷圈 */
  [[-32,-12],[-28,-18],[-36,-8]].forEach(([cx,cz])=>{
    placeProp(root,buildTent({hide:P.hide,stake:P.stake,r:3.0,h:4.2,stakes:6,size:1}),cx,cz,0);
  });
  /* 半人马营地帐篷 */
  [[38,22],[44,28],[32,30]].forEach(([x,z],i)=>{
    placeProp(root,buildTent({hide:0xa87840,stake:P.stake,r:3.4,h:5.0,stakes:7,size:1.05}),x,z,i*.4);
  });
  [[40,25]].forEach(([x,z])=>{
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

  /* 十字路口：扩大街区 · 市集 · 双塔 · 围栏 */
  placeProp(root,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1.05}),0,0,0);
  placeProp(root,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:.75}),-18,-8,.4);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1.05}),-14,9,.4);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),16,7,-.55);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:0x9a6840,w:3.8,d:3.4,size:.95}),-12,-14,Math.PI*.65);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:.9}),18,-8,Math.PI*1.1);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,w:3.2,d:2.8,size:.85}),8,14,-.2);
  placeProp(root,buildTent({hide:P.hide,stake:P.stake,r:2.8,h:3.8,size:1}),12,-12,.3);
  placeProp(root,buildTent({hide:0xa87840,stake:P.stake,r:2.5,h:3.4,size:.95}),-8,14,.6);
  placeProp(root,buildMarketStall({wood:P.wood,woodD:P.woodD,cloth:0x8a6030,size:1}),-6,-6,Math.PI*.2);
  placeProp(root,buildCratePile({wood:P.wood,woodD:P.woodD,size:1.05}),-4,-9,.3);
  placeProp(root,buildTotem({wood:P.woodD,paintA:0xc04020,paintB:0xa87840,size:.8}),10,4,0);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:14,posts:8}),-20,4,Math.PI/2);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:12,posts:7}),6,-18,0);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:12,posts:7}),20,2,-Math.PI/2);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:10,posts:6}),-4,18,Math.PI);
  const bcf=placeProp(root,buildCampfire({flame:0xffa040,light:0xff8a30,size:1}),4,4,0);
  if(bcf&&bcf.userData.flame)barrensFlames.push(bcf.userData.flame);
  const bcf2=placeProp(root,buildCampfire({flame:0xff9030,light:0xff7020,size:.8}),-10,-4,0);
  if(bcf2&&bcf2.userData.flame)barrensFlames.push(bcf2.userData.flame);

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
  const nLab=makeLabel("莫高雷",12,"#c8e8a0","rgba(60,120,40,.9)");
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
  const sLab=makeLabel("哀嚎洞穴",11,"#a8d080","rgba(40,80,30,.9)");
  sLab.position.set(BARRENS_PORTAL_S.x,12.0,BARRENS_PORTAL_S.z); root.add(sLab);
  const sLab2=makeLabel(`需要 Lv.${BAL.barrens.wailingMinLevel||15}+`,6,"#ffb060","rgba(60,80,20,.9)");
  sLab2.position.set(BARRENS_PORTAL_S.x,10.6,BARRENS_PORTAL_S.z); root.add(sLab2);

  /* —— 东口：奥妮克希亚巢穴（STEP 28） —— */
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
  const eLab=makeLabel("奥妮克希亚巢穴",10,"#e8a080","rgba(80,30,20,.92)");
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

  const _npcLy=(BAL.npc&&BAL.npc.labelY)||4.05, _npcMy=(BAL.npc&&BAL.npc.markerY)||5.15, _npcLw=(BAL.npc&&BAL.npc.labelW)||6.2;
  crossroadsSentinel=tintNpcCloth(buildVendor(),0x6a5030);
  crossroadsSentinel.position.set(2,0,-2); crossroadsSentinel.rotation.y=Math.PI;
  root.add(crossroadsSentinel);
  crossroadsLabel=makeNameplate("哨兵 · 碎牙",BAL.npcLevel.crossroads,{w:_npcLw,friendly:true,color:"#e8c898"});
  crossroadsLabel.position.set(2,_npcLy,-2); root.add(crossroadsLabel);
  updateNameplateHp(crossroadsLabel,1,1);

  barrensVendor=buildVendor();
  barrensVendor.position.set(-8,0,-8); barrensVendor.rotation.y=Math.PI*.4;
  root.add(barrensVendor);
  barrensVendorLabel=makeNameplate("商人 · 旱蹄",BAL.npcLevel.barrens_vendor,{w:_npcLw,friendly:true,color:"#a8e8c0"});
  barrensVendorLabel.position.set(-8,_npcLy,-8); root.add(barrensVendorLabel);
  updateNameplateHp(barrensVendorLabel,1,1);

  barrensCook=tintNpcCloth(buildElder(),0xa86830);
  barrensCook.position.set(10,0,8); barrensCook.rotation.y=Math.PI*1.2;
  root.add(barrensCook);
  barrensCookLabel=makeNameplate("厨子 · 尘粮",BAL.npcLevel.cook,{w:_npcLw,friendly:true,color:"#ffcf90"});
  barrensCookLabel.position.set(10,_npcLy,8); root.add(barrensCookLabel);
  updateNameplateHp(barrensCookLabel,1,1);

  barrensSpirit=buildSpiritHealer();
  barrensSpirit.position.set(-12,0,10); barrensSpirit.rotation.y=Math.PI*.6;
  root.add(barrensSpirit);
  barrensSpiritLabel=makeNameplate("灵魂医者 · 尘语",BAL.npcLevel.spirit,{w:_npcLw+.2,friendly:true,color:"#c8e8ff",glow:"rgba(80,160,255,.95)"});
  barrensSpiritLabel.position.set(-12,_npcLy,10); root.add(barrensSpiritLabel);
  updateNameplateHp(barrensSpiritLabel,1,1);

  barrensMarkerExcl=makeLabel("❗",2.8,"#ffd76a","rgba(255,160,0,.95)");
  barrensMarkerExcl.position.set(2,_npcMy,-2); root.add(barrensMarkerExcl);
  barrensMarkerQ=makeLabel("❓",2.8,"#ffd76a","rgba(255,160,0,.95)");
  barrensMarkerQ.position.copy(barrensMarkerExcl.position); barrensMarkerQ.visible=false; root.add(barrensMarkerQ);

  [[-64,-24],[-56,-36],[-72,-16],[-60,-44],[-80,-28],[-48,-20]].forEach(([x,z])=>{
    spawnMob("quilboar",x,z,"quilboar_outpost",{zoneId:"barrens"});
  });
  [[76,44],[88,56],[64,60],[96,40],[80,30],[70,50]].forEach(([x,z])=>{
    spawnMob("centaur",x,z,"centaur_camp",{zoneId:"barrens"});
  });
  [[-30,80],[-44,64],[24,-80],[36,70],[-50,90],[40,-60]].forEach(([x,z])=>{
    spawnMob("zebra",x,z,null,{zoneId:"barrens"});
  });
  [[-36,56],[16,-70],[-20,-50],[50,40]].forEach(([x,z])=>{
    spawnMob("bird",x,z,null,{zoneId:"barrens"});
  });

  if(typeof spawnRaresForZone==="function")spawnRaresForZone("barrens");

  updateBarrensMarkers();
  if(typeof spawnGatherNodesForZone==="function"){
    spawnGatherNodesForZone("barrens",root,{
      radius:BARRENS_R,
      camp:{x:0,z:-2},
      portals:[{x:BARRENS_PORTAL_N.x,z:BARRENS_PORTAL_N.z},{x:BARRENS_PORTAL_S.x,z:BARRENS_PORTAL_S.z},{x:BARRENS_PORTAL_E.x,z:BARRENS_PORTAL_E.z},{x:BARRENS_PORTAL_W.x,z:BARRENS_PORTAL_W.z}],
    });
  }
  const z=ZONES.barrens;
  if(z)z.lights={heli:barrensHeli,sun:barrensSun,flames:barrensFlames};
}

function updateBarrensMarkers(){
  if(!barrensMarkerExcl)return;
  if(typeof npcHasQuestOffer==="function"){
    barrensMarkerExcl.visible=npcHasQuestOffer("crossroads");
    barrensMarkerQ.visible=npcHasQuestTurnIn("crossroads");
    return;
  }
  if(typeof questStatus==="function"){
    barrensMarkerExcl.visible=questStatus("crossroads_trouble")==="none";
    barrensMarkerQ.visible=questStatus("crossroads_trouble")==="ready";
    return;
  }
  barrensMarkerExcl.visible=(BARRENS_QUEST.state===0);
  barrensMarkerQ.visible=(BARRENS_QUEST.state===1&&BARRENS_QUEST.kills>=BAL.quest.barrens.quilboarKills);
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

function tryInteractBarrens(){
  const near=pickNearestNpc([
    {mesh:barrensSpirit,open:openBarrensSpiritDialogue},
    {mesh:crossroadsSentinel,open:openBarrensDialogue},
    {mesh:barrensVendor,open:()=>openVendor("barrens_vendor","🏕️ 商人 · 旱蹄")},
    {mesh:barrensCook,open:openBarrensCookDialogue},
  ]);
  if(near)near.open();
}

function openBarrensSpiritDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="👻 灵魂医者 · 尘语";
  dlg.style.display="block"; bts.innerHTML="";
  tx.textContent="贫瘠之地的风很干，旅人。若你倒下，释放灵魂后我会在十字路口接引你。";
  const b=document.createElement("button");
  b.className="dbtn";b.textContent="感谢您，医者";b.onclick=closeDialogue;bts.appendChild(b);
}

function openBarrensCookDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🍲 厨子 · 尘粮";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  tx.textContent="锅还空着。斑马肉、尘羽、军需箱——补给线靠你了。";
  appendNpcQuestButtons("barrens_cook",btn);
  btn("离开",closeDialogue);
}

function openBarrensDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🗼 哨兵 · 碎牙";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  const need=BAL.quest.barrens.quilboarKills;

  if(typeof canTurnInQuest==="function"&&canTurnInQuest("crossroads_trouble")){
    tx.textContent="漂亮！补给线暂时安全了。南方的哀嚎洞穴已经开放——建议等级 15，带上同伴更稳妥。收下这些铜币，继续变强吧。";
    btn("✦ 领取奖励 · 十字路口的麻烦",()=>{
      turnInQuest("crossroads_trouble");
      spawnBurst(player.position.clone().setY(1.5),0xe8c898,28,2);
      log("哨兵提及：南方哀嚎洞穴已开放（建议 Lv15+）。","lg-sys");
      closeDialogue();
    });
  }else if(typeof canAcceptQuest==="function"&&canAcceptQuest("crossroads_trouble")){
    tx.textContent="欢迎来到十字路口，勇士。西边野猪人前哨偷走了补给，还袭击商队。清剿 4 只野猪人斥候，我再告诉你半人马与南方洞穴的消息。";
    btn("✦ 接受任务：十字路口的麻烦",()=>{acceptQuest("crossroads_trouble");closeDialogue();});
  }else if(typeof questStatus==="function"&&questStatus("crossroads_trouble")==="active"){
    const k=questProgress("crossroads_trouble").kills|0;
    tx.textContent=`野猪人仍在西边前哨游荡（${k}/${need}）。干完活再来找我。`;
  }else{
    tx.textContent="十字路口永远欢迎英雄。军需找尘粮，买卖找旱蹄；南方绿色旋涡是哀嚎洞穴（Lv15+）。";
  }

  appendNpcQuestButtons("crossroads",btn,null,["crossroads_trouble"]);
  btn("离开",closeDialogue);
}

registerZone({
  id:"barrens",
  name:"贫瘠之地",
  scene:sceneBarrens,
  build:buildBarrensZone,
  music:"barrens",
  mode:"world",
  levelRange:[10,18],
  boundsR:()=>BARRENS_R,
  dayNight:true,
  gates:{
    from_mulgore:{x:0,z:-(BARRENS_R-22)},  /* 远离北口，避免与莫高雷南口乒乓 */
    from_wailing:{x:0,z:BARRENS_R-22},     /* 远离南口，避免进出乒乓 */
    from_onyxia:{x:BARRENS_R-28,z:8},      /* 远离东口 */
    from_durotar:{x:-(BARRENS_R-26),z:-18}, /* 远离西口 */
    crossroads:{x:0,z:0},
    spirit:{x:-8,z:5},
    default:{x:0,z:0},
  },
  portals:[{
    id:"to_mulgore_from_barrens",
    pos:()=>BARRENS_PORTAL_N,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:"莫高雷 · 圣山草原",
    logHint:"北行土路通往牛头人营地……",
    requireAlive:true,
    autoEnter:true,
    targetZone:"mulgore",
    targetGate:"from_barrens",
  },{
    id:"to_wailing",
    pos:()=>BARRENS_PORTAL_S,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:"哀嚎洞穴 · 副本入口",
    logHint:"潮气与毒草的气味从旋涡中渗出……走进即可进入哀嚎洞穴。",
    requireAlive:true,
    autoEnter:true,
    minLevel:()=>BAL.barrens.wailingMinLevel||15,
    lockedAnnounce:()=>`等级不足！需要 Lv.${BAL.barrens.wailingMinLevel||15}`,
    lockedLog:()=>`哀嚎洞穴危机四伏——当前 Lv.${S.p.level}，建议升到 Lv.${BAL.barrens.wailingMinLevel||15} 后再挑战。`,
    targetZone:"wailing_caverns",
    targetGate:"entrance",
  },{
    id:"to_onyxia",
    pos:()=>BARRENS_PORTAL_E,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:"奥妮克希亚巢穴 · 副本入口",
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
    if(fromId==="mulgore")log("干燥的热风扑面而来——你已踏入贫瘠之地。","lg-sys");
    else if(fromId==="wailing_caverns")log("你离开哀嚎洞穴，十字路口的风干而炙热。","lg-sys");
    else if(fromId==="durotar")log("你离开赭岩谷，贫瘠之地的热风干涩依旧。","lg-sys");
    updateBarrensMarkers();
    if(typeof updateQuest==="function")updateQuest();
  },
  onLeave(){},
});
