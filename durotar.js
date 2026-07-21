/* ============================================================
   熔火之心 · durotar.js
   赭岩谷（plan-v1 · V1-B1）：橙土 / 兽人哨站风 / 巨蝎·刺脊·崖风鹰身
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ srand worldRng BAL makeLabel）
          zones.js（registerZone）
          models.js（buildQuadruped buildHumanoidMob buildVendor buildSpiritHealer buildElder tintNpcCloth
            buildHut buildTent buildFence buildWatchtower buildCampfire buildTotem
            buildMarketStall buildCratePile BUILD_PAL placeProp）
          world.js（spawnMob MOBS pickNearestNpc appendNpcQuestButtons openVendor closeVendorPanel）
          combat.js 运行时（S log announce）
          quests.js 运行时（acceptQuest turnInQuest questsForNpc）
          professions.js 运行时（spawnGatherNodesForZone）
          rares.js 运行时（spawnRaresForZone）
          save.js 运行时（saveGame）
   [导出] sceneDurotar DUROTAR_R DUROTAR_PORTAL_E
          durotarHeli durotarSun durotarFlames
          buildDurotarZone tryInteractDurotar
          updateDurotarMarkers ochreOutpostDist durotarSpiritDist ochreVendorDist ochreGuardDist
   ============================================================ */
"use strict";

const DUROTAR_R=BAL.durotar.radius;
const sceneDurotar=new THREE.Scene();
/* 东口回贫瘠；落点与门距开，防乒乓 */
const DUROTAR_PORTAL_E=new THREE.Vector3(DUROTAR_R-10,0,0);

let durotarHeli=null,durotarSun=null;
const durotarFlames=[];
let ochreOutpost=null,ochreOutpostLabel=null;
let durotarSpirit=null,durotarSpiritLabel=null;
let ochreVendor=null,ochreVendorLabel=null;
let ochreGuard=null,ochreGuardLabel=null;
let durotarMarkerExcl=null,durotarMarkerQ=null;
let durotarPortalUni=null;

function buildDurotarZone(scn){
  const root=scn||sceneDurotar;
  const D=BAL.durotar;
  root.background=new THREE.Color(D.sky);
  root.fog=new THREE.FogExp2(D.fog,D.fogDensity);

  durotarHeli=new THREE.HemisphereLight(D.hemiSky,D.hemiGround,D.hemiIntensity);
  root.add(durotarHeli);
  durotarSun=new THREE.DirectionalLight(D.sunColor,D.sunIntensity);
  durotarSun.position.set(40,70,20); durotarSun.castShadow=true;
  durotarSun.shadow.mapSize.set(2048,2048);
  durotarSun.shadow.camera.left=-100;durotarSun.shadow.camera.right=100;
  durotarSun.shadow.camera.top=100;durotarSun.shadow.camera.bottom=-100;
  root.add(durotarSun);

  const ground=new THREE.Mesh(new THREE.CircleGeometry(DUROTAR_R+36,64),
    new THREE.MeshStandardMaterial({color:D.ground,roughness:1}));
  ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; root.add(ground);

  const dirtMat=new THREE.MeshStandardMaterial({color:D.dirt,roughness:1});
  for(let i=0;i<14;i++){
    const t=i/13;
    const x=DUROTAR_PORTAL_E.x*(1-t)*.85;
    const seg=new THREE.Mesh(new THREE.CircleGeometry(srand(2.2,3.0),10),dirtMat);
    seg.rotation.x=-Math.PI/2;
    seg.position.set(x,.03,Math.sin(i*.7)*3);
    seg.receiveShadow=true; root.add(seg);
  }

  /* 橙岩碎块 */
  const rockMat=new THREE.MeshStandardMaterial({color:0xa85830,roughness:1,flatShading:true});
  for(let i=0;i<16;i++){
    const a=srand(0,6.28),r=srand(16,DUROTAR_R-14);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.hypot(x,z)<12)continue;
    const rk=new THREE.Mesh(new THREE.DodecahedronGeometry(srand(.6,1.4),0),rockMat);
    rk.position.set(x,srand(.3,.7),z); rk.rotation.set(srand(0,1),srand(0,6),srand(0,1));
    rk.castShadow=true; root.add(rk);
  }

  const P=BUILD_PAL.durotar;
  /* 赭岩哨站：扩大 · 市集 · 双塔 · 围栏 */
  placeProp(root,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1.05}),0,0,0);
  placeProp(root,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:.72}),14,-10,-.4);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1.05}),-12,8,.35);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),14,6,-.5);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:0x9a5030,size:.95}),-10,-12,Math.PI*.7);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,w:3.2,d:2.8,size:.85}),8,12,.2);
  placeProp(root,buildTent({hide:P.hide,stake:P.stake,r:2.9,h:3.9,size:1.05}),12,-10,.2);
  placeProp(root,buildTent({hide:0xc07040,stake:P.stake,r:2.4,h:3.4,size:.9}),-14,-4,.5);
  placeProp(root,buildMarketStall({wood:P.wood,woodD:P.woodD,cloth:0x8a4020,size:1}),-6,-6,Math.PI*.25);
  placeProp(root,buildCratePile({wood:P.wood,woodD:P.woodD,size:1}),-4,-8,.2);
  placeProp(root,buildTotem({wood:P.woodD,paintA:0xd03018,paintB:0xc07040,size:.85}),6,2,0);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:12,posts:7}),-16,2,Math.PI/2);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:11,posts:7}),6,-16,0);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:11,posts:7}),16,0,-Math.PI/2);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:10,posts:6}),-2,16,Math.PI);

  /* 营火 */
  [[-4,4],[6,-3],[10,6]].forEach(([x,z],i)=>{
    const cf=placeProp(root,buildCampfire({
      flame:i?0xff9030:0xffa030, light:0xff7a28, size:i===2?.75:1,
    }),x,z,0);
    if(cf&&cf.userData.flame)durotarFlames.push(cf.userData.flame);
  });

  /* 东口 → 贫瘠之地 */
  const gateMat=new THREE.MeshStandardMaterial({color:0x6a3a18,roughness:.9,flatShading:true,
    emissive:0x8a4020,emissiveIntensity:.18});
  const ePlat=new THREE.Mesh(new THREE.CylinderGeometry(6.5,7.5,1,12),gateMat);
  ePlat.position.set(DUROTAR_PORTAL_E.x,.5,DUROTAR_PORTAL_E.z); ePlat.receiveShadow=true; root.add(ePlat);
  [[-3.2],[3.2]].forEach(([sz])=>{
    const pil=new THREE.Mesh(new THREE.BoxGeometry(1.4,8.2,1.4),gateMat);
    pil.position.set(DUROTAR_PORTAL_E.x,4.6,DUROTAR_PORTAL_E.z+sz); pil.castShadow=true; root.add(pil);
  });
  const eLintel=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.3,8.5),gateMat);
  eLintel.position.set(DUROTAR_PORTAL_E.x,9.0,DUROTAR_PORTAL_E.z); root.add(eLintel);
  durotarPortalUni={uTime:{value:0}};
  const eDisc=new THREE.Mesh(new THREE.CircleGeometry(2.7,36),new THREE.ShaderMaterial({
    uniforms:durotarPortalUni,transparent:true,side:THREE.DoubleSide,depthWrite:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;uniform float uTime;
      void main(){
        vec2 p=vUv-.5; float r=length(p)*2.; float ang=atan(p.y,p.x);
        float sw=sin(ang*2.6-uTime*2.+r*6.);
        vec3 c=mix(vec3(.9,.55,.25),vec3(.5,.22,.08),smoothstep(-.5,.7,sw));
        c=mix(c,vec3(.1,.04,0.),smoothstep(.7,1.,r));
        gl_FragColor=vec4(c*1.15,smoothstep(1.,.88,r));
      }`}));
  eDisc.position.set(DUROTAR_PORTAL_E.x,4.5,DUROTAR_PORTAL_E.z); eDisc.rotation.y=Math.PI/2; root.add(eDisc);
  const eLab=makeLabel("贫瘠之地",11,"#e8c898","rgba(120,70,30,.9)");
  eLab.position.set(DUROTAR_PORTAL_E.x,11.8,DUROTAR_PORTAL_E.z); root.add(eLab);

  const _npcLy=(BAL.npc&&BAL.npc.labelY)||4.05, _npcMy=(BAL.npc&&BAL.npc.markerY)||5.15, _npcLw=(BAL.npc&&BAL.npc.labelW)||6.2;
  ochreOutpost=tintNpcCloth(buildVendor(),0x8a4020);
  ochreOutpost.position.set(2,0,-2); ochreOutpost.rotation.y=Math.PI;
  root.add(ochreOutpost);
  ochreOutpostLabel=makeNameplate("斥候 · 赤牙",BAL.npcLevel.ochre,{w:_npcLw,friendly:true,color:"#ffb070"});
  ochreOutpostLabel.position.set(2,_npcLy,-2); root.add(ochreOutpostLabel);
  updateNameplateHp(ochreOutpostLabel,1,1);

  ochreVendor=buildVendor();
  ochreVendor.position.set(-8,0,-6); ochreVendor.rotation.y=Math.PI*.35;
  root.add(ochreVendor);
  ochreVendorLabel=makeNameplate("商人 · 赤蹄",BAL.npcLevel.ochre_vendor,{w:_npcLw,friendly:true,color:"#a8e8c0"});
  ochreVendorLabel.position.set(-8,_npcLy,-6); root.add(ochreVendorLabel);
  updateNameplateHp(ochreVendorLabel,1,1);

  ochreGuard=tintNpcCloth(buildElder(),0x6a3018);
  ochreGuard.position.set(10,0,6); ochreGuard.rotation.y=Math.PI*1.15;
  root.add(ochreGuard);
  ochreGuardLabel=makeNameplate("卫士 · 焦刺",BAL.npcLevel.ochre_guard,{w:_npcLw,friendly:true,color:"#ff9a70"});
  ochreGuardLabel.position.set(10,_npcLy,6); root.add(ochreGuardLabel);
  updateNameplateHp(ochreGuardLabel,1,1);

  durotarSpirit=buildSpiritHealer();
  durotarSpirit.position.set(-4,0,12); durotarSpirit.rotation.y=Math.PI;
  root.add(durotarSpirit);
  durotarSpiritLabel=makeNameplate("灵魂医者 · 焦风",BAL.npcLevel.spirit,{w:_npcLw+.2,friendly:true,color:"#a8d8ff",glow:"rgba(40,80,120,.9)"});
  durotarSpiritLabel.position.set(-4,_npcLy,12); root.add(durotarSpiritLabel);
  updateNameplateHp(durotarSpiritLabel,1,1);

  durotarMarkerExcl=makeLabel("❗",2.8,"#ffd76a","rgba(0,0,0,.55)");
  durotarMarkerExcl.position.set(2,_npcMy,-2); root.add(durotarMarkerExcl);
  durotarMarkerQ=makeLabel("❓",2.8,"#ffd76a","rgba(0,0,0,.55)");
  durotarMarkerQ.position.copy(durotarMarkerExcl.position); durotarMarkerQ.visible=false; root.add(durotarMarkerQ);

  /* 野怪：巨蝎群、刺脊野猪人、崖风鹰身精英（V1-B2 增驻点） */
  [[-56,-36],[-68,-16],[-44,-48],[48,40],[60,24],[-36,56],[40,-30],[-70,30],[-50,10]].forEach(([x,z])=>{
    spawnMob("scorp",x,z,null,{zoneId:"durotar"});
  });
  [[-80,20],[-72,36],[64,-40],[-60,50],[50,-50]].forEach(([x,z])=>{
    spawnMob("razorback",x,z,null,{zoneId:"durotar"});
  });
  spawnMob("cliffHarpy",76,-56,null,{zoneId:"durotar"});
  spawnMob("cliffHarpy",-90,-40,null,{zoneId:"durotar"});

  if(typeof spawnRaresForZone==="function")spawnRaresForZone("durotar");
  updateDurotarMarkers();
  if(typeof spawnGatherNodesForZone==="function"){
    spawnGatherNodesForZone("durotar",root,{
      radius:DUROTAR_R,
      camp:{x:0,z:0},
      portals:[{x:DUROTAR_PORTAL_E.x,z:DUROTAR_PORTAL_E.z}],
    });
  }
  const z=ZONES.durotar;
  if(z)z.lights={heli:durotarHeli,sun:durotarSun,flames:durotarFlames};
}

function updateDurotarMarkers(){
  if(!durotarMarkerExcl)return;
  if(typeof npcHasQuestOffer==="function"){
    durotarMarkerExcl.visible=npcHasQuestOffer("ochre_outpost");
    durotarMarkerQ.visible=npcHasQuestTurnIn("ochre_outpost");
    return;
  }
  if(typeof questStatus==="function"){
    durotarMarkerExcl.visible=questStatus("ochre_sting")==="none";
    durotarMarkerQ.visible=questStatus("ochre_sting")==="ready";
    return;
  }
  durotarMarkerExcl.visible=true;
  durotarMarkerQ.visible=false;
}

function ochreOutpostDist(){
  if(!ochreOutpost)return 999;
  return Math.hypot(player.position.x-ochreOutpost.position.x,player.position.z-ochreOutpost.position.z);
}
function durotarSpiritDist(){
  if(!durotarSpirit)return 999;
  return Math.hypot(player.position.x-durotarSpirit.position.x,player.position.z-durotarSpirit.position.z);
}
function ochreVendorDist(){
  if(!ochreVendor)return 999;
  return Math.hypot(player.position.x-ochreVendor.position.x,player.position.z-ochreVendor.position.z);
}
function ochreGuardDist(){
  if(!ochreGuard)return 999;
  return Math.hypot(player.position.x-ochreGuard.position.x,player.position.z-ochreGuard.position.z);
}

function tryInteractDurotar(){
  const near=pickNearestNpc([
    {mesh:durotarSpirit,open:openDurotarSpiritDialogue},
    {mesh:ochreOutpost,open:openOchreDialogue},
    {mesh:ochreVendor,open:()=>openVendor("ochre_vendor","🏕️ 商人 · 赤蹄")},
    {mesh:ochreGuard,open:openOchreGuardDialogue},
  ]);
  if(near)near.open();
}

function openDurotarSpiritDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="👻 灵魂医者 · 焦风";
  dlg.style.display="block"; bts.innerHTML="";
  tx.textContent="赭岩的风很烫，旅人。若你倒下，释放灵魂后我会在哨站旁接引你。";
  const b=document.createElement("button");
  b.className="dbtn";b.textContent="感谢您，医者";b.onclick=closeDialogue;bts.appendChild(b);
}

function openOchreGuardDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🛡 卫士 · 焦刺";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  tx.textContent="谷地不安宁。巨蝎、刺脊、崖上的鹰身——清剿事务找我。";
  appendNpcQuestButtons("ochre_guard",btn);
  btn("离开",closeDialogue);
}

function openOchreDialogue(){
  closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🗼 斥候 · 赤牙";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  const need=(BAL.quest.durotar&&BAL.quest.durotar.scorpKills)|5;

  if(typeof canTurnInQuest==="function"&&canTurnInQuest("ochre_sting")){
    tx.textContent="干得漂亮！蝎群退了，补给线能喘口气。西边刺脊野猪人还在闹——有空再清一清。";
    btn("✦ 领取奖励 · 赭岩毒刺",()=>{
      turnInQuest("ochre_sting");
      spawnBurst(player.position.clone().setY(1.5),0xff9040,28,2);
      closeDialogue();
    });
  }else if(typeof canAcceptQuest==="function"&&canAcceptQuest("ochre_sting")){
    tx.textContent="欢迎来到赭岩哨站。西南谷地的巨蝎堵住了商路，清剿几只，让焦土重新能走人。";
    btn("✦ 接受任务：赭岩毒刺",()=>{acceptQuest("ochre_sting");closeDialogue();});
  }else if(typeof questStatus==="function"&&questStatus("ochre_sting")==="active"){
    const k=questProgress("ochre_sting").kills|0;
    tx.textContent=`巨蝎还在谷地游荡（${k}/${need}）。干完再来找我。`;
  }else{
    tx.textContent="赭岩谷热得很。买卖找赤蹄，清剿找焦刺；东边旋涡通往贫瘠之地。";
  }

  appendNpcQuestButtons("ochre_outpost",btn,null,["ochre_sting"]);
  btn("离开",closeDialogue);
}

registerZone({
  id:"durotar",
  name:"赭岩谷",
  scene:sceneDurotar,
  build:buildDurotarZone,
  music:"durotar",
  mode:"world",
  levelRange:[12,18],
  boundsR:()=>DUROTAR_R,
  dayNight:true,
  gates:{
    from_barrens:{x:DUROTAR_R-24,z:0},
    outpost:{x:0,z:0},
    spirit:{x:0,z:6},
    default:{x:0,z:0},
  },
  portals:[{
    id:"to_barrens_from_durotar",
    pos:()=>DUROTAR_PORTAL_E,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:"贫瘠之地 · 十字路口",
    logHint:"东行热风中，贫瘠之地的荒原轮廓隐约可见……",
    requireAlive:true,
    autoEnter:true,
    targetZone:"barrens",
    targetGate:"from_durotar",
  }],
  onEnter(fromId,gateId,opts){
    if(opts&&opts.silent)return;
    if(fromId==="barrens")log("灼热的橙土迎面扑来——你已踏入赭岩谷。","lg-sys");
    updateDurotarMarkers();
    if(typeof updateQuest==="function")updateQuest();
  },
  onLeave(){},
});

console.info("[durotar] V1-B1 就绪：赭岩谷 · 哨站 · 巨蝎/刺脊/崖风鹰身");
