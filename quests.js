/* ============================================================
   熔火之心 · quests.js
   任务枢纽（STEP 22 / V1-B2）：QUESTS[] · 交付/使用/到达/护送 · 存档 flags
   ------------------------------------------------------------
   [依赖] THREE · core.js（BAL clamp makeLabel）
          combat.js（S · gainXP gainCopper log announce）
          items.js 运行时（ITEMS）
          world.js / barrens.js 运行时（QUEST BARRENS_QUEST 兼容别名 · player scene）
          save.js / panels.js 运行时（saveGame renderQuestLog）
   [导出] QUESTS getQuestDef questStatus questProgress
          acceptQuest turnInQuest abandonQuest completeQuestObjective
          onQuestMobKill onQuestBossKill onQuestZoneEnter
          onQuestUseItem canUseQuestItem tickQuestWorld clearQuestEscort
          canAcceptQuest canTurnInQuest canAbandonQuest questsForNpc
          npcHasQuestOffer npcHasQuestTurnIn
          getActiveQuestEntries getQuestLogEntries
          collectQuestSave applyQuestSave resetAllQuests
          syncLegacyQuestAliases applyQuestRewards
          updateQuestTracker updateQuest countInvItem
          refreshDeliverObjectives syncQuestNpcBindings
          questNpcLabel questTurnInId questGiverId
   ============================================================ */
"use strict";

/* ---- 静态任务表（莫高雷按经典 POI 任务表重构；数值引用 BAL） ---- */
const QUESTS=[
  /* ===== 莫高雷主线：纳拉其 → 血蹄 → 雷霆崖 ===== */
  {id:"elder_boars", title:"开始狩猎", subtitle:"草原漫步者的肉",
    chapter:"main", zone:"mulgore", sort:10,
    minLevel:1, prereq:[],
    giver:"hawkwind", turnIn:"hawkwind",
    objectives:[{type:"deliver", item:"bird_meat", count:4}],
    rewards:{xpKey:"quest", copperKey:"boarCopper", hpMaxKey:"boarHp", dmgMulAddKey:"boarDmg"},
    acceptLog:"接受任务【开始狩猎】：击杀草原漫步者，收集肉块交给鹰风酋长。",
    readyAnnounce:"肉块已齐 · 回鹰风酋长处",
    completeAnnounce:"获得 · 大地母亲的祝福",
    next:"hawkwind_totem"},
  {id:"hawkwind_totem", title:"鹰风图腾", subtitle:"交给营地长者",
    chapter:"main", zone:"mulgore", sort:12,
    minLevel:2, prereq:["elder_boars"],
    giver:"grull", turnIn:"grayhorn",
    grantItems:["quest_hawkwind_totem"],
    objectives:[{type:"deliver", item:"quest_hawkwind_totem", count:1}],
    rewards:{sideKey:"hawkwind_totem"},
    acceptLog:"接受任务【鹰风图腾】：把图腾交给纳拉其营地的长者灰角。",
    readyAnnounce:"图腾在身 · 交给长者灰角",
    completeAnnounce:"鹰风图腾 · 完成",
    next:"hunt_continues"},
  {id:"hunt_continues", title:"狩猎继续", subtitle:"刺背野猪人",
    chapter:"main", zone:"mulgore", sort:14,
    minLevel:3, prereq:["hawkwind_totem"],
    giver:"hawkwind", turnIn:"hawkwind",
    objectives:[{type:"kill", mob:"bristleback", countKey:"hunt_continues"}],
    rewards:{sideKey:"hunt_continues"},
    acceptLog:"接受任务【狩猎继续】：击杀刺背野猪人。",
    readyAnnounce:"野猪人已除 · 回鹰风酋长处",
    completeAnnounce:"狩猎继续 · 完成",
    next:"raoul_supply"},
  {id:"raoul_supply", title:"猎蹄的补给", subtitle:"送往血蹄村",
    chapter:"main", zone:"mulgore", sort:16,
    minLevel:3, prereq:["hunt_continues"],
    giver:"raoul", turnIn:"baine",
    grantItems:["quest_raoul_crate"],
    objectives:[{type:"deliver", item:"quest_raoul_crate", count:1}],
    rewards:{sideKey:"raoul_supply"},
    acceptLog:"接受任务【猎蹄的补给】：把补给送到血蹄村交给贝恩·血蹄。",
    readyAnnounce:"补给在身 · 交给贝恩",
    completeAnnounce:"猎蹄的补给 · 完成",
    next:"bloodhoof_journey"},
  {id:"bloodhoof_journey", title:"血蹄村之旅", subtitle:"向贝恩报到",
    chapter:"main", zone:"mulgore", sort:18,
    minLevel:5, prereq:["raoul_supply"],
    giver:"baine", turnIn:"baine",
    objectives:[{type:"arrive", x:BLOODHOOF.x, z:BLOODHOOF.z, r:14, label:"贝恩·血蹄", liveNpc:"baine"}],
    rewards:{sideKey:"bloodhoof_journey"},
    acceptLog:"接受任务【血蹄村之旅】：在血蹄村向贝恩·血蹄报到。",
    readyAnnounce:"已报到 · 与贝恩对话",
    completeAnnounce:"血蹄村之旅 · 完成",
    next:"clear_palemane"},
  {id:"clear_palemane", title:"清除贫瘠石", subtitle:"击杀豺狼人",
    chapter:"main", zone:"mulgore", sort:20,
    minLevel:7, prereq:["bloodhoof_journey"],
    giver:"baine", turnIn:"baine",
    objectives:[{type:"kill", mob:"palemane", countKey:"clear_palemane"}],
    rewards:{sideKey:"clear_palemane"},
    acceptLog:"接受任务【清除贫瘠石】：清剿贫瘠石的苍鬃豺狼人。",
    readyAnnounce:"豺狼人已退 · 回贝恩处",
    completeAnnounce:"清除贫瘠石 · 完成",
    next:"thunderhorn_trouble"},
  {id:"thunderhorn_trouble", title:"雷角水井的麻烦", subtitle:"前往调查",
    chapter:"main", zone:"mulgore", sort:22,
    minLevel:7, prereq:["clear_palemane"],
    giver:"mull", turnIn:"thunderhorn_guard",
    objectives:[{type:"arrive", x:MULGORE.thunderhorn.x, z:MULGORE.thunderhorn.z, r:16, label:"雷角水井", livePoi:"thunderhorn"}],
    rewards:{sideKey:"thunderhorn_trouble"},
    acceptLog:"接受任务【雷角水井的麻烦】：前往雷角水井调查污染。",
    readyAnnounce:"已抵达雷角水井 · 与守卫对话",
    completeAnnounce:"雷角水井调查 · 完成",
    next:"well_pollution"},
  {id:"well_pollution", title:"水井的污染", subtitle:"击杀水元素",
    chapter:"main", zone:"mulgore", sort:24,
    minLevel:7, prereq:["thunderhorn_trouble"],
    giver:"thunderhorn_guard", turnIn:"thunderhorn_guard",
    objectives:[{type:"kill", mob:"waterElement", countKey:"well_pollution"}],
    rewards:{sideKey:"well_pollution"},
    acceptLog:"接受任务【水井的污染】：击杀污染雷角水井的水元素。",
    readyAnnounce:"水元素已除 · 回雷角守卫处",
    completeAnnounce:"水井的污染 · 完成",
    next:"cleanse_well"},
  {id:"cleanse_well", title:"净化水井", subtitle:"使用净化图腾",
    chapter:"main", zone:"mulgore", sort:26,
    minLevel:7, prereq:["well_pollution"],
    giver:"thunderhorn_guard", turnIn:"mull",
    grantItems:["quest_winterhoof_totem"],
    objectives:[{type:"use", item:"quest_winterhoof_totem", nearPoi:"thunderhorn", nearR:18}],
    rewards:{sideKey:"cleanse_well"},
    acceptLog:"接受任务【净化水井】：在雷角水井使用净化图腾，再回报穆尔·雷角。",
    readyAnnounce:"水井已净 · 回穆尔处",
    completeAnnounce:"净化水井 · 完成",
    next:"mulgore_crisis"},
  {id:"mulgore_crisis", title:"莫高雷的危机", subtitle:"侦察贫瘠之地",
    chapter:"main", zone:"mulgore", sort:28,
    minLevel:10, prereq:["cleanse_well"],
    giver:"cairne", turnIn:"cairne",
    objectives:[{type:"enter", zone:"barrens", countKey:"mulgore_crisis"}],
    rewards:{sideKey:"mulgore_crisis"},
    acceptLog:"接受任务【莫高雷的危机】：前往贫瘠之地侦察，再回报凯恩·血蹄。",
    readyAnnounce:"已踏入贫瘠之地 · 回雷霆崖见凯恩",
    completeAnnounce:"莫高雷的危机 · 完成",
    next:"ragnaros_whisper"},
  {id:"ragnaros_whisper", title:"炎魔的低语", subtitle:"讨伐拉戈斯",
    chapter:"main", zone:"molten_core", sort:30,
    minLevel:5, prereq:["mulgore_crisis"],
    giver:"cairne", turnIn:null, autoComplete:true,
    objectives:[{type:"boss", bossId:"ragnaros", countKey:"boss"}],
    rewards:{xpKey:null, copper:0},
    acceptLog:"接受任务【炎魔的低语】：进入北方传送门，击败炎魔领主拉戈斯。",
    completeAnnounce:"炎魔的低语 · 完成",
    completeLog:"拉戈斯沉回熔岩——圣山的危机暂息。"},

  /* ===== 贫瘠之地主线（十字路口营地 NPC 发放） ===== */
  {id:"darsok_supply", title:"十字路口的补给", subtitle:"送信至陶拉祖",
    chapter:"main", zone:"barrens", sort:29,
    minLevel:10, prereq:[],
    giver:"darsok", turnIn:"darsok",
    grantItems:["quest_darsok_letter"],
    objectives:[{type:"arrive", x:BARRENS.taurajo.x, z:BARRENS.taurajo.z, r:22, label:"陶拉祖营地", livePoi:"taurajo"}],
    rewards:{sideKey:"darsok_supply"},
    acceptLog:"接受任务【十字路口的补给】：将急信带往陶拉祖营地方向，再回报达索克。",
    readyAnnounce:"已抵达陶拉祖方向 · 回达索克处",
    completeAnnounce:"补给信已送达",
    next:"crossroads_trouble"},
  {id:"crossroads_trouble", title:"野猪人的威胁",
    chapter:"main", zone:"barrens", sort:30,
    minLevel:11, prereq:["darsok_supply"],
    giver:"darsok", turnIn:"darsok",
    objectives:[{type:"kill", mob:"barrensBristle", countKey:"quilboar"}],
    rewards:{xpKey:"barrensQuest", copperKey:"barrensCopper"},
    acceptLog:"接受任务【野猪人的威胁】：清剿刺背野猪人。",
    readyAnnounce:"刺背已退 · 回达索克 · 快刀处",
    completeAnnounce:"完成 · 野猪人的威胁",
    next:"thom_scout"},
  {id:"thom_scout", title:"侦察北方城堡",
    chapter:"main", zone:"barrens", sort:31,
    minLevel:11, prereq:["crossroads_trouble"],
    giver:"thom", turnIn:"thom",
    objectives:[{type:"arrive", x:BARRENS.northWatch.x, z:BARRENS.northWatch.z, r:24, label:"北方城堡", livePoi:"northWatch"}],
    rewards:{sideKey:"thom_scout"},
    acceptLog:"接受任务【侦察北方城堡】：抵达北方城堡并回报托姆·鹰眼。",
    readyAnnounce:"已侦察北方城堡 · 回托姆处",
    completeAnnounce:"侦察完成",
    next:"kag_lions"},
  {id:"kag_lions", title:"草原狮的威胁",
    chapter:"main", zone:"barrens", sort:32,
    minLevel:12, prereq:["thom_scout"],
    giver:"kag", turnIn:"kag",
    objectives:[{type:"kill", mob:"barrensLion", countKey:"kag_lions"}],
    rewards:{sideKey:"kag_lions"},
    acceptLog:"接受任务【草原狮的威胁】：猎杀黄金之路沿线的草原狮。",
    readyAnnounce:"狮群已退 · 回卡格·血怒处",
    completeAnnounce:"草原狮的威胁 · 完成",
    next:"serra_harpies"},
  {id:"serra_harpies", title:"血羽的鹰身人",
    chapter:"main", zone:"barrens", sort:34,
    minLevel:13, prereq:["kag_lions"],
    giver:"serra", turnIn:"serra",
    objectives:[{type:"kill", mob:"oasisHarpy", countKey:"serra_harpies"}],
    rewards:{sideKey:"serra_harpies"},
    acceptLog:"接受任务【血羽的鹰身人】：击杀死水绿洲的鹰身人。",
    readyAnnounce:"鹰身人已清 · 回塞拉·血羽处",
    completeAnnounce:"血羽的鹰身人 · 完成",
    next:"wailing_call"},
  {id:"wailing_call", title:"哀嚎洞穴的入口",
    chapter:"main", zone:"barrens", sort:38,
    minLevel:13, prereq:["serra_harpies"],
    giver:"lal", turnIn:"lal",
    objectives:[{type:"arrive", x:BARRENS.wailing.x, z:BARRENS.wailing.z, r:20, label:"哀嚎洞穴入口", livePoi:"wailing"}],
    rewards:{sideKey:"lal_wc_entrance"},
    acceptLog:"接受任务【哀嚎洞穴的入口】：调查哀嚎洞穴入口。",
    readyAnnounce:"已抵达洞穴入口 · 回拉尔·野性图腾处",
    completeAnnounce:"哀嚎洞穴入口 · 完成",
    next:"mankrik_revenge"},
  {id:"mankrik_revenge", title:"复仇",
    chapter:"main", zone:"barrens", sort:40,
    minLevel:15, prereq:["wailing_call"],
    giver:"mankrik", turnIn:"mankrik",
    objectives:[{type:"kill", mob:"quilboarElder", countKey:"mankrik_revenge"}],
    rewards:{sideKey:"mankrik_revenge", items:["barrens_cleaver"]},
    acceptLog:"接受任务【复仇】：击杀陶拉祖附近的野猪人长老。",
    readyAnnounce:"长老已除 · 回曼科里克处",
    completeAnnounce:"复仇 · 完成"},

  /* ===== 赭岩谷主线（4 节） ===== */
  {id:"ochre_sting", title:"赭岩毒刺",
    chapter:"main", zone:"durotar", sort:40,
    minLevel:12, prereq:[],
    giver:"ochre_outpost", turnIn:"ochre_outpost",
    objectives:[{type:"kill", mob:"scorp", countKey:"scorp"}],
    rewards:{xpKey:"durotarQuest", copperKey:"durotarCopper"},
    acceptLog:"接受任务【赭岩毒刺】：清剿赭岩巨蝎。",
    readyAnnounce:"蝎群已退 · 回斥候赤牙处",
    completeAnnounce:"完成 · 赭岩毒刺",
    next:"razor_patrol"},
  {id:"razor_patrol", title:"刺脊巡逻",
    chapter:"main", zone:"durotar", sort:42,
    minLevel:12, prereq:["ochre_sting"],
    giver:"ochre_outpost", turnIn:"ochre_outpost",
    objectives:[{type:"kill", mob:"razorback", countKey:"razor_patrol"}],
    rewards:{sideKey:"razor_patrol"},
    acceptLog:"接受任务【刺脊巡逻】：清剿刺脊野猪人。",
    readyAnnounce:"刺脊已清 · 回赤牙处",
    completeAnnounce:"刺脊巡逻 · 完成",
    next:"cliff_beacon_main"},
  {id:"cliff_beacon_main", title:"崖顶烽火", subtitle:"抵达南崖信标",
    chapter:"main", zone:"durotar", sort:44,
    minLevel:12, prereq:["razor_patrol"],
    giver:"ochre_outpost", turnIn:"ochre_outpost",
    objectives:[{type:"arrive", x:54, z:-288, r:28, label:"乱风岗信标"}],
    rewards:{sideKey:"cliff_beacon_main"},
    acceptLog:"接受任务【崖顶烽火】：前往东南崖顶查看信标。",
    readyAnnounce:"信标已确认 · 回赤牙处",
    completeAnnounce:"崖顶烽火 · 完成",
    next:"runner_escort_main"},
  {id:"runner_escort_main", title:"赤牙信使", subtitle:"护送斥候到达东口",
    chapter:"main", zone:"durotar", sort:46,
    minLevel:12, prereq:["cliff_beacon_main"],
    giver:"ochre_outpost", turnIn:"ochre_outpost",
    objectives:[{type:"escort", destX:160, destZ:0, r:14, label:"赭岩东口", name:"斥候 · 焦蹄"}],
    rewards:{sideKey:"runner_main"},
    acceptLog:"接受任务【赤牙信使】：护送焦蹄前往东口（靠近传送门即完成）。",
    readyAnnounce:"信使已安全抵达 · 回赤牙处",
    completeAnnounce:"赤牙信使 · 完成"},

  /* ===== 莫高雷支线（按经典表 · ≥10） ===== */
  {id:"earthmother_gift", title:"大地之母的恩赐",
    chapter:"side", zone:"mulgore", sort:100,
    minLevel:2, prereq:["elder_boars"],
    giver:"grayhorn", turnIn:"grayhorn",
    objectives:[{type:"kill", mob:"wolf", countKey:"earthmother_gift"}],
    rewards:{sideKey:"earthmother_gift"},
    acceptLog:"接受任务【大地之母的恩赐】：猎杀野兽，取回大地的赠礼。",
    readyAnnounce:"猎物已足 · 回长者灰角处"},
  {id:"wind_totem_quest", title:"风之图腾",
    chapter:"side", zone:"mulgore", sort:102,
    minLevel:4, prereq:["hunt_continues"],
    giver:"hawkwind", turnIn:"hawkwind",
    objectives:[{type:"deliver", item:"wind_essence", count:3}],
    rewards:{sideKey:"wind_totem_quest"},
    acceptLog:"接受任务【风之图腾】：击杀风元素，收集风之精华。",
    readyAnnounce:"精华已齐 · 回鹰风酋长处"},
  {id:"red_cloud_land", title:"红云之地",
    chapter:"side", zone:"mulgore", sort:104,
    minLevel:4, prereq:["hunt_continues"],
    giver:"hawkwind", turnIn:"hawkwind",
    objectives:[{type:"kill", mobs:["kodo","bird"], countKey:"red_cloud_land"}],
    rewards:{sideKey:"red_cloud_land"},
    acceptLog:"接受任务【红云之地】：在红云台地击杀科多兽与陆行鸟。",
    readyAnnounce:"台地猎物已清 · 回鹰风酋长处"},
  {id:"lost_necklace", title:"丢失的项链",
    chapter:"side", zone:"mulgore", sort:106,
    minLevel:3, prereq:["elder_boars"],
    giver:"vera", turnIn:"vera",
    objectives:[{type:"arrive", x:MULGORE.redCloud.x-18, z:MULGORE.redCloud.z+14, r:14, label:"台地边缘"}],
    rewards:{sideKey:"lost_necklace"},
    acceptLog:"接受任务【丢失的项链】：在红云台地边缘找回项链。",
    readyAnnounce:"项链已寻 · 回维拉·猎蹄处"},
  {id:"soul_stone", title:"灵魂之石",
    chapter:"side", zone:"mulgore", sort:108,
    minLevel:4, prereq:["hunt_continues"],
    giver:"whiterock", turnIn:"whiterock",
    objectives:[{type:"deliver", item:"soul_shard", count:3}],
    rewards:{sideKey:"soul_stone"},
    acceptLog:"接受任务【灵魂之石】：从刺背野猪人身上收集灵魂碎片。",
    readyAnnounce:"碎片已齐 · 回长者白岩处"},
  {id:"land_spirit", title:"土地之灵",
    chapter:"side", zone:"mulgore", sort:110,
    minLevel:6, prereq:["bloodhoof_journey"],
    giver:"bloodhoof_elder", turnIn:"bloodhoof_elder",
    objectives:[{type:"deliver", item:"earth_shard", count:3}],
    rewards:{sideKey:"land_spirit"},
    acceptLog:"接受任务【土地之灵】：收集土地元素碎片。",
    readyAnnounce:"碎片已齐 · 回血蹄长者处"},
  {id:"tark_request", title:"风蹄的请求",
    chapter:"side", zone:"mulgore", sort:112,
    minLevel:6, prereq:["bloodhoof_journey"],
    giver:"tark", turnIn:"tark",
    objectives:[{type:"kill", mob:"plainslion", countKey:"tark_request"}],
    rewards:{sideKey:"tark_request"},
    acceptLog:"接受任务【风蹄的请求】：击杀平原狮。",
    readyAnnounce:"平原狮已除 · 回塔克·风蹄处"},
  {id:"haru_prey", title:"鹰眼的猎物",
    chapter:"side", zone:"mulgore", sort:114,
    minLevel:7, prereq:["bloodhoof_journey"],
    giver:"haru", turnIn:"haru",
    objectives:[{type:"kill", mobs:["wolf","thunderhawk"], countKey:"plains_patrol"}],
    rewards:{sideKey:"plains_patrol"},
    acceptLog:"接受任务【鹰眼的猎物】：击杀草原狼与雷鹰。",
    readyAnnounce:"猎物已足 · 回哈鲁·鹰眼处"},
  {id:"mara_supply", title:"雷蹄的补给",
    chapter:"side", zone:"mulgore", sort:116,
    minLevel:5, prereq:["bloodhoof_journey"],
    giver:"mara", turnIn:"cairne",
    grantItems:["quest_mara_letter"],
    objectives:[{type:"deliver", item:"quest_mara_letter", count:1}],
    rewards:{sideKey:"mara_supply"},
    acceptLog:"接受任务【雷蹄的补给】：送信到雷霆崖交给凯恩·血蹄。",
    readyAnnounce:"信件在身 · 交给凯恩"},
  {id:"stonehoof_trial", title:"石蹄的试验",
    chapter:"side", zone:"mulgore", sort:118,
    minLevel:6, prereq:["bloodhoof_journey"],
    giver:"kur", turnIn:"kur",
    objectives:[{type:"deliver", item:"quilboar_gland", count:3}],
    rewards:{sideKey:"stonehoof_trial"},
    acceptLog:"接受任务【石蹄的试验】：收集野猪人毒腺。",
    readyAnnounce:"毒腺已齐 · 回库尔·石蹄处"},
  {id:"mist_clue", title:"迷雾中的线索",
    chapter:"side", zone:"mulgore", sort:120,
    minLevel:7, prereq:["bloodhoof_journey"],
    giver:"aska", turnIn:"aska",
    objectives:[{type:"arrive", x:MULGORE.windfury.x, z:MULGORE.windfury.z, r:22, label:"乱风岗", livePoi:"windfury"}],
    rewards:{sideKey:"mist_clue"},
    acceptLog:"接受任务【迷雾中的线索】：调查乱风岗。",
    readyAnnounce:"乱风岗已探 · 回阿斯卡处"},
  {id:"dwarf_invasion", title:"矮人的入侵",
    chapter:"side", zone:"mulgore", sort:122,
    minLevel:8, prereq:["bloodhoof_journey"],
    giver:"baine", turnIn:"baine",
    objectives:[{type:"arrive", x:MULGORE.baeldun.x, z:MULGORE.baeldun.z, r:20, label:"巴尔丹挖掘场", livePoi:"baeldun"}],
    rewards:{sideKey:"dwarf_invasion"},
    acceptLog:"接受任务【矮人的入侵】：调查巴尔丹挖掘场。",
    readyAnnounce:"挖掘场已探 · 回贝恩处"},
  {id:"palemane_totem", title:"贫瘠石的图腾",
    chapter:"side", zone:"mulgore", sort:124,
    minLevel:8, prereq:["clear_palemane"],
    giver:"tark", turnIn:"tark",
    objectives:[{type:"arrive", x:MULGORE.palemane.x+8, z:MULGORE.palemane.z-6, r:12, label:"豺狼人图腾"}],
    rewards:{sideKey:"palemane_totem"},
    acceptLog:"接受任务【贫瘠石的图腾】：摧毁贫瘠石的豺狼人图腾。",
    readyAnnounce:"图腾已毁 · 回塔克处"},
  {id:"golden_hunt", title:"黄金平原的狩猎",
    chapter:"side", zone:"mulgore", sort:126,
    minLevel:6, prereq:["bloodhoof_journey"],
    giver:"tark", turnIn:"tark",
    objectives:[{type:"kill", mobs:["plainslion","kodo"], countKey:"golden_hunt"}],
    rewards:{sideKey:"golden_hunt"},
    acceptLog:"接受任务【黄金平原的狩猎】：击杀平原狮与科多兽。",
    readyAnnounce:"狩猎完成 · 回塔克处"},
  {id:"plains_pelt", title:"草原行者皮毛",
    chapter:"side", zone:"mulgore", sort:128,
    minLevel:7, prereq:["bloodhoof_journey"],
    giver:"haru", turnIn:"haru",
    objectives:[{type:"deliver", item:"plainstrider_pelt", count:4}],
    rewards:{sideKey:"plains_pelt"},
    acceptLog:"接受任务【草原行者皮毛】：收集草原漫步者皮毛。",
    readyAnnounce:"皮毛已齐 · 回哈鲁处"},
  {id:"winterhoof_trouble", title:"冬蹄的麻烦",
    chapter:"side", zone:"mulgore", sort:130,
    minLevel:6, prereq:["bloodhoof_journey"],
    giver:"winterhoof_guard", turnIn:"winterhoof_guard",
    objectives:[{type:"kill", mob:"bristleback", countKey:"winterhoof_trouble"}],
    rewards:{sideKey:"winterhoof_trouble"},
    acceptLog:"接受任务【冬蹄的麻烦】：击杀冬蹄水井附近的野猪人。",
    readyAnnounce:"野猪人已除 · 回冬蹄守卫处"},
  {id:"winterhoof_water", title:"冬蹄之水",
    chapter:"side", zone:"mulgore", sort:132,
    minLevel:7, prereq:["winterhoof_trouble"],
    giver:"winterhoof_guard", turnIn:"mull",
    grantItems:["quest_winterhoof_sample"],
    objectives:[{type:"deliver", item:"quest_winterhoof_sample", count:1}],
    rewards:{sideKey:"winterhoof_water"},
    acceptLog:"接受任务【冬蹄之水】：取水样送回血蹄村穆尔·雷角处。",
    readyAnnounce:"水样在身 · 交给穆尔"},
  {id:"windfury_harpies", title:"乱风岗的鹰身人",
    chapter:"side", zone:"mulgore", sort:134,
    minLevel:10, prereq:["mist_clue"],
    giver:"windfury_sentinel", turnIn:"windfury_sentinel",
    objectives:[{type:"kill", mob:"windfury", countKey:"harpy_nest"}],
    rewards:{sideKey:"harpy_nest"},
    acceptLog:"接受任务【乱风岗的鹰身人】：击杀乱风岗鹰身人。",
    readyAnnounce:"鹰身人已除 · 回乱风岗哨兵处"},
  {id:"baeldun_dwarves", title:"巴尔丹的矮人",
    chapter:"side", zone:"mulgore", sort:136,
    minLevel:9, prereq:["dwarf_invasion"],
    giver:"baine", turnIn:"baine",
    objectives:[{type:"kill", mob:"baeldun", countKey:"dwarven_digsite"}],
    rewards:{sideKey:"dwarven_digsite"},
    acceptLog:"接受任务【巴尔丹的矮人】：击杀巴尔丹矮人。",
    readyAnnounce:"矮人已退 · 回贝恩处"},
  {id:"dwarf_plans", title:"矮人的计划",
    chapter:"side", zone:"mulgore", sort:138,
    minLevel:10, prereq:["baeldun_dwarves"],
    giver:"baine", turnIn:"baine",
    grantItems:["quest_dwarf_plans"],
    objectives:[{type:"deliver", item:"quest_dwarf_plans", count:1}],
    rewards:{sideKey:"dwarf_plans"},
    acceptLog:"接受任务【矮人的计划】：把偷来的矮人文件交给贝恩（已放入背包）。",
    readyAnnounce:"文件在身 · 交给贝恩"},
  {id:"venture_co", title:"风险投资公司",
    chapter:"side", zone:"mulgore", sort:140,
    minLevel:8, prereq:["bloodhoof_journey"],
    giver:"baine", turnIn:"baine",
    objectives:[{type:"kill", mob:"venture", countKey:"venture_co"}],
    rewards:{sideKey:"venture_co"},
    acceptLog:"接受任务【风险投资公司】：击杀地精矿工。",
    readyAnnounce:"矿工已散 · 回贝恩处"},
  {id:"mine_machines", title:"矿洞的机械",
    chapter:"side", zone:"mulgore", sort:142,
    minLevel:9, prereq:["venture_co"],
    giver:"cairne", turnIn:"cairne",
    objectives:[{type:"arrive", x:MULGORE.venture.x, z:MULGORE.venture.z, r:14, label:"采矿机械", livePoi:"venture"}],
    rewards:{sideKey:"mine_machines"},
    acceptLog:"接受任务【矿洞的机械】：摧毁风险投资公司矿洞的采矿机械。",
    readyAnnounce:"机械已毁 · 回凯恩处"},
  {id:"goblin_supply", title:"地精的补给",
    chapter:"side", zone:"mulgore", sort:144,
    minLevel:9, prereq:["venture_co"],
    giver:"cairne", turnIn:"cairne",
    objectives:[{type:"deliver", item:"quest_venture_crate", count:2}],
    rewards:{sideKey:"goblin_supply"},
    acceptLog:"接受任务【地精的补给】：收集矿洞补给箱。",
    readyAnnounce:"补给已齐 · 回凯恩处"},
  {id:"blasting_mats", title:"爆破材料",
    chapter:"side", zone:"mulgore", sort:146,
    minLevel:9, prereq:["dwarf_invasion"],
    giver:"seen", turnIn:"seen",
    objectives:[{type:"deliver", item:"blasting_powder", count:3}],
    rewards:{sideKey:"blasting_mats"},
    acceptLog:"接受任务【爆破材料】：从巴尔丹矮人处收集炸药。",
    readyAnnounce:"炸药已齐 · 回塞恩·石蹄处"},
  {id:"soul_mesa_rite", title:"灵魂高地的仪式",
    chapter:"side", zone:"mulgore", sort:148,
    minLevel:10, prereq:["mulgore_crisis"],
    giver:"stonetalon", turnIn:"stonetalon",
    objectives:[{type:"deliver", item:"soul_shard", count:4}],
    rewards:{sideKey:"soul_mesa_rite"},
    acceptLog:"接受任务【灵魂高地的仪式】：收集灵魂碎片。",
    readyAnnounce:"碎片已齐 · 回长者石塔处"},
  {id:"stonehoof_request", title:"石蹄的请求",
    chapter:"side", zone:"mulgore", sort:150,
    minLevel:11, prereq:["baeldun_dwarves"],
    giver:"seen", turnIn:"seen",
    objectives:[{type:"kill", mob:"baeldun", countKey:"stonehoof_request"}],
    rewards:{sideKey:"stonehoof_request"},
    acceptLog:"接受任务【石蹄的请求】：继续击杀巴尔丹矮人。",
    readyAnnounce:"矮人已清 · 回塞恩处"},
  {id:"wind_element", title:"风之元素",
    chapter:"side", zone:"mulgore", sort:152,
    minLevel:10, prereq:["mulgore_crisis"],
    giver:"pala", turnIn:"pala",
    objectives:[{type:"deliver", item:"wind_essence", count:4}],
    rewards:{sideKey:"wind_element"},
    acceptLog:"接受任务【风之元素】：收集风元素精华。",
    readyAnnounce:"精华已齐 · 回帕拉·逐风处"},
  {id:"harpy_feathers", title:"鹰身人羽毛",
    chapter:"side", zone:"mulgore", sort:154,
    minLevel:11, prereq:["windfury_harpies"],
    giver:"pala", turnIn:"pala",
    objectives:[{type:"deliver", item:"harpy_feather", count:5}],
    rewards:{sideKey:"harpy_feathers"},
    acceptLog:"接受任务【鹰身人羽毛】：收集乱风岗鹰身人羽毛。",
    readyAnnounce:"羽毛已齐 · 回帕拉处"},
  {id:"sun_eye", title:"太阳之眼",
    chapter:"side", zone:"mulgore", sort:156,
    minLevel:12, prereq:["mulgore_crisis"],
    giver:"hamya", turnIn:"hamya",
    objectives:[{type:"arrive", x:MULGORE.golden.x, z:MULGORE.golden.z, r:22, label:"黄金平原", livePoi:"golden"}],
    rewards:{sideKey:"sun_eye"},
    acceptLog:"接受任务【太阳之眼】：前往黄金平原调查。",
    readyAnnounce:"平原已探 · 回哈米亚处"},
  {id:"grimtotem_loyalty", title:"野性图腾的忠诚",
    chapter:"side", zone:"mulgore", sort:158,
    minLevel:12, prereq:["mulgore_crisis"],
    giver:"magatha", turnIn:"magatha",
    objectives:[{type:"enter", zone:"barrens", countKey:"grimtotem_loyalty"}],
    rewards:{sideKey:"grimtotem_loyalty"},
    acceptLog:"接受任务【野性图腾的忠诚】：前往贫瘠之地完成野性图腾的试炼。",
    readyAnnounce:"已入贫瘠之地 · 回玛加萨处"},
  {id:"runetotem_wisdom", title:"符文图腾的智慧",
    chapter:"side", zone:"mulgore", sort:160,
    minLevel:10, prereq:["bloodhoof_journey"],
    giver:"runetotem", turnIn:"runetotem",
    objectives:[{type:"deliver", item:"bird_feather", count:5}],
    rewards:{sideKey:"runetotem_wisdom"},
    acceptLog:"接受任务【符文图腾的智慧】：收集草药样本（以陆行鸟羽毛代之）。",
    readyAnnounce:"样本已齐 · 回长者符文图腾处"},
  {id:"mesa_escort", title:"雷霆崖信使",
    chapter:"side", zone:"mulgore", sort:162,
    minLevel:5, prereq:["bloodhoof_journey"],
    giver:"mara", turnIn:"mara",
    objectives:[{type:"escort", destX:MULGORE.thunderBluff.x, destZ:MULGORE.thunderBluff.z+16, r:18, label:"雷霆崖山脚", name:"信使 · 石蹄"}],
    rewards:{sideKey:"mesa_escort"},
    acceptLog:"接受任务【雷霆崖信使】：护送信使前往雷霆崖山脚。",
    readyAnnounce:"信使已抵达 · 回玛拉处"},

  /* ===== 贫瘠之地支线（十字路口营地内发放）≥10 ===== */
  {id:"kil_goods", title:"斯特雷的货物",
    chapter:"side", zone:"barrens", sort:200,
    minLevel:10, prereq:["darsok_supply"],
    giver:"kil", turnIn:"kil",
    grantItems:["quest_kil_crate"],
    objectives:[{type:"arrive", x:BARRENS.goodsEast.x, z:BARRENS.goodsEast.z, r:18, label:"丢失货物处", livePoi:"goodsEast"}],
    rewards:{sideKey:"kil_goods"},
    acceptLog:"接受任务【斯特雷的货物】：前往十字路口东侧找回货物痕迹，再回报基尔。",
    readyAnnounce:"货物痕迹已查 · 回基尔·斯特雷处"},
  {id:"kil_ratchet", title:"送货到棘齿城",
    chapter:"side", zone:"barrens", sort:202,
    minLevel:12, prereq:["kil_goods"],
    giver:"kil", turnIn:"kil",
    objectives:[{type:"arrive", x:BARRENS.ratchet.x, z:BARRENS.ratchet.z, r:24, label:"棘齿城方向", livePoi:"ratchet"}],
    rewards:{sideKey:"kil_ratchet"},
    acceptLog:"接受任务【送货到棘齿城】：将货物送往棘齿城方向。",
    readyAnnounce:"已抵棘齿城方向 · 回基尔处"},
  {id:"thom_cannons", title:"北方城堡的火炮",
    chapter:"side", zone:"barrens", sort:204,
    minLevel:13, prereq:["thom_scout"],
    giver:"thom", turnIn:"thom",
    grantItems:["quest_cannon_charge"],
    objectives:[{type:"use", item:"quest_cannon_charge", nearPoi:"northWatch", nearR:28}],
    rewards:{sideKey:"thom_cannons"},
    acceptLog:"接受任务【北方城堡的火炮】：在北方城堡附近使用火炮炸药。",
    readyAnnounce:"火炮已毁 · 回托姆·鹰眼处"},
  {id:"kag_kodo", title:"科多兽皮",
    chapter:"side", zone:"barrens", sort:206,
    minLevel:13, prereq:["kag_lions"],
    giver:"kag", turnIn:"kag",
    objectives:[{type:"deliver", item:"kodo_hide", count:4}],
    rewards:{sideKey:"kag_kodo"},
    acceptLog:"接受任务【科多兽皮】：收集科多兽皮交给卡格·血怒。",
    readyAnnounce:"兽皮已齐 · 回卡格处"},
  {id:"lal_grave", title:"勇士之墓的污染",
    chapter:"side", zone:"barrens", sort:208,
    minLevel:13, prereq:["crossroads_trouble"],
    giver:"lal", turnIn:"lal",
    grantItems:["quest_grave_totem"],
    objectives:[{type:"use", item:"quest_grave_totem", nearPoi:"warriorGrave", nearR:20}],
    rewards:{sideKey:"lal_grave"},
    acceptLog:"接受任务【勇士之墓的污染】：在勇士之墓使用大地净化图腾。",
    readyAnnounce:"墓地已净 · 回拉尔处"},
  {id:"serra_feathers", title:"鹰身人羽毛",
    chapter:"side", zone:"barrens", sort:210,
    minLevel:14, prereq:["serra_harpies"],
    giver:"serra", turnIn:"serra",
    objectives:[{type:"deliver", item:"harpy_feather", count:5}],
    rewards:{sideKey:"serra_feathers"},
    acceptLog:"接受任务【鹰身人羽毛】：收集鹰身人羽毛。",
    readyAnnounce:"羽毛已齐 · 回塞拉处"},
  {id:"mankrik_wife", title:"曼科里克的妻子",
    chapter:"side", zone:"barrens", sort:212,
    minLevel:14, prereq:["crossroads_trouble"],
    giver:"mankrik", turnIn:"mankrik",
    objectives:[{type:"arrive", x:BARRENS.taurajo.x+20, z:BARRENS.taurajo.z-16, r:20, label:"南贫瘠遗骸"}],
    rewards:{sideKey:"mankrik_wife"},
    acceptLog:"接受任务【曼科里克的妻子】：在南贫瘠陶拉祖附近寻找妻子的踪迹。",
    readyAnnounce:"遗骸已寻 · 回曼科里克处"},
  {id:"zinge_potion", title:"金格的药剂",
    chapter:"side", zone:"barrens", sort:214,
    minLevel:14, prereq:["crossroads_trouble"],
    giver:"zinge", turnIn:"zinge",
    objectives:[{type:"deliver", item:"scorp_venom", count:4}],
    rewards:{sideKey:"zinge_potion"},
    acceptLog:"接受任务【金格的药剂】：从北贫瘠蝎子身上收集毒液。",
    readyAnnounce:"毒液已齐 · 回药剂师金格处"},
  {id:"zinge_venom", title:"毒液样本",
    chapter:"side", zone:"barrens", sort:216,
    minLevel:15, prereq:["zinge_potion"],
    giver:"zinge", turnIn:"zinge",
    objectives:[{type:"deliver", item:"snake_venom", count:4}],
    rewards:{sideKey:"zinge_venom"},
    acceptLog:"接受任务【毒液样本】：从南贫瘠收集蛇毒样本。",
    readyAnnounce:"样本已齐 · 回金格处"},
  {id:"lal_leather", title:"变异皮革",
    chapter:"side", zone:"barrens", sort:218,
    minLevel:15, prereq:["wailing_call"],
    giver:"lal", turnIn:"lal",
    objectives:[{type:"deliver", item:"mutated_hide", count:4}],
    rewards:{sideKey:"lal_leather", items:["barrens_cuirass"]},
    acceptLog:"接受任务【变异皮革】：从变异生物身上收集皮革（洞外鳄鱼/元素亦可）。",
    readyAnnounce:"皮革已齐 · 回拉尔处"},
  {id:"lal_fang", title:"尖牙德鲁伊",
    chapter:"side", zone:"barrens", sort:220,
    minLevel:16, prereq:["lal_leather"],
    giver:"lal", turnIn:"lal",
    objectives:[{type:"enter", zone:"wailing_caverns", countKey:"lal_fang"}],
    rewards:{sideKey:"lal_fang"},
    acceptLog:"接受任务【尖牙德鲁伊】：踏入哀嚎洞穴挑战尖牙德鲁伊。",
    readyAnnounce:"已入洞穴 · 回拉尔汇报",
    autoReadyOnEnter:true},
  /* 旧 id 兼容（隐藏支线，避免旧档断裂） */
  {id:"supply_crate_main", title:"失落的木箱",
    chapter:"side", zone:"barrens", sort:230,
    minLevel:10, prereq:["darsok_supply"],
    giver:"darsok", turnIn:"darsok",
    grantItems:["quest_supply_crate"],
    objectives:[{type:"deliver", item:"quest_supply_crate", count:1}],
    rewards:{sideKey:"supply_crate_main"},
    acceptLog:"接受任务【失落的木箱】：把补给箱交还给达索克。",
    readyAnnounce:"木箱在身 · 与达索克交付"},

  /* ===== 赭岩谷支线 ≥10 ===== */
  {id:"cliff_harpy", title:"崖风鹰身",
    chapter:"side", zone:"durotar", sort:300,
    minLevel:12, prereq:["ochre_sting"],
    giver:"ochre_guard", turnIn:"ochre_guard",
    objectives:[{type:"kill", mob:"cliffHarpy", countKey:"cliff_harpy"}],
    rewards:{sideKey:"cliff_harpy", items:["ochre_fang"]},
    acceptLog:"接受任务【崖风鹰身】：击败崖风鹰身女妖。",
    readyAnnounce:"鹰身已除 · 回卫士焦刺处"},
  {id:"scorp_extra", title:"巨蝎再剿",
    chapter:"side", zone:"durotar", sort:302,
    minLevel:12, prereq:["ochre_sting"],
    giver:"ochre_guard", turnIn:"ochre_guard",
    objectives:[{type:"kill", mob:"scorp", countKey:"scorp_extra"}],
    rewards:{sideKey:"scorp_extra"},
    acceptLog:"接受任务【巨蝎再剿】：再清一批赭岩巨蝎。",
    readyAnnounce:"蝎群再退 · 回卫士焦刺处"},
  {id:"razor_extra", title:"刺脊余孽",
    chapter:"side", zone:"durotar", sort:304,
    minLevel:12, prereq:["ochre_sting"],
    giver:"ochre_guard", turnIn:"ochre_guard",
    objectives:[{type:"kill", mob:"razorback", countKey:"razor_extra"}],
    rewards:{sideKey:"razor_extra"},
    acceptLog:"接受任务【刺脊余孽】：清剿更多刺脊野猪人。",
    readyAnnounce:"余孽已清 · 回卫士焦刺处"},
  {id:"cliff_beacon", title:"南崖探路",
    chapter:"side", zone:"durotar", sort:306,
    minLevel:12, prereq:["ochre_sting"],
    giver:"ochre_outpost", turnIn:"ochre_outpost",
    objectives:[{type:"arrive", x:54, z:-288, r:26, label:"乱风岗"}],
    rewards:{sideKey:"cliff_beacon"},
    acceptLog:"接受任务【南崖探路】：抵达东南崖顶。",
    readyAnnounce:"南崖已踏 · 回斥候赤牙处"},
  {id:"west_canyon", title:"西峡谷口",
    chapter:"side", zone:"durotar", sort:308,
    minLevel:12, prereq:["ochre_sting"],
    giver:"ochre_outpost", turnIn:"ochre_outpost",
    objectives:[{type:"arrive", x:-200, z:40, r:24, label:"西峡谷"}],
    rewards:{sideKey:"west_canyon"},
    acceptLog:"接受任务【西峡谷口】：探查西侧峡谷。",
    readyAnnounce:"峡谷已探 · 回斥候赤牙处"},
  {id:"ochre_report", title:"斥候急报",
    chapter:"side", zone:"durotar", sort:310,
    minLevel:12, prereq:["ochre_sting"],
    giver:"ochre_vendor", turnIn:"ochre_vendor",
    grantItems:["quest_ochre_report"],
    objectives:[{type:"deliver", item:"quest_ochre_report", count:1}],
    rewards:{sideKey:"ochre_report", items:["ochre_plate"]},
    acceptLog:"接受任务【斥候急报】：把急报交给商人赤蹄。",
    readyAnnounce:"急报在身 · 与赤蹄交付"},
  {id:"sting_bundle", title:"蝎刺束",
    chapter:"side", zone:"durotar", sort:312,
    minLevel:12, prereq:["ochre_sting"],
    giver:"ochre_vendor", turnIn:"ochre_vendor",
    objectives:[{type:"deliver", item:"scorp_stinger", count:3}],
    rewards:{sideKey:"sting_bundle"},
    acceptLog:"接受任务【蝎刺束】：收集蝎刺交给商人赤蹄。",
    readyAnnounce:"蝎刺已齐 · 回商人赤蹄处"},
  {id:"scorched_oil", title:"焦土圣油",
    chapter:"side", zone:"durotar", sort:314,
    minLevel:12, prereq:["ochre_sting"],
    giver:"ochre_outpost", turnIn:"ochre_outpost",
    grantItems:["quest_sacred_oil"],
    objectives:[{type:"use", item:"quest_sacred_oil"}],
    rewards:{sideKey:"scorched_oil"},
    acceptLog:"接受任务【焦土圣油】：使用圣油完成灼土仪式。",
    readyAnnounce:"仪式完成 · 回斥候赤牙处"},
  {id:"outpost_horn", title:"哨站号角",
    chapter:"side", zone:"durotar", sort:316,
    minLevel:12, prereq:["ochre_sting"],
    giver:"ochre_outpost", turnIn:"ochre_outpost",
    grantItems:["quest_signal_horn"],
    objectives:[{type:"use", item:"quest_signal_horn"}],
    rewards:{sideKey:"outpost_horn"},
    acceptLog:"接受任务【哨站号角】：吹响信号号角。",
    readyAnnounce:"号角已响 · 回斥候赤牙处"},
  {id:"runner_escort", title:"焦蹄护送",
    chapter:"side", zone:"durotar", sort:318,
    minLevel:13, prereq:["ochre_sting"],
    giver:"ochre_outpost", turnIn:"ochre_outpost",
    objectives:[{type:"escort", destX:160, destZ:0, r:14, label:"赭岩东口", name:"信使 · 焦蹄"}],
    rewards:{sideKey:"runner_escort"},
    acceptLog:"接受任务【焦蹄护送】：护送信使前往东口。",
    readyAnnounce:"信使抵达 · 回斥候赤牙处"},

  /* —— 哀嚎洞穴 —— */
  {id:"wailing_cobrahn", title:"毒牙领主",
    chapter:"dungeon", zone:"wailing_caverns", sort:400,
    minLevel:15, prereq:["crossroads_trouble"],
    giver:null, turnIn:null, autoComplete:true,
    objectives:[{type:"boss", bossId:"cobrahn", countKey:"boss"}],
    rewards:{xpKey:null, copper:0},
    acceptLog:"任务【毒牙领主】：击败考布莱恩。",
    completeAnnounce:"毒牙领主已除",
    next:"wailing_verdan"},
  {id:"wailing_verdan", title:"吞噬永生",
    chapter:"dungeon", zone:"wailing_caverns", sort:410,
    minLevel:15, prereq:["wailing_cobrahn"],
    giver:null, turnIn:null, autoComplete:true,
    objectives:[{type:"boss", bossId:"verdan", countKey:"boss"}],
    rewards:{xpKey:null, copper:0},
    acceptLog:"任务【吞噬永生】：击败吞噬者。",
    completeAnnounce:"哀嚎洞穴肃清"},

  /* —— 熔火支线 —— */
  {id:"magmadar_hunt", title:"熔岩猎犬",
    chapter:"dungeon", zone:"molten_core", sort:420,
    minLevel:5, prereq:["elder_boars"],
    giver:null, turnIn:null, autoComplete:true,
    objectives:[{type:"boss", bossId:"magmadar", countKey:"boss"}],
    rewards:{xpKey:null, copper:0},
    acceptLog:"任务【熔岩猎犬】：击败玛格曼达。",
    completeAnnounce:"玛格曼达已倒下"},
];

const QUEST_BY_ID={};
QUESTS.forEach(q=>{QUEST_BY_ID[q.id]=q;});

/** 目标数量：优先 BAL，其次定义表 */
function objectiveCount(obj){
  if(obj.count!=null)return obj.count|0;
  if(obj.countKey==="boar")return BAL.quest.boarKills|0;
  if(obj.countKey==="quilboar")return(BAL.quest.barrens&&BAL.quest.barrens.quilboarKills)|0;
  if(obj.countKey==="scorp")return(BAL.quest.durotar&&BAL.quest.durotar.scorpKills)|0;
  if(obj.countKey==="boss")return 1;
  if(obj.type==="use"||obj.type==="arrive"||obj.type==="escort"||obj.type==="enter")return 1;
  if(obj.type==="deliver")return(obj.count!=null?obj.count:1)|0;
  if(obj.countKey&&BAL.quest.side&&BAL.quest.side[obj.countKey]!=null&&BAL.quest.side[obj.countKey].kills!=null)
    return BAL.quest.side[obj.countKey].kills|0;
  return 1;
}

function countInvItem(id){
  if(!id||!S.inv)return 0;
  let n=0; for(const x of S.inv)if(x===id)n++;
  return n;
}
function removeInvItems(id,need){
  need=need|0; if(!id||need<=0)return 0;
  let removed=0;
  for(let i=S.inv.length-1;i>=0&&removed<need;i--){
    if(S.inv[i]===id){S.inv.splice(i,1);removed++;}
  }
  return removed;
}
function grantQuestItems(ids){
  if(!Array.isArray(ids))return;
  for(const id of ids){
    if(!ITEMS[id])continue;
    if(S.inv.length>=BAL.bag.size){log("背包已满，任务物品未能放入。","lg-sys");break;}
    S.inv.push(id);
  }
  if(typeof renderBag==="function")renderBag();
}

function getQuestDef(id){return QUEST_BY_ID[id]||null;}

/* NPC 显示名：任务追踪 / 交任务提示 */
const QUEST_NPC_NAMES={
  hawkwind:"酋长 · 鹰风",
  grull:"格鲁尔 · 鹰风",
  grayhorn:"长者 · 灰角",
  raoul:"拉乌尔 · 猎蹄",
  vera:"维拉 · 猎蹄",
  whiterock:"长者 · 白岩",
  baine:"贝恩 · 血蹄",
  bloodhoof_elder:"血蹄长者",
  tark:"塔克 · 风蹄",
  mull:"穆尔 · 雷角",
  haru:"哈鲁 · 鹰眼",
  mara:"玛拉 · 雷蹄",
  kur:"库尔 · 石蹄",
  aska:"阿斯卡 · 迷雾行者",
  cairne:"大酋长 · 凯恩",
  stonetalon:"长者 · 石塔",
  seen:"塞恩 · 石蹄",
  pala:"帕拉 · 逐风",
  hamya:"哈米亚 · 逐日",
  magatha:"玛加萨 · 野性图腾",
  runetotem:"长者 · 符文图腾",
  thunderhorn_guard:"雷角水井守卫",
  winterhoof_guard:"冬蹄守卫",
  windfury_sentinel:"乱风岗哨兵",
  elder:"贝恩 · 血蹄",
  vendor:"商人 · 瓦尔格",
  varg:"商人 · 瓦尔格",
  hunter:"哈鲁 · 鹰眼",
  crossroads:"达索克 · 快刀",
  darsok:"达索克 · 快刀",
  kag:"卡格 · 血怒",
  mankrik:"曼科里克",
  thom:"托姆 · 鹰眼",
  kil:"基尔 · 斯特雷",
  serra:"塞拉 · 血羽",
  lal:"拉尔 · 野性图腾",
  zinge:"药剂师 · 金格",
  barrens_cook:"厨子 · 尘粮",
  barrens_vendor:"武器商 · 旱蹄",
  barrens_armor:"护甲商 · 铁鬃",
  innkeeper:"旅店老板 · 风蹄",
  flightmaster:"飞行管理员 · 云翼",
  ochre_outpost:"斥候 · 赤牙",
  ochre_guard:"卫士 · 焦刺",
  ochre_vendor:"商人 · 赤蹄",
};
function questNpcLabel(npcId){
  if(!npcId)return "任务人";
  return QUEST_NPC_NAMES[npcId]||npcId;
}
function bindQuestNpcFields(prog,q){
  if(!prog||!q)return;
  prog.giver=q.giver!=null?q.giver:null;
  prog.turnIn=q.turnIn!=null?q.turnIn:null;
}
/** 进行中任务的交/接人与当前 QUESTS 表对齐（NPC 重分配后旧档可交） */
function syncQuestNpcBindings(){
  const st=ensureQuestState();
  for(const id in st){
    const p=st[id];
    if(!p||(p.status!=="active"&&p.status!=="ready"))continue;
    const q=QUEST_BY_ID[id];
    if(q)bindQuestNpcFields(p,q);
  }
}
function questGiverId(q){
  if(!q)return null;
  const p=questProgress(q.id);
  /* 仅进行中沿用存档绑定；放弃/未接一律以任务表为准，否则无法重新接 */
  if((p.status==="active"||p.status==="ready")&&p.giver!=null)return p.giver;
  return q.giver!=null?q.giver:null;
}
function questTurnInId(q){
  if(!q)return null;
  const p=questProgress(q.id);
  if((p.status==="active"||p.status==="ready")&&p.turnIn!=null)return p.turnIn;
  return q.turnIn!=null?q.turnIn:null;
}

function ensureQuestState(){
  if(!S.quests)S.quests={};
  return S.quests;
}

function questProgress(id){
  const st=ensureQuestState();
  if(!st[id])st[id]={status:"none",kills:0,flags:{}};
  return st[id];
}

function questStatus(id){return questProgress(id).status;}

function prereqMet(q){
  if(!q)return false;
  if(q.minLevel&&S.p.level<(q.minLevel|0))return false;
  const pre=q.prereq||[];
  for(const id of pre){
    if(questStatus(id)!=="done")return false;
  }
  return true;
}

function canAcceptQuest(id){
  const q=getQuestDef(id);
  if(!q)return false;
  if(questStatus(id)!=="none")return false;
  return prereqMet(q);
}

function canTurnInQuest(id){
  return questStatus(id)==="ready";
}

function objectiveProgressText(q,prog){
  const obj=q.objectives&&q.objectives[0];
  if(!obj)return "";
  if(obj.type==="kill"){
    const need=objectiveCount(obj);
    const n=Math.min(prog.kills|0,need);
    const names={boar:"草原野猪",youngBoar:"小野猪",quilboar:"野猪人斥候",bristleback:"刺背野猪人",wolf:"草原狼",zebra:"斑马",
      centaur:"半人马",harpy:"鹰身女妖",windfury:"乱风岗鹰身人",boarKing:"老灰鬃",scorp:"赭岩巨蝎",razorback:"刺脊野猪人",
      cliffHarpy:"崖风鹰身",bird:"草原漫步者",palemane:"苍鬃豺狼人",thunderhawk:"雷鹰",
      baeldun:"巴尔丹火枪手",venture:"风险投资公司工人",plainslion:"平原狮",
      raptor:"迅猛龙",crocolisk:"变异鳄鱼",kodo:"科多兽",oasisWater:"污染水元素",
      oasisHarpy:"绿洲鹰身人",barrensLion:"草原狮",barrensBristle:"刺背野猪人",quilboarElder:"野猪人长老",
      windElement:"风元素",waterElement:"水元素",earthElement:"土元素"};
    const list=obj.mobs||(obj.mob?[obj.mob]:[]);
    const label=list.map(t=>names[t]||t).join("/");
    return `猎杀${label} ${n}/${need}`;
  }
  if(obj.type==="boss"){
    const names={ragnaros:"炎魔领主拉戈斯",magmadar:"玛格曼达",cobrahn:"考布莱恩",verdan:"吞噬者"};
    return prog.status==="done"||(prog.kills|0)>=1
      ?`已击败${names[obj.bossId]||obj.bossId}`
      :`击败${names[obj.bossId]||obj.bossId}`;
  }
  if(obj.type==="enter"){
    return(prog.kills|0)>=1?"已进入目标区域":"进入目标区域";
  }
  if(obj.type==="deliver"){
    const need=objectiveCount(obj);
    const have=countInvItem(obj.item);
    const n=Math.min(have,need);
    const nm=(ITEMS[obj.item]&&ITEMS[obj.item].name)||obj.item;
    return prog.status==="ready"||have>=need?`交付${nm} · 已齐`:`收集${nm} ${n}/${need}`;
  }
  if(obj.type==="use"){
    const nm=(ITEMS[obj.item]&&ITEMS[obj.item].name)||obj.item;
    return(prog.kills|0)>=1?`已使用${nm}`:`使用${nm}`;
  }
  if(obj.type==="arrive"){
    return(prog.kills|0)>=1?`已抵达${obj.label||"目标地点"}`:`前往${obj.label||"目标地点"}`;
  }
  if(obj.type==="escort"){
    return(prog.kills|0)>=1?`护送完成（${obj.label||"目的地"}）`:`护送${obj.name||"NPC"}至${obj.label||"目的地"}`;
  }
  return "";
}

function applyQuestRewards(q,opts){
  opts=opts||{};
  if(!q||!q.rewards)return;
  const r=q.rewards;
  const side=r.sideKey&&BAL.quest.side?BAL.quest.side[r.sideKey]:null;
  if(!opts.skipXp){
    let xp=0;
    if(side&&side.xp!=null)xp=side.xp|0;
    else if(r.xp!=null)xp=r.xp|0;
    else if(r.xpKey&&BAL.levels.xp[r.xpKey]!=null)xp=BAL.levels.xp[r.xpKey]|0;
    if(xp&&typeof gainXP==="function")gainXP(xp);
  }
  if(!opts.skipCopper){
    let copper=0;
    if(side&&side.copper!=null)copper=side.copper|0;
    else if(r.copper!=null)copper=r.copper|0;
    else if(r.copperKey==="boarCopper")copper=BAL.quest.rewardCopper|0;
    else if(r.copperKey==="barrensCopper")copper=(BAL.quest.barrens&&BAL.quest.barrens.rewardCopper)|0;
    else if(r.copperKey==="durotarCopper")copper=(BAL.quest.durotar&&BAL.quest.durotar.rewardCopper)|0;
    if(copper&&typeof gainCopper==="function")gainCopper(copper,{noSave:true});
  }
  if(!opts.skipStats){
    let hp=0;
    if(r.hpMax!=null)hp=r.hpMax|0;
    else if(r.hpMaxKey==="boarHp")hp=BAL.quest.rewardHp|0;
    if(hp){S.p.hpMax+=hp; if(!opts.keepHp)S.p.hp=S.p.hpMax; else S.p.hp=Math.min(S.p.hpMax,S.p.hp);}

    let dmgAdd=0;
    if(r.dmgMulAdd!=null)dmgAdd=+r.dmgMulAdd;
    else if(r.dmgMulAddKey==="boarDmg")dmgAdd=(BAL.quest.rewardDmgMul||1)-1;
    if(dmgAdd)S.p.dmgMul+=dmgAdd;

    if(!opts.silent&&(hp||dmgAdd)){
      const bits=[];
      if(hp)bits.push(`生命上限 +${hp}`);
      if(dmgAdd)bits.push(`伤害 +${Math.round(dmgAdd*100)}%`);
      if(bits.length)log(`奖励：${bits.join("，")}！`,"lg-heal");
    }
  }
  if(!opts.skipItems&&Array.isArray(r.items)){
    for(const id of r.items){
      if(ITEMS[id]&&S.inv.length<BAL.bag.size&&!S.inv.includes(id)&&!isItemEquipped(id))
        S.inv.push(id);
    }
  }
}

function canAbandonQuest(id){
  const st=questStatus(id);
  return st==="active"||st==="ready";
}

/** 放弃未交任务：清进度，可重新接；回收本任务发放的任务物品 */
function abandonQuest(id,opts){
  opts=opts||{};
  const q=getQuestDef(id);
  if(!q||!canAbandonQuest(id))return false;
  if(S.questEscort&&S.questEscort.questId===id)clearQuestEscort();
  /* 回收 grantItems 与 deliver/use 目标上的任务物品 */
  const dropIds=new Set();
  if(Array.isArray(q.grantItems))q.grantItems.forEach(x=>dropIds.add(x));
  const obj=q.objectives&&q.objectives[0];
  if(obj&&(obj.type==="deliver"||obj.type==="use")&&obj.item){
    const it=ITEMS[obj.item];
    if(it&&it.quest)dropIds.add(obj.item);
  }
  for(const itemId of dropIds){
    while(countInvItem(itemId)>0)removeInvItems(itemId,99);
  }
  const st=ensureQuestState();
  delete st[id];
  if(!opts.silent){
    const who=questNpcLabel(q.giver);
    log(`已放弃任务【${q.title}】。可向${who}重新接取。`,"lg-sys");
    announce(`放弃任务 · ${q.title}`);
  }
  syncLegacyQuestAliases();
  if(typeof setMarker==="function")setMarker();
  if(typeof updateBarrensMarkers==="function")updateBarrensMarkers();
  if(typeof updateDurotarMarkers==="function")updateDurotarMarkers();
  if(typeof updateNpcQuestMarkers==="function")updateNpcQuestMarkers();
  updateQuestTracker();
  if(typeof renderBag==="function")renderBag();
  if(typeof renderQuestLog==="function")renderQuestLog();
  /* 对话开着时关掉，下次 F 会刷出「接受」 */
  if(typeof closeDialogue==="function")closeDialogue();
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
  return true;
}

function acceptQuest(id,opts){
  opts=opts||{};
  const q=getQuestDef(id);
  if(!q||!canAcceptQuest(id))return false;
  const prog=questProgress(id);
  prog.status="active";
  prog.kills=0;
  prog.flags={};
  bindQuestNpcFields(prog,q);
  if(q.grantItems)grantQuestItems(q.grantItems);
  if(q.acceptLog&&!opts.silent)log(q.acceptLog,"lg-sys");
  if(!opts.silent)announce(`接受任务 · ${q.title}`);
  const obj0=q.objectives&&q.objectives[0];
  if(obj0&&obj0.type==="escort")startQuestEscort(q.id,obj0);
  if(obj0&&obj0.type==="deliver")refreshDeliverObjectives({noSave:true});
  syncLegacyQuestAliases();
  updateQuestTracker();
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
  return true;
}

function markQuestReady(id,opts){
  opts=opts||{};
  const q=getQuestDef(id);
  const prog=questProgress(id);
  if(!q||prog.status!=="active")return false;
  if(S.questEscort&&S.questEscort.questId===id)clearQuestEscort();
  if(q.autoComplete||!q.turnIn){
    return finishQuest(id,opts);
  }
  prog.status="ready";
  if(q.readyAnnounce&&!opts.silent)announce(q.readyAnnounce);
  syncLegacyQuestAliases();
  updateQuestTracker();
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
  return true;
}

function finishQuest(id,opts){
  opts=opts||{};
  const q=getQuestDef(id);
  const prog=questProgress(id);
  if(!q)return false;
  if(prog.status!=="active"&&prog.status!=="ready")return false;
  prog.status="done";
  if(S.questEscort&&S.questEscort.questId===id)clearQuestEscort();
  if(!opts.skipRewards)applyQuestRewards(q,opts);
  if(q.completeAnnounce&&!opts.silent)announce(q.completeAnnounce);
  if(q.completeLog&&!opts.silent)log(q.completeLog,"lg-sys");
  syncLegacyQuestAliases();
  updateQuestTracker();
  if(q.next&&canAcceptQuest(q.next))acceptQuest(q.next,{silent:opts.silent,noSave:true});
  if(typeof onDeedQuestComplete==="function")onDeedQuestComplete(id);
  if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
  return true;
}

function turnInQuest(id,opts){
  if(!canTurnInQuest(id))return false;
  const q=getQuestDef(id);
  const obj=q&&q.objectives&&q.objectives[0];
  if(obj&&obj.type==="deliver"){
    const need=objectiveCount(obj);
    if(countInvItem(obj.item)<need){log("交付物品不足。","lg-sys");return false;}
    removeInvItems(obj.item,need);
    if(typeof renderBag==="function")renderBag();
  }
  return finishQuest(id,opts);
}

function completeQuestObjective(id,amount,opts){
  opts=opts||{};
  const q=getQuestDef(id);
  const prog=questProgress(id);
  if(!q||prog.status!=="active")return false;
  const obj=q.objectives&&q.objectives[0];
  if(!obj)return false;
  const need=objectiveCount(obj);
  prog.kills=Math.min(need,(prog.kills|0)+(amount|0||1));
  if(prog.kills>=need)markQuestReady(id,opts);
  else{
    syncLegacyQuestAliases();
    updateQuestTracker();
    if(!opts.noSave&&typeof saveGame==="function")saveGame(true);
  }
  return true;
}

function onQuestMobKill(m){
  if(!m||!m.type)return;
  for(const q of QUESTS){
    if(questStatus(q.id)!=="active")continue;
    const obj=q.objectives&&q.objectives[0];
    if(!obj||obj.type!=="kill")continue;
    const list=obj.mobs||(obj.mob?[obj.mob]:[]);
    if(list.indexOf(m.type)<0)continue;
    completeQuestObjective(q.id,1);
  }
}

function onQuestBossKill(bossId){
  if(!bossId)return;
  for(const q of QUESTS){
    if(questStatus(q.id)!=="active")continue;
    const obj=q.objectives&&q.objectives[0];
    if(!obj||obj.type!=="boss")continue;
    if(obj.bossId!==bossId)continue;
    completeQuestObjective(q.id,1,{silent:false});
  }
}

function onQuestZoneEnter(zoneId){
  if(!zoneId)return;
  /* 踏入副本时自动接取副本内任务（洞穴的呼唤仍由哨兵发放） */
  if(zoneId==="wailing_caverns"){
    if(canAcceptQuest("wailing_cobrahn"))acceptQuest("wailing_cobrahn",{silent:true,noSave:true});
  }
  if(zoneId==="molten_core"){
    if(canAcceptQuest("magmadar_hunt"))acceptQuest("magmadar_hunt",{silent:true,noSave:true});
    if(canAcceptQuest("ragnaros_whisper"))acceptQuest("ragnaros_whisper",{silent:true,noSave:true});
  }
  for(const q of QUESTS){
    if(questStatus(q.id)!=="active")continue;
    const obj=q.objectives&&q.objectives[0];
    if(!obj||obj.type!=="enter")continue;
    if(obj.zone!==zoneId)continue;
    completeQuestObjective(q.id,1,{noSave:true});
  }
  if(typeof saveGame==="function")saveGame(true);
}

function questsForNpc(npcId){
  return QUESTS.filter(q=>{
    if(q.giver===npcId&&canAcceptQuest(q.id))return true;
    if(questTurnInId(q)===npcId&&canTurnInQuest(q.id))return true;
    return false;
  }).sort((a,b)=>(a.sort||0)-(b.sort||0));
}

/** 该 NPC 是否有可接任务（感叹号） */
function npcHasQuestOffer(npcId){
  if(!npcId)return false;
  for(const q of QUESTS){
    if(q.giver===npcId&&canAcceptQuest(q.id))return true;
  }
  return false;
}
/** 该 NPC 是否有可交任务（问号） */
function npcHasQuestTurnIn(npcId){
  if(!npcId)return false;
  for(const q of QUESTS){
    if(questTurnInId(q)===npcId&&canTurnInQuest(q.id))return true;
  }
  return false;
}

function getActiveQuestEntries(){
  syncQuestNpcBindings();
  const out=[];
  for(const q of QUESTS){
    const st=questStatus(q.id);
    if(st!=="active"&&st!=="ready")continue;
    const prog=questProgress(q.id);
    const turnNpc=questTurnInId(q);
    out.push({
      id:q.id, title:q.title, zone:q.zone, chapter:q.chapter,
      obj:objectiveProgressText(q,prog),
      done:st==="ready",
      tip:st==="ready"
        ?(turnNpc?`回去找${questNpcLabel(turnNpc)}交任务`:`目标已完成`)
        :(q.subtitle||q.title),
      status:st, sort:q.sort||0,
      giver:questGiverId(q), turnIn:turnNpc,
    });
  }
  return out.sort((a,b)=>a.sort-b.sort);
}

function getQuestLogEntries(){
  const active=getActiveQuestEntries();
  const done=[];
  for(const q of QUESTS){
    if(questStatus(q.id)!=="done")continue;
    done.push({
      id:q.id, title:q.title, zone:q.zone, chapter:q.chapter,
      obj:q.subtitle?`${q.subtitle} · 已完成`:"已完成",
      done:true, tip:"任务完成", status:"done", sort:q.sort||0,
    });
  }
  done.sort((a,b)=>a.sort-b.sort);
  return active.concat(done);
}

/** 兼容旧 QUEST / BARRENS_QUEST 状态机（对话与测试过渡期） */
function syncLegacyQuestAliases(){
  if(typeof QUEST!=="undefined"){
    const boar=questStatus("elder_boars");
    const whisper=questStatus("ragnaros_whisper");
    const bk=questProgress("elder_boars").kills|0;
    if(whisper==="done"){QUEST.state=3;QUEST.kills=BAL.quest.boarKills;}
    else if(whisper==="active"||whisper==="ready"){QUEST.state=2;QUEST.kills=BAL.quest.boarKills;}
    else if(boar==="done"){QUEST.state=2;QUEST.kills=BAL.quest.boarKills;}
    else if(boar==="active"||boar==="ready"){QUEST.state=1;QUEST.kills=bk;}
    else{QUEST.state=0;QUEST.kills=0;}
  }
  if(typeof BARRENS_QUEST!=="undefined"){
    const st=questStatus("crossroads_trouble");
    const k=questProgress("crossroads_trouble").kills|0;
    if(st==="done"){BARRENS_QUEST.state=2;BARRENS_QUEST.kills=BAL.quest.barrens.quilboarKills;}
    else if(st==="active"||st==="ready"){BARRENS_QUEST.state=1;BARRENS_QUEST.kills=k;}
    else{BARRENS_QUEST.state=0;BARRENS_QUEST.kills=0;}
  }
}

function collectQuestSave(){
  syncQuestNpcBindings();
  const out={};
  const st=ensureQuestState();
  for(const id in st){
    const p=st[id];
    if(!p||p.status==="none")continue;
    out[id]={
      status:p.status, kills:p.kills|0,
      flags:p.flags&&typeof p.flags==="object"?p.flags:{},
      giver:p.giver!=null?p.giver:null,
      turnIn:p.turnIn!=null?p.turnIn:null,
    };
  }
  return out;
}

function applyQuestSave(rawQuests,legacy){
  resetAllQuests({silent:true});
  const st=ensureQuestState();
  let oldMainDone=false;
  if(rawQuests&&typeof rawQuests==="object"){
    for(const oid of ["sacred_pool","plains_wolves","ancestor_tusk_main"]){
      if(rawQuests[oid]&&rawQuests[oid].status==="done")oldMainDone=true;
    }
    for(const id in rawQuests){
      if(!QUEST_BY_ID[id])continue;
      const r=rawQuests[id];
      if(!r||typeof r!=="object")continue;
      const status=["none","active","ready","done"].includes(r.status)?r.status:"none";
      if(status==="none")continue;
      const flags=(r.flags&&typeof r.flags==="object")?Object.assign({},r.flags):{};
      st[id]={status,kills:Math.max(0,r.kills|0),flags,
        giver:r.giver!=null?r.giver:null, turnIn:r.turnIn!=null?r.turnIn:null};
      if(status==="active"){
        const q=QUEST_BY_ID[id], obj=q&&q.objectives&&q.objectives[0];
        if(obj&&obj.type==="escort")startQuestEscort(id,obj,{silent:true});
      }
    }
  }else if(legacy){
    /* v1：quest.state / barrensQuest.state → 新表 */
    const qs=legacy.quest||{};
    const state=qs.state|0, kills=qs.kills|0;
    const markDone=(id,k)=>{st[id]={status:"done",kills:k|0,flags:{}};}
    if(state===1){
      st.elder_boars={status:"active",kills:0,flags:{}};
    }else if(state===2){
      ["elder_boars","hawkwind_totem","hunt_continues","raoul_supply","bloodhoof_journey",
        "clear_palemane","thunderhorn_trouble","well_pollution","cleanse_well","mulgore_crisis"].forEach(id=>markDone(id,1));
      st.ragnaros_whisper={status:"active",kills:0,flags:{}};
    }else if(state>=3){
      ["elder_boars","hawkwind_totem","hunt_continues","raoul_supply","bloodhoof_journey",
        "clear_palemane","thunderhorn_trouble","well_pollution","cleanse_well","mulgore_crisis"].forEach(id=>markDone(id,1));
      st.ragnaros_whisper={status:"done",kills:1,flags:{}};
    }
    const bq=legacy.barrensQuest||{};
    const bs=bq.state|0, bk=bq.kills|0;
    const need=BAL.quest.barrens.quilboarKills|0;
    if(bs===1)st.crossroads_trouble={status:bk>=need?"ready":"active",kills:bk,flags:{}};
    else if(bs>=2)st.crossroads_trouble={status:"done",kills:need,flags:{}};
  }
  /* 把进行中任务的交/接人绑定到当前 QUESTS 表（NPC 重分配后旧档也能交） */
  syncQuestNpcBindings();
  migrateMulgoreQuestChain(st,{oldMainDone});
  /* 已完成任务的永久属性奖励回放（不重复发经验/铜币） */
  if(questStatus("elder_boars")==="done"){
    applyQuestRewards(getQuestDef("elder_boars"),{silent:true,skipXp:true,skipCopper:true,skipItems:true,keepHp:true});
  }
  syncLegacyQuestAliases();
}

/** 旧档：补全主线前置；将已移除主线 ID 映射到新链进度 */
function migrateMulgoreQuestChain(st,opts){
  if(!st)return;
  opts=opts||{};
  const chain=["elder_boars","hawkwind_totem","hunt_continues","raoul_supply","bloodhoof_journey",
    "clear_palemane","thunderhorn_trouble","well_pollution","cleanse_well","mulgore_crisis","ragnaros_whisper"];
  let furthest=-1;
  for(let i=0;i<chain.length;i++){
    const p=st[chain[i]];
    if(p&&(p.status==="active"||p.status==="ready"||p.status==="done"))furthest=i;
  }
  /* 旧主线完成 → 推到血蹄报到之后 */
  if(opts.oldMainDone||(st.rites_earthmother&&st.rites_earthmother.status==="done")
    ||(st.first_step&&st.first_step.status==="done"&&st.sharing_the_land&&st.sharing_the_land.status==="done")){
    const mark=(id,kills)=>{
      if(!st[id]||st[id].status==="none")
        st[id]={status:"done",kills:kills|0,flags:{}};
    };
    mark("elder_boars",4); mark("hawkwind_totem",1); mark("hunt_continues",5);
    mark("raoul_supply",1); mark("bloodhoof_journey",1); mark("clear_palemane",5);
  }
  for(const id in st){
    const p=st[id];
    if(!p)continue;
    if(p.giver==="elder")p.giver="baine";
    if(p.turnIn==="elder")p.turnIn="baine";
    if(p.giver==="vendor")p.giver="varg";
    if(p.turnIn==="vendor")p.turnIn="varg";
    if(p.giver==="hunter")p.giver="haru";
    if(p.turnIn==="hunter")p.turnIn="haru";
    if(p.giver==="ruul")p.giver="aska";
    if(p.turnIn==="ruul")p.turnIn="aska";
    if(p.giver==="harken")p.giver="haru";
    if(p.turnIn==="harken")p.turnIn="haru";
    if(p.giver==="morin")p.giver="baine";
    if(p.turnIn==="morin")p.turnIn="baine";
  }
}

function resetAllQuests(opts){
  S.quests={};
  syncLegacyQuestAliases();
  if(!(opts&&opts.silent))updateQuestTracker();
}


function refreshDeliverObjectives(opts){
  opts=opts||{};
  let changed=false;
  for(const q of QUESTS){
    if(questStatus(q.id)!=="active")continue;
    const obj=q.objectives&&q.objectives[0];
    if(!obj||obj.type!=="deliver")continue;
    const need=objectiveCount(obj);
    if(countInvItem(obj.item)>=need){
      markQuestReady(q.id,{noSave:true,silent:opts.silent});
      changed=true;
    }
  }
  if(changed&&!opts.noSave&&typeof saveGame==="function")saveGame(true);
}

function resolveArriveTarget(obj){
  if(!obj)return null;
  if(obj.liveNpc){
    try{
      const mesh=(typeof globalThis!=="undefined"?globalThis[obj.liveNpc]:null)
        ||(typeof window!=="undefined"?window[obj.liveNpc]:null);
      if(mesh&&mesh.position)return {x:mesh.position.x,z:mesh.position.z};
    }catch(e){/* ignore */}
  }
  if(obj.livePoi&&typeof MULGORE!=="undefined"&&MULGORE[obj.livePoi])
    return {x:MULGORE[obj.livePoi].x,z:MULGORE[obj.livePoi].z};
  if(obj.livePoi&&typeof BARRENS!=="undefined"&&BARRENS[obj.livePoi])
    return {x:BARRENS[obj.livePoi].x,z:BARRENS[obj.livePoi].z};
  return {x:+obj.x,z:+obj.z};
}

function canUseQuestItem(itemId){
  if(!itemId)return true;
  for(const q of QUESTS){
    if(questStatus(q.id)!=="active")continue;
    const obj=q.objectives&&q.objectives[0];
    if(!obj||obj.type!=="use"||obj.item!==itemId)continue;
    if(obj.nearPoi){
      const poi=(typeof MULGORE!=="undefined"&&MULGORE[obj.nearPoi])||(typeof BARRENS!=="undefined"&&BARRENS[obj.nearPoi]);
      if(poi){
        if(typeof player==="undefined"||!player)return false;
        const r=obj.nearR!=null?+obj.nearR:18;
        if(Math.hypot(player.position.x-poi.x,player.position.z-poi.z)>r){
          if(typeof announce==="function")announce("靠近目标地点再使用");
          return false;
        }
      }
    }
    return true;
  }
  return true;
}

function onQuestUseItem(itemId){
  if(!itemId)return false;
  let hit=false;
  for(const q of QUESTS){
    if(questStatus(q.id)!=="active")continue;
    const obj=q.objectives&&q.objectives[0];
    if(!obj||obj.type!=="use")continue;
    if(obj.item!==itemId)continue;
    if(obj.nearPoi){
      const poi=(typeof MULGORE!=="undefined"&&MULGORE[obj.nearPoi])||(typeof BARRENS!=="undefined"&&BARRENS[obj.nearPoi]);
      if(poi){
        if(typeof player==="undefined"||!player)continue;
        const r=obj.nearR!=null?+obj.nearR:18;
        if(Math.hypot(player.position.x-poi.x,player.position.z-poi.z)>r)continue;
      }
    }
    completeQuestObjective(q.id,1);
    hit=true;
  }
  return hit;
}

let _questEscortMesh=null;
function clearQuestEscort(){
  if(_questEscortMesh){
    if(_questEscortMesh.parent)_questEscortMesh.parent.remove(_questEscortMesh);
    _questEscortMesh.traverse(o=>{
      if(o.geometry)o.geometry.dispose();
      if(o.material){
        if(Array.isArray(o.material))o.material.forEach(disposeMaterial);
        else disposeMaterial(o.material);
      }
    });
    _questEscortMesh=null;
  }
  if(S)S.questEscort=null;
}
function startQuestEscort(questId,obj,opts){
  opts=opts||{};
  clearQuestEscort();
  if(typeof player==="undefined"||!player)return;
  const scn=(typeof getCurrentZone==="function"&&getCurrentZone()&&getCurrentZone().scene)||scene;
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.4,.45,1.8,8),
    MAT.get("quest.marker"));
  body.position.y=1.1; g.add(body);
  const lab=makeLabel(obj.name||"护送目标",6,"#ffd9a0","rgba(80,40,10,.9)");
  lab.position.y=3.2; g.add(lab);
  g.position.copy(player.position);
  g.position.x-=2.5; g.position.z-=1.5;
  scn.add(g);
  _questEscortMesh=g;
  S.questEscort={questId,destX:+obj.destX,destZ:+obj.destZ,r:(obj.r!=null?+obj.r:12),spd:6.2};
  if(!opts.silent)announce("护送开始 · 跟上目标");
}

function tickQuestWorld(dt){
  if(!S||!S.started||typeof player==="undefined"||!player)return;
  /* arrive */
  for(const q of QUESTS){
    if(questStatus(q.id)!=="active")continue;
    const obj=q.objectives&&q.objectives[0];
    if(!obj||obj.type!=="arrive")continue;
    const t=resolveArriveTarget(obj);
    if(!t)continue;
    const dx=player.position.x-t.x, dz=player.position.z-t.z;
    if(Math.hypot(dx,dz)<=(obj.r!=null?+obj.r:12))completeQuestObjective(q.id,1);
  }
  /* deliver poll (loot may arrive asynchronously) */
  refreshDeliverObjectives({noSave:true,silent:true});
  /* escort follow */
  const es=S.questEscort;
  if(es&&_questEscortMesh&&questStatus(es.questId)==="active"){
    const m=_questEscortMesh;
    const dx=player.position.x-m.position.x, dz=player.position.z-m.position.z;
    const d=Math.hypot(dx,dz);
    if(d>2.2){
      const spd=es.spd||6;
      m.position.x+=dx/d*spd*dt;
      m.position.z+=dz/d*spd*dt;
      m.rotation.y=Math.atan2(dx,dz);
    }
    m.position.y=0;
    const ex=m.position.x-es.destX, ez=m.position.z-es.destZ;
    if(Math.hypot(ex,ez)<=(es.r||12))completeQuestObjective(es.questId,1);
  }else if(es&&questStatus(es.questId)!=="active"){
    clearQuestEscort();
  }
}

function updateQuestTracker(){
  syncQuestNpcBindings();
  const qel=typeof $==="function"?$("#quest"):null;
  if(!qel)return;
  const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
  let list=getActiveQuestEntries();
  /* 当前区域任务优先，其次主线，最多显示 3 条 */
  list=list.slice().sort((a,b)=>{
    const az=a.zone===zid?-1:0, bz=b.zone===zid?-1:0;
    if(az!==bz)return az-bz;
    const ac=a.chapter==="main"?-1:0, bc=b.chapter==="main"?-1:0;
    if(ac!==bc)return ac-bc;
    return a.sort-b.sort;
  }).slice(0,(BAL.quest.trackerMax|0)||3);
  if(!list.length){
    qel.style.display="none";
    if(typeof renderQuestLog==="function")renderQuestLog();
    return;
  }
  qel.innerHTML=list.map(e=>
    `<div class="qt${e.done?" qd":""}">${e.done?"✔ ":""}任务 · ${e.title}</div>`+
    `<div class="qo">${e.obj}</div>`+
    (e.done?`<div class="qd">${e.tip}</div>`:"")
  ).join("");
  qel.style.display="block";
  if(typeof renderQuestLog==="function")renderQuestLog();
  if(typeof setMarker==="function")setMarker();
  if(typeof updateBarrensMarkers==="function")updateBarrensMarkers();
}

/* 兼容旧名 */
function updateQuest(){updateQuestTracker();}
