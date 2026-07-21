/* ============================================================
   熔火之心 · professions.js
   专业技能（STEP 23）：采集点（草药/矿脉）· 配方表 · 营地制作台
   ------------------------------------------------------------
   [依赖] THREE · core.js（BAL srand worldRng rand makeLabel）
          combat.js（S log announce fct）
          items.js（ITEMS）
          save.js 运行时（saveGame）
          world.js / barrens.js 运行时（场景挂接）
   [导出] MATS RECIPES GATHER_NODES WORKBENCH_POS
          matCount addMats spendMats canCraft tryCraft
          spawnGatherNodesForZone tickGatherNodes nearestGatherNode
          tryGather tryProfessionInteract
          buildWorkbench disposeWorkbench openCraftPanel refreshCraftPanel
          collectMatsSave applyMatsSave resetMats
          workbenchDist
   ============================================================ */
"use strict";

/* ---- 材料表（堆叠在 S.mats，不占背包格） ---- */
const MATS={
  peacebloom :{id:"peacebloom",  name:"宁神花", icon:"herb", color:"#8ad060"},
  silverleaf :{id:"silverleaf",  name:"银叶草", icon:"herb", color:"#a8d888"},
  copper_ore :{id:"copper_ore",  name:"铜矿石", icon:"ore",  color:"#c9a060"},
  tin_ore    :{id:"tin_ore",     name:"锡矿石", icon:"ore",  color:"#b0b8c0"},
};

/* ---- 配方表（加配方 = 加一条；数值引用 BAL / MATS / ITEMS） ---- */
const RECIPES=[
  {id:"craft_bandage", title:"亚麻绷带",
    out:"linen_bandage", outN:1,
    mats:{silverleaf:2},
    tip:"银叶草搓成绷带，野外包扎用。"},
  {id:"craft_potion", title:"初级治疗药水",
    out:"minor_potion", outN:1,
    mats:{peacebloom:2},
    tip:"宁神花煎煮，瞬间回复生命。"},
  {id:"craft_whetstone", title:"磨刀石",
    out:"whetstone", outN:1,
    mats:{copper_ore:2},
    tip:"铜矿磨利武器，短时提高伤害。"},
  {id:"craft_whetstone_tin", title:"磨刀石（锡）",
    out:"whetstone", outN:1,
    mats:{tin_ore:2},
    tip:"锡矿亦可磨制磨刀石。"},
];

const GATHER_NODES=[];
let WORKBENCH=null;
const WORKBENCH_POS=new THREE.Vector3(
  (BAL.professions.workbench&&BAL.professions.workbench.x)!=null?BAL.professions.workbench.x:18,
  0,
  (BAL.professions.workbench&&BAL.professions.workbench.z)!=null?BAL.professions.workbench.z:46
);

function ensureMats(){
  if(!S.mats)S.mats={};
  return S.mats;
}
function matCount(id){return Math.max(0,(ensureMats()[id]|0));}
function addMats(id,n,opts){
  opts=opts||{};
  if(!MATS[id]||!(n>0))return 0;
  const max=BAL.professions.matsMax|0||99;
  const cur=matCount(id);
  const add=Math.min(n,Math.max(0,max-cur));
  if(!add)return 0;
  ensureMats()[id]=cur+add;
  if(!opts.silent)log(`获得材料 · ${MATS[id].name} ×${add}`,"lg-sys");
  return add;
}
function spendMats(need){
  if(!need)return true;
  for(const id in need){
    if(matCount(id)<(need[id]|0))return false;
  }
  for(const id in need)ensureMats()[id]=matCount(id)-(need[id]|0);
  return true;
}
function canCraft(recipe){
  if(!recipe||!ITEMS[recipe.out])return false;
  if(S.inv.length+(recipe.outN|1)>BAL.bag.size)return false;
  for(const id in recipe.mats){
    if(matCount(id)<(recipe.mats[id]|0))return false;
  }
  return true;
}

function matsSummaryText(){
  const bits=[];
  for(const id in MATS){
    const n=matCount(id);
    if(n>0)bits.push(`${MATS[id].name} ${n}`);
  }
  return bits.length?bits.join(" · "):"（空）";
}

function tryCraft(recipeId){
  const recipe=RECIPES.find(r=>r.id===recipeId);
  if(!recipe)return false;
  if(!canCraft(recipe)){
    if(S.inv.length+(recipe.outN|1)>BAL.bag.size)log("背包已满，无法制作。","lg-sys");
    else log("材料不足。","lg-sys");
    return false;
  }
  if(!spendMats(recipe.mats))return false;
  const n=recipe.outN|1;
  for(let i=0;i<n;i++)S.inv.push(recipe.out);
  const it=ITEMS[recipe.out];
  announce(`制作 · ${it.name}`);
  log(`制作了【${it.name}】×${n}。`,"lg-sys");
  if(typeof SFX!=="undefined")SFX.play("pickup");
  if(typeof spawnBurst==="function"&&WORKBENCH)
    spawnBurst(WORKBENCH.position.clone().setY(1.2),0xffd76a,18,1.4);
  refreshCraftPanel();
  if(typeof renderBag==="function")renderBag();
  if(typeof saveGame==="function")saveGame(true);
  return true;
}

/* ---- 几何：草药丛 / 矿脉 / 制作台 ---- */
function buildHerbMesh(matId){
  const g=new THREE.Group();
  const col=MATS[matId]?parseInt(String(MATS[matId].color).replace("#","0x"),16)||0x6a9a40:0x6a9a40;
  const leaf=new THREE.MeshStandardMaterial({color:col,roughness:.85,flatShading:true});
  for(let i=0;i<3;i++){
    const m=new THREE.Mesh(new THREE.ConeGeometry(.35+i*.08,.9+i*.15,5),leaf);
    m.position.set((i-1)*.25,.45+i*.05,(i%2)*.2-i*.1);
    m.rotation.z=(i-1)*.2; m.castShadow=true; g.add(m);
  }
  return g;
}
function buildOreMesh(matId){
  const g=new THREE.Group();
  const rock=new THREE.MeshStandardMaterial({color:0x6a6058,roughness:.95,flatShading:true});
  const vein=new THREE.MeshStandardMaterial({
    color:matId==="tin_ore"?0xa8b0b8:0xb89050,roughness:.7,flatShading:true,
    emissive:matId==="tin_ore"?0x334044:0x553310,emissiveIntensity:.15});
  const base=new THREE.Mesh(new THREE.DodecahedronGeometry(.85,0),rock);
  base.position.y=.55; base.castShadow=true; base.receiveShadow=true; g.add(base);
  const spark=new THREE.Mesh(new THREE.OctahedronGeometry(.28,0),vein);
  spark.position.set(.2,.9,-.1); g.add(spark);
  return g;
}
function buildWorkbenchMesh(){
  const g=new THREE.Group();
  const wood=new THREE.MeshStandardMaterial({color:0x6a4a28,roughness:.9,flatShading:true});
  const iron=new THREE.MeshStandardMaterial({color:0x5a5a60,roughness:.55,flatShading:true,
    emissive:0x222228,emissiveIntensity:.1});
  const top=new THREE.Mesh(new THREE.BoxGeometry(2.4,.25,1.4),wood);
  top.position.y=1.05; top.castShadow=true; g.add(top);
  [[-.9,-.5],[.9,-.5],[-.9,.5],[.9,.5]].forEach(([x,z])=>{
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.22,1,.22),wood);
    leg.position.set(x,.5,z); leg.castShadow=true; g.add(leg);
  });
  const anvil=new THREE.Mesh(new THREE.BoxGeometry(.9,.35,.55),iron);
  anvil.position.set(0,1.35,.1); g.add(anvil);
  return g;
}

function disposeGatherNode(n){
  if(!n)return;
  if(n.mesh&&n.mesh.parent)n.mesh.parent.remove(n.mesh);
  if(n.label&&n.label.parent)n.label.parent.remove(n.label);
  if(n.mesh)n.mesh.traverse(o=>{
    if(o.geometry)o.geometry.dispose();
    if(o.material){
      if(Array.isArray(o.material))o.material.forEach(m=>m.dispose&&m.dispose());
      else if(o.material.dispose)o.material.dispose();
    }
  });
}

function clearGatherNodes(zoneId){
  for(let i=GATHER_NODES.length-1;i>=0;i--){
    if(zoneId&&GATHER_NODES[i].zone!==zoneId)continue;
    disposeGatherNode(GATHER_NODES[i]);
    GATHER_NODES.splice(i,1);
  }
}

function setNodeReady(n,on){
  n.ready=!!on;
  if(n.mesh)n.mesh.visible=n.ready;
  if(n.label)n.label.visible=n.ready;
}

function pickMatForKind(kind,zoneId){
  const P=BAL.professions;
  if(kind==="herb"){
    const c=(P.herbChance&&P.herbChance[zoneId])!=null?P.herbChance[zoneId]:.55;
    return worldRng()<c?"peacebloom":"silverleaf";
  }
  const c=(P.oreChance&&P.oreChance[zoneId])!=null?P.oreChance[zoneId]:.7;
  return worldRng()<c?"copper_ore":"tin_ore";
}

function spawnGatherNodesForZone(zoneId,scene,opts){
  opts=opts||{};
  if(!scene)return;
  clearGatherNodes(zoneId);
  const P=BAL.professions;
  const R=opts.radius||(zoneId==="barrens"?BAL.barrens.radius:90);
  const camp=opts.camp||{x:0,z:55};
  const portals=opts.portals||[];
  const herbN=(P.herbCount&&P.herbCount[zoneId])|0;
  const oreN=(P.oreCount&&P.oreCount[zoneId])|0;

  function okSpot(x,z){
    if(Math.hypot(x-camp.x,z-camp.z)<(P.campR|0))return false;
    for(const p of portals){
      if(Math.hypot(x-p.x,z-p.z)<(P.portalR|0))return false;
    }
    for(const n of GATHER_NODES){
      if(n.zone===zoneId&&Math.hypot(x-n.x,z-n.z)<(P.nodeGap|6))return false;
    }
    return Math.hypot(x,z)<R-8;
  }
  function place(kind){
    let x=0,z=0,found=false;
    const tries=P.placeTries|40;
    for(let t=0;t<tries;t++){
      const a=srand(0,Math.PI*2), r=srand(16,R-10);
      x=Math.cos(a)*r; z=Math.sin(a)*r;
      if(okSpot(x,z)){found=true;break;}
    }
    if(!found)return;
    const matId=pickMatForKind(kind,zoneId);
    const mesh=kind==="herb"?buildHerbMesh(matId):buildOreMesh(matId);
    mesh.position.set(x,0,z);
    scene.add(mesh);
    const title=kind==="herb"?`🌿 ${MATS[matId].name}`:`⛏ ${MATS[matId].name}`;
    const label=makeLabel(title,4.2,MATS[matId].color,"rgba(0,0,0,.55)");
    label.position.set(x,kind==="herb"?2.2:2.4,z);
    scene.add(label);
    GATHER_NODES.push({
      id:`${zoneId}_${kind}_${GATHER_NODES.length}`,
      zone:zoneId, kind, matId, mesh, label, x, z,
      ready:true, respawnT:0,
    });
  }
  for(let i=0;i<herbN;i++)place("herb");
  for(let i=0;i<oreN;i++)place("ore");
}

function disposeWorkbench(){
  if(!WORKBENCH)return;
  const lab=WORKBENCH.userData&&WORKBENCH.userData.label;
  if(lab&&lab.parent)lab.parent.remove(lab);
  if(lab&&lab.material){
    if(lab.material.map)lab.material.map.dispose();
    lab.material.dispose();
  }
  if(WORKBENCH.parent)WORKBENCH.parent.remove(WORKBENCH);
  WORKBENCH.traverse(o=>{
    if(o.geometry)o.geometry.dispose();
    if(o.material){
      if(Array.isArray(o.material))o.material.forEach(m=>m.dispose&&m.dispose());
      else if(o.material.dispose)o.material.dispose();
    }
  });
  WORKBENCH=null;
}
function buildWorkbench(scene){
  disposeWorkbench();
  WORKBENCH=buildWorkbenchMesh();
  WORKBENCH.position.copy(WORKBENCH_POS);
  scene.add(WORKBENCH);
  const lab=makeLabel("🔨 制作台",5,"#ffd76a","rgba(80,50,10,.9)");
  lab.position.set(WORKBENCH_POS.x,2.6,WORKBENCH_POS.z);
  scene.add(lab);
  WORKBENCH.userData.label=lab;
  return WORKBENCH;
}

function workbenchDist(){
  if(!WORKBENCH)return 999;
  return Math.hypot(player.position.x-WORKBENCH_POS.x,player.position.z-WORKBENCH_POS.z);
}

function nearestGatherNode(maxR){
  const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
  let best=null,bd=maxR;
  for(const n of GATHER_NODES){
    if(n.zone!==zid||!n.ready)continue;
    const d=Math.hypot(player.position.x-n.x,player.position.z-n.z);
    if(d<bd){bd=d;best=n;}
  }
  return best;
}

function finishGather(node){
  if(!node||!node.ready)return;
  const ymin=BAL.professions.yieldMin|1;
  const ymax=Math.max(ymin,BAL.professions.yieldMax|1);
  const n=ymin+Math.floor(rand()*(ymax-ymin+1));
  const got=addMats(node.matId,n);
  if(got){
    announce(`采集 · ${MATS[node.matId].name}`);
    if(typeof spawnBurst==="function")
      spawnBurst(new THREE.Vector3(node.x,1,node.z),0x8ad060,14,1.2);
    if(typeof SFX!=="undefined")SFX.play("pickup");
  }
  setNodeReady(node,false);
  node.respawnT=BAL.professions.respawn|0;
  if(typeof saveGame==="function")saveGame(true);
}

function tryGather(){
  if(!S.started||!S.p.alive||S.mode!=="world")return false;
  if(S.p.eating||S.p.bandaging||S.p.gathering){log("你正在忙碌中。","lg-sys");return true;}
  const n=nearestGatherNode(BAL.professions.interactR);
  if(!n)return false;
  S.p.gathering={t:BAL.professions.gatherCast|0, node:n, name:MATS[n.matId].name};
  announce(n.kind==="herb"?"采集草药…":"开采矿脉…");
  log(`开始采集【${MATS[n.matId].name}】（移动会打断）。`,"lg-sys");
  return true;
}

function tickGatherNodes(dt){
  for(const n of GATHER_NODES){
    if(n.ready)continue;
    n.respawnT-=dt;
    if(n.respawnT<=0)setNodeReady(n,true);
  }
  if(S.p.gathering){
    S.p.gathering.t-=dt;
    if(S.p.gathering.t<=0){
      const node=S.p.gathering.node;
      S.p.gathering=null;
      finishGather(node);
    }
  }
  if(S.p.whetstoneT>0){
    S.p.whetstoneT=Math.max(0,S.p.whetstoneT-dt);
    if(S.p.whetstoneT<=0&&S.p.whetstoneAdd){
      S.p.dmgMul-=S.p.whetstoneAdd;
      S.p.whetstoneAdd=0;
      log("磨刀石效果结束。","lg-sys");
    }
  }
}

function openCraftPanel(){
  S.vendorOpen=false;
  S.craftOpen=true;
  $("#dlg").style.display="block";
  refreshCraftPanel();
}

function refreshCraftPanel(){
  if(!S.craftOpen)return;
  const tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🔨 营地制作台";
  tx.textContent=`材料：${matsSummaryText()}\n选择配方制作消耗品。`;
  bts.innerHTML="";
  const btn=(t,fn,dis)=>{
    const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.disabled=!!dis;
    if(!dis)b.onclick=fn;bts.appendChild(b);
  };
  for(const r of RECIPES){
    const need=Object.keys(r.mats).map(id=>`${MATS[id].name}×${r.mats[id]}`).join(" + ");
    const ok=canCraft(r);
    btn(`${ok?"✦":"○"} ${r.title}（${need}）`,()=>tryCraft(r.id),!ok);
  }
  btn("离开",()=>{S.craftOpen=false;closeDialogue();});
}

function tryProfessionInteract(){
  if(!S.started||!S.p.alive||S.mode!=="world")return false;
  const R=BAL.professions.interactR;
  const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
  if(zid==="mulgore"&&workbenchDist()<R){openCraftPanel();return true;}
  if(nearestGatherNode(R))return tryGather();
  return false;
}

function collectMatsSave(){
  const out={};
  const st=ensureMats();
  for(const id in st){
    const n=st[id]|0;
    if(n>0&&MATS[id])out[id]=Math.min(BAL.professions.matsMax|0||99,n);
  }
  return out;
}
function applyMatsSave(raw){
  resetMats({silent:true});
  if(!raw||typeof raw!=="object")return;
  const max=BAL.professions.matsMax|0||99;
  for(const id in raw){
    if(!MATS[id])continue;
    const n=Math.max(0,Math.min(max,raw[id]|0));
    if(n)ensureMats()[id]=n;
  }
}
function resetMats(opts){
  S.mats={};
  if(!(opts&&opts.silent)&&S.craftOpen)refreshCraftPanel();
}

console.info("[professions] STEP 23 就绪：采集点 · 制作台 · 配方表");
