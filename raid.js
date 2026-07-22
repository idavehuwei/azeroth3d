/* ============================================================
   熔火之心 · raid.js
   副本系统（STEP 8）：副本环境搭建 / 烈焰之子 / 分段
            Boss 工厂（STEP 9b）：createBoss + BOSSES 数据驱动 AI
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ clamp rand R BAL scene camera ARENA_R
          lavaUniforms embers EMBERS emberVel srand worldRng sceneRaid setZoneSeed）
          zones.js（registerZone ensureZoneBuilt enterZone）
          models.js（buildFlameSpawn buildBoss buildQuadruped QUADS）
          items.js（ITEMS DROPS removeDrop dropLoot rollLoot LOOT）
          world.js（player boss BOSS_MESHES MOBS QUEST setCorpse corpseMat removeDropOf
          spawnExitPortal removeExitPortal leaveRaid）
          vfx.js（VFX fireProjectile spawnTelegraph spawnBurst disposeVfxMesh）
          save.js 运行时（saveGame；Boss 击杀自动存）
          combat.js 运行时（gainCopper rollCopperRange playerHit）
          companions.js 运行时（companionAlive companionHit COMPANION）
   [导出] BOSSES createBoss defineBoss getBossCfg armBossSkills activateRaidBoss mountBossMesh
          getDifficultyCfg getRaidLootWeights
          bossAI startCast spawnAdd addDamage addDie bossDie playerDie resetBoss
          releaseSpiritWorld releaseSpiritRaid releaseSpiritLeaveRaid resurrectPlayer
          showDeathUi hideDeathUi clearRaidHazards applyWipeEncounter
          distToBoss bossTargetable BOSS_ENT DUNGEON DUNGEONS getDungeon
          buildRaidScene buildMoltenCoreZone
   ============================================================ */
"use strict";

/* ============================================================
   副本环境搭建（原 core.js 中 sceneRaid 的附加内容）
   由 ZONES.molten_core.build → ensureZoneBuilt 调用（STEP 17）
   ============================================================ */
function buildMoltenCoreZone(scn){
  const root=scn||sceneRaid;
  /* 光照：熔岩环境 */
  root.add(new THREE.AmbientLight(0x662211,0.9));
  const lavaLight=new THREE.PointLight(0xff5a1a,1.6,140,1.6); lavaLight.position.set(0,6,-26); root.add(lavaLight);
  const topLight=new THREE.DirectionalLight(0xffb070,0.55);
  topLight.position.set(18,40,20); topLight.castShadow=true;
  topLight.shadow.mapSize.set(2048,2048);
  topLight.shadow.camera.left=-50;topLight.shadow.camera.right=50;
  topLight.shadow.camera.top=50;topLight.shadow.camera.bottom=-50;
  root.add(topLight);

  /* 岩浆湖 */
  const lavaMat=new THREE.ShaderMaterial({
    uniforms:lavaUniforms,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;uniform float uTime;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.545);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
      void main(){
        vec2 p=vUv*14.;
        float f=fbm(p+vec2(uTime*.12,uTime*.05)+fbm(p*.6-uTime*.07)*2.2);
        vec3 dark=vec3(.12,.02,.0), mid=vec3(.85,.22,.02), hot=vec3(1.,.85,.35);
        vec3 c=mix(dark,mid,smoothstep(.28,.62,f));
        c=mix(c,hot,smoothstep(.68,.9,f));
        gl_FragColor=vec4(c,1.);
      }`
  });
  const lava=new THREE.Mesh(new THREE.PlaneGeometry(320,320,1,1),lavaMat);
  lava.rotation.x=-Math.PI/2; lava.position.y=-0.9; root.add(lava);

  /* 黑曜石战斗平台 */
  const platMat=new THREE.MeshStandardMaterial({color:0x1c1412,roughness:.92,metalness:.15});
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(ARENA_R,ARENA_R+2.5,2.2,48),platMat);
  platform.position.y=-1.1; platform.receiveShadow=true; root.add(platform);
  /* 平台边缘符文环 */
  const runeRing=new THREE.Mesh(new THREE.RingGeometry(ARENA_R-1.4,ARENA_R-0.6,64),
    new THREE.MeshBasicMaterial({color:0xff6a1a,transparent:true,opacity:.35,side:THREE.DoubleSide}));
  runeRing.rotation.x=-Math.PI/2; runeRing.position.y=0.03; root.add(runeRing);

  /* 环形岩柱群 */
  const rockMat=new THREE.MeshStandardMaterial({color:0x2b1a12,roughness:1,flatShading:true});
  const glowRockMat=new THREE.MeshStandardMaterial({color:0x3a1408,roughness:.9,flatShading:true,
    emissive:0xff3b00,emissiveIntensity:.25});
  for(let i=0;i<14;i++){
    const a=i/14*Math.PI*2+srand(-.1,.1), r=ARENA_R+srand(6,14);
    const h=srand(6,17);
    const rock=new THREE.Mesh(new THREE.CylinderGeometry(srand(.6,1.6),srand(2.2,3.6),h,6),
      worldRng()<.4?glowRockMat:rockMat);
    rock.position.set(Math.cos(a)*r,h/2-1.5,Math.sin(a)*r);
    rock.rotation.set(srand(-.12,.12),srand(0,6),srand(-.12,.12));
    rock.castShadow=true; root.add(rock);
  }
  /* 平台上散落碎石 */
  for(let i=0;i<10;i++){
    const a=srand(0,6.28),r=srand(8,ARENA_R-3);
    const s=srand(.4,1.1);
    const st=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),rockMat);
    st.position.set(Math.cos(a)*r,s*.4,Math.sin(a)*r);
    st.castShadow=true;st.receiveShadow=true;root.add(st);
  }
  /* 火星粒子加入副本场景 */
  root.add(embers);
  /* 岩桥屏障 */
  buildBridge(root);
}
function buildRaidScene(){ensureZoneBuilt("molten_core");}

/* ---- 岩桥屏障（STEP 8）：全局变量，供 buildRaidScene 写入 + DUNGEON 动画消费 ---- */
const bridgeSegs=[];
const BRIDGE_SINK_Y=-2.5;
function buildBridge(root){
  root=root||sceneRaid;
  const bridgeMat=new THREE.MeshStandardMaterial({color:0x2a1a10,roughness:1,flatShading:true,
    emissive:0x551100,emissiveIntensity:.15});
  for(let i=0;i<7;i++){
    const a=i/7*Math.PI*2+(-.15+i*.05);
    const r=6.5;
    const seg=new THREE.Mesh(new THREE.CylinderGeometry(.8,1.2,4.5,6),bridgeMat);
    seg.position.set(Math.cos(a)*r,2.25,Math.sin(a)*r);
    seg.castShadow=true; root.add(seg);
    bridgeSegs.push(seg);
  }
  /* 桥面石板（装饰性） */
  const slabMat=new THREE.MeshStandardMaterial({color:0x3a2818,roughness:.95,flatShading:true});
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2;
    const slab=new THREE.Mesh(new THREE.BoxGeometry(1.8,.25,1.8),slabMat);
    slab.position.set(Math.cos(a)*4.5,.12,Math.sin(a)*4.5);
    slab.receiveShadow=true; root.add(slab);
  }
}

registerZone({
  id:"molten_core",
  name:"熔火之心",
  scene:sceneRaid,
  build:buildMoltenCoreZone,
  music:"raid",
  mode:"raid",
  levelRange:[1,10],
  boundsR:()=>ARENA_R-2,
  dayNight:false,
  gates:{
    entrance:{x:0,z:18},
    default:{x:0,z:18},
  },
  portals:[{
    id:"to_mulgore",
    pos:()=>EXIT_PORTAL_POS,
    enterR:()=>BAL.zones.exitPortalEnterR,
    visible:()=>!!(S.b&&S.b.canLeave&&exitPortal),
    autoEnter:false,   /* 需 F / 交互按钮，与旧行为一致 */
    targetZone:"mulgore",
    targetGate:"from_raid",
  }],
  onEnter(fromId,gateId,opts){
    if(opts&&opts.silent)return;
    if(typeof resetBoss==="function")resetBoss();
    if(typeof DUNGEON!=="undefined"&&DUNGEON.setStage)DUNGEON.setStage("corridor");
    log("你踏入传送门——热浪扑面而来，岩浆在脚下沸腾！","lg-sys");
    $("#bossFrame").classList.add("show");
  },
  onLeave(){
    if(typeof removeExitPortal==="function")removeExitPortal();
    $("#bossFrame").classList.remove("show");
  },
});

/* ============================================================
   副本分段系统（STEP 8 + 9c）
   corridor → boss1（玛格曼达）→ bridge → boss（拉戈斯）
   ============================================================ */
const DUNGEON={
  id:"molten_core",
  stage:"boss",      /* "corridor" | "boss1" | "bridge" | "boss" */
  mobsAlive:0,
  bridgeT:0,
  bridgeDone:false,
  wipePolicy:"keep_stage",
  exitZone:"mulgore",
  exitGate:"from_raid",
  raidSpawn:{x:0,z:18},
  wipeBoss1:"magmadar",
  wipeFinal:"ragnaros",
  addCfg:{build:null, balKey:"add", name:"烈焰之子", lootTable:"add",
    dieLog:"一只烈焰之子被消灭了！", burstColor:0xff5a1a},
  setStage(s){
    if(s==="corridor"){
      this.stage="corridor"; this.bridgeDone=false;
      S.b.alive=false; if(boss)boss.visible=false;
      for(let i=0;i<2;i++){
        const a=i*Math.PI+rand(-.5,.5);
        spawnAdd(Math.cos(a)*rand(14,20),Math.sin(a)*rand(14,20)-8);
      }
      this.mobsAlive=2;
      log("走廊中涌出熔岩犬！消灭它们才能面对玛格曼达。","lg-sys");
    }else if(s==="boss1"){
      this.stage="boss1";
      activateRaidBoss("magmadar");
      announce("玛格曼达 · 熔岩猎犬！");
      log("黑曜石平台上，一头燃烧的熔岩猎犬咆哮着迎了上来！","lg-boss");
    }else if(s==="bridge"){
      this.stage="bridge"; this.bridgeT=0; this.bridgeDone=false;
      S.b.alive=false; if(boss)boss.visible=false;
      announce("岩桥正在开启！");
      log("玛格曼达倒下，黑曜石岩柱缓缓沉入地面——通往炎魔的道路打开了……","lg-sys");
    }else if(s==="boss"){
      this.stage="boss"; this.bridgeDone=true;
      activateRaidBoss("ragnaros");
      announce("炎魔领主苏醒！");
      log("熔岩散去，通往拉戈斯平台的道路已经打开。","lg-sys");
    }
  },
  tickBridge(dt){
    if(this.stage!=="bridge"||this.bridgeDone)return;
    this.bridgeT=Math.min(1,this.bridgeT+dt*.5);
    const t=this.bridgeT;
    for(let i=0;i<bridgeSegs.length;i++){
      const seg=bridgeSegs[i];
      seg.position.y=2.25-t*(2.25-BRIDGE_SINK_Y);
      seg.material.opacity=1-t*.3;
      seg.material.transparent=t>.5;
    }
    if(t>=1){
      this.bridgeDone=true;
      this.setStage("boss");
    }
  },
};

/* 多副本注册表（STEP 21）：getDungeon() 按当前 zone 取活动副本 */
const DUNGEONS={molten_core:DUNGEON};
function getDungeon(){
  const z=typeof getCurrentZoneId==="function"?getCurrentZoneId():"molten_core";
  return DUNGEONS[z]||DUNGEON;
}

/* ============================================================
   Boss 工厂（STEP 9b）：createBoss(config) + 数据驱动 AI
   加 Boss = 在 BOSSES 加一条；技能/阶段/喊话全在数据表
   ============================================================ */
const BOSSES={};

function defineBoss(cfg){BOSSES[cfg.id]=cfg;return cfg;}

/* ---- 拉戈斯：数值引用 BAL.boss，文案与流程在此 ---- */
defineBoss({
  id:"ragnaros",
  name:"拉戈斯 · 炎魔领主",
  title:"熔火之心 · 最终首领",
  hitNoun:"炎魔",
  statsKey:"boss",
  build:()=>buildBoss(),
  projectileY:9, fctY:9,
  intro:{
    type:"rise", fromY:-16, toY:0, dur:4,
    burst:{at:1.2,window:.1,vfx:"roar_aura",pos:[0,1,-14],color:0xff5a1a,count:60,spread:4},
    sfx:"roar",
    announce:"拉戈斯：太早了！你们竟敢太早唤醒我！",
    log:"炎魔领主 拉戈斯 从熔岩中苏醒了！",
  },
  bob:true,
  home:{x:0,z:-14},
  skills:[
    {id:"melee",type:"melee",bal:"melee",name:"熔火重击",firstDelay:6,
      vfx:"melee_impact",label:"拉戈斯的熔火重击",
      phaseMul:{2:"p2Mul",3:"p3Mul"}},
    {id:"fireball",type:"cast_projectile",bal:"fireball",name:"烈焰冲击",firstDelay:10,
      vfx:"lava_bolt",log:"拉戈斯掷出烈焰冲击！",exclusive:true},
    {id:"eruption",type:"cast_telegraph",bal:"eruption",name:"熔岩喷发",firstDelay:14,
      vfx:"eruption_ring",playerRingR:4.5,
      countKey:{1:"count",2:"p2Count",3:"p3Count"},
      announce:"熔岩喷发 · 快躲开红圈！",log:"大地震颤，熔岩即将喷发！",exclusive:true},
    {id:"wrath",type:"cast_knockback",bal:"wrath",name:"拉戈斯之怒",firstDelay:22,
      vfx:"roar_aura",vfxY:2,announce:"拉戈斯之怒！",
      knockT:.4,hitLog:"你被巨大的冲击波击飞！",exclusive:true},
  ],
  phases:[
    {to:2,from:1,hpPctKey:"phase2At",onEnter:"submerge",
      submergeTKey:"submergeT",
      spawnAdds:{countKey:"addCount",r:[10,16],zOff:-4},
      sfx:"roar",announce:"阶段二 · 烈焰之子！",
      log:"拉戈斯沉入岩浆——烈焰之子从熔岩中涌出！消灭它们！",
      emergeAnnounce:"拉戈斯重新浮出岩浆！",
      emergeLog:"烈焰散去，拉戈斯再度现身！",
      emergeNext:{melee:2,fireball:5,eruption:8,wrath:14}},
    {to:3,from:2,hpPctKey:"phase3At",onEnter:"enrage",
      sfx:"roar",announce:"⚠️ 阶段三 · 拉戈斯狂暴！",
      log:"拉戈斯发出震天咆哮——岩浆沸腾，烈焰之子将不断重生！",
      compressNext:{melee:1.5,fireball:3,eruption:2.5,wrath:6},
      burst:{vfx:"roar_aura",y:6,color:0xff2200,count:80,spread:8},
      spawnAdds:{count:3,r:[8,14],zOff:-4},
      addWave:{interval:5,count:2,r:[10,16],zOff:-4,
        log:"熔岩翻涌——新的烈焰之子从岩浆中爬出！"}},
  ],
  death:{
    isFinal:true, questComplete:true,
    sfx:"roar",announce:"炎魔领主 已被击败！",
    log:"拉戈斯发出震天怒吼，缓缓沉回熔岩深处……",
    tip:"已拾取战利品后，走进出现的传送门即可离开副本。",
    lootId:"sulfuras_haft",lootPos:[0,0,-8],lootDelay:3400,
    lootAnnounce:"传说战利品 · 按 F 拾取",
    lootLog:"熔岩翻涌，一柄燃烧的锤柄浮出岩浆——靠近按 F 拾取。",
    endTitle:"胜 利",endSub:"MOLTEN CORE · CLEARED",
    endHtml:"炎魔领主的躯体崩解为冷却的黑曜岩。<br>前往副本入口处，走进传送门离开。",
    burst:{vfx:"roar_aura",y:6,color:0xffc060,count:120,spread:9},
  },
  defeat:{
    endTitle:"团 灭",endSub:"YOU HAVE BEEN DEFEATED",
    endHtml:"烈焰吞没了你的身躯，拉戈斯的狂笑响彻洞穴。<br>灵魂医者在等着你——跑尸之后，再来一次。",
  },
});

/* ---- 玛格曼达：熔火一号位（STEP 9c）· 大体型 + 多机制 ---- */
defineBoss({
  id:"magmadar",
  name:"玛格曼达 · 熔岩猎犬",
  title:"熔火之心 · 一号首领",
  hitNoun:"玛格曼达",
  statsKey:"magmadar",
  build:()=>buildQuadruped(QUADS.magmadar),
  projectileY:5.5, fctY:7.5,
  intro:{
    type:"appear", fromY:0, toY:0, dur:1.4,
    burst:{at:.35,window:.2,vfx:"roar_aura",pos:[0,3,-12],color:0xff5a1a,count:70,spread:5},
    sfx:"roar",
    announce:"玛格曼达发出灼热的咆哮！",
    log:"巨型熔岩猎犬玛格曼达踏入了战场！",
  },
  bob:false,
  home:{x:0,z:-11},
  skills:[
    {id:"melee",type:"melee",bal:"melee",name:"烈焰撕咬",firstDelay:2.5,
      vfx:"melee_impact",label:"玛格曼达的撕咬",phaseMul:{2:"p2Mul"}},
    /* 扇形多发火球：阶段二发数翻倍 */
    {id:"spit",type:"cast_projectile",bal:"spit",name:"岩浆喷吐",firstDelay:4.5,
      vfx:"lava_bolt",log:"玛格曼达喷出扇形岩浆！",exclusive:true,
      countKey:{1:"count",2:"p2Count"},fanKey:"fan"},
    /* 直线喷吐：Boss→玩家方向铺预警环 */
    {id:"breath",type:"cast_line",bal:"breath",name:"熔岩吐息",firstDelay:7,
      sfx:"breath_fire",vfx:"eruption_ring",
      announce:"熔岩吐息 · 躲开直线！",log:"玛格曼达深吸一口气，岩浆沿直线喷涌！",
      exclusive:true,segsKey:{1:"segs",2:"p2Segs"}},
    /* 践踏：脚下大圈 + 随机落点 */
    {id:"stomp",type:"cast_telegraph",bal:"stomp",name:"践踏震荡",firstDelay:10,
      vfx:"eruption_ring",playerRingRKey:"ringR",
      countKey:{1:"count",2:"p2Count"},
      announce:"践踏 · 快躲开红圈！",log:"玛格曼达猛踏地面，震荡波层层扩散！",exclusive:true},
    /* 恐惧 + 击退 + 脚下恐慌圈 */
    {id:"fear",type:"cast_fear",bal:"fear",name:"恐慌咆哮",firstDelay:13,
      vfx:"roar_aura",vfxY:3.5,announce:"恐慌咆哮！",
      hitLog:"你被恐惧吞噬，四处逃窜！",exclusive:true,panic:true},
  ],
  phases:[
    {to:2,from:1,hpPctKey:"phase2At",onEnter:"enrage",
      sfx:"roar",announce:"⚠️ 玛格曼达狂暴！",
      log:"玛格曼达皮毛迸裂出岩浆——喷吐更密，幼犬从熔岩中涌出！",
      compressNext:{melee:1.2,spit:2.5,breath:4,stomp:3.5,fear:6},
      burst:{vfx:"roar_aura",y:4,color:0xff2200,count:90,spread:7},
      spawnAdds:{countKey:"addCount",r:[9,15],zOff:-2}},
  ],
  death:{
    isFinal:false, nextStage:"bridge",
    sfx:"roar",announce:"玛格曼达倒下了！",
    log:"巨型熔岩猎犬发出最后一声哀嚎，瘫倒在黑曜岩上。",
    tip:"岩桥即将开启——准备面对炎魔领主。",
    xpKey:"magmadar",
    lootTable:"magmadar", lootPos:[0,0,-10], lootDelay:1200,
    lootAnnounce:"战利品掉落 · 按 F 拾取",
    lootLog:"玛格曼达的项圈与犬牙滚落在地。",
    burst:{vfx:"roar_aura",y:4,color:0xff8040,count:80,spread:6},
  },
  defeat:{
    endTitle:"团 灭",endSub:"YOU HAVE BEEN DEFEATED",
    endHtml:"玛格曼达的利齿撕碎了你的防线。<br>灵魂医者在等着你——再来一次。",
  },
});

/* ---- 考布莱恩：哀嚎洞穴一号位（STEP 21）· 毒液喷吐 ---- */
defineBoss({
  id:"cobrahn",
  name:"考布莱恩 · 毒牙领主",
  title:"哀嚎洞穴 · 一号首领",
  hitNoun:"考布莱恩",
  statsKey:"cobrahn",
  build:()=>buildQuadruped(QUADS.cobrahn),
  projectileY:4.8, fctY:6.5,
  intro:{
    type:"appear", fromY:0, toY:0, dur:1.2,
    burst:{at:.3,window:.2,vfx:"roar_aura",pos:[0,2.5,-10],color:0x44aa22,count:50,spread:4},
    sfx:"growl",
    announce:"考布莱恩发出嘶嘶低鸣！",
    log:"巨大的变异蛇怪考布莱恩从苔藓中探出身来！",
  },
  bob:false,
  home:{x:0,z:-10},
  skills:[
    {id:"melee",type:"melee",bal:"melee",name:"毒牙撕咬",firstDelay:2.2,
      vfx:"melee_impact",label:"考布莱恩的撕咬",phaseMul:{2:"p2Mul"}},
    {id:"spit",type:"cast_projectile",bal:"spit",name:"毒液喷吐",firstDelay:4,
      vfx:"venom_bolt",log:"考布莱恩喷出扇形毒液！",exclusive:true,
      countKey:{1:"count",2:"p2Count"},fanKey:"fan"},
    {id:"breath",type:"cast_line",bal:"breath",name:"酸液吐息",firstDelay:7,
      sfx:"breath_poison",
      vfx:"venom_ring",
      announce:"酸液吐息 · 躲开直线！",log:"考布莱恩张开巨口，酸液沿直线喷涌！",
      exclusive:true,segsKey:{1:"segs",2:"p2Segs"}},
  ],
  phases:[
    {to:2,from:1,hpPctKey:"phase2At",onEnter:"enrage",
      sfx:"growl",announce:"⚠️ 考布莱恩狂暴！",
      log:"毒牙领主鳞片迸裂——喷吐更密，变异兽从暗处涌出！",
      compressNext:{melee:1.2,spit:2.2,breath:3.5},
      burst:{vfx:"roar_aura",y:3.5,color:0x33cc44,count:70,spread:6},
      spawnAdds:{countKey:"addCount",r:[8,14],zOff:-2}},
  ],
  death:{
    isFinal:false, nextStage:"boss",
    sfx:"growl",announce:"考布莱恩倒下了！",
    log:"毒牙领主瘫倒在苔藓上，洞穴深处传来更沉重的脚步声……",
    tip:"通往吞噬者巢穴的道路已打开。",
    xpKey:"cobrahn", copperKey:"cobrahn",
    lootTable:"wailing", lootPos:[0,0,-5], lootDelay:1400,
    lootAnnounce:"毒液中浮出战利品",
  },
});

/* ---- 吞噬者 · 终局（STEP 21 简化版） ---- */
defineBoss({
  id:"verdan",
  name:"吞噬者 · 永生者",
  title:"哀嚎洞穴 · 最终首领",
  hitNoun:"吞噬者",
  statsKey:"verdan",
  build:()=>buildQuadruped(QUADS.verdan),
  projectileY:5.5, fctY:7.2,
  intro:{
    type:"appear", fromY:0, toY:0, dur:1.5,
    burst:{at:.35,window:.2,vfx:"roar_aura",pos:[0,3,-12],color:0x2a8a40,count:80,spread:5},
    sfx:"roar",
    announce:"吞噬者苏醒了！",
    log:"洞穴中央的巨兽睁开双眼——苔藓与藤蔓随之翻涌！",
  },
  bob:false,
  home:{x:0,z:-12},
  skills:[
    {id:"melee",type:"melee",bal:"melee",name:"藤蔓重砸",firstDelay:2.5,
      vfx:"melee_impact",label:"吞噬者的重砸",phaseMul:{2:"p2Mul"}},
    {id:"spit",type:"cast_projectile",bal:"spit",name:"腐液喷射",firstDelay:5,
      vfx:"venom_bolt",log:"吞噬者甩出腐液！",exclusive:true,
      countKey:{1:"count",2:"p2Count"},fanKey:"fan"},
    {id:"stomp",type:"cast_telegraph",bal:"stomp",name:"根须震荡",firstDelay:9,
      vfx:"venom_ring",playerRingRKey:"ringR",
      countKey:{1:"count",2:"p2Count"},
      announce:"根须震荡 · 快躲开绿圈！",log:"地面崩裂，根须从石缝中刺出！",exclusive:true},
  ],
  phases:[
    {to:2,from:1,hpPctKey:"phase2At",onEnter:"enrage",
      sfx:"roar",announce:"⚠️ 吞噬者狂暴！",
      log:"永生者发出震耳嘶鸣——更多变异兽从岩壁爬出！",
      compressNext:{melee:1.3,spit:2.5,stomp:3.5},
      burst:{vfx:"roar_aura",y:4,color:0x228822,count:90,spread:7},
      spawnAdds:{countKey:"addCount",r:[9,15],zOff:-2}},
  ],
  death:{
    isFinal:true, questComplete:false,
    sfx:"roar",announce:"吞噬者已被击败！",
    log:"巨兽缓缓倒下，苔藓失去生气……哀嚎洞穴恢复了短暂的平静。",
    tip:"已拾取战利品后，走进入口处的传送门即可返回贫瘠之地。",
    xpKey:"verdan", copperKey:"verdan",
    lootTable:"wailing", lootPos:[0,0,-6], lootDelay:2000,
    lootAnnounce:"稀有战利品出现了",
    lootLog:"毒液褪去，蓝装散落在苔藓上——靠近按 F 拾取。",
    endTitle:"胜 利",endSub:"WAILING CAVERNS · CLEARED",
    endHtml:"吞噬者的躯体崩解为枯死的藤蔓。<br>前往副本入口处，走进传送门返回贫瘠之地。",
    burst:{vfx:"roar_aura",y:5,color:0x66cc44,count:100,spread:8},
  },
  defeat:{
    endTitle:"团 灭",endSub:"YOU HAVE BEEN DEFEATED",
    endHtml:"毒液淹没了洞穴，吞噬者的嘶鸣回荡。<br>释放灵魂，在走廊入口重整旗鼓。",
  },
});

/* ---- 奥格弗林特：怒焰裂谷一号位（V1-B3）· 熔岩喷吐 / 直线 ---- */
defineBoss({
  id:"oggleflint",
  name:"奥格弗林特",
  title:"怒焰裂谷 · 一号首领",
  hitNoun:"奥格弗林特",
  statsKey:"oggleflint",
  build:()=>buildQuadruped(QUADS.oggleflint),
  projectileY:4.6, fctY:6.2,
  intro:{
    type:"appear", fromY:0, toY:0, dur:1.2,
    burst:{at:.3,window:.2,vfx:"roar_aura",pos:[0,2.5,-10],color:0xff6020,count:50,spread:4},
    sfx:"growl",
    announce:"奥格弗林特咆哮着站起！",
    log:"燃刃督军奥格弗林特从熔岩缝隙后冲出！",
  },
  bob:false,
  home:{x:0,z:-10},
  skills:[
    {id:"melee",type:"melee",bal:"melee",name:"熔岩重击",firstDelay:2.2,
      vfx:"melee_impact",label:"奥格弗林特的重击",phaseMul:{2:"p2Mul"}},
    {id:"spit",type:"cast_projectile",bal:"spit",name:"熔岩喷吐",firstDelay:4,
      vfx:"lava_bolt",log:"奥格弗林特喷出熔岩！",exclusive:true,
      countKey:{1:"count",2:"p2Count"},fanKey:"fan"},
    {id:"breath",type:"cast_line",bal:"breath",name:"火焰吐息",firstDelay:7,
      sfx:"breath_fire",
      vfx:"eruption_ring",
      announce:"火焰吐息 · 躲开直线！",log:"奥格弗林特张开巨口，火焰沿直线喷涌！",
      exclusive:true,segsKey:{1:"segs",2:"p2Segs"}},
  ],
  phases:[
    {to:2,from:1,hpPctKey:"phase2At",onEnter:"enrage",
      sfx:"growl",announce:"⚠️ 奥格弗林特狂暴！",
      log:"督军的铠甲烧红——喷吐更密，燃刃兽人从暗处涌出！",
      compressNext:{melee:1.2,spit:2.2,breath:3.5},
      burst:{vfx:"roar_aura",y:3.5,color:0xff4400,count:70,spread:6},
      spawnAdds:{countKey:"addCount",r:[8,14],zOff:-2}},
  ],
  death:{
    isFinal:false, nextStage:"boss",
    sfx:"growl",announce:"奥格弗林特倒下了！",
    log:"督军跪倒在熔岩边，裂谷深处传来更沉重的咆哮……",
    tip:"通往饥饿者巢穴的道路已打开。",
    xpKey:"oggleflint", copperKey:"oggleflint",
    lootTable:"ragefire", lootPos:[0,0,-5], lootDelay:1400,
    lootAnnounce:"灰烬中浮出战利品",
  },
  defeat:{
    endTitle:"团 灭",endSub:"YOU HAVE BEEN DEFEATED",
    endHtml:"熔岩吞没了走廊，奥格弗林特的咆哮回荡。<br>释放灵魂，在入口重整旗鼓。",
  },
});

/* ---- 饥饿者塔拉加曼 · 怒焰终局（V1-B3） ---- */
defineBoss({
  id:"taragaman",
  name:"饥饿者 · 塔拉加曼",
  title:"怒焰裂谷 · 最终首领",
  hitNoun:"塔拉加曼",
  statsKey:"taragaman",
  build:()=>buildQuadruped(QUADS.taragaman),
  projectileY:5.4, fctY:7.0,
  intro:{
    type:"appear", fromY:0, toY:0, dur:1.5,
    burst:{at:.35,window:.2,vfx:"roar_aura",pos:[0,3,-12],color:0xff8030,count:80,spread:5},
    sfx:"roar",
    announce:"饥饿者塔拉加曼苏醒了！",
    log:"裂谷最深处，巨大的燃刃恶魔睁开双眼——熔岩随之翻涌！",
  },
  bob:false,
  home:{x:0,z:-12},
  skills:[
    {id:"melee",type:"melee",bal:"melee",name:"饥饿撕咬",firstDelay:2.5,
      vfx:"melee_impact",label:"塔拉加曼的撕咬",phaseMul:{2:"p2Mul"}},
    {id:"spit",type:"cast_projectile",bal:"spit",name:"燃烬喷射",firstDelay:5,
      vfx:"lava_bolt",log:"塔拉加曼甩出燃烬！",exclusive:true,
      countKey:{1:"count",2:"p2Count"},fanKey:"fan"},
    {id:"stomp",type:"cast_telegraph",bal:"stomp",name:"熔岩震踏",firstDelay:9,
      vfx:"eruption_ring",playerRingRKey:"ringR",
      countKey:{1:"count",2:"p2Count"},
      announce:"熔岩震踏 · 快躲开红圈！",log:"地面崩裂，熔岩从石缝中喷溅！",exclusive:true},
  ],
  phases:[
    {to:2,from:1,hpPctKey:"phase2At",onEnter:"enrage",
      sfx:"roar",announce:"⚠️ 塔拉加曼狂暴！",
      log:"饥饿者发出震耳咆哮——更多燃刃兽人从岩壁爬出！",
      compressNext:{melee:1.3,spit:2.5,stomp:3.5},
      burst:{vfx:"roar_aura",y:4,color:0xff5500,count:90,spread:7},
      spawnAdds:{countKey:"addCount",r:[9,15],zOff:-2}},
  ],
  death:{
    isFinal:true, questComplete:false,
    sfx:"roar",announce:"塔拉加曼已被击败！",
    log:"恶魔缓缓倒下，裂谷中的怒焰渐渐平息……",
    tip:"已拾取战利品后，走进入口处的传送门即可返回赭岩谷。",
    xpKey:"taragaman", copperKey:"taragaman",
    lootTable:"ragefire", lootPos:[0,0,-6], lootDelay:2000,
    lootAnnounce:"稀有战利品出现了",
    lootLog:"灰烬散去，装备散落在熔岩边——靠近按 F 拾取。",
    endTitle:"胜 利",endSub:"RAGEFIRE CHASM · CLEARED",
    endHtml:"饥饿者的躯体崩解为焦土。<br>前往副本入口处，走进传送门返回赭岩谷。",
    burst:{vfx:"roar_aura",y:5,color:0xff8030,count:100,spread:8},
  },
  defeat:{
    endTitle:"团 灭",endSub:"YOU HAVE BEEN DEFEATED",
    endHtml:"怒焰吞没了裂谷，饥饿者的嘶鸣回荡。<br>释放灵魂，在入口重整旗鼓。",
  },
});

/* ---- 奥妮克希亚：巢穴精简团本（STEP 28）· 三阶段飞天/喷吐/深呼吸 ---- */
defineBoss({
  id:"onyxia",
  name:"奥妮克希亚 · 黑龙女王",
  title:"奥妮克希亚巢穴 · 最终首领",
  hitNoun:"奥妮克希亚",
  statsKey:"onyxia",
  build:()=>buildOnyxia(),
  projectileY:6.5, fctY:8.5,
  intro:{
    type:"appear", fromY:0, toY:0, dur:1.6,
    burst:{at:.4,window:.25,vfx:"roar_aura",pos:[0,4,-12],color:0xff3300,count:90,spread:6},
    sfx:"roar",
    announce:"奥妮克希亚发出震天龙吟！",
    log:"黑龙女王奥妮克希亚展开双翼，巢穴在烈焰中苏醒！",
  },
  bob:false,
  home:{x:0,z:-12},
  skills:[
    {id:"melee",type:"melee",bal:"melee",name:"龙爪撕扯",firstDelay:2.4,
      vfx:"melee_impact",label:"奥妮克希亚的龙爪",
      phaseMul:{2:"p2Mul",3:"p3Mul"}},
    {id:"spit",type:"cast_projectile",bal:"spit",name:"暗焰喷吐",firstDelay:4.5,
      vfx:"lava_bolt",log:"奥妮克希亚喷出扇形暗焰！",exclusive:true,
      countKey:{1:"count",2:"p2Count",3:"p3Count"},fanKey:"fan"},
    {id:"breath",type:"cast_line",bal:"breath",name:"火焰吐息",firstDelay:7.5,
      sfx:"breath_fire",vfx:"eruption_ring",
      announce:"火焰吐息 · 躲开直线！",log:"黑龙张开巨口，烈焰沿直线喷涌！",
      exclusive:true,segsKey:{1:"segs",2:"p2Segs",3:"p3Segs"}},
    {id:"wing",type:"cast_telegraph",bal:"wing",name:"翼击落火",firstDelay:11,
      vfx:"eruption_ring",playerRingRKey:"ringR",
      countKey:{1:"count",2:"p2Count",3:"p3Count"},
      announce:"翼击落火 · 快躲开红圈！",log:"龙翼扇起火雨——地面燃起红圈！",exclusive:true},
    {id:"deepBreath",type:"cast_line",bal:"deepBreath",name:"深呼吸",firstDelay:28,
      sfx:"breath_fire",vfx:"eruption_ring",
      announce:"深呼吸 · 立刻躲开整条直线！！",log:"奥妮克希亚深深吸气——毁灭性的直线烈焰即将释放！",
      exclusive:true,segsKey:{1:"segs",2:"p2Segs",3:"p3Segs"}},
  ],
  phases:[
    {to:2,from:1,hpPctKey:"phase2At",onEnter:"fly",flyY:8,
      sfx:"roar",announce:"阶段二 · 升空！",
      log:"黑龙女王振翅升空——近战够不着，喷吐与落火将覆盖地面！",
      compressNext:{melee:999,spit:2.4,breath:4.5,wing:3.2,deepBreath:999},
      burst:{vfx:"roar_aura",y:6,color:0xff2200,count:80,spread:7}},
    {to:3,from:2,hpPctKey:"phase3At",onEnter:"land",
      sfx:"roar",announce:"⚠️ 阶段三 · 深呼吸！",
      log:"奥妮克希亚俯冲落地——深呼吸与漫天火雨开始了！",
      compressNext:{melee:1.4,spit:3,breath:3.5,wing:2.8,deepBreath:5},
      burst:{vfx:"roar_aura",y:4,color:0xff4400,count:100,spread:8},
      spawnAdds:{countKey:"addCount",r:[9,15],zOff:-2}},
  ],
  death:{
    isFinal:true, questComplete:false,
    sfx:"roar",announce:"黑龙女王已被击败！",
    log:"奥妮克希亚发出最后一声悲鸣，庞大的躯体轰然坠地……",
    tip:"已拾取战利品后，走进入口处的传送门即可返回贫瘠之地。",
    xpKey:"onyxia", copperKey:"onyxia",
    lootTable:"onyxia", lootPos:[0,0,-6], lootDelay:2200,
    lootAnnounce:"龙鳞战利品散落一地",
    lootLog:"黑龙鳞片与利牙滚落在地——靠近按 F 拾取。",
    endTitle:"胜 利",endSub:"ONYXIA'S LAIR · CLEARED",
    endHtml:"黑龙女王的躯体逐渐冷却。<br>前往副本入口处，走进传送门返回贫瘠之地。",
    burst:{vfx:"roar_aura",y:5,color:0xff8040,count:120,spread:9},
  },
  defeat:{
    endTitle:"团 灭",endSub:"YOU HAVE BEEN DEFEATED",
    endHtml:"暗焰吞没了小队。<br>释放灵魂，在巢穴入口重整旗鼓。",
  },
});

function getBossCfg(){return BOSSES[S.b.id]||BOSSES.ragnaros;}
function bossNum(){return BAL[getBossCfg().statsKey];}
/** V1-B4：当前副本难度倍率（世界门默认 normal） */
function getDifficultyCfg(){
  const id=(S.difficulty==="heroic")?"heroic":"normal";
  const d=BAL.difficulty&&BAL.difficulty[id];
  return d||{hpMul:1,dmgMul:1,lootWeights:null};
}
function getRaidLootWeights(){
  const c=getDifficultyCfg();
  return c.lootWeights||null;
}
function skillBal(sk){
  const raw=bossNum()[sk.bal];
  if(!raw)return raw;
  const mul=getDifficultyCfg().dmgMul||1;
  if(mul===1||!raw.dmg)return raw;
  return Object.assign({},raw,{dmg:[raw.dmg[0]*mul,raw.dmg[1]*mul]});
}

function applyBossFrame(cfg){
  const n=$("#bossName .n"), t=$("#bossName .t");
  const hero=S.difficulty==="heroic";
  if(n)n.textContent="🔥 "+cfg.name+(hero?"（英雄）":"");
  if(t)t.textContent=cfg.title+(hero?" · 英雄难度":"");
}

function armBossSkills(){
  const cfg=getBossCfg();
  S.b.next=S.b.next||{};
  for(const sk of cfg.skills)S.b.next[sk.id]=S.t+(sk.firstDelay||0);
}

function scheduleBossSkills(map){
  S.b.next=S.b.next||{};
  for(const id in map)S.b.next[id]=S.t+map[id];
}

function compressBossSkills(map){
  S.b.next=S.b.next||{};
  for(const id in map)S.b.next[id]=Math.min(S.b.next[id]!=null?S.b.next[id]:Infinity,S.t+map[id]);
}

function spawnBossAdds(spec){
  const n=spec.countKey!=null?bossNum()[spec.countKey]:spec.count;
  const [r0,r1]=spec.r, zOff=spec.zOff||0;
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2+rand(0,1);
    spawnAdd(Math.cos(a)*rand(r0,r1),Math.sin(a)*rand(r0,r1)+zOff);
  }
}

/** 切换当前 Boss 网格（缓存于 BOSS_MESHES，避免重复建造） */
function mountBossMesh(id){
  const cfg=BOSSES[id];
  if(!cfg)return;
  const parent=(typeof scene!=="undefined"&&scene)?scene:sceneRaid;
  if(boss&&boss.parent)boss.parent.remove(boss);
  if(BOSS_MESHES[id]){
    const old=BOSS_MESHES[id];
    if(old.parent)old.parent.remove(old);
  }
  BOSS_MESHES[id]=(cfg.build||buildBoss)();
  boss=BOSS_MESHES[id];
  const home=cfg.home||{x:0,z:-14};
  const y0=(cfg.intro&&cfg.intro.fromY!=null)?cfg.intro.fromY:0;
  boss.position.set(home.x,y0,home.z);
  boss.rotation.set(0,0,0);
  boss.visible=true;
  parent.add(boss);
}

/** 激活副本中的一名 Boss：数据状态 + 网格 */
function activateRaidBoss(id){
  mountBossMesh(id);
  createBoss(id);
  boss.visible=true;
}

/** 激活/重置一名 Boss 的运行时状态（不碰场景清理） */
function createBoss(id){
  const cfg=BOSSES[id];
  if(!cfg){console.warn("createBoss: unknown",id);return null;}
  const st=BAL[cfg.statsKey];
  const hpMul=getDifficultyCfg().hpMul||1;
  S.b.id=id;
  S.b.hp=S.b.hpMax=Math.round(st.hp*hpMul);
  S.b.alive=true;
  S.b.phase=1;
  S.b.rising=!!cfg.intro;
  S.b.riseT=0;
  S.b.submerged=false; S.b.submergeT=0;
  S.b.flying=false; S.b.flyTargetY=null;
  S.b.casting=null; S.b.castT=0; S.b.castDur=0;
  S.b.canLeave=false; S.b.swingT=0;
  S.b.nextAddSpawn=0; S.b.addWave=null;
  S.b.phaseCfg=null;
  armBossSkills();
  applyBossFrame(cfg);
  if(typeof clearThreat==="function")clearThreat(BOSS_ENT);
  return cfg;
}

function distToBoss(){return player.position.distanceTo(new THREE.Vector3(boss.position.x,0,boss.position.z));}
function bossTargetable(){return S.b.alive&&!S.b.rising&&!S.b.submerged;}

const BOSS_ENT={
  get hp(){return S.b.hp}, set hp(v){S.b.hp=v},
  variance:BAL.variance.boss,
  threat:{},
  dead(){return !bossTargetable();},
  fctPos(){
    const y=getBossCfg().fctY!=null?getBossCfg().fctY:9;
    return new THREE.Vector3(boss.position.x,y,boss.position.z);
  },
  fctSize(label){return label?19:15;},
  onHit(amount,label){
    const noun=getBossCfg().hitNoun||"首领";
    if(label)log(`你的【${label}】对${noun}造成 ${amount} 点伤害！`,"lg-me");
  },
  onDeath(){bossDie();},
};

function startCast(name,dur,done){
  S.b.casting={name,done}; S.b.castT=0; S.b.castDur=dur;
  $("#castShell").style.display="block"; $("#castText").textContent=name;
}
function clearBossCast(){
  S.b.casting=null; $("#castShell").style.display="none";
}

function enterBossPhase(ph){
  const B=S.b;
  B.phase=ph.to;
  B.phaseCfg=ph;
  clearBossCast();
  if(ph.sfx)SFX.play(ph.sfx);
  if(ph.announce)announce(ph.announce);
  if(ph.log)log(ph.log,"lg-boss");
  if(ph.onEnter==="submerge"){
    B.submerged=true;
    B.submergeT=bossNum()[ph.submergeTKey];
    if(ph.spawnAdds)spawnBossAdds(ph.spawnAdds);
  }else if(ph.onEnter==="enrage"){
    if(ph.compressNext)compressBossSkills(ph.compressNext);
    if(ph.burst){
      const b=ph.burst;
      VFX.spawn(b.vfx,{pos:new THREE.Vector3(boss.position.x,b.y,boss.position.z),
        color:b.color,count:b.count,spread:b.spread});
    }
    if(ph.spawnAdds)spawnBossAdds(ph.spawnAdds);
    B.addWave=ph.addWave||null;
    B.nextAddSpawn=0;   /* 与旧逻辑一致：进入狂暴后下一帧即可刷波 */
  }else if(ph.onEnter==="fly"){
    /* STEP 28：升空——近战停手，喷吐/落火加密 */
    B.flying=true;
    B.flyTargetY=ph.flyY!=null?ph.flyY:(bossNum().flyY||8);
    if(ph.compressNext)compressBossSkills(ph.compressNext);
    if(ph.burst){
      const b=ph.burst;
      VFX.spawn(b.vfx,{pos:new THREE.Vector3(boss.position.x,b.y,boss.position.z),
        color:b.color,count:b.count,spread:b.spread});
    }
    if(ph.spawnAdds)spawnBossAdds(ph.spawnAdds);
  }else if(ph.onEnter==="land"){
    /* STEP 28：落地进入深呼吸阶段 */
    B.flying=false;
    B.flyTargetY=0;
    if(ph.compressNext)compressBossSkills(ph.compressNext);
    if(ph.burst){
      const b=ph.burst;
      VFX.spawn(b.vfx,{pos:new THREE.Vector3(boss.position.x,b.y,boss.position.z),
        color:b.color,count:b.count,spread:b.spread});
    }
    if(ph.spawnAdds)spawnBossAdds(ph.spawnAdds);
    B.addWave=ph.addWave||null;
    B.nextAddSpawn=0;
  }
}

function tickBossIntro(dt,cfg){
  const B=S.b, intro=cfg.intro;
  B.riseT+=dt;
  if(intro.type==="rise"){
    boss.position.y=THREE.MathUtils.lerp(intro.fromY,intro.toY,Math.min(1,B.riseT/intro.dur));
    boss.position.y+=Math.sin(S.t*2)*.1;
  }
  const bu=intro.burst;
  if(bu&&B.riseT>bu.at&&B.riseT<bu.at+bu.window){
    const pos=bu.pos
      ?new THREE.Vector3(bu.pos[0],bu.pos[1],bu.pos[2])
      :new THREE.Vector3(boss.position.x,1.5,boss.position.z);
    VFX.spawn(bu.vfx,{pos,color:bu.color,count:bu.count,spread:bu.spread});
  }
  if(B.riseT>=intro.dur){
    B.rising=false;
    if(intro.type==="rise")boss.position.y=intro.toY;
    if(intro.sfx)SFX.play(intro.sfx);
    if(intro.announce)announce(intro.announce);
    if(intro.log)log(intro.log,"lg-boss");
  }
}

function tickBossSubmerged(dt){
  const B=S.b, ph=B.phaseCfg;
  B.submergeT-=dt;
  boss.position.y=THREE.MathUtils.lerp(boss.position.y,-15,dt*2);
  if(B.submergeT<=0||S.adds.length===0){
    B.submerged=false;
    if(ph){
      if(ph.emergeAnnounce)announce(ph.emergeAnnounce);
      if(ph.emergeLog)log(ph.emergeLog,"lg-boss");
      if(ph.emergeNext)scheduleBossSkills(ph.emergeNext);
    }
  }
}

function runBossSkill(sk){
  const B=S.b, st=skillBal(sk), d=distToBoss();
  /* V1-A5：Boss 技能音色（吐息等） */
  if(sk.type!=="melee"&&sk.sfx&&typeof SFX!=="undefined")SFX.play(sk.sfx);
  if(sk.type==="melee"){
    B.next[sk.id]=S.t+R(st.cd);
    /* STEP 28：飞天阶段不近战 */
    if(B.flying)return false;
    /* STEP 27：有仇恨目标或玩家在挥击距离内才出手 */
    const threatNear=typeof getTopThreatActor==="function"
      ?getTopThreatActor(BOSS_ENT,boss.position,st.range):null;
    if(threatNear||d<st.range){
      B.swingT=1;
      const label=sk.label||sk.name, vfx=sk.vfx;
      setTimeout(()=>{
        if(!bossTargetable())return;
        let mul=1;
        if(sk.phaseMul&&sk.phaseMul[B.phase])mul=st[sk.phaseMul[B.phase]]||1;
        if(typeof meleeHitFromThreat==="function"){
          const hit=meleeHitFromThreat(BOSS_ENT,boss.position,st.hitRange,R(st.dmg)*mul,label);
          if(hit&&vfx&&S.p.alive)VFX.spawn(vfx,{pos:player.position.clone().setY(.5)});
        }else if(S.p.alive&&distToBoss()<st.hitRange){
          playerHit(R(st.dmg)*mul,label);
          if(vfx)VFX.spawn(vfx,{pos:player.position.clone().setY(.5)});
        }
      },st.delayMs);
    }
    return false;
  }
  if(sk.type==="cast_projectile"){
    B.next[sk.id]=S.t+R(st.cd);
    startCast(sk.name,st.cast,()=>{
      if(sk.log)log(sk.log,"lg-boss");
      let n=1;
      if(sk.countKey){const key=sk.countKey[B.phase]||sk.countKey[1];n=st[key]||1;}
      else if(st.count!=null)n=st.count;
      const fan=sk.fanKey!=null?st[sk.fanKey]:(st.fan||0);
      const baseAng=Math.atan2(player.position.x-boss.position.x,player.position.z-boss.position.z);
      const dist=Math.hypot(player.position.x-boss.position.x,player.position.z-boss.position.z)||12;
      for(let i=0;i<n;i++){
        const t=n===1?0:(i/(n-1)-.5);
        const ang=baseAng+t*fan*(n>1?1:0);
        const tx=boss.position.x+Math.sin(ang)*dist;
        const tz=boss.position.z+Math.cos(ang)*dist;
        VFX.spawn(sk.vfx,{targetPos:new THREE.Vector3(tx,0,tz),
          opt:Object.assign({},st,{name:sk.name})});
      }
    });
    return !!sk.exclusive;
  }
  if(sk.type==="cast_line"){
    B.next[sk.id]=S.t+R(st.cd);
    startCast(sk.name,st.cast,()=>{
      if(sk.announce)announce(sk.announce);
      if(sk.log)log(sk.log,"lg-boss");
      let segs=st.segs||4;
      if(sk.segsKey){const key=sk.segsKey[B.phase]||sk.segsKey[1];segs=st[key]||segs;}
      const dx=player.position.x-boss.position.x, dz=player.position.z-boss.position.z;
      const len=Math.hypot(dx,dz)||1;
      const ux=dx/len, uz=dz/len;
      const step=st.step||4, rr=st.ringR||3.5;
      for(let i=1;i<=segs;i++){
        VFX.spawn(sk.vfx,{
          x:boss.position.x+ux*step*i,
          z:boss.position.z+uz*step*i,
          r:rr, delay:st.delay+(i-1)*.12,
          dmg:st.dmg, label:sk.name});
      }
    });
    return !!sk.exclusive;
  }
  if(sk.type==="cast_telegraph"){
    B.next[sk.id]=S.t+R(st.cd);
    startCast(sk.name,st.cast,()=>{
      if(sk.announce)announce(sk.announce);
      if(sk.log)log(sk.log,"lg-boss");
      let n=0;
      if(sk.countKey){
        const key=sk.countKey[B.phase]||sk.countKey[1];
        n=st[key]||0;
      }else if(st.count!=null)n=st.count;
      const pr=sk.playerRingRKey!=null?st[sk.playerRingRKey]:(sk.playerRingR||4.5);
      VFX.spawn(sk.vfx,{x:player.position.x,z:player.position.z,r:pr,delay:st.delay,
        dmg:st.dmg,label:sk.name});
      for(let i=0;i<n;i++){
        const a=rand(0,6.28),r=rand(3,ARENA_R-4);
        VFX.spawn(sk.vfx,{x:Math.cos(a)*r,z:Math.sin(a)*r,r:rand(3.5,5.5),delay:st.delay+i*.25,
          dmg:st.dmg,label:sk.name});
      }
    });
    return !!sk.exclusive;
  }
  if(sk.type==="cast_knockback"){
    B.next[sk.id]=S.t+R(st.cd);
    startCast(sk.name,st.cast,()=>{
      if(sk.announce)announce(sk.announce);
      VFX.spawn(sk.vfx,{pos:new THREE.Vector3(boss.position.x,sk.vfxY||2,boss.position.z)});
      if(distToBoss()<st.range&&S.p.alive){
        playerHit(R(st.dmg),sk.name);
        const dir=player.position.clone().sub(new THREE.Vector3(boss.position.x,0,boss.position.z)).normalize();
        S.p.knock={dir,t:sk.knockT||.4};
        if(sk.hitLog)log(sk.hitLog,"lg-dmg");
      }
    });
    return !!sk.exclusive;
  }
  if(sk.type==="cast_fear"){
    B.next[sk.id]=S.t+R(st.cd);
    startCast(sk.name,st.cast,()=>{
      if(sk.announce)announce(sk.announce);
      VFX.spawn(sk.vfx,{pos:new THREE.Vector3(boss.position.x,sk.vfxY||2,boss.position.z),
        color:0xff4400,count:60,spread:6});
      if(sk.panic&&st.panicRings){
        for(let i=0;i<st.panicRings;i++){
          const a=rand(0,6.28),r=rand(2,st.panicR||5);
          VFX.spawn("eruption_ring",{
            x:player.position.x+Math.cos(a)*r,
            z:player.position.z+Math.sin(a)*r,
            r:rand(2.8,3.8), delay:(st.delay||1.5)+i*.2,
            dmg:st.dmg, label:sk.name});
        }
      }
      if(distToBoss()<st.range&&S.p.alive){
        playerHit(R(st.dmg),sk.name);
        S.p.fear={t:st.fearT||2};
        if(st.knockT){
          const dir=player.position.clone().sub(new THREE.Vector3(boss.position.x,0,boss.position.z)).normalize();
          S.p.knock={dir,t:st.knockT};
        }
        if(sk.hitLog)log(sk.hitLog,"lg-dmg");
      }
    });
    return !!sk.exclusive;
  }
  return false;
}

function bossAI(dt){
  const B=S.b, cfg=getBossCfg();
  if(!B.alive)return;

  if(B.rising&&cfg.intro){tickBossIntro(dt,cfg);return;}
  if(B.submerged){tickBossSubmerged(dt);return;}
  /* STEP 28：飞天高度插值；落地后回 0 */
  if(B.flying){
    const ty=B.flyTargetY||8;
    boss.position.y=THREE.MathUtils.lerp(boss.position.y,ty+Math.sin(S.t*1.4)*.35,dt*2.2);
  }else if(B.flyTargetY===0&&boss.position.y>0.08){
    boss.position.y=THREE.MathUtils.lerp(boss.position.y,0,dt*3);
  }else if(cfg.bob)boss.position.y=THREE.MathUtils.lerp(boss.position.y,Math.sin(S.t*1.6)*.25,dt*3);

  const st=bossNum();
  for(const ph of cfg.phases){
    if(B.phase===ph.from&&B.hp<=B.hpMax*st[ph.hpPctKey]){
      enterBossPhase(ph);return;
    }
  }

  if(B.casting){
    B.castT+=dt;
    $("#castFill").style.transform=`scaleX(${Math.min(1,B.castT/B.castDur)})`;
    if(B.castT>=B.castDur){
      const c=B.casting; clearBossCast(); c.done();
    }
    return;
  }

  if(B.addWave&&S.t>B.nextAddSpawn){
    const w=B.addWave;
    B.nextAddSpawn=S.t+w.interval;
    spawnBossAdds(w);
    if(w.log)log(w.log,"lg-boss");
  }

  for(const sk of cfg.skills){
    if(S.t>(B.next[sk.id]||0)){
      if(runBossSkill(sk))return;
    }
  }
}

/* ---------------- 副本小怪（烈焰之子 / 变异蛇等，由 getDungeon().addCfg 驱动） ---------------- */
function spawnAdd(x,z,opts){
  opts=opts||{};
  const D=typeof getDungeon==="function"?getDungeon():DUNGEON;
  const conf=Object.assign({},D&&D.addCfg||{},opts);
  const bal=BAL[conf.balKey||"add"]||BAL.add;
  const dm=getDifficultyCfg();
  const hpMul=dm.hpMul||1, dmgMul=dm.dmgMul||1;
  const hp=Math.round(bal.hp*hpMul);
  const dmg=bal.dmg?[bal.dmg[0]*dmgMul,bal.dmg[1]*dmgMul]:bal.dmg;
  const stats=Object.assign({},bal,{hp,hpMax:hp,dmg});
  const buildFn=conf.build||buildFlameSpawn;
  const mesh=typeof buildFn==="function"?buildFn():buildFlameSpawn();
  const Rlim=(D&&D.arenaR)!=null?D.arenaR:ARENA_R;
  mesh.position.set(clamp(x,-Rlim+3,Rlim-3),0,clamp(z,-Rlim+3,Rlim-3));
  scene.add(mesh);
  S.adds.push({
    mesh,name:conf.name||"烈焰之子",level:(bal.level!=null?bal.level:15),
    hp,hpMax:hp,atkT:0,corpseT:0,
    stats, moving:false, attackAnim:0, state:"alive",
    hitKind:conf.hitKind||"flame",
    lootTable:conf.lootTable||"add",
    dieLog:conf.dieLog||"一只烈焰之子被消灭了！",
    burstColor:conf.burstColor!=null?conf.burstColor:0xff5a1a,
    variance:null,
    dead(){return this.corpseT>0||!S.adds.includes(this);},
    fctPos(){return this.mesh.position.clone().setY(2.6);},
    onDeath(){addDie(this);},
  });
  const a=S.adds[S.adds.length-1];
  a.label=makeNameplate(a.name,a.level,{w:4.8});
  a.label.position.set(mesh.position.x,2.8,mesh.position.z);
  scene.add(a.label);
  updateNameplateHp(a.label,a.hp,a.hpMax);
  VFX.spawn("melee_impact",{pos:mesh.position.clone().setY(1),color:conf.burstColor||0xff5a1a,count:20,spread:1.6});
}
function addDamage(a,amount,opts){hitEntity(a,amount,undefined,opts);}
function addDie(a){
  VFX.spawn("melee_impact",{pos:a.mesh.position.clone().setY(1),color:a.burstColor||0xffa040,count:26,spread:2});
  a.mesh.traverse(o=>{if(o.isMesh){o.userData.liveMat=o.material;o.material=corpseMat;}});
  a.state="dead"; a.moving=false;
  if(typeof clearCurrentTargetIf==="function")clearCurrentTargetIf(a);
  if(a.label)a.label.visible=false;
  if(typeof beginDeathRoll==="function")beginDeathRoll(a);
  else{a.mesh.rotation.z=Math.PI/2; a.mesh.position.y=.25;}
  a.corpseT=BAL.loot.corpseT;
  const table=a.lootTable&&LOOT[a.lootTable]?a.lootTable:"add";
  const dropped=rollLoot(LOOT[table],getRaidLootWeights());
  if(dropped)dropLoot(a.mesh.position.clone().add(new THREE.Vector3(1.2,0,.6)),[dropped],a);
  log(a.dieLog||"一只小怪被消灭了！","lg-me");
  const bal=BAL[(typeof getDungeon==="function"&&getDungeon().addCfg&&getDungeon().addCfg.balKey)||"add"]||BAL.add;
  const cu=rollCopperRange(bal.copper);
  if(cu)gainCopper(cu);
  const D=typeof getDungeon==="function"?getDungeon():DUNGEON;
  if(D.stage==="corridor"){
    D.mobsAlive--;
    if(D.mobsAlive<=0)D.setStage(D.afterCorridor||"boss1");
  }
}

/* ============================================================
   胜负（文案来自当前 Boss 数据表）
   ============================================================ */
function bossDie(){
  const cfg=getBossCfg(), D=cfg.death||{};
  S.b.alive=false;
  if(typeof clearThreat==="function")clearThreat(BOSS_ENT);
  clearBossCast();
  if(D.sfx)SFX.play(D.sfx);
  if(D.announce)announce(D.announce);
  if(D.log)log(D.log,"lg-boss");
  if(D.tip)log(D.tip,"lg-sys");
  if(typeof onQuestBossKill==="function")onQuestBossKill(cfg.id);
  else if(D.questComplete&&QUEST.state===2){QUEST.state=3;updateQuest();}
  if(typeof onDeedBossKill==="function")onDeedBossKill(cfg.id);
  const xp=D.xpKey?BAL.levels.xp[D.xpKey]:BAL.levels.xp.boss;
  if(xp)gainXP(xp);
  const copperSrc=D.copperKey?BAL[D.copperKey]&&BAL[D.copperKey].copper
    :(cfg.id==="magmadar"?BAL.magmadar.copper:BAL.boss.copper);
  const cu=rollCopperRange(copperSrc);
  if(cu)gainCopper(cu);
  if(D.burst){
    const b=D.burst;
    VFX.spawn(b.vfx,{pos:new THREE.Vector3(boss.position.x,b.y,boss.position.z),
      color:b.color,count:b.count,spread:b.spread});
  }
  /* 倒地动画（终局下沉 / 中段侧倒） */
  if(D.isFinal){
    S.b.canLeave=true;
    let t=0;const iv=setInterval(()=>{t+=0.05;boss.position.y-=0.16;boss.rotation.z+=0.004;
      if(t>3)clearInterval(iv);},50);
  }else{
    if(typeof beginDeathRoll==="function")beginDeathRoll(boss);
    else boss.rotation.z=Math.PI/2;
    boss.position.y=.3;
  }
  /* 掉落：固定传说件 或 掉落表掷骰 */
  const dropDelay=D.lootDelay||1200;
  if(D.lootId||D.lootTable){
    setTimeout(()=>{
      const p=D.lootPos||[0,0,-8];
      const items=D.lootId?[ITEMS[D.lootId]]:[rollLoot(LOOT[D.lootTable],getRaidLootWeights())].filter(Boolean);
      if(items.length)dropLoot(new THREE.Vector3(p[0],p[1],p[2]),items,null);
      if(D.lootAnnounce)announce(D.lootAnnounce);
      if(D.lootLog)log(D.lootLog,"lg-sys");
    },dropDelay);
  }
  if(D.isFinal){
    if(typeof onDeedDungeonClear==="function"){
      const dung=typeof getDungeon==="function"?getDungeon():DUNGEON;
      const did=(dung&&dung.id)||(cfg.dungeonId)||null;
      /* molten: ragnaros isFinal；wailing: verdan isFinal — 用当前副本 id */
      if(did)onDeedDungeonClear(did);
      else if(cfg.id==="ragnaros")onDeedDungeonClear("molten_core");
      else if(cfg.id==="verdan")onDeedDungeonClear("wailing_caverns");
    }
    setTimeout(()=>{
      $("#endTitle").textContent=D.endTitle||"胜 利";
      $("#endTitle").style.color="#ffd9a0";
      $("#endSub").textContent=D.endSub||"";
      $("#endText").innerHTML=D.endHtml||"";
      $("#endOv").classList.remove("hide");
      setTimeout(()=>{
        $("#endOv").classList.add("hide");
        spawnExitPortal();
        announce("离开副本的传送门已开启");
        log("一道旋涡传送门在副本入口处打开——走进即可离开。","lg-sys");
      },3000);
    },5000);
  }else if(D.nextStage){
    setTimeout(()=>{
      const dung=typeof getDungeon==="function"?getDungeon():DUNGEON;
      dung.setStage(D.nextStage);
    },2200);
  }
  if(typeof saveGame==="function")saveGame(true);
}
function playerDie(){
  if(!S.p.alive)return;
  S.p.alive=false;
  S.over=false;          /* STEP 15：不再锁死整局 */
  S.deathUi=false;
  S.p.knock=null; S.p.fear=null;
  if(typeof cancelConsume==="function")cancelConsume();
  clearBossCast();
  announce("你被击败了……");
  log("你倒下了。释放灵魂即可在灵魂医者处重生。","lg-sys");
  player.rotation.z=Math.PI/2; player.position.y=.5;
  if(typeof checkPartyWipe==="function")checkPartyWipe();
  const delay=(BAL.death.corpseDelay||1.2)*1000;
  setTimeout(()=>{
    if(S.p.alive)return;
    showDeathUi();
  },delay);
}

function showDeathUi(){
  S.deathUi=true;
  const ov=$("#deathOv");
  if(!ov)return;
  const world=S.mode==="world";
  $("#deathTitle").textContent="你 已 死 亡";
  $("#deathSub").textContent=world?"灵魂将前往营地的灵魂医者处":"在熔火之心中倒下了……";
  $("#deathText").textContent=world
    ?"释放灵魂后，你将在灵魂医者旁复活（短暂虚弱）。"
    :"可选择在走廊入口重整旗鼓，或退出副本回到营地。";
  $("#btnReleaseWorld").style.display=world?"inline-block":"none";
  $("#btnReleaseRaid").style.display=world?"none":"inline-block";
  $("#btnLeaveRaidDead").style.display=world?"none":"inline-block";
  ov.classList.remove("hide");
}
function hideDeathUi(){
  S.deathUi=false;
  const ov=$("#deathOv");
  if(ov)ov.classList.add("hide");
}

/** 清理副本危险物（投射物/红圈/小怪），不改 DUNGEON.stage */
function clearRaidHazards(){
  for(const a of S.adds){if(a.mesh&&a.mesh.parent)a.mesh.parent.remove(a.mesh);}
  S.adds.length=0;
  for(const p of S.projectiles){if(p.mesh&&p.mesh.parent)p.mesh.parent.remove(p.mesh);disposeVfxMesh(p.mesh);}
  S.projectiles.length=0;
  for(const t of S.telegraphs){
    if(t.ring&&t.ring.parent)t.ring.parent.remove(t.ring);
    if(t.disc&&t.disc.parent)t.disc.parent.remove(t.disc);
    disposeVfxMesh(t.ring);disposeVfxMesh(t.disc);
  }
  S.telegraphs.length=0;
  clearBossCast();
  S.b.casting=null;
}

/** 按 wipePolicy 重置当前遭遇（保留已推进的 stage） */
function applyWipeEncounter(){
  clearRaidHazards();
  const D=typeof getDungeon==="function"?getDungeon():DUNGEON;
  const pol=D.wipePolicy||"keep_stage";
  if(pol==="reset_to_corridor"){
    resetBoss();
    D.setStage("corridor");
    return;
  }
  if(D.stage==="corridor"){
    resetBoss();
    D.setStage("corridor");
  }else if(D.stage==="boss1"){
    activateRaidBoss(D.wipeBoss1||"magmadar");
  }else if(D.stage==="boss"){
    activateRaidBoss(D.wipeFinal||"ragnaros");
  }else if(D.stage==="bridge"){
    S.b.alive=false; if(boss)boss.visible=false;
  }
}

function resurrectPlayer(spawn,opts){
  const D=BAL.death;
  S.p.alive=true;
  S.over=false;
  if(typeof resetWipeFlag==="function")resetWipeFlag();
  S.p.hp=Math.max(1,Math.round(S.p.hpMax*(D.respawnHpPct!=null?D.respawnHpPct:.5)));
  S.p.rage=CLS.resStart;
  S.p.invuln=.8;
  S.p.absorb=0; S.p.absorbT=0;
  if(typeof clearShieldVisual==="function")clearShieldVisual();
  S.p.knock=null; S.p.fear=null;
  S.p.eating=null; S.p.bandaging=null; S.p.gathering=null;
  if(S.p.whetstoneT>0&&S.p.whetstoneAdd){S.p.dmgMul-=S.p.whetstoneAdd;S.p.whetstoneAdd=0;S.p.whetstoneT=0;}
  S.p.weaknessT=D.weaknessT||0;
  player.rotation.z=0; player.position.y=0;
  if(spawn)player.position.set(spawn.x,0,spawn.z);
  hideDeathUi();
  if(!(opts&&opts.silent)){
    announce("你复活了！");
    log(`复活成功。虚弱 ${D.weaknessT} 秒（移速降低）。`,"lg-heal");
    VFX.spawn("heal_cross",{pos:player.position.clone().setY(1.5)});
  }
  if(typeof saveGame==="function")saveGame(true);
}

function releaseSpiritWorld(){
  if(S.p.alive||S.mode!=="world")return;
  const zid=S.zoneId||"mulgore";
  const sp=(BAL.death.spawns&&BAL.death.spawns[zid])||BAL.death.worldSpawn;
  resurrectPlayer(sp);
  log("灵魂医者的光芒包裹了你……","lg-sys");
}

function releaseSpiritRaid(){
  if(S.p.alive||S.mode!=="raid")return;
  applyWipeEncounter();
  const D=typeof getDungeon==="function"?getDungeon():DUNGEON;
  const sp=D.raidSpawn||BAL.death.raidSpawn;
  resurrectPlayer(sp);
  log("你在走廊入口重整旗鼓。当前副本分段已保留，遭遇已重置。","lg-sys");
}

function releaseSpiritLeaveRaid(){
  if(S.p.alive||S.mode!=="raid")return;
  clearRaidHazards();
  hideDeathUi();
  const D=typeof getDungeon==="function"?getDungeon():DUNGEON;
  const hub=D.exitZone||"mulgore";
  const gate=hub==="barrens"?"spirit":"spirit";
  const worldSp=(BAL.death.spawns&&BAL.death.spawns[hub])||BAL.death.worldSpawn;
  enterZone(hub,gate,{
    afterEnter(){
      resurrectPlayer(worldSp,{silent:true});
      announce(hub==="barrens"?"你回到了十字路口":"你回到了营地");
      log(hub==="barrens"
        ?"你退出哀嚎洞穴，在十字路口灵魂医者旁苏醒。"
        :"你退出熔火之心，在灵魂医者旁苏醒。","lg-sys");
    },
  });
}

/* 重置遭遇：场景清理；进本时由 setStage("corridor") 重新开打 */
function resetBoss(){
  removeExitPortal();
  const D=typeof getDungeon==="function"?getDungeon():DUNGEON;
  D.mobsAlive=0; D.bridgeDone=false; D.bridgeT=0;
  if(typeof bridgeSegs!=="undefined"){
    for(let i=0;i<bridgeSegs.length;i++){
      const seg=bridgeSegs[i];
      seg.position.y=2.25; seg.material.opacity=1; seg.material.transparent=false;
    }
  }
  for(const a of S.adds)scene.remove(a.mesh);
  S.adds.length=0;
  for(const p of S.projectiles){scene.remove(p.mesh);disposeVfxMesh(p.mesh);}
  S.projectiles.length=0;
  for(const t of S.telegraphs){scene.remove(t.ring);scene.remove(t.disc);disposeVfxMesh(t.ring);disposeVfxMesh(t.disc);}
  S.telegraphs.length=0;
  for(let i=DROPS.length-1;i>=0;i--)removeDrop(DROPS[i]);
  S.b.alive=false; S.b.canLeave=false; S.b.casting=null;
  if(typeof clearThreat==="function")clearThreat(BOSS_ENT);
  if(boss){boss.visible=false;boss.rotation.z=0;}
  $("#castShell").style.display="none";
}

/* 模块加载：预载终局 Boss 数据（网格已在 world.js 建好） */
createBoss("ragnaros");
S.b.alive=false;

/* 死亡面板按钮（STEP 15） */
$("#btnReleaseWorld").addEventListener("click",()=>releaseSpiritWorld());
$("#btnReleaseRaid").addEventListener("click",()=>releaseSpiritRaid());
$("#btnLeaveRaidDead").addEventListener("click",()=>releaseSpiritLeaveRaid());
