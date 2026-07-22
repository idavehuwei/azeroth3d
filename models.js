/* ============================================================
   炽心 · models.js
   ------------------------------------------------------------
   [依赖] THREE · core.js（rand）· palette.js（PALETTE · MAT）· rig.js（assembleHumanoidRig）
   [导出] buildHumanoid buildWeapon setWeapon HUMANOIDS WEAPONS CLASS_LOOK buildFromClassLook
          buildPlayer buildMage buildArcher buildPriest buildShaman buildRogue buildBoss buildOnyxia
          buildElder buildVendor buildSpiritHealer buildGraveyard tintNpcCloth
          buildHut buildTent buildFence buildWatchtower buildCampfire buildTotem buildMarketStall buildCratePile
          BUILD_PAL placeProp GRAVEYARDS registerGraveyard nearestGraveyardSpawn
          （plan-v1 · V1-A1；R3 升级 tent/totem/campfire；STEP 17 墓地）
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
  /* 匕首（V1-C2 盗贼默认） */
  dagger:{mats:{gold:{c:0xa09070,r:.35,mt:.85},
               blade:{c:0xb8c4d4,mt:.95,r:.12,e:0x445566,ei:.15}},
    parts:[
      {g:'cyl',a:[.04,.045,.22,6],m:'gold'},
      {g:'box',a:[.22,.05,.08],p:[0,.12,0],m:'gold'},
      {g:'box',a:[.07,.95,.025],p:[0,.62,0],m:'blade'},
      {g:'cone',a:[.05,.18,4],p:[0,1.18,0],m:'blade'},
    ]},
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

/** 木屋：墙体 + 双坡茅草顶 + 门洞 */
function buildHut(cfg){
  const c=Object.assign({
    wood:BUILD_PAL.mulgore.wood, woodD:BUILD_PAL.mulgore.woodD,
    roof:BUILD_PAL.mulgore.roof, w:4.2, d:3.6, h:2.6, size:1, door:true,
  },cfg||{});
  const g=new THREE.Group();
  const wood=MAT.get("wood.build",{color:c.wood,roughness:.92,flatShading:true});
  const woodD=MAT.get("wood.buildD",{color:c.woodD,roughness:.95,flatShading:true});
  const roofM=MAT.get("wood.roof",{color:c.roof,roughness:1,flatShading:true});
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

/** 兽皮帐篷：hide 贴图锥顶 + 缝线环 + 门帘 + 木桩（plan-V2 · R3） */
function buildTent(cfg){
  const c=Object.assign({
    hide:BUILD_PAL.mulgore.hide, stake:BUILD_PAL.mulgore.stake,
    r:3.0, h:4.2, stakes:6, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const hide=MAT.get("fur.tent",{color:c.hide,roughness:.95,flatShading:true});
  const hideD=MAT.get("fur.hideDark",{color:c.hide,roughness:.98,flatShading:true});
  const stakeM=MAT.get("wood.stake",{color:c.stake,roughness:1,flatShading:true});
  const cone=new THREE.Mesh(new THREE.ConeGeometry(c.r,c.h,7),hide);
  cone.position.y=c.h/2; g.add(cone);
  /* 缝线环（几何细节） */
  for(const t of [.28,.52,.78]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(c.r*(1-t*.55),.04,5,14),hideD);
    ring.rotation.x=Math.PI/2;
    ring.position.y=c.h*t;
    ring.scale.set(1,1,.35);
    g.add(ring);
  }
  /* 门帘 */
  const flap=new THREE.Mesh(new THREE.PlaneGeometry(c.r*.7,c.h*.55),hideD);
  flap.position.set(0,c.h*.28,c.r*.72);
  flap.rotation.x=-.08;
  g.add(flap);
  const n=Math.max(3,c.stakes|0);
  for(let k=0;k<n;k++){
    const a=k/n*Math.PI*2;
    const st=new THREE.Mesh(new THREE.ConeGeometry(.18,c.h*.55,5),stakeM);
    st.position.set(Math.cos(a)*c.r*.92,c.h*.22,Math.sin(a)*c.r*.92);
    g.add(st);
  }
  /* 顶上撑杆 */
  for(let k=0;k<3;k++){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,c.h*.35,5),stakeM);
    pole.position.set(Math.cos(k)* .35,c.h+.15,Math.sin(k)*.35);
    pole.rotation.set(.2*(k-1),0,.15*(k-1));
    g.add(pole);
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
  const wood=MAT.get("wood.build",{color:c.wood,roughness:.92,flatShading:true});
  const woodD=MAT.get("wood.buildD",{color:c.woodD,roughness:.95,flatShading:true});
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
  const wood=MAT.get("wood.build",{color:c.wood,roughness:.9,flatShading:true});
  const woodD=MAT.get("wood.buildD",{color:c.woodD,roughness:.92,flatShading:true});
  const flagM=MAT.get("cloth.flag",{color:c.flag,roughness:.8,side:THREE.FrontSide});
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

/** 营火：柴堆 + 多层火焰锥 + 火星 + 点光（plan-V2 · R3）；fl/li 兼容 worldFlames */
function buildCampfire(cfg){
  const c=Object.assign({
    stone:0x6a5040, flame:0xffa030, light:0xff8a30,
    r:1.1, intensity:1.4, dist:20, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const stoneM=MAT.get("rock.camp",{color:c.stone,roughness:1,flatShading:true});
  const woodM=MAT.get("wood.prop",{color:0x4a3020,roughness:1,flatShading:true});
  for(let k=0;k<6;k++){
    const a=k/6*Math.PI*2;
    const st=new THREE.Mesh(new THREE.DodecahedronGeometry(.38,0),stoneM);
    st.position.set(Math.cos(a)*c.r,.28,Math.sin(a)*c.r); g.add(st);
  }
  /* 柴堆 */
  for(let k=0;k<5;k++){
    const log=new THREE.Mesh(new THREE.CylinderGeometry(.12,.14,1.35,6),woodM);
    log.rotation.z=Math.PI/2;
    log.rotation.y=k/5*Math.PI*2;
    log.position.set(Math.cos(k)* .25,.22,Math.sin(k)*.25);
    g.add(log);
  }
  const layers=[];
  const specs=[
    {h:1.7,r:.7,y:1.05,col:c.flame,op:.92,freq:8},
    {h:1.35,r:.48,y:.95,col:0xffcc44,op:.75,freq:11},
    {h:1.0,r:.32,y:.85,col:0xfff0a0,op:.55,freq:14},
  ];
  specs.forEach((s,i)=>{
    const fl=new THREE.Mesh(new THREE.ConeGeometry(s.r,s.h,7),
      new THREE.MeshBasicMaterial({color:s.col,transparent:true,opacity:s.op,depthWrite:false}));
    fl.position.y=s.y; g.add(fl);
    layers.push({mesh:fl,freq:s.freq,phase:i*1.7});
  });
  const fl=layers[0].mesh;
  const li=new THREE.PointLight(c.light,c.intensity,c.dist,1.8);
  li.position.y=2.0; g.add(li);
  if(typeof PROPS!=="undefined"&&PROPS.attachCampfireEmbers)PROPS.attachCampfireEmbers(g,0,0);
  g.scale.setScalar(c.size);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.building="campfire";
  g.userData.flame={fl,li,layers};
  return g;
}

/** 图腾柱：bark 木柱 + 噪点彩绘环 + 横翼（plan-V2 · R3） */
function buildTotem(cfg){
  const c=Object.assign({
    wood:0x5a3820, paintA:0xd94f2a, paintB:0x3a7ac9, h:7.2, size:1,
  },cfg||{});
  const g=new THREE.Group();
  const wood=MAT.get("wood.totem",{color:c.wood,roughness:.9,flatShading:true});
  const aM=MAT.get("paint.a",{color:c.paintA,roughness:.8});
  const bM=MAT.get("paint.b",{color:c.paintB,roughness:.8});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.48,.6,c.h,7),wood);
  pole.position.y=c.h/2; g.add(pole);
  [[c.h*.28,aM],[c.h*.5,bM],[c.h*.72,aM]].forEach(([y,m],i)=>{
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(.68,.68,.5,7),m);
    ring.position.y=y; g.add(ring);
    /* 噪点块：彩绘斑驳感 */
    for(let k=0;k<4;k++){
      const blot=new THREE.Mesh(new THREE.BoxGeometry(.22,.28,.12),i%2?bM:aM);
      const ang=k/4*Math.PI*2+(i*.4);
      blot.position.set(Math.cos(ang)*.7,y+((k%2)*.15-.08),Math.sin(ang)*.7);
      blot.rotation.y=ang;
      g.add(blot);
    }
  });
  const wing=new THREE.Mesh(new THREE.BoxGeometry(3.2,.5,.22),bM);
  wing.position.y=c.h*.95; g.add(wing);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.35,.7,6),wood);
  tip.position.y=c.h+.35; g.add(tip);
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
  const wood=MAT.get("wood.build",{color:c.wood,roughness:.92,flatShading:true});
  const woodD=MAT.get("wood.buildD",{color:c.woodD,roughness:.95,flatShading:true});
  const cloth=MAT.get("cloth.stall",{color:c.cloth,roughness:.9,flatShading:true});
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
  const wood=MAT.get("wood.build",{color:c.wood,roughness:.9,flatShading:true});
  const woodD=MAT.get("wood.buildD",{color:c.woodD,roughness:.95,flatShading:true});
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

