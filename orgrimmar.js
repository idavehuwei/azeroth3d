/* ============================================================
   炽心 · orgrimmar.js V3
   奥格瑞玛 V3 — 魔兽级兽人主城：城墙 / 区划 / 建筑群 / NPC
   南接赭岩谷，北通黑石山
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ srand BAL makeLabel makeNameplate）
          zones.js（registerZone）· sky.js（initZoneSky）
          props.js（placeZoneTrees）
          models.js（buildVendor buildSpiritHealer buildElder tintNpcCloth
            buildHut buildTent buildFence buildWatchtower buildCampfire buildTotem
            buildMarketStall buildCratePile BUILD_PAL placeProp buildGraveyard
            buildLonghouse buildWell buildVillageGate buildSignpost buildLanternPole buildHaystack buildTrainingDummy buildWindmill）
          world.js（appendNpcQuestButtons openVendor closeVendorPanel placeTalkNpc）
          combat.js 运行时（S log announce）
          professions.js 运行时（spawnGatherNodesForZone）
          save.js 运行时（saveGame）
   [导出] sceneOrgrimmar ORGRIMMAR_R ORG_PORTAL_S ORG_PORTAL_N
          buildOrgrimmarZone tryInteractOrgrimmar
          updateOrgrimmarMarkers orgThrallDist orgSpiritDist orgVendorDist
          orgHeli orgSun orgFlames
          orgMarkerExcl orgMarkerExclGrey orgMarkerQ
   ============================================================ */
"use strict";

const ORGRIMMAR_R=(BAL.orgrimmar&&BAL.orgrimmar.radius)||320;
const sceneOrgrimmar=new THREE.Scene();
const ORG_PORTAL_S=new THREE.Vector3(0,0,ORGRIMMAR_R-10);
const ORG_PORTAL_N=new THREE.Vector3(0,0,-(ORGRIMMAR_R-10));

let orgHeli=null,orgSun=null;
const orgFlames=[];
let orgThrall=null,orgVendor=null,orgSpirit=null,orgBanker=null,orgFlight=null;
let orgPortalUniS=null,orgPortalUniN=null;
let orgMarkerExcl=null,orgMarkerExclGrey=null,orgMarkerQ=null;

/* 奥格瑞玛特有材质 */
const _orgMat={
  wall:null, wallDark:null, wallTrim:null,
  floor:null, floorDark:null,
  roof:null, roofDark:null,
  wood:null, woodD:null,
  gold:null, banner:null, bone:null,
};
function _initOrgMats(P){
  if(_orgMat.wall)return;
  _orgMat.wall=MAT.get("org.wall",{color:0x8a3020,roughness:.92,flatShading:true,emissive:0x401008,emissiveIntensity:.12});
  _orgMat.wallDark=MAT.get("org.wallDark",{color:0x5a1a10,roughness:.95,flatShading:true});
  _orgMat.wallTrim=MAT.get("org.trim",{color:0xaa4830,roughness:.85,flatShading:true});
  _orgMat.floor=MAT.get("org.floor",{color:0x6a2818,roughness:1,flatShading:true});
  _orgMat.floorDark=MAT.get("org.floorDark",{color:0x3a1410,roughness:1,flatShading:true});
  _orgMat.roof=MAT.get("org.roof",{color:0x6a2010,roughness:1,flatShading:true});
  _orgMat.roofDark=MAT.get("org.roofDark",{color:0x3a1008,roughness:1,flatShading:true});
  _orgMat.wood=MAT.get("org.wood",{color:0x5a2810,roughness:.9,flatShading:true});
  _orgMat.woodD=MAT.get("org.woodD",{color:0x2a1008,roughness:.95,flatShading:true});
  _orgMat.gold=MAT.get("org.gold",{color:0xd9a441,r:.3,mt:.9});
  _orgMat.banner=MAT.get("org.banner",{color:0x8a2010,roughness:.9,side:THREE.DoubleSide});
  _orgMat.bone=MAT.get("org.bone",{color:0xe8e0c8,r:.55,mt:.08});
}

/* 辅助：石柱 */
function _orgPillar(x,y,z,h,th){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(th,th*1.15,h,8),_orgMat.wall);
  m.position.set(x,y+h/2,z); m.castShadow=true; return m;
}
/* 辅助：墙段 */
function _orgWall(x,z,w,h,d,rot){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),_orgMat.wall);
  m.position.set(x,h/2,z); if(rot)m.rotation.y=rot; m.castShadow=true; return m;
}
/* 辅助：屋顶（锥形） */
function _orgRoofCone(x,z,r,h,y){
  const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,8),_orgMat.roof);
  m.position.set(x,y,z); return m;
}
/* 辅助：旗帜 */
function _orgBanner(x,y,z,rot){
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,2.8,5),_orgMat.woodD);
  pole.position.set(x,y+1.4,z);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.9),_orgMat.banner);
  flag.position.set(x+1.0,y+1.6,z); flag.rotation.y=rot||0;
  const g=new THREE.Group(); g.add(pole); g.add(flag); return g;
}
/* 辅助：灯笼 */
function _orgLantern(x,y,z){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(.4,.5,.4),
    new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.7}));
  body.position.set(0,0,0); g.add(body);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.22,.04,5,8),_orgMat.gold);
  ring.position.set(0,.25,0); g.add(ring);
  g.position.set(x,y,z); return g;
}

/* 城楼（南北大门） */
function _buildOrgGate(pos,label,sub,colorA,colorB){
  const g=new THREE.Group();
  const M=_orgMat;
  /* 基座平台 */
  const plat=new THREE.Mesh(new THREE.CylinderGeometry(7,8.5,1.2,12),M.wallDark);
  plat.position.set(0,.55,0); g.add(plat);
  /* 双塔柱 */
  [-3.8,3.8].forEach(sx=>{
    const tower=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.8,9,8),M.wall);
    tower.position.set(sx,5,0); tower.castShadow=true; g.add(tower);
    /* 柱顶垛 */
    const crest=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.0,1.2,8),M.wallDark);
    crest.position.set(sx,9.6,0); g.add(crest);
    /* 尖刺 */
    const spike=new THREE.Mesh(new THREE.ConeGeometry(.12,1.2,5),M.bone);
    spike.position.set(sx,10.2,0); g.add(spike);
    /* 灯笼 */
    g.add(_orgLantern(sx,6.5,0));
  });
  /* 横梁拱桥 */
  const arch=new THREE.Mesh(new THREE.BoxGeometry(9,1.8,2.2),M.wallDark);
  arch.position.set(0,8.5,0); g.add(arch);
  const archTop=new THREE.Mesh(new THREE.BoxGeometry(10,.6,2.5),M.wallTrim);
  archTop.position.set(0,9.4,0); g.add(archTop);
  /* 兽角装饰 */
  [-4.5,4.5].forEach(sx=>{
    const horn=new THREE.Mesh(new THREE.ConeGeometry(.25,1.2,5),M.bone);
    horn.position.set(sx,9.8,0); horn.rotation.z=sx>0?.3:-.3; g.add(horn);
  });
  /* 传送门旋涡 */
  const uni={uTime:{value:0}};
  const disc=new THREE.Mesh(new THREE.CircleGeometry(3.0,32),new THREE.ShaderMaterial({
    uniforms:uni,transparent:true,side:THREE.DoubleSide,depthWrite:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;uniform float uTime;
      void main(){
        vec2 p=vUv-.5; float r=length(p)*2.; float ang=atan(p.y,p.x);
        float sw=sin(ang*2.8-uTime*2.6+r*8.);
        vec3 c=mix(vec3(${colorA}),vec3(${colorB}),smoothstep(-.5,.7,sw));
        c=mix(c,vec3(.08,.02,0.),smoothstep(.7,1.,r));
        gl_FragColor=vec4(c*1.15,smoothstep(1.,.88,r));
      }`}));
  disc.position.set(0,4.5,0); g.add(disc);
  /* 牌匾 */
  if(label){
    const L=makeLabel(label,12,"#ffb070","rgba(80,25,10,.95)");
    L.position.set(0,12.5,0); g.add(L);
  }
  if(sub){
    const L2=makeLabel(sub,6,"#ff9060","rgba(70,20,8,.9)");
    L2.position.set(0,11.2,0); g.add(L2);
  }
  g.position.set(pos.x,0,pos.z);
  return{g,uni};
}

function buildOrgrimmarZone(scn){
  const root=scn||sceneOrgrimmar;
  const D=BAL.orgrimmar||{};
  root.background=new THREE.Color(D.sky||0xd86838);
  root.fog=new THREE.FogExp2(D.fog||0xb84828,D.fogDensity||0.0055);

  orgHeli=new THREE.HemisphereLight(D.hemiSky||0xffb080,D.hemiGround||0x5a2010,D.hemiIntensity||1.05);
  root.add(orgHeli);
  orgSun=new THREE.DirectionalLight(D.sunColor||0xffa060,D.sunIntensity||1.25);
  orgSun.position.set(30,70,-10); orgSun.castShadow=true;
  root.add(orgSun); root.add(orgSun.target);
  if(typeof initZoneSky==="function"){
    initZoneSky(root,{heli:orgHeli,sun:orgSun},{
      zenith:0x8a3020, horizon:D.sky||0xd86838, ground:D.dirt||0x6a2818, zoneId:"orgrimmar",
    });
  }

  const P=BUILD_PAL.orgrimmar||BUILD_PAL.durotar;
  _initOrgMats(P);
  const M=_orgMat;

  /* ===== 地面 ===== */
  const ground=new THREE.Mesh(new THREE.CircleGeometry(ORGRIMMAR_R+28,64),
    MAT.get("dirt.org",{color:D.ground||0xb84828,roughness:1}));
  ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; root.add(ground);

  /* 城内点缀：红土庭院树 + 枯木（靠外缘，避开主街） */
  if(typeof placeZoneTrees==="function"){
    placeZoneTrees(root,{
      count:90, radius:ORGRIMMAR_R-40, minR:40, cx:0, cz:0,
      avoid:[{x:0,z:0,r:36},{x:0,z:ORGRIMMAR_R-55,r:30}],
      weights:{pine:.15,oak:.35,dead:.3,twisted:.2},
      baseScale:4.8, leafTint:0x8a6a48, barkTint:0xd0b090,
      heightFn:()=>0, seed:0x066^WORLD_SEED,
      bush:true, bushCount:110, fern:false, clusters:4, rockCount:40,
    });
  }

  /* ===== 外城墙（16 段，每段带垛口） ===== */
  const wallR=ORGRIMMAR_R-18;
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2;
    /* 墙段 */
    const wall=new THREE.Mesh(new THREE.BoxGeometry(16,7.5,3.5),M.wall);
    wall.position.set(Math.cos(a)*wallR,3.75,Math.sin(a)*wallR);
    wall.rotation.y=a+Math.PI/2; wall.castShadow=true; root.add(wall);
    /* 墙基 */
    const base=new THREE.Mesh(new THREE.BoxGeometry(16.5,1.5,4.5),M.wallDark);
    base.position.set(Math.cos(a)*wallR,.75,Math.sin(a)*wallR);
    base.rotation.y=a+Math.PI/2; root.add(base);
    /* 垛口 */
    for(let k=0;k<3;k++){
      const crenel=new THREE.Mesh(new THREE.BoxGeometry(2.5,1.2,1.2),M.wallDark);
      crenel.position.set(Math.cos(a)*(wallR+1.5),7.5+Math.sin(k)*.1,Math.sin(a)*(wallR+1.5));
      const ang=a+Math.PI/2;
      crenel.position.x+=Math.cos(a)*1.5+Math.cos(ang)*(k-1)*2.8;
      crenel.position.z+=Math.sin(a)*1.5+Math.sin(ang)*(k-1)*2.8;
      root.add(crenel);
    }
    /* 墙头火盆 */
    if(i%2===0){
      const brazier=new THREE.Mesh(new THREE.CylinderGeometry(.5,.6,.8,6),M.wallDark);
      brazier.position.set(Math.cos(a)*(wallR+1.5),7.8,Math.sin(a)*(wallR+1.5));
      root.add(brazier);
      const flame=new THREE.Mesh(new THREE.ConeGeometry(.4,.9,6),
        new THREE.MeshBasicMaterial({color:0xff8030,transparent:true,opacity:.85,depthWrite:false}));
      flame.position.set(Math.cos(a)*(wallR+1.5),8.3,Math.sin(a)*(wallR+1.5));
      root.add(flame);
    }
  }

  /* ===== 南北城门 ===== */
  const gateS=_buildOrgGate(ORG_PORTAL_S,T("zone.durotar"),"赭岩谷 · 南门","1.,.55,.22",".7,.18,.04");
  root.add(gateS.g); orgPortalUniS=gateS.uni;
  const gateN=_buildOrgGate(ORG_PORTAL_N,T("zone.blackrock"),"黑石山 · Lv.14+","1.,.45,.15",".55,.08,.02");
  root.add(gateN.g); orgPortalUniN=gateN.uni;

  /* ===== 中央大道（龙骨街 The Drag）—— 从南门到北门 ===== */
  const dragMat=MAT.get("dirt.org_drag",{color:0x5a2010,roughness:1});
  for(let i=0;i<24;i++){
    const t=i/23;
    const z=ORG_PORTAL_S.z*(1-t)+ORG_PORTAL_N.z*t;
    const seg=new THREE.Mesh(new THREE.CircleGeometry(3.6,10),dragMat);
    seg.rotation.x=-Math.PI/2;
    seg.position.set(Math.sin(i*.35)*1.8,.04,z*.92);
    seg.receiveShadow=true; root.add(seg);
  }

  /* ===== 区划布局 =====
     坐标体系：X轴东西，Z轴南北
     - 南门 → 力量谷（入口广场）→ 龙骨街 → 格罗玛什堡（北端）
     - 西区：灵魂谷（暗影裂隙）
     - 东区：智慧谷（荣誉谷）
  */

  /* ---- 1. 力量谷（入口广场，南门内侧） ---- */
  const valleyZ=ORGRIMMAR_R-55;
  /* 广场地面 */
  const plaza=new THREE.Mesh(new THREE.CircleGeometry(22,20),M.floor);
  plaza.rotation.x=-Math.PI/2; plaza.position.set(0,.05,valleyZ); root.add(plaza);
  /* 入口双塔 */
  [-12,12].forEach(sx=>{
    root.add(_orgPillar(sx,0,valleyZ,8,1.2));
    const top=new THREE.Mesh(new THREE.ConeGeometry(1.4,.8,6),M.roofDark);
    top.position.set(sx,8.4,valleyZ); root.add(top);
    root.add(_orgLantern(sx,7,valleyZ));
    root.add(_orgBanner(sx,6,valleyZ,0));
  });
  /* 拱门横梁 */
  const archBeam=new THREE.Mesh(new THREE.BoxGeometry(26,1.2,1.5),M.wallDark);
  archBeam.position.set(0,7.5,valleyZ); root.add(archBeam);
  /* 力量谷两侧建筑 */
  for(const sx of [-1,1]){
    const bx=sx*18;
    placeProp(root,buildLonghouse({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),bx,0,valleyZ-6,0);
    placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),bx+8,0,valleyZ-4,sx*.2);
    placeProp(root,buildWatchtower({wood:P.wood,woodD:P.woodD,flag:P.flag,size:1}),bx-10,0,valleyZ-8,sx*.3);
    placeProp(root,buildLanternPole({wood:0x4a3020,size:1}),bx+4,0,valleyZ-10,0);
  }

  /* ---- 2. 龙骨街（中央商业街，从力量谷向北延伸） ---- */
  for(let i=0;i<6;i++){
    const z=valleyZ-30-i*14;
    /* 两侧摊位 */
    [-14,14].forEach(sx=>{
      placeProp(root,buildMarketStall({wood:P.wood,woodD:P.woodD,cloth:0xc02810,size:1}),sx,0,z,i%2?.2:-.2);
      placeProp(root,buildLanternPole({wood:0x4a3020,size:1}),sx+6,0,z,0);
    });
    /* 街边火盆 */
    if(i%2===0){
      [-8,8].forEach(sx=>{
        const brazier=new THREE.Mesh(new THREE.CylinderGeometry(.4,.5,.6,6),M.wallDark);
        brazier.position.set(sx,0,z); root.add(brazier);
        const flame=new THREE.Mesh(new THREE.ConeGeometry(.35,.8,6),
          new THREE.MeshBasicMaterial({color:0xff8030,transparent:true,opacity:.85,depthWrite:false}));
        flame.position.set(sx,.65,z); root.add(flame);
      });
    }
  }

  /* ---- 3. 西区 · 灵魂谷（暗影裂隙，部落精神领袖区） ---- */
  const spiritZ=valleyZ-40;
  for(let i=0;i<3;i++){
    const z=spiritZ-i*16;
    const sx=-22;
    placeProp(root,buildTent({hide:0x8a3020,stake:P.stake,size:1}),sx,0,z,.2);
    placeProp(root,buildTent({hide:0x6a2010,stake:P.stake,size:1}),sx+14,0,z-4,-.3);
    placeProp(root,buildTotem({wood:P.woodD,paintA:0x8a2010,paintB:0x6a1008,size:1}),sx+7,0,z-2,0);
  }
  /* 灵魂医者 */
  orgSpirit=buildSpiritHealer();
  orgSpirit.position.set(-22,0,spiritZ-28); orgSpirit.rotation.y=.5; root.add(orgSpirit);
  const spLab=makeNameplate("灵魂医者 · 烬语",BAL.npcLevel.spirit,{w:3.8,friendly:true,color:"#a8d8ff",glow:"rgba(40,80,120,.9)"});
  spLab.position.set(-22,3.85,spiritZ-28); root.add(spLab);
  updateNameplateHp(spLab,1,1);
  placeProp(root,buildGraveyard({size:1}),-20,0,spiritZ-16,0);
  if(typeof registerGraveyard==="function")registerGraveyard("orgrimmar",-20,spiritZ-16,"camp");

  /* 暗影裂隙入口（地穴） */
  const cleft=new THREE.Mesh(new THREE.CylinderGeometry(3.5,4.5,2,8),M.wallDark);
  cleft.position.set(-28,0,spiritZ-12); root.add(cleft);
  const cleftGlow=new THREE.Mesh(new THREE.CircleGeometry(2.8,16),
    new THREE.MeshBasicMaterial({color:0x440066,transparent:true,opacity:.35,side:THREE.DoubleSide}));
  cleftGlow.rotation.x=-Math.PI/2; cleftGlow.position.set(-28,.1,spiritZ-12); root.add(cleftGlow);

  /* ---- 4. 东区 · 智慧谷（训练场） ---- */
  const wisdomZ=valleyZ-40;
  for(let i=0;i<3;i++){
    const z=wisdomZ-i*16;
    const sx=22;
    placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),sx,0,z,.3);
    placeProp(root,buildHut({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),sx+16,0,z-2,-.2);
    placeProp(root,buildTrainingDummy({wood:0x4a3020,size:1}),sx+8,0,z-6,0);
    placeProp(root,buildTrainingDummy({wood:0x4a3020,size:1}),sx+8,0,z-9,0);
  }
  /* 磨坊（风车） */
  placeProp(root,buildWindmill({wood:P.wood,woodD:P.woodD,roof:P.roof,size:1}),30,0,wisdomZ-50,0);

  /* ---- 5. 格罗玛什堡（北端，大酋长驻地） ---- */
  const fortZ=ORGRIMMAR_R-150;
  /* 堡垒地基 */
  const fortBase=new THREE.Mesh(new THREE.BoxGeometry(28,2.5,20),M.wallDark);
  fortBase.position.set(0,1.25,fortZ); fortBase.castShadow=true; root.add(fortBase);
  /* 主殿 */
  const keep=new THREE.Mesh(new THREE.BoxGeometry(20,8,14),M.wall);
  keep.position.set(0,6.5,fortZ); keep.castShadow=true; root.add(keep);
  /* 屋顶 */
  const keepRoof=new THREE.Mesh(new THREE.ConeGeometry(12,4.5,6),M.roof);
  keepRoof.position.set(0,12.75,fortZ); root.add(keepRoof);
  const keepSpike=new THREE.Mesh(new THREE.ConeGeometry(.15,2.0,5),M.bone);
  keepSpike.position.set(0,15.0,fortZ); root.add(keepSpike);
  /* 堡垒翼楼 */
  [-12,12].forEach(sx=>{
    const wing=new THREE.Mesh(new THREE.BoxGeometry(8,6,10),M.wall);
    wing.position.set(sx,5,fortZ); wing.castShadow=true; root.add(wing);
    const wingRoof=new THREE.Mesh(new THREE.ConeGeometry(5,2.5,6),M.roof);
    wingRoof.position.set(sx,9.25,fortZ); root.add(wingRoof);
    root.add(_orgBanner(sx,5,fortZ+5,0));
    root.add(_orgLantern(sx,6,fortZ-5));
  });
  /* 堡垒大门 */
  const gatePillarL=new THREE.Mesh(new THREE.BoxGeometry(1.2,5,1.2),M.wallDark);
  gatePillarL.position.set(-3,2.5,fortZ+10.1); root.add(gatePillarL);
  const gatePillarR=new THREE.Mesh(new THREE.BoxGeometry(1.2,5,1.2),M.wallDark);
  gatePillarR.position.set(3,2.5,fortZ+10.1); root.add(gatePillarR);
  const gateArch=new THREE.Mesh(new THREE.BoxGeometry(7.5,.6,1.2),M.wallTrim);
  gateArch.position.set(0,5.5,fortZ+10.1); root.add(gateArch);
  /* 大门前广场 */
  const court=new THREE.Mesh(new THREE.CircleGeometry(18,20),M.floor);
  court.rotation.x=-Math.PI/2; court.position.set(0,.05,fortZ+18); root.add(court);
  /* 前广场营火 */
  const fortFire=placeProp(root,buildCampfire({flame:0xffa040,light:0xff8030,size:1.2}),0,0,fortZ+18,0);
  if(fortFire&&fortFire.userData.flame)orgFlames.push(fortFire);

  /* 大酋长 · 石拳 */
  orgThrall=buildElder();
  if(typeof tintNpcCloth==="function")tintNpcCloth(orgThrall,0x8a2010);
  orgThrall.position.set(0,0,fortZ+2); orgThrall.rotation.y=Math.PI; root.add(orgThrall);
  const thrallLab=makeNameplate("大酋长 · 石拳",BAL.npcLevel.thrall||45,{w:4.2,friendly:true,color:"#ffb070"});
  thrallLab.position.set(0,3.85,fortZ+2); root.add(thrallLab);
  updateNameplateHp(thrallLab,1,1);

  /* ---- 6. 其他建筑散布 ---- */
  /* 巨魔帐篷区（西侧偏北） */
  for(let i=0;i<4;i++){
    const a=-.8+i*.4;
    const r=28;
    const x=Math.cos(a)*r-10, z=Math.sin(a)*r+fortZ+20;
    placeProp(root,buildTent({hide:0x7a3820,stake:P.stake,size:1}),x,0,z,a);
    placeProp(root,buildTotem({wood:P.woodD,paintA:0x8a5020,paintB:0xaa6030,size:1}),x+8,0,z-2,0);
  }
  /* 兽栏 */
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:16,posts:7}),18,0,fortZ+26,0);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:16,posts:7}),18,0,fortZ+38,0);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:14,posts:6}),12,0,fortZ+32,Math.PI/2);
  placeProp(root,buildFence({wood:P.wood,woodD:P.woodD,length:14,posts:6}),24,0,fortZ+32,Math.PI/2);
  placeProp(root,buildHaystack({color:0xd8b060,size:1}),18,0,fortZ+32,0);

  /* ---- 7. 军需官 + 银行家 ---- */
  orgVendor=buildVendor();
  orgVendor.position.set(-14,0,valleyZ-8); orgVendor.rotation.y=.4; root.add(orgVendor);
  const vendLab=makeNameplate("军需官 · 赤牙",BAL.npcLevel.org_vendor||28,{w:3.6,friendly:true,color:"#a8e8c0"});
  vendLab.position.set(-14,3.85,valleyZ-8); root.add(vendLab);
  updateNameplateHp(vendLab,1,1);

  /* 银行家 */
  orgBanker=buildElder();
  if(typeof tintNpcCloth==="function")tintNpcCloth(orgBanker,0x2a5a4a);
  orgBanker.position.set(14,0,valleyZ-6); orgBanker.rotation.y=-.3; root.add(orgBanker);
  const bankLab=makeNameplate("银行家 · 铁柜",BAL.npcLevel.org_vendor||25,{w:3.6,friendly:true,color:"#ffd070"});
  bankLab.position.set(14,3.85,valleyZ-6); root.add(bankLab);
  updateNameplateHp(bankLab,1,1);

  /* ---- 8. 飞行管理员（双足飞龙） ---- */
  const flightPos=new THREE.Vector3(0,0,fortZ-30);
  orgFlight=buildElder();
  if(typeof tintNpcCloth==="function")tintNpcCloth(orgFlight,0x2a5a3a);
  orgFlight.position.copy(flightPos); orgFlight.rotation.y=.6; root.add(orgFlight);
  const flightLab=makeNameplate("飞行管理员 · 风翼",BAL.npcLevel.org_vendor||30,{w:3.8,friendly:true,color:"#a8ffc0"});
  flightLab.position.set(flightPos.x,3.85,flightPos.z); root.add(flightLab);
  updateNameplateHp(flightLab,1,1);
  /* 双足飞龙栖架 */
  const perch=new THREE.Mesh(new THREE.CylinderGeometry(1.5,2.0,1.5,8),M.wallDark);
  perch.position.set(flightPos.x+6,.75,flightPos.z); root.add(perch);

  /* ---- 9. 装饰散布 ---- */
  /* 灯笼杆沿主街 */
  for(let i=0;i<5;i++){
    const z=valleyZ-8-i*16;
    placeProp(root,buildLanternPole({wood:0x4a3020,size:1}),-6,0,z,0);
    placeProp(root,buildLanternPole({wood:0x4a3020,size:1}),6,0,z,0);
  }
  /* 货箱 */
  placeProp(root,buildCratePile({wood:P.wood,woodD:P.woodD,size:1}),-8,0,valleyZ-12,0);
  placeProp(root,buildCratePile({wood:P.wood,woodD:P.woodD,size:1}),10,0,valleyZ-14,0);
  /* 旗帜 */
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2;
    const r=wallR-6;
    root.add(_orgBanner(Math.cos(a)*r,3,Math.sin(a)*r,a));
  }
  /* 路牌 */
  placeProp(root,buildSignpost({wood:0x4a3020,size:1}),0,0,valleyZ-4,0);

  /* ---- 10. 营火（散布全城） ---- */
  const firePositions=[
    [0,valleyZ-6],[ -12,valleyZ-20],[12,valleyZ-22],
    [-8,fortZ+10],[8,fortZ+12],[0,ORGRIMMAR_R-100],
    [-20,spiritZ-8],[24,wisdomZ-6],
  ];
  for(let i=0;i<firePositions.length;i++){
    const [x,z]=firePositions[i];
    const cf=placeProp(root,buildCampfire({
      flame:i%2?0xff8030:0xffa040, light:0xff6020, size:1,
    }),x,0,z,0);
    if(cf)orgFlames.push(cf);
  }

  /* ---- 11. 任务标记 ---- */
  const _npcMy=(BAL.npc&&BAL.npc.markerY)||6.55;
  orgMarkerExcl=makeQuestMark("offer");
  orgMarkerExcl.position.set(0,_npcMy,fortZ+2); root.add(orgMarkerExcl);
  orgMarkerExclGrey=makeQuestMark("low");
  orgMarkerExclGrey.position.copy(orgMarkerExcl.position); orgMarkerExclGrey.visible=false; root.add(orgMarkerExclGrey);
  orgMarkerQ=makeQuestMark("turnin");
  orgMarkerQ.position.copy(orgMarkerExcl.position); orgMarkerQ.visible=false; root.add(orgMarkerQ);

  /* ---- 12. 采集点 ---- */
  if(typeof spawnGatherNodesForZone==="function"){
    spawnGatherNodesForZone("orgrimmar",root,{
      radius:ORGRIMMAR_R,
      camp:{x:0,z:0},
      portals:[{x:ORG_PORTAL_S.x,z:ORG_PORTAL_S.z},{x:ORG_PORTAL_N.x,z:ORG_PORTAL_N.z}],
    });
  }
  updateOrgrimmarMarkers();
  const z=ZONES.orgrimmar;
  if(z)z.lights={heli:orgHeli,sun:orgSun,flames:orgFlames};
}

function updateOrgrimmarMarkers(){
  if(!orgMarkerExcl)return;
  const m={npcId:"org_thrall",excl:orgMarkerExcl,exclGrey:orgMarkerExclGrey,q:orgMarkerQ};
  if(typeof applyNpcQuestMarkerVisual==="function"){applyNpcQuestMarkerVisual(m);return;}
  if(typeof npcHasQuestOffer==="function"){
    orgMarkerExcl.visible=npcHasQuestOffer("org_thrall");
    orgMarkerQ.visible=npcHasQuestTurnIn("org_thrall");
    return;
  }
  orgMarkerExcl.visible=false;
  orgMarkerQ.visible=false;
}
function orgThrallDist(){
  if(!orgThrall)return 999;
  return Math.hypot(player.position.x-orgThrall.position.x,player.position.z-orgThrall.position.z);
}
function orgSpiritDist(){
  if(!orgSpirit)return 999;
  return Math.hypot(player.position.x-orgSpirit.position.x,player.position.z-orgSpirit.position.z);
}
function orgVendorDist(){
  if(!orgVendor)return 999;
  return Math.hypot(player.position.x-orgVendor.position.x,player.position.z-orgVendor.position.z);
}

function openOrgrimmarThrallDialogue(){
  if(typeof closeVendorPanel==="function")closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  if(!tx||!bts)return;
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="⚔ 大酋长 · 石拳";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  tx.textContent="奥格瑞玛的红石城墙永不陷落。南门通往赭岩谷，北门通向黑石山——熔火之心的入口就在山腹。力量谷的军需官可以补给，智慧谷有训练场。";
  if(typeof appendNpcQuestButtons==="function")appendNpcQuestButtons("org_thrall",btn);
  btn("离开",closeDialogue);
}

function openOrgrimmarSpiritDialogue(){
  if(typeof closeVendorPanel==="function")closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="👻 灵魂医者 · 烬语";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  if(S.p.ghost){
    tx.textContent="主城的风带着炉火味。我能强行接引你——代价是虚弱。";
    btn("在此复活（虚弱）",()=>{if(typeof resurrectAtSpiritHealer==="function")resurrectAtSpiritHealer();});
    btn("我再想想",closeDialogue);
  }else{
    tx.textContent="灵魂谷的暗影簇拥着我。若你在黑石山倒下，释放灵魂后可回城找我。";
    btn("感谢您，医者",closeDialogue);
  }
}

function openOrgrimmarBankDialogue(){
  if(typeof closeVendorPanel==="function")closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  if(!tx||!bts)return;
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🪙 银行家 · 铁柜";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  tx.textContent="奥格瑞玛银行保管着部落勇士的财富。存取自由，无需利息。";
  btn("存入物品",()=>{if(typeof toggleBankPanel==="function")toggleBankPanel();else closeDialogue();});
  btn("离开",closeDialogue);
}

function openOrgrimmarFlightDialogue(){
  if(typeof closeVendorPanel==="function")closeVendorPanel();
  const dlg=$("#dlg"),tx=$("#dlgText"),bts=$("#dlgBtns");
  if(!tx||!bts)return;
  const nameEl=$("#dlg .dname");
  if(nameEl)nameEl.textContent="🦅 飞行管理员 · 风翼";
  dlg.style.display="block"; bts.innerHTML="";
  const btn=(t,fn)=>{const b=document.createElement("button");
    b.className="dbtn";b.textContent=t;b.onclick=fn;bts.appendChild(b);};
  tx.textContent="双足飞龙已备好鞍。南可达赭岩谷、枯原荒地，北可至黑石山。";
  btn("飞往赤蹄草甸",()=>{if(typeof enterZone==="function")enterZone("mulgore","from_orgrimmar");closeDialogue();});
  btn("飞往赭岩谷",()=>{if(typeof enterZone==="function")enterZone("durotar","from_orgrimmar");closeDialogue();});
  btn("飞往枯原荒地",()=>{if(typeof enterZone==="function")enterZone("barrens","from_orgrimmar");closeDialogue();});
  btn("下次再说",closeDialogue);
}

function tryInteractOrgrimmar(){
  if(typeof tryQuestGroundInteract==="function"&&tryQuestGroundInteract())return true;
  if(typeof pickNearestNpc!=="function")return false;
  const near=pickNearestNpc([
    {mesh:orgSpirit,open:openOrgrimmarSpiritDialogue},
    {mesh:orgThrall,open:openOrgrimmarThrallDialogue},
    {mesh:orgVendor,open:()=>openVendor("org_vendor","🏕️ 军需官 · 赤牙")},
    {mesh:orgBanker,open:openOrgrimmarBankDialogue},
    {mesh:orgFlight,open:openOrgrimmarFlightDialogue},
  ]);
  if(near){near.open();return true;}
  return false;
}

registerZone({
  id:"orgrimmar",
  name:T("zone.orgrimmar"),
  scene:sceneOrgrimmar,
  build:buildOrgrimmarZone,
  music:"orgrimmar",
  mode:"world",
  levelRange:[12,20],
  boundsR:()=>ORGRIMMAR_R,
  dayNight:true,
  gates:{
    from_durotar:{x:0,z:ORGRIMMAR_R-24},
    from_blackrock:{x:0,z:-(ORGRIMMAR_R-24)},
    valley:{x:0,z:0},
    spirit:{x:-22,z:-80},
    default:{x:0,z:0},
  },
  portals:[{
    id:"to_durotar_from_org",
    pos:()=>ORG_PORTAL_S,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:T("zone.durotar")+" · 赭岩哨站",
    logHint:"南门之外是灼热的赭岩谷……",
    requireAlive:true,
    autoEnter:true,
    targetZone:"durotar",
    targetGate:"from_orgrimmar",
  },{
    id:"to_blackrock",
    pos:()=>ORG_PORTAL_N,
    hintR:()=>BAL.zones.portalHintR,
    enterR:()=>BAL.zones.portalEnterR,
    announce:T("zone.blackrock")+" · 黑石山",
    logHint:"北门热浪扑面——黑石山通往炽心熔窟团本。",
    requireAlive:true,
    autoEnter:true,
    minLevel:()=>(BAL.blackrock&&BAL.blackrock.minLevel)||14,
    lockedAnnounce:()=>`等级不足！需要 Lv.${(BAL.blackrock&&BAL.blackrock.minLevel)||14}`,
    lockedLog:()=>`黑石山危机四伏——当前 Lv.${S.p.level}，升到 Lv.${(BAL.blackrock&&BAL.blackrock.minLevel)||14} 后再闯。`,
    targetZone:"blackrock",
    targetGate:"from_orgrimmar",
  }],
  lights:{heli:null,sun:null,flames:orgFlames},
  onEnter(fromId,gateId,opts){
    if(opts&&opts.silent)return;
    if(fromId==="durotar")log("鼓声与铁甲碰撞——你踏入"+T("zone.orgrimmar")+"的红石城门。","lg-sys");
    if(fromId==="blackrock")log("你离开黑石山的硫磺味，重回兽人主城。","lg-sys");
    updateOrgrimmarMarkers();
    if(typeof updateQuest==="function")updateQuest();
  },
  onLeave(){},
});

console.info("[orgrimmar] V3 就绪：奥格瑞玛 · 红石主城 · 6 区 + 城墙 + 5 NPC");