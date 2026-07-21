/* ============================================================
   熔火之心 · barrens.js
   贫瘠之地（STEP 18）：干燥荒原 / 十字路口 / 野猪人与半人马 / 入口任务
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ srand worldRng BAL makeLabel setZoneSeed）
          zones.js（registerZone）
          models.js（buildQuadruped buildCentaur buildVendor buildSpiritHealer QUADS）
          world.js（spawnMob MOBS）
          combat.js 运行时（S log announce）
          save.js 运行时（saveGame）· panels.js 运行时（renderQuestLog）
   [导出] sceneBarrens BARRENS_R BARRENS_QUEST BARRENS_PORTAL_N BARRENS_PORTAL_S
          barrensHeli barrensSun barrensFlames
          buildBarrensZone onBarrensQuestKill tryInteractBarrens
          updateBarrensMarkers crossroadsDist barrensSpiritDist
   ============================================================ */
"use strict";

const BARRENS_R=BAL.barrens.radius;
const sceneBarrens=new THREE.Scene();
const BARRENS_PORTAL_N=new THREE.Vector3(0,0,-(BARRENS_R-8));
const BARRENS_SOUTH_MARK=new THREE.Vector3(0,0,BARRENS_R-12);
const BARRENS_PORTAL_S=BARRENS_SOUTH_MARK;

/* 入口任务：0 未接 | 1 清野猪人 | 2 已交（完整任务网见 STEP 22） */
const BARRENS_QUEST={id:"crossroads_trouble",state:0,kills:0};

let barrensHeli=null,barrensSun=null;
const barrensFlames=[];
let crossroadsSentinel=null,crossroadsLabel=null;
let barrensSpirit=null,barrensSpiritLabel=null;
let barrensMarkerExcl=null,barrensMarkerQ=null;
let barrensPortalUni=null;

function buildBarrensZone(scn){
  const root=scn||sceneBarrens;
  const B=BAL.barrens;
  root.background=new THREE.Color(B.sky);
  root.fog=new THREE.FogExp2(B.fog,B.fogDensity);

  barrensHeli=new THREE.HemisphereLight(B.hemiSky,B.hemiGround,B.hemiIntensity);
  root.add(barrensHeli);
  barrensSun=new THREE.DirectionalLight(B.sunColor,B.sunIntensity);
  barrensSun.position.set(35,65,25); barrensSun.castShadow=true;
  barrensSun.shadow.mapSize.set(2048,2048);
  barrensSun.shadow.camera.left=-100;barrensSun.shadow.camera.right=100;
  barrensSun.shadow.camera.top=100;barrensSun.shadow.camera.bottom=-100;
  root.add(barrensSun);

  const ground=new THREE.Mesh(new THREE.CircleGeometry(BARRENS_R+40,64),
    new THREE.MeshStandardMaterial({color:B.ground,roughness:1}));
  ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; root.add(ground);

  const dirtMat=new THREE.MeshStandardMaterial({color:B.dirt,roughness:1});
  for(let i=0;i<18;i++){
    const t=i/17;
    const z=BARRENS_PORTAL_N.z+(BARRENS_SOUTH_MARK.z-BARRENS_PORTAL_N.z)*t;
    const seg=new THREE.Mesh(new THREE.CircleGeometry(srand(2.4,3.2),10),dirtMat);
    seg.rotation.x=-Math.PI/2;
    seg.position.set(Math.sin(i*.55)*2.5,.03,z);
    seg.receiveShadow=true; root.add(seg);
  }

  const trunkMat=new THREE.MeshStandardMaterial({color:0x5a4028,roughness:.95});
  const deadLeaf=new THREE.MeshStandardMaterial({color:0x8a6a3a,roughness:1});
  for(let i=0;i<12;i++){
    const a=srand(0,6.28),r=srand(18,BARRENS_R-12);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.abs(x)<10&&Math.abs(z)<BARRENS_R)continue;
    const th=srand(8,14);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.45,.7,th,7),trunkMat);
    trunk.position.set(x,th/2,z); trunk.castShadow=true; root.add(trunk);
    for(let k=0;k<3;k++){
      const br=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,srand(2.5,4),5),trunkMat);
      br.position.set(x+srand(-.8,.8),th*.55+k*.6,z+srand(-.8,.8));
      br.rotation.set(srand(-.8,.8),0,srand(-.8,.8)); root.add(br);
    }
    if(worldRng()<.45){
      const blob=new THREE.Mesh(new THREE.SphereGeometry(srand(1.2,2),6,5),deadLeaf);
      blob.position.set(x,th*.85,z); blob.scale.y=.5; root.add(blob);
    }
  }

  const stakeMat=new THREE.MeshStandardMaterial({color:0x4a3020,roughness:1});
  const tentMat=new THREE.MeshStandardMaterial({color:0xb89050,roughness:.95});
  [[-32,-12],[-28,-18],[-36,-8]].forEach(([cx,cz])=>{
    for(let k=0;k<6;k++){
      const a=k/6*Math.PI*2;
      const st=new THREE.Mesh(new THREE.ConeGeometry(.2,2.2,5),stakeMat);
      st.position.set(cx+Math.cos(a)*4.5,1.1,cz+Math.sin(a)*4.5); root.add(st);
    }
    const tent=new THREE.Mesh(new THREE.ConeGeometry(3.2,4.5,7),tentMat);
    tent.position.set(cx,2.2,cz); tent.castShadow=true; root.add(tent);
  });

  const hideMat=new THREE.MeshStandardMaterial({color:0xa87840,roughness:.95});
  [[38,22],[44,28],[32,30]].forEach(([x,z])=>{
    const tent=new THREE.Mesh(new THREE.ConeGeometry(3.8,5.5,8),hideMat);
    tent.position.set(x,2.7,z); tent.castShadow=true; root.add(tent);
  });
  [[40,25]].forEach(([x,z])=>{
    for(let k=0;k<5;k++){
      const a=k/5*Math.PI*2;
      const st=new THREE.Mesh(new THREE.DodecahedronGeometry(.35,0),
        new THREE.MeshStandardMaterial({color:0x6a5040,roughness:1,flatShading:true}));
      st.position.set(x+Math.cos(a)*1.0,.25,z+Math.sin(a)*1.0); root.add(st);
    }
    const fl=new THREE.Mesh(new THREE.ConeGeometry(.65,1.6,7),
      new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.9}));
    fl.position.set(x,1.0,z); root.add(fl);
    const li=new THREE.PointLight(0xff8a30,1.3,20,1.8); li.position.set(x,2.0,z); root.add(li);
    barrensFlames.push({fl,li});
  });

  const wood=new THREE.MeshStandardMaterial({color:0x7a5a30,roughness:.9});
  const tower=new THREE.Group();
  const base=new THREE.Mesh(new THREE.BoxGeometry(4.2,1.2,4.2),wood); base.position.y=.6; tower.add(base);
  const mid=new THREE.Mesh(new THREE.BoxGeometry(3.2,4.5,3.2),wood); mid.position.y=3.5; tower.add(mid);
  const top=new THREE.Mesh(new THREE.BoxGeometry(4.5,.5,4.5),wood); top.position.y=5.9; tower.add(top);
  const flag=new THREE.Mesh(new THREE.BoxGeometry(1.8,.9,.08),
    new THREE.MeshStandardMaterial({color:0xc04020,roughness:.8}));
  flag.position.set(1.2,7.2,0); tower.add(flag);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,2.2,5),wood);
  pole.position.set(.3,7.0,0); tower.add(pole);
  tower.position.set(0,0,0); tower.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  root.add(tower);

  const gateMat=new THREE.MeshStandardMaterial({color:0x5a4028,roughness:.9,flatShading:true,
    emissive:0x4a6a30,emissiveIntensity:.15});
  const nPlat=new THREE.Mesh(new THREE.CylinderGeometry(7,8.5,1,12),gateMat);
  nPlat.position.set(BARRENS_PORTAL_N.x,.5,BARRENS_PORTAL_N.z); nPlat.receiveShadow=true; root.add(nPlat);
  [[-3.4],[3.4]].forEach(([sx])=>{
    const pil=new THREE.Mesh(new THREE.BoxGeometry(1.5,8.5,1.5),gateMat);
    pil.position.set(BARRENS_PORTAL_N.x+sx,4.8,BARRENS_PORTAL_N.z); pil.castShadow=true; root.add(pil);
  });
  const nLintel=new THREE.Mesh(new THREE.BoxGeometry(9.2,1.4,1.6),gateMat);
  nLintel.position.set(BARRENS_PORTAL_N.x,9.2,BARRENS_PORTAL_N.z); root.add(nLintel);
  barrensPortalUni={uTime:{value:0}};
  const nDisc=new THREE.Mesh(new THREE.CircleGeometry(2.8,36),new THREE.ShaderMaterial({
    uniforms:barrensPortalUni,transparent:true,side:THREE.DoubleSide,depthWrite:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;uniform float uTime;
      void main(){
        vec2 p=vUv-.5; float r=length(p)*2.; float ang=atan(p.y,p.x);
        float sw=sin(ang*2.5-uTime*2.2+r*7.);
        vec3 c=mix(vec3(.55,.75,.4),vec3(.2,.4,.15),smoothstep(-.5,.7,sw));
        c=mix(c,vec3(.05,.08,0.),smoothstep(.7,1.,r));
        gl_FragColor=vec4(c*1.15,smoothstep(1.,.88,r));
      }`}));
  nDisc.position.set(BARRENS_PORTAL_N.x,4.6,BARRENS_PORTAL_N.z); root.add(nDisc);
  const nLab=makeLabel("莫高雷",12,"#c8e8a0","rgba(60,120,40,.9)");
  nLab.position.set(BARRENS_PORTAL_N.x,12.2,BARRENS_PORTAL_N.z); root.add(nLab);

  const sPlat=new THREE.Mesh(new THREE.CylinderGeometry(7,8.5,1,12),
    new THREE.MeshStandardMaterial({color:0x3a4a30,roughness:.9,flatShading:true,
      emissive:0x2a4a20,emissiveIntensity:.2}));
  sPlat.position.set(BARRENS_PORTAL_S.x,.5,BARRENS_PORTAL_S.z); sPlat.receiveShadow=true; root.add(sPlat);
  [[-3.4],[3.4]].forEach(([sx])=>{
    const pil=new THREE.Mesh(new THREE.BoxGeometry(1.5,8.5,1.5),
      new THREE.MeshStandardMaterial({color:0x3a4a30,roughness:.9,flatShading:true,
        emissive:0x2a4a20,emissiveIntensity:.15}));
    pil.position.set(BARRENS_PORTAL_S.x+sx,4.8,BARRENS_PORTAL_S.z); pil.castShadow=true; root.add(pil);
  });
  const sLintel=new THREE.Mesh(new THREE.BoxGeometry(9.2,1.4,1.6),
    new THREE.MeshStandardMaterial({color:0x3a4a30,roughness:.9,flatShading:true}));
  sLintel.position.set(BARRENS_PORTAL_S.x,9.2,BARRENS_PORTAL_S.z); root.add(sLintel);
  const sDisc=new THREE.Mesh(new THREE.CircleGeometry(2.8,36),new THREE.ShaderMaterial({
    uniforms:barrensPortalUni,transparent:true,side:THREE.DoubleSide,depthWrite:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;uniform float uTime;
      void main(){
        vec2 p=vUv-.5; float r=length(p)*2.; float ang=atan(p.y,p.x);
        float sw=sin(ang*3.-uTime*1.8+r*6.);
        vec3 c=mix(vec3(.35,.7,.4),vec3(.1,.3,.12),smoothstep(-.5,.7,sw));
        c=mix(c,vec3(.02,.06,.02),smoothstep(.7,1.,r));
        gl_FragColor=vec4(c*1.2,smoothstep(1.,.88,r));
      }`}));
  sDisc.position.set(BARRENS_PORTAL_S.x,4.6,BARRENS_PORTAL_S.z); root.add(sDisc);
  const sLab=makeLabel("哀嚎洞穴",11,"#a8d080","rgba(40,80,30,.9)");
  sLab.position.set(BARRENS_PORTAL_S.x,12.0,BARRENS_PORTAL_S.z); root.add(sLab);
  const sLab2=makeLabel(`需要 Lv.${BAL.barrens.wailingMinLevel||15}+`,6,"#ffb060","rgba(60,80,20,.9)");
  sLab2.position.set(BARRENS_PORTAL_S.x,10.6,BARRENS_PORTAL_S.z); root.add(sLab2);

  crossroadsSentinel=buildVendor();
  crossroadsSentinel.traverse(o=>{
    if(!o.isMesh||!o.material||!o.material.color)return;
    o.material=o.material.clone();
    const h=o.material.color.getHex();
    if(h===0x2a6a4a||h===0x8a4a2a)o.material.color.setHex(0x6a5030);
  });
  crossroadsSentinel.position.set(2,0,-2); crossroadsSentinel.rotation.y=Math.PI;
  root.add(crossroadsSentinel);
  crossroadsLabel=makeLabel("哨兵 · 碎牙",7,"#e8c898","rgba(160,100,40,.9)");
  crossroadsLabel.position.set(2,5.6,-2); root.add(crossroadsLabel);

  barrensSpirit=buildSpiritHealer();
  barrensSpirit.position.set(-8,0,5); barrensSpirit.rotation.y=Math.PI*.6;
  root.add(barrensSpirit);
  barrensSpiritLabel=makeLabel("灵魂医者 · 尘语",7,"#c8e8ff","rgba(80,160,255,.95)");
  barrensSpiritLabel.position.set(-8,5.6,5); root.add(barrensSpiritLabel);

  barrensMarkerExcl=makeLabel("❗",3.2,"#ffd76a","rgba(255,160,0,.95)");
  barrensMarkerExcl.position.set(2,6.8,-2); root.add(barrensMarkerExcl);
  barrensMarkerQ=makeLabel("❓",3.2,"#ffd76a","rgba(255,160,0,.95)");
  barrensMarkerQ.position.copy(barrensMarkerExcl.position); barrensMarkerQ.visible=false; root.add(barrensMarkerQ);

  [[-32,-12],[-28,-18],[-36,-8],[-30,-22],[-40,-14]].forEach(([x,z])=>{
    spawnMob("quilboar",x,z,"quilboar_outpost",{zoneId:"barrens"});
  });
  [[38,22],[44,28],[32,30],[48,20]].forEach(([x,z])=>{
    spawnMob("centaur",x,z,"centaur_camp",{zoneId:"barrens"});
  });
  [[-15,40],[-22,32],[12,-40],[18,35]].forEach(([x,z])=>{
    spawnMob("zebra",x,z,null,{zoneId:"barrens"});
  });
  [[-18,28],[8,-35]].forEach(([x,z])=>{
    spawnMob("bird",x,z,null,{zoneId:"barrens"});
  });

  updateBarrensMarkers();
  const z=ZONES.barrens;
  if(z)z.lights={heli:barrensHeli,sun:barrensSun,flames:barrensFlames};
}

function updateBarrensMarkers(){
  if(!barrensMarkerExcl)return;
  barrensMarkerExcl.visible=(BARRENS_QUEST.state===0);
  barrensMarkerQ.visible=(BARRENS_QUEST.state===1&&BARRENS_QUEST.kills>=BAL.quest.barrens.quilboarKills);
}

function crossroadsDist(){
  if(!crossroadsSentinel)return 999;
  return Math.hypot(player.position.x-crossroadsSentinel.position.x,player.position.z-crossroadsSentinel.position.z);
}
function barrensSpiritDist(){
  if(!barrensSpirit)return 999;
  return Math.hypot(player.position.x-barrensSpirit.position.x,player.position.z-barrensSpirit.position.z);
}

function onBarrensQuestKill(m){
  if(m.type!=="quilboar"||BARRENS_QUEST.state!==1)return;
  const need=BAL.quest.barrens.quilboarKills;
  if(BARRENS_QUEST.kills>=need)return;
  BARRENS_QUEST.kills++;
  if(typeof updateQuest==="function")updateQuest();
  updateBarrensMarkers();
  if(BARRENS_QUEST.kills>=need)announce("任务目标完成 · 回十字路口找哨兵");
  if(typeof saveGame==="function")saveGame(true);
}

function tryInteractBarrens(){
  const R=BAL.economy.interactR;
  const dS=barrensSpiritDist(), dC=crossroadsDist();
  if(dS<R&&dS<=dC){openBarrensSpiritDialogue();return;}
  if(dC<R)openBarrensDialogue();
}

function openBarrensSpiritDialogue(){
  S.vendorOpen=false;
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="👻 灵魂医者 · 尘语";
  dlg.style.display="block"; bts.innerHTML="";
  tx.textContent="贫瘠之地的风很干，旅人。若你倒下，释放灵魂后我会在十字路口接引你。";
  const b=document.createElement("button");
  b.className="dbtn";b.textContent="感谢您，医者";b.onclick=closeDialogue;bts.appendChild(b);
}

function openBarrensDialogue(){
  S.vendorOpen=false;
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🗼 哨兵 · 碎牙";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  const need=BAL.quest.barrens.quilboarKills;
  if(BARRENS_QUEST.state===0){
    tx.textContent="欢迎来到十字路口，勇士。西边野猪人前哨偷走了补给，还袭击商队。清剿 4 只野猪人斥候，我再告诉你半人马与南方洞穴的消息。";
    btn("✦ 接受任务：十字路口的麻烦",()=>{
      BARRENS_QUEST.state=1; BARRENS_QUEST.kills=0;
      updateBarrensMarkers();
      if(typeof updateQuest==="function")updateQuest();
      closeDialogue();
      announce("接受任务 · 十字路口的麻烦");
      log(`接受任务【十字路口的麻烦】：清剿野猪人斥候 0/${need}。`,"lg-sys");
      if(typeof saveGame==="function")saveGame(true);
    });
    btn("离开",closeDialogue);
  }else if(BARRENS_QUEST.state===1&&BARRENS_QUEST.kills<need){
    tx.textContent=`野猪人仍在西边前哨游荡（${BARRENS_QUEST.kills}/${need}）。干完活再来找我。`;
    btn("离开",closeDialogue);
  }else if(BARRENS_QUEST.state===1){
    tx.textContent="漂亮！补给线暂时安全了。南方的哀嚎洞穴已经开放——建议等级 15，带上同伴更稳妥。收下这些铜币，继续变强吧。";
    btn("✦ 领取奖励",()=>{
      const xp=BAL.quest.barrens.rewardXp||BAL.levels.xp.barrensQuest||400;
      const cu=BAL.quest.barrens.rewardCopper||200;
      gainXP(xp);
      if(cu)gainCopper(cu,{noSave:true});
      BARRENS_QUEST.state=2;
      updateBarrensMarkers();
      if(typeof updateQuest==="function")updateQuest();
      closeDialogue();
      spawnBurst(player.position.clone().setY(1.5),0xe8c898,28,2);
      announce("完成 · 十字路口的麻烦");
      log(`奖励：经验 +${xp}，铜币 +${cu}。`,"lg-heal");
      log("哨兵提及：南方哀嚎洞穴已开放（建议 Lv15+）。","lg-sys");
      if(typeof saveGame==="function")saveGame(true);
    });
  }else{
    tx.textContent="十字路口永远欢迎英雄。留意南方绿色旋涡——哀嚎洞穴的入口就在那里（Lv15+）。";
    btn("离开",closeDialogue);
  }
}

registerZone({
  id:"barrens",
  name:"贫瘠之地",
  scene:sceneBarrens,
  build:buildBarrensZone,
  music:"barrens",
  mode:"world",
  levelRange:[10,18],
  boundsR:()=>BARRENS_R,
  dayNight:true,
  gates:{
    from_mulgore:{x:0,z:-(BARRENS_R-22)},  /* 远离北口，避免与莫高雷南口乒乓 */
    from_wailing:{x:0,z:BARRENS_R-22},     /* 远离南口，避免进出乒乓 */
    crossroads:{x:0,z:0},
    spirit:{x:-8,z:5},
    default:{x:0,z:0},
  },
  portals:[{
    id:"to_mulgore_from_barrens",
    pos:()=>BARRENS_PORTAL_N,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:"莫高雷 · 圣山草原",
    logHint:"北行土路通往牛头人营地……",
    requireAlive:true,
    autoEnter:true,
    targetZone:"mulgore",
    targetGate:"from_barrens",
  },{
    id:"to_wailing",
    pos:()=>BARRENS_PORTAL_S,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:"哀嚎洞穴 · 副本入口",
    logHint:"潮气与毒草的气味从旋涡中渗出……走进即可进入哀嚎洞穴。",
    requireAlive:true,
    autoEnter:true,
    minLevel:()=>BAL.barrens.wailingMinLevel||15,
    lockedAnnounce:()=>`等级不足！需要 Lv.${BAL.barrens.wailingMinLevel||15}`,
    lockedLog:()=>`哀嚎洞穴危机四伏——当前 Lv.${S.p.level}，建议升到 Lv.${BAL.barrens.wailingMinLevel||15} 后再挑战。`,
    targetZone:"wailing_caverns",
    targetGate:"entrance",
  }],
  onEnter(fromId,gateId,opts){
    if(opts&&opts.silent)return;
    if(fromId==="mulgore")log("干燥的热风扑面而来——你已踏入贫瘠之地。","lg-sys");
    else if(fromId==="wailing_caverns")log("你离开哀嚎洞穴，十字路口的风干而炙热。","lg-sys");
    updateBarrensMarkers();
    if(typeof updateQuest==="function")updateQuest();
  },
  onLeave(){},
});
