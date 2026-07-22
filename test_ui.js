/* plan-v4 STEP 20 · 单位框架 / 动作栏 / FCT / 施法条 · 无头断言 */
"use strict";
const fs=require("fs");
const path=require("path");

let pass=0,fail=0;
function ok(cond,msg){
  if(cond){pass++;console.log("PASS:",msg);}
  else{fail++;console.error("FAIL:",msg);}
}

const root=__dirname;
const html=fs.readFileSync(path.join(root,"game.html"),"utf8");
const frames=fs.readFileSync(path.join(root,"js/ui/frames.js"),"utf8");
const combat=fs.readFileSync(path.join(root,"combat.js"),"utf8");
const buffs=fs.readFileSync(path.join(root,"buffs.js"),"utf8");
const main=fs.readFileSync(path.join(root,"main.js"),"utf8");
const icons=fs.readFileSync(path.join(root,"icons.js"),"utf8");
const raid=fs.readFileSync(path.join(root,"raid.js"),"utf8");
const companions=fs.readFileSync(path.join(root,"companions.js"),"utf8");

ok(icons.includes("portrait_warrior")&&icons.includes("portrait_boss"),"Icons 单位肖像配方");
ok(html.includes('id="playerAvatar"')&&html.includes('id="targetAvatar"'),"玩家/目标头像 DOM");
ok(html.includes("party-av")&&companions.includes("setUnitPortrait"),"小队肖像");
ok(frames.includes("refreshPlayerAvatar")&&frames.includes("setUnitPortrait"),"frames 肖像 API");
ok(frames.includes("totHp")||html.includes('id="totHp"'),"ToT 迷你血条");
ok(buffs.includes("stacks>1")||buffs.includes("b.stacks"),"Buff HUD 显示层数");
ok(combat.includes("showUnitCastBar")&&raid.includes("showUnitCastBar"),"共用施法条");
ok(combat.includes("skillTargetOutOfRange")&&combat.includes("目标超出射程"),"useSkill OOR 门禁");
ok(html.includes("filter:brightness")&&html.includes(".skill.nores"),"资源不足变暗");
ok(main.includes("conic-gradient")||html.includes("conic-gradient"),"冷却圆形扫描");
ok(html.includes("fct-heal")&&html.includes("fct-xp"),"FCT heal/xp CSS");
ok(combat.includes('kind:"heal"')&&combat.includes('kind:"xp"'),"治疗/经验 FCT kind");
ok(html.includes("skill.oor")&&main.includes("oor"),"射程不足变红");

console.log(fail?`失败 ${fail} · 通过 ${pass}`:`全部通过 · plan-v4 STEP 20 ui (${pass})`);
process.exit(fail?1:0);
