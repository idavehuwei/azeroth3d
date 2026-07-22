/* ============================================================
   熔火之心 · map.js
   小地图 + 世界地图（STEP 16）：Canvas 2D 程序化，零贴图
   多区域预留 MAP_ZONES 图层接口（STEP 17 enterZone 可切换）
   ------------------------------------------------------------
   [依赖] core.js（$ BAL）· combat.js（S）· world.js（player WORLD_R PORTAL_POS
          elder vendor spiritHealer MOBS）· panels.js（closeAllHudPanels）
          zones.js 运行时（getCurrentZoneId）· raid.js 运行时（ARENA_R）
          rares.js 运行时（getRareMapEntries）
   [导出] updateMinimap toggleWorldMap worldMapOpen closeWorldMap drawWorldMap
          MAP_ZONES getActiveMapZone setMapZone mapWorldToCanvas playerMapFace
   ============================================================ */
"use strict";

/* 区域图层注册表（STEP 17：与 ZONES 对齐；贫瘠之地在 STEP 18） */
const MAP_ZONES={
  mulgore:{
    id:"mulgore",
    name:"莫高雷",
    radius:()=>typeof WORLD_R==="number"?WORLD_R:352,
    /* 静态地标：经典莫高雷 POI（运行时优先读 live mesh） */
    landmarks:[
      {id:"narache", label:"纳拉其营地", x:-90, z:281, color:"#c9a06a", kind:"camp"},
      {id:"camp",    label:"血蹄村",     x:-36, z:40,  color:"#e8c080", kind:"camp"},
      {id:"thunder", label:"雷霆崖",     x:-72, z:-208,color:"#a8c8ff", kind:"camp"},
      {id:"redcloud",label:"红云台地",   x:-180,z:208, color:"#d08060", kind:"camp"},
      {id:"palemane",label:"贫瘠石",     x:-234,z:62,  color:"#c4783a", kind:"camp"},
      {id:"golden",  label:"黄金平原",   x:0,   z:-106,color:"#d8c060", kind:"poi"},
      {id:"thunderhorn",label:"雷角水井",x:-54, z:-55, color:"#7ab8ff", kind:"poi"},
      {id:"winterhoof", label:"冬蹄水井",x:108, z:91,  color:"#7ab8ff", kind:"poi"},
      {id:"windfury",label:"乱风岗",     x:54,  z:-288,color:"#c8a0e0", kind:"camp"},
      {id:"baeldun", label:"巴尔丹挖掘场",x:-253,z:-47, color:"#90a0b0", kind:"camp"},
      {id:"venture", label:"风险投资矿洞",x:216, z:-26, color:"#8ab050", kind:"camp"},
      {id:"lake",    label:"石牛湖",     x:-126,z:33,  color:"#7ab8ff", kind:"poi"},
      {id:"hawkwind", label:"鹰风酋长", color:"#e8c080", kind:"npc"},
      {id:"grull", label:"格鲁尔", color:"#d8b090", kind:"npc"},
      {id:"grayhorn", label:"灰角", color:"#d0c8a8", kind:"npc"},
      {id:"baine", label:"贝恩", color:"#ffd9a0", kind:"npc"},
      {id:"elder", label:"贝恩", color:"#ffd9a0", kind:"npc"},
      {id:"cairne", label:"凯恩", color:"#ffd9a0", kind:"npc"},
      {id:"mull", label:"穆尔", color:"#a8c8e8", kind:"npc"},
      {id:"vendor", label:"瓦尔格", color:"#8aff9a", kind:"npc"},
      {id:"hunter", label:"哈鲁", color:"#d0e8a0", kind:"npc"},
      {id:"spirit", label:"灵魂医者", color:"#a8d8ff", kind:"npc"},
      {id:"portal",  label:"熔火之心",   x:0,   z:-344,color:"#ff8a4a", kind:"portal"},
      {id:"barrens", label:"贫瘠之地",   x:0,   z:344, color:"#e8c898", kind:"portal"},
    ],
    elites:[],
    outline:[
      [0,-1],[.35,-.92],[.62,-.7],[.88,-.35],[.95,.1],[.82,.45],[.55,.75],
      [.2,.95],[-.15,.98],[-.5,.85],[-.78,.55],[-.95,.15],[-.9,-.3],[-.65,-.7],[-.3,-.92],
    ],
    terrain:{
      bg:"#0c1208",
      fill:"rgba(60,90,35,.35)",
      stroke:"rgba(200,160,80,.45)",
      road:[
        ["narache","camp"],
        ["camp","thunder"],
        ["thunder","portal"],
        ["camp","barrens"],
        ["camp","lake"],
        ["camp","winterhoof"],
        ["camp","palemane"],
        ["camp","venture"],
        ["thunder","windfury"],
        ["golden","baeldun"],
      ],
    },
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
    radius:()=>typeof BARRENS_R==="number"?BARRENS_R:(BAL.barrens&&BAL.barrens.radius)||368,
    landmarks:[
      {id:"crossroads",label:"十字路口",x:0,z:0,color:"#e8c080",kind:"camp"},
      {id:"portal_n",label:"莫高雷",x:0,z:-360,color:"#c9a06a",kind:"portal"},
      {id:"portal_s",label:"哀嚎洞穴",x:0,z:356,color:"#8a9a6a",kind:"portal"},
      {id:"portal_e",label:"奥妮克希亚巢穴",x:356,z:8,color:"#e8a080",kind:"portal"},
      {id:"portal_w",label:"赭岩谷",x:-356,z:-18,color:"#ffb070",kind:"portal"},
      {id:"spirit",label:"灵魂医者",x:-22,z:18,color:"#a8d8ff",kind:"npc"},
      {id:"barrens_vendor",label:"武器商",x:-12,z:-10,color:"#8aff9a",kind:"npc"},
      {id:"barrens_cook",label:"厨子",x:16,z:8,color:"#ffcf90",kind:"npc"},
      {id:"innkeeper",label:"旅店",x:-16,z:12,color:"#e0c090",kind:"npc"},
      {id:"flightmaster",label:"飞行点",x:8,z:16,color:"#a8d0e8",kind:"npc"},
      {id:"darsok",label:"达索克",x:0,z:0,color:"#e8c898",kind:"npc"},
      {id:"kag",label:"卡格",x:0,z:0,color:"#e89870",kind:"npc"},
      {id:"mankrik",label:"曼科里克",x:0,z:0,color:"#c89060",kind:"npc"},
      {id:"thom",label:"托姆",x:0,z:0,color:"#d0c080",kind:"npc"},
      {id:"kil",label:"基尔",x:0,z:0,color:"#b0d080",kind:"npc"},
      {id:"serra",label:"塞拉",x:0,z:0,color:"#e890b0",kind:"npc"},
      {id:"lal",label:"拉尔",x:0,z:0,color:"#90c8a0",kind:"npc"},
      {id:"zinge",label:"金格",x:0,z:0,color:"#90d0c0",kind:"npc"},
      {id:"dead_oasis",label:"死水绿洲",x:0,z:0,color:"#7ec8a8",kind:"camp",livePoi:"deadOasis"},
      {id:"wailing_poi",label:"哀嚎入口",x:0,z:0,color:"#a8d080",kind:"camp",livePoi:"wailing"},
      {id:"ratchet",label:"棘齿城方向",x:0,z:0,color:"#c8b070",kind:"camp",livePoi:"ratchet"},
      {id:"gold_road",label:"黄金之路",x:0,z:0,color:"#d8c080",kind:"camp",livePoi:"goldRoad"},
      {id:"north_watch",label:"北方城堡",x:0,z:0,color:"#e8a090",kind:"camp",livePoi:"northWatch"},
      {id:"taurajo",label:"陶拉祖",x:0,z:0,color:"#c89860",kind:"camp",livePoi:"taurajo"},
      {id:"warrior_grave",label:"勇士之墓",x:0,z:0,color:"#a8b0c8",kind:"camp",livePoi:"warriorGrave"},
      {id:"bristleback",label:"刺背营地",x:0,z:0,color:"#c4783a",kind:"camp",livePoi:"bristleback"},
      {id:"centaur",label:"半人马营地",x:0,z:0,color:"#a87840",kind:"camp",livePoi:"centaur"},
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
      road:[["crossroads","portal_n"],["crossroads","portal_s"],["crossroads","portal_e"],["crossroads","portal_w"],["crossroads","dead_oasis"],["crossroads","gold_road"]],
    },
  },
  durotar:{
    id:"durotar",
    name:"赭岩谷",
    radius:()=>typeof DUROTAR_R==="number"?DUROTAR_R:(BAL.durotar&&BAL.durotar.radius)||352,
    landmarks:[
      {id:"ochre_outpost",label:"赭岩哨站",x:0,z:0,color:"#ffb070",kind:"camp"},
      {id:"portal_e",label:"贫瘠之地",x:342,z:0,color:"#e8c898",kind:"portal"},
      {id:"portal_w",label:"怒焰裂谷",x:-342,z:8,color:"#ff7040",kind:"portal"},
      {id:"spirit",label:"灵魂医者",x:-8,z:22,color:"#a8d8ff",kind:"npc"},
      {id:"ochre_vendor",label:"商人",x:-14,z:-10,color:"#8aff9a",kind:"npc"},
      {id:"ochre_guard",label:"卫士",x:18,z:12,color:"#ff9a70",kind:"npc"},
      {id:"scorp",label:"巨蝎谷",x:-112,z:-72,color:"#c87828",kind:"camp"},
      {id:"cliff",label:"崖风巢",x:152,z:-112,color:"#ff9a70",kind:"camp"},
    ],
    elites:[],
    outline:[
      [0,-1],[.45,-.88],[.8,-.5],[.98,0],[.85,.45],[.5,.82],[.05,.98],
      [-.4,.88],[-.75,.5],[-.95,.05],[-.8,-.4],[-.45,-.8],[-.05,-.98],
    ],
    terrain:{
      bg:"#1a0c06",
      fill:"rgba(160,70,30,.42)",
      stroke:"rgba(220,120,60,.55)",
      road:[["ochre_outpost","portal_e"],["ochre_outpost","portal_w"]],
    },
  },
  ragefire_chasm:{
    id:"ragefire_chasm",
    name:"怒焰裂谷",
    radius:()=>(BAL.ragefire&&BAL.ragefire.arenaR)||22,
    landmarks:[
      {id:"entrance",label:"入口",x:0,z:16,color:"#ff9060",kind:"portal"},
      {id:"lava",label:"熔岩池",x:0,z:-8,color:"#ff4400",kind:"camp"},
    ],
    elites:[],
    outline:[
      [0,-1],[.65,-.75],[1,0],[.65,.75],[0,1],[-.65,.75],[-1,0],[-.65,-.75],
    ],
    terrain:{
      bg:"#140808",
      fill:"rgba(120,40,20,.5)",
      stroke:"rgba(255,100,40,.55)",
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
  onyxias_lair:{
    id:"onyxias_lair",
    name:"奥妮克希亚巢穴",
    radius:()=>(BAL.onyxiasLair&&BAL.onyxiasLair.arenaR)||26,
    landmarks:[
      {id:"entrance",label:"入口",x:0,z:16,color:"#e8a080",kind:"portal"},
      {id:"lair",label:"龙后",x:0,z:-12,color:"#ff4400",kind:"camp"},
    ],
    elites:[],
    outline:[
      [0,-1],[.7,-.7],[1,0],[.7,.7],[0,1],[-.7,.7],[-1,0],[-.7,-.7],
    ],
    terrain:{
      bg:"#100808",
      fill:"rgba(80,30,20,.5)",
      stroke:"rgba(200,100,60,.55)",
    },
  },
};
let _mapZoneId="mulgore";
function getActiveMapZone(){return MAP_ZONES[_mapZoneId]||MAP_ZONES.mulgore;}
function setMapZone(id){if(MAP_ZONES[id])_mapZoneId=id;}

const _mm={cv:null,ctx:null,size:0};

/**
 * 世界 XZ → 画布 UV
 * 约定：+X 向右，+Z 向下（南）。
 * view:{cx,cz,half} 时以玩家为中心的本地视野。
 */
function mapWorldToCanvas(x,z,size,pad,R,view){
  if(view&&view.half>0){
    const half=view.half;
    const s=(size-pad*2)/(half*2);
    return{u:pad+(x-view.cx+half)*s, v:pad+(z-view.cz+half)*s};
  }
  const s=(size-pad*2)/(R*2);
  return{u:pad+(x+R)*s, v:pad+(z+R)*s};
}

function playerMapFace(){
  /* 世界朝向 face：前进=(sin,cos)·(x,z)；画布 tip 初值朝上(-v)，需 π-face 才对齐 */
  return(S.p&&S.p.face!=null)?S.p.face:0;
}

function liveLandmarkPos(lm){
  if(lm.id==="elder"&&typeof elder!=="undefined")return {x:elder.position.x,z:elder.position.z};
  if(lm.id==="baine"&&typeof baine!=="undefined")return {x:baine.position.x,z:baine.position.z};
  if(lm.id==="hawkwind"&&typeof hawkwind!=="undefined")return {x:hawkwind.position.x,z:hawkwind.position.z};
  if(lm.id==="grull"&&typeof grull!=="undefined")return {x:grull.position.x,z:grull.position.z};
  if(lm.id==="grayhorn"&&typeof grayhorn!=="undefined")return {x:grayhorn.position.x,z:grayhorn.position.z};
  if(lm.id==="cairne"&&typeof cairne!=="undefined")return {x:cairne.position.x,z:cairne.position.z};
  if(lm.id==="mull"&&typeof mull!=="undefined")return {x:mull.position.x,z:mull.position.z};
  if(lm.id==="harken"&&typeof harken!=="undefined")return {x:harken.position.x,z:harken.position.z};
  if(lm.id==="morin"&&typeof morin!=="undefined")return {x:morin.position.x,z:morin.position.z};
  if(lm.id==="vendor"&&typeof vendor!=="undefined")return {x:vendor.position.x,z:vendor.position.z};
  if(lm.id==="hunter"&&typeof hunter!=="undefined")return {x:hunter.position.x,z:hunter.position.z};
  if(lm.id==="barrens_vendor"&&typeof barrensVendor!=="undefined"&&barrensVendor)
    return {x:barrensVendor.position.x,z:barrensVendor.position.z};
  if(lm.id==="barrens_cook"&&typeof barrensCook!=="undefined"&&barrensCook)
    return {x:barrensCook.position.x,z:barrensCook.position.z};
  if(lm.id==="innkeeper"&&typeof barrensInnkeeper!=="undefined"&&barrensInnkeeper)
    return {x:barrensInnkeeper.position.x,z:barrensInnkeeper.position.z};
  if(lm.id==="flightmaster"&&typeof barrensFlight!=="undefined"&&barrensFlight)
    return {x:barrensFlight.position.x,z:barrensFlight.position.z};
  if(lm.id==="darsok"&&typeof crossroadsSentinel!=="undefined"&&crossroadsSentinel)
    return {x:crossroadsSentinel.position.x,z:crossroadsSentinel.position.z};
  if(lm.id==="kag"&&typeof barrensKag!=="undefined"&&barrensKag)
    return {x:barrensKag.position.x,z:barrensKag.position.z};
  if(lm.id==="mankrik"&&typeof barrensMankrik!=="undefined"&&barrensMankrik)
    return {x:barrensMankrik.position.x,z:barrensMankrik.position.z};
  if(lm.id==="thom"&&typeof barrensThom!=="undefined"&&barrensThom)
    return {x:barrensThom.position.x,z:barrensThom.position.z};
  if(lm.id==="kil"&&typeof barrensKil!=="undefined"&&barrensKil)
    return {x:barrensKil.position.x,z:barrensKil.position.z};
  if(lm.id==="serra"&&typeof barrensSerra!=="undefined"&&barrensSerra)
    return {x:barrensSerra.position.x,z:barrensSerra.position.z};
  if(lm.id==="lal"&&typeof barrensLal!=="undefined"&&barrensLal)
    return {x:barrensLal.position.x,z:barrensLal.position.z};
  if(lm.id==="zinge"&&typeof barrensZinge!=="undefined"&&barrensZinge)
    return {x:barrensZinge.position.x,z:barrensZinge.position.z};
  if(lm.id==="seer_sky"&&typeof barrensSeer!=="undefined"&&barrensSeer)
    return {x:barrensSeer.position.x,z:barrensSeer.position.z};
  if(lm.livePoi&&typeof BARRENS!=="undefined"&&BARRENS[lm.livePoi])
    return {x:BARRENS[lm.livePoi].x,z:BARRENS[lm.livePoi].z};
  if(typeof BARRENS!=="undefined"){
    if(lm.id==="quilboar"||lm.id==="bristleback")return {x:BARRENS.bristleback.x,z:BARRENS.bristleback.z};
    if(lm.id==="centaur")return {x:BARRENS.centaur.x,z:BARRENS.centaur.z};
    if(lm.id==="dead_oasis")return {x:BARRENS.deadOasis.x,z:BARRENS.deadOasis.z};
    if(lm.id==="wailing_poi")return {x:BARRENS.wailing.x,z:BARRENS.wailing.z};
    if(lm.id==="ratchet")return {x:BARRENS.ratchet.x,z:BARRENS.ratchet.z};
    if(lm.id==="gold_road")return {x:BARRENS.goldRoad.x,z:BARRENS.goldRoad.z};
    if(lm.id==="north_watch")return {x:BARRENS.northWatch.x,z:BARRENS.northWatch.z};
    if(lm.id==="taurajo")return {x:BARRENS.taurajo.x,z:BARRENS.taurajo.z};
    if(lm.id==="warrior_grave")return {x:BARRENS.warriorGrave.x,z:BARRENS.warriorGrave.z};
    if(lm.id==="raptors")return {x:BARRENS.raptors.x,z:BARRENS.raptors.z};
  }
  if(lm.id==="ochre_vendor"&&typeof ochreVendor!=="undefined"&&ochreVendor)
    return {x:ochreVendor.position.x,z:ochreVendor.position.z};
  if(lm.id==="ochre_guard"&&typeof ochreGuard!=="undefined"&&ochreGuard)
    return {x:ochreGuard.position.x,z:ochreGuard.position.z};
  if(lm.id==="spirit"){
    if(typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="barrens"&&typeof barrensSpirit!=="undefined"&&barrensSpirit)
      return {x:barrensSpirit.position.x,z:barrensSpirit.position.z};
    if(typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="durotar"&&typeof durotarSpirit!=="undefined"&&durotarSpirit)
      return {x:durotarSpirit.position.x,z:durotarSpirit.position.z};
    if(typeof spiritHealer!=="undefined")return {x:spiritHealer.position.x,z:spiritHealer.position.z};
  }
  if(lm.id==="portal"&&typeof PORTAL_POS!=="undefined")return {x:PORTAL_POS.x,z:PORTAL_POS.z};
  if(lm.id==="barrens"&&typeof PORTAL_BARRENS!=="undefined")return {x:PORTAL_BARRENS.x,z:PORTAL_BARRENS.z};
  if(lm.id==="camp"&&typeof BLOODHOOF!=="undefined")return {x:BLOODHOOF.x,z:BLOODHOOF.z};
  if(lm.id==="narache"&&typeof CAMP_NARACHE!=="undefined")return {x:CAMP_NARACHE.x,z:CAMP_NARACHE.z};
  if(lm.id==="lake"&&typeof REDROCK_LAKE!=="undefined")return {x:REDROCK_LAKE.x,z:REDROCK_LAKE.z};
  if(typeof MULGORE!=="undefined"){
    if(lm.id==="thunder")return {x:MULGORE.thunderBluff.x,z:MULGORE.thunderBluff.z};
    if(lm.id==="redcloud")return {x:MULGORE.redCloud.x,z:MULGORE.redCloud.z};
    if(lm.id==="palemane")return {x:MULGORE.palemane.x,z:MULGORE.palemane.z};
    if(lm.id==="golden")return {x:MULGORE.golden.x,z:MULGORE.golden.z};
    if(lm.id==="thunderhorn")return {x:MULGORE.thunderhorn.x,z:MULGORE.thunderhorn.z};
    if(lm.id==="winterhoof")return {x:MULGORE.winterhoof.x,z:MULGORE.winterhoof.z};
    if(lm.id==="windfury")return {x:MULGORE.windfury.x,z:MULGORE.windfury.z};
    if(lm.id==="baeldun")return {x:MULGORE.baeldun.x,z:MULGORE.baeldun.z};
    if(lm.id==="venture")return {x:MULGORE.venture.x,z:MULGORE.venture.z};
  }
  if(lm.id==="portal_n"&&typeof BARRENS_PORTAL_N!=="undefined")return {x:BARRENS_PORTAL_N.x,z:BARRENS_PORTAL_N.z};
  if(lm.id==="portal_s"&&typeof BARRENS_PORTAL_S!=="undefined")return {x:BARRENS_PORTAL_S.x,z:BARRENS_PORTAL_S.z};
  if(lm.id==="portal_e"){
    if(typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="durotar"&&typeof DUROTAR_PORTAL_E!=="undefined")
      return {x:DUROTAR_PORTAL_E.x,z:DUROTAR_PORTAL_E.z};
    if(typeof BARRENS_PORTAL_E!=="undefined")return {x:BARRENS_PORTAL_E.x,z:BARRENS_PORTAL_E.z};
  }
  if(lm.id==="portal_w"){
    if(typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="durotar"&&typeof DUROTAR_PORTAL_W!=="undefined")
      return {x:DUROTAR_PORTAL_W.x,z:DUROTAR_PORTAL_W.z};
    if(typeof BARRENS_PORTAL_W!=="undefined")return {x:BARRENS_PORTAL_W.x,z:BARRENS_PORTAL_W.z};
  }
  if(lm.id==="crossroads"&&typeof crossroadsSentinel!=="undefined"&&crossroadsSentinel)
    return {x:crossroadsSentinel.position.x,z:crossroadsSentinel.position.z};
  if(lm.id==="ochre_outpost"&&typeof ochreOutpost!=="undefined"&&ochreOutpost)
    return {x:ochreOutpost.position.x,z:ochreOutpost.position.z};
  return {x:lm.x,z:lm.z};
}

function drawTerrain(ctx,size,pad,zone,view){
  const R=zone.radius();
  const T=zone.terrain||{};
  const to=(x,z)=>mapWorldToCanvas(x,z,size,pad,R,view);
  ctx.fillStyle=T.bg||"#0c1208";
  ctx.fillRect(0,0,size,size);
  const g=ctx.createRadialGradient(size/2,size/2,size*.08,size/2,size/2,size*.72);
  if(zone.id==="barrens"){
    g.addColorStop(0,"#3a2a14"); g.addColorStop(.55,"#241808"); g.addColorStop(1,"#120e06");
  }else if(zone.id==="durotar"){
    g.addColorStop(0,"#4a2010"); g.addColorStop(.55,"#2a1208"); g.addColorStop(1,"#140806");
  }else{
    g.addColorStop(0,"#2a3a1a"); g.addColorStop(.55,"#1a2810"); g.addColorStop(1,"#0c1008");
  }
  ctx.fillStyle=g; ctx.fillRect(0,0,size,size);

  /* 水域 POI 软斑 */
  (zone.landmarks||[]).forEach(lm=>{
    if(lm.kind!=="poi")return;
    const lab=lm.label||"";
    if(lab.indexOf("湖")<0&&lab.indexOf("井")<0&&lab.indexOf("绿洲")<0&&lm.id!=="lake"&&lm.id!=="dead_oasis")return;
    const pos=liveLandmarkPos(lm);
    const p=to(pos.x,pos.z);
    const rad=Math.max(6,size*(view?0.07:0.035));
    const wg=ctx.createRadialGradient(p.u,p.v,1,p.u,p.v,rad);
    wg.addColorStop(0,"rgba(80,160,220,.45)");
    wg.addColorStop(1,"rgba(40,100,160,0)");
    ctx.fillStyle=wg;
    ctx.beginPath(); ctx.arc(p.u,p.v,rad,0,Math.PI*2); ctx.fill();
  });

  /* 营地光晕 */
  (zone.landmarks||[]).forEach(lm=>{
    if(lm.kind!=="camp")return;
    const pos=liveLandmarkPos(lm);
    const p=to(pos.x,pos.z);
    const rad=Math.max(5,size*(view?0.055:0.028));
    const cg=ctx.createRadialGradient(p.u,p.v,1,p.u,p.v,rad);
    cg.addColorStop(0,"rgba(220,170,80,.28)");
    cg.addColorStop(1,"rgba(180,120,40,0)");
    ctx.fillStyle=cg;
    ctx.beginPath(); ctx.arc(p.u,p.v,rad,0,Math.PI*2); ctx.fill();
  });

  if(!view){
    ctx.beginPath();
    zone.outline.forEach((p,i)=>{
      const pt=to(p[0]*R,p[1]*R);
      if(i===0)ctx.moveTo(pt.u,pt.v); else ctx.lineTo(pt.u,pt.v);
    });
    ctx.closePath();
    ctx.fillStyle=T.fill||"rgba(60,90,35,.35)";
    ctx.fill();
    ctx.strokeStyle=T.stroke||"rgba(200,160,80,.45)";
    ctx.lineWidth=1.5;
    ctx.stroke();
  }

  ctx.strokeStyle="rgba(160,120,60,.7)";
  ctx.lineWidth=Math.max(1.5,size/(view?55:80));
  if(T.road&&Array.isArray(T.road)){
    const byId={};
    (zone.landmarks||[]).forEach(lm=>{byId[lm.id]=liveLandmarkPos(lm);});
    T.road.forEach(([a,b])=>{
      const pa=byId[a],pb=byId[b]; if(!pa||!pb)return;
      const ca=to(pa.x,pa.z);
      const cb=to(pb.x,pb.z);
      ctx.beginPath(); ctx.moveTo(ca.u,ca.v); ctx.lineTo(cb.u,cb.v); ctx.stroke();
    });
  }else if(!view){
    const camp=liveLandmarkPos({id:"camp",x:0,z:104});
    const portal=liveLandmarkPos({id:"portal",x:0,z:-344});
    const ca=to(camp.x,camp.z);
    const cb=to(portal.x,portal.z);
    ctx.beginPath(); ctx.moveTo(ca.u,ca.v); ctx.lineTo(cb.u,cb.v); ctx.stroke();
  }
  if(!view){
    const c0=to(0,0);
    const edge=to(R,0);
    ctx.beginPath();
    ctx.arc(c0.u,c0.v,Math.abs(edge.u-c0.u),0,Math.PI*2);
    ctx.strokeStyle="rgba(255,140,60,.2)";
    ctx.lineWidth=1;
    ctx.stroke();
  }
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
  /* 世界 face=0 朝 +Z（画布向下）；箭头几何 tip 朝本地 -Y（画布向上）→ 转 π-face */
  ctx.rotate(Math.PI-(face||0));
  ctx.fillStyle=color||"#7ab8ff";
  ctx.strokeStyle="#061018";
  ctx.lineWidth=1.2;
  ctx.shadowColor="rgba(0,0,0,.55)";
  ctx.shadowBlur=3;
  ctx.beginPath();
  ctx.moveTo(0,-8); ctx.lineTo(5.5,7); ctx.lineTo(0,3.5); ctx.lineTo(-5.5,7);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawCompassN(ctx,size){
  ctx.save();
  ctx.fillStyle="#e8c080";
  ctx.font="bold 11px 'Noto Sans SC','Microsoft YaHei',sans-serif";
  ctx.textAlign="center";
  ctx.textBaseline="top";
  ctx.shadowColor="rgba(0,0,0,.8)";
  ctx.shadowBlur=2;
  ctx.fillText("N",size/2,4);
  ctx.restore();
}

function drawQuestMark(ctx,u,v,kind){
  ctx.save();
  ctx.font="bold 12px Georgia,serif";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.lineWidth=2;
  ctx.strokeStyle="#1a1008";
  ctx.fillStyle=kind==="turnin"?"#ffd060":"#ffe040";
  const ch=kind==="turnin"?"?":"!";
  ctx.strokeText(ch,u,v-9);
  ctx.fillText(ch,u,v-9);
  ctx.restore();
}

function collectNearbyMobs(cx,cz,maxR,zid){
  const list=[];
  if(typeof MOBS==="undefined"||!BAL.map.miniMobs)return list;
  const r2=maxR*maxR;
  for(const m of MOBS){
    if(!m||m.state==="dead"||!m.mesh)continue;
    if((m.zoneId||"mulgore")!==zid)continue;
    const dx=m.mesh.position.x-cx, dz=m.mesh.position.z-cz;
    if(dx*dx+dz*dz>r2)continue;
    list.push({
      x:m.mesh.position.x, z:m.mesh.position.z,
      elite:!!m.elite, rare:!!(m.rare||m.worldBoss),
      hostile:m.aggroR==null||m.aggroR>0,
    });
  }
  return list;
}

function collectPartyBlips(){
  const list=[];
  if(!BAL.map.miniParty||typeof PARTY==="undefined")return list;
  for(const c of PARTY){
    if(!c||!c.alive||!c.mesh)continue;
    list.push({x:c.mesh.position.x,z:c.mesh.position.z,role:c.role||"dps"});
  }
  return list;
}

function collectDynamicElites(){
  const list=[];
  if(typeof MOBS==="undefined")return list;
  const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
  const gold=(BAL.rares&&BAL.rares.gold)||"#ffd700";
  const pink=(BAL.rares&&BAL.rares.elitePink)||"#ff9ad0";
  for(const m of MOBS){
    if(!m.elite||m.state==="dead")continue;
    if((m.zoneId||"mulgore")!==zid)continue;
    list.push({
      x:m.mesh.position.x, z:m.mesh.position.z,
      color:(m.rare||m.worldBoss)?gold:pink,
      rare:!!(m.rare||m.worldBoss),
    });
  }
  return list;
}

function paintMap(ctx,size,opts){
  const zone=getActiveMapZone();
  const pad=opts.pad!=null?opts.pad:BAL.map.padding;
  const R=zone.radius();
  const showLabels=!!opts.labels;
  const view=opts.view||null;
  const enrich=!!opts.enrich;
  const to=(x,z)=>mapWorldToCanvas(x,z,size,pad,R,view);
  const px=(typeof player!=="undefined"&&player)?player.position.x:0;
  const pz=(typeof player!=="undefined"&&player)?player.position.z:0;

  drawTerrain(ctx,size,pad,zone,view);

  /* 附近野怪（小地图 enrich） */
  if(enrich){
    const mobR=BAL.map.miniMobR||110;
    const mobs=collectNearbyMobs(px,pz,mobR,zone.id);
    for(const m of mobs){
      const p=to(m.x,m.z);
      const col=m.rare?"#ffd700":m.elite?"#ff9ad0":(m.hostile?"#e06050":"#c8b070");
      drawBlip(ctx,p.u,p.v,col,m.elite||m.rare?3.2:2.2,m.rare?"diamond":"circle");
    }
    const party=collectPartyBlips();
    for(const c of party){
      const p=to(c.x,c.z);
      const col=c.role==="tank"?"#6a9cff":c.role==="healer"?"#6aff9a":"#ffc060";
      drawBlip(ctx,p.u,p.v,col,3.4,"square");
    }
  }

  const labelR=BAL.map.miniLabelR||72;
  for(const lm of zone.landmarks){
    const pos=liveLandmarkPos(lm);
    if(view){
      const dx=pos.x-view.cx, dz=pos.z-view.cz;
      if(dx*dx+dz*dz>(view.half*1.35)*(view.half*1.35))continue;
    }
    const p=to(pos.x,pos.z);
    if(p.u<-8||p.v<-8||p.u>size+8||p.v>size+8)continue;
    const shape=lm.kind==="portal"?"diamond":lm.kind==="camp"?"square":"circle";
    const r=showLabels?5:(lm.kind==="portal"||lm.kind==="camp"?4:3.2);
    drawBlip(ctx,p.u,p.v,lm.color,r,shape);

    let qk=null;
    if(enrich&&BAL.map.miniQuest!==false&&lm.kind==="npc"&&typeof npcHasQuestOffer==="function"){
      if(npcHasQuestTurnIn(lm.id))qk="turnin";
      else if(npcHasQuestOffer(lm.id))qk="offer";
    }
    if(qk)drawQuestMark(ctx,p.u,p.v,qk);

    const near=enrich&&!showLabels&&Math.hypot(pos.x-px,pos.z-pz)<=labelR
      &&(lm.kind==="camp"||lm.kind==="portal"||lm.kind==="poi");
    if(showLabels||near){
      ctx.fillStyle=near?"#e8d8bc":"#e8d8bc";
      ctx.font=(near?"9px":"10px")+" 'Noto Sans SC','Microsoft YaHei',sans-serif";
      ctx.textAlign="left";
      ctx.fillText(lm.label,p.u+6,p.v+3);
    }
  }

  const dyn=collectDynamicElites();
  if(dyn.length){
    for(const e of dyn){
      const p=to(e.x,e.z);
      drawBlip(ctx,p.u,p.v,e.color,showLabels?5:3.5,e.rare?"diamond":"circle");
    }
  }else if(!enrich){
    const staticElites=typeof getRareMapEntries==="function"
      ?getRareMapEntries(zone.id)
      :(zone.elites||[]);
    for(const e of staticElites){
      const p=to(e.x,e.z);
      drawBlip(ctx,p.u,p.v,e.color,showLabels?5:3.5,e.rare?"diamond":"circle");
      if(showLabels){
        ctx.fillStyle=e.color;
        ctx.font="10px 'Noto Sans SC','Microsoft YaHei',sans-serif";
        ctx.fillText(e.label,p.u+7,p.v+3);
      }
    }
  }

  if(typeof player!=="undefined"&&player){
    const p=to(player.position.x,player.position.z);
    /* 玩家位置环 */
    ctx.save();
    ctx.strokeStyle="rgba(120,180,255,.45)";
    ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(p.u,p.v,10,0,Math.PI*2); ctx.stroke();
    ctx.restore();
    drawPlayerArrow(ctx,p.u,p.v,playerMapFace(),"#7ab8ff");
  }

  if(opts.compass)drawCompassN(ctx,size);
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
  const ctx=_mm.ctx;
  ctx.clearRect(0,0,size,size);
  /* 圆形裁剪（魔兽式小地图） */
  ctx.save();
  ctx.beginPath();
  ctx.arc(size/2,size/2,size/2-1.5,0,Math.PI*2);
  ctx.clip();

  if(S.mode==="raid"){
    const R=(typeof ARENA_R==="number"?ARENA_R:26)+4;
    const half=Math.min(R,BAL.map.miniRadius||96);
    const view={
      cx:player?player.position.x:0,
      cz:player?player.position.z:0,
      half,
    };
    ctx.fillStyle="#1a0802";
    ctx.fillRect(0,0,size,size);
    const zone=getActiveMapZone();
    const to=(x,z)=>mapWorldToCanvas(x,z,size,pad,zone.radius(),view);
    const c=to(0,0);
    const edge=to(R,0);
    ctx.beginPath();
    ctx.arc(c.u,c.v,Math.abs(edge.u-c.u),0,Math.PI*2);
    ctx.strokeStyle="rgba(255,100,40,.35)";
    ctx.stroke();
    if(typeof MOBS!=="undefined"){
      for(const m of MOBS){
        if(!m||m.state==="dead"||!m.mesh)continue;
        if((m.zoneId||"")&&m.zoneId!==zone.id&&zone.id!=="molten_core")continue;
        const p=to(m.mesh.position.x,m.mesh.position.z);
        drawBlip(ctx,p.u,p.v,m.elite?"#ff9ad0":"#e06050",2.4,"circle");
      }
    }
    if(player){
      const p=to(player.position.x,player.position.z);
      drawPlayerArrow(ctx,p.u,p.v,playerMapFace(),"#7ab8ff");
    }
    drawCompassN(ctx,size);
  }else{
    const half=BAL.map.miniRadius||96;
    const view={
      cx:player?player.position.x:0,
      cz:player?player.position.z:0,
      half,
    };
    paintMap(ctx,size,{pad,labels:false,view,enrich:true,compass:true});
  }
  ctx.restore();
  /* 外圈描边 */
  ctx.beginPath();
  ctx.arc(size/2,size/2,size/2-1.5,0,Math.PI*2);
  ctx.strokeStyle="rgba(255,160,70,.55)";
  ctx.lineWidth=2;
  ctx.stroke();
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
