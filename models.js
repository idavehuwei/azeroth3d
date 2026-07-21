/* ============================================================
   熔火之心 · models.js
   ------------------------------------------------------------
   [依赖] THREE · core.js（rand）
   [导出] buildHumanoid buildWeapon setWeapon HUMANOIDS WEAPONS
          buildQuadruped buildHumanoidMob buildCentaur QUADS MOB_HUMANOIDS（STEP 5/18 族群工厂）
          buildPlayer buildMage buildArcher buildPriest buildBoss buildElder buildVendor buildSpiritHealer
          buildBoar buildFlameSpawn
   ------------------------------------------------------------
   3D 模型库（全部程序化几何体，零模型文件）
   STEP 4：人形基座 buildHumanoid(config)——躯干/四肢/头/披风 + 动画挂点，
   四职业收敛为 HUMANOIDS 数据配置；武器独立为 WEAPONS 配方表，
   武器组打 userData.weapon 标，换装时 setWeapon 只换武器组。
   加新职业 = 加一条 HUMANOIDS 配置；加新武器 = 加一条 WEAPONS 配方。
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
    weaponMount:mount,weaponPos:cfg.weaponPos,defaultWeapon:cfg.weapon};
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
  /* 草原野猪（与原 buildBoar 外观一致） */
  boar    :{fur:0x6a4a2e,furD:0x45311e,tusks:true,mane:true,ears:true,tail:'up'},
  /* 草原狼：灰毛长吻，蓬尾 */
  wolf    :{fur:0x7a7a82,furD:0x4a4a52,snoutLong:true,ears:true,mane:true,tail:'bushy'},
  /* 陆行鸟：双足长颈，喙 + 冠羽 + 扇尾 */
  bird    :{fur:0xd8b060,furD:0xa87830,legs:2,neck:1.1,beak:true,crest:true,tail:'plume'},
  /* 老灰鬃野猪王：巨型灰鬃野猪（稀有精英） */
  boarKing:{fur:0x8a8578,furD:0x55524a,tusks:true,tuskBig:true,mane:true,ears:true,tail:'up',size:2.15},
  /* 玛格曼达：巨型熔岩猎犬（STEP 9c） */
  magmadar:{fur:0x8a2208,furD:0x3a1008,tusks:true,tuskBig:true,mane:true,ears:true,tail:'bushy',size:5.1},
  /* —— STEP 18 贫瘠之地 —— */
  zebra   :{fur:0xe8e0d0,furD:0x3a3028,ears:true,mane:true,tail:'bushy',size:1.05},
  quilboar:{fur:0xc4783a,furD:0x8a5020,tusks:true,mane:true,ears:true,tail:'up',size:1.15,quills:true},
  /* —— STEP 21 哀嚎洞穴 —— */
  deviate :{fur:0x4a8a3a,furD:0x2a5a20,tusks:true,mane:true,ears:true,tail:'up',size:1.25,quills:true},
  cobrahn :{fur:0x3a7a28,furD:0x1a4010,tusks:true,tuskBig:true,mane:true,ears:true,tail:'bushy',size:4.2},
  verdan  :{fur:0x2a6a38,furD:0x143820,tusks:true,tuskBig:true,mane:true,ears:true,tail:'bushy',size:5.5},
};
function buildQuadruped(cfg){
  const c=Object.assign({size:1,legs:4,tusks:false,tuskBig:false,ears:true,mane:false,
    neck:0,beak:false,crest:false,tail:'up',snoutLong:false,quills:false},cfg);
  const g=new THREE.Group();
  const fur=new THREE.MeshStandardMaterial({color:c.fur,roughness:1});
  const furD=new THREE.MeshStandardMaterial({color:c.furD,roughness:1});
  const ivory=new THREE.MeshStandardMaterial({color:0xe8e0c8,roughness:.6});
  /* 躯干 + 鬃毛脊 */
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.1,1,1.7),fur); body.position.y=1; g.add(body);
  if(c.mane){const ridge=new THREE.Mesh(new THREE.BoxGeometry(.5,.3,1.5),furD); ridge.position.y=1.55; g.add(ridge);}
  /* 头部：长颈（陆行鸟）或前置 */
  let headY=1.05, headZ=1.15;
  if(c.neck){
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.16,.22,c.neck,6),fur);
    neck.position.set(0,1.3+c.neck/2,1); neck.rotation.x=.15; g.add(neck);
    headY=1.35+c.neck; headZ=1.25;
  }
  const head=new THREE.Mesh(new THREE.BoxGeometry(.85,.8,.7),fur); head.position.set(0,headY,headZ); g.add(head);
  /* 吻部 / 喙 */
  if(c.beak){
    const beak=new THREE.Mesh(new THREE.ConeGeometry(.18,.55,5),ivory);
    beak.position.set(0,headY-.05,headZ+.6); beak.rotation.x=Math.PI/2; g.add(beak);
  }else{
    const snout=new THREE.Mesh(new THREE.BoxGeometry(.45,.4,c.snoutLong?.6:.35),furD);
    snout.position.set(0,headY-.15,headZ+(c.snoutLong?.62:.5)); g.add(snout);
  }
  /* 冠羽 */
  if(c.crest)for(let i=0;i<3;i++){
    const fe=new THREE.Mesh(new THREE.ConeGeometry(.08,.5,4),furD);
    fe.position.set((i-1)*.14,headY+.55,headZ-.15); fe.rotation.x=-.4; g.add(fe);
  }
  [-1,1].forEach(s=>{
    if(c.tusks){
      const tk=new THREE.Mesh(new THREE.ConeGeometry(c.tuskBig?.14:.09,c.tuskBig?.7:.45,5),ivory);
      tk.position.set(s*.28,headY-.1,headZ+.47); tk.rotation.x=-.6; g.add(tk);
    }
    if(c.ears&&!c.beak){
      const ear=new THREE.Mesh(new THREE.ConeGeometry(.16,.35,4),furD);
      ear.position.set(s*.34,headY+.55,headZ-.1); g.add(ear);
    }
    /* 腿：四足两组 / 双足（陆行鸟）一组长腿 */
    (c.legs===4?[[.42],[-.42]]:[[-.3]]).forEach(([dz])=>{
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(.14,.12,c.legs===2?1:.7,5),furD);
      leg.position.set(s*(c.legs===2?.25:.4),c.legs===2?.5:.35,dz); g.add(leg);
    });
  });
  /* 尾巴三式 */
  if(c.tail==='up'){
    const tail=new THREE.Mesh(new THREE.CylinderGeometry(.05,.03,.5,4),furD);
    tail.position.set(0,1.35,-.95); tail.rotation.x=.7; g.add(tail);
  }else if(c.tail==='bushy'){
    const tail=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.65),furD);
    tail.position.set(0,1.3,-1.05); tail.rotation.x=.5; g.add(tail);
  }else if(c.tail==='plume'){
    for(let i=0;i<3;i++){
      const fe=new THREE.Mesh(new THREE.ConeGeometry(.1,.6,4),furD);
      fe.position.set((i-1)*.16,1.5,-.95); fe.rotation.x=-2.3; g.add(fe);
    }
  }
  /* 野猪人背刺 */
  if(c.quills){
    for(let i=0;i<5;i++){
      const q=new THREE.Mesh(new THREE.ConeGeometry(.06,.55,4),furD);
      q.position.set((i-2)*.12,1.75,.15-i*.08); q.rotation.x=-.55; g.add(q);
    }
  }
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
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
  return g;
}

/* 人形怪族群：鹰身女妖 /（将来的小恶魔等）共用 */
const MOB_HUMANOIDS={
  harpy:{size:1.55,skin:0xc9a2b8,feather:0x5a3a6e,featherD:0x3a2450,hair:0x2a1a3e,claw:0xe8e0c8},
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

/* ---------------- 牛头人长老 NPC ---------------- */
function buildElder(){
  const g=new THREE.Group();
  const fur=new THREE.MeshStandardMaterial({color:0x6a4a30,roughness:1});
  const furD=new THREE.MeshStandardMaterial({color:0x4a3220,roughness:1});
  const cloth=new THREE.MeshStandardMaterial({color:0x8a4a2a,roughness:.9});
  const hornM=new THREE.MeshStandardMaterial({color:0xe8e0c8,roughness:.6});
  const wood=new THREE.MeshStandardMaterial({color:0x6a4520,roughness:.9});
  const featherM=new THREE.MeshStandardMaterial({color:0xe8e4d0,roughness:.9});
  const torso=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.7,1.05),fur); torso.position.y=2.5; g.add(torso);
  const mantle=new THREE.Mesh(new THREE.BoxGeometry(1.8,.5,1.2),cloth); mantle.position.y=3.2; g.add(mantle);
  const loin=new THREE.Mesh(new THREE.BoxGeometry(1.25,1,.95),cloth); loin.position.y=1.3; g.add(loin);
  [-1,1].forEach(s=>{
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.5,.9,.55),furD);
    leg.position.set(s*.4,.45,0); g.add(leg);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(.45,1.5,.5),fur);
    arm.position.set(s*1.05,2.4,0); g.add(arm);
    const horn=new THREE.Mesh(new THREE.ConeGeometry(.17,1,5),hornM);
    horn.position.set(s*.85,4.45,0); horn.rotation.z=s*-1.1; g.add(horn);
  });
  const head=new THREE.Mesh(new THREE.BoxGeometry(.85,.85,.85),fur); head.position.y=4.15; g.add(head);
  const snout=new THREE.Mesh(new THREE.BoxGeometry(.5,.45,.45),furD); snout.position.set(0,3.95,.55); g.add(snout);
  const beads=new THREE.Mesh(new THREE.TorusGeometry(.55,.08,6,12),wood);
  beads.position.y=3.35; beads.rotation.x=Math.PI/2.4; g.add(beads);
  /* 图腾法杖 */
  const staff=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,4.4,6),wood);
  staff.position.set(1.4,2.2,.3); g.add(staff);
  const topper=new THREE.Mesh(new THREE.TorusGeometry(.32,.07,6,10),wood);
  topper.position.set(1.4,4.5,.3); g.add(topper);
  for(let i=0;i<3;i++){
    const fe=new THREE.Mesh(new THREE.ConeGeometry(.07,.55,4),featherM);
    fe.position.set(1.4+(i-1)*.18,3.9,.42); fe.rotation.x=Math.PI; g.add(fe);
  }
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return g;
}
/* 营地商人：复用长老骨架，布料改青绿 */
function buildVendor(){
  const g=buildElder();
  g.traverse(o=>{
    if(!o.isMesh||!o.material||!o.material.color)return;
    o.material=o.material.clone();
    const h=o.material.color.getHex();
    if(h===0x8a4a2a)o.material.color.setHex(0x2a6a4a);
  });
  return g;
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
