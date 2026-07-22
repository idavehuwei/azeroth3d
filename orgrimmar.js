/* ============================================================
   炽心 · orgrimmar.js
   奥格瑞玛（兽人主城）：赭岩谷北 · 南接哨站 · 北通黑石山
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ srand BAL makeLabel makeNameplate）
          zones.js（registerZone）· sky.js（initZoneSky）
          models.js（buildVendor buildSpiritHealer buildElder tintNpcCloth
            buildHut buildTent buildFence buildWatchtower buildCampfire buildTotem
            buildMarketStall buildCratePile BUILD_PAL placeProp buildGraveyard）
          world.js（appendNpcQuestButtons openVendor closeVendorPanel placeTalkNpc）
          combat.js 运行时（S log announce）
          professions.js 运行时（spawnGatherNodesForZone）
          save.js 运行时（saveGame）
   [导出] sceneOrgrimmar ORGRIMMAR_R ORG_PORTAL_S ORG_PORTAL_N
          buildOrgrimmarZone tryInteractOrgrimmar
          updateOrgrimmarMarkers orgThrallDist orgSpiritDist orgVendorDist
          orgHeli orgSun orgFlames
          orgMarkerExcl orgMarkerExclGrey orgMarkerQ
   ============================================================ */
"use strict";

const ORGRIMMAR_R=(BAL.orgrimmar&&BAL.orgrimmar.radius)||300;
const sceneOrgrimmar=new THREE.Scene();
const ORG_PORTAL_S=new THREE.Vector3(0,0,ORGRIMMAR_R-10);
const ORG_PORTAL_N=new THREE.Vector3(0,0,-(ORGRIMMAR_R-10));

let orgHeli=null,orgSun=null;
const orgFlames=[];
let orgThrall=null,orgVendor=null,orgSpirit=null;
let orgPortalUniS=null,orgPortalUniN=null;
let orgMarkerExcl=null,orgMarkerExclGrey=null,orgMarkerQ=null;

function _orgGate(root,pos,label,sub,uniRef,colorA,colorB){
  const mat=MAT.get("wood.org_gate",{color:0x5a2810,roughness:.9,flatShading:true,
    emissive:0x6a2010,emissiveIntensity:.22});
  const plat=new THREE.Mesh(new THREE.CylinderGeometry(6.5,7.5,1,10),mat);
  plat.position.set(pos.x,.45,pos.z); plat.receiveShadow=true; root.add(plat);
  [[-3.2],[3.2]].forEach(([sx])=>{
    const pil=new THREE.Mesh(new THREE.BoxGeometry(1.4,8.2,1.4),mat);
    pil.position.set(pos.x+sx,4.5,pos.z); pil.castShadow=true; root.add(pil);
  });
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(8.6,1.3,1.5),mat);
  lintel.position.set(pos.x,8.8,pos.z); root.add(lintel);
  const uni={uTime:{value:0}};
  if(uniRef)uniRef.u=uni;
  const disc=new THREE.Mesh(new THREE.CircleGeometry(2.6,32),new THREE.ShaderMaterial({
    uniforms:uni,transparent:true,side:THREE.DoubleSide,depthWrite:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;uniform float uTime;
      void main(){
        vec2 p=vUv-.5; float r=length(p)*2.; float ang=atan(p.y,p.x);
        float sw=sin(ang*2.8-uTime*2.6+r*8.);
        vec3 c=mix(vec3(${colorA}),vec3(${colorB}),smoothstep(-.5,.7,sw));
        c=mix(c,vec3(.08,.02,0.),smoothstep(.7,1.,r));
        gl_FragColor=vec4(c*1.15,smoothstep(1.,.88,r));
      }`}));
  disc.position.set(pos.x,4.2,pos.z); root.add(disc);
  const L=makeLabel(label,11,"#ffb070","rgba(80,25,10,.92)");
  L.position.set(pos.x,11.5,pos.z); root.add(L);
  if(sub){
    const L2=makeLabel(sub,6,"#ff9060","rgba(70,20,8,.9)");
    L2.position.set(pos.x,10.2,pos.z); root.add(L2);
  }
  return uni;
}

function buildOrgrimmarZone(scn){
  const root=scn||sceneOrgrimmar;
  const D=BAL.orgrimmar||{};
  root.background=new THREE.Color(D.sky||0xd86838);
  root.fog=new THREE.FogExp2(D.fog||0xb84828,D.fogDensity||0.006);

  orgHeli=new THREE.HemisphereLight(D.hemiSky||0xffb080,D.hemiGround||0x5a2010,D.hemiIntensity||1.05);
  root.add(orgHeli);
  orgSun=new THREE.DirectionalLight(D.sunColor||0xffa060,D.sunIntensity||1.25);
  orgSun.position.set(30,70,-10); orgSun.castShadow=true;
  root.add(orgSun); root.add(orgSun.target);
  const _orgSkyLights={heli:orgHeli,sun:orgSun};
  if(typeof initZoneSky==="function"){
    initZoneSky(root,_orgSkyLights,{
      zenith:0x8a3020, horizon:D.sky||0xd86838, ground:D.dirt||0x6a2818,
    });
  }

  const ground=new THREE.Mesh(new THREE.CircleGeometry(ORGRIMMAR_R+28,64),
    MAT.get("dirt.org",{color:D.ground||0xb84828,roughness:1}));
  ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; root.add(ground);

  /* 中央谷地到南北门的焦土路 */
  const dirtMat=MAT.get("dirt.org_path",{color:D.dirt||0x6a2818,roughness:1});
  for(let i=0;i<18;i++){
    const t=i/17;
    const z=ORG_PORTAL_S.z*(1-t)+ORG_PORTAL_N.z*t;
    const seg=new THREE.Mesh(new THREE.CircleGeometry(srand(2.4,3.2),10),dirtMat);
    seg.rotation.x=-Math.PI/2;
    seg.position.set(Math.sin(i*.4)*2.2,.03,z*.92);
    seg.receiveShadow=true; root.add(seg);
  }

  /* 红石城墙环 */
  const wallMat=MAT.get("rock.org_wall",{color:0x8a3020,roughness:.92,flatShading:true,
    emissive:0x401008,emissiveIntensity:.15});
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2;
    const r=ORGRIMMAR_R-22;
    const wall=new THREE.Mesh(new THREE.BoxGeometry(14,7,3.2),wallMat);
    wall.position.set(Math.cos(a)*r,3.5,Math.sin(a)*r);
    wall.rotation.y=a+Math.PI/2; wall.castShadow=true; root.add(wall);
  }

  const P=BUILD_PAL.orgrimmar||BUILD_PAL.durotar;
  placeProp(root,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1.15}),0,-8,0);
  placeProp(root,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:.85}),28,20,-.5);
  placeProp(root,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:.85}),-30,16,.4);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1.15}),-22,8,.3);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,w:4.6,d:4,h:2.8,size:1.1}),18,12,-.4);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:0x9a2810,size:1}),-16,-22,Math.PI*.6);
  placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:.95}),22,-18,.2);
  placeProp(root,buildTent({hide:P.hide,stake:P.stake,r:3.0,h:4.0,size:1.1}),14,-28,.15);
  placeProp(root,buildTent({hide:0xc04020,stake:P.stake,r:2.5,h:3.4,size:.95}),-24,-14,.5);
  placeProp(root,buildMarketStall({wood:P.wood,woodD:P.woodD,cloth:0xc02810,size:1.05}),-8,-6,Math.PI*.2);
  placeProp(root,buildCratePile({wood:P.wood,woodD:P.woodD,size:1.1}),-6,-10,.2);
  placeProp(root,buildTotem({wood:P.woodD,paintA:0xd02810,paintB:0xff8030,size:1.1}),8,4,0);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:18,posts:9}),-34,0,Math.PI/2);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:16,posts:8}),20,-32,0);

  [[-10,6],[12,-4],[0,16]].forEach(([x,z],i)=>{
    const cf=placeProp(root,buildCampfire({
      flame:i?0xff6030:0xffa040, light:0xff4010, size:i===2?.75:1,
    }),x,z,0);
    if(cf)orgFlames.push(cf);
  });

  orgPortalUniS=_orgGate(root,ORG_PORTAL_S,T("zone.durotar"),"赭岩谷 · 南门",null,
    "1.,.55,.22",".7,.18,.04");
  orgPortalUniN=_orgGate(root,ORG_PORTAL_N,T("zone.blackrock"),`黑石山 · Lv.${(BAL.blackrock&&BAL.blackrock.minLevel)||14}+`,null,
    "1.,.45,.15",".55,.08,.02");

  const _npcLy=(BAL.npc&&BAL.npc.labelY)||3.85;
  const _npcMy=(BAL.npc&&BAL.npc.markerY)||6.55;
  const _npcLw=(BAL.npc&&BAL.npc.labelW)||3.6;

  orgThrall=buildElder();
  if(typeof tintNpcCloth==="function")tintNpcCloth(orgThrall,0x8a2010);
  orgThrall.position.set(2,0,-4); orgThrall.rotation.y=Math.PI; root.add(orgThrall);
  const thrallLab=makeNameplate("大酋长 · 石拳",BAL.npcLevel.thrall||45,{w:_npcLw+.4,friendly:true,color:"#ffb070"});
  thrallLab.position.set(2,_npcLy,-4); root.add(thrallLab);
  updateNameplateHp(thrallLab,1,1);

  orgVendor=buildVendor();
  orgVendor.position.set(-12,0,-8); orgVendor.rotation.y=.4; root.add(orgVendor);
  const vendLab=makeNameplate("军需官 · 赤牙",BAL.npcLevel.org_vendor||28,{w:_npcLw,friendly:true,color:"#a8e8c0"});
  vendLab.position.set(-12,_npcLy,-8); root.add(vendLab);
  updateNameplateHp(vendLab,1,1);

  orgSpirit=buildSpiritHealer();
  orgSpirit.position.set(10,0,10); orgSpirit.rotation.y=-.5; root.add(orgSpirit);
  const spLab=makeNameplate("灵魂医者 · 烬语",BAL.npcLevel.spirit,{w:_npcLw+.2,friendly:true,color:"#a8d8ff",glow:"rgba(40,80,120,.9)"});
  spLab.position.set(10,_npcLy,10); root.add(spLab);
  updateNameplateHp(spLab,1,1);

  orgMarkerExcl=makeQuestMark("offer");
  orgMarkerExcl.position.set(2,_npcMy,-4); root.add(orgMarkerExcl);
  orgMarkerExclGrey=makeQuestMark("low");
  orgMarkerExclGrey.position.copy(orgMarkerExcl.position); orgMarkerExclGrey.visible=false; root.add(orgMarkerExclGrey);
  orgMarkerQ=makeQuestMark("turnin");
  orgMarkerQ.position.copy(orgMarkerExcl.position); orgMarkerQ.visible=false; root.add(orgMarkerQ);

  placeProp(root,buildGraveyard({size:1}),8,14,Math.PI*.1);
  if(typeof registerGraveyard==="function")registerGraveyard("orgrimmar",8,14,"camp");
  if(BAL.death&&BAL.death.spawns)BAL.death.spawns.orgrimmar={x:8,z:14};

  if(typeof spawnGatherNodesForZone==="function"){
    spawnGatherNodesForZone("orgrimmar",root,{
      radius:ORGRIMMAR_R,
      camp:{x:0,z:0},
      portals:[{x:ORG_PORTAL_S.x,z:ORG_PORTAL_S.z},{x:ORG_PORTAL_N.x,z:ORG_PORTAL_N.z}],
    });
  }
  updateOrgrimmarMarkers();
  const z=ZONES.orgrimmar;
  if(z)z.lights={heli:orgHeli,sun:orgSun,flames:orgFlames,fill:_orgSkyLights.fill};
}

function updateOrgrimmarMarkers(){
  if(!orgMarkerExcl)return;
  const m={npcId:"org_thrall",excl:orgMarkerExcl,exclGrey:orgMarkerExclGrey,q:orgMarkerQ};
  if(typeof applyNpcQuestMarkerVisual==="function"){applyNpcQuestMarkerVisual(m);return;}
  if(typeof npcHasQuestOffer==="function"){
    orgMarkerExcl.visible=npcHasQuestOffer("org_thrall");
    orgMarkerQ.visible=npcHasQuestTurnIn("org_thrall");
    return;
  }
  orgMarkerExcl.visible=false;
  orgMarkerQ.visible=false;
}
function orgThrallDist(){
  if(!orgThrall)return 999;
  return Math.hypot(player.position.x-orgThrall.position.x,player.position.z-orgThrall.position.z);
}
function orgSpiritDist(){
  if(!orgSpirit)return 999;
  return Math.hypot(player.position.x-orgSpirit.position.x,player.position.z-orgSpirit.position.z);
}
function orgVendorDist(){
  if(!orgVendor)return 999;
  return Math.hypot(player.position.x-orgVendor.position.x,player.position.z-orgVendor.position.z);
}

function openOrgrimmarThrallDialogue(){
  if(typeof closeVendorPanel==="function")closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  if(!tx||!bts)return;
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="⚔ 大酋长 · 石拳";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  tx.textContent="石拳城的鼓声响彻峡谷。南门通往赭岩谷，北门通向"+T("zone.blackrock")+"——"+T("zone.molten_core")+"的入口就在山腹。";
  if(typeof appendNpcQuestButtons==="function")appendNpcQuestButtons("org_thrall",btn);
  btn("离开",closeDialogue);
}

function openOrgrimmarSpiritDialogue(){
  if(typeof closeVendorPanel==="function")closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="👻 灵魂医者 · 烬语";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  if(S.p.ghost){
    tx.textContent="主城的风带着炉火味。我能强行接引你——代价是虚弱。";
    btn("在此复活（虚弱）",()=>{if(typeof resurrectAtSpiritHealer==="function")resurrectAtSpiritHealer();});
    btn("我再想想",closeDialogue);
  }else{
    tx.textContent="若你在黑石山倒下，释放灵魂后可回城找我。";
    btn("感谢您，医者",closeDialogue);
  }
}

function tryInteractOrgrimmar(){
  if(typeof tryQuestGroundInteract==="function"&&tryQuestGroundInteract())return true;
  if(typeof pickNearestNpc!=="function")return false;
  const near=pickNearestNpc([
    {mesh:orgSpirit,open:openOrgrimmarSpiritDialogue},
    {mesh:orgThrall,open:openOrgrimmarThrallDialogue},
    {mesh:orgVendor,open:()=>openVendor("org_vendor","🏕️ 军需官 · 赤牙")},
  ]);
  if(near){near.open();return true;}
  return false;
}

registerZone({
  id:"orgrimmar",
  name:T("zone.orgrimmar"),
  scene:sceneOrgrimmar,
  build:buildOrgrimmarZone,
  music:"orgrimmar",
  mode:"world",
  levelRange:[12,20],
  boundsR:()=>ORGRIMMAR_R,
  dayNight:true,
  gates:{
    from_durotar:{x:0,z:ORGRIMMAR_R-24},
    from_blackrock:{x:0,z:-(ORGRIMMAR_R-24)},
    valley:{x:0,z:0},
    spirit:{x:10,z:10},
    default:{x:0,z:0},
  },
  portals:[{
    id:"to_durotar_from_org",
    pos:()=>ORG_PORTAL_S,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:T("zone.durotar")+" · 赭岩哨站",
    logHint:"南门之外是灼热的赭岩谷……",
    requireAlive:true,
    autoEnter:true,
    targetZone:"durotar",
    targetGate:"from_orgrimmar",
  },{
    id:"to_blackrock",
    pos:()=>ORG_PORTAL_N,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:T("zone.blackrock")+" · 黑石山",
    logHint:"北门热浪扑面——黑石山通往炽心熔窟团本。",
    requireAlive:true,
    autoEnter:true,
    minLevel:()=>(BAL.blackrock&&BAL.blackrock.minLevel)||14,
    lockedAnnounce:()=>`等级不足！需要 Lv.${(BAL.blackrock&&BAL.blackrock.minLevel)||14}`,
    lockedLog:()=>`黑石山危机四伏——当前 Lv.${S.p.level}，升到 Lv.${(BAL.blackrock&&BAL.blackrock.minLevel)||14} 后再闯。`,
    targetZone:"blackrock",
    targetGate:"from_orgrimmar",
  }],
  lights:{heli:null,sun:null,flames:orgFlames},
  onEnter(fromId,gateId,opts){
    if(opts&&opts.silent)return;
    if(fromId==="durotar")log("鼓声与铁甲碰撞——你踏入"+T("zone.orgrimmar")+"。","lg-sys");
    if(fromId==="blackrock")log("你离开黑石山的硫磺味，重回兽人主城。","lg-sys");
    updateOrgrimmarMarkers();
    if(typeof updateQuest==="function")updateQuest();
  },
  onLeave(){},
});

console.info("[orgrimmar] 就绪：奥格瑞玛 · 兽人主城 · 南赭岩 / 北黑石");
