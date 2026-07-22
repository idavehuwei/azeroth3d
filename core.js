/* ============================================================
   熔火之心 · core.js
   基础设施：工具函数 / 数值总表 BALANCE / 可播种随机器 / 渲染器 / 相机
            熔火之心场景环境（岩浆、平台、岩柱、火星粒子）/ makeLabel
   ------------------------------------------------------------
   [依赖] THREE（全局，CDN 引入）
   [导出] $ clamp rand R srand worldRng BALANCE BAL WORLD_SEED
          hashZoneId getZoneSeed setZoneSeed effectiveWorldSeed isMobileClient
          sceneRaid scene camera renderer lavaUniforms ARENA_R embers
          EMBERS emberVel makeLabel makeNameplate updateNameplateHp updateNameplatePresentation disposeNameplate
          GFX_PRESETS getGraphicsSettings applyGraphicsSettings loadGraphicsSettings saveGraphicsSettings
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
  /* 玩家技能（V1-C4：ranks R1/R2/R3；取值一律 getSkillBal） */
  skillRank:{unlock:[1,8,14]}, /* 默认解锁等级（各 rank.minLevel 可覆盖） */
  skills:{
    heroicStrike:{ranks:[
      {minLevel:1, dmg:[520,680], addDmg:[500,650], reach:4.8, addReach:4.5, bossReach:10},
      {minLevel:8, dmg:[614,802], addDmg:[590,767], reach:5.0, addReach:4.7, bossReach:10},
      {minLevel:14, dmg:[707,925], addDmg:[680,884], reach:5.2, addReach:4.9, bossReach:10}
    ]},
    whirlwind:{ranks:[
      {minLevel:1, dmg:[700,900], bossDmg:[760,940], radius:9, bossRadius:11},
      {minLevel:8, dmg:[826,1062], bossDmg:[897,1109], radius:9.2, bossRadius:11.2},
      {minLevel:14, dmg:[952,1224], bossDmg:[1034,1278], radius:9.4, bossRadius:11.4}
    ]},
    charge:{ranks:[
      {minLevel:1, rageGain:25, minDist:5, stopDist:6},
      {minLevel:8, rageGain:30, minDist:5, stopDist:6},
      {minLevel:14, rageGain:34, minDist:5, stopDist:6}
    ]},
    potion:{ranks:[
      {minLevel:1, heal:[1600,2000]},
      {minLevel:8, heal:[1888,2360]},
      {minLevel:14, heal:[2176,2720]}
    ]},
    pyroblast:{ranks:[
      {minLevel:1, dmg:[880,1080]},
      {minLevel:8, dmg:[1038,1274]},
      {minLevel:14, dmg:[1197,1469]}
    ]},
    frostNova:{ranks:[
      {minLevel:1, dmg:[400,520], bossDmg:[420,540], radius:10, bossRadius:12, rootT:3},
      {minLevel:8, dmg:[472,614], bossDmg:[496,637], radius:10.2, bossRadius:12.2, rootT:3},
      {minLevel:14, dmg:[544,707], bossDmg:[571,734], radius:10.4, bossRadius:12.4, rootT:3}
    ]},
    blink:{ranks:[
      {minLevel:1, dist:12},
      {minLevel:8, dist:13},
      {minLevel:14, dist:14}
    ]},
    iceBlock:{ranks:[
      {minLevel:1, invuln:3},
      {minLevel:8, invuln:3.5},
      {minLevel:14, invuln:4}
    ]},
    aimedShot:{ranks:[
      {minLevel:1, dmg:[820,1000]},
      {minLevel:8, dmg:[968,1180]},
      {minLevel:14, dmg:[1115,1360]}
    ]},
    multiShot:{ranks:[
      {minLevel:1, dmg:[430,540]},
      {minLevel:8, dmg:[507,637]},
      {minLevel:14, dmg:[585,734]}
    ]},
    roll:{ranks:[
      {minLevel:1, dist:9, invuln:.7},
      {minLevel:8, dist:10, invuln:.75},
      {minLevel:14, dist:11, invuln:.8}
    ]},
    heal:{ranks:[
      {minLevel:1, heal:[1200,1500]},
      {minLevel:8, heal:[1416,1770]},
      {minLevel:14, heal:[1632,2040]}
    ]},
    flashHeal:{ranks:[
      {minLevel:1, heal:[650,850]},
      {minLevel:8, heal:[767,1003]},
      {minLevel:14, heal:[884,1156]}
    ]},
    smite:{ranks:[
      {minLevel:1, dmg:[720,920]},
      {minLevel:8, dmg:[850,1086]},
      {minLevel:14, dmg:[979,1251]}
    ]},
    powerWordShield:{ranks:[
      {minLevel:1, absorb:[1800,2200], duration:15},
      {minLevel:8, absorb:[2124,2596], duration:15},
      {minLevel:14, absorb:[2448,2992], duration:16}
    ]},
    lightningBolt:{ranks:[
      {minLevel:1, dmg:[740,940]},
      {minLevel:8, dmg:[873,1109]},
      {minLevel:14, dmg:[1006,1278]}
    ]},
    earthShock:{ranks:[
      {minLevel:1, dmg:[520,680]},
      {minLevel:8, dmg:[614,802]},
      {minLevel:14, dmg:[707,925]}
    ]},
    healingWave:{ranks:[
      {minLevel:1, heal:[1100,1400]},
      {minLevel:8, heal:[1298,1652]},
      {minLevel:14, heal:[1496,1904]}
    ]},
    healingTotem:{ranks:[
      {minLevel:1, healPerTick:[90,130], radius:9, duration:14, tick:1.0, max:1},
      {minLevel:8, healPerTick:[106,153], radius:9.5, duration:15, tick:1.0, max:1},
      {minLevel:14, healPerTick:[122,177], radius:10, duration:16, tick:1.0, max:1}
    ]},
    sinisterStrike:{ranks:[
      {minLevel:1, dmg:[500,660], addDmg:[480,620], reach:4.6, addReach:4.5, bossReach:10},
      {minLevel:8, dmg:[590,779], addDmg:[566,732], reach:4.8, addReach:4.7, bossReach:10},
      {minLevel:14, dmg:[680,898], addDmg:[653,843], reach:5.0, addReach:4.9, bossReach:10}
    ]},
    backstab:{ranks:[
      {minLevel:1, dmg:[920,1180], addDmg:[880,1120], reach:4.4, addReach:4.3, bossReach:9.5, behindArc:1.35, stealthMul:1.25},
      {minLevel:8, dmg:[1086,1392], addDmg:[1038,1322], reach:4.6, addReach:4.5, bossReach:9.5, behindArc:1.35, stealthMul:1.28},
      {minLevel:14, dmg:[1251,1605], addDmg:[1197,1523], reach:4.8, addReach:4.7, bossReach:9.5, behindArc:1.4, stealthMul:1.32}
    ]},
    stealth:{ranks:[{minLevel:1}]},
    sprint:{ranks:[
      {minLevel:1, speedMul:1.55, duration:6},
      {minLevel:8, speedMul:1.65, duration:7},
      {minLevel:14, speedMul:1.75, duration:8}
    ]},
    /* —— V1-C5 嘲讽 / 打断 —— */
    taunt:{ranks:[
      {minLevel:1, dur:4, range:16, margin:50000},
      {minLevel:8, dur:4.5, range:17, margin:50000},
      {minLevel:14, dur:5, range:18, margin:50000}
    ]},
    interrupt:{ranks:[
      {minLevel:1, range:8, lockout:4},
      {minLevel:8, range:9, lockout:4.5},
      {minLevel:14, range:10, lockout:5}
    ]},
  },
  /* V1-C2：潜行（脱战隐身 · 缩小主动 aggro） */
  stealth:{aggroMul:.35, alpha:.42, breakOnAttack:true, breakOnHit:true},
  /* 野怪族群数值表（STEP 5）：加新怪 = 加一条；aggroR:0 = 中立被动（只反击） */
  mobs:{
    /* —— 莫高雷分层（仿经典等级带） —— */
    bird    :{level:2, hp:380, dmg:[28,42],  atkCd:1.6, meleeR:2.2, aggroR:0,  leashR:28, wanderSpd:4.5,chaseSpd:8,   respawnT:22,  xp:45,  copper:[4,10]},
    youngBoar:{level:3, hp:420, dmg:[35,55], atkCd:2.0, meleeR:2.2, aggroR:6,  leashR:28, wanderSpd:3.2,chaseSpd:5.2, respawnT:22,  xp:55,  copper:[5,12]},
    bristleback:{level:3, hp:480, dmg:[40,60], atkCd:2.0, meleeR:2.4, aggroR:8, leashR:30, wanderSpd:2.8,chaseSpd:5.4, respawnT:24, xp:65, copper:[6,14]},
    wolf    :{level:4, hp:520, dmg:[42,65],  atkCd:1.8, meleeR:2.3, aggroR:9,  leashR:34, wanderSpd:3.5,chaseSpd:6.5, respawnT:26,  xp:70,  socialR:16, copper:[8,16]},
    plainslion:{level:6, hp:780, dmg:[58,88], atkCd:1.7, meleeR:2.5, aggroR:10, leashR:36, wanderSpd:3.4,chaseSpd:6.8, respawnT:28, xp:110, socialR:14, copper:[12,24]},
    boar    :{level:6, hp:720, dmg:[55,85],  atkCd:2.2, meleeR:2.4, aggroR:7,  leashR:34, wanderSpd:3,  chaseSpd:5.5, respawnT:25,  xp:95,  copper:[10,20]},
    thunderhawk:{level:6, hp:680, dmg:[50,78], atkCd:1.7, meleeR:2.3, aggroR:8, leashR:36, wanderSpd:4.2,chaseSpd:7.5, respawnT:28, xp:100, copper:[12,24]},
    kodo    :{level:7, hp:1100,dmg:[70,105], atkCd:2.5, meleeR:3.0, aggroR:0,  leashR:40, wanderSpd:2.2,chaseSpd:4.5, respawnT:35,  xp:130, copper:[16,32]},
    palemane:{level:7, hp:850, dmg:[60,92],  atkCd:1.9, meleeR:2.5, aggroR:9,  leashR:36, wanderSpd:2.8,chaseSpd:5.8, respawnT:28,  xp:120, socialR:14, copper:[14,28]},
    windElement:{level:4, hp:450, dmg:[38,58], atkCd:1.8, meleeR:2.4, aggroR:8, leashR:32, wanderSpd:3.5,chaseSpd:6.2, respawnT:26, xp:80, copper:[8,16]},
    waterElement:{level:7, hp:900, dmg:[65,95], atkCd:2.0, meleeR:2.6, aggroR:9, leashR:34, wanderSpd:2.4,chaseSpd:5.0, respawnT:30, xp:125, copper:[14,28]},
    oasisWater:{level:16, hp:1450,dmg:[90,130], atkCd:2.0, meleeR:2.7, aggroR:10, leashR:36, wanderSpd:2.4,chaseSpd:5.2, respawnT:32, xp:185, copper:[24,42]},
    earthElement:{level:6, hp:820, dmg:[60,90], atkCd:2.2, meleeR:2.6, aggroR:8, leashR:34, wanderSpd:2.2,chaseSpd:4.8, respawnT:30, xp:115, copper:[12,26]},
    baeldun :{level:9, hp:980, dmg:[72,108], atkCd:2.0, meleeR:2.6, aggroR:10, leashR:38, wanderSpd:2.4,chaseSpd:5.2, respawnT:32,  xp:150, copper:[20,38]},
    baeldunDigger:{level:8, hp:880, dmg:[65,98], atkCd:2.1, meleeR:2.5, aggroR:9, leashR:36, wanderSpd:2.3,chaseSpd:5.0, respawnT:30, xp:135, copper:[16,34]},
    venture :{level:8, hp:900, dmg:[68,100], atkCd:1.9, meleeR:2.5, aggroR:9,  leashR:36, wanderSpd:2.6,chaseSpd:5.4, respawnT:30,  xp:140, copper:[18,36]},
    ventureBoss:{level:10, hp:1400,dmg:[88,128], atkCd:2.0, meleeR:2.7, aggroR:11, leashR:40, wanderSpd:2.2,chaseSpd:5.0, respawnT:45, xp:200, copper:[30,55]},
    windfury:{level:10, hp:1050,dmg:[78,115], atkCd:1.8, meleeR:2.8, aggroR:11, leashR:42, wanderSpd:2.8,chaseSpd:5.8, respawnT:34, xp:170, socialR:18, copper:[22,42],
              cast:{name:"风怒之矢",dmg:[140,200],dur:1.3,cd:7,range:18,speed:15,hitR:2.8}},
    oasisHarpy:{level:13, hp:1200,dmg:[80,115], atkCd:1.8, meleeR:2.7, aggroR:10, leashR:40, wanderSpd:2.8,chaseSpd:5.8, respawnT:30, xp:160, socialR:16, copper:[20,36]},
    quilboarElder:{level:15, hp:3200,dmg:[110,155], atkCd:2.2, meleeR:3.0, aggroR:12, leashR:42, wanderSpd:2.4,chaseSpd:5.2, respawnT:50, xp:320, copper:[50,90]},
    barrensLion:{level:12, hp:1100,dmg:[78,112], atkCd:1.7, meleeR:2.6, aggroR:10, leashR:38, wanderSpd:3.2,chaseSpd:6.6, respawnT:28, xp:145, socialR:14, copper:[16,30]},
    barrensBristle:{level:11, hp:980, dmg:[72,105], atkCd:2.0, meleeR:2.5, aggroR:9, leashR:34, wanderSpd:2.8,chaseSpd:5.6, respawnT:26, xp:130, copper:[14,28]},
    harpy   :{level:11, hp:4200,dmg:[90,130], atkCd:2.4, meleeR:3.2, aggroR:12, leashR:44, wanderSpd:2.5,chaseSpd:5,   respawnT:60,  xp:450, copper:[80,140], socialR:24,
              cast:{name:"女妖之火",dmg:[220,300],dur:1.5,cd:6,range:20,speed:16,hitR:3}},
    boarKing:{level:9, hp:3200,dmg:[110,160],atkCd:2.4, meleeR:3.2, aggroR:8,  leashR:40, wanderSpd:2.2,chaseSpd:5,   respawnT:120, xp:500, copper:[120,200], socialR:22},
    /* —— STEP 18 贫瘠之地 —— */
    quilboar:{level:11, hp:1200,dmg:[75,110], atkCd:2.0, meleeR:2.6, aggroR:8,  leashR:36, wanderSpd:2.8,chaseSpd:5.8, respawnT:28,  xp:140, copper:[18,35]},
    centaur :{level:13, hp:1800,dmg:[95,140], atkCd:2.2, meleeR:3.0, aggroR:10, leashR:40, wanderSpd:2.6,chaseSpd:5.5, respawnT:35,  xp:180, copper:[28,50], socialR:20},
    zebra   :{level:10, hp:700, dmg:[50,75],  atkCd:1.7, meleeR:2.3, aggroR:0,  leashR:32, wanderSpd:4.2,chaseSpd:7.5, respawnT:26,  xp:90,  copper:[10,20]},
    raptor  :{level:16, hp:1400,dmg:[90,130], atkCd:1.7, meleeR:2.6, aggroR:10, leashR:38, wanderSpd:3.2,chaseSpd:6.5, respawnT:30, xp:175, socialR:16, copper:[22,40]},
    crocolisk:{level:16, hp:1500,dmg:[95,135], atkCd:2.1, meleeR:2.8, aggroR:9, leashR:36, wanderSpd:2.4,chaseSpd:5.2, respawnT:32, xp:180, copper:[24,44]},
    /* —— V1-B1 赭岩谷 —— */
    scorp     :{level:12, hp:1100,dmg:[80,115], atkCd:1.9, meleeR:2.5, aggroR:9,  leashR:34, wanderSpd:2.6,chaseSpd:6.0, respawnT:26,  xp:150, copper:[20,38]},
    razorback :{level:13, hp:1600,dmg:[95,135], atkCd:2.1, meleeR:2.8, aggroR:9,  leashR:38, wanderSpd:2.5,chaseSpd:5.6, respawnT:32,  xp:190, copper:[26,48]},
    cliffHarpy:{level:14, hp:5200,dmg:[110,155],atkCd:2.3, meleeR:3.3, aggroR:13, leashR:46, wanderSpd:2.4,chaseSpd:5.2, respawnT:70,  xp:520, copper:[100,160], socialR:24,
              cast:{name:"崖风火矢",dmg:[260,340],dur:1.4,cd:5.5,range:22,speed:17,hitR:3.1}},
    /* —— STEP 24 世界 Boss —— */
    centaurHerald:{level:16, hp:9000,dmg:[140,200],atkCd:2.1,meleeR:3.4,aggroR:14,leashR:48,
      wanderSpd:2.2,chaseSpd:5.2,respawnT:240,xp:900,copper:[200,320],socialR:26,
      cast:{name:"战矛投掷",dmg:[280,360],dur:1.4,cd:7,range:22,speed:18,hitR:3.2}},
  },
  /* 脱战回巢（STEP 5 规范化）：回巢途中每秒回复最大生命的百分比，且免疫伤害 */
  leash:{regenPct:.5},
  /* 精英外观与随从（体型放大 / 脚下光环 / 周边小弟） */
  elite:{
    scaleMul:1.25,            /* 在模型 size 之上再放大 */
    labelYBonus:1.4,
    worldBossScaleMul:1.45,
    worldBossLabelYBonus:2.0,
    aura:{innerR:1.6,outerR:2.9,opacity:.55,pulse:0.35},
    worldBossAura:{innerR:2.2,outerR:4.0,opacity:.65,pulse:0.4},
    minions:{
      harpy   :{type:"windfury", count:3, radius:7},
      cliffHarpy:{type:"scorp", count:2, radius:8},
      boarKing:{type:"boar", count:3, radius:8},
      ashmane :{type:"boar", count:3, radius:8},
      centaurHerald:{type:"centaur", count:2, radius:9},
    },
  },
  /* 稀有 / 世界 Boss（STEP 24）：刷新公告开关 */
  rares:{
    announceSpawn:true,
    announceKill:true,
    gold:"#ffd700",
    elitePink:"#ff9ad0",
  },
  /* 死亡与复活（STEP 15） */
  death:{
    respawnHpPct:.5,          /* 复活时生命比例 */
    weaknessT:10,             /* 虚弱秒数 */
    moveSpeedMul:.7,          /* 虚弱移速倍率（-30%） */
    worldSpawn:{x:0,z:58},    /* 灵魂医者旁（莫高雷默认） */
    raidSpawn:{x:0,z:18},     /* 副本走廊入口 */
    corpseDelay:1.2,          /* 倒地后弹出死亡面板延迟 */
    spawns:{                  /* 分区复活点（STEP 18） */
      mulgore:{x:0,z:58},
      barrens:{x:-8,z:5},
      durotar:{x:0,z:6},
    },
  },
  /* plan-v1 · V1-A5 音效（可关） */
  sfx:{
    enabled:true,
    footVol:1,
    footThrottleMs:100,
    mobHit:null,
    woodPts:[[-36,40,14],[-28,32,10],[-48,48,10]],
  },
  /* plan-v1 · V1-A3 / plan-V2 · R6 生物动画挂点（仅表现，不改伤害/仇恨） */
  anim:{
    walkFreq:9, walkAmp:.55, walkDecay:8,
    attackDecay:4,
    deathRollSpd:6,
    bobAmp:.22,
    blendDur:.15,
    wingFlap:{freq:1.4, amp:.35},
    bossHammerDecay:1.6,   /* swingT 每秒衰减；与 delayMs 对齐伤害帧 */
    bossShakeAmp:.28,      /* 挥锤落地震屏幅度（render-only） */
    bossShakeDecay:6,
    bossCoreGlow:{min:1, max:2.8}, /* 熔核亮度随缺血上升 */
  },
  /* 烈焰之子 */
  add:{level:15, hp:1400, dmg:[130,190], atkCd:2, speed:4.6, meleeR:3, stopR:2.6, copper:[12,28]},
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
  /* 哀嚎洞穴（STEP 21） */
  wailing:{
    arenaR:24,
    minLevel:15,
    corridorCount:3,
    ground:0x2a3a28, wall:0x1a2818, moss:0x3a5a30,
    sky:0x0a1208, fog:0x142010, fogDensity:0.028,
  },
  wailingAdd:{hp:2200, dmg:[110,160], atkCd:2.1, speed:4.8, meleeR:3.1, stopR:2.5, copper:[20,40]},
  cobrahn:{hp:42000, phase2At:.55, addCount:2, copper:600,
    melee :{dmg:[200,280], p2Mul:1.3, cd:[2.5,3.4], range:9, hitRange:10, delayMs:280},
    spit  :{dmg:[240,320], cast:1.4, cd:[5.5,7.5], hitR:3.0, speed:17, count:3, p2Count:5, fan:0.48},
    breath:{dmg:[380,500], cast:1.7, cd:[10,13], delay:1.5, segs:5, step:4.0, ringR:3.2, p2Segs:7},
  },
  verdan:{hp:68000, phase2At:.5, addCount:3, copper:1200,
    melee :{dmg:[240,330], p2Mul:1.35, cd:[2.6,3.5], range:10, hitRange:11, delayMs:300},
    spit  :{dmg:[280,360], cast:1.5, cd:[6,8], hitR:3.3, speed:16, count:4, p2Count:6, fan:0.5},
    stomp :{dmg:[360,480], cast:1.4, cd:[9,12], count:3, p2Count:5, delay:1.8, ringR:5.5},
  },
  /* 奥妮克希亚巢穴·精简（STEP 28） */
  onyxiasLair:{
    arenaR:26,
    minLevel:16,
    corridorCount:2,
    ground:0x2a1a18, wall:0x1a1010, bone:0xc8b898,
    sky:0x120808, fog:0x1a0c0c, fogDensity:0.022,
  },
  onyxiaAdd:{hp:2800, dmg:[130,180], atkCd:2.0, speed:5.2, meleeR:3.0, stopR:2.4, copper:[30,55]},
  onyxia:{hp:92000, phase2At:.70, phase3At:.40, addCount:3, copper:1800, flyY:8,
    melee :{dmg:[260,360], p2Mul:1.0, p3Mul:1.4, cd:[2.6,3.6], range:11, hitRange:12, delayMs:300},
    spit  :{dmg:[280,380], cast:1.5, cd:[5.5,7.5], hitR:3.2, speed:18,
      count:3, p2Count:5, p3Count:6, fan:0.46},
    breath:{dmg:[420,560], cast:1.7, cd:[10,13], delay:1.55,
      segs:5, p2Segs:6, p3Segs:5, step:4.2, ringR:3.4},
    wing  :{dmg:[380,500], cast:1.4, cd:[8,11], count:2, p2Count:4, p3Count:5, delay:1.8, ringR:5.5},
    deepBreath:{dmg:[620,820], cast:2.2, cd:[14,18], delay:2.0,
      segs:8, p2Segs:8, p3Segs:10, step:3.8, ringR:3.8},
  },
  /* 怒焰裂谷·精简（plan-v1 · V1-B3） */
  ragefire:{
    arenaR:22,
    minLevel:13,
    corridorCount:3,
    ground:0x3a1810, wall:0x2a1008, lava:0xff6020,
    sky:0x180808, fog:0x2a1008, fogDensity:0.026,
  },
  ragefireAdd:{hp:2400, dmg:[120,170], atkCd:2.0, speed:5.0, meleeR:3.0, stopR:2.4, copper:[22,45]},
  oggleflint:{hp:38000, phase2At:.55, addCount:2, copper:550,
    melee :{dmg:[190,270], p2Mul:1.3, cd:[2.4,3.3], range:9, hitRange:10, delayMs:280},
    spit  :{dmg:[220,300], cast:1.35, cd:[5.2,7.0], hitR:2.9, speed:18, count:3, p2Count:5, fan:0.46},
    breath:{dmg:[360,480], cast:1.6, cd:[9.5,12.5], delay:1.45, segs:5, step:3.8, ringR:3.1, p2Segs:7},
  },
  taragaman:{hp:62000, phase2At:.5, addCount:3, copper:1100,
    melee :{dmg:[230,320], p2Mul:1.35, cd:[2.5,3.4], range:10, hitRange:11, delayMs:300},
    spit  :{dmg:[260,340], cast:1.45, cd:[5.8,7.8], hitR:3.2, speed:17, count:4, p2Count:6, fan:0.48},
    stomp :{dmg:[340,460], cast:1.35, cd:[8.5,11.5], count:3, p2Count:5, delay:1.7, ringR:5.2},
  },
  /* 任务 · 主线 + 支线奖励表（STEP 22） */
  quest:{boarKills:5, rewardHp:600, rewardDmgMul:1.15, rewardCopper:150,
    barrens:{quilboarKills:8, rewardXp:400, rewardCopper:200},
    durotar:{scorpKills:5, rewardXp:380, rewardCopper:180},
    side:{
      hawkwind_totem:{xp:80,copper:30,kills:1},
      hunt_continues:{xp:140,copper:60,kills:5},
      raoul_supply:{xp:160,copper:70,kills:1},
      bloodhoof_journey:{xp:180,copper:80,kills:1},
      clear_palemane:{xp:240,copper:100,kills:6},
      thunderhorn_trouble:{xp:160,copper:70,kills:1},
      well_pollution:{xp:220,copper:90,kills:4},
      cleanse_well:{xp:240,copper:100,kills:1},
      mulgore_crisis:{xp:300,copper:120,kills:1},
      earthmother_gift:{xp:100,copper:40,kills:4},
      wind_totem_quest:{xp:150,copper:60,kills:3},
      red_cloud_land:{xp:180,copper:75,kills:6},
      lost_necklace:{xp:120,copper:50,kills:1},
      soul_stone:{xp:160,copper:65,kills:3},
      land_spirit:{xp:200,copper:85,kills:3},
      tark_request:{xp:210,copper:90,kills:5},
      plains_patrol:{xp:220,copper:95,kills:6},
      haru_prey:{xp:220,copper:95,kills:6},
      mara_supply:{xp:180,copper:70,kills:1},
      stonehoof_trial:{xp:200,copper:80,kills:3},
      mist_clue:{xp:180,copper:70,kills:1},
      dwarf_invasion:{xp:200,copper:85,kills:1},
      palemane_totem:{xp:220,copper:90,kills:1},
      golden_hunt:{xp:230,copper:95,kills:6},
      plains_pelt:{xp:190,copper:80,kills:4},
      winterhoof_trouble:{xp:180,copper:75,kills:5},
      winterhoof_water:{xp:200,copper:85,kills:1},
      harpy_nest:{xp:320,copper:130,kills:6},
      windfury_harpies:{xp:320,copper:130,kills:6},
      dwarven_digsite:{xp:300,copper:120,kills:5},
      baeldun_dwarves:{xp:300,copper:120,kills:5},
      dwarf_plans:{xp:280,copper:110,kills:1},
      venture_co:{xp:280,copper:115,kills:5},
      mine_machines:{xp:260,copper:105,kills:1},
      goblin_supply:{xp:250,copper:100,kills:2},
      blasting_mats:{xp:270,copper:110,kills:3},
      soul_mesa_rite:{xp:280,copper:115,kills:4},
      stonehoof_request:{xp:300,copper:125,kills:5},
      wind_element:{xp:260,copper:100,kills:4},
      harpy_feathers:{xp:280,copper:110,kills:5},
      sun_eye:{xp:240,copper:95,kills:1},
      grimtotem_loyalty:{xp:320,copper:130,kills:1},
      runetotem_wisdom:{xp:220,copper:90,kills:5},
      mesa_escort:{xp:280,copper:110,kills:1},
      /* 旧键兼容 */
      first_step:{xp:40,copper:10,kills:1},
      battleboars:{xp:160,copper:70,kills:4},
      rites_earthmother:{xp:180,copper:70,kills:1},
      sharing_the_land:{xp:240,copper:100,kills:5},
      poison_water:{xp:200,copper:80,kills:3},
      winterhoof_cleansing:{xp:220,copper:90,kills:1},
      thunderhorn_cleansing:{xp:240,copper:100,kills:1},
      greyjaw_bounty:{xp:450,copper:180,kills:1},
      supply_run:{xp:240,copper:110,kills:4},
      darsok_supply:{xp:160,copper:70,kills:1},
      kil_goods:{xp:150,copper:60,kills:1},
      thom_scout:{xp:180,copper:75,kills:1},
      kag_lions:{xp:220,copper:95,kills:6},
      kil_ratchet:{xp:200,copper:85,kills:1},
      thom_cannons:{xp:260,copper:110,kills:1},
      kag_kodo:{xp:240,copper:100,kills:4},
      serra_harpies:{xp:250,copper:105,kills:8},
      lal_wc_entrance:{xp:200,copper:80,kills:1},
      lal_grave:{xp:220,copper:90,kills:1},
      serra_feathers:{xp:240,copper:100,kills:5},
      mankrik_wife:{xp:260,copper:110,kills:1},
      zinge_potion:{xp:230,copper:95,kills:4},
      mankrik_revenge:{xp:320,copper:140,kills:1},
      lal_leather:{xp:280,copper:120,kills:4},
      zinge_venom:{xp:260,copper:110,kills:4},
      lal_fang:{xp:400,copper:160,kills:1},
      dead_oasis_main:{xp:280,copper:120,kills:3},
      crocolisk_hunt:{xp:220,copper:95,kills:4},
      raptor_feathers:{xp:230,copper:100,kills:4},
      centaur_threat:{xp:320,copper:140,kills:3},
      wailing_call:{xp:200,copper:60,kills:1},
      ochre_sting:{xp:280,copper:110,kills:5},
      razor_patrol:{xp:340,copper:130,kills:3},
      sacred_pool:{xp:120,copper:40,kills:1},
      ancestor_tusk:{xp:200,copper:90,kills:3},
      bird_cull:{xp:160,copper:70,kills:4},
      wind_feather:{xp:150,copper:60,kills:3},
      sacred_salve:{xp:140,copper:50,kills:1},
      boar_cull:{xp:100,copper:45,kills:6},
      lake_shrine:{xp:130,copper:55,kills:1},
      wolf_pelts:{xp:170,copper:75,kills:4},
      mesa_path:{xp:110,copper:40,kills:1},
      thunderhawk_hunt:{xp:260,copper:110,kills:4},
      dust_watch:{xp:150,copper:55,kills:1},
      zebra_meat:{xp:180,copper:80,kills:5},
      quil_extra:{xp:200,copper:90,kills:5},
      bird_dust:{xp:160,copper:70,kills:3},
      supply_crate:{xp:190,copper:85,kills:1},
      signal_horn:{xp:140,copper:50,kills:1},
      caravan_escort:{xp:300,copper:120,kills:1},
      east_ridge:{xp:130,copper:50,kills:1},
      hide_bundle:{xp:170,copper:75,kills:3},
      oasis_visit:{xp:120,copper:45,kills:1},
      cliff_harpy:{xp:360,copper:140,kills:1},
      scorp_extra:{xp:220,copper:95,kills:6},
      cliff_beacon:{xp:160,copper:60,kills:1},
      ochre_report:{xp:180,copper:80,kills:1},
      scorched_oil:{xp:150,copper:55,kills:1},
      runner_escort:{xp:320,copper:130,kills:1},
      razor_extra:{xp:240,copper:100,kills:4},
      west_canyon:{xp:140,copper:50,kills:1},
      sting_bundle:{xp:170,copper:70,kills:3},
      outpost_horn:{xp:145,copper:55,kills:1},
      sacred_pool_main:{xp:200,copper:80,kills:1},
      ancestor_main:{xp:250,copper:100,kills:3},
      plains_wolves:{xp:220,copper:90,kills:5},
      supply_crate_main:{xp:240,copper:100,kills:1},
      cliff_beacon_main:{xp:200,copper:80,kills:1},
      runner_main:{xp:280,copper:120,kills:1},
    },
    trackerMax:5},
  /* 贫瘠之地（STEP 18）· V2 半径再×2（相对 V1-B2） */
  barrens:{
    radius:368,
    minLevel:10,
    wailingMinLevel:15,
    onyxiaMinLevel:16,
    durotarMinLevel:12,
    ground:0xc4a060, dirt:0x9a7848, sky:0xe8c898, fog:0xd8b880, fogDensity:0.0055,
    hemiSky:0xf0d8a8, hemiGround:0x8a6a3a, hemiIntensity:0.95,
    sunColor:0xffe0a0, sunIntensity:1.15,
  },
  /* 赭岩谷（plan-v1 · V1-B1/B2）：橙土 · 兽人哨站风味 · V2 半径再×2 */
  durotar:{
    radius:352,
    minLevel:12,
    ragefireMinLevel:13,
    ground:0xd07838, dirt:0xa85828, sky:0xf0b878, fog:0xe09858, fogDensity:0.0058,
    hemiSky:0xffd0a0, hemiGround:0x8a4020, hemiIntensity:1.0,
    sunColor:0xffc880, sunIntensity:1.2,
  },
  /* 掉落与尸体拾取（STEP 2）：品质权重 70/25/5 · 尸体停留秒数 · 拾取距离 */
  loot:{weights:{common:70,uncommon:25,rare:5}, corpseT:8, pickupR:3.5,
        eliteWeights:{uncommon:72,rare:28},   /* 精英必掉优秀以上（STEP 5） */
        questDropChance:.95},                  /* 进行中交付任务物品的优先掉落率 */
  /* 背包（STEP 4）：格数 */
  bag:{size:36, cols:6},
  /* 金币经济 + 商人（STEP 13）：铜为最小单位；1金=100银=10000铜 */
  economy:{
    copperPerSilver:100,
    copperPerGold:10000,
    vendorStock:["plain_bread","linen_bandage","minor_potion"],
    vendorStockByNpc:{
      vendor:["plain_bread","linen_bandage","minor_potion","whetstone"],
      varg:["plain_bread","linen_bandage","minor_potion","whetstone"],
      barrens_vendor:["plain_bread","linen_bandage","minor_potion","whetstone"],
      barrens_armor:["plain_bread","linen_bandage","minor_potion"],
      ochre_vendor:["plain_bread","linen_bandage","minor_potion","whetstone"],
    },
    food:{healPct:.35,duration:6},       /* 坐下进食：持续回复最大生命比例 */
    bandage:{healPct:.28,cast:1.6},      /* 绷带：引导施放 */
    minorPotion:{healPct:.18},           /* 初级药水：瞬时回复（STEP 23） */
    whetstone:{dmgMulAdd:.08,duration:120}, /* 磨刀石：临时伤害加成 */
    interactR:8,
  },
  /* 专业技能（STEP 23）：采集点 + 营地制作 */
  professions:{
    interactR:4.2,
    gatherCast:1.5,
    respawn:75,
    yieldMin:1, yieldMax:2,
    herbCount:{mulgore:10, barrens:9, durotar:9},
    oreCount:{mulgore:9, barrens:10, durotar:9},
    campR:24,          /* 采集点避开营地半径 */
    portalR:14,        /* 避开传送门 */
    matsMax:99,
    nodeGap:6,
    placeTries:40,
    workbench:{x:-8,z:48},
    herbChance:{mulgore:.55, barrens:.5, durotar:.48},
    oreChance:{mulgore:.7, barrens:.45, durotar:.5},
  },
  /* 上帝模式（首页勾选）：玩家每次攻击的固定伤害 */
  god:{dmg:5000},
  /* 昼夜循环（STEP 7）：10 分钟一昼夜，render-only，不碰任何数值 */
  dayNight:{duration:600,  /* 10 分钟一昼夜（秒） */
    day:{sky:0x8fc0e8, fog:0xa8c8e0, fogDensity:0.0062, sunColor:0xfff2d8, sunIntensity:1.05,
         sunAlt:65, sunAz:0, hemiSky:0xcfe8ff, hemiGround:0x5a7a3a, hemiIntensity:0.95},
    dawn:{sky:0xc8a080, fog:0xb89070, fogDensity:0.008, sunColor:0xffa060, sunIntensity:.85,
          hemiSky:0xffc8a0, hemiGround:0x6a5030, hemiIntensity:.7},
    dusk:{sky:0xc07050, fog:0xa85840, fogDensity:0.01, sunColor:0xff6040, sunIntensity:.7,
          hemiSky:0xff9060, hemiGround:0x4a3020, hemiIntensity:.55},
    night:{sky:0x08081a, fog:0x0a0a1a, fogDensity:0.025, sunColor:0x1a1a3a, sunIntensity:0.15,
           sunAlt:-20, sunAz:0, hemiSky:0x1a1a3a, hemiGround:0x0a0a1a, hemiIntensity:0.25},
    campfire:{base:1.4, nightBoost:2.6},  /* 白天 1.4，夜晚 1.4+2.6=4.0 */
  },
  /* 天空穹顶 · 阴影跟随 · 补光 · 副本脉动（plan-V2 · R4）· render-only */
  sky:{
    radius:500,
    segsW:32,
    segsH:16,
    cameraFar:620,
    shadowHalf:35,
    shadowMap:2048,
    shadowMapMobile:1024,   /* R8：移动端阴影贴图降档 */
    shadowNear:.5,
    shadowFar:220,
    shadowBias:-0.0002,
    shadowNormalBias:.04,
    sunDist:90,
    fillIntensity:.18,
    fillColor:0xffe8d0,
    fillPos:[-25,18,-30],
    fireflies:100,
    zenith:0x3a6aaa,
    horizon:0xa8d0e8,
    ground:0x6a8a50,
    cloudStrength:.22,
    sunGlow:.55,
    raid:{
      lavaBase:1.6,
      lavaPulseAmp:.28,
      lavaPulseFreq:.65,
      fogBase:0.016,
      fogPulseAmp:0.0028,
      fogPulseFreq:.55,
      emberUpDraft:1.45,
      emberSide:1.25,
    },
  },
  /* 天气层（plan-v1 · V1-A4）：render-only，不改伤害/仇恨/视野逻辑；enabled:false 可关 */
  weather:{
    enabled:true,
    zoneDefaults:{
      mulgore:"clear",
      barrens:"dust",
      durotar:"dust",
      molten_core:"clear",
      wailing_caverns:"mist",
      onyxias_lair:"clear",
      ragefire_chasm:"dust",
    },
    clear:{fogBlend:0, fogDensityMul:1},
    rain:{
      particle:"rain", count:420, size:.14, color:0xb8d0e8, opacity:.5,
      fallMin:9, fallMax:16, spread:30, height:20,
      fogTint:0x6a8098, fogBlend:.38, fogDensityMul:1.18,
    },
    dust:{
      particle:"dust", count:240, size:.32, color:0xd8b880, opacity:.38,
      fallMin:.5, fallMax:1.4, drift:4.2, spread:34, height:12,
      fogTint:0xc9a060, fogBlend:.42, fogDensityMul:1.14,
    },
    mist:{
      particle:"mist", count:160, size:.45, color:0x66aa55, opacity:.22,
      fallMin:.25, fallMax:.7, drift:1.2, spread:22, height:9,
      fogTint:0x1a3020, fogBlend:.28, fogDensityMul:1.06,
    },
  },
  /* 相机 / 转向（相对角色朝向） */
  camera:{
    dist:16, distMin:6, distMax:32,
    height:9.5, lookY:2.2,
    turnSpd:2.6,            /* A/D 键盘转向 弧度/秒 */
    zoomStep:1.15,
    pitchMin:.12, pitchMax:.78, pitch:.38,
    follow:12,              /* 相机跟手速度 */
    mouseSens:.0042,        /* 鼠标灵敏度 */
    recenterSpd:3.2,        /* 前进时视角回正（LMB 环绕后） */
    bothBtnForward:true,    /* 左右键同按 = 朝镜头前进（魔兽） */
  },
  /* 头顶姓名板（血条 + 等级）· plan-V2 R7 打磨（性能优先：无每帧 raycast） */
  nameplate:{
    barW:1.9, barH:.16,
    enemy:"#d84828", friend:"#3a9a48", bg:"#1a1208",
    enemyGlow:"rgba(180,40,20,.9)", friendGlow:"rgba(40,120,50,.9)",
    eliteBorder:"#ffd76a",
    near:10, far:42,         /* 距离缩放区间；超出 far 直接隐藏 */
    minScale:.55, maxScale:1.1,
    farFade:.3,              /* 远处最低不透明度（距离衰减，非 raycast） */
  },
  npcLevel:{hawkwind:10,grull:8,grayhorn:12,raoul:6,vera:5,whiterock:10,baine:40,bloodhoof_elder:35,tark:18,mull:16,haru:18,mara:14,kur:15,aska:20,cairne:60,stonetalon:40,seen:22,pala:20,hamya:24,magatha:50,runetotem:45,thunderhorn_guard:12,winterhoof_guard:10,windfury_sentinel:25,elder:40,vendor:25,varg:25,hunter:18,cook:20,spirit:55,crossroads:30,darsok:28,kag:26,mankrik:30,thom:27,kil:24,serra:25,lal:28,zinge:26,scriven:22,innkeeper:22,flightmaster:25,barrens_vendor:24,barrens_armor:24,ochre:28,ochre_guard:26,ochre_vendor:24,companion:null},
  /* 营地 NPC 外观：体型缩放 + 姓名板高度（相对缩放后头顶） */
  npc:{scale:.72, labelY:4.05, markerY:5.15, labelW:6.2},
  /* 经验与等级（STEP 3）：经验来源 / 升级曲线 / 每级成长 */
  levels:{max:18, xp:{quest:300, boss:2000, magmadar:800, barrensQuest:400, durotarQuest:380, cobrahn:900, verdan:1600, onyxia:2200, oggleflint:850, taragaman:1500},
    /* 野怪经验在 mobs 表；xpMax[i] = 第 i+1 级升下一级所需（共 max-1 档） */
    xpMax:[200,300,450,650,900,1200,1600,2100,2700,3500,4200,5000,5900,6900,8000,9200,10500],
    perLevel:{dmgMul:.05, hpMax:.08}},
  /* 特效配方默认参数（STEP 9a / plan-V2 R7）：性能优先——默认关动态点光 */
  vfx:{
    useLights:false,                 /* PointLight 极贵；弹道/爆发默认只用自发光球 */
    trails:true,                     /* 法术拖尾（画面设置可关） */
    hitFlash:true,                   /* 受击闪白 */
    dissolve:true,                   /* 死亡溶解 */
    fakeBloom:false,                 /* R8：假 bloom 外扩壳（零 CDN，默认关） */
    fakeBloomShell:{scale:1.55, opacity:.2, shotR:.85, shotOp:.18},
    lava_bolt:{color:0xffa030,glow:0xff4400,glowOp:.4,radius:.75,glowR:1.15,segs:6,originScale:.7,
      trailLen:5,trailSize:.32},
    venom_bolt:{color:0x66cc44,glow:0x228822,glowOp:.45,radius:.7,glowR:1.05,segs:6,originScale:.7,
      trailLen:5,trailSize:.3},
    eruption_ring:{ringColor:0xff2200,discColor:0xff3b00,ringOp:.85,discOp:.22,yRing:.06,yDisc:.05,innerMul:.92},
    venom_ring:{ringColor:0x44aa22,discColor:0x33cc44,ringOp:.8,discOp:.2,yRing:.06,yDisc:.05,innerMul:.92},
    melee_impact:{color:0xff6a1a,count:8,spread:1.1,size:.4},
    roar_aura:{color:0xffb040,count:18,spread:5.5,size:.4},
    heal_cross:{color:0x66ff88,count:10,spread:1.2,size:.4},
    loot_spark:{color:0xffd76a,count:12,spread:1.4,size:.4},
    holy_shield:{color:0xffe9a0,op:.35,radius:1.85,y:1.75},
    rune_ring:{color:0xffd76a,ringColor:0xffd76a,ringOp:.55,r:2.4,life:3},
    impact:{size:.4,life:.75},       /* 爆发寿命缩短，少占池位 */
    hit:{dur:.12, lean:.18},
    critChance:.14, critSizeMul:1.45,
    dissolveSpd:1.4,
    pool:{capacity:8, maxCount:24},  /* 并发爆发上限 / 单次粒子上限 */
  },
  /* 画面/特效偏好（登录页齿轮；与角色存档分离，写入独立 localStorage） */
  graphics:{key:"azeroth3d_gfx_v1", defaultPreset:"balanced"},
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
    /* —— STEP 19 牧师 —— */
    priest:{
      holy_light   :{fx:{healMul:.06}},
      flash_mastery:{skillCd:{i:1,mul:.90}},
      divine_grace :{fx:{healMul:.05},skillCd:{i:0,mul:.95}},
      power_infusion:{fx:{shieldMul:.08}},
      smite_power  :{dmgMul:.04},
      borrowed_time:{fx:{shieldMul:.05},cdMul:.97},
    },
    /* —— V1-C1 萨满 —— */
    shaman:{
      storm_weapon :{dmgMul:.05},
      magma_shock  :{skillCd:{i:1,mul:.90}},
      feral_spirit :{dmgMul:.04,skillCd:{i:0,mul:.95}},
      healing_focus:{fx:{healMul:.06}},
      totemic_call  :{skillCd:{i:3,mul:.88}},
      ancestral    :{fx:{healMul:.05},hpMaxMul:.04},
    },
    /* —— V1-C2 盗贼 —— */
    rogue:{
      improved_sinister:{skillCd:{i:0,mul:.90}},
      backstab_master  :{skillCd:{i:1,mul:.90},dmgMul:.03},
      lethality        :{dmgMul:.05},
      shadow_focus     :{fx:{stealthAggro:.08}},
      fleet_footed     :{skillCd:{i:3,mul:.88}},
      master_subtlety  :{dmgMul:.04,fx:{stealthDmg:.06}},
    },
  },
  /* 存档（STEP 11）：localStorage 键与 schema 版本；改键会与旧存档隔离 */
  save:{key:"azeroth3d_save_v1",version:1},
  /* FPS 叠层（STEP 12）：刷新间隔秒；着色对照目标帧率 */
  fps:{updateInterval:.5,desktopTarget:60,mobileTarget:30},
  /* 性能预算（plan-V2 · R8）：debug.js 超标告警；桌面 / 移动两档 */
  perf:{
    updateInterval:.5,
    desktop:{fps:60, drawCalls:300, triangles:350000, textures:16},
    mobile :{fps:30, drawCalls:150, triangles:150000, textures:16},
  },
  /* 植被 · 水体 · 场景道具（plan-V2 · R3） */
  props:{
    grassCount:8000,
    grassCountMobile:3000,
    grassRadius:70,
    grassFadeStart:55,
    grassFadeEnd:70,
    grassMaxSlope:.32,
    grassH:.55,
    grassW:.22,
    grassRoadMax:.15,
    grassLakeMax:.35,
    pineVariants:4,
    oakVariants:4,
    treeCount:48,
    treeRoadMax:.2,
    treeLakeMax:.4,
    treeSlopeMax:.55,
    pineChance:.55,
    rockGroups:14,
    rocksPerGroup:[2,4],
    rockRoadMax:.25,
    rockLakeMax:.5,
    clouds:10,
    cloudY:70,
    cloudSpread:280,
    cloudSizeW:[28,55],
    cloudSizeH:[10,18],
    lakeFresnel:.55,
    embers:18,
  },
  /* 装备评分权重（STEP 14 角色面板） */
  gearScore:{
    quality:{common:10,uncommon:25,rare:55,epic:85,legendary:120},
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
    miniRadius:96,          /* 小地图本地视野半宽（世界单位） */
    miniMobR:110,           /* 显示附近野怪的距离 */
    miniLabelR:72,          /* 近距地标短标签 */
    miniParty:true,
    miniMobs:true,
    miniQuest:true,
  },
  /* 多场景注册表（STEP 17）：淡入淡出与传送门半径 */
  zones:{
    fadeMs:650,
    portalHintR:22,
    portalEnterR:4.5,
    exitPortalEnterR:5.5,
    lockedHintCd:4,   /* 等级不足时靠近/踩入重复提示冷却（秒） */
  },
  /* AI 队友（STEP 20）· 小队（STEP 26：玩家 + 最多 2 AI = 3 人） */
  companion:{
    followDist:5.2,
    followStop:2.6,
    combatEngageR:24,
    meleeR:4.2,
    speedMul:1.08,
    retreatSpeedMul:1.15,
    dmgMul:.82,
    healMul:.9,
    hpMul:.72,
    retreatHpPct:.28,
    retreatRecoverPct:.45,
    reviveHpPct:.45,
    regenPct:.04,
    healPlayerHpPct:.40,
    healSelfHpPct:.50,
    healAllyHpPct:.45,       /* STEP 26：治疗其他同伴 */
    healCd:5,
    attackCdMul:1.15,
    atkTimerStart:.4,
    mobHitChance:.35,
    reviveT:10,
    spawnOffset:{x:2.2,z:1.4},
  },
  party:{
    size:3,
    aiSlots:2,
    xpMul:1.15,
    spawnOffsets:[
      {x:2.4,z:1.6},
      {x:-2.2,z:1.8},
    ],
    fill:{
      warrior:[{role:"healer",classKey:"priest"},{role:"dps",classKey:"mage"}],
      mage:[{role:"tank",classKey:"warrior"},{role:"healer",classKey:"priest"}],
      archer:[{role:"tank",classKey:"warrior"},{role:"healer",classKey:"priest"}],
      priest:[{role:"tank",classKey:"warrior"},{role:"dps",classKey:"archer"}],
      shaman:[{role:"tank",classKey:"warrior"},{role:"healer",classKey:"priest"}],
      rogue:[{role:"tank",classKey:"warrior"},{role:"healer",classKey:"priest"}],
    },
    roleLabel:{tank:"坦克",healer:"治疗",dps:"输出"},
  },
  /* 本地地下城查找器（STEP 29）· 难度档（V1-B4） */
  difficulty:{
    normal:{hpMul:1, dmgMul:1, lootWeights:null},
    heroic:{
      hpMul:1.55,
      dmgMul:1.4,
      /* 偏蓝；无对应档的池会被 rollLoot 跳过 */
      lootWeights:{common:10, uncommon:30, rare:52, epic:8},
    },
  },
  lfg:{
    difficulty:"normal",
    difficulties:["normal","heroic"],
    labels:{normal:"普通",heroic:"英雄"},
    entries:[
      {id:"molten_core",    name:"熔火之心",       blurb:"走廊 → 玛格曼达 → 拉戈斯", minLevel:0,  gate:"entrance", icon:"dungeon"},
      {id:"ragefire_chasm", name:"怒焰裂谷",       blurb:"燃刃兽人 → 奥格弗林特 → 饥饿者", minLevel:13, gate:"entrance", icon:"fireball"},
      {id:"wailing_caverns",name:"哀嚎洞穴",       blurb:"变异蛇 → 考布莱恩 → 吞噬者", minLevel:15, gate:"entrance", icon:"venom"},
      {id:"onyxias_lair",   name:"奥妮克希亚巢穴", blurb:"幼龙 → 黑龙女王三阶段",   minLevel:16, gate:"entrance", icon:"fireball"},
    ],
  },
  /* 仇恨与职责（STEP 27） */
  threat:{
    perDmg:1,
    flat:{heroicStrike:120, whirlwind:50, charge:80, taunt:200, companionAuto:0},
    roleMul:{player:1, playerTank:1.55, tank:1.6, dps:1, healer:.75},
    tauntDur:4,
    tauntMargin:50000,
    /* 治疗优先级阈值 */
    healTankHpPct:.30,
    healSelfHpPct:.40,
    healDpsHpPct:.50,
  },
};
const BAL=BALANCE;

/* ============================================================
   可播种随机器（STEP 0，参考 WoC 确定性 Rng）
   世界摆放专用：种子固定 ⇒ 树木/岩石/台地位置永远一样
   玩法随机（伤害浮动、游荡目标等）仍走 rand()，两路分流
   ============================================================ */
const WORLD_SEED=20260721;
let WORLD_SEED_OVERRIDE=null; /* cheat.seed(n) 覆盖；已建区不重滚 */
function effectiveWorldSeed(){
  return WORLD_SEED_OVERRIDE!=null?(WORLD_SEED_OVERRIDE>>>0):WORLD_SEED;
}
function SeededRng(seed){let a=seed>>>0;return function(){
  a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
/* 分区种子：WORLD_SEED ^ hash(zoneId)，各区确定性且互不干扰（STEP 17） */
function hashZoneId(id){
  let h=2166136261>>>0;
  const s=String(id);
  for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;
  return h>>>0;
}
function getZoneSeed(id){return(effectiveWorldSeed()^hashZoneId(id))>>>0;}
let _zoneRng=SeededRng(getZoneSeed("mulgore"));
function setZoneSeed(id){_zoneRng=SeededRng(getZoneSeed(id));}
function worldRng(){return _zoneRng();}       /* 兼容旧调用点；实际走当前分区 RNG */
const srand=(a,b)=>a+_zoneRng()*(b-a);         /* 摆放类随机：静态布景专用 */
function isMobileClient(){
  return typeof matchMedia==="function"&&matchMedia("(pointer:coarse)").matches;
}

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

/** 纯色精灵（姓名板血条） */
function makeBarSprite(hex,w,h){
  const cv=document.createElement("canvas");cv.width=64;cv.height=16;
  const cx=cv.getContext("2d");
  cx.fillStyle=hex;cx.fillRect(0,0,64,16);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),
    transparent:true,depthWrite:false}));
  sp.scale.set(w,h,1);
  return sp;
}

/**
 * 头顶姓名板：等级 + 名字 + 血条
 * @returns {THREE.Group} 兼容旧 label 的 position/visible
 */
function makeNameplate(name,level,opts){
  opts=opts||{};
  const NP=BAL.nameplate||{};
  const friendly=!!opts.friendly;
  const elite=!!opts.elite;
  const color=opts.color||(friendly?"#a8e8c0":"#ffd9a0");
  const glow=opts.glow||(friendly?(NP.friendGlow||"rgba(40,120,50,.9)"):(NP.enemyGlow||"rgba(180,40,20,.9)"));
  const barW=opts.barW!=null?opts.barW:(NP.barW||1.9);
  const barH=opts.barH!=null?opts.barH:(NP.barH||.16);
  const g=new THREE.Group();
  const title=(level!=null&&level!==""?`Lv.${level}  `:"")+name;
  const lab=makeLabel(title,opts.w||5.2,color,glow);
  lab.position.y=.28;
  g.add(lab);
  /* R7：精英金色描边 */
  if(elite){
    const border=makeBarSprite(NP.eliteBorder||"#ffd76a",barW+.12,barH+.1);
    border.position.y=-.12;
    border.position.z=-0.01;
    g.add(border);
    g.userData.border=border;
  }
  const bg=makeBarSprite(NP.bg||"#1a1208",barW,barH);
  bg.position.y=-.12;
  g.add(bg);
  const fill=makeBarSprite(friendly?(NP.friend||"#3a9a48"):(NP.enemy||"#d84828"),barW,barH);
  fill.center.set(0,.5);
  fill.position.set(-barW/2,-.12,0.01);
  g.add(fill);
  g.userData={lab,bg,fill,barW,barH,friendly,elite,level,name,baseOp:1};
  return g;
}
function updateNameplateHp(root,hp,hpMax){
  if(!root||!root.userData||!root.userData.fill)return;
  const ratio=hpMax>0?Math.max(0,Math.min(1,hp/hpMax)):0;
  const barW=root.userData.barW||1.9;
  root.userData.fill.scale.x=Math.max(0.001,barW*ratio);
}
/**
 * R7：姓名板距离缩放 / 远距淡出 / 超远隐藏（O(1)，无 raycast）
 * 遮挡 raycast 已撤下——全场景 traverse + 每板一次 intersect 会拖垮帧率。
 */
function updateNameplatePresentation(root,worldPos){
  if(!root||!worldPos||!camera)return;
  const NP=BAL.nameplate||{};
  const dx=worldPos.x-camera.position.x;
  const dy=worldPos.y-camera.position.y;
  const dz=worldPos.z-camera.position.z;
  const distSq=dx*dx+dy*dy+dz*dz;
  const far=NP.far!=null?NP.far:42;
  const farSq=far*far;
  if(distSq>farSq){
    if(root.visible)root.visible=false;
    return;
  }
  if(!root.visible)root.visible=true;

  const near=NP.near!=null?NP.near:10;
  const dist=Math.sqrt(distSq);
  const t=dist<=near?0:Math.min(1,(dist-near)/Math.max(.01,far-near));
  const sMax=NP.maxScale!=null?NP.maxScale:1.1;
  const sMin=NP.minScale!=null?NP.minScale:.55;
  const s=sMax*(1-t)+sMin*t;
  if(root.userData._npScale!==s){
    root.userData._npScale=s;
    root.scale.setScalar(s);
  }

  const farFade=NP.farFade!=null?NP.farFade:.3;
  const fade=1-t*(1-farFade);
  if(root.userData._npFade===fade)return;
  root.userData._npFade=fade;
  const U=root.userData;
  const sprites=[U.lab,U.bg,U.fill,U.border];
  for(let i=0;i<sprites.length;i++){
    const sp=sprites[i];
    if(!sp||!sp.material)continue;
    const m=sp.material;
    if(m.userData._npBaseOp==null)m.userData._npBaseOp=m.opacity!=null?m.opacity:1;
    m.transparent=true;
    m.opacity=m.userData._npBaseOp*fade;
  }
}
function disposeNameplate(root){
  if(!root)return;
  root.traverse(o=>{
    if(o.material){
      if(o.material.map)o.material.map.dispose();
      o.material.dispose();
    }
  });
  if(root.parent)root.parent.remove(root);
}

/* ---------------- 场景基础（双场景：莫高雷 / 熔火之心） ---------------- */
const sceneRaid=new THREE.Scene();
sceneRaid.fog=new THREE.FogExp2(0x1a0602,0.016);
let scene=sceneRaid;   /* 当前渲染场景 */
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,0.1,620);
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

/* ============================================================
   画面 / 特效偏好（登录页齿轮）
   与角色存档分离；改预设只动 BAL.vfx 性能字段，不改颜色语义
   ============================================================ */
const GFX_PRESETS={
  low:{
    label:"流畅", hint:"少粒子 · 无拖尾 · 阴影 1024 · 无假 Bloom",
    useLights:false, trails:false, hitFlash:true, dissolve:false, fakeBloom:false,
    pool:{capacity:4, maxCount:12},
    impactLife:.55, impactSize:.35, trailLen:0, segs:5,
    counts:{melee_impact:4, roar_aura:8, heal_cross:6, loot_spark:6},
    shadowMap:1024, pixelRatioCap:1.25,
  },
  balanced:{
    label:"均衡", hint:"默认推荐 · 性能与观感兼顾",
    useLights:false, trails:true, hitFlash:true, dissolve:true, fakeBloom:false,
    pool:{capacity:8, maxCount:24},
    impactLife:.75, impactSize:.4, trailLen:5, segs:6,
    counts:{melee_impact:8, roar_aura:18, heal_cross:10, loot_spark:12},
    shadowMap:2048, pixelRatioCap:2,
  },
  high:{
    label:"华丽", hint:"更多粒子 · 拖尾 · 假 Bloom 外壳",
    useLights:false, trails:true, hitFlash:true, dissolve:true, fakeBloom:true,
    pool:{capacity:14, maxCount:40},
    impactLife:1.0, impactSize:.45, trailLen:8, segs:8,
    counts:{melee_impact:14, roar_aura:28, heal_cross:14, loot_spark:18},
    shadowMap:2048, pixelRatioCap:2,
  },
};

let _gfxState=null;

function getGraphicsSettings(){
  if(_gfxState)return Object.assign({},_gfxState);
  const p=BAL.graphics&&BAL.graphics.defaultPreset||"balanced";
  const pre=GFX_PRESETS[p]||GFX_PRESETS.balanced;
  return {
    preset:p,
    useLights:!!pre.useLights,
    trails:!!pre.trails,
    hitFlash:!!pre.hitFlash,
    dissolve:!!pre.dissolve,
    fakeBloom:!!pre.fakeBloom,
  };
}

function applyGraphicsSettings(cfg,opts){
  opts=opts||{};
  const presetId=(cfg&&cfg.preset&&GFX_PRESETS[cfg.preset])?cfg.preset:(BAL.graphics.defaultPreset||"balanced");
  const pre=GFX_PRESETS[presetId];
  const state={
    preset:presetId,
    useLights:cfg&&cfg.useLights!=null?!!cfg.useLights:!!pre.useLights,
    trails:cfg&&cfg.trails!=null?!!cfg.trails:!!pre.trails,
    hitFlash:cfg&&cfg.hitFlash!=null?!!cfg.hitFlash:!!pre.hitFlash,
    dissolve:cfg&&cfg.dissolve!=null?!!cfg.dissolve:!!pre.dissolve,
    fakeBloom:cfg&&cfg.fakeBloom!=null?!!cfg.fakeBloom:!!pre.fakeBloom,
  };
  _gfxState=state;
  const V=BAL.vfx;
  if(!V)return state;
  V.useLights=state.useLights;
  V.trails=state.trails;
  V.hitFlash=state.hitFlash;
  V.dissolve=state.dissolve;
  V.fakeBloom=state.fakeBloom;
  V.pool={capacity:pre.pool.capacity, maxCount:pre.pool.maxCount};
  if(!V.impact)V.impact={};
  V.impact.life=pre.impactLife;
  V.impact.size=pre.impactSize;
  const tLen=state.trails?pre.trailLen:0;
  if(V.lava_bolt){V.lava_bolt.trailLen=tLen; V.lava_bolt.segs=pre.segs;}
  if(V.venom_bolt){V.venom_bolt.trailLen=tLen; V.venom_bolt.segs=pre.segs;}
  const keys=["melee_impact","roar_aura","heal_cross","loot_spark"];
  for(let i=0;i<keys.length;i++){
    const k=keys[i];
    if(V[k]&&pre.counts[k]!=null)V[k].count=pre.counts[k];
  }
  /* R8：阴影档 + 像素比（移动端阴影仍封顶 shadowMapMobile） */
  if(BAL.sky&&pre.shadowMap)BAL.sky.shadowMap=pre.shadowMap;
  if(typeof renderer!=="undefined"&&renderer&&pre.pixelRatioCap){
    renderer.setPixelRatio(Math.min(devicePixelRatio,pre.pixelRatioCap));
  }
  if(typeof refreshSunShadows==="function")refreshSunShadows();
  if(opts.rebuild&&typeof rebuildVfxPool==="function")rebuildVfxPool();
  return state;
}

function loadGraphicsSettings(){
  let cfg=null;
  try{
    const key=BAL.graphics&&BAL.graphics.key;
    if(key){
      const raw=localStorage.getItem(key);
      if(raw)cfg=JSON.parse(raw);
    }
  }catch(e){cfg=null;}
  if(!cfg||typeof cfg!=="object")cfg={preset:BAL.graphics.defaultPreset||"balanced"};
  if(!GFX_PRESETS[cfg.preset])cfg.preset=BAL.graphics.defaultPreset||"balanced";
  return applyGraphicsSettings(cfg);
}

function saveGraphicsSettings(cfg){
  const state=applyGraphicsSettings(cfg||getGraphicsSettings(),{rebuild:true});
  try{
    const key=BAL.graphics&&BAL.graphics.key;
    if(key)localStorage.setItem(key,JSON.stringify(state));
  }catch(e){}
  return state;
}

loadGraphicsSettings();
