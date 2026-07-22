/* ============================================================
   熔火之心 · models.js
   ------------------------------------------------------------
   [依赖] THREE · core.js（rand）
   [导出] buildHumanoid buildWeapon setWeapon HUMANOIDS WEAPONS
          buildQuadruped buildScorpion buildHumanoidMob buildCentaur QUADS MOB_HUMANOIDS（STEP 5/18 族群工厂）
          buildPlayer buildMage buildArcher buildPriest buildBoss buildOnyxia buildElder buildVendor buildSpiritHealer
          tintNpcCloth
          buildBoar buildFlameSpawn
          buildHut buildTent buildFence buildWatchtower buildCampfire buildTotem buildMarketStall buildCratePile
          BUILD_PAL placeProp（plan-v1 · V1-A1）
   ------------------------------------------------------------
    3D 模型库（全部程序化几何体，零模型文件）
   STEP 4：人形基座 buildHumanoid(config)——躯干/四肢/头/披风 + 动画挂点，
   四职业收敛为 HUMANOIDS 数据配置；武器独立为 WEAPONS 配方表，
   武器组打 userData.weapon 标，换装时 setWeapon 只换武器组。
   加新职业 = 加一条 HUMANOIDS 配置；加新武器 = 加一条 WEAPONS 配方。
   城镇建筑（V1-A1）：工厂纯几何无随机；摆放由调用方用固定坐标或 srand。
   生物动画（V1-A3）：四足腿枢轴 / 人形肢挂点 / 奥妮翼挂点，由 anim.js 驱动。
   ============================================================ */
"use strict";
/* ============================================================
   通用几何 / 材质 / 部件工厂
   部件 spec：{g:几何名, a:参数数组, p:[x,y,z], r:[rx,ry,rz], m:材质名, flame:火焰标}
   材质 def ：{c:颜色, r:粗糙度, mt:金属度, e:自发光色, ei:强度, flat, ds:双面, basic, o:透明度}
   ============================================================ */
const GEO={
  box  :a=>new THREE.BoxGeometry(...a),
  cyl  :a=>new THREE.CylinderGeometry(...a),
  cone :a=>new THREE.ConeGeometry(...a),
  sph  :a=>new THREE.SphereGeometry(...a),
  dod  :a=>new THREE.DodecahedronGeometry(...a),
  ico  :a=>new THREE.IcosahedronGeometry(...a),
  oct  :a=>new THREE.OctahedronGeometry(...a),
  tor  :a=>new THREE.TorusGeometry(...a),
  plane:a=>new THREE.PlaneGeometry(...a),
};
function makeMats(defs){
  const out={};
  for(const k in defs){
    const d=defs[k];
    out[k]=d.basic
      ?new THREE.MeshBasicMaterial({color:d.c,transparent:d.o!==undefined,opacity:d.o??1})
      :new THREE.MeshStandardMaterial({color:d.c,roughness:d.r??.9,metalness:d.mt??0,
        emissive:d.e??0x000000,emissiveIntensity:d.ei??1,flatShading:!!d.flat,
        side:d.ds?THREE.DoubleSide:THREE.FrontSide});
  }
  return out;
}
function prim(spec,M){
  const mesh=new THREE.Mesh(GEO[spec.g](spec.a),M[spec.m]);
  if(spec.p)mesh.position.set(...spec.p);
  if(spec.r)mesh.rotation.set(...spec.r);
  if(spec.flame)mesh.userData.flame=true;
  return mesh;
}
function addParts(parent,list,M){for(const s of list)parent.add(prim(s,M));}

/* ============================================================
   武器配方表（独立于职业；userData.weapon 标记供换装）
   ============================================================ */
const WEAPONS={
  /* 长剑（战士默认） */
  sword:{mats:{gold:{c:0xd9a441,r:.3,mt:.9},
               blade:{c:0xcfd8e6,mt:.95,r:.15,e:0x334455,ei:.2}},
    parts:[
      {g:'cyl',a:[.05,.05,.3,6],m:'gold'},                       /* 剑柄 */
      {g:'box',a:[.3,.06,.1],p:[0,.16,0],m:'gold'},              /* 护手 */
      {g:'box',a:[.1,1.5,.03],p:[0,.95,0],m:'blade'},            /* 剑身 */
    ]},
  /* 奥术法杖（法师默认） */
  staff:{mats:{wood:{c:0x5a3a1a,r:.9},orb:{c:0x66ccff,basic:true},
               trim:{c:0xd9a441,r:.3,mt:.9}},
    parts:[
      {g:'cyl',a:[.05,.07,3,7],p:[0,.6,0],m:'wood'},             /* 杖杆 */
      {g:'ico',a:[.22,0],p:[0,2.2,0],m:'orb'},                   /* 奥术水晶 */
      {g:'tor',a:[.32,.03,6,14],p:[0,2.2,0],m:'trim'},           /* 金环 */
    ]},
  /* 长弓（弓箭手默认，挂左手） */
  bow:{mats:{wood:{c:0x6a4520,r:.85},feather:{c:0xd8d0b0,r:.9}},
    parts:[
      {g:'tor',a:[.85,.05,6,16,Math.PI],r:[0,0,Math.PI/2],m:'wood'},  /* 弓臂 */
      {g:'box',a:[.02,1.7,.02],m:'feather'},                          /* 弓弦 */
    ]},
  /* 萨弗拉斯之柄：燃烧巨锤（装备橙锤时替换手中武器组） */
  sulfuras:{mats:{
      rock:{c:0x241009,r:1,flat:true,e:0x992200,ei:.18},
      magma:{c:0x33130a,r:.85,flat:true,e:0xff3b00,ei:.55},
      core:{c:0xffd060,basic:true},
      fire:{c:0xffa030,basic:true,o:.92}},
    parts:[
      {g:'cyl',a:[.06,.09,1.7,7],p:[0,.55,0],m:'rock'},          /* 长柄 */
      {g:'box',a:[.85,.5,.5],p:[0,1.55,0],m:'magma'},            /* 锤头 */
      {g:'box',a:[.9,.14,.55],p:[0,1.55,0],m:'core'},            /* 熔纹 */
      {g:'cone',a:[.16,.5,5],p:[.55,1.55,0],r:[0,0,-Math.PI/2],m:'rock'},
      {g:'cone',a:[.16,.5,5],p:[-.55,1.55,0],r:[0,0,Math.PI/2],m:'rock'},
      {g:'cone',a:[.22,.6,6],p:[0,2,0],m:'fire',flame:true},     /* 锤顶火焰 */
      {g:'cone',a:[.13,.4,5],p:[.3,1.9,0],m:'fire',flame:true},
      {g:'cone',a:[.13,.4,5],p:[-.3,1.9,0],m:'fire',flame:true},
    ],
    light:{c:0xff6a20,i:.9,d:7,p:[0,1.6,0]}},                    /* 火光 */
  /* 牧杖（STEP 19 牧师默认）：木杆 + 金十字 + 圣光球 */
  crosier:{mats:{wood:{c:0x6a5030,r:.9},gold:{c:0xd4af37,r:.3,mt:.9},
                 orb:{c:0xfff0a0,basic:true}},
    parts:[
      {g:'cyl',a:[.045,.06,2.6,7],p:[0,.5,0],m:'wood'},
      {g:'box',a:[.08,.55,.08],p:[0,2.05,0],m:'gold'},
      {g:'box',a:[.42,.08,.08],p:[0,2.2,0],m:'gold'},
      {g:'sph',a:[.16,8,8],p:[0,2.45,0],m:'orb'},
    ],
    light:{c:0xffe080,i:.55,d:5,p:[0,2.4,0]}},
};
function buildWeapon(type){
  const cfg=WEAPONS[type]||WEAPONS.sword;
  const M=makeMats(cfg.mats);
  const w=new THREE.Group();
  addParts(w,cfg.parts,M);
  if(cfg.light){
    const l=new THREE.PointLight(cfg.light.c,cfg.light.i,cfg.light.d,1.8);
    l.position.set(...cfg.light.p); w.add(l);
  }
  w.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  w.userData.weapon=type;
  return w;
}

/* ============================================================
   四职业人形配置（纯数据；外观与重构前一致）
   ============================================================ */
const HUMANOIDS={
  /* ⚔️ 人类战士：板甲 + 头盔盔缨 + 剑盾 */
  warrior:{
    mats:{
      armor:{c:0x4a6a8a,r:.45,mt:.7}, armorDark:{c:0x2c3e50,r:.5,mt:.6},
      skin:{c:0xd8a37a,r:.8}, gold:{c:0xd9a441,r:.3,mt:.9},
      cloth:{c:0x7a1f1f,r:.9}, capeM:{c:0x8a1f1f,r:.9,ds:true},
    },
    parts:[
      {g:'box',a:[.95,1.1,.55],p:[0,1.65,0],m:'armor'},          /* 躯干 */
      {g:'box',a:[1,.18,.6],p:[0,1.12,0],m:'gold'},              /* 腰带 */
      {g:'box',a:[.85,.35,.5],p:[0,.92,0],m:'armorDark'},        /* 髋部 */
      {g:'box',a:[.5,.5,.48],p:[0,2.5,0],m:'skin'},              /* 头 */
      {g:'cyl',a:[.34,.36,.34,8],p:[0,2.72,0],m:'armor'},        /* 头盔 */
      {g:'cone',a:[.1,.5,6],p:[0,3.05,0],m:'cloth'},             /* 盔缨 */
      {g:'sph',a:[.32,8,6,0,6.28,0,1.7],p:[.62,2.18,0],m:'armor'},   /* 肩甲 */
      {g:'sph',a:[.32,8,6,0,6.28,0,1.7],p:[-.62,2.18,0],m:'armor'},
    ],
    arm:{x:.62,y:2.1,mesh:{g:'box',a:[.26,.85,.26],p:[0,-.42,0],m:'armorDark'}},
    armExtraL:[                                                   /* 盾牌 */
      {g:'cyl',a:[.5,.5,.09,8],p:[-.12,-.8,.15],r:[0,Math.PI/2,Math.PI/2],m:'armor'},
      {g:'sph',a:[.13,8,8],p:[-.18,-.8,.15],m:'gold'},
    ],
    leg:{x:.25,y:.9,mesh:{g:'box',a:[.3,.9,.3],p:[0,-.45,0],m:'armorDark'}},
    cape:{a:[.9,1.5],p:[0,1.6,-.32],rx:.12,m:'capeM'},
    weapon:'sword', weaponMount:'armR', weaponPos:[0,-.85,.1],
  },
  /* 🔮 人类法师：紫袍 + 尖顶帽 + 法杖法典 */
  mage:{
    mats:{
      robe:{c:0x3b2d78,r:.85}, robeDark:{c:0x241a4a,r:.9},
      trim:{c:0xd9a441,r:.3,mt:.9}, skin:{c:0xd8a37a,r:.8},
      book:{c:0x7a1f1f,r:.8}, capeM:{c:0x241a4a,r:.9,ds:true},
    },
    parts:[
      {g:'cyl',a:[.5,1,1.6,8],p:[0,1,0],m:'robe'},               /* 长袍下摆 */
      {g:'cyl',a:[.42,.5,1,8],p:[0,2.2,0],m:'robeDark'},         /* 胸襟 */
      {g:'cyl',a:[.52,.52,.12,8],p:[0,1.75,0],m:'trim'},         /* 束带 */
      {g:'box',a:[.46,.46,.44],p:[0,2.95,0],m:'skin'},           /* 头 */
      {g:'cyl',a:[.62,.66,.08,10],p:[0,3.2,0],m:'robe'},         /* 帽檐 */
      {g:'cone',a:[.36,1,9],p:[0,3.7,0],r:[0,0,.12],m:'robe'},   /* 尖顶帽 */
      {g:'oct',a:[.09,0],p:[.12,4.16,0],m:'trim'},               /* 帽顶星 */
      {g:'sph',a:[.26,8,6],p:[.55,2.6,0],m:'robeDark'},          /* 垫肩 */
      {g:'sph',a:[.26,8,6],p:[-.55,2.6,0],m:'robeDark'},
    ],
    arm:{x:.55,y:2.55,mesh:{g:'cyl',a:[.14,.2,.9,7],p:[0,-.45,0],m:'robe'}},
    armExtraL:[{g:'box',a:[.34,.44,.12],p:[-.05,-.95,.12],m:'book'}],  /* 法典 */
    leg:{x:.2,y:.6,mesh:null},                                   /* 长袍遮腿：空组占位 */
    cape:{a:[.95,1.9],p:[0,1.95,-.4],rx:.1,m:'capeM'},
    weapon:'staff', weaponMount:'armR', weaponPos:[.05,-.9,.15],
  },
  /* 🏹 精灵弓箭手：皮甲 + 兜帽 + 长弓箭袋 */
  archer:{
    mats:{
      leather:{c:0x4a6a2a,r:.85}, leatherD:{c:0x3a2a14,r:.9},
      skin:{c:0xe0b088,r:.8}, wood:{c:0x6a4520,r:.85},
      feather:{c:0xd8d0b0,r:.9}, capeM:{c:0x2d4a1a,r:.9,ds:true},
    },
    parts:[
      {g:'box',a:[.8,1.05,.48],p:[0,1.65,0],m:'leather'},        /* 躯干 */
      {g:'box',a:[.16,1.1,.52],p:[0,1.65,0],r:[0,0,.5],m:'leatherD'}, /* 背带 */
      {g:'box',a:[.86,.14,.52],p:[0,1.15,0],m:'leatherD'},       /* 腰带 */
      {g:'box',a:[.74,.32,.44],p:[0,.92,0],m:'leatherD'},        /* 髋部 */
      {g:'box',a:[.46,.46,.44],p:[0,2.45,0],m:'skin'},           /* 头 */
      {g:'cone',a:[.44,.75,8],p:[0,2.72,0],r:[-.18,0,0],m:'leather'}, /* 兜帽 */
      {g:'cyl',a:[.17,.14,.95,7],p:[-.24,1.95,-.42],r:[0,0,.35],m:'leatherD'}, /* 箭袋 */
      {g:'cyl',a:[.02,.02,.55,4],p:[-.36,2.5,-.44],r:[0,0,.35],m:'wood'},      /* 箭矢×3 */
      {g:'cyl',a:[.02,.02,.55,4],p:[-.27,2.5,-.44],r:[0,0,.35],m:'wood'},
      {g:'cyl',a:[.02,.02,.55,4],p:[-.18,2.5,-.44],r:[0,0,.35],m:'wood'},
      {g:'cone',a:[.06,.16,4],p:[-.45,2.76,-.44],m:'feather'},
      {g:'cone',a:[.06,.16,4],p:[-.36,2.76,-.44],m:'feather'},
      {g:'cone',a:[.06,.16,4],p:[-.27,2.76,-.44],m:'feather'},
    ],
    arm:{x:.55,y:2.1,mesh:{g:'box',a:[.22,.8,.22],p:[0,-.4,0],m:'leather'}},
    armExtraR:[{g:'cyl',a:[.025,.025,.8,4],p:[0,-.82,.2],r:[Math.PI/2,0,0],m:'wood'}], /* 搭箭 */
    leg:{x:.25,y:.9,mesh:{g:'box',a:[.28,.9,.28],p:[0,-.45,0],m:'leatherD'}},
    cape:{a:[.85,1.3],p:[0,1.7,-.3],rx:.12,m:'capeM'},
    weapon:'bow', weaponMount:'armL', weaponPos:[-.12,-.85,.18],
  },
  /* ✨ 人类牧师（STEP 19）：白金长袍 + 牧杖 */
  priest:{
    mats:{
      robe:{c:0xf0ece0,r:.85}, robeDark:{c:0xd8d0c0,r:.9},
      trim:{c:0xd4af37,r:.3,mt:.9}, skin:{c:0xd8a37a,r:.8},
      book:{c:0xc9a06a,r:.8}, capeM:{c:0xe8e0d0,r:.9,ds:true},
    },
    parts:[
      {g:'cyl',a:[.5,1,1.6,8],p:[0,1,0],m:'robe'},
      {g:'cyl',a:[.42,.5,1,8],p:[0,2.2,0],m:'robeDark'},
      {g:'cyl',a:[.52,.52,.12,8],p:[0,1.75,0],m:'trim'},
      {g:'box',a:[.46,.46,.44],p:[0,2.95,0],m:'skin'},
      {g:'cyl',a:[.28,.3,.2,8],p:[0,3.22,0],m:'robe'},           /* 头巾 */
      {g:'oct',a:[.12,0],p:[0,2.35,.32],m:'trim'},               /* 胸前圣印 */
      {g:'sph',a:[.24,8,6],p:[.52,2.55,0],m:'robeDark'},
      {g:'sph',a:[.24,8,6],p:[-.52,2.55,0],m:'robeDark'},
    ],
    arm:{x:.55,y:2.5,mesh:{g:'cyl',a:[.13,.18,.88,7],p:[0,-.44,0],m:'robe'}},
    armExtraL:[{g:'box',a:[.3,.4,.1],p:[-.05,-.9,.12],m:'book'}],  /* 圣契 */
    leg:{x:.2,y:.6,mesh:null},
    cape:{a:[.95,1.85],p:[0,1.9,-.38],rx:.1,m:'capeM'},
    weapon:'crosier', weaponMount:'armR', weaponPos:[.05,-.85,.15],
  },
};

/* ============================================================
   人形基座：躯干/四肢/头/披风 + 动画挂点（armR/armL/legR/legL/cape）
   ============================================================ */
function buildHumanoid(cfg){
  const g=new THREE.Group();
  const M=makeMats(cfg.mats);
  addParts(g,cfg.parts,M);
  /* 手臂挂点 */
  const armR=new THREE.Group(); armR.position.set(cfg.arm.x,cfg.arm.y,0);
  const armL=new THREE.Group(); armL.position.set(-cfg.arm.x,cfg.arm.y,0);
  if(cfg.arm.mesh){armR.add(prim(cfg.arm.mesh,M));armL.add(prim(cfg.arm.mesh,M));}
  if(cfg.armExtraR)addParts(armR,cfg.armExtraR,M);
  if(cfg.armExtraL)addParts(armL,cfg.armExtraL,M);
  g.add(armR); g.add(armL);
  /* 腿部挂点（mesh 为 null 时是长袍遮腿的空组占位） */
  const legR=new THREE.Group(); legR.position.set(cfg.leg.x,cfg.leg.y,0);
  const legL=new THREE.Group(); legL.position.set(-cfg.leg.x,cfg.leg.y,0);
  if(cfg.leg.mesh){legR.add(prim(cfg.leg.mesh,M));legL.add(prim(cfg.leg.mesh,M));}
  g.add(legR); g.add(legL);
  /* 披风 */
  const cape=new THREE.Mesh(GEO.plane(cfg.cape.a),M[cfg.cape.m]);
  cape.position.set(...cfg.cape.p); cape.rotation.x=cfg.cape.rx; g.add(cape);
  /* 武器组：userData.weapon 标记，换装时 setWeapon 只换这一组 */
  const mount=cfg.weaponMount==='armL'?armL:armR;
  const w=buildWeapon(cfg.weapon); w.position.set(...cfg.weaponPos); mount.add(w);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData={armR,armL,legR,legL,cape,
    weaponMount:mount,weaponPos:cfg.weaponPos,defaultWeapon:cfg.weapon,
    kind:"humanoid", anim:{state:"idle",walkPhase:0,attackAnim:0,deathRoll:0}};
  return g;
}
/* 换武器：移除挂点上带 userData.weapon 标的组，装上新武器（STEP 4 装备栏调用） */
function setWeapon(hum,type){
  const U=hum.userData, mount=U.weaponMount;
  for(let i=mount.children.length-1;i>=0;i--)
    if(mount.children[i].userData.weapon)mount.remove(mount.children[i]);
  const w=buildWeapon(type); w.position.set(...U.weaponPos); mount.add(w);
}

/* 四职业构建：一条配置一职业（CLASSES.build 消费） */
function buildPlayer(){return buildHumanoid(HUMANOIDS.warrior);}
function buildMage(){return buildHumanoid(HUMANOIDS.mage);}
function buildArcher(){return buildHumanoid(HUMANOIDS.archer);}
function buildPriest(){return buildHumanoid(HUMANOIDS.priest);}

/* ============================================================
   Boss 模型：炎魔领主（岩浆巨人，程序化原创低模）
   ============================================================ */
function buildBoss(){
  const g=new THREE.Group();
  const magma=new THREE.MeshStandardMaterial({color:0x33130a,roughness:.85,flatShading:true,
    emissive:0xff3b00,emissiveIntensity:.55});
  const rock=new THREE.MeshStandardMaterial({color:0x241009,roughness:1,flatShading:true,
    emissive:0x992200,emissiveIntensity:.18});
  const fireMat=new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.92});
  const coreMat=new THREE.MeshBasicMaterial({color:0xffd060});

  /* 熔岩基座（Boss 从岩浆中升起，无腿） */
  const base=new THREE.Mesh(new THREE.CylinderGeometry(4.2,6.5,3,10),rock);
  base.position.y=1.2; g.add(base);
  const lavaSkirt=new THREE.Mesh(new THREE.CylinderGeometry(5,7.4,1,12),magma);
  lavaSkirt.position.y=.2; g.add(lavaSkirt);

  /* 躯干：巨大岩浆胸膛 */
  const torso=new THREE.Mesh(new THREE.DodecahedronGeometry(4.4,0),magma);
  torso.scale.set(1.15,1.25,.95); torso.position.y=7.4; g.add(torso);
  /* 胸口熔核 */
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(1.15,0),coreMat);
  core.position.set(0,7.9,3.2); g.add(core);

  /* 肩部巨岩 */
  const shL=new THREE.Mesh(new THREE.DodecahedronGeometry(2.5,0),rock); shL.position.set(-5.6,10.6,0); g.add(shL);
  const shR=new THREE.Mesh(new THREE.DodecahedronGeometry(2.5,0),rock); shR.position.set(5.6,10.6,0); g.add(shR);
  /* 肩头火焰 */
  [[-5.6,12.6],[5.6,12.6]].forEach(([x,y])=>{
    const f=new THREE.Mesh(new THREE.ConeGeometry(1.2,2.8,7),fireMat); f.position.set(x,y,0);
    f.userData.flame=true; g.add(f);
    const f2=new THREE.Mesh(new THREE.ConeGeometry(.7,1.8,6),coreMat); f2.position.set(x,y+.3,0);
    f2.userData.flame=true; g.add(f2);
  });

  /* 头颅 + 燃烧王冠 */
  const head=new THREE.Mesh(new THREE.DodecahedronGeometry(1.7,0),magma);
  head.scale.set(1,1.15,.9); head.position.y=12.6; g.add(head);
  for(let i=0;i<7;i++){
    const a=(i/7)*Math.PI*1.9-Math.PI*.95;
    const h=i===3?3.4:rand(1.6,2.5);
    const spike=new THREE.Mesh(new THREE.ConeGeometry(.42,h,5),fireMat);
    spike.position.set(Math.sin(a)*1.5,13.6+h*.35,Math.cos(a)*.5-.3);
    spike.rotation.z=-Math.sin(a)*.5; spike.userData.flame=true; g.add(spike);
  }
  /* 双眼 */
  [[-.6],[.6]].forEach(([x])=>{
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.3,8,8),coreMat);
    eye.position.set(x,12.8,1.5); g.add(eye);
  });

  /* 左臂（张开的巨掌） */
  const armL=new THREE.Group(); armL.position.set(-5.6,10.2,0);
  const lArm=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.5,5.5,7),magma);
  lArm.position.set(-1.2,-3,0); lArm.rotation.z=.4; armL.add(lArm);
  const lHand=new THREE.Mesh(new THREE.DodecahedronGeometry(1.6,0),rock);
  lHand.position.set(-2.5,-5.6,0); armL.add(lHand);
  for(let i=0;i<4;i++){
    const claw=new THREE.Mesh(new THREE.ConeGeometry(.35,1.6,5),rock);
    claw.position.set(-2.5+(i-1.5)*.7,-6.8,.4); claw.rotation.x=2.9; armL.add(claw);
  }
  g.add(armL);

  /* 右臂 + 烈焰巨锤 */
  const armR=new THREE.Group(); armR.position.set(5.6,10.2,0);
  const rArm=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.5,5.5,7),magma);
  rArm.position.set(1.2,-3,0); rArm.rotation.z=-.4; armR.add(rArm);
  const rHand=new THREE.Mesh(new THREE.DodecahedronGeometry(1.5,0),rock);
  rHand.position.set(2.5,-5.6,0); armR.add(rHand);
  const hammer=new THREE.Group(); hammer.position.set(2.5,-5.6,0);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.35,.45,9,7),rock);
  handle.position.y=3.4; hammer.add(handle);
  const hHead=new THREE.Mesh(new THREE.BoxGeometry(4.6,2.6,2.6),magma);
  hHead.position.y=8.2; hammer.add(hHead);
  const hGlow=new THREE.Mesh(new THREE.BoxGeometry(4.9,.7,2.9),coreMat);
  hGlow.position.y=8.2; hammer.add(hGlow);
  [[-2.6,1],[2.6,1]].forEach(([x])=>{
    const sp=new THREE.Mesh(new THREE.ConeGeometry(.8,2,5),rock);
    sp.position.set(x,8.2,0); sp.rotation.z=x>0?-Math.PI/2:Math.PI/2; hammer.add(sp);
  });
  armR.add(hammer); g.add(armR);

  const bossLight=new THREE.PointLight(0xff6a20,2.2,60,1.8);
  bossLight.position.set(0,10,4); g.add(bossLight);

  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData={armR,armL,core,bossLight};
  return g;
}

/* ============================================================
   奥妮克希亚（STEP 28）：黑龙女王 · 程序化龙形低模
   ============================================================ */
function buildOnyxia(){
  const g=new THREE.Group();
  const scale=new THREE.MeshStandardMaterial({color:0x1a1a22,roughness:.75,flatShading:true,
    emissive:0x220808,emissiveIntensity:.25});
  const scaleD=new THREE.MeshStandardMaterial({color:0x0c0c12,roughness:.9,flatShading:true});
  const belly=new THREE.MeshStandardMaterial({color:0x3a2820,roughness:.85,flatShading:true,
    emissive:0x661a00,emissiveIntensity:.2});
  const horn=new THREE.MeshStandardMaterial({color:0xc8b090,roughness:.55,metalness:.2});
  const eye=new THREE.MeshBasicMaterial({color:0xff4400});

  const body=new THREE.Mesh(new THREE.BoxGeometry(2.8,2.2,5.2),scale);
  body.position.set(0,2.4,0); g.add(body);
  const under=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.2,4.4),belly);
  under.position.set(0,1.5,0); g.add(under);

  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.55,.75,2.4,6),scale);
  neck.position.set(0,3.4,2.8); neck.rotation.x=-.55; g.add(neck);
  const head=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.1,1.8),scaleD);
  head.position.set(0,4.2,4.1); g.add(head);
  const snout=new THREE.Mesh(new THREE.BoxGeometry(.9,.55,1.1),belly);
  snout.position.set(0,3.85,5.1); g.add(snout);
  [-1,1].forEach(s=>{
    const h=new THREE.Mesh(new THREE.ConeGeometry(.14,.7,5),horn);
    h.position.set(s*.4,5.0,3.7); h.rotation.x=-.35; g.add(h);
    const e=new THREE.Mesh(new THREE.SphereGeometry(.12,6,6),eye);
    e.position.set(s*.45,4.45,4.7); g.add(e);
  });

  [-1,1].forEach(s=>{
    const wingG=new THREE.Group();
    wingG.position.set(s*2.8,3.6,.2);
    const wing=new THREE.Mesh(new THREE.PlaneGeometry(5.5,2.8),
      new THREE.MeshStandardMaterial({color:0x14141c,roughness:.95,side:THREE.DoubleSide,
        emissive:0x180404,emissiveIntensity:.15}));
    wing.rotation.y=s*.55; wing.rotation.z=s*.35; wingG.add(wing);
    const bone=new THREE.Mesh(new THREE.CylinderGeometry(.08,.05,4.8,5),horn);
    bone.position.set(s*-.6,.3,-.1); bone.rotation.z=s*1.15; bone.rotation.y=s*.2; wingG.add(bone);
    g.add(wingG);
    if(s<0)g.userData.wingL=wingG; else g.userData.wingR=wingG;
  });

  [-1,1].forEach(s=>{
    [[1.4],[-1.5]].forEach(([dz])=>{
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(.28,.22,1.6,5),scaleD);
      leg.position.set(s*.9,.85,dz); g.add(leg);
      const claw=new THREE.Mesh(new THREE.ConeGeometry(.12,.35,4),horn);
      claw.position.set(s*.9,.15,dz+.25); claw.rotation.x=1.2; g.add(claw);
    });
  });

  const tail=new THREE.Mesh(new THREE.CylinderGeometry(.35,.08,4.5,6),scale);
  tail.position.set(0,2.2,-4.2); tail.rotation.x=.85; g.add(tail);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.35,.8,5),scaleD);
  tip.position.set(0,4.0,-5.8); tip.rotation.x=.5; g.add(tip);

  g.scale.setScalar(1.85);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.kind="dragon";
  g.userData.anim={state:"idle",walkPhase:0,attackAnim:0,deathRoll:0};
  return g;
}

/* ---------------- 烈焰之子（小怪） ---------------- */
function buildFlameSpawn(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.DodecahedronGeometry(.85,0),
    new THREE.MeshStandardMaterial({color:0x3a1408,flatShading:true,emissive:0xff4400,emissiveIntensity:.7}));
  body.position.y=1; g.add(body);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.6,1.6,6),
    new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.9}));
  flame.position.y=2.1; flame.userData.flame=true; g.add(flame);
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.16,6,6),new THREE.MeshBasicMaterial({color:0xffe080}));
  eye.position.set(0,1.15,.75); g.add(eye);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return g;
}

/* ============================================================
   族群工厂（STEP 5，参考 WoC 生物族群模板）
   四足兽 buildQuadruped / 人形怪 buildHumanoidMob
   加新怪 = 一条配方（QUADS / MOB_HUMANOIDS）+ 一条数值，不改工厂本体
   ============================================================ */
const QUADS={
  /* 草原野猪 */
  boar    :{fur:0x6a4a2e,furD:0x45311e,accent:0x8a6040,tusks:true,mane:true,ears:true,tail:'up',style:"boar"},
  /* 草原狼：灰毛长吻，蓬尾 */
  wolf    :{fur:0x7a7a82,furD:0x4a4a52,accent:0x9a9aa2,snoutLong:true,ears:true,mane:true,tail:'bushy',style:"wolf"},
  /* 陆行鸟：双足长颈，喙 + 冠羽 + 扇尾 */
  bird    :{fur:0xd8b060,furD:0xa87830,accent:0xf0d080,legs:2,neck:1.15,beak:true,crest:true,tail:'plume',style:"bird"},
  /* 老灰鬃野猪王：巨型灰鬃野猪（稀有精英） */
  boarKing:{fur:0x8a8578,furD:0x55524a,accent:0xb0a898,tusks:true,tuskBig:true,mane:true,ears:true,tail:'up',size:2.15,style:"boar"},
  /* 玛格曼达：巨型熔岩猎犬（STEP 9c） */
  magmadar:{fur:0x8a2208,furD:0x3a1008,accent:0xff6020,tusks:true,tuskBig:true,mane:true,ears:true,tail:'bushy',size:5.1,style:"wolf",glow:0xff4400},
  /* —— STEP 18 贫瘠之地 —— */
  zebra   :{fur:0xe8e0d0,furD:0x2a2820,accent:0xf5f0e8,ears:true,mane:true,tail:'bushy',size:1.05,style:"zebra",stripes:true},
  quilboar:{fur:0xc4783a,furD:0x8a5020,accent:0xe09850,tusks:true,mane:true,ears:true,tail:'up',size:1.15,quills:true,style:"boar"},
  /* —— V1-B1 赭岩谷 —— */
  scorp   :{fur:0xc87828,furD:0x5a3010,accent:0xe09040,size:1.1,style:"scorp",scorpion:true},
  razorback:{fur:0x8a4020,furD:0x4a2010,accent:0xb05028,tusks:true,tuskBig:true,mane:true,ears:true,tail:'up',size:1.35,quills:true,style:"boar"},
  /* —— STEP 21 哀嚎洞穴 —— */
  deviate :{fur:0x4a8a3a,furD:0x2a5a20,accent:0x6ab050,tusks:true,mane:true,ears:true,tail:'up',size:1.25,quills:true,style:"boar"},
  cobrahn :{fur:0x3a7a28,furD:0x1a4010,accent:0x55a040,tusks:true,tuskBig:true,mane:true,ears:true,tail:'bushy',size:4.2,style:"wolf"},
  verdan  :{fur:0x2a6a38,furD:0x143820,accent:0x48a050,tusks:true,tuskBig:true,mane:true,ears:true,tail:'bushy',size:5.5,style:"wolf"},
  /* —— V1-B3 怒焰裂谷 —— */
  oggleflint:{fur:0x8a3018,furD:0x3a1008,accent:0xff6020,tusks:true,tuskBig:true,mane:true,ears:true,tail:'bushy',size:4.0,style:"wolf",glow:0xff4400},
  taragaman :{fur:0xa82810,furD:0x481008,accent:0xff8030,tusks:true,tuskBig:true,mane:true,ears:true,tail:'bushy',size:5.2,style:"wolf",glow:0xff5500},
};

function _quadMat(hex,opts){
  opts=opts||{};
  return new THREE.MeshStandardMaterial({
    color:hex,roughness:opts.r!=null?opts.r:1,metalness:opts.mt||0,
    flatShading:true,
    emissive:opts.e||0x000000,emissiveIntensity:opts.ei||0,
  });
}

/** 赭岩巨蝎：分段腹甲 + 钳 + 拱尾毒刺（独立造型） */
function buildScorpion(cfg){
  const c=Object.assign({size:1.1,fur:0xc87828,furD:0x5a3010,accent:0xe09040},cfg);
  const g=new THREE.Group();
  const shell=_quadMat(c.fur,{r:.75});
  const dark=_quadMat(c.furD,{r:.85});
  const tip=_quadMat(c.accent||0xe09040,{r:.55,mt:.15});
  const claw=_quadMat(0xd0a060,{r:.5,mt:.2});
  /* 头胸甲 */
  const cephal=new THREE.Mesh(new THREE.BoxGeometry(1.15,.55,1.0),shell);
  cephal.position.set(0,.85,.35); g.add(cephal);
  const brow=new THREE.Mesh(new THREE.BoxGeometry(1.05,.22,.35),dark);
  brow.position.set(0,1.15,.55); g.add(brow);
  /* 复眼 */
  [-1,1].forEach(s=>{
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.09,6,5),
      _quadMat(0x1a0800,{e:0xff6020,ei:.55,r:.4}));
    eye.position.set(s*.32,1.05,.82); g.add(eye);
  });
  /* 腹节 */
  for(let i=0;i<4;i++){
    const seg=new THREE.Mesh(new THREE.BoxGeometry(1.0-i*.08,.48-i*.03,.55),i%2?dark:shell);
    seg.position.set(0,.8-i*.02,-.35-i*.48); g.add(seg);
  }
  /* 钳臂 */
  [-1,1].forEach(s=>{
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(.1,.12,.7,6),dark);
    arm.position.set(s*.7,.95,.55); arm.rotation.z=s*-1.05; arm.rotation.x=.35; g.add(arm);
    const pincer=new THREE.Mesh(new THREE.BoxGeometry(.22,.18,.55),claw);
    pincer.position.set(s*1.05,.75,1.05); g.add(pincer);
    const dig=new THREE.Mesh(new THREE.ConeGeometry(.08,.28,5),tip);
    dig.position.set(s*1.05,.72,1.38); dig.rotation.x=Math.PI/2; g.add(dig);
  });
  /* 八足 */
  const legs=[];
  for(let i=0;i<4;i++){
    [-1,1].forEach(s=>{
      const pivot=new THREE.Group();
      const z=.4-i*.35, y=.55;
      pivot.position.set(s*.55,y,z);
      const upper=new THREE.Mesh(new THREE.CylinderGeometry(.07,.06,.45,5),dark);
      upper.position.set(s*.2,-.1,0); upper.rotation.z=s*.9; pivot.add(upper);
      const lower=new THREE.Mesh(new THREE.CylinderGeometry(.055,.04,.4,5),shell);
      lower.position.set(s*.42,-.38,0); lower.rotation.z=s*.35; pivot.add(lower);
      g.add(pivot); legs.push(pivot);
    });
  }
  /* 拱尾 + 毒刺 */
  const tailRoot=new THREE.Group();
  tailRoot.position.set(0,1.0,-1.9);
  const segs=[[.22,.35,0],[.18,.4,.25],[.15,.38,.55],[.12,.32,.8]];
  segs.forEach((arr,i)=>{
    const [r,h,y]=arr;
    const sg=new THREE.Mesh(new THREE.SphereGeometry(r,7,5),i%2?dark:shell);
    sg.position.set(0,y,-i*.05); tailRoot.add(sg);
  });
  const stinger=new THREE.Mesh(new THREE.ConeGeometry(.1,.45,6),tip);
  stinger.position.set(0,1.15,.15); stinger.rotation.x=-2.4; tailRoot.add(stinger);
  tailRoot.rotation.x=-.85; g.add(tailRoot);
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  g.userData={legs, kind:"quad",
    anim:{state:"idle",walkPhase:0,attackAnim:0,deathRoll:0}};
  return g;
}

function buildQuadruped(cfg){
  const c=Object.assign({size:1,legs:4,tusks:false,tuskBig:false,ears:true,mane:false,
    neck:0,beak:false,crest:false,tail:'up',snoutLong:false,quills:false,
    accent:null,stripes:false,glow:null,scorpion:false,style:"boar"},cfg);
  if(c.scorpion)return buildScorpion(c);

  const g=new THREE.Group();
  const fur=_quadMat(c.fur);
  const furD=_quadMat(c.furD);
  const accent=_quadMat(c.accent!=null?c.accent:c.fur,{r:.85});
  const ivory=_quadMat(0xe8e0c8,{r:.45,mt:.08});
  const dark=_quadMat(0x1a120c,{r:.9});
  const eyeWhite=_quadMat(0xf0ead8,{r:.55});
  const eyeIris=_quadMat(c.glow!=null?c.glow:0x2a1810,{
    r:.4,e:c.glow!=null?c.glow:0x000000,ei:c.glow!=null?.45:0});

  /* —— 分段躯干：胸 + 腹 + 臀 —— */
  const chest=new THREE.Mesh(new THREE.BoxGeometry(1.15,1.05,1.0),fur);
  chest.position.set(0,1.05,.35); g.add(chest);
  const belly=new THREE.Mesh(new THREE.BoxGeometry(1.0,.85,1.0),furD);
  belly.position.set(0,.95,-.35); g.add(belly);
  const haunch=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.1,.7),fur);
  haunch.position.set(0,1.05,-1.0); g.add(haunch);
  /* 肚皮亮带 */
  const under=new THREE.Mesh(new THREE.BoxGeometry(.7,.2,1.4),accent);
  under.position.set(0,.52,-.15); g.add(under);
  /* 肩胛 / 髋侧块 */
  [-1,1].forEach(s=>{
    const sh=new THREE.Mesh(new THREE.BoxGeometry(.28,.55,.55),furD);
    sh.position.set(s*.62,1.25,.4); g.add(sh);
    const hp=new THREE.Mesh(new THREE.BoxGeometry(.3,.5,.45),furD);
    hp.position.set(s*.64,1.15,-.95); g.add(hp);
  });
  /* 斑马条纹 */
  if(c.stripes){
    for(let i=0;i<5;i++){
      const stripe=new THREE.Mesh(new THREE.BoxGeometry(1.22,.08,.12),furD);
      stripe.position.set(0,1.15+((i%2)*.15),.5-i*.35); g.add(stripe);
    }
  }
  /* 鬃毛脊：多片竖鬃 */
  if(c.mane){
    for(let i=0;i<6;i++){
      const h=.28+((i%3)*.08);
      const tuft=new THREE.Mesh(new THREE.ConeGeometry(.1,h,5),furD);
      tuft.position.set(((i%2)*.08- .04),1.55+h*.35,.55-i*.28);
      tuft.rotation.x=-.25-(i*.04); g.add(tuft);
    }
    if(c.style==="wolf"){
      const ruff=new THREE.Mesh(new THREE.SphereGeometry(.42,7,5),furD);
      ruff.position.set(0,1.25,.95); ruff.scale.set(1.1,.7,1); g.add(ruff);
    }
  }

  /* —— 头 / 颈 —— */
  let headY=1.15, headZ=1.2;
  if(c.neck){
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.18,.26,c.neck,7),fur);
    neck.position.set(0,1.25+c.neck/2,.95); neck.rotation.x=.22; g.add(neck);
    const nRing=new THREE.Mesh(new THREE.TorusGeometry(.22,.04,5,10),furD);
    nRing.position.set(0,1.35+c.neck*.4,1.05); nRing.rotation.x=Math.PI/2; g.add(nRing);
    headY=1.4+c.neck; headZ=1.28;
  }
  const head=new THREE.Mesh(new THREE.BoxGeometry(.78,.72,.72),fur);
  head.position.set(0,headY,headZ); g.add(head);
  /* 眉骨 */
  const brow=new THREE.Mesh(new THREE.BoxGeometry(.82,.16,.28),furD);
  brow.position.set(0,headY+.28,headZ+.2); g.add(brow);
  /* 眼睛 */
  [-1,1].forEach(s=>{
    const socket=new THREE.Mesh(new THREE.SphereGeometry(.11,6,5),dark);
    socket.position.set(s*.22,headY+.08,headZ+.38); g.add(socket);
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.08,6,5),eyeWhite);
    ball.position.set(s*.22,headY+.08,headZ+.42); g.add(ball);
    const iris=new THREE.Mesh(new THREE.SphereGeometry(.045,5,4),eyeIris);
    iris.position.set(s*.22,headY+.08,headZ+.48); g.add(iris);
  });
  /* 吻 / 喙 */
  if(c.beak){
    const beak=new THREE.Mesh(new THREE.ConeGeometry(.16,.62,6),ivory);
    beak.position.set(0,headY-.08,headZ+.72); beak.rotation.x=Math.PI/2; g.add(beak);
    const beakTip=new THREE.Mesh(new THREE.ConeGeometry(.07,.22,5),furD);
    beakTip.position.set(0,headY-.1,headZ+1.05); beakTip.rotation.x=Math.PI/2; g.add(beakTip);
  }else{
    const snZ=c.snoutLong?.72:.48;
    const snout=new THREE.Mesh(new THREE.BoxGeometry(.42,.36,snZ),furD);
    snout.position.set(0,headY-.18,headZ+.42+snZ*.35); g.add(snout);
    /* 鼻孔 */
    [-1,1].forEach(s=>{
      const nostril=new THREE.Mesh(new THREE.SphereGeometry(.045,5,4),dark);
      nostril.position.set(s*.1,headY-.22,headZ+.42+snZ*.7); g.add(nostril);
    });
    if(c.style==="boar"){
      const plate=new THREE.Mesh(new THREE.BoxGeometry(.5,.22,.2),accent);
      plate.position.set(0,headY-.05,headZ+.55); g.add(plate);
    }
  }
  /* 冠羽 */
  if(c.crest){
    for(let i=0;i<5;i++){
      const fe=new THREE.Mesh(new THREE.ConeGeometry(.07,.55+i*.04,5),i%2?accent:furD);
      fe.position.set((i-2)*.11,headY+.55,headZ-.1); fe.rotation.x=-.55; g.add(fe);
    }
  }

  const legs=[];
  [-1,1].forEach(s=>{
    /* 獠牙（弯弧两段） */
    if(c.tusks){
      const big=!!c.tuskBig;
      const base=new THREE.Mesh(new THREE.ConeGeometry(big?.13:.09,big?.4:.28,6),ivory);
      base.position.set(s*.3,headY-.15,headZ+.5); base.rotation.x=-.85; base.rotation.z=s*.25; g.add(base);
      const tip=new THREE.Mesh(new THREE.ConeGeometry(big?.08:.05,big?.38:.22,5),ivory);
      tip.position.set(s*.38,headY-.35,headZ+.72); tip.rotation.x=-1.15; tip.rotation.z=s*.15; g.add(tip);
    }
    /* 耳 */
    if(c.ears&&!c.beak){
      const ear=new THREE.Mesh(new THREE.ConeGeometry(.14,.4,5),furD);
      ear.position.set(s*.36,headY+.52,headZ-.08);
      ear.rotation.z=s*-.35; ear.rotation.x=-.2; g.add(ear);
      const inner=new THREE.Mesh(new THREE.ConeGeometry(.07,.22,4),accent);
      inner.position.set(s*.36,headY+.48,headZ-.02); inner.rotation.z=s*-.35; g.add(inner);
    }
    /* 腿：大腿 + 小腿 + 蹄（枢轴仍在髋，供 anim.js） */
    (c.legs===4?[[.48],[-.55]]:[[-.25]]).forEach(([dz],li)=>{
      const legH=c.legs===2?1.05:.78;
      const pivot=new THREE.Group();
      pivot.position.set(s*(c.legs===2?.22:.42),legH,dz);
      const thigh=new THREE.Mesh(new THREE.CylinderGeometry(.16,.14,legH*.55,6),furD);
      thigh.position.y=-legH*.22; pivot.add(thigh);
      const shin=new THREE.Mesh(new THREE.CylinderGeometry(.12,.1,legH*.42,6),fur);
      shin.position.y=-legH*.58; pivot.add(shin);
      const hoof=new THREE.Mesh(new THREE.BoxGeometry(.18,.12,.22),c.beak?furD:dark);
      hoof.position.set(0,-legH*.92,.04); pivot.add(hoof);
      if(c.legs===2){
        /* 陆行鸟趾爪 */
        for(let t=0;t<3;t++){
          const claw=new THREE.Mesh(new THREE.ConeGeometry(.035,.16,4),ivory);
          claw.position.set((t-1)*.07,-legH*1.02,.14); claw.rotation.x=1.1; pivot.add(claw);
        }
      }
      g.add(pivot);
      legs.push(pivot);
    });
  });

  /* —— 尾巴 —— */
  if(c.tail==='up'){
    const t1=new THREE.Mesh(new THREE.CylinderGeometry(.07,.05,.35,5),furD);
    t1.position.set(0,1.4,-1.35); t1.rotation.x=.55; g.add(t1);
    const t2=new THREE.Mesh(new THREE.CylinderGeometry(.05,.03,.32,5),fur);
    t2.position.set(0,1.65,-1.55); t2.rotation.x=.9; g.add(t2);
  }else if(c.tail==='bushy'){
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,.35,6),furD);
    base.position.set(0,1.25,-1.35); base.rotation.x=.6; g.add(base);
    const bush=new THREE.Mesh(new THREE.SphereGeometry(.28,7,5),furD);
    bush.position.set(0,1.45,-1.7); bush.scale.set(1,1,1.35); g.add(bush);
    for(let i=0;i<4;i++){
      const tip=new THREE.Mesh(new THREE.ConeGeometry(.06,.3,4),accent);
      tip.position.set((i-1.5)*.08,1.55,-1.95); tip.rotation.x=1.1; g.add(tip);
    }
  }else if(c.tail==='plume'){
    for(let i=0;i<5;i++){
      const fe=new THREE.Mesh(new THREE.ConeGeometry(.09,.7,5),i%2?accent:furD);
      fe.position.set((i-2)*.14,1.55,-1.05); fe.rotation.x=-2.35; fe.rotation.z=(i-2)*.08; g.add(fe);
    }
  }

  /* 背刺 / 刺脊 */
  if(c.quills){
    for(let i=0;i<8;i++){
      const q=new THREE.Mesh(new THREE.ConeGeometry(.05,.5+((i%3)*.12),5),i%2?furD:accent);
      q.position.set((i%2?1:-1)*(.08+(i%3)*.06),1.7+((i%2)*.08),.4-i*.18);
      q.rotation.x=-.65-(i*.03); q.rotation.z=(i%2?.2:-.2); g.add(q);
    }
  }

  /* 陆行鸟：小型翅褶 */
  if(c.style==="bird"){
    [-1,1].forEach(s=>{
      const wing=new THREE.Mesh(new THREE.BoxGeometry(.15,.55,.9),furD);
      wing.position.set(s*.62,1.2,.1); wing.rotation.z=s*.4; wing.rotation.x=.2; g.add(wing);
      const fold=new THREE.Mesh(new THREE.BoxGeometry(.1,.35,.55),accent);
      fold.position.set(s*.72,1.05,-.15); fold.rotation.z=s*.5; g.add(fold);
    });
  }

  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  g.userData={legs, kind:c.legs===2?"biped":"quad",
    anim:{state:"idle",walkPhase:0,attackAnim:0,deathRoll:0}};
  return g;
}

/* 半人马（STEP 18）：四足马身 + 人形上半身 */
function buildCentaur(cfg){
  const c=Object.assign({fur:0x8a6a40,furD:0x5a4028,skin:0xc9a080,cloth:0x6a4030,size:1.2},cfg||{});
  const g=new THREE.Group();
  const horse=buildQuadruped({fur:c.fur,furD:c.furD,ears:true,mane:true,tail:'bushy',size:1});
  g.add(horse);
  const skin=new THREE.MeshStandardMaterial({color:c.skin,roughness:.85});
  const cloth=new THREE.MeshStandardMaterial({color:c.cloth,roughness:.9});
  const torso=new THREE.Mesh(new THREE.BoxGeometry(.55,.9,.4),cloth);
  torso.position.set(0,2.55,.3); g.add(torso);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.38,.38,.36),skin);
  head.position.set(0,3.3,.35); g.add(head);
  const hair=new THREE.Mesh(new THREE.ConeGeometry(.28,.5,6),
    new THREE.MeshStandardMaterial({color:c.furD,roughness:1}));
  hair.position.set(0,3.65,.28); g.add(hair);
  [-1,1].forEach(s=>{
    const arm=new THREE.Mesh(new THREE.BoxGeometry(.16,.7,.16),skin);
    arm.position.set(s*.42,2.7,.35); arm.rotation.z=s*.35; g.add(arm);
  });
  const spear=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,2.2,5),
    new THREE.MeshStandardMaterial({color:0x6a5030,roughness:.8}));
  spear.position.set(.55,3.1,.6); spear.rotation.z=-.4; g.add(spear);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.08,.28,5),
    new THREE.MeshStandardMaterial({color:0xc0c0c0,roughness:.4,metalness:.6}));
  tip.position.set(.85,3.85,.85); tip.rotation.z=-.4; g.add(tip);
  if(c.banner){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,2.6,5),
      new THREE.MeshStandardMaterial({color:0x4a4030,roughness:.8}));
    pole.position.set(-.55,3.4,.2); g.add(pole);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.7),
      new THREE.MeshStandardMaterial({color:0xc04020,roughness:.9,side:THREE.DoubleSide}));
    flag.position.set(-1.05,4.3,.2); g.add(flag);
  }
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  /* 挂点指向马身腿，外层可直接 updateMobAnim */
  g.userData={legs:horse.userData.legs, kind:"centaur", horse,
    anim:horse.userData.anim||{state:"idle",walkPhase:0,attackAnim:0,deathRoll:0}};
  return g;
}

/* 人形怪族群：鹰身女妖 /（将来的小恶魔等）共用 */
const MOB_HUMANOIDS={
  harpy:{size:1.55,skin:0xc9a2b8,feather:0x5a3a6e,featherD:0x3a2450,hair:0x2a1a3e,claw:0xe8e0c8},
  cliffHarpy:{size:1.75,skin:0xd4a090,feather:0x6a3020,featherD:0x3a1810,hair:0x2a1008,claw:0xe8d0a0,wings:true},
  centaur:{size:1.2,skin:0xc9a080,fur:0x8a6a40,furD:0x5a4028,cloth:0x6a4030},
  /* STEP 24 半人马战争使者 */
  centaurHerald:{size:1.55,skin:0xd4a878,fur:0x6a5030,furD:0x3a2818,cloth:0x8a3020,banner:true},
};
function buildHumanoidMob(cfg){
  const c=Object.assign({size:1,wings:true},cfg);
  const g=new THREE.Group();
  const mk=(col,r)=>new THREE.MeshStandardMaterial({color:col,roughness:r??.9});
  const skin=mk(c.skin,.85),fe=mk(c.feather),feD=mk(c.featherD),hair=mk(c.hair),claw=mk(c.claw,.6);
  /* 羽裙 + 躯干 + 头 */
  const skirt=new THREE.Mesh(new THREE.ConeGeometry(.55,1,7),fe); skirt.position.y=1; g.add(skirt);
  const torso=new THREE.Mesh(new THREE.BoxGeometry(.62,.9,.4),feD); torso.position.y=1.85; g.add(torso);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.42,.42,.4),skin); head.position.y=2.6; g.add(head);
  const mane=new THREE.Mesh(new THREE.ConeGeometry(.38,.75,7),hair);
  mane.position.y=2.95; mane.rotation.z=.15; g.add(mane);
  [-1,1].forEach(s=>{
    /* 张开的利爪双臂 */
    const arm=new THREE.Mesh(new THREE.BoxGeometry(.2,.8,.2),fe);
    arm.position.set(s*.55,2.15,0); arm.rotation.z=s*.9; g.add(arm);
    const talon=new THREE.Mesh(new THREE.ConeGeometry(.07,.28,4),claw);
    talon.position.set(s*.92,1.9,0); talon.rotation.z=s*2.2; g.add(talon);
    /* 羽翼（双面） */
    if(c.wings){
      const wing=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.9),
        new THREE.MeshStandardMaterial({color:c.feather,roughness:.9,side:THREE.DoubleSide}));
      wing.position.set(s*.95,2.3,-.3); wing.rotation.set(.15,s*-.6,s*.3); g.add(wing);
    }
    /* 鸟腿 + 爪 */
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(.09,.07,.9,5),feD);
    leg.position.set(s*.22,.45,0); g.add(leg);
    const foot=new THREE.Mesh(new THREE.ConeGeometry(.09,.22,4),claw);
    foot.position.set(s*.22,.08,.14); foot.rotation.x=1.2; g.add(foot);
  });
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return g;
}

/* 草原野猪：族群配方包装（外观与原 buildBoar 一致） */
function buildBoar(){return buildQuadruped(QUADS.boar);}

/* ---------------- 牛头人营地 NPC（缩小精致版；vendor/spirit/tint 共用） ---------------- */
function buildElder(){
  const g=new THREE.Group();
  const fur=new THREE.MeshStandardMaterial({color:0x6a4a30,roughness:.95,flatShading:true});
  const furD=new THREE.MeshStandardMaterial({color:0x4a3220,roughness:.95,flatShading:true});
  const cloth=new THREE.MeshStandardMaterial({color:0x8a4a2a,roughness:.88,flatShading:true});
  const clothTrim=new THREE.MeshStandardMaterial({color:0xc9a06a,roughness:.55,metalness:.35,flatShading:true});
  const hornM=new THREE.MeshStandardMaterial({color:0xe8e0c8,roughness:.45,metalness:.15});
  const wood=new THREE.MeshStandardMaterial({color:0x6a4520,roughness:.9,flatShading:true});
  const featherM=new THREE.MeshStandardMaterial({color:0xe8e4d0,roughness:.9,flatShading:true});
  const eyeM=new THREE.MeshStandardMaterial({color:0x1a1208,roughness:.4,emissive:0xffaa40,emissiveIntensity:.15});
  const noseM=new THREE.MeshStandardMaterial({color:0x3a2818,roughness:.85});

  /* 躯干分段 */
  const hips=new THREE.Mesh(new THREE.BoxGeometry(.95,.55,.7),furD);
  hips.position.y=1.05; g.add(hips);
  const torso=new THREE.Mesh(new THREE.BoxGeometry(1.05,1.15,.78),fur);
  torso.position.y=1.85; g.add(torso);
  const chest=new THREE.Mesh(new THREE.BoxGeometry(1.12,.45,.82),fur);
  chest.position.y=2.45; g.add(chest);
  /* 披肩 + 金边 */
  const mantle=new THREE.Mesh(new THREE.BoxGeometry(1.28,.28,.9),cloth);
  mantle.position.y=2.72; g.add(mantle);
  const mantleTrim=new THREE.Mesh(new THREE.BoxGeometry(1.32,.06,.94),clothTrim);
  mantleTrim.position.y=2.58; g.add(mantleTrim);
  /* 腰布 + 腰带扣 */
  const loin=new THREE.Mesh(new THREE.BoxGeometry(.88,.7,.68),cloth);
  loin.position.y=1.15; g.add(loin);
  const belt=new THREE.Mesh(new THREE.BoxGeometry(.95,.12,.74),clothTrim);
  belt.position.y=1.42; g.add(belt);
  const buckle=new THREE.Mesh(new THREE.BoxGeometry(.22,.16,.08),clothTrim);
  buckle.position.set(0,1.42,.4); g.add(buckle);

  [-1,1].forEach(s=>{
    /* 腿：大腿 + 小腿 + 蹄 */
    const thigh=new THREE.Mesh(new THREE.BoxGeometry(.32,.48,.34),furD);
    thigh.position.set(s*.28,.72,0); g.add(thigh);
    const shin=new THREE.Mesh(new THREE.BoxGeometry(.28,.42,.3),furD);
    shin.position.set(s*.28,.32,.02); g.add(shin);
    const hoof=new THREE.Mesh(new THREE.BoxGeometry(.3,.14,.36),noseM);
    hoof.position.set(s*.28,.07,.04); g.add(hoof);
    /* 臂：上臂 + 前臂 + 手腕缠带 */
    const uArm=new THREE.Mesh(new THREE.BoxGeometry(.28,.55,.28),fur);
    uArm.position.set(s*.72,2.15,0); g.add(uArm);
    const fArm=new THREE.Mesh(new THREE.BoxGeometry(.25,.5,.25),fur);
    fArm.position.set(s*.78,1.65,.04); g.add(fArm);
    const wrap=new THREE.Mesh(new THREE.BoxGeometry(.28,.12,.28),cloth);
    wrap.position.set(s*.78,1.42,.04); g.add(wrap);
    const hand=new THREE.Mesh(new THREE.BoxGeometry(.22,.2,.24),furD);
    hand.position.set(s*.78,1.28,.06); g.add(hand);
    /* 肩甲 */
    const pad=new THREE.Mesh(new THREE.BoxGeometry(.38,.22,.42),cloth);
    pad.position.set(s*.68,2.55,.02); g.add(pad);
    /* 双节角 */
    const hornBase=new THREE.Mesh(new THREE.ConeGeometry(.11,.55,6),hornM);
    hornBase.position.set(s*.48,3.35,0); hornBase.rotation.z=s*-.95; g.add(hornBase);
    const hornTip=new THREE.Mesh(new THREE.ConeGeometry(.06,.4,5),hornM);
    hornTip.position.set(s*.78,3.7,-.02); hornTip.rotation.z=s*-1.15; g.add(hornTip);
    /* 耳 */
    const ear=new THREE.Mesh(new THREE.ConeGeometry(.08,.28,4),furD);
    ear.position.set(s*.42,3.05,.05); ear.rotation.z=s*-.4; g.add(ear);
  });

  /* 头 + 吻部 + 眼 */
  const head=new THREE.Mesh(new THREE.BoxGeometry(.62,.58,.6),fur);
  head.position.y=3.05; g.add(head);
  const snout=new THREE.Mesh(new THREE.BoxGeometry(.38,.32,.36),furD);
  snout.position.set(0,2.92,.4); g.add(snout);
  const nose=new THREE.Mesh(new THREE.SphereGeometry(.08,6,5),noseM);
  nose.position.set(0,2.95,.58); g.add(nose);
  [-1,1].forEach(s=>{
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.055,6,5),eyeM);
    eye.position.set(s*.16,3.12,.28); g.add(eye);
  });
  /* 胡须簇 */
  for(let i=0;i<3;i++){
    const tuft=new THREE.Mesh(new THREE.ConeGeometry(.04,.22,4),furD);
    tuft.position.set((i-1)*.08,2.72,.48); tuft.rotation.x=.55; g.add(tuft);
  }
  /* 颈珠 */
  const beads=new THREE.Mesh(new THREE.TorusGeometry(.38,.05,5,10),wood);
  beads.position.y=2.78; beads.rotation.x=Math.PI/2.3; g.add(beads);

  /* 图腾法杖（细杆 + 环 + 羽） */
  const staff=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,3.1,6),wood);
  staff.position.set(.95,1.7,.22); g.add(staff);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.2,.04,5,10),clothTrim);
  ring.position.set(.95,3.35,.22); g.add(ring);
  const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.12,0),clothTrim);
  crystal.position.set(.95,3.55,.22); g.add(crystal);
  for(let i=0;i<3;i++){
    const fe=new THREE.Mesh(new THREE.ConeGeometry(.045,.38,4),featherM);
    fe.position.set(.95+(i-1)*.12,2.95,.32); fe.rotation.x=Math.PI; g.add(fe);
  }

  /* 略小于玩家，整体更精巧 */
  const sc=(typeof BAL!=="undefined"&&BAL.npc&&BAL.npc.scale!=null)?BAL.npc.scale:.72;
  g.scale.setScalar(sc);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  g.userData.npc=true;
  g.userData.npcScale=sc;
  return g;
}
/* 营地 NPC 布料改色（复用长老骨架；只改披风/腰布色，金边与毛皮不动） */
function tintNpcCloth(g,clothHex){
  if(!g)return g;
  g.traverse(o=>{
    if(!o.isMesh||!o.material||!o.material.color)return;
    o.material=o.material.clone();
    const h=o.material.color.getHex();
    if(h===0x8a4a2a||h===0x2a6a4a)o.material.color.setHex(clothHex);
  });
  return g;
}
/* 营地商人：复用长老骨架，布料改青绿 */
function buildVendor(){
  return tintNpcCloth(buildElder(),0x2a6a4a);
}
/* 灵魂医者（STEP 15）：苍白布料 + 微光 */
function buildSpiritHealer(){
  const g=buildElder();
  g.traverse(o=>{
    if(!o.isMesh||!o.material||!o.material.color)return;
    o.material=o.material.clone();
    const h=o.material.color.getHex();
    if(h===0x8a4a2a){o.material.color.setHex(0xc8d8e8);o.material.emissive=new THREE.Color(0x446688);o.material.emissiveIntensity=.35;}
    else if(h===0x6a4a30||h===0x4a3220){o.material.color.setHex(0xa8b8c8);}
    else if(h===0xe8e0c8){o.material.color.setHex(0xffffff);o.material.emissive=new THREE.Color(0x88aacc);o.material.emissiveIntensity=.25;}
  });
  return g;
}

/* ============================================================
   城镇建筑工厂（plan-v1 · V1-A1）
   几何不含随机；调色盘分区；摆放由 placeProp / 调用方负责
   ============================================================ */
const BUILD_PAL={
  mulgore:{wood:0x6a4a28,woodD:0x3a2810,roof:0x8a5a30,hide:0xc9a06a,flag:0xc04020,stake:0x4a3020},
  barrens:{wood:0x7a5a30,woodD:0x4a3020,roof:0xa87840,hide:0xb89050,flag:0xc04020,stake:0x5a3820},
  durotar:{wood:0x6a3a18,woodD:0x3a1e0c,roof:0x8a4820,hide:0xc07040,flag:0xd03018,stake:0x4a2810},
};

function placeProp(root,mesh,x,z,rotY){
  if(!root||!mesh)return mesh;
  mesh.position.set(x,0,z);
  if(rotY!=null)mesh.rotation.y=rotY;
  root.add(mesh);
  return mesh;
}

/** 木屋：墙体 + 双坡茅草顶 + 门洞 */
function buildHut(cfg){
  const c=Object.assign({
    wood:BUILD_PAL.mulgore.wood, woodD:BUILD_PAL.mulgore.woodD,
    roof:BUILD_PAL.mulgore.roof, w:4.2, d:3.6, h:2.6, size:1, door:true,
  },cfg||{});
  const g=new THREE.Group();
  const wood=new THREE.MeshStandardMaterial({color:c.wood,roughness:.92,flatShading:true});
  const woodD=new THREE.MeshStandardMaterial({color:c.woodD,roughness:.95,flatShading:true});
  const roofM=new THREE.MeshStandardMaterial({color:c.roof,roughness:1,flatShading:true});
  const body=new THREE.Mesh(new THREE.BoxGeometry(c.w,c.h,c.d),wood);
  body.position.y=c.h/2; g.add(body);
  /* 四角立柱 */
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{
    const post=new THREE.Mesh(new THREE.BoxGeometry(.28,c.h+.2,.28),woodD);
    post.position.set(sx*(c.w/2-.15),c.h/2+.1,sz*(c.d/2-.15)); g.add(post);
  });
  /* 双坡顶 */
  const roofL=new THREE.Mesh(new THREE.BoxGeometry(c.w+0.6,.22,c.d*.72),roofM);
  roofL.position.set(0,c.h+.35,-c.d*.18); roofL.rotation.x=.42; g.add(roofL);
  const roofR=new THREE.Mesh(new THREE.BoxGeometry(c.w+0.6,.22,c.d*.72),roofM);
  roofR.position.set(0,c.h+.35,c.d*.18); roofR.rotation.x=-.42; g.add(roofR);
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(c.w+.4,.18,.35),woodD);
  ridge.position.set(0,c.h+.75,0); g.add(ridge);
  if(c.door){
    const door=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.7,.12),woodD);
    door.position.set(0,.85,c.d/2+.02); g.add(door);
  }
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  g.userData.building="hut";
  return g;
}

/** 兽皮帐篷：锥顶 + 一圈木桩 */
function buildTent(cfg){
  const c=Object.assign({
    hide:BUILD_PAL.mulgore.hide, stake:BUILD_PAL.mulgore.stake,
    r:3.0, h:4.2, stakes:6, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const hide=new THREE.MeshStandardMaterial({color:c.hide,roughness:.95,flatShading:true});
  const stakeM=new THREE.MeshStandardMaterial({color:c.stake,roughness:1,flatShading:true});
  const cone=new THREE.Mesh(new THREE.ConeGeometry(c.r,c.h,7),hide);
  cone.position.y=c.h/2; g.add(cone);
  const n=Math.max(3,c.stakes|0);
  for(let k=0;k<n;k++){
    const a=k/n*Math.PI*2;
    const st=new THREE.Mesh(new THREE.ConeGeometry(.18,c.h*.55,5),stakeM);
    st.position.set(Math.cos(a)*c.r*.92,c.h*.22,Math.sin(a)*c.r*.92);
    g.add(st);
  }
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="tent";
  return g;
}

/** 木栅栏：沿本地 +X 延伸的一段 */
function buildFence(cfg){
  const c=Object.assign({
    wood:BUILD_PAL.mulgore.wood, woodD:BUILD_PAL.mulgore.woodD,
    length:8, posts:5, h:1.6, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const wood=new THREE.MeshStandardMaterial({color:c.wood,roughness:.92,flatShading:true});
  const woodD=new THREE.MeshStandardMaterial({color:c.woodD,roughness:.95,flatShading:true});
  const n=Math.max(2,c.posts|0);
  const step=c.length/(n-1);
  for(let i=0;i<n;i++){
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.1,.12,c.h,5),woodD);
    post.position.set(i*step-c.length/2,c.h/2,0); g.add(post);
  }
  for(const y of [c.h*.35,c.h*.7]){
    const rail=new THREE.Mesh(new THREE.BoxGeometry(c.length,.12,.1),wood);
    rail.position.set(0,y,0); g.add(rail);
  }
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="fence";
  return g;
}

/** 瞭望塔：基座 + 塔身 + 顶台 + 旗帜 */
function buildWatchtower(cfg){
  const c=Object.assign({
    wood:BUILD_PAL.barrens.wood, woodD:BUILD_PAL.barrens.woodD,
    flag:BUILD_PAL.barrens.flag, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const wood=new THREE.MeshStandardMaterial({color:c.wood,roughness:.9,flatShading:true});
  const woodD=new THREE.MeshStandardMaterial({color:c.woodD,roughness:.92,flatShading:true});
  const flagM=new THREE.MeshStandardMaterial({color:c.flag,roughness:.8});
  const base=new THREE.Mesh(new THREE.BoxGeometry(4.2,1.2,4.2),wood); base.position.y=.6; g.add(base);
  const mid=new THREE.Mesh(new THREE.BoxGeometry(3.2,4.5,3.2),woodD); mid.position.y=3.5; g.add(mid);
  const top=new THREE.Mesh(new THREE.BoxGeometry(4.5,.5,4.5),wood); top.position.y=5.9; g.add(top);
  /* 栏杆 */
  [[-1.9,-1.9],[1.9,-1.9],[-1.9,1.9],[1.9,1.9]].forEach(([x,z])=>{
    const p=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,1.1,5),woodD);
    p.position.set(x,6.5,z); g.add(p);
  });
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,2.2,5),wood);
  pole.position.set(.3,7.0,0); g.add(pole);
  const flag=new THREE.Mesh(new THREE.BoxGeometry(1.8,.9,.08),flagM);
  flag.position.set(1.2,7.2,0); g.add(flag);
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="watchtower";
  return g;
}

/** 营火：石圈 + 火苗 + 点光；调用方把 fl/li 推进 flames 数组 */
function buildCampfire(cfg){
  const c=Object.assign({
    stone:0x6a5040, flame:0xffa030, light:0xff8a30,
    r:1.1, intensity:1.4, dist:20, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const stoneM=new THREE.MeshStandardMaterial({color:c.stone,roughness:1,flatShading:true});
  for(let k=0;k<6;k++){
    const a=k/6*Math.PI*2;
    const st=new THREE.Mesh(new THREE.DodecahedronGeometry(.38,0),stoneM);
    st.position.set(Math.cos(a)*c.r,.28,Math.sin(a)*c.r); g.add(st);
  }
  const fl=new THREE.Mesh(new THREE.ConeGeometry(.65,1.6,7),
    new THREE.MeshBasicMaterial({color:c.flame,transparent:true,opacity:.9}));
  fl.position.y=1.0; g.add(fl);
  const li=new THREE.PointLight(c.light,c.intensity,c.dist,1.8);
  li.position.y=2.0; g.add(li);
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="campfire";
  g.userData.flame={fl,li};
  return g;
}

/** 图腾柱：木柱 + 色环 + 横翼 */
function buildTotem(cfg){
  const c=Object.assign({
    wood:0x5a3820, paintA:0xd94f2a, paintB:0x3a7ac9, h:7.2, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const wood=new THREE.MeshStandardMaterial({color:c.wood,roughness:.9,flatShading:true});
  const aM=new THREE.MeshStandardMaterial({color:c.paintA,roughness:.8});
  const bM=new THREE.MeshStandardMaterial({color:c.paintB,roughness:.8});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.48,.6,c.h,7),wood);
  pole.position.y=c.h/2; g.add(pole);
  [[c.h*.28,aM],[c.h*.5,bM],[c.h*.72,aM]].forEach(([y,m])=>{
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(.68,.68,.5,7),m);
    ring.position.y=y; g.add(ring);
  });
  const wing=new THREE.Mesh(new THREE.BoxGeometry(3.2,.5,.22),bM);
  wing.position.y=c.h*.95; g.add(wing);
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="totem";
  return g;
}

/** 市集摊位：木台 + 棚顶 */
function buildMarketStall(cfg){
  const c=Object.assign({
    wood:BUILD_PAL.mulgore.wood, woodD:BUILD_PAL.mulgore.woodD,
    cloth:0x2a6a4a, w:3.6, d:2.2, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const wood=new THREE.MeshStandardMaterial({color:c.wood,roughness:.92,flatShading:true});
  const woodD=new THREE.MeshStandardMaterial({color:c.woodD,roughness:.95,flatShading:true});
  const cloth=new THREE.MeshStandardMaterial({color:c.cloth,roughness:.9,flatShading:true});
  const table=new THREE.Mesh(new THREE.BoxGeometry(c.w,.25,c.d),wood);
  table.position.y=1.05; g.add(table);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.18,1.05,.18),woodD);
    leg.position.set(sx*(c.w/2-.2),.525,sz*(c.d/2-.2)); g.add(leg);
  });
  [[-1],[1]].forEach(([sx])=>{
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,2.6,5),woodD);
    post.position.set(sx*(c.w/2-.15),2.3,-c.d/2+.1); g.add(post);
  });
  const roof=new THREE.Mesh(new THREE.BoxGeometry(c.w+.4,.12,c.d+.6),cloth);
  roof.position.set(0,3.55,-.1); roof.rotation.x=-.28; g.add(roof);
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  g.userData.building="stall";
  return g;
}

/** 货箱堆 */
function buildCratePile(cfg){
  const c=Object.assign({
    wood:0x7a5a30, woodD:0x4a3020, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const wood=new THREE.MeshStandardMaterial({color:c.wood,roughness:.9,flatShading:true});
  const woodD=new THREE.MeshStandardMaterial({color:c.woodD,roughness:.95,flatShading:true});
  const boxes=[[0,.45,0,1.1],[.9,.45,.2,1],[ -.7,.45,.35,.95],[.2,1.25,.1,.9]];
  boxes.forEach(([x,y,z,s])=>{
    const b=new THREE.Mesh(new THREE.BoxGeometry(s,s*.85,s*.9),wood);
    b.position.set(x,y,z); g.add(b);
    const band=new THREE.Mesh(new THREE.BoxGeometry(s*1.02,.08,s*.92),woodD);
    band.position.set(x,y,z); g.add(band);
  });
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="crates";
  return g;
}

