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
    boar    :{hp:650, dmg:[55,85],  atkCd:2.2, meleeR:2.4, aggroR:7,  leashR:34, wanderSpd:3,  chaseSpd:5.5, respawnT:25,  xp:80},
    wolf    :{hp:520, dmg:[45,70],  atkCd:1.8, meleeR:2.3, aggroR:9,  leashR:38, wanderSpd:3.5,chaseSpd:6.5, respawnT:30,  xp:90,  socialR:18},
    bird    :{hp:480, dmg:[40,60],  atkCd:1.6, meleeR:2.2, aggroR:0,  leashR:30, wanderSpd:4.5,chaseSpd:8,   respawnT:25,  xp:70},
    harpy   :{hp:4200,dmg:[90,130], atkCd:2.4, meleeR:3.2, aggroR:12, leashR:44, wanderSpd:2.5,chaseSpd:5,   respawnT:60,  xp:450,
              cast:{name:"女妖之火",dmg:[220,300],dur:1.5,cd:6,range:20,speed:16,hitR:3}},
    boarKing:{hp:3200,dmg:[110,160],atkCd:2.4, meleeR:3.2, aggroR:8,  leashR:40, wanderSpd:2.2,chaseSpd:5,   respawnT:120, xp:500},
  },
  /* 脱战回巢（STEP 5 规范化）：回巢途中每秒回复最大生命的百分比，且免疫伤害 */
  leash:{regenPct:.5},
  /* 烈焰之子 */
  add:{hp:1400, dmg:[130,190], atkCd:2, speed:4.6, meleeR:3, stopR:2.6},
  /* 炎魔领主 · 拉戈斯 */
  boss:{hp:120000, phase2At:.5, phase3At:.3, submergeT:25, addCount:4,
    melee   :{dmg:[300,420], p2Mul:1.25, p3Mul:1.5, cd:[3,4.2], range:12, hitRange:13, delayMs:450},
    fireball:{dmg:[520,680], cast:1.8, cd:[8,11], hitR:4, speed:22},
    eruption:{dmg:[600,780], cast:1.5, cd:[9,12], count:3, p2Count:5, p3Count:8, delay:2.2},
    wrath   :{dmg:[380,520], cast:2.2, cd:[16,20], range:16},
  },
  /* 任务 · 狂躁的野猪 / 讨伐拉戈斯 */
  quest:{boarKills:3, rewardHp:600, rewardDmgMul:1.15},
  /* 掉落与尸体拾取（STEP 2）：品质权重 70/25/5 · 尸体停留秒数 · 拾取距离 */
  loot:{weights:{common:70,uncommon:25,rare:5}, corpseT:8, pickupR:3.5,
        eliteWeights:{uncommon:72,rare:28}},   /* 精英必掉优秀以上（STEP 5） */
  /* 背包（STEP 4）：格数 */
  bag:{size:16},
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
  levels:{max:10, xp:{quest:300, boss:2000},   /* 野怪经验在 mobs 表逐条配置（STEP 5） */
    xpMax:[200,300,450,650,900,1200,1600,2100,2700],  /* 第 n 级升下一级所需经验 */
    perLevel:{dmgMul:.05, hpMax:.08}},                 /* 每级：基础伤害 +5% · 生命上限 +8% */
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
