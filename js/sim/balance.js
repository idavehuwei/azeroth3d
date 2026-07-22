/* ============================================================
   炽心 · js/sim/balance.js
   plan-v4 STEP 14：数值总表 BALANCE（自 core.js 迁出）
   依赖：strings.js（T，用于 lfg 文案）；content.js（SIM_CONTENT，可选合并）
   导出：BALANCE BAL
   铁律：本文件须保持零 DOM / 零渲染库 / 零默认随机源
   ============================================================ */
"use strict";

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
    /* —— 术士 —— */
    shadowBolt:{ranks:[
      {minLevel:1, dmg:[700,900]},
      {minLevel:8, dmg:[826,1062]},
      {minLevel:14, dmg:[952,1224]}
    ]},
    corruption:{ranks:[
      {minLevel:1, duration:12, dmgPerTick:55, stacks:1},
      {minLevel:8, duration:14, dmgPerTick:72, stacks:1},
      {minLevel:14, duration:15, dmgPerTick:90, stacks:2}
    ]},
    drainLife:{ranks:[
      {minLevel:1, dmgPerTick:[95,125], leech:.55, ticks:3},
      {minLevel:8, dmgPerTick:[112,148], leech:.58, ticks:3},
      {minLevel:14, dmgPerTick:[130,170], leech:.6, ticks:3}
    ]},
    lifeTap:{ranks:[
      {minLevel:1, hpCost:280, manaGain:32},
      {minLevel:8, hpCost:360, manaGain:40},
      {minLevel:14, hpCost:440, manaGain:48}
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
    /* —— 赤蹄草甸分层（仿经典等级带） —— */
    bird    :{level:2, hp:380, dmg:[28,42],  atkCd:1.6, meleeR:2.2, aggroR:0,  leashR:28, wanderSpd:4.5,chaseSpd:8,   respawnT:22,  xp:45,  copper:[4,10]},
    youngBoar:{level:3, hp:420, dmg:[35,55], atkCd:2.0, meleeR:2.2, aggroR:6,  leashR:28, wanderSpd:3.2,chaseSpd:5.2, respawnT:22,  xp:55,  copper:[5,12]},
    bristleback:{level:3, hp:480, dmg:[40,60], atkCd:2.0, meleeR:2.4, aggroR:8, leashR:30, wanderSpd:2.8,chaseSpd:5.4, respawnT:24, xp:65, copper:[6,14]},
    wolf    :{level:5, hp:560, dmg:[45,70],  atkCd:1.8, meleeR:2.3, aggroR:9,  leashR:34, wanderSpd:3.5,chaseSpd:6.5, respawnT:26,  xp:75,  socialR:16, copper:[8,16]},
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
    quilboarElder:{level:15, hp:3200,dmg:[110,155], atkCd:2.2, meleeR:3.0, aggroR:12, leashR:42, wanderSpd:2.4,chaseSpd:5.2, respawnT:50, xp:320, copper:[50,90], eliteBaked:true},
    barrensLion:{level:12, hp:1100,dmg:[78,112], atkCd:1.7, meleeR:2.6, aggroR:10, leashR:38, wanderSpd:3.2,chaseSpd:6.6, respawnT:28, xp:145, socialR:14, copper:[16,30]},
    barrensBristle:{level:11, hp:980, dmg:[72,105], atkCd:2.0, meleeR:2.5, aggroR:9, leashR:34, wanderSpd:2.8,chaseSpd:5.6, respawnT:26, xp:130, copper:[14,28]},
    harpy   :{level:11, hp:4200,dmg:[90,130], atkCd:2.4, meleeR:3.2, aggroR:12, leashR:44, wanderSpd:2.5,chaseSpd:5,   respawnT:60,  xp:450, copper:[80,140], socialR:24, eliteBaked:true,
              cast:{name:"女妖之火",dmg:[220,300],dur:1.5,cd:6,range:20,speed:16,hitR:3}},
    boarKing:{level:9, hp:3200,dmg:[110,160],atkCd:2.4, meleeR:3.2, aggroR:8,  leashR:40, wanderSpd:2.2,chaseSpd:5,   respawnT:120, xp:500, copper:[120,200], socialR:22, eliteBaked:true},
    /* —— STEP 18 枯原荒地 —— */
    quilboar:{level:11, hp:1200,dmg:[75,110], atkCd:2.0, meleeR:2.6, aggroR:8,  leashR:36, wanderSpd:2.8,chaseSpd:5.8, respawnT:28,  xp:140, copper:[18,35]},
    centaur :{level:13, hp:1800,dmg:[95,140], atkCd:2.2, meleeR:3.0, aggroR:10, leashR:40, wanderSpd:2.6,chaseSpd:5.5, respawnT:35,  xp:180, copper:[28,50], socialR:20},
    zebra   :{level:10, hp:700, dmg:[50,75],  atkCd:1.7, meleeR:2.3, aggroR:0,  leashR:32, wanderSpd:4.2,chaseSpd:7.5, respawnT:26,  xp:90,  copper:[10,20]},
    raptor  :{level:16, hp:1400,dmg:[90,130], atkCd:1.7, meleeR:2.6, aggroR:10, leashR:38, wanderSpd:3.2,chaseSpd:6.5, respawnT:30, xp:175, socialR:16, copper:[22,40]},
    crocolisk:{level:16, hp:1500,dmg:[95,135], atkCd:2.1, meleeR:2.8, aggroR:9, leashR:36, wanderSpd:2.4,chaseSpd:5.2, respawnT:32, xp:180, copper:[24,44]},
    /* —— V1-B1 赭岩谷 —— */
    scorp     :{level:12, hp:1100,dmg:[80,115], atkCd:1.9, meleeR:2.5, aggroR:9,  leashR:34, wanderSpd:2.6,chaseSpd:6.0, respawnT:26,  xp:150, copper:[20,38]},
    razorback :{level:13, hp:1600,dmg:[95,135], atkCd:2.1, meleeR:2.8, aggroR:9,  leashR:38, wanderSpd:2.5,chaseSpd:5.6, respawnT:32,  xp:190, copper:[26,48]},
    cliffHarpy:{level:14, hp:5200,dmg:[110,155],atkCd:2.3, meleeR:3.3, aggroR:13, leashR:46, wanderSpd:2.4,chaseSpd:5.2, respawnT:70,  xp:520, copper:[100,160], socialR:24, eliteBaked:true,
              cast:{name:"崖风火矢",dmg:[260,340],dur:1.4,cd:5.5,range:22,speed:17,hitR:3.1}},
    /* —— STEP 24 世界 Boss —— */
    centaurHerald:{level:16, hp:9000,dmg:[140,200],atkCd:2.1,meleeR:3.4,aggroR:14,leashR:48,
      wanderSpd:2.2,chaseSpd:5.2,respawnT:240,xp:900,copper:[200,320],socialR:26,eliteBaked:true,
      cast:{name:"战矛投掷",dmg:[280,360],dur:1.4,cd:7,range:22,speed:18,hitR:3.2}},
  },
  /* 脱战回巢（STEP 5 规范化）：回巢途中每秒回复最大生命的百分比，且免疫伤害 */
  leash:{regenPct:.5},
  /* plan-V3 C11：按等级差缩放主动仇恨半径（灰怪不主动） */
  aggro:{
    greySkip:true,          /* isGreyMob → 半径 0 */
    perLevelAbove:.15,      /* 怪每高 1 级：半径 +15% */
    perLevelBelow:.1,       /* 怪每低 1 级：半径 -10% */
    minMul:.4,
    maxMul:2.4,
  },
  /* 精英外观与随从（体型放大 / 脚下光环 / 周边小弟）+ C11 运行时倍率 */
  elite:{
    hpMul:2.3,                /* C11：相对同级普通怪生命 */
    dmgMul:1.5,               /* C11：相对同级普通怪伤害 */
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
  /* 稀有 / 世界 Boss（STEP 24 / C11）：长刷新 + 金色姓名板 */
  rares:{
    announceSpawn:true,
    announceKill:true,
    gold:"#ffd700",
    elitePink:"#ff9ad0",
    respawnT:3600,            /* C11：稀有默认 1 小时 */
    worldBossRespawnT:7200,   /* 世界 Boss 默认 2 小时 */
  },
  /* 死亡与复活（STEP 15 / plan-V3 C10 / plan-v4 STEP 17） */
  death:{
    respawnHpPct:.5,          /* 复活时生命比例 */
    respawnResPct:.5,         /* 复活时资源（法力/怒气/能量）比例 */
    weaknessT:45,             /* 医者远程 / 副本释放：虚弱秒数 */
    corpseWeaknessT:15,       /* 跑尸复活：较短虚弱（仍惩罚，但优于医者） */
    weaknessStatMul:.7,       /* 虚弱：伤害倍率叠乘 */
    moveSpeedMul:.7,          /* 虚弱移速倍率 */
    ghostSpeedMul:1.5,        /* 灵魂形态移速 */
    ghostOpacity:.42,         /* 灵魂半透明 */
    corpseR:4.5,              /* 靠近尸体可复活半径 */
    worldSpawn:{x:0,z:58},
    raidSpawn:{x:0,z:18},
    corpseDelay:1.2,
    /* 回退落点；运行时优先 nearestGraveyardSpawn（墓地注册表） */
    spawns:{
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
  /* 火裔 */
  add:{level:15, hp:1400, dmg:[130,190], atkCd:2, speed:4.6, meleeR:3, stopR:2.6, copper:[12,28], xp:120},
  /* 熔渊领主 · 卡尔戈 */
  boss:{hp:120000, phase2At:.5, phase3At:.3, submergeT:25, addCount:4, copper:2500,
    melee   :{dmg:[300,420], p2Mul:1.25, p3Mul:1.5, cd:[3,4.2], range:12, hitRange:13, delayMs:450},
    fireball:{dmg:[520,680], cast:1.8, cd:[8,11], hitR:4, speed:22},
    eruption:{dmg:[600,780], cast:1.5, cd:[9,12], count:3, p2Count:5, p3Count:8, delay:2.2},
    wrath   :{dmg:[380,520], cast:2.2, cd:[16,20], range:16},
  },
  /* 炎喉 · 炽心一号位（STEP 9c） */
  magmadar:{hp:56000, phase2At:.5, addCount:3, copper:800,
    melee :{dmg:[220,300], p2Mul:1.35, cd:[2.4,3.2], range:9, hitRange:10, delayMs:260},
    spit  :{dmg:[260,340], cast:1.5, cd:[6,8.5], hitR:3.2, speed:18, count:3, p2Count:5, fan:0.42},
    breath:{dmg:[420,560], cast:1.8, cd:[11,14], delay:1.6, segs:5, step:4.2, ringR:3.4, p2Segs:7},
    stomp :{dmg:[400,540], cast:1.3, cd:[9,12], count:3, p2Count:6, delay:1.9, ringR:6},
    fear  :{dmg:[140,200], cast:1.6, cd:[13,16], range:16, fearT:2.6, knockT:.35, panicRings:3, panicR:4.5, delay:1.5},
  },
  /* 泣息洞窟（STEP 21） */
  wailing:{
    arenaR:24,
    minLevel:15,
    corridorCount:3,
    ground:0x2a3a28, wall:0x1a2818, moss:0x3a5a30,
    sky:0x0a1208, fog:0x142010, fogDensity:0.028,
  },
  wailingAdd:{hp:2200, dmg:[110,160], atkCd:2.1, speed:4.8, meleeR:3.1, stopR:2.5, copper:[20,40], xp:140},
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
  /* 黑曜巢穴·精简（STEP 28） */
  onyxiasLair:{
    arenaR:26,
    minLevel:16,
    corridorCount:2,
    ground:0x2a1a18, wall:0x1a1010, bone:0xc8b898,
    sky:0x120808, fog:0x1a0c0c, fogDensity:0.022,
  },
  onyxiaAdd:{hp:2800, dmg:[130,180], atkCd:2.0, speed:5.2, meleeR:3.0, stopR:2.4, copper:[30,55], xp:180},
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
  /* 焰怒深渊·精简（plan-v1 · V1-B3） */
  ragefire:{
    arenaR:22,
    minLevel:13,
    corridorCount:3,
    ground:0x3a1810, wall:0x2a1008, lava:0xff6020,
    sky:0x180808, fog:0x2a1008, fogDensity:0.026,
  },
  ragefireAdd:{hp:2400, dmg:[120,170], atkCd:2.0, speed:5.0, meleeR:3.0, stopR:2.4, copper:[22,45], xp:135},
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
    trackerMax:5,
    activeMax:5,   /* C9：同时进行中（active+ready）上限 */
    groundPickupR:3.5},
  /* 枯原荒地（STEP 18）· V2 半径再×2（相对 V1-B2） */
  barrens:{
    radius:368,
    minLevel:6,             /* C13：第二区域 6–13 入口 */
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
  loot:{weights:{poor:8,common:62,uncommon:25,rare:5}, corpseT:8, pickupR:3.5,
        eliteWeights:{uncommon:72,rare:28},   /* 精英必掉优秀以上（STEP 5） */
        rareWeights:{uncommon:55,rare:45},    /* C11：稀有必掉优秀以上，偏紫 */
        questDropChance:.95,                  /* 进行中交付任务物品的优先掉落率 */
        panel:true},                          /* Track E：拾取窗（false=一键真空） */
  /* Track E：玩家施法条 */
  cast:{
    moveInterrupt:true,   /* 移动打断读条 */
    hitInterrupt:true,    /* 受击打断读条 */
  },
  /* 背包（STEP 4）：格数 */
  bag:{size:36, cols:6},
  /* 金币经济 + 商人（STEP 13 / plan-v4 STEP 18）：铜为最小单位；1金=100银=10000铜 */
  economy:{
    copperPerSilver:100,
    copperPerGold:10000,
    vendorStock:["plain_bread","spring_water","linen_bandage","minor_potion"],
    /* 杂货 = 消耗品；武器匠/护甲商 = 白装 */
    vendorStockByNpc:{
      vendor:["plain_bread","spring_water","linen_bandage","minor_potion","whetstone"],
      varg:["plain_bread","spring_water","linen_bandage","minor_potion","whetstone"],
      weaponsmith:["camp_shortsword","camp_wood_mace","camp_hunting_bow"],
      barrens_vendor:["camp_shortsword","camp_wood_mace","barrens_cleaver","whetstone"],
      barrens_armor:["camp_leather_vest","plains_boots","hide_bracers","linen_bandage"],
      ochre_vendor:["plain_bread","spring_water","linen_bandage","minor_potion","whetstone"],
    },
    food:{healPct:.35,duration:18},      /* C10：坐下进食 18 秒回血 */
    drink:{manaPct:.45,duration:18},     /* C10：饮水回法力/能量类资源 */
    bandage:{healPct:.28,cast:1.6},
    minorPotion:{healPct:.18},
    whetstone:{dmgMulAdd:.08,duration:120},
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
  /* 相机 / 转向（相对角色朝向）· plan-V3 C1 */
  camera:{
    dist:16, distMin:3, distMax:25,
    lookChestY:1.55,        /* 球坐标锚点：胸口高度 */
    eyeY:1.7,               /* 第一人称眼高 */
    turnSpd:2.6,            /* A/D 键盘转向 弧度/秒 */
    zoomStep:1.15,
    pitchMin:-1.4, pitchMax:.6, pitch:.32,
    follow:14,              /* 相机跟手速度 */
    mouseSens:.0042,
    touchLookSens:.0055,    /* 移动端右半屏拖动 */
    pinchZoomScale:.05,     /* 双指捏合缩放系数 */
    recenterSpd:3.2,        /* 前进时视角回正（LMB 环绕后） */
    bothBtnForward:true,    /* 左右键同按 = 朝镜头前进（魔兽） */
    firstPersonDist:3.35,   /* dist ≤ 此值切第一人称 */
    collision:true,
    collisionMargin:.45,
  },
  /* 移动物理（plan-V3 C1 / C10 摔落 / plan-v4 STEP 17 游泳） */
  move:{
    jumpVel:9.2,
    gravity:26,
    groundEps:.06,
    fallSafe:5,           /* 安全下落高度（米） */
    fallDmgPer:32,        /* 超出后每米摔伤 */
    fallDmgMaxPct:.65,    /* 单次摔伤不超过最大生命此比例 */
    swimMul:.55,          /* 水中移速倍率 */
    swimBlend:.55,        /* TERRAIN.lakeBlend.w 超过此值视为入水 */
    oasisSwimR:14,        /* 贫瘠死水绿洲入水半径（装饰水面） */
  },
  /* 头顶姓名板（血条 + 等级）· plan-V2 R7 / plan-V3 C2 */
  nameplate:{
    barW:1.9, barH:.16,
    enemy:"#d84828", friend:"#3a9a48", bg:"#1a1208",
    enemyGlow:"rgba(180,40,20,.9)", friendGlow:"rgba(40,120,50,.9)",
    eliteBorder:"#ffd76a", rareBorder:"#c0c8d8",
    threatTint:0xff6060,     /* C2：仇恨中姓名板着色 */
    near:10, far:42,         /* 距离缩放区间；超出 far 直接隐藏 */
    farShowAll:120,          /* V 全显时的远距上限 */
    minScale:.55, maxScale:1.1,
    farFade:.3,              /* 远处最低不透明度（距离衰减，非 raycast） */
  },
  /* 目标系统（plan-V3 C2） */
  target:{
    tabRange:48,             /* Tab 循环最大距离 */
    tabConeCos:.15,          /* 视锥：dot(camForward, toTarget) 下限（放宽） */
    tabNearSkip:8,           /* 近于此距离不做视锥裁剪 */
    skillDefaultRange:30,    /* resolveSkillTarget 默认射程 */
    totThreatR:80,           /* 目标的目标：Boss 仇恨查询半径 */
    clickMaxDist:55,         /* 点击选取最大距离 */
    clickDragPx:6,           /* 低于此像素位移视为点击（非拖镜头） */
    meleeAutoR:4.5,
    showTot:true,            /* 目标的目标小框 */
  },
  npcLevel:{hawkwind:10,grull:8,grayhorn:12,raoul:6,vera:5,whiterock:10,baine:40,bloodhoof_elder:35,tark:18,mull:16,haru:18,mara:14,kur:15,aska:20,cairne:60,stonetalon:40,seen:22,pala:20,hamya:24,magatha:50,runetotem:45,thunderhorn_guard:12,winterhoof_guard:10,windfury_sentinel:25,elder:40,vendor:25,varg:25,weaponsmith:26,hunter:18,cook:20,spirit:55,crossroads:30,darsok:28,kag:26,mankrik:30,thom:27,kil:24,serra:25,lal:28,zinge:26,scriven:22,innkeeper:22,flightmaster:25,barrens_vendor:24,barrens_armor:24,ochre:28,ochre_guard:26,ochre_vendor:24,companion:null},
  /* 营地 NPC 外观：体型缩放 + 姓名板高度（相对缩放后头顶） */
  npc:{scale:.72, labelY:4.05, labelW:6.2,
    /* 任务标记（魔兽式头顶 ! / ?）：更大、更高、轻弹跳 */
    markerY:6.55, questMarkW:5.6, questMarkAspect:1.15, questMarkBob:.42},
  /* 经验与等级（STEP 3 / G2 / plan-V3 C6）：曲线来自 SIM_CONTENT.xp.XP_CURVE */
  levels:{max:20, xp:{quest:300, boss:2000, magmadar:800, barrensQuest:400, durotarQuest:380, cobrahn:900, verdan:1600, onyxia:2200, oggleflint:850, taragaman:1500},
    /* xpMax 在 core 末尾由 XP_CURVE 覆盖；此处为回退表 */
    xpMax:[400,900,1400,2100,2800,3600,4500,5600,6900,8400,10000,12000,14400,17200,20400,24000,28000,32000,36000],
    perLevel:{dmgMul:.05, hpMax:.08},
    /* 升级金光（loot_spark + spawnBurst）+ 全屏微光 */
    levelUp:{color:0xffd76a, sparkSpread:2.2, burstCount:18, burstSpread:2.4, flashOp:.55, flashMs:420}},
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
    /* —— 术士 —— */
    warlock:{
      shadow_mastery :{dmgMul:.05},
      improved_corr  :{skillCd:{i:1,mul:.90}},
      shadow_power   :{dmgMul:.04,skillCd:{i:0,mul:.95}},
      soul_siphon    :{fx:{leechMul:.06}},
      improved_drain :{skillCd:{i:2,mul:.90}},
      dark_pact      :{fx:{leechMul:.05},hpMaxMul:.04},
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
    quality:{poor:4,common:10,uncommon:25,rare:55,epic:85,legendary:120},
    dmgMul:200,   /* (dmgMul-1) × 此系数 */
    hpMax:.05,    /* hpMax × 此系数 */
  },
  /* 小地图 / 世界地图（STEP 16 / plan-V3 C13） */
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
    miniGather:true,        /* C13：采集点光点 */
    gatherHerb:"#6aff9a",
    gatherOre:"#c0c8d0",
    terrainThumbN:72,       /* C13：mulgore 高度场降采样边长 */
    /* C13：大陆拼贴布局（归一化 0–1 相对世界地图画布） */
    continental:[
      {id:"mulgore",  x:.06,y:.08,w:.48,h:.55},
      {id:"barrens",  x:.52,y:.18,w:.42,h:.48},
      {id:"durotar",  x:.52,y:.68,w:.42,h:.26},
    ],
    splashMs:2800,          /* 区域名淡入停留 */
  },
  /* 区域名淡入（C13） */
  zoneSplash:{
    durationMs:2800,
    fadeMs:700,
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
      warlock:[{role:"tank",classKey:"warrior"},{role:"healer",classKey:"priest"}],
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
      {id:"molten_core",    name:T("zone.molten_core"),       blurb:"走廊 → "+T("boss.magmadar")+" → "+T("boss.ragnaros_short"), minLevel:0,  gate:"entrance", icon:"dungeon"},
      {id:"ragefire_chasm", name:T("zone.ragefire"),       blurb:"燃刃兽人 → 奥格弗林特 → 饥饿者", minLevel:13, gate:"entrance", icon:"fireball"},
      {id:"wailing_caverns",name:T("zone.wailing"),       blurb:"变异蛇 → "+T("boss.cobrahn_short")+" → 吞噬者", minLevel:15, gate:"entrance", icon:"venom"},
      {id:"onyxias_lair",   name:T("zone.onyxia"), blurb:"幼龙 → 黑龙女王三阶段",   minLevel:16, gate:"entrance", icon:"fireball"},
    ],
  },
  /* 仇恨与职责（STEP 27） */
  threat:{
    perDmg:1,
    flat:{heroicStrike:120, whirlwind:50, charge:80, taunt:200, companionAuto:0, shadowBolt:90, corruption:40, drainLife:25},
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
/* plan-V3 C3–C5：合并 sim 内容表（js/sim/content.js 先于本文件加载） */
if(typeof SIM_CONTENT!=="undefined")BALANCE.sim=SIM_CONTENT;
else if(!BALANCE.sim)BALANCE.sim={};
/* plan-V3 C6：用 XP_CURVE 覆盖升级曲线与等级上限 */
if(BALANCE.sim&&BALANCE.sim.xp&&BALANCE.sim.xp.XP_CURVE){
  BALANCE.levels.xpMax=BALANCE.sim.xp.XP_CURVE.slice();
  if(BALANCE.sim.xp.maxLevel)BALANCE.levels.max=BALANCE.sim.xp.maxLevel|0;
}
