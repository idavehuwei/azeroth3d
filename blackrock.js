/* ============================================================
   炽心 · blackrock.js
   黑石山外域：奥格瑞玛北 · 团本「炽心熔窟」入口
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ srand BAL makeLabel makeNameplate）
          zones.js（registerZone）· sky.js（initZoneSky）
          models.js（buildVendor buildSpiritHealer tintNpcCloth
            buildHut buildWatchtower buildCampfire buildFence BUILD_PAL
            placeProp buildGraveyard）
          world.js（pickNearestNpc openVendor）
          combat.js 运行时（S log announce）
   [导出] sceneBlackrock BLACKROCK_R BR_PORTAL_S BR_PORTAL_MC
          buildBlackrockZone tryInteractBlackrock
          updateBlackrockMarkers brScoutDist brSpiritDist
          brHeli brSun brFlames blackrockPortalUni
          brMarkerExcl brMarkerExclGrey brMarkerQ
   ============================================================ */
"use strict";

const BLACKROCK_R=(BAL.blackrock&&BAL.blackrock.radius)||280;
const sceneBlackrock=new THREE.Scene();
const BR_PORTAL_S=new THREE.Vector3(0,0,BLACKROCK_R-10);
const BR_PORTAL_MC=new THREE.Vector3(0,0,-(BLACKROCK_R-12));

let brHeli=null,brSun=null;
const brFlames=[];
let brScout=null,brSpirit=null;
let blackrockPortalUni=null;
let brMarkerExcl=null,brMarkerExclGrey=null,brMarkerQ=null;

function buildBlackrockZone(scn){
  const root=scn||sceneBlackrock;
  const D=BAL.blackrock||{};
  root.background=new THREE.Color(D.sky||0x4a1810);
  root.fog=new THREE.FogExp2(D.fog||0x2a0c08,D.fogDensity||0.0075);

  brHeli=new THREE.HemisphereLight(D.hemiSky||0xff6030,D.hemiGround||0x1a0804,D.hemiIntensity||.9);
  root.add(brHeli);
  brSun=new THREE.DirectionalLight(D.sunColor||0xff5020,D.sunIntensity||1.1);
  brSun.position.set(20,50,-30); brSun.castShadow=true;
  root.add(brSun); root.add(brSun.target);
  const _brSkyLights={heli:brHeli,sun:brSun};
  if(typeof initZoneSky==="function"){
    initZoneSky(root,_brSkyLights,{
      zenith:0x3a1008, horizon:D.sky||0x4a1810, ground:D.dirt||0x1a0a06,
    });
  }

  const ground=new THREE.Mesh(new THREE.CircleGeometry(BLACKROCK_R+24,56),
    MAT.get("dirt.blackrock",{color:D.ground||0x2a1410,roughness:1}));
  ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; root.add(ground);

  /* 黑曜山体环 */
  const rockMat=MAT.get("obsidian.ridge",{color:0x1a1018,roughness:.88,flatShading:true,
    emissive:0x401008,emissiveIntensity:.2});
  for(let i=0;i<14;i++){
    const a=i/14*Math.PI*2;
    const r=BLACKROCK_R-18;
    const peak=new THREE.Mesh(new THREE.ConeGeometry(srand(4,7),srand(10,18),5),rockMat);
    peak.position.set(Math.cos(a)*r,srand(4,7),Math.sin(a)*r);
    peak.rotation.y=a; peak.castShadow=true; root.add(peak);
  }
  /* 熔岩裂隙 */
  const lavaMat=MAT.get("lava.blackrock",{color:0xff4010,emissive:0xff3008,emissiveIntensity:.9,roughness:.35});
  for(let i=0;i<8;i++){
    const lx=srand(-BLACKROCK_R*.4,BLACKROCK_R*.4), lz=srand(-BLACKROCK_R*.45,BLACKROCK_R*.2);
    if(Math.hypot(lx,lz)<16)continue;
    const rift=new THREE.Mesh(new THREE.BoxGeometry(srand(1.4,2.8),.14,srand(5,11)),lavaMat);
    rift.position.set(lx,.05,lz); rift.rotation.y=srand(0,6.28); root.add(rift);
  }

  const dirtMat=MAT.get("dirt.br_path",{color:D.dirt||0x1a0a06,roughness:1});
  for(let i=0;i<14;i++){
    const t=i/13;
    const z=BR_PORTAL_S.z*(1-t)+BR_PORTAL_MC.z*t;
    const seg=new THREE.Mesh(new THREE.CircleGeometry(srand(2.0,2.8),8),dirtMat);
    seg.rotation.x=-Math.PI/2; seg.position.set(Math.sin(i*.5)*1.8,.03,z*.9);
    root.add(seg);
  }

  const P=BUILD_PAL.blackrock||BUILD_PAL.ashen||BUILD_PAL.durotar;
  placeProp(root,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag||0xc02810,size:.9}),-14,8,0);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:.9}),16,6,-.3);
  /* 黑石前哨：火山灰焦木 */
  if(typeof placeZoneTrees==="function"){
    placeZoneTrees(root,{
      count:70, radius:90, minR:14, cx:0, cz:0,
      avoid:[{x:0,z:0,r:14}],
      weights:{pine:0,oak:0,dead:.65,twisted:.35},
      baseScale:4.4, leafTint:0x5a5048, barkTint:0xa09080,
      heightFn:()=>0, seed:0xB1AC^WORLD_SEED,
      bush:true, bushCount:50, fern:false, clusters:3,
    });
  }
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:12,posts:6}),-20,-4,Math.PI/2);
  [[-6,4],[8,-6]].forEach(([x,z],i)=>{
    const cf=placeProp(root,buildCampfire({flame:0xff5020,light:0xff3010,size:.85}),x,z,0);
    if(cf)brFlames.push(cf);
  });

  /* 南门 → 奥格瑞玛 */
  const gateMat=MAT.get("wood.br_gate",{color:0x3a1a10,roughness:.92,flatShading:true,
    emissive:0x5a1808,emissiveIntensity:.2});
  const sPlat=new THREE.Mesh(new THREE.CylinderGeometry(6,7,.9,10),gateMat);
  sPlat.position.set(BR_PORTAL_S.x,.4,BR_PORTAL_S.z); root.add(sPlat);
  [[-3],[3]].forEach(([sx])=>{
    const pil=new THREE.Mesh(new THREE.BoxGeometry(1.3,7.5,1.3),gateMat);
    pil.position.set(BR_PORTAL_S.x+sx,4.1,BR_PORTAL_S.z); root.add(pil);
  });
  const sUni={uTime:{value:0}};
  const sDisc=new THREE.Mesh(new THREE.CircleGeometry(2.5,28),new THREE.ShaderMaterial({
    uniforms:sUni,transparent:true,side:THREE.DoubleSide,depthWrite:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;uniform float uTime;
      void main(){
        vec2 p=vUv-.5; float r=length(p)*2.; float ang=atan(p.y,p.x);
        float sw=sin(ang*2.5-uTime*2.2+r*7.);
        vec3 c=mix(vec3(.95,.45,.2),vec3(.55,.12,.04),smoothstep(-.5,.7,sw));
        c=mix(c,vec3(.06,.01,0.),smoothstep(.7,1.,r));
        gl_FragColor=vec4(c*1.1,smoothstep(1.,.88,r));
      }`}));
  sDisc.position.set(BR_PORTAL_S.x,3.8,BR_PORTAL_S.z); root.add(sDisc);
  const sLab=makeLabel(T("zone.orgrimmar"),10,"#ffb070","rgba(80,25,10,.9)");
  sLab.position.set(BR_PORTAL_S.x,10.5,BR_PORTAL_S.z); root.add(sLab);

  /* 北门：炽心熔窟团本入口（自莫高雷迁入） */
  const obsidian=MAT.get("obsidian.gate");
  const pPlat=new THREE.Mesh(new THREE.CylinderGeometry(8,9.5,1,12),obsidian);
  pPlat.position.set(BR_PORTAL_MC.x,.5,BR_PORTAL_MC.z); pPlat.receiveShadow=true; root.add(pPlat);
  [[-3.8],[3.8]].forEach(([sx])=>{
    const pil=new THREE.Mesh(new THREE.BoxGeometry(1.7,9.5,1.7),obsidian);
    pil.position.set(BR_PORTAL_MC.x+sx,5.7,BR_PORTAL_MC.z); pil.castShadow=true; root.add(pil);
    const spike=new THREE.Mesh(new THREE.ConeGeometry(.8,2.2,5),obsidian);
    spike.position.set(BR_PORTAL_MC.x+sx,11.5,BR_PORTAL_MC.z); root.add(spike);
  });
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(10.4,1.7,1.9),obsidian);
  lintel.position.set(BR_PORTAL_MC.x,10.4,BR_PORTAL_MC.z); lintel.castShadow=true; root.add(lintel);
  blackrockPortalUni={uTime:{value:0}};
  const portalDisc=new THREE.Mesh(new THREE.CircleGeometry(3.1,40),new THREE.ShaderMaterial({
    uniforms:blackrockPortalUni,transparent:true,side:THREE.DoubleSide,depthWrite:false,
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
  portalDisc.position.set(BR_PORTAL_MC.x,5.2,BR_PORTAL_MC.z); root.add(portalDisc);
  [[-6.5],[6.5]].forEach(([sx])=>{
    const bz=new THREE.Mesh(new THREE.CylinderGeometry(.8,.5,1.4,7),obsidian);
    bz.position.set(BR_PORTAL_MC.x+sx,.9,BR_PORTAL_MC.z+4); root.add(bz);
    const fl=new THREE.Mesh(new THREE.ConeGeometry(.55,1.5,7),
      new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.92}));
    fl.position.set(BR_PORTAL_MC.x+sx,2.2,BR_PORTAL_MC.z+4); root.add(fl);
    const li=new THREE.PointLight(0xff6a20,1.2,18,1.8);
    li.position.set(BR_PORTAL_MC.x+sx,2.6,BR_PORTAL_MC.z+4); root.add(li);
    brFlames.push({fl,li});
  });
  const mcLab=makeLabel(T("zone.molten_core"),13,"#ffd9a0","rgba(180,40,10,.95)");
  mcLab.position.set(BR_PORTAL_MC.x,13.6,BR_PORTAL_MC.z); root.add(mcLab);
  const mcLab2=makeLabel("· 团队副本入口 ·",7,"#ffb060","rgba(120,30,8,.9)");
  mcLab2.position.set(BR_PORTAL_MC.x,12.1,BR_PORTAL_MC.z); root.add(mcLab2);

  const _npcLy=(BAL.npc&&BAL.npc.labelY)||3.85;
  const _npcMy=(BAL.npc&&BAL.npc.markerY)||6.55;
  const _npcLw=(BAL.npc&&BAL.npc.labelW)||3.6;
  brScout=typeof tintNpcCloth==="function"?tintNpcCloth(buildVendor(),0x4a1810):buildVendor();
  brScout.position.set(4,0,6); brScout.rotation.y=Math.PI; root.add(brScout);
  const scoutLab=makeNameplate("斥候 · 黑牙",BAL.npcLevel.br_scout||22,{w:_npcLw,friendly:true,color:"#ff9060"});
  scoutLab.position.set(4,_npcLy,6); root.add(scoutLab);
  updateNameplateHp(scoutLab,1,1);

  brSpirit=buildSpiritHealer();
  brSpirit.position.set(-8,0,12); root.add(brSpirit);
  const spLab=makeNameplate("灵魂医者 · 岩烬",BAL.npcLevel.spirit,{w:_npcLw+.2,friendly:true,color:"#a8d8ff",glow:"rgba(40,80,120,.9)"});
  spLab.position.set(-8,_npcLy,12); root.add(spLab);
  updateNameplateHp(spLab,1,1);

  brMarkerExcl=makeQuestMark("offer");
  brMarkerExcl.position.set(4,_npcMy,6); root.add(brMarkerExcl);
  brMarkerExclGrey=makeQuestMark("low");
  brMarkerExclGrey.position.copy(brMarkerExcl.position); brMarkerExclGrey.visible=false; root.add(brMarkerExclGrey);
  brMarkerQ=makeQuestMark("turnin");
  brMarkerQ.position.copy(brMarkerExcl.position); brMarkerQ.visible=false; root.add(brMarkerQ);

  placeProp(root,buildGraveyard({size:.95}),-6,14,Math.PI*.2);
  if(typeof registerGraveyard==="function"){
    registerGraveyard("blackrock",-6,14,"camp");
    registerGraveyard("blackrock",BR_PORTAL_MC.x+6,BR_PORTAL_MC.z+10,"portal");
  }
  placeProp(root,buildGraveyard({size:.9}),BR_PORTAL_MC.x+6,BR_PORTAL_MC.z+10,-.2);
  if(BAL.death&&BAL.death.spawns)BAL.death.spawns.blackrock={x:-6,z:14};

  /* 山脊野怪：熔渣 · 烬狼 */
  [[-70,-40],[-100,10],[-50,-80],[60,-60],[90,20],[-80,50],[40,-100],[-120,-20],[70,60],[-30,90]].forEach(([x,z])=>{
    if(typeof spawnMob==="function")spawnMob("slagimp",x,z,null,{zoneId:"blackrock"});
  });
  [[-90,-70],[80,-30],[-40,70],[100,-80],[50,40],[-110,30]].forEach(([x,z])=>{
    if(typeof spawnMob==="function")spawnMob("cinderwolf",x,z,null,{zoneId:"blackrock"});
  });
  if(typeof spawnRaresForZone==="function")spawnRaresForZone("blackrock");

  if(typeof spawnGatherNodesForZone==="function"){
    spawnGatherNodesForZone("blackrock",root,{
      radius:BLACKROCK_R,
      camp:{x:0,z:0},
      portals:[{x:BR_PORTAL_S.x,z:BR_PORTAL_S.z},{x:BR_PORTAL_MC.x,z:BR_PORTAL_MC.z}],
    });
  }
  updateBlackrockMarkers();
  const z=ZONES.blackrock;
  if(z)z.lights={heli:brHeli,sun:brSun,flames:brFlames,fill:_brSkyLights.fill};
}

function updateBlackrockMarkers(){
  if(!brMarkerExcl)return;
  const m={npcId:"br_scout",excl:brMarkerExcl,exclGrey:brMarkerExclGrey,q:brMarkerQ};
  if(typeof applyNpcQuestMarkerVisual==="function"){applyNpcQuestMarkerVisual(m);return;}
  if(typeof npcHasQuestOffer==="function"){
    brMarkerExcl.visible=npcHasQuestOffer("br_scout");
    brMarkerQ.visible=npcHasQuestTurnIn("br_scout");
    return;
  }
  brMarkerExcl.visible=false;
  brMarkerQ.visible=false;
}
function brScoutDist(){
  if(!brScout)return 999;
  return Math.hypot(player.position.x-brScout.position.x,player.position.z-brScout.position.z);
}
function brSpiritDist(){
  if(!brSpirit)return 999;
  return Math.hypot(player.position.x-brSpirit.position.x,player.position.z-brSpirit.position.z);
}

function openBlackrockScoutDialogue(){
  if(typeof closeVendorPanel==="function")closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🔥 斥候 · 黑牙";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  tx.textContent=T("zone.blackrock")+"腹的旋涡通向"+T("zone.molten_core")+"——团队副本。南门可回"+T("zone.orgrimmar")+"。带好队友再闯。";
  if(typeof appendNpcQuestButtons==="function")appendNpcQuestButtons("br_scout",btn);
  btn("离开",closeDialogue);
}

function openBlackrockSpiritDialogue(){
  if(typeof closeVendorPanel==="function")closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="👻 灵魂医者 · 岩烬";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  if(S.p.ghost){
    tx.textContent="熔岩旁的亡魂不太安分。我能接引你，但你会虚弱。";
    btn("在此复活（虚弱）",()=>{if(typeof resurrectAtSpiritHealer==="function")resurrectAtSpiritHealer();});
    btn("我再想想",closeDialogue);
  }else{
    tx.textContent="团本门口有墓地。倒下后可在此苏醒。";
    btn("明白了",closeDialogue);
  }
}

function tryInteractBlackrock(){
  if(typeof tryQuestGroundInteract==="function"&&tryQuestGroundInteract())return true;
  if(typeof pickNearestNpc!=="function")return false;
  const near=pickNearestNpc([
    {mesh:brSpirit,open:openBlackrockSpiritDialogue},
    {mesh:brScout,open:openBlackrockScoutDialogue},
  ]);
  if(near){near.open();return true;}
  return false;
}

registerZone({
  id:"blackrock",
  name:T("zone.blackrock"),
  scene:sceneBlackrock,
  build:buildBlackrockZone,
  music:"blackrock",
  mode:"world",
  levelRange:[14,20],
  boundsR:()=>BLACKROCK_R,
  dayNight:true,
  gates:{
    from_orgrimmar:{x:0,z:BLACKROCK_R-24},
    from_raid:{x:0,z:-(BLACKROCK_R-28)},
    camp:{x:0,z:0},
    spirit:{x:-8,z:12},
    default:{x:0,z:0},
  },
  portals:[{
    id:"to_orgrimmar_from_br",
    pos:()=>BR_PORTAL_S,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:T("zone.orgrimmar")+" · 兽人主城",
    logHint:"南行热风中，奥格瑞玛的鼓声隐约可闻……",
    requireAlive:true,
    autoEnter:true,
    targetZone:"orgrimmar",
    targetGate:"from_blackrock",
  },{
    id:"to_molten_core",
    pos:()=>BR_PORTAL_MC,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:T("zone.molten_core")+" · 团队副本",
    logHint:"灼热的气息从旋涡中渗出……走进即可进入炽心熔窟团本。",
    requireAlive:true,
    autoEnter:true,
    minLevel:()=>(BAL.blackrock&&BAL.blackrock.moltenMinLevel)||14,
    lockedAnnounce:()=>`等级不足！需要 Lv.${(BAL.blackrock&&BAL.blackrock.moltenMinLevel)||14}`,
    lockedLog:()=>`炽心熔窟团本需要更强的勇士——当前 Lv.${S.p.level}。`,
    targetZone:"molten_core",
    targetGate:"entrance",
  }],
  lights:{heli:null,sun:null,flames:brFlames},
  onEnter(fromId,gateId,opts){
    if(opts&&opts.silent)return;
    if(fromId==="orgrimmar")log("黑曜山脊与熔岩裂隙——你已踏入"+T("zone.blackrock")+"。","lg-sys");
    if(fromId==="molten_core")log(typeof T==="function"?T("zone.leave_molten_roar"):"你退出炽心熔窟，黑石山的热风扑面而来。","lg-sys");
    updateBlackrockMarkers();
    if(typeof updateQuest==="function")updateQuest();
  },
  onLeave(){},
});

console.info("[blackrock] 就绪：黑石山 · 炽心熔窟团本入口");
