/* ============================================================
   熔火之心 · raid.js
   副本系统（STEP 8）：副本环境搭建 / Boss AI / 投射物 / 烈焰之子
            副本分段 DUNGEON.stage 状态推进
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ clamp rand R BAL scene camera ARENA_R
          lavaUniforms embers EMBERS emberVel srand worldRng sceneRaid）
          models.js（buildFlameSpawn）
          items.js（ITEMS DROPS removeDrop dropLoot rollLoot LOOT）
          world.js（player boss MOBS QUEST setCorpse corpseMat removeDropOf
          spawnExitPortal removeExitPortal leaveRaid）
   [导出] bossAI startCast fireProjectile spawnTelegraph spawnBurst
          spawnAdd addDamage addDie bossDie playerDie resetBoss
          distToBoss bossTargetable BOSS_ENT DUNGEON
          buildRaidScene
   ============================================================ */
"use strict";

/* ============================================================
   副本环境搭建（原 core.js 中 sceneRaid 的附加内容）
   导出为函数，供 game.html 加载后立即调用
   ============================================================ */
function buildRaidScene(){
  /* 光照：熔岩环境 */
  sceneRaid.add(new THREE.AmbientLight(0x662211,0.9));
  const lavaLight=new THREE.PointLight(0xff5a1a,1.6,140,1.6); lavaLight.position.set(0,6,-26); sceneRaid.add(lavaLight);
  const topLight=new THREE.DirectionalLight(0xffb070,0.55);
  topLight.position.set(18,40,20); topLight.castShadow=true;
  topLight.shadow.mapSize.set(2048,2048);
  topLight.shadow.camera.left=-50;topLight.shadow.camera.right=50;
  topLight.shadow.camera.top=50;topLight.shadow.camera.bottom=-50;
  sceneRaid.add(topLight);

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
  lava.rotation.x=-Math.PI/2; lava.position.y=-0.9; sceneRaid.add(lava);

  /* 黑曜石战斗平台 */
  const platMat=new THREE.MeshStandardMaterial({color:0x1c1412,roughness:.92,metalness:.15});
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(ARENA_R,ARENA_R+2.5,2.2,48),platMat);
  platform.position.y=-1.1; platform.receiveShadow=true; sceneRaid.add(platform);
  /* 平台边缘符文环 */
  const runeRing=new THREE.Mesh(new THREE.RingGeometry(ARENA_R-1.4,ARENA_R-0.6,64),
    new THREE.MeshBasicMaterial({color:0xff6a1a,transparent:true,opacity:.35,side:THREE.DoubleSide}));
  runeRing.rotation.x=-Math.PI/2; runeRing.position.y=0.03; sceneRaid.add(runeRing);

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
    rock.castShadow=true; sceneRaid.add(rock);
  }
  /* 平台上散落碎石 */
  for(let i=0;i<10;i++){
    const a=srand(0,6.28),r=srand(8,ARENA_R-3);
    const s=srand(.4,1.1);
    const st=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),rockMat);
    st.position.set(Math.cos(a)*r,s*.4,Math.sin(a)*r);
    st.castShadow=true;st.receiveShadow=true;sceneRaid.add(st);
  }
  /* 火星粒子加入副本场景 */
  sceneRaid.add(embers);
}

/* ============================================================
   副本分段系统（STEP 8）
   DUNGEON.stage 状态推进：corridor（走廊）→ boss（Boss 战）
   ============================================================ */
const DUNGEON={
  stage:"boss",      /* "corridor" | "boss"（未来扩展："bridge"等） */
  mobsAlive:0,       /* 当前阶段存活小怪数 */
  setStage(s){
    if(s==="corridor"){
      this.stage="corridor";
      /* 走廊熔岩犬 x2，复用烈焰之子 AI 但用不同数据 */
      for(let i=0;i<2;i++){
        const a=i*Math.PI+rand(-.5,.5);
        const x=Math.cos(a)*rand(14,20), z=Math.sin(a)*rand(14,20)-8;
        spawnAdd(x,z);
      }
      this.mobsAlive=2;
      log("走廊中涌出熔岩犬！消灭它们才能开启 Boss 战。","lg-sys");
    }else if(s==="boss"){
      this.stage="boss";
      announce("Boss 战已解锁！");
      log("熔岩散去，通往拉戈斯平台的道路已经打开。","lg-sys");
    }
  },
};

/* ============================================================
   Boss AI / 技能 / 胜负
   ============================================================ */
function distToBoss(){return player.position.distanceTo(new THREE.Vector3(boss.position.x,0,boss.position.z));}
function bossTargetable(){return S.b.alive&&!S.b.rising&&!S.b.submerged;}

/* Boss 实体适配器 */
const BOSS_ENT={
  get hp(){return S.b.hp}, set hp(v){S.b.hp=v},
  variance:BAL.variance.boss,
  dead(){return !bossTargetable();},
  fctPos(){return new THREE.Vector3(boss.position.x,9,boss.position.z);},
  fctSize(label){return label?19:15;},
  onHit(amount,label){if(label)log(`你的【${label}】对炎魔造成 ${amount} 点伤害！`,"lg-me");},
  onDeath(){bossDie();},
};

function startCast(name,dur,done){
  S.b.casting={name,done}; S.b.castT=0; S.b.castDur=dur;
  $("#castShell").style.display="block"; $("#castText").textContent=name;
}
function bossAI(dt){
  const B=S.b;
  if(!B.alive)return;

  /* 出场：从岩浆升起 */
  if(B.rising){
    B.riseT+=dt;
    boss.position.y=THREE.MathUtils.lerp(-16,0,Math.min(1,B.riseT/4));
    boss.position.y+=Math.sin(S.t*2)*.1;
    if(B.riseT>1.2&&B.riseT<1.3)spawnBurst(new THREE.Vector3(0,1,-14),0xff5a1a,60,4);
    if(B.riseT>=4){B.rising=false;
      SFX.play("roar");
      announce("拉戈斯：太早了！你们竟敢太早唤醒我！");
      log("炎魔领主 拉戈斯 从熔岩中苏醒了！","lg-boss");}
    return;
  }
  /* 潜地阶段（阶段二召唤烈焰之子） */
  if(B.submerged){
    B.submergeT-=dt;
    boss.position.y=THREE.MathUtils.lerp(boss.position.y,-15,dt*2);
    if(B.submergeT<=0||S.adds.length===0){
      B.submerged=false;
      announce("拉戈斯重新浮出岩浆！");
      log("烈焰散去，拉戈斯再度现身！","lg-boss");
      B.nextMelee=S.t+2;B.nextFireball=S.t+5;B.nextEruption=S.t+8;B.nextWrath=S.t+14;
    }
    return;
  }
  boss.position.y=THREE.MathUtils.lerp(boss.position.y,Math.sin(S.t*1.6)*.25,dt*3);

  /* 阶段切换：50% 血量潜入岩浆并召唤小怪 */
  if(B.phase===1&&B.hp<=B.hpMax*BAL.boss.phase2At){
    B.phase=2; B.submerged=true; B.submergeT=BAL.boss.submergeT; B.casting=null; $("#castShell").style.display="none";
    SFX.play("roar");
    announce("阶段二 · 烈焰之子！");
    log("拉戈斯沉入岩浆——烈焰之子从熔岩中涌出！消灭它们！","lg-boss");
    for(let i=0;i<BAL.boss.addCount;i++){
      const a=i/BAL.boss.addCount*Math.PI*2+rand(0,1);
      spawnAdd(Math.cos(a)*rand(10,16),Math.sin(a)*rand(10,16)-4);
    }
    return;
  }

  /* 读条处理 */
  if(B.casting){
    B.castT+=dt;
    $("#castFill").style.transform=`scaleX(${Math.min(1,B.castT/B.castDur)})`;
    if(B.castT>=B.castDur){
      const c=B.casting; B.casting=null; $("#castShell").style.display="none"; c.done();
    }
    return;
  }

  const d=distToBoss();
  /* 近战：熔火重击 */
  if(S.t>B.nextMelee){
    B.nextMelee=S.t+R(BAL.boss.melee.cd);
    if(d<BAL.boss.melee.range){
      B.swingT=1;
      setTimeout(()=>{ if(S.over)return;
        if(distToBoss()<BAL.boss.melee.hitRange&&S.p.alive){playerHit(R(BAL.boss.melee.dmg)*(B.phase===2?BAL.boss.melee.p2Mul:1),"拉戈斯的熔火重击");
          spawnBurst(player.position.clone().setY(.5),0xff6a1a,14,1.2);}
      },BAL.boss.melee.delayMs);
    }
  }
  /* 烈焰冲击（火球） */
  if(S.t>B.nextFireball){
    B.nextFireball=S.t+R(BAL.boss.fireball.cd);
    startCast("烈焰冲击",BAL.boss.fireball.cast,()=>{
      log("拉戈斯掷出烈焰冲击！","lg-boss");
      fireProjectile(player.position.clone());
    });
    return;
  }
  /* 熔岩喷发（地面红圈 AoE） */
  if(S.t>B.nextEruption){
    B.nextEruption=S.t+R(BAL.boss.eruption.cd);
    startCast("熔岩喷发",BAL.boss.eruption.cast,()=>{
      announce("熔岩喷发 · 快躲开红圈！");
      log("大地震颤，熔岩即将喷发！","lg-boss");
      const n=B.phase===2?BAL.boss.eruption.p2Count:BAL.boss.eruption.count;
      spawnTelegraph(player.position.x,player.position.z,4.5,BAL.boss.eruption.delay);
      for(let i=0;i<n;i++){
        const a=rand(0,6.28),r=rand(3,ARENA_R-4);
        spawnTelegraph(Math.cos(a)*r,Math.sin(a)*r,rand(3.5,5.5),BAL.boss.eruption.delay+i*.25);
      }
    });
    return;
  }
  /* 拉戈斯之怒（近身击退） */
  if(S.t>B.nextWrath){
    B.nextWrath=S.t+R(BAL.boss.wrath.cd);
    startCast("拉戈斯之怒",BAL.boss.wrath.cast,()=>{
      announce("拉戈斯之怒！");
      spawnBurst(new THREE.Vector3(boss.position.x,2,boss.position.z),0xffb040,70,7);
      if(distToBoss()<BAL.boss.wrath.range&&S.p.alive){
        playerHit(R(BAL.boss.wrath.dmg),"拉戈斯之怒");
        const dir=player.position.clone().sub(new THREE.Vector3(boss.position.x,0,boss.position.z)).normalize();
        S.p.knock={dir,t:.4};
        log("你被巨大的冲击波击飞！","lg-dmg");
      }
    });
  }
}

/* ---------------- 火球投射物 ---------------- */
function fireProjectile(targetPos,origin,opt){
  opt=opt||BAL.boss.fireball;
  const sc=origin?.7:1;
  const m=new THREE.Mesh(new THREE.SphereGeometry(.9*sc,10,10),
    new THREE.MeshBasicMaterial({color:0xffa030}));
  const glow=new THREE.Mesh(new THREE.SphereGeometry(1.4*sc,10,10),
    new THREE.MeshBasicMaterial({color:0xff4400,transparent:true,opacity:.4}));
  m.add(glow);
  if(origin)m.position.copy(origin);
  else m.position.set(boss.position.x+2.5,9,boss.position.z+2);
  scene.add(m);
  S.projectiles.push({mesh:m,target:targetPos.clone().setY(.8),speed:opt.speed,
    dmg:opt.dmg,hitR:opt.hitR,label:opt.name||"烈焰冲击"});
}
/* ---------------- 地面 AoE 红圈 ---------------- */
function spawnTelegraph(x,z,r,delay){
  const ring=new THREE.Mesh(new THREE.RingGeometry(r*.86,r,40),
    new THREE.MeshBasicMaterial({color:0xff2200,transparent:true,opacity:.85,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.set(x,.06,z);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(r,40),
    new THREE.MeshBasicMaterial({color:0xff3b00,transparent:true,opacity:.22,side:THREE.DoubleSide}));
  disc.rotation.x=-Math.PI/2;disc.position.set(x,.05,z);
  scene.add(ring);scene.add(disc);
  S.telegraphs.push({ring,disc,x,z,r,t:0,delay});
}
/* ---------------- 粒子爆发 ---------------- */
function spawnBurst(pos,color,count,spread){
  const geo=new THREE.BufferGeometry();
  const p=new Float32Array(count*3),vel=[];
  for(let i=0;i<count;i++){
    p[i*3]=pos.x;p[i*3+1]=pos.y;p[i*3+2]=pos.z;
    const a=rand(0,6.28),e=rand(.3,1.4);
    vel.push(new THREE.Vector3(Math.cos(a)*spread*rand(.4,1),e*spread*1.6,Math.sin(a)*spread*rand(.4,1)));
  }
  geo.setAttribute("position",new THREE.BufferAttribute(p,3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({color,size:.45,transparent:true,
    opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));
  scene.add(pts);
  S.bursts.push({pts,vel,life:0});
}
/* ---------------- 烈焰之子 ---------------- */
function spawnAdd(x,z){
  const mesh=buildFlameSpawn();
  mesh.position.set(clamp(x,-ARENA_R+3,ARENA_R-3),0,clamp(z,-ARENA_R+3,ARENA_R-3));
  scene.add(mesh);
  S.adds.push({mesh,name:"烈焰之子",hp:BAL.add.hp,hpMax:BAL.add.hp,atkT:0,corpseT:0,
    variance:null,
    dead(){return !S.adds.includes(this);},
    fctPos(){return this.mesh.position.clone().setY(2.6);},
    onDeath(){addDie(this);},
  });
  spawnBurst(mesh.position.clone().setY(1),0xff5a1a,20,1.6);
}
function addDamage(a,amount){hitEntity(a,amount);}
function addDie(a){
  spawnBurst(a.mesh.position.clone().setY(1),0xffa040,26,2);
  a.mesh.traverse(o=>{if(o.isMesh){o.userData.liveMat=o.material;o.material=corpseMat;}});
  a.mesh.rotation.z=Math.PI/2; a.mesh.position.y=.25;
  a.corpseT=BAL.loot.corpseT;
  dropLoot(a.mesh.position.clone().add(new THREE.Vector3(1.2,0,.6)),[rollLoot(LOOT.add)],a);
  log("一只烈焰之子被消灭了！","lg-me");
  /* 走廊模式：减计数 */
  if(DUNGEON.stage==="corridor"){
    DUNGEON.mobsAlive--;
    if(DUNGEON.mobsAlive<=0)DUNGEON.setStage("boss");
  }
}

/* ============================================================
   胜负
   ============================================================ */
function bossDie(){
  S.b.alive=false;
  S.b.canLeave=true;
  if(QUEST.state===2){QUEST.state=3;updateQuest();}
  SFX.play("roar");
  announce("炎魔领主 已被击败！");
  log("拉戈斯发出震天怒吼，缓缓沉回熔岩深处……","lg-boss");
  log("已拾取战利品后，走进出现的传送门即可离开副本。","lg-sys");
  gainXP(BAL.levels.xp.boss);
  spawnBurst(new THREE.Vector3(boss.position.x,6,boss.position.z),0xffc060,120,9);
  let t=0;const iv=setInterval(()=>{t+=0.05;boss.position.y-=0.16;boss.rotation.z+=0.004;
    if(t>3)clearInterval(iv);},50);
  setTimeout(()=>{
    dropLoot(new THREE.Vector3(0,0,-8),[ITEMS.sulfuras_haft],null);
    announce("传说战利品 · 按 F 拾取");
    log("熔岩翻涌，一柄燃烧的锤柄浮出岩浆——靠近按 F 拾取。","lg-sys");
  },3400);
  setTimeout(()=>{
    $("#endTitle").textContent="胜 利";
    $("#endTitle").style.color="#ffd9a0";
    $("#endSub").textContent="MOLTEN CORE · CLEARED";
    $("#endText").innerHTML="炎魔领主的躯体崩解为冷却的黑曜岩。<br>前往副本入口处，走进传送门离开。";
    $("#endOv").classList.remove("hide");
    setTimeout(()=>{
      $("#endOv").classList.add("hide");
      spawnExitPortal();
      announce("离开副本的传送门已开启");
      log("一道旋涡传送门在副本入口处打开——走进即可离开。","lg-sys");
    },3000);
  },5000);
}
function playerDie(){
  S.p.alive=false;S.over=true;
  announce("你被击败了……");
  player.rotation.z=Math.PI/2;player.position.y=.5;
  setTimeout(()=>{
    $("#endTitle").textContent="团 灭";
    $("#endTitle").style.color="#ff5a3c";
    $("#endSub").textContent="YOU HAVE BEEN DEFEATED";
    $("#endText").innerHTML="烈焰吞没了你的身躯，拉戈斯的狂笑响彻洞穴。<br>灵魂医者在等着你——跑尸之后，再来一次。";
    $("#endOv").classList.remove("hide");
  },2200);
}

/* 重置 Boss 状态 */
function resetBoss(){
  S.b.hp=S.b.hpMax=BAL.boss.hp;
  S.b.alive=true; S.b.phase=1; S.b.rising=true; S.b.riseT=0;
  S.b.submerged=false; S.b.submergeT=0; S.b.casting=null; S.b.castT=0; S.b.castDur=0;
  S.b.canLeave=false; S.b.swingT=0;
  S.b.nextMelee=S.t+6; S.b.nextFireball=S.t+10;
  S.b.nextEruption=S.t+14; S.b.nextWrath=S.t+22;
  removeExitPortal();
  DUNGEON.stage="boss"; DUNGEON.mobsAlive=0;
  for(const a of S.adds)scene.remove(a.mesh);
  S.adds.length=0;
  for(const p of S.projectiles)scene.remove(p.mesh);
  S.projectiles.length=0;
  for(const t of S.telegraphs){scene.remove(t.ring);scene.remove(t.disc);}
  S.telegraphs.length=0;
  for(let i=DROPS.length-1;i>=0;i--)removeDrop(DROPS[i]);
  boss.position.set(0,-16,-14); boss.rotation.z=0;
  $("#castShell").style.display="none";
}