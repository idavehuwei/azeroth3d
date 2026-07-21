/* ============================================================
   熔火之心 · world.js
   莫高雷世界：实体放置 / 草原与营地 / 传送门与进本 / 野怪与 NPC 任务系统
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ rand srand worldRng BAL makeLabel scene camera）
          models.js（buildPlayer buildBoss buildElder buildBoar）
          items.js（dropLoot rollLoot LOOT tryLoot）
          combat.js 运行时（S log announce fct spawnBurst hitEntity closeDialogue …）
   [导出] player boss WORLD_R sceneWorld heli sun worldFlames PORTAL_POS portalUni
          portalLabel enterRaid fadeTo MOBS QUEST moveToward mobDamage mobDie
          setCorpse updateQuest setMarker tryInteract openDialogue closeDialogue
          leaveRaid resetBoss spawnExitPortal removeExitPortal exitPortal
          fireflies FIREFLIES ffPhases elder elderDist
   ============================================================ */
"use strict";
/* ---------------- 实体放置 ---------------- */
let player=buildPlayer(); player.position.set(0,0,14); scene.add(player);
const boss=buildBoss(); boss.position.set(0,-16,-14); scene.add(boss); // 初始沉在岩浆下

/* ============================================================
   莫高雷 · 外部世界（草原 / 红岩台地 / 牛头人营地 / 副本传送门）
   ============================================================ */
const WORLD_R=88;
const sceneWorld=new THREE.Scene();
sceneWorld.background=new THREE.Color(0x8fc0e8);
sceneWorld.fog=new THREE.FogExp2(0xa8c8e0,0.0062);
sceneWorld.add(new THREE.HemisphereLight(0xcfe8ff,0x5a7a3a,0.95));
const heli=sceneWorld.children.find(c=>c.isHemisphereLight);  /* 昼夜循环需要调节 */
const sun=new THREE.DirectionalLight(0xfff2d8,1.05);
sun.position.set(40,70,30); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-110;sun.shadow.camera.right=110;
sun.shadow.camera.top=110;sun.shadow.camera.bottom=-110;
sceneWorld.add(sun);

/* 草原地面 + 通往传送门的土路 */
const grass=new THREE.Mesh(new THREE.CircleGeometry(WORLD_R+50,64),
  new THREE.MeshStandardMaterial({color:0x6f9e46,roughness:1}));
grass.rotation.x=-Math.PI/2; grass.receiveShadow=true; sceneWorld.add(grass);
const dirtMat=new THREE.MeshStandardMaterial({color:0x9a7a4a,roughness:1});
for(let i=0;i<15;i++){
  const seg=new THREE.Mesh(new THREE.CircleGeometry(srand(2.6,3.4),10),dirtMat);
  seg.rotation.x=-Math.PI/2;
  seg.position.set(Math.sin(i*.7)*3,.03,48-i*7.6);
  seg.receiveShadow=true; sceneWorld.add(seg);
}
/* 湖泊 */
const pond=new THREE.Mesh(new THREE.CircleGeometry(13,32),
  new THREE.MeshStandardMaterial({color:0x4a90c8,roughness:.25,metalness:.3}));
pond.rotation.x=-Math.PI/2; pond.position.set(-38,.05,14); sceneWorld.add(pond);

/* 环绕的红岩台地（莫高雷标志性平顶山） */
const mesaMat=new THREE.MeshStandardMaterial({color:0xa8613a,roughness:1,flatShading:true});
const mesaTop=new THREE.MeshStandardMaterial({color:0x7a9e46,roughness:1});
for(let i=0;i<9;i++){
  const a=i/9*Math.PI*2+srand(-.2,.2), r=WORLD_R+srand(4,22);
  const h=srand(22,42), rad=srand(9,16);
  const mesa=new THREE.Mesh(new THREE.CylinderGeometry(rad*.85,rad,h,9),mesaMat);
  mesa.position.set(Math.cos(a)*r,h/2-1,Math.sin(a)*r);
  mesa.castShadow=true; sceneWorld.add(mesa);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(rad*.86,rad*.86,1.2,9),mesaTop);
  cap.position.set(mesa.position.x,h-.4,mesa.position.z); sceneWorld.add(cap);
}
/* 散布的树木与巨石 */
const trunkMat=new THREE.MeshStandardMaterial({color:0x6a4520,roughness:.9});
const leafMat=new THREE.MeshStandardMaterial({color:0x4a7a2e,roughness:.95});
const boulderMat=new THREE.MeshStandardMaterial({color:0x8a6a4a,roughness:1,flatShading:true});
for(let i=0;i<14;i++){
  const a=srand(0,6.28),r=srand(20,WORLD_R-10);
  const x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(Math.abs(x)<8&&z<50&&z>-70)continue; /* 避开土路 */
  if(worldRng()<.65){
    const th=srand(3,5);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.35,.5,th,6),trunkMat);
    trunk.position.set(x,th/2,z); trunk.castShadow=true; sceneWorld.add(trunk);
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(srand(1.8,2.8),7,6),leafMat);
    leaf.position.set(x,th+1.4,z); leaf.scale.y=.8; leaf.castShadow=true; sceneWorld.add(leaf);
  }else{
    const b=new THREE.Mesh(new THREE.DodecahedronGeometry(srand(1,2.4),0),boulderMat);
    b.position.set(x,.6,z); b.castShadow=true; b.receiveShadow=true; sceneWorld.add(b);
  }
}

/* 牛头人风格营地：兽皮帐篷 + 图腾柱 + 篝火 */
const hideMat=new THREE.MeshStandardMaterial({color:0xc9a06a,roughness:.95});
const hideMat2=new THREE.MeshStandardMaterial({color:0xb5854e,roughness:.95});
[[16,50],[-18,46],[10,66]].forEach(([x,z],i)=>{
  const tent=new THREE.Mesh(new THREE.ConeGeometry(4.2,6.8,8),i%2?hideMat:hideMat2);
  tent.position.set(x,3.4,z); tent.castShadow=true; sceneWorld.add(tent);
  for(let k=0;k<3;k++){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,2.4,5),trunkMat);
    pole.position.set(x+srand(-.5,.5),7.4,z+srand(-.5,.5));
    pole.rotation.set(srand(-.3,.3),0,srand(-.3,.3)); sceneWorld.add(pole);
  }
});
/* 图腾柱 */
const paintA=new THREE.MeshStandardMaterial({color:0xd94f2a,roughness:.8});
const paintB=new THREE.MeshStandardMaterial({color:0x3a7ac9,roughness:.8});
[[-6,58],[22,60]].forEach(([x,z])=>{
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.55,.7,7.5,7),trunkMat);
  pole.position.set(x,3.75,z); pole.castShadow=true; sceneWorld.add(pole);
  [[1.8,paintA],[3.6,paintB],[5.4,paintA]].forEach(([y,m])=>{
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.55,7),m);
    ring.position.set(x,y,z); sceneWorld.add(ring);
  });
  const wing=new THREE.Mesh(new THREE.BoxGeometry(3.4,.55,.25),paintB);
  wing.position.set(x,7,z); sceneWorld.add(wing);
});
/* 篝火（存引用做火光闪烁） */
const worldFlames=[];
[[0,55]].forEach(([x,z])=>{
  for(let k=0;k<6;k++){
    const a=k/6*Math.PI*2;
    const st=new THREE.Mesh(new THREE.DodecahedronGeometry(.4,0),boulderMat);
    st.position.set(x+Math.cos(a)*1.1,.3,z+Math.sin(a)*1.1); sceneWorld.add(st);
  }
  const fl=new THREE.Mesh(new THREE.ConeGeometry(.7,1.8,7),
    new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.92}));
  fl.position.set(x,1.1,z); sceneWorld.add(fl);
  const li=new THREE.PointLight(0xff8a30,1.4,22,1.8); li.position.set(x,2.2,z); sceneWorld.add(li);
  worldFlames.push({fl,li});
});

/* ---------------- 副本传送门：熔火之心入口 ---------------- */
const PORTAL_POS=new THREE.Vector3(0,0,-62);
const obsidian=new THREE.MeshStandardMaterial({color:0x241812,roughness:.85,flatShading:true,
  emissive:0x661a00,emissiveIntensity:.2});
const pPlat=new THREE.Mesh(new THREE.CylinderGeometry(8,9.5,1,12),obsidian);
pPlat.position.set(PORTAL_POS.x,.5,PORTAL_POS.z); pPlat.receiveShadow=true; sceneWorld.add(pPlat);
[[-3.8],[3.8]].forEach(([sx])=>{
  const pil=new THREE.Mesh(new THREE.BoxGeometry(1.7,9.5,1.7),obsidian);
  pil.position.set(PORTAL_POS.x+sx,5.7,PORTAL_POS.z); pil.castShadow=true; sceneWorld.add(pil);
  const spike=new THREE.Mesh(new THREE.ConeGeometry(.8,2.2,5),obsidian);
  spike.position.set(PORTAL_POS.x+sx,11.5,PORTAL_POS.z); sceneWorld.add(spike);
});
const lintel=new THREE.Mesh(new THREE.BoxGeometry(10.4,1.7,1.9),obsidian);
lintel.position.set(PORTAL_POS.x,10.4,PORTAL_POS.z); lintel.castShadow=true; sceneWorld.add(lintel);
/* 旋涡传送门（Shader 动画） */
const portalUni={uTime:{value:0}};
const portalDisc=new THREE.Mesh(new THREE.CircleGeometry(3.1,40),new THREE.ShaderMaterial({
  uniforms:portalUni,transparent:true,side:THREE.DoubleSide,depthWrite:false,
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
    varying vec2 vUv;uniform float uTime;
    void main(){
      vec2 p=vUv-.5; float r=length(p)*2.; float ang=atan(p.y,p.x);
      float sw=sin(ang*3.-uTime*3.2+r*9.);
      vec3 c=mix(vec3(1.,.78,.32),vec3(.85,.2,.02),smoothstep(-.6,.8,sw));
      c=mix(c,vec3(.14,.02,0.),smoothstep(.7,1.,r));
      c+=vec3(1.,.6,.2)*smoothstep(.25,0.,r);
      gl_FragColor=vec4(c*1.25,smoothstep(1.,.9,r));
    }`}));
portalDisc.position.set(PORTAL_POS.x,5.2,PORTAL_POS.z); sceneWorld.add(portalDisc);
/* 门前火盆 */
[[-6.5],[6.5]].forEach(([sx])=>{
  const bz=new THREE.Mesh(new THREE.CylinderGeometry(.8,.5,1.4,7),obsidian);
  bz.position.set(PORTAL_POS.x+sx,.9,PORTAL_POS.z+4); sceneWorld.add(bz);
  const fl=new THREE.Mesh(new THREE.ConeGeometry(.55,1.5,7),
    new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.92}));
  fl.position.set(PORTAL_POS.x+sx,2.2,PORTAL_POS.z+4); sceneWorld.add(fl);
  const li=new THREE.PointLight(0xff6a20,1.2,18,1.8);
  li.position.set(PORTAL_POS.x+sx,2.6,PORTAL_POS.z+4); sceneWorld.add(li);
  worldFlames.push({fl,li});
});
/* 门楣悬浮文字（makeLabel 已迁入 core.js，供掉落系统等全局复用） */
const portalLabel=makeLabel("熔火之心",14);
portalLabel.position.set(PORTAL_POS.x,13.6,PORTAL_POS.z); sceneWorld.add(portalLabel);
const portalLabel2=makeLabel("· 副本入口 ·",8);
portalLabel2.position.set(PORTAL_POS.x,12,PORTAL_POS.z); sceneWorld.add(portalLabel2);

/* ---------------- 萤火虫粒子（STEP 7 昼夜）：夜晚浮现，白天透明 ---------------- */
const FIREFLIES=80;
const fireflyGeo=new THREE.BufferGeometry();
const ffPos=new Float32Array(FIREFLIES*3), ffPhases=new Float32Array(FIREFLIES);
for(let i=0;i<FIREFLIES;i++){
  const a=srand(0,6.28),r=srand(5,WORLD_R-8);
  ffPos[i*3]=Math.cos(a)*r; ffPos[i*3+1]=srand(1,4); ffPos[i*3+2]=Math.sin(a)*r;
  ffPhases[i]=srand(0,6.28);
}
fireflyGeo.setAttribute("position",new THREE.BufferAttribute(ffPos,3));
const fireflies=new THREE.Points(fireflyGeo,new THREE.PointsMaterial({
  color:0xd0ffa0,size:.35,transparent:true,opacity:0,
  blending:THREE.AdditiveBlending,depthWrite:false}));
sceneWorld.add(fireflies);

/* 玩家移入莫高雷出生点（营地旁），当前场景切换为外部世界 */
sceneRaid.remove(player); sceneWorld.add(player);
player.position.set(0,0,52);
scene=sceneWorld;
camera.position.set(0,14,72);

/* ---------------- 进入副本（黑屏过渡） ---------------- */
function fadeTo(op,cb){const f=$("#fade");f.style.opacity=op;if(cb)setTimeout(cb,650);}
function enterRaid(){
  if(S.mode!=="world")return;
  S.mode="transition";
  announce("正在进入 · 熔火之心");
  fadeTo(1,()=>{
    S.pShots.forEach(s=>s.mesh.parent&&s.mesh.parent.remove(s.mesh));
    S.pShots.length=0;
    closeDialogue(); $("#interactBtn").style.display="none";
    sceneWorld.remove(player); sceneRaid.add(player);
    player.position.set(0,0,18); S.p.knock=null;
    scene=sceneRaid;
    S.mode="raid";
    /* 如果 Boss 已死（再次进入），重置 Boss 状态但保留玩家进度 */
    if(!S.b.alive||S.b.canLeave){
      resetBoss();
      log("你再次踏入熔火之心——火焰重新燃起，拉戈斯再度苏醒。","lg-sys");
    }else{
      /* 首次进入：重置 Boss 技能计时 */
      S.b.nextMelee=S.t+6; S.b.nextFireball=S.t+10;
      S.b.nextEruption=S.t+14; S.b.nextWrath=S.t+22;
      log("你踏入传送门——热浪扑面而来，岩浆在脚下沸腾！","lg-sys");
    }
    $("#bossFrame").classList.add("show");
    SFX.music("raid");   /* 音乐切换：低音鼓点（STEP 6） */
    fadeTo(0);
  });
}

/* ---------------- 离开副本（通过出口传送门） ---------------- */
function leaveRaid(){
  if(S.mode!=="raid")return;
  S.mode="transition";
  fadeTo(1,()=>{
    closeDialogue(); $("#interactBtn").style.display="none";
    S.pShots.forEach(s=>s.mesh.parent&&s.mesh.parent.remove(s.mesh));
    S.pShots.length=0;
    sceneRaid.remove(player); sceneWorld.add(player);
    player.position.set(0,0,52); S.p.knock=null;
    scene=sceneWorld;
    S.mode="world";
    removeExitPortal();
    $("#bossFrame").classList.remove("show");
    SFX.music("world");   /* 音乐切换：五声音阶（STEP 6） */
    log("你回到莫高雷草原，炎魔的咆哮在远方回荡……","lg-sys");
    fadeTo(0);
  });
}

/* ---------------- 出口传送门（击杀 Boss 后出现在副本入口） ---------------- */
let exitPortal=null;
const EXIT_PORTAL_POS=new THREE.Vector3(0,0,15);
function spawnExitPortal(){
  if(exitPortal)return;
  const grp=new THREE.Group();
  /* 底座 */
  const base=new THREE.Mesh(new THREE.CylinderGeometry(3.5,4.5,.8,12),
    new THREE.MeshStandardMaterial({color:0x241812,roughness:.85,flatShading:true,
      emissive:0x4a1a00,emissiveIntensity:.3}));
  base.position.y=.4; grp.add(base);
  /* 门柱 */
  const pillarMat=new THREE.MeshStandardMaterial({color:0x1a120e,roughness:.9,emissive:0x6a2200,emissiveIntensity:.15});
  [[-1.8],[1.8]].forEach(([sx])=>{
    const p=new THREE.Mesh(new THREE.BoxGeometry(.6,4.2,.6),pillarMat);
    p.position.set(sx,2.5,0); grp.add(p);
    const sp=new THREE.Mesh(new THREE.ConeGeometry(.35,1,5),pillarMat);
    sp.position.set(sx,5,0); grp.add(sp);
  });
  /* 门楣 */
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(4.6,.6,.5),pillarMat);
  lintel.position.set(0,5,0).y=5; grp.add(lintel);
  /* 旋涡盘（复用传送门 shader 风格） */
  const disc=new THREE.Mesh(new THREE.CircleGeometry(2.2,32),new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0}},transparent:true,side:THREE.DoubleSide,depthWrite:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;uniform float uTime;
      void main(){
        vec2 p=vUv-.5;float r=length(p)*2.;float ang=atan(p.y,p.x);
        float sw=sin(ang*4.+uTime*2.8+r*12.);
        vec3 c=mix(vec3(.6,1.,.8),vec3(.2,.8,.4),smoothstep(-.6,.8,sw));
        c=mix(c,vec3(0,.2,0.),smoothstep(.7,1.,r));
        c+=vec3(.4,1.,.4)*smoothstep(.25,0.,r);
        gl_FragColor=vec4(c*1.3,smoothstep(1.,.8,r));
      }`}));
  disc.position.y=2.2; disc.rotation.x=0; grp.add(disc);
  /* 发光粒子 */
  const glowPts=new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({color:0x66ffaa,size:.18,transparent:true,opacity:.7,
      blending:THREE.AdditiveBlending,depthWrite:false}));
  const gp=new Float32Array(60*3);
  for(let i=0;i<60;i++){const a=rand(0,6.28),r=rand(1,2.8);
    gp[i*3]=Math.cos(a)*r;gp[i*3+1]=rand(1.2,4.5);gp[i*3+2]=Math.sin(a)*r;}
  glowPts.geometry.setAttribute("position",new THREE.BufferAttribute(gp,3));
  grp.add(glowPts);
  grp.position.copy(EXIT_PORTAL_POS);
  sceneRaid.add(grp);
  exitPortal={grp,disc,discUni:disc.material.uniforms.uTime,glowPts};
}
function removeExitPortal(){
  if(!exitPortal)return;
  sceneRaid.remove(exitPortal.grp);
  exitPortal=null;
}

/* ============================================================
   野怪（草原野猪）与 NPC 任务系统
   ============================================================ */
const MOBS=[];
const QUEST={state:0,kills:0};   /* 0未接 1猎杀野猪 2讨伐拉戈斯 3完成 */

/* 长老 NPC + 头顶名字与任务标记 */
const elder=buildElder();
elder.position.set(6,0,49); elder.rotation.y=Math.PI*.85; sceneWorld.add(elder);
const elderLabel=makeLabel("长老 · 岩蹄",7);
elderLabel.position.set(6,5.6,49); sceneWorld.add(elderLabel);
const markerExcl=makeLabel("❗",3);
markerExcl.position.set(6,6.8,49); sceneWorld.add(markerExcl);
const markerQ=makeLabel("❓",3);
markerQ.position.copy(markerExcl.position); markerQ.visible=false; sceneWorld.add(markerQ);
function setMarker(){
  markerExcl.visible=(QUEST.state===0);
  markerQ.visible=(QUEST.state===1&&QUEST.kills>=3);
}

/* ============================================================
   野怪类型表（STEP 5）：模型配方 + 数值 + 掉落表 + 名字标签
   加新怪 = 这里加一条 + BALANCE.mobs 加一条 + 一行 spawnMob
   ============================================================ */
const MOB_TYPES={
  boar    :{name:"草原野猪",    build:()=>buildQuadruped(QUADS.boar),    stats:"boar",    loot:"boar",    labelW:4.6,labelY:2.7},
  wolf    :{name:"草原狼",      build:()=>buildQuadruped(QUADS.wolf),    stats:"wolf",    loot:"wolf",    labelW:4.2,labelY:2.7},
  bird    :{name:"陆行鸟",      build:()=>buildQuadruped(QUADS.bird),    stats:"bird",    loot:"bird",    labelW:4.2,labelY:3.4},
  harpy   :{name:"鹰身女妖首领",build:()=>buildHumanoidMob(MOB_HUMANOIDS.harpy),stats:"harpy",loot:"harpy",labelW:7,labelY:4.4,elite:true,color:"#ff9ad0"},
  boarKing:{name:"老灰鬃野猪王",build:()=>buildQuadruped(QUADS.boarKing),stats:"boarKing",loot:"boarKing",labelW:7.5,labelY:4.2,elite:true,color:"#ffd700"},
};
function spawnMob(type,x,z,group){
  const T=MOB_TYPES[type], st=BAL.mobs[T.stats];
  const mesh=T.build(); mesh.position.set(x,0,z);
  mesh.rotation.y=srand(0,6.28); sceneWorld.add(mesh);
  const label=makeLabel(T.name,T.labelW,T.color||"#ffd9a0",T.color||undefined);
  label.position.set(x,T.labelY,z); sceneWorld.add(label);
  const m={type,name:T.name,mesh,label,stats:st,loot:LOOT[T.loot],elite:!!T.elite,
    group:group||null,labelY:T.labelY,
    hp:st.hp,hpMax:st.hp,state:"wander",home:{x,z},dest:null,wanderT:rand(0,3),
    atkT:0,rootT:0,respawnT:0,corpseT:0,castCd:0,casting:null,moving:false,
    /* —— 统一实体接口（STEP 1，hitEntity 消费）；return = 脱战回巢，免疫伤害 —— */
    variance:BAL.variance.mob,
    dead(){return this.state==="dead"||this.state==="return";},
    fctPos(){return this.mesh.position.clone().setY(this.labelY-.4);},
    fctSize(){return 14;},
    onHit(amount,label){
      if(this.state==="wander")aggroMob(this);   /* 被动怪（陆行鸟）也会被打反击 */
      if(label)log(`你的【${label}】命中${this.name}，造成 ${amount} 伤害。`,"lg-me");
    },
    onDeath(){mobDie(this);},
  };
  MOBS.push(m); return m;
}
/* 可否被选中/命中：死亡与脱战回巢中的怪不可打 */
function mobTargetable(m){return m.state!=="dead"&&m.state!=="return";}
/* 进入仇恨（STEP 5 含社群仇恨 social pull）：同群且在社群半径内的伙伴全体跟进 */
function aggroMob(m){
  if(m.state!=="wander")return;
  m.state="aggro";
  SFX.play("growl");   /* 族群共用吼叫音色（STEP 6） */
  log(`${m.name}向你扑来！`,"lg-dmg");
  if(m.group){
    let pulled=0;
    for(const o of MOBS){
      if(o!==m&&o.group===m.group&&o.state==="wander"&&
         Math.hypot(o.mesh.position.x-m.mesh.position.x,o.mesh.position.z-m.mesh.position.z)<(m.stats.socialR||18)){
        o.state="aggro"; pulled++;
      }
    }
    if(pulled)log(`整群${m.name}都被激怒了！`,"lg-dmg");
  }
}

/* ---------------- 野怪放置（固定坐标，世界确定性） ---------------- */
/* 野猪群（营地周围，任务目标） */
[[20,22],[-24,26],[27,-4],[-18,-10],[10,32]].forEach(([x,z])=>spawnMob("boar",x,z));
/* 草原狼：3 只一群，社群仇恨（打一只全群上） */
[[-42,-26],[-38,-31],[-45,-33]].forEach(([x,z])=>spawnMob("wolf",x,z,"wolfpack"));
/* 陆行鸟：湖边中立被动（不主动攻击，被打才反击，移速快） */
[[-28,2],[-46,26],[-24,14]].forEach(([x,z])=>spawnMob("bird",x,z));
/* 鹰身女妖首领：小精英，读条火球，必掉优秀装备 */
spawnMob("harpy",48,-30);
/* 稀有精英「老灰鬃野猪王」：长重生计时，金色名字，必掉优秀物品 */
spawnMob("boarKing",14,-34);
function moveToward(m,dest,spd,dt){
  const dx=dest.x-m.mesh.position.x,dz=dest.z-m.mesh.position.z;
  const d=Math.hypot(dx,dz);
  if(d<.4){m.moving=false;return;}
  m.moving=true;
  m.mesh.position.x+=dx/d*spd*dt; m.mesh.position.z+=dz/d*spd*dt;
  m.mesh.rotation.y=Math.atan2(dx,dz);
}
/* 野猪受击：薄包装 → 统一受击入口 hitEntity（STEP 1） */
function mobDamage(m,amount,label){hitEntity(m,amount,label);}
/* ---------------- 尸体灰化 / 复原（STEP 2）----------------
   死亡：倒地 + 全部材质换灰（原材质暂存 userData.liveMat）；重生时还原 */
const corpseMat=new THREE.MeshStandardMaterial({color:0x8a8a8a,roughness:1,flatShading:true});
function setCorpse(m,on){
  m.mesh.rotation.z=on?Math.PI/2:0;
  m.mesh.position.y=on?.25:0;
  m.mesh.traverse(o=>{
    if(!o.isMesh)return;
    if(on){o.userData.liveMat=o.material;o.material=corpseMat;}
    else if(o.userData.liveMat){o.material=o.userData.liveMat;o.userData.liveMat=null;}
  });
}
/* 野怪死亡（STEP 1 onDeath 唯一挂接点）：留尸 + 掉落（STEP 2）+ 经验（STEP 3）
   STEP 5 泛化：数值/掉落/经验全部来自实体自身配置；精英走 eliteWeights 必掉优秀以上 */
function mobDie(m){
  m.state="dead"; m.respawnT=m.stats.respawnT; m.corpseT=BAL.loot.corpseT; m.moving=false;
  m.casting=null;
  m.label.visible=false;
  setCorpse(m,true);
  spawnBurst(m.mesh.position.clone().setY(1),0xc9a06a,22,1.6);
  log(`你击杀了${m.name}！`,"lg-me");
  if(m.elite)announce(`${m.name} 被击败！`);
  dropLoot(m.mesh.position.clone().add(new THREE.Vector3(1.2,0,.6)),
    [rollLoot(m.loot,m.elite?BAL.loot.eliteWeights:null)],m);
  gainXP(m.stats.xp);
  if(m.type==="boar"&&QUEST.state===1&&QUEST.kills<BAL.quest.boarKills){
    QUEST.kills++; updateQuest();
    if(QUEST.kills>=BAL.quest.boarKills){announce("任务目标完成 · 回去找长老"); setMarker();}
  }
}

/* ---------------- 任务追踪 HUD ---------------- */
function updateQuest(){
  const q=$("#quest");
  if(QUEST.state===1)q.innerHTML=`<b>任务 · 狂躁的野猪</b><br>猎杀草原野猪 ${Math.min(QUEST.kills,BAL.quest.boarKills)}/${BAL.quest.boarKills}`;
  else if(QUEST.state===2)q.innerHTML=`<b>任务 · 讨伐拉戈斯</b><br>进入北方传送门<br>击败炎魔领主`;
  else if(QUEST.state===3)q.innerHTML=`<b style="color:#8aff9a">✔ 任务完成 · 讨伐拉戈斯</b>`;
  else{q.style.display="none";return;}
  q.style.display="block";
}

/* ---------------- NPC 对话 ---------------- */
function elderDist(){return Math.hypot(player.position.x-elder.position.x,player.position.z-elder.position.z);}
function tryInteract(){
  if(!S.started||S.over)return;
  if(tryLoot())return;   /* 尸体旁的战利品优先（STEP 2），世界/副本通用 */
  /* 副本内：击杀 Boss 后走进出口传送门自动离开 */
  if(S.mode==="raid"&&S.b.canLeave&&exitPortal&&player.position.distanceTo(EXIT_PORTAL_POS)<4.5){
    leaveRaid(); return;
  }
  if(S.mode==="world"&&elderDist()<5.5)openDialogue();
}
function closeDialogue(){$("#dlg").style.display="none";}
function openDialogue(){
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  if(QUEST.state===0){
    tx.textContent="远行的旅人啊，草原并不平静。北方的传送门日夜喷吐着灼热的怨气……但在此之前，先证明你的实力：营地周围的草原野猪近来狂躁伤人，猎杀 3 只，我便告诉你炎魔的秘密。";
    btn("✦ 接受任务：狂躁的野猪",()=>{
      QUEST.state=1; updateQuest(); setMarker(); closeDialogue();
      announce("接受任务 · 狂躁的野猪");
      log("接受任务【狂躁的野猪】：猎杀草原野猪 0/3。","lg-sys");
    });
    btn("离开",closeDialogue);
  }else if(QUEST.state===1&&QUEST.kills<BAL.quest.boarKills){
    tx.textContent=`野猪仍在草原上游荡（${QUEST.kills}/3）。靠近它们，用你的武器说话吧，勇士。`;
    btn("离开",closeDialogue);
  }else if(QUEST.state===1){
    tx.textContent="干得漂亮，勇士！听着——传送门深处沉睡着炎魔领主拉戈斯，他的烈焰迟早会烧到这片草原。收下大地母亲的祝福，北行吧，终结他！";
    btn("✦ 领取奖励，接受任务：讨伐拉戈斯",()=>{
      /* 伤害奖励改为叠加（STEP 3 起）：不能覆盖等级带来的 dmgMul 成长 */
      S.p.hpMax+=BAL.quest.rewardHp; S.p.hp=S.p.hpMax; S.p.dmgMul+=BAL.quest.rewardDmgMul-1;
      gainXP(BAL.levels.xp.quest);   /* 经验（STEP 3）：任务 +300 */
      QUEST.state=2; updateQuest(); setMarker(); closeDialogue();
      spawnBurst(player.position.clone().setY(1.5),0x8aff9a,30,2);
      announce("获得 · 大地母亲的祝福");
      log(`奖励：生命上限 +${BAL.quest.rewardHp} 并完全恢复，造成的伤害提升 ${Math.round((BAL.quest.rewardDmgMul-1)*100)}%！`,"lg-heal");
      log("接受任务【讨伐拉戈斯】：进入北方传送门，击败炎魔领主。","lg-sys");
    });
  }else{
    tx.textContent="北行吧，勇士。踏入旋涡，愿圣山的风与你同在。";
    btn("离开",closeDialogue);
  }
}
