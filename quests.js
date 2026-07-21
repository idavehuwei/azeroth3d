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
          onQuestUseItem tickQuestWorld clearQuestEscort
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

/* ---- 静态任务表（V1-B2：主线链 + 每区≥10 支线；数值引用 BAL） ---- */
const QUESTS=[
  /* ===== 莫高雷主线（5 节） ===== */
  {id:"elder_boars", title:"长老的试炼", subtitle:"狂躁的野猪",
    chapter:"main", zone:"mulgore", sort:10,
    minLevel:1, prereq:[],
    giver:"elder", turnIn:"elder",
    objectives:[{type:"kill", mob:"boar", countKey:"boar"}],
    rewards:{xpKey:"quest", copperKey:"boarCopper", hpMaxKey:"boarHp", dmgMulAddKey:"boarDmg"},
    acceptLog:"接受任务【长老的试炼】：猎杀草原野猪。",
    readyAnnounce:"任务目标完成 · 回去找长老",
    completeAnnounce:"获得 · 大地母亲的祝福",
    next:"sacred_pool"},
  {id:"sacred_pool", title:"圣湖之水", subtitle:"抵达红石湖",
    chapter:"main", zone:"mulgore", sort:12,
    minLevel:1, prereq:["elder_boars"],
    giver:"elder", turnIn:"elder",
    objectives:[{type:"arrive", x:-56, z:8, r:14, label:"红石湖畔"}],
    rewards:{sideKey:"sacred_pool_main"},
    acceptLog:"接受任务【圣湖之水】：前往营地西边的红石湖畔。",
    readyAnnounce:"已抵达红石湖 · 回长老处",
    completeAnnounce:"圣湖之水 · 完成",
    next:"ancestor_tusk_main"},
  {id:"ancestor_tusk_main", title:"先祖的獠牙", subtitle:"献上野猪獠牙",
    chapter:"main", zone:"mulgore", sort:14,
    minLevel:2, prereq:["sacred_pool"],
    giver:"elder", turnIn:"elder",
    objectives:[{type:"deliver", item:"boar_tusk", count:3}],
    rewards:{sideKey:"ancestor_main"},
    acceptLog:"接受任务【先祖的獠牙】：收集破损的獠牙交给长老。",
    readyAnnounce:"獠牙已齐 · 回长老处献上",
    completeAnnounce:"先祖收下了獠牙",
    next:"plains_wolves"},
  {id:"plains_wolves", title:"草原之狼", subtitle:"清剿狼群",
    chapter:"main", zone:"mulgore", sort:16,
    minLevel:3, prereq:["ancestor_tusk_main"],
    giver:"elder", turnIn:"elder",
    objectives:[{type:"kill", mob:"wolf", countKey:"plains_wolves"}],
    rewards:{sideKey:"plains_wolves"},
    acceptLog:"接受任务【草原之狼】：猎杀草原狼。",
    readyAnnounce:"狼群已退 · 回长老处",
    completeAnnounce:"草原之狼 · 完成",
    next:"ragnaros_whisper"},
  {id:"ragnaros_whisper", title:"炎魔的低语", subtitle:"讨伐拉戈斯",
    chapter:"main", zone:"molten_core", sort:20,
    minLevel:1, prereq:["plains_wolves"],
    giver:"elder", turnIn:null, autoComplete:true,
    objectives:[{type:"boss", bossId:"ragnaros", countKey:"boss"}],
    rewards:{xpKey:null, copper:0},
    acceptLog:"接受任务【炎魔的低语】：进入北方传送门，击败炎魔领主拉戈斯。",
    completeAnnounce:"炎魔的低语 · 完成",
    completeLog:"拉戈斯沉回熔岩——长老的预言应验了。"},

  /* ===== 贫瘠之地主线（5 节） ===== */
  {id:"crossroads_trouble", title:"十字路口的麻烦",
    chapter:"main", zone:"barrens", sort:30,
    minLevel:10, prereq:[],
    giver:"crossroads", turnIn:"crossroads",
    objectives:[{type:"kill", mob:"quilboar", countKey:"quilboar"}],
    rewards:{xpKey:"barrensQuest", copperKey:"barrensCopper"},
    acceptLog:"接受任务【十字路口的麻烦】：清剿野猪人斥候。",
    readyAnnounce:"任务目标完成 · 回十字路口找哨兵",
    completeAnnounce:"完成 · 十字路口的麻烦",
    next:"supply_crate_main"},
  {id:"supply_crate_main", title:"失落的木箱", subtitle:"交还补给箱",
    chapter:"main", zone:"barrens", sort:32,
    minLevel:10, prereq:["crossroads_trouble"],
    giver:"crossroads", turnIn:"crossroads",
    grantItems:["quest_supply_crate"],
    objectives:[{type:"deliver", item:"quest_supply_crate", count:1}],
    rewards:{sideKey:"supply_crate_main"},
    acceptLog:"接受任务【失落的木箱】：把补给箱交还给哨兵碎牙（已放入背包）。",
    readyAnnounce:"补给箱在身 · 与碎牙对话交付",
    completeAnnounce:"补给已归队",
    next:"centaur_threat_main"},
  {id:"centaur_threat_main", title:"半人马的威胁",
    chapter:"main", zone:"barrens", sort:34,
    minLevel:12, prereq:["supply_crate_main"],
    giver:"crossroads", turnIn:"crossroads",
    objectives:[{type:"kill", mob:"centaur", countKey:"centaur_threat"}],
    rewards:{sideKey:"centaur_threat"},
    acceptLog:"接受任务【半人马的威胁】：清剿东南半人马营地。",
    readyAnnounce:"半人马已退 · 回哨兵处",
    completeAnnounce:"半人马的威胁 · 完成",
    next:"supply_run"},
  {id:"supply_run", title:"失落的补给",
    chapter:"main", zone:"barrens", sort:36,
    minLevel:10, prereq:["centaur_threat_main"],
    giver:"crossroads", turnIn:"crossroads",
    objectives:[{type:"kill", mob:"zebra", countKey:"supply_run"}],
    rewards:{sideKey:"supply_run"},
    acceptLog:"接受任务【失落的补给】：猎杀斑马，为十字路口收集肉干。",
    readyAnnounce:"肉干够了 · 回哨兵处",
    completeAnnounce:"失落的补给 · 完成",
    next:"wailing_call"},
  {id:"wailing_call", title:"洞穴的呼唤",
    chapter:"main", zone:"barrens", sort:38,
    minLevel:15, prereq:["supply_run"],
    giver:"crossroads", turnIn:"crossroads",
    objectives:[{type:"enter", zone:"wailing_caverns", countKey:"wailing_call"}],
    rewards:{sideKey:"wailing_call"},
    acceptLog:"接受任务【洞穴的呼唤】：踏入南方哀嚎洞穴一探究竟。",
    readyAnnounce:"你已踏入洞穴 · 回哨兵汇报",
    autoReadyOnEnter:true},

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
    objectives:[{type:"arrive", x:72, z:-56, r:16, label:"南崖信标"}],
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

  {id:"plains_patrol", title:"草原巡视",
    chapter:"side", zone:"mulgore", sort:100,
    minLevel:3, prereq:["elder_boars"],
    giver:"hunter", turnIn:"hunter",
    objectives:[{type:"kill", mob:"wolf", countKey:"plains_patrol"}],
    rewards:{sideKey:"plains_patrol"},
    acceptLog:"接受任务【草原巡视】：猎杀草原狼。",
    readyAnnounce:"草原巡视目标完成 · 回猎手迅羽处"},
  {id:"harpy_nest", title:"鹰身女妖的巢穴",
    chapter:"side", zone:"mulgore", sort:102,
    minLevel:6, prereq:["elder_boars"],
    giver:"hunter", turnIn:"hunter",
    objectives:[{type:"kill", mob:"harpy", countKey:"harpy_nest"}],
    rewards:{sideKey:"harpy_nest"},
    acceptLog:"接受任务【鹰身女妖的巢穴】：消灭东边的鹰身女妖首领。",
    readyAnnounce:"鹰身女妖已除 · 回猎手迅羽处"},
  {id:"greyjaw_bounty", title:"老灰鬃的悬赏",
    chapter:"side", zone:"mulgore", sort:104,
    minLevel:8, prereq:["elder_boars"],
    giver:"vendor", turnIn:"vendor",
    objectives:[{type:"kill", mob:"boarKing", countKey:"greyjaw_bounty"}],
    rewards:{sideKey:"greyjaw_bounty", items:["mesa_guard"]},
    acceptLog:"接受任务【老灰鬃的悬赏】：猎人商人要那头稀有野猪王的獠牙。",
    readyAnnounce:"老灰鬃倒下了 · 回商人火蹄处领赏"},
  {id:"bird_cull", title:"陆行鸟之扰",
    chapter:"side", zone:"mulgore", sort:106,
    minLevel:2, prereq:["elder_boars"],
    giver:"hunter", turnIn:"hunter",
    objectives:[{type:"kill", mob:"bird", countKey:"bird_cull"}],
    rewards:{sideKey:"bird_cull"},
    acceptLog:"接受任务【陆行鸟之扰】：猎杀陆行鸟。",
    readyAnnounce:"陆行鸟已少 · 回猎手迅羽处"},
  {id:"boar_cull", title:"再清野猪",
    chapter:"side", zone:"mulgore", sort:108,
    minLevel:2, prereq:["elder_boars"],
    giver:"vendor", turnIn:"vendor",
    objectives:[{type:"kill", mob:"boar", countKey:"boar_cull"}],
    rewards:{sideKey:"boar_cull"},
    acceptLog:"接受任务【再清野猪】：再猎杀一批草原野猪。",
    readyAnnounce:"野猪够了 · 回商人火蹄处"},
  {id:"lake_shrine", title:"湖畔祭坛",
    chapter:"side", zone:"mulgore", sort:110,
    minLevel:2, prereq:["elder_boars"],
    giver:"elder", turnIn:"elder",
    objectives:[{type:"arrive", x:-56, z:8, r:12, label:"湖畔祭坛"}],
    rewards:{sideKey:"lake_shrine"},
    acceptLog:"接受任务【湖畔祭坛】：抵达西边湖畔祭坛。",
    readyAnnounce:"祭坛已寻 · 回长老处"},
  {id:"mesa_path", title:"台地小径",
    chapter:"side", zone:"mulgore", sort:112,
    minLevel:3, prereq:["elder_boars"],
    giver:"elder", turnIn:"elder",
    objectives:[{type:"arrive", x:70, z:-40, r:14, label:"东台地"}],
    rewards:{sideKey:"mesa_path"},
    acceptLog:"接受任务【台地小径】：探查东南台地。",
    readyAnnounce:"台地已踏 · 回长老处"},
  {id:"wind_feather", title:"疾风之羽",
    chapter:"side", zone:"mulgore", sort:114,
    minLevel:3, prereq:["elder_boars"],
    giver:"vendor", turnIn:"vendor",
    objectives:[{type:"deliver", item:"bird_feather", count:3}],
    rewards:{sideKey:"wind_feather", items:["wind_blade"]},
    acceptLog:"接受任务【疾风之羽】：收集陆行鸟羽毛交给商人。",
    readyAnnounce:"羽毛已齐 · 回商人火蹄处"},
  {id:"wolf_pelts", title:"灰狼皮货",
    chapter:"side", zone:"mulgore", sort:116,
    minLevel:3, prereq:["elder_boars"],
    giver:"vendor", turnIn:"vendor",
    objectives:[{type:"deliver", item:"wolf_pelt", count:4}],
    rewards:{sideKey:"wolf_pelts", items:["hide_vest"]},
    acceptLog:"接受任务【灰狼皮货】：收集灰狼皮交给商人。",
    readyAnnounce:"狼皮已齐 · 回商人火蹄处"},
  {id:"sacred_salve", title:"圣油涂抹",
    chapter:"side", zone:"mulgore", sort:118,
    minLevel:2, prereq:["elder_boars"],
    giver:"elder", turnIn:"elder",
    grantItems:["quest_sacred_oil"],
    objectives:[{type:"use", item:"quest_sacred_oil"}],
    rewards:{sideKey:"sacred_salve"},
    acceptLog:"接受任务【圣油涂抹】：在背包使用圣油（完成仪式）。",
    readyAnnounce:"仪式完成 · 回长老处"},
  {id:"mesa_escort", title:"台地护送",
    chapter:"side", zone:"mulgore", sort:120,
    minLevel:4, prereq:["elder_boars"],
    giver:"elder", turnIn:"elder",
    objectives:[{type:"escort", destX:0, destZ:-160, r:16, label:"北部门口", name:"学徒 · 石蹄"}],
    rewards:{sideKey:"mesa_escort"},
    acceptLog:"接受任务【台地护送】：护送学徒前往北部门口附近。",
    readyAnnounce:"学徒已抵达 · 回长老处"},

  /* ===== 贫瘠之地支线 ≥10 ===== */
  {id:"centaur_threat", title:"再战半人马",
    chapter:"side", zone:"barrens", sort:200,
    minLevel:12, prereq:["crossroads_trouble"],
    giver:"crossroads", turnIn:"crossroads",
    objectives:[{type:"kill", mob:"centaur", count:4}],
    rewards:{sideKey:"centaur_threat"},
    acceptLog:"接受任务【再战半人马】：继续清剿半人马。",
    readyAnnounce:"半人马再退 · 回哨兵碎牙处"},
  {id:"zebra_meat", title:"斑马肉干",
    chapter:"side", zone:"barrens", sort:202,
    minLevel:10, prereq:["crossroads_trouble"],
    giver:"barrens_cook", turnIn:"barrens_cook",
    objectives:[{type:"kill", mob:"zebra", countKey:"zebra_meat"}],
    rewards:{sideKey:"zebra_meat"},
    acceptLog:"接受任务【斑马肉干】：猎杀斑马，为厨灶备肉。",
    readyAnnounce:"肉干够了 · 回厨子尘粮处"},
  {id:"quil_extra", title:"野猪人清剿",
    chapter:"side", zone:"barrens", sort:204,
    minLevel:10, prereq:["crossroads_trouble"],
    giver:"crossroads", turnIn:"crossroads",
    objectives:[{type:"kill", mob:"quilboar", countKey:"quil_extra"}],
    rewards:{sideKey:"quil_extra"},
    acceptLog:"接受任务【野猪人清剿】：再清一批野猪人。",
    readyAnnounce:"野猪人已清 · 回哨兵碎牙处"},
  {id:"bird_dust", title:"尘羽猎手",
    chapter:"side", zone:"barrens", sort:206,
    minLevel:10, prereq:["crossroads_trouble"],
    giver:"barrens_cook", turnIn:"barrens_cook",
    objectives:[{type:"kill", mob:"bird", countKey:"bird_dust"}],
    rewards:{sideKey:"bird_dust"},
    acceptLog:"接受任务【尘羽猎手】：猎杀陆行鸟。",
    readyAnnounce:"尘羽已收 · 回厨子尘粮处"},
  {id:"dust_watch", title:"尘土瞭望",
    chapter:"side", zone:"barrens", sort:208,
    minLevel:10, prereq:["crossroads_trouble"],
    giver:"crossroads", turnIn:"crossroads",
    objectives:[{type:"arrive", x:0, z:-120, r:18, label:"南口瞭望"}],
    rewards:{sideKey:"dust_watch"},
    acceptLog:"接受任务【尘土瞭望】：抵达贫瘠南口附近。",
    readyAnnounce:"瞭望完成 · 回哨兵碎牙处"},
  {id:"east_ridge", title:"东岭巡视",
    chapter:"side", zone:"barrens", sort:210,
    minLevel:10, prereq:["crossroads_trouble"],
    giver:"crossroads", turnIn:"crossroads",
    objectives:[{type:"arrive", x:140, z:20, r:18, label:"东岭"}],
    rewards:{sideKey:"east_ridge"},
    acceptLog:"接受任务【东岭巡视】：抵达东侧山岭。",
    readyAnnounce:"东岭已踏 · 回哨兵碎牙处"},
  {id:"oasis_visit", title:"绿洲足迹",
    chapter:"side", zone:"barrens", sort:212,
    minLevel:10, prereq:["crossroads_trouble"],
    giver:"crossroads", turnIn:"crossroads",
    objectives:[{type:"arrive", x:-60, z:80, r:16, label:"北绿洲"}],
    rewards:{sideKey:"oasis_visit"},
    acceptLog:"接受任务【绿洲足迹】：探访北方绿洲痕迹。",
    readyAnnounce:"绿洲已访 · 回哨兵碎牙处"},
  {id:"supply_crate", title:"军需木箱",
    chapter:"side", zone:"barrens", sort:214,
    minLevel:10, prereq:["crossroads_trouble"],
    giver:"barrens_cook", turnIn:"barrens_cook",
    grantItems:["quest_supply_crate"],
    objectives:[{type:"deliver", item:"quest_supply_crate", count:1}],
    rewards:{sideKey:"supply_crate", items:["barrens_cuirass"]},
    acceptLog:"接受任务【军需木箱】：将木箱交给厨子尘粮。",
    readyAnnounce:"木箱在身 · 与尘粮交付"},
  {id:"hide_bundle", title:"斑马皮捆",
    chapter:"side", zone:"barrens", sort:216,
    minLevel:10, prereq:["crossroads_trouble"],
    giver:"barrens_vendor", turnIn:"barrens_vendor",
    objectives:[{type:"deliver", item:"zebra_hide", count:3}],
    rewards:{sideKey:"hide_bundle"},
    acceptLog:"接受任务【斑马皮捆】：收集斑马皮交给商人旱蹄。",
    readyAnnounce:"皮捆已齐 · 回商人旱蹄处"},
  {id:"signal_horn", title:"号角试鸣",
    chapter:"side", zone:"barrens", sort:218,
    minLevel:10, prereq:["crossroads_trouble"],
    giver:"crossroads", turnIn:"crossroads",
    grantItems:["quest_signal_horn"],
    objectives:[{type:"use", item:"quest_signal_horn"}],
    rewards:{sideKey:"signal_horn"},
    acceptLog:"接受任务【号角试鸣】：在背包使用信号号角。",
    readyAnnounce:"号角已响 · 回哨兵碎牙处"},
  {id:"caravan_escort", title:"商队护送",
    chapter:"side", zone:"barrens", sort:220,
    minLevel:11, prereq:["crossroads_trouble"],
    giver:"barrens_vendor", turnIn:"barrens_vendor",
    objectives:[{type:"escort", destX:0, destZ:-168, r:16, label:"北口", name:"商队 · 尘足"}],
    rewards:{sideKey:"caravan_escort", items:["barrens_cleaver"]},
    acceptLog:"接受任务【商队护送】：护送商队前往北口。",
    readyAnnounce:"商队抵达 · 回商人旱蹄处"},

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
    objectives:[{type:"arrive", x:72, z:-56, r:16, label:"南崖"}],
    rewards:{sideKey:"cliff_beacon"},
    acceptLog:"接受任务【南崖探路】：抵达东南崖顶。",
    readyAnnounce:"南崖已踏 · 回斥候赤牙处"},
  {id:"west_canyon", title:"西峡谷口",
    chapter:"side", zone:"durotar", sort:308,
    minLevel:12, prereq:["ochre_sting"],
    giver:"ochre_outpost", turnIn:"ochre_outpost",
    objectives:[{type:"arrive", x:-100, z:20, r:18, label:"西峡谷"}],
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
  if(obj.countKey&&BAL.quest.side&&BAL.quest.side[obj.countKey])
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
  elder:"长老 · 岩蹄",
  vendor:"商人 · 火蹄",
  hunter:"猎手 · 迅羽",
  crossroads:"哨兵 · 碎牙",
  barrens_cook:"厨子 · 尘粮",
  barrens_vendor:"商人 · 旱蹄",
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
    const names={boar:"草原野猪",quilboar:"野猪人斥候",wolf:"草原狼",zebra:"斑马",
      centaur:"半人马",harpy:"鹰身女妖",boarKing:"老灰鬃",scorp:"赭岩巨蝎",razorback:"刺脊野猪人",
      cliffHarpy:"崖风鹰身",bird:"陆行鸟"};
    return `猎杀${names[obj.mob]||obj.mob} ${n}/${need}`;
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
    if(obj.mob!==m.type)continue;
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
  if(rawQuests&&typeof rawQuests==="object"){
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
    if(state===1)st.elder_boars={status:kills>=BAL.quest.boarKills?"ready":"active",kills,flags:{}};
    else if(state===2){
      st.elder_boars={status:"done",kills:BAL.quest.boarKills,flags:{}};
      st.sacred_pool={status:"done",kills:1,flags:{}};
      st.ancestor_tusk_main={status:"done",kills:3,flags:{}};
      st.plains_wolves={status:"done",kills:(BAL.quest.side.plains_wolves&&BAL.quest.side.plains_wolves.kills)|5,flags:{}};
      st.ragnaros_whisper={status:"active",kills:0,flags:{}};
    }else if(state>=3){
      st.elder_boars={status:"done",kills:BAL.quest.boarKills,flags:{}};
      st.sacred_pool={status:"done",kills:1,flags:{}};
      st.ancestor_tusk_main={status:"done",kills:3,flags:{}};
      st.plains_wolves={status:"done",kills:(BAL.quest.side.plains_wolves&&BAL.quest.side.plains_wolves.kills)|5,flags:{}};
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
  /* 已完成任务的永久属性奖励回放（不重复发经验/铜币） */
  if(questStatus("elder_boars")==="done"){
    applyQuestRewards(getQuestDef("elder_boars"),{silent:true,skipXp:true,skipCopper:true,skipItems:true,keepHp:true});
  }
  syncLegacyQuestAliases();
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

function onQuestUseItem(itemId){
  if(!itemId)return false;
  let hit=false;
  for(const q of QUESTS){
    if(questStatus(q.id)!=="active")continue;
    const obj=q.objectives&&q.objectives[0];
    if(!obj||obj.type!=="use")continue;
    if(obj.item!==itemId)continue;
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
        if(Array.isArray(o.material))o.material.forEach(m=>m&&m.dispose&&m.dispose());
        else if(o.material.dispose)o.material.dispose();
        if(o.material.map)o.material.map.dispose();
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
    new THREE.MeshStandardMaterial({color:0xc4a060,flatShading:true}));
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
    const dx=player.position.x-(+obj.x), dz=player.position.z-(+obj.z);
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
