/* ============================================================
   炽心 · ashen_canyon.js
   灰烬峡谷（plan-v4 STEP 22）：枯木 / 焦土 / 熔岩裂隙 · 6–12 级
   西接赤蹄草甸山口（非旋涡门）· 西口第二副本 stub（灰烬地穴）
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ srand worldRng BAL makeLabel）
          zones.js（registerZone）· sky.js（initZoneSky）
          models.js（buildVendor buildSpiritHealer tintNpcCloth
            buildHut buildTent buildFence buildWatchtower buildCampfire buildTotem
            buildMarketStall buildCratePile
            buildLonghouse buildWell buildVillageGate buildSignpost buildLanternPole buildHaystack BUILD_PAL placeProp buildGraveyard）
          creatures.js（buildQuadruped buildElemental）
          world.js（spawnMob MOBS pickNearestNpc appendNpcQuestButtons openVendor closeVendorPanel）
          combat.js 运行时（S log announce）
          quests.js 运行时（acceptQuest turnInQuest）
          professions.js 运行时（spawnGatherNodesForZone）
          rares.js 运行时（spawnRaresForZone）
          save.js 运行时（saveGame）
   [导出] sceneAshen ASHEN_R ASHEN_PORTAL_E ASHEN_PORTAL_W
          ashenHeli ashenSun ashenFlames
          buildAshenZone tryInteractAshen
          updateAshenMarkers emberScoutDist ashenSpiritDist emberVendorDist
   ============================================================ */
"use strict";

const ASHEN_R=BAL.ashenCanyon.radius;
const sceneAshen=new THREE.Scene();
/* 东口回莫高雷山口；西口地穴 stub；落点与门距开，防乒乓 */
const ASHEN_PORTAL_E=new THREE.Vector3(ASHEN_R-10,0,0);
const ASHEN_PORTAL_W=new THREE.Vector3(-(ASHEN_R-10),0,6);

let ashenHeli=null,ashenSun=null;
const ashenFlames=[];
let emberScout=null,emberScoutLabel=null;
let ashenSpirit=null,ashenSpiritLabel=null;
let emberVendor=null,emberVendorLabel=null;
let ashenMarkerExcl=null,ashenMarkerExclGrey=null,ashenMarkerQ=null;

function buildAshenZone(scn){
  const root=scn||sceneAshen;
  const D=BAL.ashenCanyon;
  root.background=new THREE.Color(D.sky);
  root.fog=new THREE.FogExp2(D.fog,D.fogDensity);

  ashenHeli=new THREE.HemisphereLight(D.hemiSky,D.hemiGround,D.hemiIntensity);
  root.add(ashenHeli);
  ashenSun=new THREE.DirectionalLight(D.sunColor,D.sunIntensity);
  ashenSun.position.set(35,65,18); ashenSun.castShadow=true;
  root.add(ashenSun);
  root.add(ashenSun.target);
  const _ashenSkyLights={heli:ashenHeli,sun:ashenSun};
  if(typeof initZoneSky==="function"){
    initZoneSky(root,_ashenSkyLights,{
      zenith:0x6a3020, horizon:D.sky, ground:D.dirt||0x3a2218, zoneId:"ashen_canyon",
    });
  }else{
    ashenSun.shadow.mapSize.set(2048,2048);
    ashenSun.shadow.camera.left=-100;ashenSun.shadow.camera.right=100;
    ashenSun.shadow.camera.top=100;ashenSun.shadow.camera.bottom=-100;
  }

  const ground=new THREE.Mesh(new THREE.CircleGeometry(ASHEN_R+32,64),
    MAT.get("dirt.ashen",{color:D.ground,roughness:1}));
  ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; root.add(ground);

  /* 焦土路：东口 → 烬营 */
  const dirtMat=MAT.get("dirt.ash_path",{color:D.dirt,roughness:1});
  for(let i=0;i<16;i++){
    const t=i/15;
    const x=ASHEN_PORTAL_E.x*(1-t)*.88;
    const seg=new THREE.Mesh(new THREE.CircleGeometry(srand(2.0,2.8),10),dirtMat);
    seg.rotation.x=-Math.PI/2;
    seg.position.set(x,.03,Math.sin(i*.55)*2.5);
    seg.receiveShadow=true; root.add(seg);
  }

  /* 灰烬峡谷：焦林 —— 枯木 + 扭曲树成片 */
  if(typeof placeZoneTrees==="function"){
    placeZoneTrees(root,{
      count:130, radius:ASHEN_R-10, minR:14, cx:0, cz:0,
      avoid:[{x:0,z:0,r:16}],
      weights:{pine:0,oak:.04,dead:.5,twisted:.46},
      baseScale:5.0, leafTint:0x6a5f52, barkTint:0x9a8070,
      heightFn:()=>0, seed:0xA54E41^WORLD_SEED,
      bush:true, bushCount:90, fern:false, clusters:6, rockCount:60,
    });
  }
  const rockMat=MAT.get("rock.ashen",{color:0x4a3028,emissive:0x501808,emissiveIntensity:.12});
  for(let i=0;i<20;i++){
    const a=srand(0,6.28),r=srand(20,ASHEN_R-12);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.hypot(x,z)<12)continue;
    const rk=new THREE.Mesh(new THREE.DodecahedronGeometry(srand(.5,1.5),0),rockMat);
    rk.position.set(x,srand(.25,.7),z); rk.rotation.set(srand(0,1),srand(0,6),srand(0,1));
    rk.castShadow=true; root.add(rk);
  }
  /* 熔岩裂隙装饰条 */
  const lavaMat=MAT.get("lava.rift",{color:0xff6020,emissive:0xff4010,emissiveIntensity:.85,roughness:.4});
  for(let i=0;i<7;i++){
    const lx=srand(-ASHEN_R*.55,ASHEN_R*.35), lz=srand(-ASHEN_R*.5,ASHEN_R*.5);
    if(Math.hypot(lx,lz)<22)continue;
    const rift=new THREE.Mesh(new THREE.BoxGeometry(srand(1.2,2.4),.12,srand(4,9)),lavaMat);
    rift.position.set(lx,.06,lz); rift.rotation.y=srand(0,6.28); root.add(rift);
  }

  const P=BUILD_PAL.ashen;
  /* 烬营：扩大 · 村门 · 瞭望塔 · 长屋 · 小屋群 · 帐篷 · 市集 */
  placeProp(root,buildVillageGate({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),4,-18,.2);
  placeProp(root,buildVillageGate({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),-4,-18,-.2);
  placeProp(root,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1}),0,0,0);
  placeProp(root,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1}),-22,10,.3);
  placeProp(root,buildLonghouse({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),-2,4,0);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),-18,12,.4);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),16,14,-.3);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),-22,-8,.5);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),20,-10,-.4);
  placeProp(root,buildTent({hide:P.hide,stake:P.stake,size:1}),14,-16,.3);
  placeProp(root,buildTent({hide:0x6a3020,stake:P.stake,size:1}),-20,-10,.6);
  placeProp(root,buildTent({hide:P.hide,stake:P.stake,size:1}),-12,18,-.2);
  placeProp(root,buildMarketStall({wood:P.wood,woodD:P.woodD,cloth:0x8a3020,size:1}),-10,-8,Math.PI*.3);
  placeProp(root,buildMarketStall({wood:P.wood,woodD:P.woodD,cloth:0x6a4a20,size:1}),12,6,-.15);
  placeProp(root,buildCratePile({wood:P.wood,woodD:P.woodD,size:1}),-8,-12,.2);
  placeProp(root,buildCratePile({wood:P.wood,woodD:P.woodD,size:1}),14,-8,-.3);
  placeProp(root,buildTotem({wood:P.woodD,paintA:0xd02810,paintB:0xa05030,size:1}),8,6,0);
  placeProp(root,buildTotem({wood:P.woodD,paintA:0xa05030,paintB:0xd02810,size:1}),-12,-6,0);
  placeProp(root,buildWell({stone:0x6a5a50,wood:P.woodD,size:1}),-2,0,0);
  placeProp(root,buildHaystack({color:0xb8a060,size:1}),12,-18,0);
  placeProp(root,buildHaystack({color:0xa88850,size:1}),-10,16,0);
  placeProp(root,buildLanternPole({wood:0x4a3020,size:1}),2,-16,0);
  placeProp(root,buildLanternPole({wood:0x4a3020,size:1}),-8,-14,0);
  placeProp(root,buildLanternPole({wood:0x4a3020,size:1}),12,-12,0);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:18,posts:8}),-26,2,Math.PI/2);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:16,posts:7}),8,-24,0);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:16,posts:7}),24,0,-Math.PI/2);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:14,posts:6}),-4,20,Math.PI);
  placeProp(root,buildSignpost({wood:0x4a3020,size:1}),2,-16,0);

  [[-6,8],[10,-4],[16,10]].forEach(([x,z],i)=>{
    const cf=placeProp(root,buildCampfire({
      flame:i?0xff8030:0xffa040, light:0xff6020, size:1,
    }),x,z,0);
    if(cf&&cf.userData.flame)ashenFlames.push(cf.userData.flame);
  });

  /* 东口 · 山口回草甸（石门，无旋涡） */
  const gateMat=MAT.get("rock.ashen_gate",{color:0x3a2a22,roughness:.95,flatShading:true,emissive:0x5a2810,emissiveIntensity:.2});
  const ePlat=new THREE.Mesh(new THREE.BoxGeometry(9,1.1,12),gateMat);
  ePlat.position.set(ASHEN_PORTAL_E.x,.45,ASHEN_PORTAL_E.z); ePlat.receiveShadow=true; root.add(ePlat);
  [[-5],[5]].forEach(([sz])=>{
    const cliff=new THREE.Mesh(new THREE.BoxGeometry(4,10,5.5),gateMat);
    cliff.position.set(ASHEN_PORTAL_E.x+1,5.2,ASHEN_PORTAL_E.z+sz); cliff.castShadow=true; root.add(cliff);
  });
  const eArch=new THREE.Mesh(new THREE.BoxGeometry(3,2,11),gateMat);
  eArch.position.set(ASHEN_PORTAL_E.x+1,10.8,ASHEN_PORTAL_E.z); root.add(eArch);
  const eMouth=new THREE.Mesh(new THREE.PlaneGeometry(7,8.5),
    MAT.get("pass.ashen_e",{color:0x140806,roughness:1,emissive:0x381808,emissiveIntensity:.3,side:THREE.DoubleSide}));
  eMouth.position.set(ASHEN_PORTAL_E.x-.2,4.8,ASHEN_PORTAL_E.z); eMouth.rotation.y=-Math.PI/2; root.add(eMouth);
  const eLab=makeLabel(T("zone.mulgore"),11,"#e8c898","rgba(100,50,20,.9)");
  eLab.position.set(ASHEN_PORTAL_E.x,12.4,ASHEN_PORTAL_E.z); root.add(eLab);
  const eLab2=makeLabel("山口通道",7,"#d0a070","rgba(80,35,12,.85)");
  eLab2.position.set(ASHEN_PORTAL_E.x,11.1,ASHEN_PORTAL_E.z); root.add(eLab2);

  /* 西口 · 灰烬地穴 stub（STEP 24） */
  const cryptMat=MAT.get("lava.crypt_gate",{color:0x4a1810,roughness:.9,flatShading:true,emissive:0xff4000,emissiveIntensity:.3});
  const wPlat=new THREE.Mesh(new THREE.CylinderGeometry(6,7,1,12),cryptMat);
  wPlat.position.set(ASHEN_PORTAL_W.x,.5,ASHEN_PORTAL_W.z); wPlat.receiveShadow=true; root.add(wPlat);
  [[-3.2],[3.2]].forEach(([sz])=>{
    const pil=new THREE.Mesh(new THREE.BoxGeometry(1.4,8,1.4),cryptMat);
    pil.position.set(ASHEN_PORTAL_W.x,4.5,ASHEN_PORTAL_W.z+sz); pil.castShadow=true; root.add(pil);
  });
  const wLintel=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.3,8.2),cryptMat);
  wLintel.position.set(ASHEN_PORTAL_W.x,8.8,ASHEN_PORTAL_W.z); root.add(wLintel);
  const wSeal=new THREE.Mesh(new THREE.CircleGeometry(2.4,28),
    MAT.get("seal.crypt",{color:0x2a0804,emissive:0xff5010,emissiveIntensity:.55,side:THREE.DoubleSide}));
  wSeal.position.set(ASHEN_PORTAL_W.x,4.2,ASHEN_PORTAL_W.z); wSeal.rotation.y=Math.PI/2; root.add(wSeal);
  const wLab=makeLabel(T("zone.hollow_crypt"),11,"#ff9060","rgba(90,25,8,.9)");
  wLab.position.set(ASHEN_PORTAL_W.x,11.5,ASHEN_PORTAL_W.z); root.add(wLab);
  const wLab2=makeLabel("封印未开 · 筹备中",8,"#ffb090","rgba(70,18,6,.85)");
  wLab2.position.set(ASHEN_PORTAL_W.x,10.2,ASHEN_PORTAL_W.z); root.add(wLab2);

  const _npcLy=(BAL.npc&&BAL.npc.labelY)||4.05, _npcMy=(BAL.npc&&BAL.npc.markerY)||5.15, _npcLw=(BAL.npc&&BAL.npc.labelW)||6.2;
  emberScout=tintNpcCloth(buildVendor(),0x6a2818);
  emberScout.position.set(4,0,-4); emberScout.rotation.y=Math.PI;
  root.add(emberScout);
  emberScoutLabel=makeNameplate("斥候 · 烬羽",BAL.npcLevel.ember_scout,{w:_npcLw,friendly:true,color:"#ffb070"});
  emberScoutLabel.position.set(4,_npcLy,-4); root.add(emberScoutLabel);
  updateNameplateHp(emberScoutLabel,1,1);

  emberVendor=buildVendor();
  emberVendor.position.set(-12,0,-10); emberVendor.rotation.y=Math.PI*.4;
  root.add(emberVendor);
  emberVendorLabel=makeNameplate("商人 · 焦炭",BAL.npcLevel.ember_vendor,{w:_npcLw,friendly:true,color:"#a8e8c0"});
  emberVendorLabel.position.set(-12,_npcLy,-10); root.add(emberVendorLabel);
  updateNameplateHp(emberVendorLabel,1,1);

  ashenSpirit=buildSpiritHealer();
  ashenSpirit.position.set(-6,0,20); ashenSpirit.rotation.y=Math.PI;
  root.add(ashenSpirit);
  ashenSpiritLabel=makeNameplate("灵魂医者 · 灰烬风",BAL.npcLevel.spirit,{w:_npcLw+.2,friendly:true,color:"#a8d8ff",glow:"rgba(40,80,120,.9)"});
  ashenSpiritLabel.position.set(-6,_npcLy,20); root.add(ashenSpiritLabel);
  updateNameplateHp(ashenSpiritLabel,1,1);
  placeProp(root,buildGraveyard(),-4,22,Math.PI*.25);
  registerGraveyard("ashen_canyon",-4,22,"camp");
  if(BAL.death&&BAL.death.spawns)BAL.death.spawns.ashen_canyon={x:-4,z:22};
  placeProp(root,buildGraveyard({size:.85}),ASHEN_PORTAL_W.x+8,ASHEN_PORTAL_W.z+5,0);
  registerGraveyard("ashen_canyon",ASHEN_PORTAL_W.x+8,ASHEN_PORTAL_W.z+5,"portal_crypt");

  ashenMarkerExcl=makeQuestMark("offer");
  ashenMarkerExcl.position.set(4,_npcMy,-4); root.add(ashenMarkerExcl);
  ashenMarkerExclGrey=makeQuestMark("low");
  ashenMarkerExclGrey.position.copy(ashenMarkerExcl.position); ashenMarkerExclGrey.visible=false; root.add(ashenMarkerExclGrey);
  ashenMarkerQ=makeQuestMark("turnin");
  ashenMarkerQ.position.copy(ashenMarkerExcl.position); ashenMarkerQ.visible=false; root.add(ashenMarkerQ);

  /* 野怪：灰烬野猪 · 烬狼 · 熔渣小鬼 */
  [[-90,-50],[-110,-20],[-70,-80],[70,60],[90,30],[-50,90],[60,-70],[-120,40],[-80,10],[40,100]].forEach(([x,z])=>{
    spawnMob("ashboar",x,z,null,{zoneId:"ashen_canyon"});
  });
  [[-140,20],[-100,70],[100,-90],[-60,110],[80,-50],[-160,-40]].forEach(([x,z])=>{
    spawnMob("cinderwolf",x,z,null,{zoneId:"ashen_canyon"});
  });
  [[-40,-120],[120,50],[-130,-70],[50,-100]].forEach(([x,z])=>{
    spawnMob("slagimp",x,z,null,{zoneId:"ashen_canyon"});
  });

  if(typeof spawnRaresForZone==="function")spawnRaresForZone("ashen_canyon");
  updateAshenMarkers();
  if(typeof spawnGatherNodesForZone==="function"){
    spawnGatherNodesForZone("ashen_canyon",root,{
      radius:ASHEN_R,
      camp:{x:0,z:0},
      portals:[{x:ASHEN_PORTAL_E.x,z:ASHEN_PORTAL_E.z},{x:ASHEN_PORTAL_W.x,z:ASHEN_PORTAL_W.z}],
    });
  }
  const z=ZONES.ashen_canyon;
  if(z)z.lights={heli:ashenHeli,sun:ashenSun,flames:ashenFlames,fill:_ashenSkyLights.fill};
}

function updateAshenMarkers(){
  if(!ashenMarkerExcl)return;
  const m={npcId:"ember_scout",excl:ashenMarkerExcl,exclGrey:ashenMarkerExclGrey,q:ashenMarkerQ};
  if(typeof applyNpcQuestMarkerVisual==="function"){applyNpcQuestMarkerVisual(m);return;}
  if(typeof npcHasQuestOffer==="function"){
    ashenMarkerExcl.visible=npcHasQuestOffer("ember_scout");
    ashenMarkerQ.visible=npcHasQuestTurnIn("ember_scout");
    return;
  }
  ashenMarkerExcl.visible=true;
  ashenMarkerQ.visible=false;
}

function emberScoutDist(){
  if(!emberScout)return 999;
  return Math.hypot(player.position.x-emberScout.position.x,player.position.z-emberScout.position.z);
}
function ashenSpiritDist(){
  if(!ashenSpirit)return 999;
  return Math.hypot(player.position.x-ashenSpirit.position.x,player.position.z-ashenSpirit.position.z);
}
function emberVendorDist(){
  if(!emberVendor)return 999;
  return Math.hypot(player.position.x-emberVendor.position.x,player.position.z-emberVendor.position.z);
}

function tryInteractAshen(){
  if(typeof tryQuestGroundInteract==="function"&&tryQuestGroundInteract())return;
  const near=pickNearestNpc([
    {mesh:ashenSpirit,open:openAshenSpiritDialogue},
    {mesh:emberScout,open:openEmberScoutDialogue},
    {mesh:emberVendor,open:()=>openVendor("ember_vendor","🏕️ 商人 · 焦炭")},
  ]);
  if(near)near.open();
}

function openAshenSpiritDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="👻 灵魂医者 · 灰烬风";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  if(S.p.ghost){
    tx.textContent="峡谷的风带着硫磺。我能强行接引你——代价是虚弱。跑回尸体更稳妥。";
    btn("在此复活（虚弱）",()=>{if(typeof resurrectAtSpiritHealer==="function")resurrectAtSpiritHealer();});
    btn("我再想想",closeDialogue);
  }else{
    tx.textContent="灰烬峡谷的亡者不会安息太久。若你倒下，释放灵魂后我会在烬营旁接引你。";
    btn("感谢您，医者",closeDialogue);
  }
}

function openEmberScoutDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🔥 斥候 · 烬羽";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  tx.textContent="焦土与枯木之间，裂隙正往西蔓延。帮烬营清出一条路——地穴封印还压着，但探路不能停。";
  if(typeof appendNpcQuestButtons==="function")appendNpcQuestButtons("ember_scout",btn);
  btn("离开",closeDialogue);
}

registerZone({
  id:"ashen_canyon",
  name:T("zone.ashen_canyon"),
  scene:sceneAshen,
  build:buildAshenZone,
  music:"ashen",
  mode:"world",
  levelRange:[6,12],
  boundsR:()=>ASHEN_R,
  dayNight:true,
  gates:{
    from_mulgore:{x:ASHEN_R-24,z:0},
    from_crypt:{x:-(ASHEN_R-24),z:6},
    camp:{x:0,z:0},
    spirit:{x:0,z:8},
    default:{x:0,z:0},
  },
  portals:[{
    id:"to_mulgore_from_ashen",
    pos:()=>ASHEN_PORTAL_E,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>(BAL.zones.portalEnterR||4.5)+1.2,
    announce:T("zone.mulgore")+" · 山口通道",
    logHint:"东侧山口吹来草原的风……走进石门即可返回"+T("zone.mulgore")+"。",
    requireAlive:true,
    autoEnter:true,
    targetZone:"mulgore",
    targetGate:"from_ashen",
  },{
    id:"to_hollow_crypt",
    pos:()=>ASHEN_PORTAL_W,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:T("zone.hollow_crypt")+" · 封印未开",
    logHint:"西侧裂隙被封印压制……第二副本将在后续版本开放（STEP 24）。",
    requireAlive:true,
    autoEnter:false,
    minLevel:()=>(BAL.ashenCanyon&&BAL.ashenCanyon.cryptMinLevel)||12,
    lockedAnnounce:()=>`${T("zone.hollow_crypt")}封印未开（筹备中）`,
    lockedLog:()=>`灰烬地穴的封印仍在震动——当前为筹备中入口，正式挑战见后续版本。`,
  }],
  onEnter(fromId,gateId,opts){
    if(opts&&opts.silent)return;
    if(fromId==="mulgore")log("焦土的热浪迎面扑来——你已踏入"+T("zone.ashen_canyon")+"。","lg-sys");
    updateAshenMarkers();
    if(typeof updateQuest==="function")updateQuest();
  },
  onLeave(){},
});

console.info("[ashen] STEP 22 就绪：灰烬峡谷 · 烬营 · 山口 · 地穴 stub");
