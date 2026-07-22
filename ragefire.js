/* ============================================================
   熔火之心 · ragefire.js
   怒焰裂谷·精简（plan-v1 · V1-B3）：走廊燃刃 → 奥格弗林特 → 饥饿者塔拉加曼
   ------------------------------------------------------------
   [依赖] THREE · core.js（BAL srand rand scene makeLabel）
          zones.js（registerZone）
          models.js（buildFlameSpawn）
          raid.js（DUNGEONS getDungeon spawnAdd activateRaidBoss resetBoss
            EXIT_PORTAL_POS 运行时）
          durotar.js 运行时（西口进本）
          combat.js（S log announce）
   [导出] sceneRagefire RAGEFIRE_DUNGEON buildRagefireZone
   ============================================================ */
"use strict";

const sceneRagefire=new THREE.Scene();
sceneRagefire.fog=new THREE.FogExp2(BAL.ragefire.fog,BAL.ragefire.fogDensity);
sceneRagefire.background=new THREE.Color(BAL.ragefire.sky);

const RAGEFIRE_ARENA=()=>(BAL.ragefire&&BAL.ragefire.arenaR)||22;

function buildRagefireZone(root){
  const W=BAL.ragefire;
  const R=W.arenaR||22;
  const floor=new THREE.Mesh(
    new THREE.CylinderGeometry(R+4,R+6,.6,24),
    MAT.get("dungeon.ground",{color:W.ground,roughness:1,flatShading:true})
  );
  floor.position.y=-.3; floor.receiveShadow=true; root.add(floor);

  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2+srand(-.08,.08);
    const rr=R+1.2+srand(0,2);
    const h=5+srand(2,7);
    const wall=new THREE.Mesh(
      new THREE.BoxGeometry(3.2+srand(0,2),h,2.0+srand(0,1.4)),
      MAT.get("dungeon.wall",{color:W.wall,roughness:.95,flatShading:true,emissive:0x401008,emissiveIntensity:.12})
    );
    wall.position.set(Math.cos(a)*rr,h/2-0.2,Math.sin(a)*rr);
    wall.rotation.y=a; wall.castShadow=true; root.add(wall);
  }

  /* 熔岩池 */
  const pool=new THREE.Mesh(
    new THREE.CylinderGeometry(4.8,5.2,.2,16),
    MAT.get("lava.dungeon",{color:W.lava,roughness:.25,metalness:.15,emissive:0xff3000,emissiveIntensity:.55})
  );
  pool.position.set(0,.08,-8); root.add(pool);

  for(let i=0;i<10;i++){
    const a=srand(0,6.28), rr=srand(5,R-5);
    const h=1.2+srand(.8,2.5);
    const spike=new THREE.Mesh(
      new THREE.ConeGeometry(.3+srand(0,.35),h,6),
      MAT.get("lava.rock",{color:0x5a2010,emissive:0xff4000,emissiveIntensity:.2})
    );
    spike.position.set(Math.cos(a)*rr,h/2,Math.sin(a)*rr);
    root.add(spike);
  }

  const hemi=new THREE.HemisphereLight(0xff9060,0x2a1008,.9);
  root.add(hemi);
  const torch=new THREE.PointLight(0xff6020,1.6,42,2);
  torch.position.set(0,7,-6); root.add(torch);
  const entry=new THREE.PointLight(0xffa040,1.0,28,2);
  entry.position.set(0,6,14); root.add(entry);

  const lab=makeLabel("怒焰裂谷",9,"#ffb080","rgba(100,30,10,.9)");
  lab.position.set(0,7,16); root.add(lab);
}

const RAGEFIRE_DUNGEON={
  id:"ragefire_chasm",
  stage:"corridor",
  mobsAlive:0,
  bridgeT:0,
  bridgeDone:true,
  wipePolicy:"keep_stage",
  exitZone:"durotar",
  exitGate:"from_ragefire",
  raidSpawn:{x:0,z:16},
  afterCorridor:"boss1",
  wipeBoss1:"oggleflint",
  wipeFinal:"taragaman",
  arenaR:RAGEFIRE_ARENA(),
  addCfg:{
    build:()=>buildFlameSpawn(),
    balKey:"ragefireAdd",
    name:"燃刃兽人",
    lootTable:"ragefireAdd",
    dieLog:"一名燃刃兽人倒下了！",
    burstColor:0xff6020,
  },
  setStage(s){
    if(s==="corridor"){
      this.stage="corridor";
      S.b.alive=false; if(boss)boss.visible=false;
      const n=(BAL.ragefire&&BAL.ragefire.corridorCount)||3;
      for(let i=0;i<n;i++){
        const a=i/n*Math.PI*2+rand(-.4,.4);
        spawnAdd(Math.cos(a)*rand(9,15),Math.sin(a)*rand(7,13)-4);
      }
      this.mobsAlive=n;
      log("怒焰裂谷中燃刃兽人涌出——消灭他们才能面对奥格弗林特。","lg-sys");
    }else if(s==="boss1"){
      this.stage="boss1";
      activateRaidBoss("oggleflint");
      announce("奥格弗林特 · 燃刃督军！");
      log("熔岩翻涌，奥格弗林特挡在了去路中央！","lg-boss");
    }else if(s==="boss"){
      this.stage="boss";
      activateRaidBoss("taragaman");
      announce("饥饿者 · 塔拉加曼！");
      log("裂谷最深处，饥饿者缓缓站起——怒焰缠绕着石柱。","lg-boss");
    }
  },
  tickBridge(){ /* 怒焰无岩桥 */ },
};

DUNGEONS.ragefire_chasm=RAGEFIRE_DUNGEON;

registerZone({
  id:"ragefire_chasm",
  name:"怒焰裂谷",
  scene:sceneRagefire,
  build:buildRagefireZone,
  music:"raid",
  mode:"raid",
  levelRange:[13,16],
  boundsR:()=>RAGEFIRE_ARENA()-2,
  dayNight:false,
  gates:{
    entrance:{x:0,z:16},
    default:{x:0,z:16},
  },
  portals:[{
    id:"to_durotar_from_ragefire",
    pos:()=>EXIT_PORTAL_POS,
    enterR:()=>BAL.zones.exitPortalEnterR,
    visible:()=>!!(S.b&&S.b.canLeave&&exitPortal),
    autoEnter:false,
    targetZone:"durotar",
    targetGate:"from_ragefire",
  }],
  onEnter(fromId,gateId,opts){
    if(opts&&opts.silent)return;
    if(typeof resetBoss==="function")resetBoss();
    RAGEFIRE_DUNGEON.setStage("corridor");
    log("你踏入怒焰裂谷——热浪与硫磺扑面而来。","lg-sys");
    $("#bossFrame").classList.add("show");
    const n=$("#bossName .n"), t=$("#bossName .t");
    if(n)n.textContent="🔥 怒焰裂谷";
    if(t)t.textContent="赭岩谷 · 地下裂隙";
  },
  onLeave(){
    if(typeof removeExitPortal==="function")removeExitPortal();
    $("#bossFrame").classList.remove("show");
  },
});
