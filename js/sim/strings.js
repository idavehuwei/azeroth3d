/* ============================================================
   炽心 · js/sim/strings.js
   依赖：无（须在所有业务模块之前加载，含 core.js）
   导出：NAMES, TEXTS, T
   plan-V3 · C0：专有名词原创化 + 文本数据化
   plan-v4 STEP 14：纯数据，零 DOM（静态文案填充见 js/ui/static-strings.js）
   ============================================================ */

"use strict";

/* ---- NAMES：区域 / 副本 / Boss / 怪物 / NPC / 物品 / 地标 ---- */
const NAMES={
  brand:"炽心",
  zone:{
    mulgore:"赤蹄草甸",
    barrens:"枯原荒地",
    durotar:"赭岩谷",
    molten_core:"炽心熔窟",
    wailing:"泣息洞窟",
    ragefire:"焰怒深渊",
    onyxia:"黑曜巢穴"
  },
  boss:{
    ragnaros:"熔渊之王 · 卡尔戈",
    ragnaros_short:"卡尔戈",
    ragnaros_title:"熔渊之王",
    ragnaros_full:"熔渊之王卡尔戈",
    magmadar:"炎喉",
    cobrahn:"毒牙领主 · 考布",
    cobrahn_short:"考布",
    verdan:"吞噬者",
    onyxia:"黑曜女皇",
    taragaman:"饥饿者 · 塔拉"
  },
  mob:{
    flame_spawn:"火裔",
    boar:"草原野猪",
    youngBoar:"小野猪",
    quilboar:"野豕斥候",
    bristleback:"刺背野豕",
    quilboarElder:"野豕长老",
    razorback:"刺脊野豕",
    boarKing:"老灰鬃",
    windfury:"风啸岗鹰身人"
  },
  item:{
    sulfuras_haft:"熔渊之柄",
    onyxia_fang:"黑曜之牙",
    greyjaw_tusk:"老灰鬃的獠牙刃",
    quilboar_gland:"野豕毒腺",
    barrens_cuirass:"岔路镇胸甲",
    barrens_greaves:"岔路镇护腿",
    quest_darsok_letter:"岔路镇急信"
  },
  race:{
    tauren:"蹄人"
  },
  poi:{
    bloodhoof:"赤蹄村",
    camp_narache:"岩蹄营地",
    thunder_bluff:"雷岩台",
    crossroads:"岔路镇",
    freewind:"风啸岗",
    redrock:"红岩台地",
    wailing_entrance:"泣息洞窟入口"
  },
  npc:{
    elder:"长老 · 岩蹄",
    elder_dlg:"🐂 长老 · 岩蹄",
    baine:"贝恩 · 赤蹄",
    bloodhoof_elder:"赤蹄长者",
    cairne:"大酋 · 赤蹄",
    grayhorn:"长者 · 灰角",
    ochre_vendor:"商人 · 赤蹄",
    windfury_sentinel:"风啸岗哨兵"
  }
};

/* ---- TEXTS：对话 / 日志 / 公告 / 任务与 UI 叙事 ---- */
const TEXTS={
  meta:{
    title:"炽心熔窟 · 熔渊之王决战",
    h2:"EMBER CORE · 深入炽热核心"
  },
  start:{
    title:"炽心熔窟",
    intro:"草原之风吹过赤蹄草甸的红岩台地。蹄人长老在营火旁低语：<br>\n     北方矗立着一道燃烧的传送门，通往地底深处的 <b style=\"color:#ff8a4a\">炽心熔窟</b>——<br>\n     讨伐熔渊之王 <b style=\"color:#ff8a4a\">卡尔戈</b>，或继续未竟的旅程。",
    hint:"在赤蹄草甸沿土路北行，走进传送门旋涡即进入副本 · 副本内走出地面红圈躲避熔岩喷发"
  },
    ui:{
    boss_name:"🔥 熔渊之王 · 卡尔戈",
    boss_title:"炽心熔窟 · 最终首领",
    world_map:"🗺 卡利姆多 · 世界地图",
    world_map_mulgore:"🗺 世界地图 · 赤蹄草甸",
    minimap_spaced:"赤 蹄 草 甸",
    zone_splash_mulgore:"赤蹄草甸",
    zone_splash_barrens:"枯原荒地",
    zone_splash_durotar:"赭岩谷",
    zone_sub_mulgore:"圣山草原 · 蹄人之家",
    zone_sub_barrens:"岔路镇 · 尘土与刺背",
    zone_sub_durotar:"赭岩哨站 · 焦土谷地",
    zone_sub_raid:"地下城",
    submerged:"—— 潜入岩浆 ·先消灭火裔 ——",
    death_raid:"在炽心熔窟中倒下了……",
    death_world:"灵魂将前往营地的灵魂医者处"
  },
  combat:{
    no_target:"你没有目标。",
    target_oor:"目标超出射程！",
    cancel_target:"取消目标。",
    nameplates_on:"姓名板 · 全显",
    nameplates_off:"姓名板 · 常规",
    miss:"未命中",
    dodge:"被躲闪",
    parry:"被招架",
    glancing:"偏斜",
    block:"格挡",
    too_close:"目标太近，无法射击。",
    gcd:"公共冷却中。"
  },
  save:{
    wake_narache:"赤蹄草甸 · 岩蹄营地",
    wake_narache_log:"你从岩蹄营地醒来。北上红云台地猎杀野兽，再前往赤蹄村拜见长老。",
    wake_raid:"你在炽心熔窟外苏醒……"
  },
  zone:{
    enter_molten:"正在进入 · 炽心熔窟",
    leave_molten_roar:"你回到赤蹄草甸，熔渊的咆哮在远方回荡……",
    leave_molten_camp:"你回到圣山草原，蹄人营地的炊烟在远处升起。",
    molten_portal:"炽心熔窟 · 副本入口",
    mulgore_announce:"赤蹄草甸 · 圣山草原",
    mulgore_hint:"北行土路通往蹄人营地……",
    wailing_portal:"泣息洞窟 · 副本入口",
    wailing_hint:"潮气与毒草的气味从旋涡中渗出……走进即可进入泣息洞窟。",
    onyxia_portal:"黑曜巢穴 · 副本入口",
    leave_wailing:"你离开泣息洞窟，岔路镇的风干而炙热。"
  },
  raid:{
    ragnaros_intro_announce:"卡尔戈：太早了！你们竟敢太早唤醒我！",
    ragnaros_intro_log:"熔渊之王 卡尔戈 从熔岩中苏醒了！",
    ragnaros_melee:"卡尔戈的熔火重击",
    ragnaros_bolt:"卡尔戈掷出烈焰冲击！",
    ragnaros_wrath:"卡尔戈之怒",
    ragnaros_wrath_announce:"卡尔戈之怒！",
    ragnaros_p2_announce:"阶段二 · 火裔！",
    ragnaros_p2_log:"卡尔戈沉入岩浆——火裔从熔岩中涌出！消灭它们！",
    ragnaros_emerge_announce:"卡尔戈重新浮出岩浆！",
    ragnaros_emerge_log:"烈焰散去，卡尔戈再度现身！",
    ragnaros_p3_announce:"⚠️ 阶段三 · 卡尔戈狂暴！",
    ragnaros_p3_log:"卡尔戈发出震天咆哮——岩浆沸腾，火裔将不断重生！",
    ragnaros_add_respawn:"熔岩翻涌——新的火裔从岩浆中爬出！",
    ragnaros_death:"卡尔戈发出震天怒吼，缓缓沉回熔岩深处……",
    ragnaros_wipe:"烈焰吞没了你的身躯，卡尔戈的狂笑响彻洞穴。<br>灵魂医者在等着你——跑尸之后，再来一次。",
    magmadar_title:"炽心熔窟 · 一号首领",
    bridge_open:"熔岩散去，通往卡尔戈平台的道路已经打开。",
    add_die:"一只火裔被消灭了！",
    exit_spirit:"你退出炽心熔窟，在灵魂医者旁苏醒。"
  },
  quest:{
    mulgore_crisis_title:"赤蹄草甸的危机",
    mulgore_crisis_accept:"接受任务【赤蹄草甸的危机】：前往枯原荒地侦察，再回报大酋 · 赤蹄。",
    mulgore_crisis_ready:"已踏入枯原荒地 · 回雷岩台见大酋",
    mulgore_crisis_done:"赤蹄草甸的危机 · 完成",
    ragnaros_whisper_title:"熔渊的低语",
    ragnaros_whisper_sub:"讨伐卡尔戈",
    ragnaros_whisper_accept:"接受任务【熔渊的低语】：进入北方传送门，击败熔渊之王卡尔戈。",
    ragnaros_whisper_done:"熔渊的低语 · 完成",
    ragnaros_whisper_log:"卡尔戈沉回熔岩——圣山的危机暂息。",
    hunt_continues_sub:"刺背野豕",
    hunt_continues_accept:"接受任务【狩猎继续】：击杀刺背野豕。",
    hunt_continues_ready:"野豕已除 · 回鹰风酋长处",
    crossroads_trouble_title:"野豕的威胁",
    crossroads_trouble_accept:"接受任务【野豕的威胁】：清剿刺背野豕。",
    crossroads_trouble_done:"完成 · 野豕的威胁",
    bloodhoof_journey_title:"赤蹄村之旅",
    bloodhoof_journey_accept:"接受任务【赤蹄村之旅】：在赤蹄村向贝恩 · 赤蹄报到。",
    bloodhoof_journey_done:"赤蹄村之旅 · 完成",
    raoul_supply_sub:"送往赤蹄村",
    raoul_supply_accept:"接受任务【猎蹄的补给】：把补给送到赤蹄村交给贝恩 · 赤蹄。",
    hawk_totem_accept:"接受任务【鹰风图腾】：把图腾交给岩蹄营地的长者灰角。",
    darsok_title:"岔路镇的补给",
    darsok_accept:"接受任务【岔路镇的补给】：将急信带往陶拉祖营地方向，再回报达索克。",
    wailing_call_title:"泣息洞窟的入口",
    wailing_call_accept:"接受任务【泣息洞窟的入口】：调查泣息洞窟入口。",
    wailing_call_done:"泣息洞窟入口 · 完成",
    revenge_accept:"接受任务【复仇】：击杀陶拉祖附近的野豕长老。",
    razor_patrol_accept:"接受任务【刺脊巡逻】：清剿刺脊野豕。",
    soul_stone_accept:"接受任务【灵魂之石】：从刺背野豕身上收集灵魂碎片。",
    soul_ready:"碎片已齐 · 回赤蹄长者处",
    thunderhorn_accept:"接受任务【雷蹄的补给】：送信到雷岩台交给大酋 · 赤蹄。",
    stonehoof_accept:"接受任务【石蹄的试验】：收集野豕毒腺。",
    mist_accept:"接受任务【迷雾中的线索】：调查风啸岗。",
    mist_ready:"风啸岗已探 · 回阿斯卡处",
    winter_trouble_accept:"接受任务【冬蹄的麻烦】：击杀冬蹄水井附近的野豕。",
    winter_trouble_ready:"野豕已除 · 回冬蹄守卫处",
    winter_water_accept:"接受任务【冬蹄之水】：取水样送回赤蹄村穆尔 · 雷角处。",
    windfury_harpies_title:"风啸岗的鹰身人",
    windfury_harpies_accept:"接受任务【风啸岗的鹰身人】：击杀风啸岗鹰身人。",
    windfury_harpies_ready:"鹰身人已除 · 回风啸岗哨兵处",
    mesa_escort_title:"雷岩台信使",
    mesa_escort_accept:"接受任务【雷岩台信使】：护送信使前往雷岩台山脚。",
    feathers_accept:"接受任务【鹰身人羽毛】：收集风啸岗鹰身人羽毛。",
    strew_accept:"接受任务【斯特雷的货物】：前往岔路镇东侧找回货物痕迹，再回报基尔。",
    fang_accept:"接受任务【尖牙德鲁伊】：踏入泣息洞窟挑战尖牙德鲁伊。",
    razor_remnant_accept:"接受任务【刺脊余孽】：清剿更多刺脊野豕。",
    ochre_report_accept:"接受任务【斥候急报】：把急报交给商人赤蹄。",
    ochre_report_ready:"急报在身 · 与赤蹄交付",
    ochre_sting_accept:"接受任务【蝎刺束】：收集蝎刺交给商人赤蹄。",
    ochre_sting_ready:"蝎刺已齐 · 回商人赤蹄处",
    cobrahn_accept:"任务【毒牙领主】：击败考布。",
    verdan_accept:"任务【吞噬永生】：击败吞噬者。",
    verdan_done:"泣息洞窟肃清",
    magmadar_accept:"任务【熔岩猎犬】：击败炎喉。",
    magmadar_done:"炎喉已倒下"
  },
  deed:{
    quilboar_8:"清剿野豕斥候 8 只。",
    greyjaw_title:"灰鬃猎杀",
    greyjaw_desc:"击败稀有精英「老灰鬃野猪王」。",
    greyjaw_reward:"灰鬃克星",
    rockhoof:"岩蹄传人",
    crossroads_title:"岔路镇英雄",
    crossroads_desc:"完成任务「岔路镇的麻烦」。",
    mulgore_watch:"赤蹄草甸守望",
    mulgore_watch_desc:"完成赤蹄草甸三条支线任务。",
    mulgore_guard:"赤蹄草甸卫士",
    enter_wailing:"首次踏入泣息洞窟。",
    enter_ragefire:"首次踏入焰怒深渊。",
    molten_clear:"熔火征服者",
    molten_clear_desc:"首次通关炽心熔窟（击败卡尔戈）。",
    molten_reward:"熔渊克星",
    wailing_clear:"泣息终结",
    wailing_clear_desc:"首次通关泣息洞窟（击败吞噬者）。",
    ragefire_clear:"怒焰平息",
    ragefire_clear_desc:"首次通关焰怒深渊（击败饥饿者塔拉）。",
    magmadar:"击败炎喉。"
  },
  wailing:{
    add_log:"潮湿的嘶鸣响起——变异蛇从岩缝中涌出！消灭它们才能面对考布。",
    cobrahn_announce:"考布 · 毒牙领主！",
    cobrahn_log:"毒液在石缝间汇聚，考布挡在了去路中央！",
    verdan_announce:"吞噬者 · 永生者！",
    verdan_log:"洞穴最深处，吞噬者缓缓站起——藤蔓缠绕着石柱。",
    enter_log:"你踏入泣息洞窟——潮气与毒草的气味扑面而来。",
    hud:"🐍 泣息洞窟"
  },
  barrens:{
    innkeeper:"欢迎来到岔路镇。炉石在此绑定——愿尘土不迷你的眼。",
    lal:"泣息洞窟的污染蔓延到了勇士之墓。大地母亲需要勇士。",
    zinge:"毒液、样本——岔路镇的药剂学需要材料。",
    spirit:"枯原荒地的风很干，旅人。若你倒下，释放灵魂后我会在岔路镇接引你。",
    trouble_done:"刺背野豕暂时退了。陶拉祖还等着补给信——也去问问卡格、托姆和曼科里克，他们手里都有活。",
    trouble_accept:"刺背野豕在营地南边劫掠商队。清剿他们，岔路镇才能喘口气。",
    trouble_btn_reward:"✦ 领取奖励 · 野豕的威胁",
    trouble_btn_accept:"✦ 接受任务：野豕的威胁",
    trouble_progress:"刺背野豕还在南边游荡（{k}/{need}）。",
    hub:"岔路镇是部落的枢纽。补给、侦察、狩猎——营地里的人都有事要拜托你。"
  },
  world:{
    cairne_tip:"赤蹄草甸的危机尚未平息。",
    baine_tip:"赤蹄村守护着赤蹄草甸的心。找穆尔净化水井，找塔克与哈鲁处理猎物，北上可至雷岩台见父亲大酋。"
  }
};

/** 按点分路径取值；先查 TEXTS，再查 NAMES */
function _strGet(root, path){
  if(!path)return null;
  const parts=String(path).split(".");
  let cur=root;
  for(let i=0;i<parts.length;i++){
    if(cur==null||typeof cur!=="object")return null;
    cur=cur[parts[i]];
  }
  return cur==null?null:cur;
}

/**
 * T(key, vars?) — 文本取值。
 * 例：T("zone.mulgore") / T("raid.ragnaros_intro_log") / T("barrens.trouble_progress",{k:1,need:8})
 */
function T(key, vars){
  let v=_strGet(TEXTS, key);
  if(v==null)v=_strGet(NAMES, key);
  if(v==null){
    if(typeof console!=="undefined"&&console.warn)console.warn("[strings] missing:",key);
    return String(key);
  }
  if(typeof v!=="string")return v;
  if(vars&&typeof vars==="object"){
    v=v.replace(/\{(\w+)\}/g,function(_,k){
      return vars[k]!=null?String(vars[k]):"{"+k+"}";
    });
  }
  return v;
}
