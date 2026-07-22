/* ============================================================
   炽心 · js/sim/content.js
   plan-V3 C3–C5：战斗数学 / 属性 / 资源常量（纯数据，可无头加载）
   完整 BALANCE 在 js/sim/balance.js；本表经 balance.js 合并为 BAL.sim
   导出：SIM_CONTENT
   ============================================================ */
"use strict";

var SIM_CONTENT={
  /* ---- 五属性派生阈值 ---- */
  stats:{
    staBase:20,           /* 耐力前 N 点每点 +1 HP */
    staPer:1,
    staOverPer:10,        /* 超出部分每点 +10 HP */
    intBase:20,           /* 智力前 N 点每点 +1 法力 */
    intPer:1,
    intOverPer:15,
    armorFromAgi:2,       /* 敏捷 → 护甲 */
    /* 攻击强度：ap = str*strMul + level*lvlMul + base − offset */
    ap:{
      warrior:{strMul:2, agiMul:0, lvlMul:3, base:0, offset:20},
      mage:   {strMul:0, agiMul:0, lvlMul:0, base:0, offset:0},
      archer: {strMul:.5,agiMul:1, lvlMul:2, base:0, offset:10},
      priest: {strMul:0, agiMul:0, lvlMul:0, base:0, offset:0},
      shaman: {strMul:1, agiMul:0, lvlMul:1, base:0, offset:10},
      rogue:  {strMul:1, agiMul:1, lvlMul:2, base:0, offset:20},
      warlock:{strMul:0, agiMul:0, lvlMul:0, base:0, offset:0}
    },
    /* 每 X 点敏捷 = 1% 暴击 */
    critAgiPer:{
      warrior:20, mage:20, archer:15, priest:20, shaman:20, rogue:14, warlock:20
    },
    /* 每 X 点敏捷 = 1% 躲闪 */
    dodgeAgiPer:{
      warrior:20, mage:25, archer:18, priest:25, shaman:22, rogue:14, warlock:25
    },
    baseCrit:5,           /* 基础暴击 % */
    baseDodge:5,
    /* AP 对普攻/技能伤害的换算：dmg *= 1 + ap/apDiv（钳制） */
    apDiv:1400,
    apMulMax:.55
  },

  /* ---- 护甲减伤 ---- */
  armor:{
    kLevel:85,
    kFlat:400,
    cap:.75
  },

  /* ---- 近战命中表（单次掷骰依次扣减）；随等级差 delta=目标−攻击者 ---- */
  melee:{
    /* miss% 按 delta 索引，超出用末档 */
    miss:[5, 5.5, 6, 8, 10, 12],
    dodgeExtra:[0, 0.5, 1, 1.5, 2, 2.5], /* 叠加在目标 dodge 上的额外 */
    parry:[0, 0, 0, 5, 6, 7],             /* 对玩家打怪初版可近 0；Boss 用 */
    glancing:[0, 10, 20, 40, 50, 60],     /* 仅 delta>0 */
    glancingMul:[1, .75, .65, .55, .5, .45],
    block:[0, 0, 0, 0, 0, 0],
    critSuppress:[0, 1, 2, 3, 4, 5],      /* 从暴击%里扣 */
    critMul:2.0,
    glancingOutcome:"glancing"
  },

  /* ---- 法术命中（命中率%）；+3 断崖 83% ---- */
  spell:{
    hit:[96, 95, 94, 83, 83, 83],
    critMul:1.5
  },

  /* ---- 引入命中表/护甲后期望 DPS 补偿 ---- */
  rebalance:{
    outgoingMul:1.28,
    note:"C4：补偿 miss/armor/crit 真实倍率后的期望输出"
  },

  /* ---- 资源 ---- */
  resources:{
    rage:{
      /* c = a*L^2 + b*L + c0 */
      a:.0091, b:3.23, c0:4.27,
      dealCoef:7.5,
      takeCoef:2.5,
      decayPerSec:1.25,   /* 脱战衰减 */
      oocDelay:3,         /* 脱战后延迟再衰减 */
      max:100
    },
    mana:{
      fiveSecRule:5,
      spiritRegenPer:4,   /* 每点精神 → 每秒法力（精神回复期） */
      sittingMul:2.2,     /* 坐下/饮水加速 */
      tickFallback:null   /* 非精神职业仍可用 CLS.regen */
    },
    energy:{
      max:100,
      tickEvery:2,
      tickGain:20,
      /* 若 tick 制未启用，退回 CLS.regen/s */
      useTick:true
    },
    combo:{
      max:5,
      clearOnRetarget:true
    },
    gcd:{
      default:1.5,
      energy:1.0,         /* 能量职业 */
      queueWindow:.2
    },
    combatTimeout:5       /* 无伤/无输出超过此秒 → 脱战 */
  },

  /* ---- 职业开局属性块（量级对齐现有 CLS.hp / 手感） ---- */
  baseStats:{
    warrior:{str:45, agi:25, sta:40, int:10, spi:15, armor:120},
    mage:   {str:12, agi:18, sta:22, int:48, spi:35, armor:40},
    archer: {str:22, agi:42, sta:28, int:18, spi:20, armor:80},
    priest: {str:14, agi:16, sta:24, int:42, spi:40, armor:45},
    shaman: {str:28, agi:20, sta:30, int:32, spi:30, armor:90},
    rogue:  {str:28, agi:45, sta:26, int:14, spi:18, armor:70},
    warlock:{str:14, agi:16, sta:24, int:46, spi:32, armor:42}
  },

  /* ---- 猎人式远程死区（弓箭手） ---- */
  ranged:{
    minRange:5,
    tooCloseMsg:"目标太近，无法射击。"
  },

  /* ---- plan-V3 C6：经验曲线 / 灰色线 / 休息经验 ---- */
  xp:{
    /* XP_CURVE[i] = 从 (i+1) 级升到 (i+2) 所需；共 19 档 → 最高 20 级 */
    XP_CURVE:[
      400,900,1400,2100,2800,3600,4500,5600,6900,
      8400,10000,12000,14400,17200,20400,24000,28000,32000,36000
    ],
    maxLevel:20,
    /* 基础野怪经验：45 + 5×等级 */
    mobBase:45,
    mobPerLevel:5,
    eliteMul:2,
    worldBossMul:2.5,
    /* 相对玩家等级：灰色线 = playerLevel - mobLevel >= greyBelow
       STEP 15 验收：5 级打 1 级猪零经验 → greyBelow:4 */
    greyBelow:4,
    /* 等级差倍率（mobLevel - playerLevel） */
    diffMul:{
      "3":1.4,"2":1.25,"1":1.1,"0":1,
      "-1":.85,"-2":.65,"-3":.45,"-4":.25
    },
    /* 休息经验 */
    rest:{
      maxMulOfBar:1.5,     /* 池上限 = xpMax × 此值 */
      offlinePerHour:.08,  /* 每离线小时攒 xpMax 的比例 */
      offlineCapHours:48,
      campfirePerSec:3,
      innPerSec:5,
      nearR:14
    }
  },

  /* ---- plan-v4 STEP 16：统一光环定义 ---- */
  auras:{
    corruption:{
      name:"腐蚀", kind:"debuff", type:"dot", icon:"corruption",
      dur:9, tick:3, maxStacks:3, dmgPerTick:35
    },
    power_word_shield:{
      name:"真言术：盾", kind:"buff", type:"absorb", icon:"holy_shield",
      dur:15, maxStacks:1
    },
    rooted:{
      name:"定身", kind:"debuff", type:"crowd", flag:"rooted", icon:"frost",
      dur:4, maxStacks:1
    },
    ice_block:{
      name:"寒冰屏障", kind:"buff", type:"invuln", icon:"ice_block",
      dur:6, maxStacks:1
    },
    evasion:{
      name:"闪避", kind:"buff", type:"invuln", icon:"stealth",
      dur:1.2, maxStacks:1
    },
    weakness:{
      name:"虚弱", kind:"debuff", type:"stat", icon:"weakness",
      dur:60, maxStacks:1
    },
    whetstone:{
      name:"磨刀石", kind:"buff", type:"stat", icon:"whetstone",
      dur:30, maxStacks:1, dmgMulAdd:0
    },
    rejuvenation:{
      name:"回春", kind:"buff", type:"hot", icon:"heal",
      dur:12, tick:3, maxStacks:1, healPerSec:25
    }
  }
};
