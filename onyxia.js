/* ============================================================
   熔火之心 · onyxia.js
   奥妮克希亚巢穴·精简（STEP 28）：走廊幼龙 → 奥妮克希亚三阶段
   ------------------------------------------------------------
   [依赖] THREE · core.js（BAL srand rand scene makeLabel）
          zones.js（registerZone）
          models.js（buildOnyxia）
          raid.js（DUNGEONS spawnAdd activateRaidBoss resetBoss EXIT_PORTAL_POS）
          barrens.js 运行时（东口进本）
          combat.js（S log announce）
   [导出] sceneOnyxia ONYXIA_DUNGEON buildOnyxiaZone
   ============================================================ */
"use strict";

const sceneOnyxia=new THREE.Scene();
sceneOnyxia.fog=new THREE.FogExp2(BAL.onyxiasLair.fog,BAL.onyxiasLair.fogDensity);
sceneOnyxia.background=new THREE.Color(BAL.onyxiasLair.sky);

const ONYXIA_ARENA=()=>(BAL.onyxiasLair&&BAL.onyxiasLair.arenaR)||26;

function buildOnyxiaZone(root){
  const W=BAL.onyxiasLair;
  const R=W.arenaR||26;
  const floor=new THREE.Mesh(
    new THREE.CylinderGeometry(R+3,R+5,.55,22),
    new THREE.MeshStandardMaterial({color:W.ground,roughness:1,flatShading:true})
  );
  floor.position.y=-.28; floor.receiveShadow=true; root.add(floor);

  /* 环形岩壁 */
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2+srand(-.06,.06);
    const rr=R+1.2+srand(0,1.8);
    const h=7+srand(2,9);
    const wall=new THREE.Mesh(
      new THREE.BoxGeometry(3.2+srand(0,2),h,2.4+srand(0,1.2)),
      new THREE.MeshStandardMaterial({color:W.wall,roughness:.95,flatShading:true})
    );
    wall.position.set(Math.cos(a)*rr,h/2-.2,Math.sin(a)*rr);
    wall.rotation.y=a; wall.castShadow=true; root.add(wall);
  }

  /* 散落龙骨 */
  for(let i=0;i<8;i++){
    const a=srand(0,6.28), rr=srand(7,R-5);
    const bone=new THREE.Mesh(
      new THREE.CylinderGeometry(.12,.08,2.2+srand(0,1.5),5),
      new THREE.MeshStandardMaterial({color:W.bone,roughness:.7})
    );
    bone.position.set(Math.cos(a)*rr,.6,Math.sin(a)*rr);
    bone.rotation.set(srand(-.4,.4),a,srand(-.5,.5));
    root.add(bone);
  }

  /* 中央熔岩浅池 */
  const pool=new THREE.Mesh(
    new THREE.CylinderGeometry(4.5,5,.12,14),
    new THREE.MeshStandardMaterial({color:0x4a1808,roughness:.25,metalness:.15,
      emissive:0xff3a00,emissiveIntensity:.45})
  );
  pool.position.set(0,.04,-10); root.add(pool);

  const hemi=new THREE.HemisphereLight(0x8a6060,0x1a0808,.9);
  root.add(hemi);
  const torch=new THREE.PointLight(0xff5520,1.6,45,2);
  torch.position.set(0,9,-8); root.add(torch);
  const entry=new THREE.PointLight(0xaa6644,1.0,30,2);
  entry.position.set(0,7,14); root.add(entry);

  const lab=makeLabel("奥妮克希亚巢穴",9,"#e8a080","rgba(60,20,15,.92)");
  lab.position.set(0,7.5,16); root.add(lab);
}

const ONYXIA_DUNGEON={
  id:"onyxias_lair",
  stage:"corridor",
  mobsAlive:0,
  bridgeT:0,
  bridgeDone:true,
  wipePolicy:"keep_stage",
  exitZone:"barrens",
  exitGate:"from_onyxia",
  raidSpawn:{x:0,z:16},
  afterCorridor:"boss",
  wipeFinal:"onyxia",
  arenaR:ONYXIA_ARENA(),
  addCfg:{
    build:()=>buildFlameSpawn(),
    balKey:"onyxiaAdd",
    name:"黑龙幼崽",
    lootTable:"onyxiaAdd",
    dieLog:"一只黑龙幼崽倒下了！",
    burstColor:0xff4400,
  },
  setStage(s){
    if(s==="corridor"){
      this.stage="corridor";
      S.b.alive=false; if(boss)boss.visible=false;
      const n=(BAL.onyxiasLair&&BAL.onyxiasLair.corridorCount)||2;
      for(let i=0;i<n;i++){
        const a=i/n*Math.PI*2+rand(-.5,.5);
        spawnAdd(Math.cos(a)*rand(9,14),Math.sin(a)*rand(6,12)-2);
      }
      this.mobsAlive=n;
      log("巢穴入口处爬出几只黑龙幼崽——消灭它们才能面对龙后。","lg-sys");
    }else if(s==="boss"){
      this.stage="boss";
      activateRaidBoss("onyxia");
      announce("奥妮克希亚 · 黑龙女王！");
      log("巢穴深处，黑龙女王奥妮克希亚张开双翼——三阶段之战开始！","lg-boss");
    }
  },
  tickBridge(){ /* 无岩桥 */ },
};

DUNGEONS.onyxias_lair=ONYXIA_DUNGEON;

registerZone({
  id:"onyxias_lair",
  name:"奥妮克希亚巢穴",
  scene:sceneOnyxia,
  build:buildOnyxiaZone,
  music:"onyxia",
  mode:"raid",
  levelRange:[16,18],
  boundsR:()=>ONYXIA_ARENA()-2,
  dayNight:false,
  gates:{
    entrance:{x:0,z:16},
    default:{x:0,z:16},
  },
  portals:[{
    id:"to_barrens_from_onyxia",
    pos:()=>EXIT_PORTAL_POS,
    enterR:()=>BAL.zones.exitPortalEnterR,
    visible:()=>!!(S.b&&S.b.canLeave&&exitPortal),
    autoEnter:false,
    targetZone:"barrens",
    targetGate:"from_onyxia",
  }],
  onEnter(fromId,gateId,opts){
    if(opts&&opts.silent)return;
    if(typeof resetBoss==="function")resetBoss();
    ONYXIA_DUNGEON.setStage("corridor");
    log("你踏入奥妮克希亚巢穴——硫磺与焦骨的气味扑面而来。","lg-sys");
    $("#bossFrame").classList.add("show");
    const n=$("#bossName .n"), t=$("#bossName .t");
    if(n)n.textContent="🐉 奥妮克希亚巢穴";
    if(t)t.textContent="贫瘠之地 · 黑龙巢穴";
  },
  onLeave(){
    if(typeof removeExitPortal==="function")removeExitPortal();
    $("#bossFrame").classList.remove("show");
  },
});
