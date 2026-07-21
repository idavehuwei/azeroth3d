/* ============================================================
   熔火之心 · core.js
   基础设施：工具函数 / 数值总表 BALANCE / 可播种随机器 / 渲染器 / 相机
            熔火之心场景环境（岩浆、平台、岩柱、火星粒子）/ makeLabel
   ------------------------------------------------------------
   [依赖] THREE（全局，CDN 引入）
   [导出] $ clamp rand R srand worldRng BALANCE BAL WORLD_SEED
          sceneRaid scene camera renderer lavaUniforms ARENA_R embers
          EMBERS emberVel makeLabel
   ============================================================ */
/* ============================================================
   熔火之心 · 最终 Boss 战斗模拟
   全部 3D 模型使用 Three.js 几何体程序化搭建（原创低多边形风格）
   ============================================================ */
"use strict";
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);      /* 玩法随机（伤害浮动、掉落等） */
const R=a=>rand(a[0],a[1]);                    /* 从 [min,max] 区间取随机值 */

/* ============================================================
   数值总表 BALANCE —— 改平衡只改这里，不碰逻辑代码（STEP 0）
   ============================================================ */
const BALANCE={
  /* 受击伤害浮动乘数区间 [min,max] */
  variance:{boss:[.9,1.12], mob:[.92,1.08], player:[.92,1.08]},
  /* 玩家技能（伤害/治疗为 [min,max]，距离/半径单位：米） */
  skills:{
    heroicStrike:{dmg:[520,680], addDmg:[500,650], reach:4.8, addReach:4.5, bossReach:10},
    whirlwind   :{dmg:[700,900], bossDmg:[760,940], radius:9, bossRadius:11},
    charge      :{rageGain:25, minDist:5, stopDist:6},
    potion      :{heal:[1600,2000]},
    pyroblast   :{dmg:[880,1080]},
    frostNova   :{dmg:[400,520], bossDmg:[420,540], radius:10, bossRadius:12, rootT:3},
    blink       :{dist:12},
    iceBlock    :{invuln:3},
    aimedShot   :{dmg:[820,1000]},
    multiShot   :{dmg:[430,540]},
    roll        :{dist:9, invuln:.7},
  },
  /* 野怪族群数值表（STEP 5）：加新怪 = 加一条；aggroR:0 = 中立被动（只反击） */
  mobs:{
    boar    :{hp:650, dmg:[55,85],  atkCd:2.2, meleeR:2.4, aggroR:7,  leashR:34, wanderSpd:3,  chaseSpd:5.5, respawnT:25,  xp:80,  copper:[8,18]},
    wolf    :{hp:520, dmg:[45,70],  atkCd:1.8, meleeR:2.3, aggroR:9,  leashR:38, wanderSpd:3.5,chaseSpd:6.5, respawnT:30,  xp:90,  socialR:18, copper:[10,22]},
    bird    :{hp:480, dmg:[40,60],  atkCd:1.6, meleeR:2.2, aggroR:0,  leashR:30, wanderSpd:4.5,chaseSpd:8,   respawnT:25,  xp:70,  copper:[6,14]},
    harpy   :{hp:4200,dmg:[90,130], atkCd:2.4, meleeR:3.2, aggroR:12, leashR:44, wanderSpd:2.5,chaseSpd:5,   respawnT:60,  xp:450, copper:[80,140], socialR:24,
              cast:{name:"女妖之火",dmg:[220,300],dur:1.5,cd:6,range:20,speed:16,hitR:3}},
    boarKing:{hp:3200,dmg:[110,160],atkCd:2.4, meleeR:3.2, aggroR:8,  leashR:40, wanderSpd:2.2,chaseSpd:5,   respawnT:120, xp:500, copper:[120,200], socialR:22},
  },
  /* 脱战回巢（STEP 5 规范化）：回巢途中每秒回复最大生命的百分比，且免疫伤害 */
  leash:{regenPct:.5},
  /* 精英外观与随从（体型放大 / 脚下光环 / 周边小弟） */
  elite:{
    scaleMul:1.25,            /* 在模型 size 之上再放大 */
    labelYBonus:1.4,
    aura:{innerR:1.6,outerR:2.9,opacity:.55,pulse:0.35},
    minions:{
      harpy   :{type:"bird", count:3, radius:7},
      boarKing:{type:"boar", count:3, radius:8},
    },
  },
  /* 死亡与复活（STEP 15） */
  death:{
    respawnHpPct:.5,          /* 复活时生命比例 */
    weaknessT:10,             /* 虚弱秒数 */
    moveSpeedMul:.7,          /* 虚弱移速倍率（-30%） */
    worldSpawn:{x:0,z:58},    /* 灵魂医者旁 */
    raidSpawn:{x:0,z:18},     /* 副本走廊入口 */
    corpseDelay:1.2,          /* 倒地后弹出死亡面板延迟 */
  },
  /* 烈焰之子 */
  add:{hp:1400, dmg:[130,190], atkCd:2, speed:4.6, meleeR:3, stopR:2.6, copper:[12,28]},
  /* 炎魔领主 · 拉戈斯 */
  boss:{hp:120000, phase2At:.5, phase3At:.3, submergeT:25, addCount:4, copper:2500,
    melee   :{dmg:[300,420], p2Mul:1.25, p3Mul:1.5, cd:[3,4.2], range:12, hitRange:13, delayMs:450},
    fireball:{dmg:[520,680], cast:1.8, cd:[8,11], hitR:4, speed:22},
    eruption:{dmg:[600,780], cast:1.5, cd:[9,12], count:3, p2Count:5, p3Count:8, delay:2.2},
    wrath   :{dmg:[380,520], cast:2.2, cd:[16,20], range:16},
  },
  /* 玛格曼达 · 熔火之心一号位（STEP 9c） */
  magmadar:{hp:56000, phase2At:.5, addCount:3, copper:800,
    melee :{dmg:[220,300], p2Mul:1.35, cd:[2.4,3.2], range:9, hitRange:10, delayMs:260},
    spit  :{dmg:[260,340], cast:1.5, cd:[6,8.5], hitR:3.2, speed:18, count:3, p2Count:5, fan:0.42},
    breath:{dmg:[420,560], cast:1.8, cd:[11,14], delay:1.6, segs:5, step:4.2, ringR:3.4, p2Segs:7},
    stomp :{dmg:[400,540], cast:1.3, cd:[9,12], count:3, p2Count:6, delay:1.9, ringR:6},
    fear  :{dmg:[140,200], cast:1.6, cd:[13,16], range:16, fearT:2.6, knockT:.35, panicRings:3, panicR:4.5, delay:1.5},
  },
  /* 任务 · 狂躁的野猪 / 讨伐拉戈斯 */
  quest:{boarKills:3, rewardHp:600, rewardDmgMul:1.15, rewardCopper:150},
  /* 掉落与尸体拾取（STEP 2）：品质权重 70/25/5 · 尸体停留秒数 · 拾取距离 */
  loot:{weights:{common:70,uncommon:25,rare:5}, corpseT:8, pickupR:3.5,
        eliteWeights:{uncommon:72,rare:28}},   /* 精英必掉优秀以上（STEP 5） */
  /* 背包（STEP 4）：格数 */
  bag:{size:16},
  /* 金币经济 + 商人（STEP 13）：铜为最小单位；1金=100银=10000铜 */
  economy:{
    copperPerSilver:100,
    copperPerGold:10000,
    vendorStock:["plain_bread","linen_bandage"],
    food:{healPct:.35,duration:6},       /* 坐下进食：持续回复最大生命比例 */
    bandage:{healPct:.28,cast:1.6},      /* 绷带：引导施放 */
    interactR:5.5,
  },
  /* 上帝模式（首页勾选）：玩家每次攻击的固定伤害 */
  god:{dmg:5000},
  /* 昼夜循环（STEP 7）：10 分钟一昼夜，render-only，不碰任何数值 */
  dayNight:{duration:600,  /* 10 分钟一昼夜（秒） */
    day:{sky:0x8fc0e8, fog:0xa8c8e0, fogDensity:0.0062, sunColor:0xfff2d8, sunIntensity:1.05,
         sunAlt:65, sunAz:0, hemiSky:0xcfe8ff, hemiGround:0x5a7a3a, hemiIntensity:0.95},
    night:{sky:0x08081a, fog:0x0a0a1a, fogDensity:0.025, sunColor:0x1a1a3a, sunIntensity:0.15,
           sunAlt:-20, sunAz:0, hemiSky:0x1a1a3a, hemiGround:0x0a0a1a, hemiIntensity:0.25},
    campfire:{base:1.4, nightBoost:2.6},  /* 白天 1.4，夜晚 1.4+2.6=4.0 */
  },
  /* 经验与等级（STEP 3）：经验来源 / 升级曲线 / 每级成长 */
  levels:{max:10, xp:{quest:300, boss:2000, magmadar:800},   /* 野怪经验在 mobs 表逐条配置（STEP 5） */
    xpMax:[200,300,450,650,900,1200,1600,2100,2700],  /* 第 n 级升下一级所需经验 */
    perLevel:{dmgMul:.05, hpMax:.08}},                 /* 每级：基础伤害 +5% · 生命上限 +8% */
  /* 特效配方默认参数（STEP 9a）：改观感只改这里；运行时 ctx 可覆盖 */
  vfx:{
    lava_bolt:{color:0xffa030,glow:0xff4400,glowOp:.4,radius:.9,glowR:1.4,segs:10,originScale:.7},
    eruption_ring:{ringColor:0xff2200,discColor:0xff3b00,ringOp:.85,discOp:.22,yRing:.06,yDisc:.05,innerMul:.86},
    melee_impact:{color:0xff6a1a,count:14,spread:1.2,size:.45},
    roar_aura:{color:0xffb040,count:70,spread:7,size:.45},
    heal_cross:{color:0x66ff88,count:20,spread:1.4,size:.45},
    loot_spark:{color:0xffd76a,count:24,spread:1.6,size:.45},
    impact:{size:.45,life:1.1},   /* 通用粒子爆发默认 */
  },
  /* 天赋（STEP 10a）：点数规则 + 每节点每级修饰量；树形拓扑在 talents.js */
  talents:{
    firstPointLevel:2,   /* 升到 2 级起每级 1 点；1→10 共 9 点 */
    pointsPerLevel:1,
    /* 每职业节点：perRank 为每投入 1 点叠加的修饰 */
    warrior:{
      giant_str :{dmgMul:.05},                          /* 巨人之力 */
      whirl_master:{skillCd:{i:1,mul:.90}},             /* 旋风掌握：旋风斩 CD ×0.9/级 */
      massacre  :{dmgMul:.04},                          /* 杀戮 */
      tough     :{hpMaxMul:.06},                        /* 坚韧 */
      iron_will :{hpMaxMul:.05},                        /* 钢铁意志 */
      bulwark   :{hpMaxMul:.07,cdMul:.97},              /* 壁垒：生命 + 全局 CD 微减 */
    },
    mage:{
      pyro_chain:{skillCd:{i:0,mul:.88},fx:{pyroBurst:1}}, /* 炎爆连击：炎爆 CD ↓ */
      ignite    :{dmgMul:.05},
      combustion:{dmgMul:.04,skillCd:{i:0,mul:.95}},
      frostbite :{fx:{frostSlow:.35}},                  /* 冰霜减速（标记，技能本体不改） */
      ice_ward  :{hpMaxMul:.05,skillCd:{i:1,mul:.90}},  /* 冰霜新星 CD ↓ */
      deep_freeze:{fx:{frostSlow:.15},cdMul:.97},
    },
    archer:{
      rapid     :{skillCd:{i:0,mul:.90},cdMul:.97},     /* 速射：瞄准 CD ↓ + 全局微减 */
      focus     :{dmgMul:.05},
      sniper    :{dmgMul:.04,skillCd:{i:0,mul:.95}},
      venom     :{fx:{poisonArrow:1}},                  /* 毒箭标记 */
      survival  :{hpMaxMul:.05},
      trickle   :{hpMaxMul:.06,skillCd:{i:1,mul:.92}},  /* 多重 CD ↓ */
    },
  },
  /* 存档（STEP 11）：localStorage 键与 schema 版本；改键会与旧存档隔离 */
  save:{key:"azeroth3d_save_v1",version:1},
  /* FPS 叠层（STEP 12）：刷新间隔秒；着色对照目标帧率 */
  fps:{updateInterval:.5,desktopTarget:60,mobileTarget:30},
  /* 装备评分权重（STEP 14 角色面板） */
  gearScore:{
    quality:{common:10,uncommon:25,rare:55,legendary:120},
    dmgMul:200,   /* (dmgMul-1) × 此系数 */
    hpMax:.05,    /* hpMax × 此系数 */
  },
  /* 小地图 / 世界地图（STEP 16） */
  map:{
    miniSize:140,           /* canvas 边长（外框含 padding 约 148） */
    worldSize:520,          /* 世界地图 canvas 边长 */
    padding:10,
    worldPad:18,            /* 世界地图内边距（留标签） */
    showInRaid:true,        /* 副本内显示局部小地图 */
  },
};
const BAL=BALANCE;

/* ============================================================
   可播种随机器（STEP 0，参考 WoC 确定性 Rng）
   世界摆放专用：种子固定 ⇒ 树木/岩石/台地位置永远一样
   玩法随机（伤害浮动、游荡目标等）仍走 rand()，两路分流
   ============================================================ */
const WORLD_SEED=20260721;
function SeededRng(seed){let a=seed>>>0;return function(){
  a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const worldRng=SeededRng(WORLD_SEED);
const srand=(a,b)=>a+worldRng()*(b-a);         /* 摆放类随机：静态布景专用 */

/* ---------------- makeLabel：Canvas 悬浮文字（掉落系统以品质色调用，默认参数保持旧观感） ---------------- */
function makeLabel(text,w,color="#ffd9a0",glow="rgba(255,90,0,.95)"){
  const cv=document.createElement("canvas");cv.width=512;cv.height=128;
  const cx=cv.getContext("2d");
  cx.font="bold 78px 'Noto Sans SC','Microsoft YaHei',sans-serif";
  cx.textAlign="center";cx.textBaseline="middle";
  cx.shadowColor=glow;cx.shadowBlur=26;
  cx.fillStyle=color;cx.fillText(text,256,64);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),
    transparent:true,depthWrite:false}));
  sp.scale.set(w,w/4,1); return sp;
}

/* ---------------- 场景基础（双场景：莫高雷 / 熔火之心） ---------------- */
const sceneRaid=new THREE.Scene();
sceneRaid.fog=new THREE.FogExp2(0x1a0602,0.016);
let scene=sceneRaid;   /* 当前渲染场景 */
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,0.1,400);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$("#game").appendChild(renderer.domElement);
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);});

/* ---------------- 副本场景由 raid.js 的 buildRaidScene() 搭建 ---------------- */
const lavaUniforms={uTime:{value:0}};  /* Shader uniform，供 raid.js 与 main.js 共用 */

/* ---------------- 火星粒子（副本场景共用，每帧动画） ---------------- */
const ARENA_R=26;
const EMBERS=260;
const emberGeo=new THREE.BufferGeometry();
const emberPos=new Float32Array(EMBERS*3), emberVel=new Float32Array(EMBERS);
for(let i=0;i<EMBERS;i++){
  emberPos[i*3]=rand(-60,60);emberPos[i*3+1]=rand(0,26);emberPos[i*3+2]=rand(-60,60);
  emberVel[i]=rand(.8,2.6);
}
emberGeo.setAttribute("position",new THREE.BufferAttribute(emberPos,3));
const embers=new THREE.Points(emberGeo,new THREE.PointsMaterial({color:0xffa040,size:.32,
  transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));
/* 火星粒子在 buildRaidScene 中加到 sceneRaid */
