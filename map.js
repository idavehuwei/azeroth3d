/* ============================================================
   熔火之心 · map.js
   小地图 + 世界地图（STEP 16）：Canvas 2D 程序化，零贴图
   多区域预留 MAP_ZONES 图层接口（STEP 17 enterZone 可切换）
   ------------------------------------------------------------
   [依赖] core.js（$ BAL）· combat.js（S）· world.js（player WORLD_R PORTAL_POS
          elder vendor spiritHealer MOBS）· panels.js（closeAllHudPanels）
          zones.js 运行时（getCurrentZoneId）· raid.js 运行时（ARENA_R）
   [导出] updateMinimap toggleWorldMap worldMapOpen closeWorldMap drawWorldMap
          MAP_ZONES getActiveMapZone setMapZone
   ============================================================ */
"use strict";

/* 区域图层注册表（STEP 17：与 ZONES 对齐；贫瘠之地在 STEP 18） */
const MAP_ZONES={
  mulgore:{
    id:"mulgore",
    name:"莫高雷",
    radius:()=>typeof WORLD_R==="number"?WORLD_R:88,
    /* 静态地标：世界 XZ → 标注（运行时优先读 live mesh） */
    landmarks:[
      {id:"elder",  label:"长老",   x:6,  z:49, color:"#ffd9a0", kind:"npc"},
      {id:"vendor", label:"商人",   x:-10,z:50, color:"#8aff9a", kind:"npc"},
      {id:"spirit", label:"灵魂医者",x:0,  z:58, color:"#a8d8ff", kind:"npc"},
      {id:"portal", label:"熔火之心",x:0,  z:-62,color:"#ff8a4a", kind:"portal"},
      {id:"barrens",label:"贫瘠之地",x:0,  z:80, color:"#e8c898", kind:"portal"},
      {id:"camp",   label:"营地",   x:0,  z:55, color:"#c9a06a", kind:"camp"},
    ],
    /* 稀有/精英固定点（与 world 放置一致；存活时改画动态点） */
    elites:[
      {id:"boarKing",label:"老灰鬃",x:14,z:-34,color:"#ffd700",rare:true},
      {id:"harpy",   label:"鹰身女妖",x:48,z:-30,color:"#ff9ad0",rare:false},
    ],
    /* 手绘风轮廓：相对半径的多边形（程序化，非贴图） */
    outline:[
      [0,-1],[.35,-.92],[.62,-.7],[.88,-.35],[.95,.1],[.82,.45],[.55,.75],
      [.2,.95],[-.15,.98],[-.5,.85],[-.78,.55],[-.95,.15],[-.9,-.3],[-.65,-.7],[-.3,-.92],
    ],
  },
  molten_core:{
    id:"molten_core",
    name:"熔火之心",
    radius:()=>typeof ARENA_R==="number"?ARENA_R+4:30,
    landmarks:[],
    elites:[],
    outline:[
      [0,-1],[.7,-.7],[1,0],[.7,.7],[0,1],[-.7,.7],[-1,0],[-.7,-.7],
    ],
  },
  barrens:{
    id:"barrens",
    name:"贫瘠之地",
    radius:()=>typeof BARRENS_R==="number"?BARRENS_R:(BAL.barrens&&BAL.barrens.radius)||92,
    landmarks:[
      {id:"crossroads",label:"十字路口",x:0,z:0,color:"#e8c080",kind:"camp"},
      {id:"portal_n",label:"莫高雷",x:0,z:-84,color:"#c9a06a",kind:"portal"},
      {id:"portal_s",label:"哀嚎洞穴",x:0,z:80,color:"#8a9a6a",kind:"portal"},
      {id:"spirit",label:"灵魂医者",x:-8,z:5,color:"#a8d8ff",kind:"npc"},
      {id:"quilboar",label:"野猪人前哨",x:-32,z:-12,color:"#c4783a",kind:"camp"},
      {id:"centaur",label:"半人马营地",x:40,z:25,color:"#a87840",kind:"camp"},
    ],
    elites:[],
    outline:[
      [0,-1],[.4,-.9],[.75,-.55],[.95,-.1],[.9,.4],[.55,.8],[.1,.98],
      [-.35,.9],[-.7,.55],[-.95,.1],[-.85,-.4],[-.5,-.8],[-.15,-.95],
    ],
    terrain:{
      bg:"#1a1408",
      fill:"rgba(120,90,40,.4)",
      stroke:"rgba(200,160,80,.5)",
      road:[["crossroads","portal_n"],["crossroads","portal_s"]],
    },
  },
  wailing_caverns:{
    id:"wailing_caverns",
    name:"哀嚎洞穴",
    radius:()=>(BAL.wailing&&BAL.wailing.arenaR)||24,
    landmarks:[
      {id:"entrance",label:"入口",x:0,z:16,color:"#8a9a6a",kind:"portal"},
      {id:"pool",label:"毒池",x:0,z:-8,color:"#44aa22",kind:"camp"},
    ],
    elites:[],
    outline:[
      [0,-1],[.65,-.75],[1,0],[.65,.75],[0,1],[-.65,.75],[-1,0],[-.65,-.75],
    ],
    terrain:{
      bg:"#081208",
      fill:"rgba(40,70,40,.45)",
      stroke:"rgba(100,160,90,.5)",
    },
  },
};
let _mapZoneId="mulgore";
function getActiveMapZone(){return MAP_ZONES[_mapZoneId]||MAP_ZONES.mulgore;}
function setMapZone(id){if(MAP_ZONES[id])_mapZoneId=id;}

const _mm={cv:null,ctx:null,size:0};

function mapWorldToCanvas(x,z,size,pad,R){
  const s=(size-pad*2)/(R*2);
  return {u:pad+(x+R)*s, v:pad+(z+R)*s};
}

function liveLandmarkPos(lm){
  if(lm.id==="elder"&&typeof elder!=="undefined")return {x:elder.position.x,z:elder.position.z};
  if(lm.id==="vendor"&&typeof vendor!=="undefined")return {x:vendor.position.x,z:vendor.position.z};
  if(lm.id==="spirit"){
    if(typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="barrens"&&typeof barrensSpirit!=="undefined"&&barrensSpirit)
      return {x:barrensSpirit.position.x,z:barrensSpirit.position.z};
    if(typeof spiritHealer!=="undefined")return {x:spiritHealer.position.x,z:spiritHealer.position.z};
  }
  if(lm.id==="portal"&&typeof PORTAL_POS!=="undefined")return {x:PORTAL_POS.x,z:PORTAL_POS.z};
  if(lm.id==="portal_n"&&typeof BARRENS_PORTAL_N!=="undefined")return {x:BARRENS_PORTAL_N.x,z:BARRENS_PORTAL_N.z};
  if(lm.id==="crossroads"&&typeof crossroadsSentinel!=="undefined"&&crossroadsSentinel)
    return {x:crossroadsSentinel.position.x,z:crossroadsSentinel.position.z};
  return {x:lm.x,z:lm.z};
}

function drawTerrain(ctx,size,pad,zone){
  const R=zone.radius();
  const T=zone.terrain||{};
  ctx.fillStyle=T.bg||"#0c1208";
  ctx.fillRect(0,0,size,size);
  const g=ctx.createRadialGradient(size/2,size/2,size*.1,size/2,size/2,size*.7);
  if(zone.id==="barrens"){
    g.addColorStop(0,"#3a2a14"); g.addColorStop(.55,"#241808"); g.addColorStop(1,"#120e06");
  }else{
    g.addColorStop(0,"#2a3a1a"); g.addColorStop(.55,"#1a2810"); g.addColorStop(1,"#0c1008");
  }
  ctx.fillStyle=g; ctx.fillRect(0,0,size,size);
  ctx.beginPath();
  zone.outline.forEach((p,i)=>{
    const pt=mapWorldToCanvas(p[0]*R,p[1]*R,size,pad,R);
    if(i===0)ctx.moveTo(pt.u,pt.v); else ctx.lineTo(pt.u,pt.v);
  });
  ctx.closePath();
  ctx.fillStyle=T.fill||"rgba(60,90,35,.35)";
  ctx.fill();
  ctx.strokeStyle=T.stroke||"rgba(200,160,80,.45)";
  ctx.lineWidth=1.5;
  ctx.stroke();
  ctx.strokeStyle="rgba(140,100,50,.55)";
  ctx.lineWidth=Math.max(1.5,size/80);
  if(T.road&&Array.isArray(T.road)){
    const byId={};
    (zone.landmarks||[]).forEach(lm=>{byId[lm.id]=liveLandmarkPos(lm);});
    T.road.forEach(([a,b])=>{
      const pa=byId[a],pb=byId[b]; if(!pa||!pb)return;
      const ca=mapWorldToCanvas(pa.x,pa.z,size,pad,R);
      const cb=mapWorldToCanvas(pb.x,pb.z,size,pad,R);
      ctx.beginPath(); ctx.moveTo(ca.u,ca.v); ctx.lineTo(cb.u,cb.v); ctx.stroke();
    });
  }else{
    const camp=mapWorldToCanvas(0,55,size,pad,R);
    const portal=mapWorldToCanvas(0,-62,size,pad,R);
    ctx.beginPath(); ctx.moveTo(camp.u,camp.v); ctx.lineTo(portal.u,portal.v); ctx.stroke();
  }
  const c0=mapWorldToCanvas(0,0,size,pad,R);
  const edge=mapWorldToCanvas(R,0,size,pad,R);
  ctx.beginPath();
  ctx.arc(c0.u,c0.v,Math.abs(edge.u-c0.u),0,Math.PI*2);
  ctx.strokeStyle="rgba(255,140,60,.2)";
  ctx.lineWidth=1;
  ctx.stroke();
}

function drawBlip(ctx,u,v,color,r,shape){
  ctx.save();
  ctx.fillStyle=color;
  ctx.strokeStyle="rgba(0,0,0,.65)";
  ctx.lineWidth=1;
  if(shape==="diamond"){
    ctx.beginPath();
    ctx.moveTo(u,v-r); ctx.lineTo(u+r,v); ctx.lineTo(u,v+r); ctx.lineTo(u-r,v);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }else if(shape==="square"){
    ctx.fillRect(u-r,v-r,r*2,r*2); ctx.strokeRect(u-r,v-r,r*2,r*2);
  }else{
    ctx.beginPath(); ctx.arc(u,v,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerArrow(ctx,u,v,face,color){
  ctx.save();
  ctx.translate(u,v);
  ctx.rotate(face||0);
  ctx.fillStyle=color||"#7ab8ff";
  ctx.strokeStyle="#061018";
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(0,-7); ctx.lineTo(5,6); ctx.lineTo(0,3); ctx.lineTo(-5,6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function collectDynamicElites(){
  const list=[];
  if(typeof MOBS==="undefined")return list;
  const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
  for(const m of MOBS){
    if(!m.elite||m.state==="dead")continue;
    if((m.zoneId||"mulgore")!==zid)continue;
    list.push({
      x:m.mesh.position.x, z:m.mesh.position.z,
      color:m.type==="boarKing"?"#ffd700":"#ff9ad0",
      rare:m.type==="boarKing",
    });
  }
  return list;
}

function paintMap(ctx,size,opts){
  const zone=getActiveMapZone();
  const pad=opts.pad!=null?opts.pad:BAL.map.padding;
  const R=zone.radius();
  const showLabels=!!opts.labels;
  drawTerrain(ctx,size,pad,zone);

  for(const lm of zone.landmarks){
    const pos=liveLandmarkPos(lm);
    const p=mapWorldToCanvas(pos.x,pos.z,size,pad,R);
    const shape=lm.kind==="portal"?"diamond":lm.kind==="camp"?"square":"circle";
    drawBlip(ctx,p.u,p.v,lm.color,showLabels?5:3.5,shape);
    if(showLabels){
      ctx.fillStyle="#e8d8bc";
      ctx.font="10px 'Noto Sans SC','Microsoft YaHei',sans-serif";
      ctx.textAlign="left";
      ctx.fillText(lm.label,p.u+7,p.v+3);
    }
  }

  const dyn=collectDynamicElites();
  if(dyn.length){
    for(const e of dyn){
      const p=mapWorldToCanvas(e.x,e.z,size,pad,R);
      drawBlip(ctx,p.u,p.v,e.color,showLabels?5:3.5,e.rare?"diamond":"circle");
    }
  }else{
    for(const e of zone.elites){
      const p=mapWorldToCanvas(e.x,e.z,size,pad,R);
      drawBlip(ctx,p.u,p.v,e.color,showLabels?5:3.5,e.rare?"diamond":"circle");
      if(showLabels){
        ctx.fillStyle=e.color;
        ctx.font="10px 'Noto Sans SC','Microsoft YaHei',sans-serif";
        ctx.fillText(e.label,p.u+7,p.v+3);
      }
    }
  }

  if(typeof player!=="undefined"&&player){
    const p=mapWorldToCanvas(player.position.x,player.position.z,size,pad,R);
    const face=(S.p&&S.p.face!=null)?S.p.face:0;
    drawPlayerArrow(ctx,p.u,p.v,face,"#7ab8ff");
  }
}

function ensureMinimap(){
  if(_mm.cv)return;
  _mm.cv=$("#minimap");
  if(!_mm.cv)return;
  const sz=BAL.map.miniSize|0;
  if(_mm.cv.width!==sz){_mm.cv.width=sz;_mm.cv.height=sz;}
  _mm.ctx=_mm.cv.getContext("2d");
  _mm.size=sz;
  _mm.cv.addEventListener("click",()=>{if(S.started)toggleWorldMap(true);});
}

function updateMinimap(){
  if(!S.started)return;
  ensureMinimap();
  if(!_mm.ctx)return;
  const wrap=$("#minimapWrap");
  if(!wrap)return;
  if(S.mode==="raid"&&!BAL.map.showInRaid){wrap.style.display="none";return;}
  wrap.style.display="block";
  if(S.zoneId)setMapZone(S.zoneId);
  else if(typeof getCurrentZoneId==="function")setMapZone(getCurrentZoneId());
  const title=wrap.querySelector(".mm-title");
  if(title){
    const zn=getActiveMapZone();
    title.textContent=(zn&&zn.name?zn.name:S.mode==="raid"?"熔火之心":"莫高雷").split("").join(" ");
  }
  const size=_mm.size, pad=BAL.map.padding;
  _mm.ctx.clearRect(0,0,size,size);
  if(S.mode==="raid"){
    const R=(typeof ARENA_R==="number"?ARENA_R:26)+4;
    _mm.ctx.fillStyle="#1a0802";
    _mm.ctx.fillRect(0,0,size,size);
    const c=mapWorldToCanvas(0,0,size,pad,R);
    const edge=mapWorldToCanvas(R,0,size,pad,R);
    _mm.ctx.beginPath();
    _mm.ctx.arc(c.u,c.v,Math.abs(edge.u-c.u),0,Math.PI*2);
    _mm.ctx.strokeStyle="rgba(255,100,40,.35)";
    _mm.ctx.stroke();
    if(player){
      const p=mapWorldToCanvas(player.position.x,player.position.z,size,pad,R);
      drawPlayerArrow(_mm.ctx,p.u,p.v,S.p.face,"#7ab8ff");
    }
  }else{
    paintMap(_mm.ctx,size,{pad,labels:false});
  }
  if(worldMapOpen())drawWorldMap();
}

function worldMapOpen(){
  const ov=$("#worldMapOv");
  return !!(ov&&ov.classList.contains("show"));
}
function drawWorldMap(){
  const cv=$("#worldMap");
  if(!cv)return;
  const sz=BAL.map.worldSize|0;
  if(cv.width!==sz){cv.width=sz;cv.height=sz;}
  const ctx=cv.getContext("2d");
  paintMap(ctx,sz,{pad:BAL.map.worldPad,labels:true});
}
function toggleWorldMap(force){
  if(!S.started)return;
  const ov=$("#worldMapOv");
  if(!ov)return;
  const open=force==null?!worldMapOpen():!!force;
  if(open){
    if(typeof closeAllHudPanels==="function")closeAllHudPanels("map");
    ov.classList.add("show");
    drawWorldMap();
  }else{
    ov.classList.remove("show");
  }
}
function closeWorldMap(){toggleWorldMap(false);}

$("#worldMapClose").addEventListener("click",()=>closeWorldMap());
$("#worldMapOv").addEventListener("click",e=>{
  if(e.target.id==="worldMapOv")closeWorldMap();
});

console.info("[map] STEP 16 就绪：小地图常驻 · M 打开世界地图");
