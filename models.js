/* ============================================================
   炽心 · models.js
   ------------------------------------------------------------
   [依赖] THREE · core.js（rand）· palette.js（PALETTE · MAT）· rig.js（assembleHumanoidRig）
          assets.js（可选 ASSETS · GLB 房子/帐篷 A 线）
   [导出] buildHumanoid buildWeapon setWeapon HUMANOIDS WEAPONS CLASS_LOOK buildFromClassLook
          buildPlayer buildMage buildArcher buildPriest buildShaman buildRogue buildWarlock buildDruid buildPaladin buildBoss buildOnyxia
          buildElder buildVendor buildSpiritHealer buildGraveyard tintNpcCloth
          buildHut buildTent buildFence buildWatchtower buildCampfire buildTotem buildMarketStall buildCratePile
          buildLonghouse buildWell buildVillageGate buildSignpost buildLanternPole buildHaystack buildTrainingDummy buildWindmill
          BUILD_PAL placeProp GRAVEYARDS registerGraveyard nearestGraveyardSpawn
          （plan-v1 · V1-A1；R3 升级 tent/totem/campfire；STEP 17 墓地；beautify A 线 GLB 房）
   ------------------------------------------------------------
   配方表：职业 HUMANOIDS / 武器 WEAPONS / NPC · Boss · 建筑。
   野怪族群工厂见 creatures.js（plan-V2 · R6）。
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
      :MAT.get("spec."+k,{color:d.c,roughness:d.r??.9,metalness:d.mt??0,
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
    ],
    glow:{c:0x88bbff,o:.12,phase:0,
      parts:[{g:'box',a:[.12,1.55,.01],p:[0,.95,0],s:1}]}},
  /* 奥术法杖（法师默认） */
  staff:{mats:{wood:{c:0x5a3a1a,r:.9},orb:{c:0x66ccff,basic:true},
               trim:{c:0xd9a441,r:.3,mt:.9}},
    parts:[
      {g:'cyl',a:[.05,.07,3,7],p:[0,.6,0],m:'wood'},             /* 杖杆 */
      {g:'ico',a:[.22,0],p:[0,2.2,0],m:'orb'},                   /* 奥术水晶 */
      {g:'tor',a:[.32,.03,6,14],p:[0,2.2,0],m:'trim'},           /* 金环 */
    ],
    glow:{c:0x66ccff,o:.25,phase:1,
      parts:[{g:'sph',a:[.28,10,8],p:[0,2.2,0],s:1.3}]}},
  /* 长弓（弓箭手默认，挂左手） */
  bow:{mats:{wood:{c:0x6a4520,r:.85},feather:{c:0xd8d0b0,r:.9}},
    parts:[
      {g:'tor',a:[.85,.05,6,16,Math.PI],r:[0,0,Math.PI/2],m:'wood'},  /* 弓臂 */
      {g:'box',a:[.02,1.7,.02],m:'feather'},                          /* 弓弦 */
    ]},
  /* 熔渊之柄之柄：燃烧巨锤（装备橙锤时替换手中武器组） */
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
  /* 萨满图腾杖（V1-C1）：木杆 + 青晶 + 羽饰 */
  shaman_staff:{mats:{wood:{c:0x4a3020,r:.9},teal:{c:0x2a8a7a,r:.35,mt:.55},
                 orb:{c:0x66ffcc,basic:true}, feather:{c:0xd8c090,r:.9}},
    parts:[
      {g:'cyl',a:[.05,.07,2.8,7],p:[0,.55,0],m:'wood'},
      {g:'cyl',a:[.12,.14,.35,7],p:[0,2.0,0],m:'teal'},
      {g:'ico',a:[.2,0],p:[0,2.35,0],m:'orb'},
      {g:'cone',a:[.08,.35,5],p:[.18,2.55,0],r:[0,0,-.6],m:'feather'},
      {g:'cone',a:[.08,.35,5],p:[-.18,2.55,0],r:[0,0,.6],m:'feather'},
    ],
    light:{c:0x44e0c0,i:.5,d:5,p:[0,2.3,0]}},
  /* 德鲁伊法杖：木杆 + 翠叶晶 + 鹿角叉 */
  druid_staff:{mats:{wood:{c:0x3a5028,r:.9}, bark:{c:0x5a4030,r:.95},
                 leaf:{c:0x60d050,r:.55,mt:.4}, orb:{c:0xa8ff70,basic:true},
                 antler:{c:0xb09060,r:.75}},
    parts:[
      {g:'cyl',a:[.05,.07,2.85,7],p:[0,.55,0],m:'wood'},
      {g:'cyl',a:[.09,.11,.4,7],p:[0,1.85,0],m:'bark'},
      {g:'ico',a:[.18,0],p:[0,2.3,0],m:'orb'},
      {g:'cone',a:[.1,.32,5],p:[.16,2.55,0],r:[0,0,-.55],m:'leaf'},
      {g:'cone',a:[.1,.32,5],p:[-.16,2.55,0],r:[0,0,.55],m:'leaf'},
      {g:'cone',a:[.05,.28,5],p:[.22,2.72,0],r:[0,0,-.7],m:'antler'},
      {g:'cone',a:[.05,.28,5],p:[-.22,2.72,0],r:[0,0,.7],m:'antler'},
    ],
    glow:{c:0x70e060,o:.28,phase:1.2,
      parts:[{g:'sph',a:[.26,8,6],p:[0,2.3,0],s:1.25}]},
    light:{c:0x70e050,i:.55,d:5.5,p:[0,2.3,0]}},
  /* 匕首（V1-C2 盗贼默认） */
  dagger:{mats:{gold:{c:0xa09070,r:.35,mt:.85},
               blade:{c:0xb8c4d4,mt:.95,r:.12,e:0x445566,ei:.15}},
    parts:[
      {g:'cyl',a:[.04,.045,.22,6],m:'gold'},
      {g:'box',a:[.22,.05,.08],p:[0,.12,0],m:'gold'},
      {g:'box',a:[.07,.95,.025],p:[0,.62,0],m:'blade'},
      {g:'cone',a:[.05,.18,4],p:[0,1.18,0],m:'blade'},
    ],
    glow:{c:0x8899bb,o:.1,phase:0,
      parts:[{g:'box',a:[.09,1.05,.01],p:[0,.62,0],s:1}]}},
};
function buildWeapon(type){
  const cfg=WEAPONS[type]||WEAPONS.sword;
  const M=makeMats(cfg.mats);
  const w=new THREE.Group();
  addParts(w,cfg.parts,M);

  /* 发光层：为剑刃/匕首加一层半透明光晕 mesh */
  if(cfg.glow){
    const glowMat=new THREE.MeshBasicMaterial({
      color:cfg.glow.c||0x88bbff,
      transparent:true,opacity:cfg.glow.o||.18,
      depthWrite:false,
    });
    cfg.glow.parts.forEach(spec=>{
      const mesh=new THREE.Mesh(GEO[spec.g](spec.a),glowMat);
      if(spec.p)mesh.position.set(...spec.p);
      if(spec.r)mesh.rotation.set(...spec.r);
      if(spec.s)mesh.scale.setScalar(spec.s);
      mesh.userData.glow=true;
      mesh.userData.glowPhase=cfg.glow.phase||0;
      w.add(mesh);
    });
  }

  if(cfg.light){
    const l=new THREE.PointLight(cfg.light.c,cfg.light.i,cfg.light.d,1.8);
    l.position.set(...cfg.light.p); w.add(l);
  }
  w.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  w.userData.weapon=type;
  return w;
}

/* ============================================================
   人形职业配置（纯数据；外观与重构前一致）
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
      leather:{c:PALETTE.grass.dark,r:.85}, leatherD:{c:0x3a2a14,r:.9},
      skin:{c:0xe0b088,r:.8}, wood:{c:PALETTE.wood.base,r:.85},
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
  /* 🌀 兽人萨满（V1-C1）：青绿皮甲 + 图腾杖 */
  shaman:{
    mats:{
      leather:{c:0x3a6a58,r:.85}, leatherD:{c:0x2a4038,r:.9},
      trim:{c:0xc9a050,r:.35,mt:.7}, skin:{c:0x6a9a48,r:.8},
      cloth:{c:0x2a5a70,r:.9}, capeM:{c:0x1a4050,r:.9,ds:true},
    },
    parts:[
      {g:'box',a:[.88,1.1,.5],p:[0,1.65,0],m:'leather'},
      {g:'box',a:[.92,.16,.54],p:[0,1.12,0],m:'trim'},
      {g:'box',a:[.8,.34,.46],p:[0,.92,0],m:'leatherD'},
      {g:'box',a:[.5,.48,.46],p:[0,2.48,0],m:'skin'},
      {g:'cyl',a:[.32,.34,.28,8],p:[0,2.78,0],m:'cloth'},          /* 头环 */
      {g:'cone',a:[.06,.28,5],p:[.22,2.95,0],r:[0,0,-.4],m:'trim'}, /* 羽饰 */
      {g:'cone',a:[.06,.28,5],p:[-.22,2.95,0],r:[0,0,.4],m:'trim'},
      {g:'sph',a:[.28,8,6,0,6.28,0,1.7],p:[.58,2.2,0],m:'leatherD'},
      {g:'sph',a:[.28,8,6,0,6.28,0,1.7],p:[-.58,2.2,0],m:'leatherD'},
    ],
    arm:{x:.58,y:2.12,mesh:{g:'box',a:[.24,.82,.24],p:[0,-.4,0],m:'leather'}},
    armExtraL:[{g:'cyl',a:[.08,.1,.55,6],p:[-.08,-.9,.1],m:'trim'}], /* 小图腾 */
    leg:{x:.24,y:.9,mesh:{g:'box',a:[.28,.9,.28],p:[0,-.45,0],m:'leatherD'}},
    cape:{a:[.9,1.45],p:[0,1.7,-.32],rx:.12,m:'capeM'},
    weapon:'shaman_staff', weaponMount:'armR', weaponPos:[.05,-.85,.12],
  },
  /* 🗡 人类盗贼（V1-C2）：深色皮甲 + 兜帽 + 匕首 */
  rogue:{
    mats:{
      leather:{c:0x2a3038,r:.85}, leatherD:{c:0x1a1e24,r:.9},
      trim:{c:0x6a7080,r:.4,mt:.5}, skin:{c:0xd0a078,r:.8},
      cloth:{c:0x3a2030,r:.9}, capeM:{c:0x1a1218,r:.9,ds:true},
    },
    parts:[
      {g:'box',a:[.82,1.05,.46],p:[0,1.65,0],m:'leather'},
      {g:'box',a:[.14,1.05,.5],p:[0,1.65,0],r:[0,0,.45],m:'leatherD'},
      {g:'box',a:[.86,.14,.5],p:[0,1.12,0],m:'trim'},
      {g:'box',a:[.76,.3,.42],p:[0,.92,0],m:'leatherD'},
      {g:'box',a:[.44,.44,.42],p:[0,2.42,0],m:'skin'},
      {g:'cone',a:[.4,.7,8],p:[0,2.68,0],r:[-.2,0,0],m:'leather'},
      {g:'sph',a:[.26,8,6,0,6.28,0,1.7],p:[.54,2.15,0],m:'leatherD'},
      {g:'sph',a:[.26,8,6,0,6.28,0,1.7],p:[-.54,2.15,0],m:'leatherD'},
    ],
    arm:{x:.54,y:2.08,mesh:{g:'box',a:[.22,.78,.22],p:[0,-.38,0],m:'leather'}},
    armExtraL:[{g:'box',a:[.06,.55,.02],p:[-.08,-.75,.12],m:'trim'}], /* 副手短刃 */
    leg:{x:.24,y:.9,mesh:{g:'box',a:[.26,.88,.26],p:[0,-.44,0],m:'leatherD'}},
    cape:{a:[.82,1.25],p:[0,1.65,-.28],rx:.14,m:'capeM'},
    weapon:'dagger', weaponMount:'armR', weaponPos:[0,-.7,.08],
  },
  /* 💀 人类术士：暗紫长袍 + 弯角头冠 + 暗影法典 */
  warlock:{
    mats:{
      robe:{c:0x2a1838,r:.85}, robeDark:{c:0x180c22,r:.9},
      trim:{c:0x9060c0,r:.35,mt:.8}, skin:{c:0xd0a070,r:.8},
      book:{c:0x4a1028,r:.8}, capeM:{c:0x140818,r:.9,ds:true},
      horn:{c:0x3a2030,r:.7},
    },
    parts:[
      {g:'cyl',a:[.5,1,1.6,8],p:[0,1,0],m:'robe'},
      {g:'cyl',a:[.42,.5,1,8],p:[0,2.2,0],m:'robeDark'},
      {g:'cyl',a:[.52,.52,.12,8],p:[0,1.75,0],m:'trim'},
      {g:'box',a:[.46,.46,.44],p:[0,2.95,0],m:'skin'},
      {g:'cyl',a:[.3,.32,.22,8],p:[0,3.22,0],m:'robeDark'},
      {g:'cone',a:[.07,.32,5],p:[.2,3.42,0],r:[0,0,-.55],m:'horn'},
      {g:'cone',a:[.07,.32,5],p:[-.2,3.42,0],r:[0,0,.55],m:'horn'},
      {g:'oct',a:[.1,0],p:[0,2.35,.32],m:'trim'},
      {g:'sph',a:[.26,8,6],p:[.54,2.55,0],m:'robeDark'},
      {g:'sph',a:[.26,8,6],p:[-.54,2.55,0],m:'robeDark'},
    ],
    arm:{x:.55,y:2.55,mesh:{g:'cyl',a:[.14,.2,.9,7],p:[0,-.45,0],m:'robe'}},
    armExtraL:[{g:'box',a:[.34,.44,.12],p:[-.05,-.95,.12],m:'book'}],
    leg:{x:.2,y:.6,mesh:null},
    cape:{a:[.95,1.9],p:[0,1.95,-.4],rx:.1,m:'capeM'},
    weapon:'staff', weaponMount:'armR', weaponPos:[.05,-.9,.15],
  },
  /* 🌿 暗夜精灵德鲁伊：叶绿长袍 + 鹿角冠 + 木杖 */
  druid:{
    mats:{
      robe:{c:0x2a5030,r:.85}, robeDark:{c:0x1a3020,r:.9},
      trim:{c:0xc9a050,r:.35,mt:.7}, skin:{c:0x70a090,r:.8},
      leaf:{c:0x50a040,r:.7}, capeM:{c:0x183018,r:.9,ds:true},
      antler:{c:0xb09060,r:.75},
    },
    parts:[
      {g:'cyl',a:[.5,1,1.6,8],p:[0,1,0],m:'robe'},
      {g:'cyl',a:[.42,.5,1,8],p:[0,2.2,0],m:'robeDark'},
      {g:'cyl',a:[.52,.52,.12,8],p:[0,1.75,0],m:'trim'},
      {g:'box',a:[.46,.46,.44],p:[0,2.95,0],m:'skin'},
      {g:'cyl',a:[.28,.3,.2,8],p:[0,3.22,0],m:'leaf'},
      {g:'cone',a:[.05,.36,5],p:[.22,3.45,0],r:[0,0,-.5],m:'antler'},
      {g:'cone',a:[.05,.36,5],p:[-.22,3.45,0],r:[0,0,.5],m:'antler'},
      {g:'oct',a:[.1,0],p:[0,2.35,.32],m:'leaf'},
      {g:'sph',a:[.26,8,6],p:[.54,2.55,0],m:'robeDark'},
      {g:'sph',a:[.26,8,6],p:[-.54,2.55,0],m:'robeDark'},
    ],
    arm:{x:.55,y:2.55,mesh:{g:'cyl',a:[.14,.2,.9,7],p:[0,-.45,0],m:'robe'}},
    armExtraL:[{g:'cone',a:[.12,.35,6],p:[-.05,-.95,.1],m:'leaf'}],
    leg:{x:.2,y:.6,mesh:null},
    cape:{a:[.95,1.85],p:[0,1.9,-.38],rx:.1,m:'capeM'},
    weapon:'druid_staff', weaponMount:'armR', weaponPos:[.05,-.85,.12],
  },
  /* ✝️ 人类圣骑士：白金板甲 + 圣锤 */
  paladin:{
    mats:{
      armor:{c:0xe8e0d0,r:.35,mt:.75}, armorDark:{c:0xc0b8a8,r:.4,mt:.7},
      gold:{c:0xd4af37,r:.3,mt:.9}, skin:{c:0xd8a37a,r:.8},
      capeM:{c:0xc9a06a,r:.85,ds:true},
    },
    parts:[
      {g:'box',a:[.9,1.15,.52],p:[0,1.68,0],m:'armor'},
      {g:'box',a:[.94,.18,.56],p:[0,1.12,0],m:'gold'},
      {g:'box',a:[.82,.34,.48],p:[0,.92,0],m:'armorDark'},
      {g:'box',a:[.48,.48,.46],p:[0,2.5,0],m:'skin'},
      {g:'cyl',a:[.34,.36,.22,8],p:[0,2.82,0],m:'gold'},
      {g:'oct',a:[.14,0],p:[0,2.15,.36],m:'gold'},
      {g:'sph',a:[.3,8,6,0,6.28,0,1.7],p:[.6,2.2,0],m:'armorDark'},
      {g:'sph',a:[.3,8,6,0,6.28,0,1.7],p:[-.6,2.2,0],m:'armorDark'},
    ],
    arm:{x:.6,y:2.15,mesh:{g:'box',a:[.26,.85,.26],p:[0,-.42,0],m:'armor'}},
    armExtraL:[
      {g:'cyl',a:[.48,.48,.08,8],p:[-.12,-.8,.15],r:[0,Math.PI/2,Math.PI/2],m:'gold'},
      {g:'oct',a:[.1,0],p:[-.18,-.8,.15],m:'gold'},
    ],
    leg:{x:.26,y:.9,mesh:{g:'box',a:[.3,.9,.3],p:[0,-.45,0],m:'armorDark'}},
    cape:{a:[.92,1.55],p:[0,1.65,-.34],rx:.12,m:'capeM'},
    weapon:'sword', weaponMount:'armR', weaponPos:[0,-.85,.1],
  },
};

/* ============================================================
   人形基座：rig.js 真骨架层级 + 兼容 userData.armR/legR/cape
   CLASS_LOOK = HUMANOIDS 键 + CLASS_LOOK_META（新增职业只加一条配置）
   ============================================================ */
const CLASS_LOOK=(function(){
  const o={};
  for(const k in HUMANOIDS){
    o[k]=Object.assign({id:k, humanoid:k}, (typeof CLASS_LOOK_META!=="undefined"&&CLASS_LOOK_META[k])||{});
  }
  return o;
})();

function buildHumanoid(cfg){
  const lookKey=cfg&&cfg._look;
  const meta=(typeof CLASS_LOOK_META!=="undefined"&&lookKey&&CLASS_LOOK_META[lookKey])||cfg.meta||null;
  const c=meta?Object.assign({},cfg,{meta:meta}):cfg;
  if(typeof assembleHumanoidRig==="function"){
    return assembleHumanoidRig(c,{
      makeMats, prim, addParts, buildWeapon, GEO,
    });
  }
  /* 无 rig.js 时的旧平铺回退 */
  const g=new THREE.Group();
  const M=makeMats(cfg.mats);
  addParts(g,cfg.parts,M);
  const armR=new THREE.Group(); armR.position.set(cfg.arm.x,cfg.arm.y,0);
  const armL=new THREE.Group(); armL.position.set(-cfg.arm.x,cfg.arm.y,0);
  if(cfg.arm.mesh){armR.add(prim(cfg.arm.mesh,M));armL.add(prim(cfg.arm.mesh,M));}
  if(cfg.armExtraR)addParts(armR,cfg.armExtraR,M);
  if(cfg.armExtraL)addParts(armL,cfg.armExtraL,M);
  g.add(armR); g.add(armL);
  const legR=new THREE.Group(); legR.position.set(cfg.leg.x,cfg.leg.y,0);
  const legL=new THREE.Group(); legL.position.set(-cfg.leg.x,cfg.leg.y,0);
  if(cfg.leg.mesh){legR.add(prim(cfg.leg.mesh,M));legL.add(prim(cfg.leg.mesh,M));}
  g.add(legR); g.add(legL);
  const cape=new THREE.Mesh(GEO.plane(cfg.cape.a),M[cfg.cape.m]);
  cape.position.set(...cfg.cape.p); cape.rotation.x=cfg.cape.rx; g.add(cape);
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

/* 职业构建：CLASS_LOOK / HUMANOIDS 一条配置一职业 */
function buildFromClassLook(id){
  const cfg=HUMANOIDS[id];
  if(!cfg)throw new Error("buildFromClassLook: unknown "+id);
  return buildHumanoid(Object.assign({},cfg,{_look:id}));
}
function buildPlayer(){return buildFromClassLook("warrior");}
function buildMage(){return buildFromClassLook("mage");}
function buildArcher(){return buildFromClassLook("archer");}
function buildPriest(){return buildFromClassLook("priest");}
function buildShaman(){return buildFromClassLook("shaman");}
function buildRogue(){return buildFromClassLook("rogue");}
function buildWarlock(){return buildFromClassLook("warlock");}
function buildDruid(){return buildFromClassLook("druid");}
function buildPaladin(){return buildFromClassLook("paladin");}

/* ============================================================
   Boss 模型：熔渊领主（岩浆巨人，程序化原创低模）
   ============================================================ */
function buildBoss(){
  const g=new THREE.Group();
  const magma=MAT.get("lava.magma");
  const rock=MAT.get("lava.rock");
  const fireMat=new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.92});
  const coreMat=new THREE.MeshBasicMaterial({color:0xffd060});

  /* 熔岩基座（Boss 从岩浆中升起，无腿） */
  const base=new THREE.Mesh(new THREE.CylinderGeometry(4.2,6.5,3,10),rock);
  base.position.y=1.2; g.add(base);
  const lavaSkirt=new THREE.Mesh(new THREE.CylinderGeometry(5,7.4,1,12),magma);
  lavaSkirt.position.y=.2; g.add(lavaSkirt);
  /* 升起/沉入涟漪环（render-only，由 main 缩放） */
  const ripple=new THREE.Mesh(new THREE.RingGeometry(5.2,6.8,24),
    new THREE.MeshBasicMaterial({color:0xff8030,transparent:true,opacity:.35,side:THREE.DoubleSide}));
  ripple.rotation.x=-Math.PI/2; ripple.position.y=.08; ripple.visible=false; g.add(ripple);

  const torso=new THREE.Mesh(new THREE.DodecahedronGeometry(4.4,0),magma);
  torso.scale.set(1.15,1.25,.95); torso.position.y=7.4; g.add(torso);
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(1.15,0),coreMat);
  core.position.set(0,7.9,3.2); g.add(core);

  const shL=new THREE.Mesh(new THREE.DodecahedronGeometry(2.5,0),rock); shL.position.set(-5.6,10.6,0); g.add(shL);
  const shR=new THREE.Mesh(new THREE.DodecahedronGeometry(2.5,0),rock); shR.position.set(5.6,10.6,0); g.add(shR);
  [[-5.6,12.6],[5.6,12.6]].forEach(([x,y])=>{
    const f=new THREE.Mesh(new THREE.ConeGeometry(1.2,2.8,7),fireMat); f.position.set(x,y,0);
    f.userData.flame=true; g.add(f);
    const f2=new THREE.Mesh(new THREE.ConeGeometry(.7,1.8,6),coreMat); f2.position.set(x,y+.3,0);
    f2.userData.flame=true; g.add(f2);
  });

  const head=new THREE.Mesh(new THREE.DodecahedronGeometry(1.7,0),magma);
  head.scale.set(1,1.15,.9); head.position.y=12.6; g.add(head);
  for(let i=0;i<7;i++){
    const a=(i/7)*Math.PI*1.9-Math.PI*.95;
    const h=i===3?3.4:rand(1.6,2.5);
    const spike=new THREE.Mesh(new THREE.ConeGeometry(.42,h,5),fireMat);
    spike.position.set(Math.sin(a)*1.5,13.6+h*.35,Math.cos(a)*.5-.3);
    spike.rotation.z=-Math.sin(a)*.5; spike.userData.flame=true; g.add(spike);
  }
  [[-.6],[.6]].forEach(([x])=>{
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.3,8,8),coreMat);
    eye.position.set(x,12.8,1.5); g.add(eye);
  });

  /* 左臂：肩 → 上臂 → 前臂 → 掌（肘关节） */
  const armL=new THREE.Group(); armL.position.set(-5.6,10.2,0);
  const upperL=new THREE.Group(); armL.add(upperL);
  const lArm=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.35,3.2,7),magma);
  lArm.position.set(-.7,-1.6,0); lArm.rotation.z=.35; upperL.add(lArm);
  const forearmL=new THREE.Group(); forearmL.position.set(-1.4,-3.2,0); upperL.add(forearmL);
  const lFore=new THREE.Mesh(new THREE.CylinderGeometry(.95,1.15,2.8,7),magma);
  lFore.position.set(-.6,-1.3,0); lFore.rotation.z=.25; forearmL.add(lFore);
  const lHand=new THREE.Mesh(new THREE.DodecahedronGeometry(1.6,0),rock);
  lHand.position.set(-1.2,-2.8,0); forearmL.add(lHand);
  for(let i=0;i<4;i++){
    const claw=new THREE.Mesh(new THREE.ConeGeometry(.35,1.6,5),rock);
    claw.position.set(-1.2+(i-1.5)*.7,-4.0,.4); claw.rotation.x=2.9; forearmL.add(claw);
  }
  g.add(armL);

  /* 右臂 + 烈焰巨锤：肩 → 上臂 → 前臂/锤 */
  const armR=new THREE.Group(); armR.position.set(5.6,10.2,0);
  const upperR=new THREE.Group(); armR.add(upperR);
  const rArm=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.35,3.2,7),magma);
  rArm.position.set(.7,-1.6,0); rArm.rotation.z=-.35; upperR.add(rArm);
  const forearmR=new THREE.Group(); forearmR.position.set(1.4,-3.2,0); upperR.add(forearmR);
  const rFore=new THREE.Mesh(new THREE.CylinderGeometry(.95,1.15,2.6,7),magma);
  rFore.position.set(.55,-1.2,0); rFore.rotation.z=-.2; forearmR.add(rFore);
  const rHand=new THREE.Mesh(new THREE.DodecahedronGeometry(1.5,0),rock);
  rHand.position.set(1.1,-2.6,0); forearmR.add(rHand);
  const hammer=new THREE.Group(); hammer.position.set(1.1,-2.6,0);
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
  forearmR.add(hammer); g.add(armR);

  const bossLight=new THREE.PointLight(0xff6a20,2.2,60,1.8);
  bossLight.position.set(0,10,4); g.add(bossLight);

  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData={armR,armL,forearmR,forearmL,core,bossLight,ripple,kind:"boss",
    anim:{state:"idle",walkPhase:0,attackAnim:0,deathRoll:0}};
  return g;
}

/* ============================================================
   黑曜女皇（STEP 28）：黑龙女王 · 程序化龙形低模
   ============================================================ */
function buildOnyxia(){
  const g=new THREE.Group();
  const scale=MAT.get("_",{color:0x1a1a22,roughness:.75,flatShading:true,
    emissive:0x220808,emissiveIntensity:.25});
  const scaleD=MAT.get("_",{color:0x0c0c12,roughness:.9,flatShading:true});
  const belly=MAT.get("_",{color:0x3a2820,roughness:.85,flatShading:true,
    emissive:0x661a00,emissiveIntensity:.2});
  const horn=MAT.get("bone.horn");
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
      MAT.get("_",{color:0x14141c,roughness:.95,side:THREE.DoubleSide,
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

/* 野怪族群工厂已迁至 creatures.js（plan-V2 · R6）：
   buildQuadruped / buildElemental / buildHumanoidMob / QUADS / MOB_LOOK 等 */

/* ---------------- 蹄人营地 NPC（缩小精致版；vendor/spirit/tint 共用） ---------------- */
function buildElder(){
  const g=new THREE.Group();
  const fur=MAT.get("fur.centaur");
  const furD=MAT.get("fur.centaurD");
  const cloth=MAT.get("cloth.centaur",{color:0x8a4a2a,roughness:.88,flatShading:true});
  const clothTrim=MAT.get("fur.hide",{roughness:.55,metalness:.35,flatShading:true});
  const hornM=MAT.get("bone.ivory");
  const wood=MAT.get("wood.prop");
  const featherM=MAT.get("bone.feather",{color:0xe8e4d0,roughness:.9,flatShading:true});
  const eyeM=MAT.get("eye.centaur",{color:0x1a1208,roughness:.4,emissive:0xffaa40,emissiveIntensity:.15});
  const noseM=MAT.get("fur.nose",{color:0x3a2818,roughness:.85});

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

/* 墓地石碑 + 幽光（plan-v4 STEP 17） */
function buildGraveyard(cfg){
  const c=Object.assign({size:1},cfg||{});
  const g=new THREE.Group();
  const stone=MAT.get("stone.grave",{color:0x6a7080,roughness:.95,flatShading:true});
  const slab=new THREE.Mesh(new THREE.BoxGeometry(1.2,.14,1.7),stone);
  slab.position.y=.07; g.add(slab);
  const upright=new THREE.Mesh(new THREE.BoxGeometry(.72,1.55,.24),stone);
  upright.position.y=.88; g.add(upright);
  const cap=new THREE.Mesh(new THREE.BoxGeometry(.85,.22,.32),stone);
  cap.position.y=1.72; g.add(cap);
  const glow=new THREE.Mesh(
    new THREE.SphereGeometry(.5,10,8),
    new THREE.MeshBasicMaterial({color:0x88bbff,transparent:true,opacity:.38,depthWrite:false})
  );
  glow.position.set(0,1.35,.55); g.add(glow);
  const ring=new THREE.Mesh(
    new THREE.RingGeometry(.95,1.25,20),
    new THREE.MeshBasicMaterial({color:0x6688cc,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false})
  );
  ring.rotation.x=-Math.PI/2; ring.position.y=.04; g.add(ring);
  g.scale.setScalar(c.size);
  g.userData.building="graveyard";
  g.traverse(o=>{
    if(!o.isMesh)return;
    if(o.material&&o.material.transparent){o.castShadow=false;o.receiveShadow=false;}
    else{o.castShadow=true;o.receiveShadow=true;}
  });
  return g;
}

/** 灵魂落点注册表（营地 / 副本门口）；releaseSpirit 选最近 */
const GRAVEYARDS=[];
function registerGraveyard(zoneId,x,z,kind){
  const k=kind||"camp";
  for(let i=GRAVEYARDS.length-1;i>=0;i--){
    if(GRAVEYARDS[i].zoneId===zoneId&&GRAVEYARDS[i].kind===k)GRAVEYARDS.splice(i,1);
  }
  GRAVEYARDS.push({zoneId,x:+x,z:+z,kind:k});
}
function nearestGraveyardSpawn(zoneId,fromX,fromZ){
  const zid=zoneId||"mulgore";
  const list=GRAVEYARDS.filter(g=>g.zoneId===zid);
  if(!list.length){
    return (typeof BAL!=="undefined"&&BAL.death&&BAL.death.spawns&&BAL.death.spawns[zid])
      ||(BAL.death&&BAL.death.worldSpawn)||{x:0,z:0};
  }
  let best=list[0], bestD=Infinity;
  const hasFrom=fromX!=null&&fromZ!=null&&isFinite(fromX)&&isFinite(fromZ);
  for(const g of list){
    const d=hasFrom?Math.hypot(fromX-g.x,fromZ-g.z):0;
    if(d<bestD){bestD=d;best=g;}
  }
  return {x:best.x,z:best.z,kind:best.kind};
}

/* ============================================================
   城镇建筑工厂（plan-v1 · V1-A1）
   几何不含随机；调色盘分区；摆放由 placeProp / 调用方负责
   ============================================================ */
const BUILD_PAL={
  mulgore:{wood:0x6a4a28,woodD:0x3a2810,roof:0x8a5a30,hide:0xc9a06a,flag:0xc04020,stake:0x4a3020},
  barrens:{wood:0x7a5a30,woodD:0x4a3020,roof:0xa87840,hide:0xb89050,flag:0xc04020,stake:0x5a3820},
  durotar:{wood:0x6a3a18,woodD:0x3a1e0c,roof:0x8a4820,hide:0xc07040,flag:0xd03018,stake:0x4a2810},
  ashen:{wood:0x3a2a20,woodD:0x1a120c,roof:0x5a3020,hide:0x8a5040,flag:0xc02810,stake:0x2a1810},
  orgrimmar:{wood:0x5a2810,woodD:0x2a1008,roof:0x8a2810,hide:0xc04020,flag:0xd02810,stake:0x3a1408},
  blackrock:{wood:0x2a1a14,woodD:0x120c08,roof:0x4a2010,hide:0x6a3020,flag:0xc02810,stake:0x1a1008},
};

function placeProp(root,mesh,x,z,rotY){
  if(!root||!mesh)return mesh;
  /* 赤蹄草甸场景根贴 heightAt；其他 zone 保持平坦 y=0 */
  const useH=typeof heightAt==="function"&&typeof sceneWorld!=="undefined"&&root===sceneWorld;
  mesh.position.set(x,useH?heightAt(x,z):0,z);
  if(rotY!=null)mesh.rotation.y=rotY;
  root.add(mesh);
  return mesh;
}

/** 木屋：优先 CC0 GLB（A 线），否则程序化木桁架 */
function buildHut(cfg){
  const c=Object.assign({
    wood:BUILD_PAL.mulgore.wood, woodD:BUILD_PAL.mulgore.woodD,
    roof:BUILD_PAL.mulgore.roof, w:8.0, d:6.5, h:4.5, size:1, door:true,
    stone:0x6a5a50,
  },cfg||{});
  /* 仅 GLB，不回退程序化 */
  if(typeof ASSETS==="undefined"||!ASSETS.isReady()){
    console.warn("[buildHut] ASSETS 未就绪，跳过（应在 whenReady 后摆建筑）");
    return new THREE.Group();
  }
  const seed=(c.seed!=null?c.seed:((c.w*1009)^(c.d*9176)^(Math.floor((c.roof||0)*10))))>>>0;
  let kind=c.glbKind||(c.inn?"inn":(c.blacksmith?"blacksmith":null));
  if(!kind){
    const roll=seed%11;
    kind=roll===0?"blacksmith":(roll===1?"inn":"house");
  }
  const glb=ASSETS.cloneBuilding(kind,{
    seed,
    size:c.size,
    targetH:c.h!=null?c.h*1.45:(kind==="inn"?7.8:kind==="blacksmith"?6.6:6.8),
    targetW:c.w!=null?c.w:(kind==="inn"?12:8.5),
    targetD:c.d!=null?c.d:(kind==="inn"?8:7.2),
  });
  if(glb)return glb;
  console.warn("[buildHut] GLB 缺失",kind);
  return new THREE.Group();
}

function buildHutProcedural(c){
  const g=new THREE.Group();
  const wood=MAT.get("wood.build",{color:c.wood,roughness:.92,flatShading:true});
  const woodD=MAT.get("wood.buildD",{color:c.woodD,roughness:.95,flatShading:true});
  const roofM=MAT.get("wood.roof",{color:c.roof,roughness:1,flatShading:true});
  const stoneM=MAT.get("stone.build",{color:c.stone,roughness:1,flatShading:true});
  const goldM=MAT.get("trim.hut",{color:0xd9a441,r:.3,mt:.9});
  /* 地基石（更大更密） */
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2;
    const f=new THREE.Mesh(new THREE.DodecahedronGeometry(.45,0),stoneM);
    f.position.set(Math.cos(a)*c.w*.5,.12,Math.sin(a)*c.d*.48); g.add(f);
  }
  /* 墙体 */
  const body=new THREE.Mesh(new THREE.BoxGeometry(c.w,c.h,c.d),wood);
  body.position.y=c.h/2; g.add(body);
  /* 横梁框架（内外双层） */
  for(const y of [c.h*.2,c.h*.4,c.h*.6,c.h*.8]){
    for(const s of [1,-1]){
      const beam=new THREE.Mesh(new THREE.BoxGeometry(c.w+.08,.1,.08),woodD);
      beam.position.set(0,y,s*c.d/2); g.add(beam);
    }
  }
  /* 四角立柱（加粗） */
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{
    const post=new THREE.Mesh(new THREE.BoxGeometry(.4,c.h+.3,.4),woodD);
    post.position.set(sx*(c.w/2-.2),c.h/2+.15,sz*(c.d/2-.2)); g.add(post);
  });
  /* 前廊立柱 */
  for(let i=0;i<3;i++){
    const porchPost=new THREE.Mesh(new THREE.CylinderGeometry(.14,.18,c.h*.5,6),woodD);
    porchPost.position.set(c.w*.3-i*c.w*.3,0,-c.d/2-.4); g.add(porchPost);
  }
  const porchRoof=new THREE.Mesh(new THREE.BoxGeometry(c.w*.9,.1,1.2),roofM);
  porchRoof.position.set(0,c.h*.5,-c.d/2-.5); g.add(porchRoof);
  /* 窗户（前墙和侧墙） */
  [[-1,.3],[1,.3],[0,-1]].forEach(([sx,sz],i)=>{
    const wx=sx?c.w*.32:0, wz=sz?c.d/2:0;
    const win=new THREE.Mesh(new THREE.BoxGeometry(.8,.9,.06),
      new THREE.MeshBasicMaterial({color:0x3a5a7a,transparent:true,opacity:.45}));
    win.position.set(sx?wx:0,c.h*.6,wz?0:(c.d/2+.01));
    if(sx){win.position.x=sx*wx;win.position.z=wz;}
    g.add(win);
    /* 窗框十字 */
    for(const d of [-1,1]){
      const bar=new THREE.Mesh(new THREE.BoxGeometry(.04,.9,.08),woodD);
      bar.position.set(sx?wx:0,c.h*.6,win.position.z); if(sx)bar.position.x=sx*wx; g.add(bar);
    }
    const barH=new THREE.Mesh(new THREE.BoxGeometry(.8,.04,.08),woodD);
    barH.position.set(sx?wx:0,c.h*.6,win.position.z); g.add(barH);
    /* 花箱 */
    const box=new THREE.Mesh(new THREE.BoxGeometry(.9,.15,.15),woodD);
    box.position.set(sx?wx:0,c.h*.16,win.position.z); g.add(box);
    for(let k=0;k<3;k++){
      const fl=new THREE.Mesh(new THREE.SphereGeometry(.06,5,5),
        new THREE.MeshBasicMaterial({color:[0xff4466,0xffaa44,0xff66aa][k%3]}));
      fl.position.set(sx?wx+(k-1)*.12:0,c.h*.22,win.position.z); g.add(fl);
    }
  });
  /* 门框 + 门 */
  if(c.door){
    [[-.7,.14],[.7,.14]].forEach(([x,th])=>{
      const jamb=new THREE.Mesh(new THREE.BoxGeometry(th,2.6,.14),woodD);
      jamb.position.set(x,1.2,c.d/2+.02); g.add(jamb);
    });
    const lintel=new THREE.Mesh(new THREE.BoxGeometry(1.6,.14,.14),woodD);
    lintel.position.set(0,2.5,c.d/2+.02); g.add(lintel);
    const door=new THREE.Mesh(new THREE.BoxGeometry(1.3,2.2,.12),woodD);
    door.position.set(0,1.1,c.d/2+.04); g.add(door);
    /* 门板纹路 */
    for(let i=0;i<3;i++){
      const plank=new THREE.Mesh(new THREE.BoxGeometry(1.24,.08,.14),wood);
      plank.position.set(0,.22+i*.55,c.d/2+.06); g.add(plank);
    }
    const handle=new THREE.Mesh(new THREE.SphereGeometry(.06,6,5),goldM);
    handle.position.set(.6,1.1,c.d/2+.1); g.add(handle);
  }
  /* 双坡顶（更大挑檐） */
  const roofL=new THREE.Mesh(new THREE.BoxGeometry(c.w+1.2,.32,c.d*.78),roofM);
  roofL.position.set(0,c.h+.5,-c.d*.22); roofL.rotation.x=.42; g.add(roofL);
  const roofR=new THREE.Mesh(new THREE.BoxGeometry(c.w+1.2,.32,c.d*.78),roofM);
  roofR.position.set(0,c.h+.5,c.d*.22); roofR.rotation.x=-.42; g.add(roofR);
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(c.w+.8,.28,.5),woodD);
  ridge.position.set(0,c.h+1.0,0); g.add(ridge);
  /* 烟囱（双烟囱） */
  for(const sx of [-1,1]){
    const chim=new THREE.Mesh(new THREE.BoxGeometry(.6,1.4,.6),stoneM);
    chim.position.set(sx*c.w*.28,c.h+.9,0); g.add(chim);
    const chimTop=new THREE.Mesh(new THREE.BoxGeometry(.7,.14,.7),stoneM);
    chimTop.position.set(sx*c.w*.28,c.h+1.6,0); g.add(chimTop);
    const smoke=new THREE.Mesh(new THREE.CylinderGeometry(.2,.12,.8,6),
      new THREE.MeshBasicMaterial({color:0x888888,transparent:true,opacity:.12}));
    smoke.position.set(sx*c.w*.28,c.h+2.2,0); g.add(smoke);
  }
  /* 屋檐装饰 */
  for(let i=0;i<5;i++){
    const eave=new THREE.Mesh(new THREE.ConeGeometry(.08,.25,4),woodD);
    eave.position.set((i-2)*c.w*.2,c.h+.45,-c.d/2-.05); g.add(eave);
    eave.position.set((i-2)*c.w*.2,c.h+.45,c.d/2+.05); g.add(eave);
  }
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  g.userData.building="hut";
  return g;
}

/** 帐篷：优先 CC0 GLB（A 线），否则程序化兽皮帐篷 */
function buildTent(cfg){
  const c=Object.assign({
    hide:BUILD_PAL.mulgore.hide, stake:BUILD_PAL.mulgore.stake,
    r:8.0, h:10.0, stakes:12, size:1,
  },cfg||{});
  if(typeof ASSETS==="undefined"||!ASSETS.isReady()){
    console.warn("[buildTent] ASSETS 未就绪");
    return new THREE.Group();
  }
  const seed=(c.seed!=null?c.seed:((c.r*7919)^(c.h*3343)))>>>0;
  const glb=ASSETS.cloneBuilding("tent",{
    seed,
    size:c.size,
    targetH:Math.min(6.2,(c.h||10)*.55),
    targetW:Math.max(5.5,(c.r||8)*1.1),
    targetD:Math.max(5.5,(c.r||8)*1.1),
  });
  if(glb)return glb;
  console.warn("[buildTent] GLB 缺失");
  return new THREE.Group();
}

function buildTentProcedural(c){
  const g=new THREE.Group();
  const hide=MAT.get("fur.tent",{color:c.hide,roughness:.95,flatShading:true});
  const hideD=MAT.get("fur.hideDark",{color:c.hide,roughness:.98,flatShading:true});
  const stakeM=MAT.get("wood.stake",{color:c.stake,roughness:1,flatShading:true});
  const goldM=MAT.get("trim.tent",{color:0xd9a441,r:.3,mt:.9});
  const bannerM=MAT.get("cloth.banner",{color:0xc04020,roughness:.9,side:THREE.DoubleSide});
  /* 地毡 */
  const rug=new THREE.Mesh(new THREE.CylinderGeometry(c.r*1.05,c.r*1.05,.08,12),
    MAT.get("fur.rug",{color:0x4a3020,roughness:1,flatShading:true}));
  rug.position.y=.04; g.add(rug);
  /* 主锥体（大分段） */
  const cone=new THREE.Mesh(new THREE.ConeGeometry(c.r,c.h,11),hide);
  cone.position.y=c.h/2; g.add(cone);
  /* 缝线环（5 圈） */
  for(const t of [.15,.32,.50,.68,.85]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(c.r*(1-t*.58),.06,6,18),hideD);
    ring.rotation.x=Math.PI/2;
    ring.position.y=c.h*t;
    ring.scale.set(1,1,.35);
    g.add(ring);
  }
  /* 金边底环 */
  const baseRing=new THREE.Mesh(new THREE.TorusGeometry(c.r+.08,.08,6,18),goldM);
  baseRing.rotation.x=Math.PI/2;
  baseRing.position.y=.12;
  g.add(baseRing);
  /* 门帘（三重对开） */
  [[-.6,.4],[0,.15],[.6,-.4]].forEach(([x,rz])=>{
    const flap=new THREE.Mesh(new THREE.PlaneGeometry(c.r*.35,c.h*.5),hideD);
    flap.position.set(x,c.h*.25,c.r*.72);
    flap.rotation.x=-.08; flap.rotation.z=rz;
    g.add(flap);
  });
  /* 旗帜（左右） */
  [-1,1].forEach(s=>{
    const flagPole=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.8,5),stakeM);
    flagPole.position.set(s*c.r*.8,.5,0); g.add(flagPole);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.0,.6),bannerM);
    flag.position.set(s*c.r*.8,1.2,0); flag.rotation.y=s*.2; g.add(flag);
  });
  /* 木桩（12 根 + 拉绳） */
  const n=Math.max(6,c.stakes|0);
  for(let k=0;k<n;k++){
    const a=k/n*Math.PI*2;
    const st=new THREE.Mesh(new THREE.ConeGeometry(.28,c.h*.45,6),stakeM);
    st.position.set(Math.cos(a)*c.r*.92,c.h*.18,Math.sin(a)*c.r*.92);
    g.add(st);
    const rope=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,c.h*.35,4),
      new THREE.MeshBasicMaterial({color:0x6a5040}));
    rope.position.set(Math.cos(a)*c.r*.72,c.h*.25,Math.sin(a)*c.r*.72);
    rope.rotation.x=Math.sin(a)*.4;
    rope.rotation.z=-Math.cos(a)*.4;
    g.add(rope);
  }
  /* 撑杆（交叉 6 根） */
  for(let k=0;k<6;k++){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,c.h*.35,5),stakeM);
    pole.position.set(Math.cos(k)* .5,c.h+.15,Math.sin(k)*.5);
    pole.rotation.set(.2*(k-1),.15*(k-1),0);
    g.add(pole);
  }
  /* 顶冠 */
  const crown=new THREE.Mesh(new THREE.SphereGeometry(.28,8,8),goldM);
  crown.position.set(0,c.h+.15,0); g.add(crown);
  const topFeather=new THREE.Mesh(new THREE.ConeGeometry(.1,1.0,5),hideD);
  topFeather.position.set(0,c.h+.55,0); g.add(topFeather);
  const topFeather2=new THREE.Mesh(new THREE.ConeGeometry(.08,.8,5),bannerM);
  topFeather2.position.set(.15,c.h+.45,.1); topFeather2.rotation.x=.3; g.add(topFeather2);
  /* 内部暖光 */
  const innerGlow=new THREE.Mesh(new THREE.SphereGeometry(c.r*.55,10,8),
    new THREE.MeshBasicMaterial({color:0xffd080,transparent:true,opacity:.04,depthWrite:false}));
  innerGlow.position.set(0,c.h*.35,0); g.add(innerGlow);
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="tent";
  return g;
}

/** 木栅栏 V2：加粗加高 + 斜撑 + 尖端 + 横梁重叠 */
function buildFence(cfg){
  const c=Object.assign({
    wood:BUILD_PAL.mulgore.wood, woodD:BUILD_PAL.mulgore.woodD,
    length:12, posts:7, h:2.2, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const wood=MAT.get("wood.build",{color:c.wood,roughness:.92,flatShading:true});
  const woodD=MAT.get("wood.buildD",{color:c.woodD,roughness:.95,flatShading:true});
  const n=Math.max(3,c.posts|0);
  const step=c.length/(n-1);
  for(let i=0;i<n;i++){
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.14,.18,c.h,5),woodD);
    post.position.set(i*step-c.length/2,c.h/2,0); g.add(post);
    /* 尖顶 */
    const tip=new THREE.Mesh(new THREE.ConeGeometry(.12,.3,5),woodD);
    tip.position.set(i*step-c.length/2,c.h+.15,0); g.add(tip);
  }
  /* 横梁（上下双轨，加厚） */
  for(const y of [c.h*.28,c.h*.55,c.h*.78]){
    const rail=new THREE.Mesh(new THREE.BoxGeometry(c.length,.16,.12),wood);
    rail.position.set(0,y,0); g.add(rail);
  }
  /* 斜撑（每隔一段交叉） */
  for(let i=0;i<n-1;i+=2){
    const x1=i*step-c.length/2, x2=(i+1)*step-c.length/2;
    const brace=new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x2-x1),.08,.08),wood);
    brace.position.set((x1+x2)/2,c.h*.4,0);
    brace.rotation.z=i%2?.35:-.35;
    g.add(brace);
  }
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="fence";
  return g;
}

/** 瞭望塔 V2：加高 + 双层平台 + 楼梯 + 围栏全环绕 + 旗帜 + 灯笼 */
function buildWatchtower(cfg){
  const c=Object.assign({
    wood:BUILD_PAL.barrens.wood, woodD:BUILD_PAL.barrens.woodD,
    flag:BUILD_PAL.barrens.flag, size:1,
  },cfg||{});
  if(typeof ASSETS==="undefined"||!ASSETS.isReady()){
    console.warn("[buildWatchtower] ASSETS 未就绪");
    return new THREE.Group();
  }
  const seed=(c.seed!=null?c.seed:0x707070)^0xBE11;
  const glb=ASSETS.cloneBuilding("tower",{
    seed:seed>>>0, size:c.size,
    targetH:11, targetW:5.2, targetD:5.2,
  });
  if(glb){glb.userData.building="watchtower";return glb;}
  console.warn("[buildWatchtower] GLB 缺失");
  return new THREE.Group();
}

function buildWatchtowerProcedural(c){
  const g=new THREE.Group();
  const wood=MAT.get("wood.build",{color:c.wood,roughness:.9,flatShading:true});
  const woodD=MAT.get("wood.buildD",{color:c.woodD,roughness:.92,flatShading:true});
  const flagM=MAT.get("cloth.flag",{color:c.flag,roughness:.8,side:THREE.FrontSide});
  const goldM=MAT.get("trim.tower",{color:0xd9a441,r:.3,mt:.9});
  /* 地基：石台 */
  const stoneM=MAT.get("stone.found",{color:0x6a5a50,roughness:1,flatShading:true});
  const found=new THREE.Mesh(new THREE.BoxGeometry(5.5,1.0,5.5),stoneM);
  found.position.y=.5; g.add(found);
  /* 底层（粗柱 + 开放式） */
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2+.45;
    const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.22,.28,3.5,6),woodD);
    pillar.position.set(Math.cos(a)*2.2,2.25,Math.sin(a)*2.2); g.add(pillar);
  }
  const floor1=new THREE.Mesh(new THREE.BoxGeometry(4.8,.2,4.8),wood);
  floor1.position.y=3.6; g.add(floor1);
  /* 中层塔身 */
  const mid=new THREE.Mesh(new THREE.BoxGeometry(3.8,3.6,3.8),woodD);
  mid.position.y=5.5; g.add(mid);
  /* 腰线 */
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2+.45;
    const bracket=new THREE.Mesh(new THREE.BoxGeometry(.6,.12,.6),wood);
    bracket.position.set(Math.cos(a)*2.1,7.5,Math.sin(a)*2.1); g.add(bracket);
  }
  /* 顶层平台 */
  const top=new THREE.Mesh(new THREE.BoxGeometry(5.2,.35,5.2),wood);
  top.position.y=7.7; g.add(top);
  /* 顶棚 */
  const roof=new THREE.Mesh(new THREE.ConeGeometry(3.0,1.8,8),woodD);
  roof.position.y=9.2; g.add(roof);
  const roofTip=new THREE.Mesh(new THREE.ConeGeometry(.2,.6,6),goldM);
  roofTip.position.y=10.1; g.add(roofTip);
  /* 围栏（全环绕 + 横向栏板） */
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2;
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,1.3,5),woodD);
    post.position.set(Math.cos(a)*2.8,8.2,Math.sin(a)*2.8); g.add(post);
    if(i%2===0){
      const rail=new THREE.Mesh(new THREE.BoxGeometry(.08,.65,2.1),wood);
      rail.position.set(Math.cos(a)*2.8,8.6,Math.sin(a)*2.8);
      rail.rotation.y=a+Math.PI/2;
      g.add(rail);
    }
  }
  /* 旗杆（双面旗帜） */
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,3.0,5),wood);
  pole.position.set(.3,9.5,0); g.add(pole);
  [[0,0],[1,0]].forEach(([sx,sz])=>{
    const flag=new THREE.Mesh(new THREE.BoxGeometry(2.0,1.1,.06),flagM);
    flag.position.set(1.2+sx*.1,9.6,sz*.1); g.add(flag);
  });
  const flagPoleTip=new THREE.Mesh(new THREE.SphereGeometry(.08,6,6),goldM);
  flagPoleTip.position.set(.3,11.0,0); g.add(flagPoleTip);
  /* 灯笼 */
  for(let i=0;i<2;i++){
    const a=i*Math.PI;
    const lantern=new THREE.Mesh(new THREE.BoxGeometry(.3,.4,.3),
      new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.7}));
    lantern.position.set(Math.cos(a)*2.2,8.0,Math.sin(a)*2.2); g.add(lantern);
    const lRing=new THREE.Mesh(new THREE.TorusGeometry(.18,.04,5,8),goldM);
    lRing.position.set(Math.cos(a)*2.2,8.25,Math.sin(a)*2.2); g.add(lRing);
  }
  /* 楼梯（斜木条示意） */
  for(let i=0;i<4;i++){
    const step=new THREE.Mesh(new THREE.BoxGeometry(1.8,.1,.4),wood);
    step.position.set(-2.8,1.4+i*.5,-1.5-i*.35);
    step.rotation.y=.2; step.rotation.x=-.15;
    g.add(step);
  }
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="watchtower";
  return g;
}

/** 营火 V2：加大 + 更多柴堆 + 4 层火焰 + 火星 + 灰烬环 + 烤肉架 */
function buildCampfire(cfg){
  const c=Object.assign({
    stone:0x6a5040, flame:0xffa030, light:0xff8a30,
    r:1.6, intensity:1.8, dist:25, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const stoneM=MAT.get("rock.camp",{color:c.stone,roughness:1,flatShading:true});
  const woodM=MAT.get("wood.prop",{color:0x4a3020,roughness:1,flatShading:true});
  /* 灰烬环 */
  const ashRing=new THREE.Mesh(new THREE.RingGeometry(c.r*.6,c.r*1.2,20),
    new THREE.MeshBasicMaterial({color:0x2a1a10,transparent:true,opacity:.35,side:THREE.DoubleSide}));
  ashRing.rotation.x=-Math.PI/2; ashRing.position.y=.03; g.add(ashRing);
  /* 围石（更多更密） */
  for(let k=0;k<9;k++){
    const a=k/9*Math.PI*2;
    const st=new THREE.Mesh(new THREE.DodecahedronGeometry(.42,0),stoneM);
    st.position.set(Math.cos(a)*c.r,.28,Math.sin(a)*c.r); g.add(st);
  }
  /* 柴堆（交错两层） */
  for(let k=0;k<6;k++){
    const log=new THREE.Mesh(new THREE.CylinderGeometry(.14,.16,1.6,6),woodM);
    log.rotation.z=Math.PI/2;
    log.rotation.y=k/6*Math.PI*2;
    log.position.set(Math.cos(k)* .3,.2,Math.sin(k)*.3); g.add(log);
  }
  for(let k=0;k<4;k++){
    const log=new THREE.Mesh(new THREE.CylinderGeometry(.1,.12,1.2,6),woodM);
    log.rotation.z=Math.PI/2;
    log.rotation.y=k/4*Math.PI*2+.4;
    log.position.set(Math.cos(k)* .2,.4,Math.sin(k)*.2); g.add(log);
  }
  /* 烤肉架 */
  const spit=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.8,5),woodM);
  spit.rotation.z=Math.PI/2;
  spit.position.set(.1,.6,.1); g.add(spit);
  const meat=new THREE.Mesh(new THREE.SphereGeometry(.12,6,6),
    new THREE.MeshBasicMaterial({color:0x6a3018}));
  meat.position.set(.1,.6,.8); g.add(meat);
  /* 4 层火焰（更大更亮） */
  const layers=[];
  const specs=[
    {h:2.2,r:.9,y:1.4,col:c.flame,op:.92,freq:7},
    {h:1.8,r:.65,y:1.2,col:0xffcc44,op:.8,freq:10},
    {h:1.3,r:.42,y:1.0,col:0xffe080,op:.6,freq:13},
    {h:0.8,r:.25,y:.8,col:0xfff8d0,op:.35,freq:16},
  ];
  specs.forEach((s,i)=>{
    const fl=new THREE.Mesh(new THREE.ConeGeometry(s.r,s.h,8),
      new THREE.MeshBasicMaterial({color:s.col,transparent:true,opacity:s.op,depthWrite:false}));
    fl.position.y=s.y; g.add(fl);
    layers.push({mesh:fl,freq:s.freq,phase:i*1.7});
  });
  const fl=layers[0].mesh;
  const li=new THREE.PointLight(c.light,c.intensity,c.dist,1.8);
  li.position.y=2.5; g.add(li);
  if(typeof PROPS!=="undefined"&&PROPS.attachCampfireEmbers)PROPS.attachCampfireEmbers(g,0,0);
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="campfire";
  g.userData.flame={fl,li,layers};
  return g;
}

/** 图腾柱 V2：加高 + 三重彩绘环 + 双翼 + 顶雕 + 基座 + 面部 */
function buildTotem(cfg){
  const c=Object.assign({
    wood:0x5a3820, paintA:0xd94f2a, paintB:0x3a7ac9, paintC:0xf0d080, h:9.0, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const wood=MAT.get("wood.totem",{color:c.wood,roughness:.9,flatShading:true});
  const aM=MAT.get("paint.a",{color:c.paintA,roughness:.8});
  const bM=MAT.get("paint.b",{color:c.paintB,roughness:.8});
  const cM=MAT.get("paint.c",{color:c.paintC,roughness:.8});
  const goldM=MAT.get("trim.totem",{color:0xd9a441,r:.3,mt:.9});
  /* 基座 */
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.75,.9,.8,8),wood);
  base.position.y=.4; g.add(base);
  /* 主柱（分段渐细） */
  const segs=[
    {y:c.h*.18,r1:.6,r2:.55,h:c.h*.35},
    {y:c.h*.45,r1:.55,r2:.48,h:c.h*.3},
    {y:c.h*.68,r1:.48,r2:.38,h:c.h*.25},
    {y:c.h*.88,r1:.38,r2:.25,h:c.h*.2},
  ];
  segs.forEach(s=>{
    const seg=new THREE.Mesh(new THREE.CylinderGeometry(s.r2,s.r1,s.h,8),wood);
    seg.position.y=s.y; g.add(seg);
  });
  /* 彩绘环（4 层，带面纹突起） */
  [[c.h*.2,aM],[c.h*.38,bM],[c.h*.55,cM],[c.h*.72,aM]].forEach(([y,m],i)=>{
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.5,8),m);
    ring.position.y=y; g.add(ring);
    /* 面纹浮雕 */
    for(let k=0;k<3;k++){
      const ang=k/3*Math.PI*2+i*.5;
      const face=new THREE.Mesh(new THREE.BoxGeometry(.3,.35,.15),i%2?bM:aM);
      face.position.set(Math.cos(ang)*.8,y+((k%2)*.15-.08),Math.sin(ang)*.8);
      face.rotation.y=ang;
      g.add(face);
      /* 眼 */
      const eye=new THREE.Mesh(new THREE.SphereGeometry(.06,6,5),goldM);
      eye.position.set(Math.cos(ang)*.85,y+.08,Math.sin(ang)*.85);
      g.add(eye);
    }
  });
  /* 双翼（更宽更厚） */
  [-1,1].forEach(s=>{
    const wing=new THREE.Mesh(new THREE.BoxGeometry(2.2,.6,.22),bM);
    wing.position.set(s*1.1,c.h*.82,0); wing.rotation.z=s*.15; g.add(wing);
    const wingFeather=new THREE.Mesh(new THREE.ConeGeometry(.12,.6,5),cM);
    wingFeather.position.set(s*2.1,c.h*.82,0); wingFeather.rotation.z=0; g.add(wingFeather);
  });
  /* 顶雕：鸟首 */
  const headBase=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),wood);
  headBase.position.set(0,c.h*.95,0); g.add(headBase);
  const beak=new THREE.Mesh(new THREE.ConeGeometry(.12,.5,5),goldM);
  beak.position.set(0,c.h*.98,.35); beak.rotation.x=Math.PI/2; g.add(beak);
  const crest=new THREE.Mesh(new THREE.ConeGeometry(.08,.4,5),aM);
  crest.position.set(0,c.h+1.02,-.15); crest.rotation.x=-.4; g.add(crest);
  /* 顶尖 */
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.3,.8,6),wood);
  tip.position.y=c.h+1.1; g.add(tip);
  const tipGlow=new THREE.Mesh(new THREE.SphereGeometry(.08,6,6),goldM);
  tipGlow.position.y=c.h+1.5; g.add(tipGlow);
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="totem";
  return g;
}

/** 市集摊位 V2：加大加宽 + 货架 + 棚顶布帘 + 商品展示 + 挂旗 */
function buildMarketStall(cfg){
  const c=Object.assign({
    wood:BUILD_PAL.mulgore.wood, woodD:BUILD_PAL.mulgore.woodD,
    cloth:0x2a6a4a, w:4.8, d:3.2, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const wood=MAT.get("wood.build",{color:c.wood,roughness:.92,flatShading:true});
  const woodD=MAT.get("wood.buildD",{color:c.woodD,roughness:.95,flatShading:true});
  const cloth=MAT.get("cloth.stall",{color:c.cloth,roughness:.9,flatShading:true});
  const goldM=MAT.get("trim.stall",{color:0xd9a441,r:.3,mt:.9});
  /* 货台（双桌） */
  const table1=new THREE.Mesh(new THREE.BoxGeometry(c.w*.45,.2,c.d*.8),wood);
  table1.position.set(-c.w*.22,1.0,0); g.add(table1);
  const table2=new THREE.Mesh(new THREE.BoxGeometry(c.w*.45,.2,c.d*.8),wood);
  table2.position.set(c.w*.22,1.0,0); g.add(table2);
  /* 桌腿 */
  [[-1,0],[1,0],[0,-1],[0,1]].forEach(([sx,sz],i)=>{
    [-c.w*.22,c.w*.22].forEach(tx=>{
      const leg=new THREE.Mesh(new THREE.BoxGeometry(.16,1.0,.16),woodD);
      leg.position.set(tx+sx*1.4,.5,sz*1.1); g.add(leg);
    });
  });
  /* 商品展示（小物件） */
  const colors=[0xd9a441,0x66aa44,0xcc6644,0x4488cc,0xaa44aa];
  colors.forEach((col,i)=>{
    const item=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.12),
      new THREE.MeshBasicMaterial({color:col}));
    item.position.set(-c.w*.22+(i%2)*.3,.9,(i-2)*.3); g.add(item);
  });
  /* 立柱（前后） */
  [[-1,1],[1,1],[-1,-1],[1,-1]].forEach(([sx,sz])=>{
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.1,.12,3.0,5),woodD);
    post.position.set(sx*(c.w/2-.15),2.6,sz*(c.d/2-.15)); g.add(post);
  });
  /* 棚顶布（双坡样式） */
  const roof=new THREE.Mesh(new THREE.BoxGeometry(c.w+.6,.15,c.d+.8),cloth);
  roof.position.set(0,4.0,0); g.add(roof);
  const roofRidge=new THREE.Mesh(new THREE.BoxGeometry(c.w+.6,.18,.2),woodD);
  roofRidge.position.set(0,4.1,0); g.add(roofRidge);
  /* 布帘侧围 */
  [[-1,0],[1,0]].forEach(([sx])=>{
    const curtain=new THREE.Mesh(new THREE.PlaneGeometry(c.d*.8,2.0),cloth);
    curtain.position.set(sx*(c.w/2+.05),2.5,0);
    curtain.rotation.y=sx>0?Math.PI/2:-Math.PI/2;
    g.add(curtain);
  });
  /* 挂旗 */
  [-1,1].forEach(s=>{
    const flag=new THREE.Mesh(new THREE.BoxGeometry(.6,.4,.04),cloth);
    flag.position.set(s*c.w*.35,4.2,-c.d/2-.1); g.add(flag);
    const pole2=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.6,4),woodD);
    pole2.position.set(s*c.w*.35,4.3,-c.d/2-.1); g.add(pole2);
  });
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  g.userData.building="stall";
  return g;
}

/** 货箱堆 V2：更多箱子 + 不同大小 + 布覆盖 + 标签 */
function buildCratePile(cfg){
  const c=Object.assign({
    wood:0x7a5a30, woodD:0x4a3020, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const wood=MAT.get("wood.build",{color:c.wood,roughness:.9,flatShading:true});
  const woodD=MAT.get("wood.buildD",{color:c.woodD,roughness:.95,flatShading:true});
  const clothM=MAT.get("cloth.crate",{color:0x6a5030,roughness:.9,flatShading:true});
  const boxes=[
    [0,.45,0,1.1],[.9,.45,.2,1],[-.7,.45,.35,.95],
    [.2,1.25,.1,.9],[-.2,1.3,-.5,.75],[.6,1.35,-.45,.8],
    [-.8,1.2,.5,.7],[.5,1.9,-.2,.6],[-.4,2.0,.1,.55],
  ];
  boxes.forEach(([x,y,z,s])=>{
    const b=new THREE.Mesh(new THREE.BoxGeometry(s,s*.85,s*.9),wood);
    b.position.set(x,y,z); g.add(b);
    const band=new THREE.Mesh(new THREE.BoxGeometry(s*1.02,.08,s*.92),woodD);
    band.position.set(x,y,z); g.add(band);
    /* 盖板 */
    const lid=new THREE.Mesh(new THREE.BoxGeometry(s*.92,.05,s*.82),woodD);
    lid.position.set(x,y+s*.43,z); g.add(lid);
  });
  /* 顶部帆布覆盖 */
  const tarp=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.0),clothM);
  tarp.position.set(.1,2.2,-.1); tarp.rotation.x=.12; tarp.rotation.z=-.08;
  g.add(tarp);
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="crates";
  return g;
}

/* ============================================================
   新增装饰建筑：村落气派补齐
   ============================================================ */

/** 长屋：优先 inn GLB（A 线），否则程序化木骨架大屋 */
function buildLonghouse(cfg){
  const c=Object.assign({
    wood:0x6a4a28, woodD:0x3a2810, roof:0x8a5a30,
    w:12, d:6.5, h:4.8, size:1, stone:0x6a5a50,
    pillars:7,
  },cfg||{});
  if(typeof ASSETS==="undefined"||!ASSETS.isReady()){
    console.warn("[buildLonghouse] ASSETS 未就绪");
    return new THREE.Group();
  }
  const seed=(c.seed!=null?c.seed:((c.w*1301)^(c.d*7907)))>>>0;
  const glb=ASSETS.cloneBuilding("inn",{
    seed, size:c.size,
    targetH:c.h!=null?c.h*1.6:7.8,
    targetW:c.w!=null?c.w*1.15:14,
    targetD:c.d!=null?c.d*1.2:8.5,
  });
  if(glb){glb.userData.building="longhouse";return glb;}
  console.warn("[buildLonghouse] GLB 缺失");
  return new THREE.Group();
}

function buildLonghouseProcedural(c){
  const g=new THREE.Group();
  const wood=MAT.get("wood.build",{color:c.wood,roughness:.92,flatShading:true});
  const woodD=MAT.get("wood.buildD",{color:c.woodD,roughness:.95,flatShading:true});
  const roofM=MAT.get("wood.roof",{color:c.roof,roughness:1,flatShading:true});
  const stoneM=MAT.get("stone.build",{color:c.stone,roughness:1,flatShading:true});
  /* 地基石 */
  for(let i=0;i<14;i++){
    const a=i/14*Math.PI*2;
    const f=new THREE.Mesh(new THREE.DodecahedronGeometry(.5,0),stoneM);
    f.position.set(Math.cos(a)*c.w*.5,.12,Math.sin(a)*c.d*.48); g.add(f);
  }
  /* 墙体 */
  const body=new THREE.Mesh(new THREE.BoxGeometry(c.w,c.h,c.d),wood);
  body.position.y=c.h/2; g.add(body);
  /* 木骨架立柱（沿墙） */
  const n=Math.max(4,c.pillars|0);
  for(let i=0;i<n;i++){
    for(const s of [-1,1]){
      const post=new THREE.Mesh(new THREE.BoxGeometry(.35,c.h+.3,.35),woodD);
      post.position.set((i/(n-1)-.5)*c.w*.88,c.h/2+.15,s*c.d/2); g.add(post);
    }
  }
  /* 横梁 */
  for(const y of [c.h*.2,c.h*.4,c.h*.6,c.h*.8]){
    for(const s of [1,-1]){
      const beam=new THREE.Mesh(new THREE.BoxGeometry(c.w+.1,.1,.1),woodD);
      beam.position.set(0,y,s*c.d/2); g.add(beam);
    }
  }
  /* 山墙端骨架 */
  for(const s of [-1,1]){
    for(let i=0;i<3;i++){
      const rafter=new THREE.Mesh(new THREE.BoxGeometry(.08,.15,c.d*.6),woodD);
      rafter.position.set(s*c.w/2,c.h*.6+i*c.h*.15,0);
      rafter.rotation.z=s*-.2; g.add(rafter);
    }
  }
  /* 双坡顶（大幅挑檐） */
  const roofL=new THREE.Mesh(new THREE.BoxGeometry(c.w+1.5,.35,c.d*.82),roofM);
  roofL.position.set(0,c.h+.55,-c.d*.25); roofL.rotation.x=.42; g.add(roofL);
  const roofR=new THREE.Mesh(new THREE.BoxGeometry(c.w+1.5,.35,c.d*.82),roofM);
  roofR.position.set(0,c.h+.55,c.d*.25); roofR.rotation.x=-.42; g.add(roofR);
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(c.w+1.0,.3,.6),woodD);
  ridge.position.set(0,c.h+1.15,0); g.add(ridge);
  /* 脊端兽角装饰 */
  [-1,1].forEach(s=>{
    const horn=new THREE.Mesh(new THREE.ConeGeometry(.15,.8,5),woodD);
    horn.position.set(s*c.w/2+.5,c.h+1.3,0); horn.rotation.z=s*-.3; g.add(horn);
  });
  /* 双门（前后） */
  for(const sz of [-1,1]){
    const door=new THREE.Mesh(new THREE.BoxGeometry(1.6,2.4,.15),woodD);
    door.position.set(0,1.2,sz*c.d/2+.04); g.add(door);
    for(let i=0;i<3;i++){
      const plank=new THREE.Mesh(new THREE.BoxGeometry(1.5,.1,.17),wood);
      plank.position.set(0,.2+i*.6,sz*c.d/2+.06); g.add(plank);
    }
    const handle=new THREE.Mesh(new THREE.SphereGeometry(.07,6,5),
      new THREE.MeshBasicMaterial({color:0xd9a441}));
    handle.position.set(.7,1.2,sz*c.d/2+.1); g.add(handle);
  }
  /* 窗户（侧墙长排） */
  for(let i=0;i<3;i++){
    const win=new THREE.Mesh(new THREE.BoxGeometry(.8,.7,.06),
      new THREE.MeshBasicMaterial({color:0x3a5a7a,transparent:true,opacity:.4}));
    win.position.set((i-1)*c.w*.25,c.h*.55,c.d/2+.01); g.add(win);
    win.position.set((i-1)*c.w*.25,c.h*.55,-c.d/2-.01); g.add(win);
  }
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  g.userData.building="longhouse";
  return g;
}

/** 水井：石圈 + 木架 + 吊绳 + 桶 + 水光 */
function buildWell(cfg){
  const c=Object.assign({stone:0x6a5a50,wood:0x4a3020,size:1},cfg||{});
  const g=new THREE.Group();
  const stoneM=MAT.get("stone.well",{color:c.stone,roughness:1,flatShading:true});
  const woodM=MAT.get("wood.well",{color:c.wood,roughness:.9,flatShading:true});
  /* 井圈 */
  const ring=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.5,.8,10),stoneM);
  ring.position.y=.4; g.add(ring);
  const inner=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.25,.7,10),
    new THREE.MeshBasicMaterial({color:0x1a2818}));
  inner.position.y=.4; g.add(inner);
  /* 水光 */
  const water=new THREE.Mesh(new THREE.CircleGeometry(.8,8),
    new THREE.MeshBasicMaterial({color:0x4488cc,transparent:true,opacity:.35,side:THREE.DoubleSide}));
  water.position.y=.1; water.rotation.x=-Math.PI/2; g.add(water);
  /* 木架 */
  [-1,1].forEach(s=>{
    const post=new THREE.Mesh(new THREE.BoxGeometry(.15,2.0,.15),woodM);
    post.position.set(s*1.0,1.0,0); g.add(post);
  });
  const cross=new THREE.Mesh(new THREE.BoxGeometry(2.2,.12,.12),woodM);
  cross.position.set(0,2.0,0); g.add(cross);
  /* 吊绳 + 桶 */
  const rope=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,1.2,4),
    new THREE.MeshBasicMaterial({color:0x6a5040}));
  rope.position.set(0,1.2,0); g.add(rope);
  const bucket=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,.3,6),woodM);
  bucket.position.set(0,.5,0); g.add(bucket);
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="well";
  return g;
}

/** 村门：双立柱 + 横梁 + 顶棚 + 旗帜 + 灯笼 */
function buildVillageGate(cfg){
  const c=Object.assign({
    wood:0x6a4a28, woodD:0x3a2810, roof:0x8a5a30,
    w:5.0, h:6.0, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const wood=MAT.get("wood.build",{color:c.wood,roughness:.92,flatShading:true});
  const woodD=MAT.get("wood.buildD",{color:c.woodD,roughness:.95,flatShading:true});
  const roofM=MAT.get("wood.roof",{color:c.roof,roughness:1,flatShading:true});
  const goldM=MAT.get("trim.gate",{color:0xd9a441,r:.3,mt:.9});
  const bannerM=MAT.get("cloth.banner",{color:0xc04020,roughness:.9,side:THREE.DoubleSide});
  /* 双立柱 */
  [-1,1].forEach(s=>{
    const pillar=new THREE.Mesh(new THREE.BoxGeometry(.8,c.h,1.2),woodD);
    pillar.position.set(s*c.w/2,c.h/2,0); g.add(pillar);
    /* 柱顶灯 */
    const lantern=new THREE.Mesh(new THREE.BoxGeometry(.5,.6,.5),
      new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.7}));
    lantern.position.set(s*c.w/2,c.h+.3,0); g.add(lantern);
    const lRing=new THREE.Mesh(new THREE.TorusGeometry(.25,.05,5,8),goldM);
    lRing.position.set(s*c.w/2,c.h+.6,0); g.add(lRing);
  });
  /* 横梁 */
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(c.w+1.0,.6,1.0),wood);
  lintel.position.set(0,c.h-.2,0); g.add(lintel);
  const lintelTop=new THREE.Mesh(new THREE.BoxGeometry(c.w+1.2,.2,1.1),woodD);
  lintelTop.position.set(0,c.h+.1,0); g.add(lintelTop);
  /* 顶棚 */
  const roof=new THREE.Mesh(new THREE.BoxGeometry(c.w+1.5,.25,c.w*.6),roofM);
  roof.position.set(0,c.h+.6,0); roof.rotation.x=.35; g.add(roof);
  const roof2=new THREE.Mesh(new THREE.BoxGeometry(c.w+1.5,.25,c.w*.6),roofM);
  roof2.position.set(0,c.h+.6,0); roof2.rotation.x=-.35; g.add(roof2);
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(c.w+1.2,.2,.4),woodD);
  ridge.position.set(0,c.h+.9,0); g.add(ridge);
  /* 旗帜 */
  [-1,1].forEach(s=>{
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.8),bannerM);
    flag.position.set(s*c.w/2,c.h*.6,0); flag.rotation.y=s*.15; g.add(flag);
  });
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="gate";
  return g;
}

/** 路牌：木柱 + 指向牌 + 文字 */
function buildSignpost(cfg){
  const c=Object.assign({wood:0x4a3020,size:1},cfg||{});
  const g=new THREE.Group();
  const woodD=MAT.get("wood.sign",{color:c.wood,roughness:.95,flatShading:true});
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,3.0,5),woodD);
  post.position.y=1.5; g.add(post);
  [[-1,.6],[1,-.6]].forEach(([sx,rz])=>{
    const board=new THREE.Mesh(new THREE.BoxGeometry(1.6,.6,.06),woodD);
    board.position.set(sx*.2,2.2+rz*.2,0); board.rotation.y=sx*.3; g.add(board);
  });
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="signpost";
  return g;
}

/** 灯笼杆：木杆 + 双灯笼 */
function buildLanternPole(cfg){
  const c=Object.assign({wood:0x4a3020,size:1},cfg||{});
  const g=new THREE.Group();
  const woodD=MAT.get("wood.lantern",{color:c.wood,roughness:.95,flatShading:true});
  const goldM=MAT.get("trim.lantern",{color:0xd9a441,r:.3,mt:.9});
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,4.0,5),woodD);
  post.position.y=2.0; g.add(post);
  const arm=new THREE.Mesh(new THREE.BoxGeometry(1.2,.08,.08),woodD);
  arm.position.set(0,3.8,0); g.add(arm);
  [-1,1].forEach(s=>{
    const lantern=new THREE.Mesh(new THREE.BoxGeometry(.35,.5,.35),
      new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.7}));
    lantern.position.set(s*.6,3.8,0); g.add(lantern);
    const cap=new THREE.Mesh(new THREE.ConeGeometry(.25,.15,6),goldM);
    cap.position.set(s*.6,4.05,0); g.add(cap);
  });
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="lantern";
  return g;
}

/** 草垛：圆柱草堆 */
function buildHaystack(cfg){
  const c=Object.assign({color:0xd8b060,size:1},cfg||{});
  const g=new THREE.Group();
  const hay=MAT.get("hay",{color:c.color,roughness:1,flatShading:true});
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.5,2.0,8),hay);
  base.position.y=1.0; g.add(base);
  const top=new THREE.Mesh(new THREE.SphereGeometry(1.1,8,6),hay);
  top.position.set(0,2.0,0); top.scale.y=.5; g.add(top);
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="haystack";
  return g;
}

/** 训练假人：木桩 + 横臂 + 草靶 */
function buildTrainingDummy(cfg){
  const c=Object.assign({wood:0x4a3020,size:1},cfg||{});
  const g=new THREE.Group();
  const woodD=MAT.get("wood.dummy",{color:c.wood,roughness:.95,flatShading:true});
  const hay=MAT.get("hay.dummy",{color:0xd8b060,roughness:1,flatShading:true});
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,2.5,5),woodD);
  post.position.y=1.25; g.add(post);
  const arm=new THREE.Mesh(new THREE.BoxGeometry(1.2,.1,.1),woodD);
  arm.position.set(0,2.2,0); g.add(arm);
  const target=new THREE.Mesh(new THREE.CylinderGeometry(.5,.6,1.2,7),hay);
  target.position.set(0,2.8,0); g.add(target);
  /* 靶心 */
  const center=new THREE.Mesh(new THREE.CircleGeometry(.2,6),
    new THREE.MeshBasicMaterial({color:0xcc4444,side:THREE.DoubleSide}));
  center.position.set(0,2.8,.55); g.add(center);
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="dummy";
  return g;
}

/** 磨坊：石基 + 木塔身 + 风车翼 + 顶棚 */
function buildWindmill(cfg){
  const c=Object.assign({
    wood:0x6a4a28, woodD:0x3a2810, roof:0x8a5a30,
    stone:0x6a5a50, h:8.0, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const wood=MAT.get("wood.build",{color:c.wood,roughness:.92,flatShading:true});
  const woodD=MAT.get("wood.buildD",{color:c.woodD,roughness:.95,flatShading:true});
  const roofM=MAT.get("wood.roof",{color:c.roof,roughness:1,flatShading:true});
  const stoneM=MAT.get("stone.mill",{color:c.stone,roughness:1,flatShading:true});
  /* 石基 */
  const base=new THREE.Mesh(new THREE.CylinderGeometry(3.0,3.6,2.0,10),stoneM);
  base.position.y=1.0; g.add(base);
  /* 木塔身 */
  const tower=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.8,c.h-2,8),wood);
  tower.position.y=c.h/2+1; g.add(tower);
  /* 横梁圈 */
  for(const y of [2.5,4.0,5.5]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(2.8,.12,5,10),woodD);
    ring.position.y=y; ring.rotation.x=Math.PI/2; g.add(ring);
  }
  /* 窗户 */
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2+.45;
    const win=new THREE.Mesh(new THREE.BoxGeometry(.6,.8,.08),
      new THREE.MeshBasicMaterial({color:0x3a5a7a,transparent:true,opacity:.45}));
    win.position.set(Math.cos(a)*2.3,4.5,Math.sin(a)*2.3); g.add(win);
  }
  /* 锥顶 */
  const roof=new THREE.Mesh(new THREE.ConeGeometry(3.2,2.2,8),roofM);
  roof.position.y=c.h+2.1; g.add(roof);
  const roofTip=new THREE.Mesh(new THREE.ConeGeometry(.2,.6,6),
    MAT.get("trim.mill",{color:0xd9a441,r:.3,mt:.9}));
  roofTip.position.y=c.h+3.2; g.add(roofTip);
  /* 风车翼 */
  const axle=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.8,6),woodD);
  axle.position.set(2.6,c.h+1.2,0); axle.rotation.z=Math.PI/2; g.add(axle);
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2;
    const blade=new THREE.Mesh(new THREE.BoxGeometry(.08,3.5,.6),wood);
    blade.position.set(2.6+Math.cos(a)*1.8,c.h+1.2+Math.sin(a)*1.8,0);
    blade.rotation.z=a; g.add(blade);
    const cloth=new THREE.Mesh(new THREE.BoxGeometry(.06,3.0,1.2),roofM);
    cloth.position.set(2.6+Math.cos(a)*1.8,c.h+1.2+Math.sin(a)*1.8,0);
    cloth.rotation.z=a; g.add(cloth);
  }
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="windmill";
  return g;
}

