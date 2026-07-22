/* ============================================================
   炽心 · wailing.js
   泣息洞窟（STEP 21）：5 人风格副本 · 走廊变异兽 → 考布 → 吞噬者
   ------------------------------------------------------------
   [依赖] THREE · core.js（BAL srand rand scene makeLabel）
          zones.js（registerZone）
          creatures.js（buildQuadruped QUADS）
          raid.js（DUNGEONS getDungeon spawnAdd activateRaidBoss resetBoss
            EXIT_PORTAL_POS 运行时）
          barrens.js 运行时（南口进本）
          combat.js（S log announce）
   [导出] sceneWailing WAILING_DUNGEON buildWailingZone
   ============================================================ */
"use strict";

const sceneWailing=new THREE.Scene();
sceneWailing.fog=new THREE.FogExp2(BAL.wailing.fog,BAL.wailing.fogDensity);
sceneWailing.background=new THREE.Color(BAL.wailing.sky);

const WAILING_ARENA=()=>(BAL.wailing&&BAL.wailing.arenaR)||24;

function buildWailingZone(root){
  const W=BAL.wailing;
  const R=W.arenaR||24;
  /* 洞底 */
  const floor=new THREE.Mesh(
    new THREE.CylinderGeometry(R+4,R+6,.6,24),
    MAT.get("dungeon.ground",{color:W.ground,roughness:1,flatShading:true})
  );
  floor.position.y=-.3; floor.receiveShadow=true; root.add(floor);

  /* 环形岩壁 */
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2+srand(-.08,.08);
    const rr=R+1.5+srand(0,2);
    const h=6+srand(2,8);
    const wall=new THREE.Mesh(
      new THREE.BoxGeometry(3.5+srand(0,2),h,2.2+srand(0,1.5)),
      MAT.get("dungeon.wall",{color:W.wall,roughness:.95,flatShading:true})
    );
    wall.position.set(Math.cos(a)*rr,h/2-0.2,Math.sin(a)*rr);
    wall.rotation.y=a; wall.castShadow=true; root.add(wall);
  }

  /* 钟乳石 / 苔藓柱 */
  for(let i=0;i<14;i++){
    const a=srand(0,6.28), rr=srand(6,R-4);
    const h=2+srand(1,4);
    const stal=new THREE.Mesh(
      new THREE.ConeGeometry(.35+srand(0,.4),h,6),
      MAT.get("dungeon.moss",{color:W.moss,roughness:1,flatShading:true})
    );
    stal.position.set(Math.cos(a)*rr,h/2,Math.sin(a)*rr);
    root.add(stal);
  }

  /* 中央浅池（毒绿） */
  const pool=new THREE.Mesh(
    new THREE.CylinderGeometry(5.5,6,.15,16),
    MAT.get("water.poison")
  );
  pool.position.set(0,.05,-8); root.add(pool);

  /* 入口平台光 */
  const hemi=new THREE.HemisphereLight(0x6a8a60,0x1a2810,.85);
  root.add(hemi);
  const torch=new THREE.PointLight(0x66aa44,1.4,40,2);
  torch.position.set(0,8,-6); root.add(torch);
  const entry=new THREE.PointLight(0xaacc88,.9,28,2);
  entry.position.set(0,6,14); root.add(entry);

  const lab=makeLabel(T("zone.wailing"),9,"#a8d080","rgba(40,80,30,.9)");
  lab.position.set(0,7,16); root.add(lab);
}

/* 泣息洞窟副本状态机（无岩桥：corridor → boss1 → boss） */
const WAILING_DUNGEON={
  id:"wailing_caverns",
  stage:"corridor",
  mobsAlive:0,
  bridgeT:0,
  bridgeDone:true,
  wipePolicy:"keep_stage",
  exitZone:"barrens",
  exitGate:"from_wailing",
  raidSpawn:{x:0,z:16},
  afterCorridor:"boss1",
  wipeBoss1:"cobrahn",
  wipeFinal:"verdan",
  arenaR:WAILING_ARENA(),
  addCfg:{
    build:()=>buildQuadruped(QUADS.deviate),
    balKey:"wailingAdd",
    name:"变异蛇",
    lootTable:"wailingAdd",
    dieLog:"一只变异蛇倒下了！",
    burstColor:0x44aa22,
  },
  setStage(s){
    if(s==="corridor"){
      this.stage="corridor";
      S.b.alive=false; if(boss)boss.visible=false;
      const n=(BAL.wailing&&BAL.wailing.corridorCount)||3;
      for(let i=0;i<n;i++){
        const a=i/n*Math.PI*2+rand(-.4,.4);
        spawnAdd(Math.cos(a)*rand(10,16),Math.sin(a)*rand(8,14)-4);
      }
      this.mobsAlive=n;
      log("潮湿的嘶鸣响起——变异蛇从岩缝中涌出！消灭它们才能面对"+T("boss.cobrahn_short")+"。","lg-sys");
    }else if(s==="boss1"){
      this.stage="boss1";
      activateRaidBoss("cobrahn");
      announce(T("boss.cobrahn_short")+" · 毒牙领主！");
      log("毒液在石缝间汇聚，"+T("boss.cobrahn_short")+"挡在了去路中央！","lg-boss");
    }else if(s==="boss"){
      this.stage="boss";
      activateRaidBoss("verdan");
      announce("吞噬者 · 永生者！");
      log("洞穴最深处，吞噬者缓缓站起——藤蔓缠绕着石柱。","lg-boss");
    }
  },
  tickBridge(){ /* 哀嚎无岩桥 */ },
};

DUNGEONS.wailing_caverns=WAILING_DUNGEON;

registerZone({
  id:"wailing_caverns",
  name:T("zone.wailing"),
  scene:sceneWailing,
  build:buildWailingZone,
  music:"raid",
  mode:"raid",
  levelRange:[15,18],
  boundsR:()=>WAILING_ARENA()-2,
  dayNight:false,
  gates:{
    entrance:{x:0,z:16},
    default:{x:0,z:16},
  },
  portals:[{
    id:"to_barrens_from_wailing",
    pos:()=>EXIT_PORTAL_POS,
    enterR:()=>BAL.zones.exitPortalEnterR,
    visible:()=>!!(S.b&&S.b.canLeave&&exitPortal),
    autoEnter:false,
    targetZone:"barrens",
    targetGate:"from_wailing",
  }],
  onEnter(fromId,gateId,opts){
    if(opts&&opts.silent)return;
    if(typeof resetBoss==="function")resetBoss();
    WAILING_DUNGEON.setStage("corridor");
    log("你踏入"+T("zone.wailing")+"——潮气与毒草的气味扑面而来。","lg-sys");
    $("#bossFrame").classList.add("show");
    const n=$("#bossName .n"), t=$("#bossName .t");
    if(n)n.textContent="🐍 "+T("zone.wailing");
    if(t)t.textContent=T("zone.barrens")+" · 地下洞穴";
  },
  onLeave(){
    if(typeof removeExitPortal==="function")removeExitPortal();
    $("#bossFrame").classList.remove("show");
  },
});
