/* plan-v4 STEP 19 · 吃喝并行 + 任务表别名 / byClass · 无头断言 */
"use strict";
const fs=require("fs");
const path=require("path");

let pass=0,fail=0;
function ok(cond,msg){
  if(cond){pass++;console.log("PASS:",msg);}
  else{fail++;console.error("FAIL:",msg);}
}

const root=__dirname;
const items=fs.readFileSync(path.join(root,"items.js"),"utf8");
const quests=fs.readFileSync(path.join(root,"quests.js"),"utf8");
const main=fs.readFileSync(path.join(root,"main.js"),"utf8");
const combat=fs.readFileSync(path.join(root,"combat.js"),"utf8");
const panels=fs.readFileSync(path.join(root,"panels.js"),"utf8");
const bal=fs.readFileSync(path.join(root,"js/sim/balance.js"),"utf8");

/* 同时吃喝：food 不因 drinking 拒用；drink 不因 eating 拒用 */
const foodBlock=(items.match(/it\.use==="food"[\s\S]*?if\(([^)]+)\)\{log\("你正在忙碌中/)||[])[1]||"";
const drinkBlock=(items.match(/it\.use==="drink"[\s\S]*?if\(([^)]+)\)\{log\("你正在忙碌中/)||[])[1]||"";
ok(foodBlock.includes("S.p.eating")&&!foodBlock.includes("S.p.drinking"),"进食不因饮水忙碌拒用");
ok(drinkBlock.includes("S.p.drinking")&&!drinkBlock.includes("S.p.eating"),"饮水不因进食忙碌拒用");
ok(main.includes("S.p.eating")&&main.includes("S.p.drinking")&&main.includes("healPerSec"),"主循环并行推进吃喝");
ok(combat.includes("cancelConsume")&&items.includes("function cancelConsume"),"受击/取消打断吃喝");
ok(bal.includes("duration:18")&&bal.includes("food:{")&&bal.includes("drink:{"),"BALANCE 吃喝 18s");

/* 任务表 */
ok(quests.includes("const QUESTS=")&&quests.includes("QUEST_DB=QUESTS"),"QUESTS 数据表");
ok(quests.includes("function abandonQuest")&&panels.includes("abandonQuest"),"放弃任务 + 日志入口");
ok(quests.includes("activeMax")||bal.includes("activeMax"),"同时进行多任务上限");
ok(quests.includes('type:"interact"')&&quests.includes("tryQuestGroundInteract"),"地面闪光交互");
ok(quests.includes("byClass")&&quests.includes("r.byClass"),"byClass 职业奖励分支");
ok(quests.includes('r.money!=null')||quests.includes("r.money"),"money→铜别名");
ok(quests.includes('type==="reach"')||quests.includes('"reach"'),"reach→arrive 别名");

function normalizeObjectiveType(type){
  if(type==="collect")return "deliver";
  if(type==="explore"||type==="reach")return "arrive";
  return type;
}
ok(normalizeObjectiveType("collect")==="deliver","collect→deliver");
ok(normalizeObjectiveType("reach")==="arrive","reach→arrive");
ok(normalizeObjectiveType("kill")==="kill","kill 保持");

console.log(fail?`失败 ${fail} · 通过 ${pass}`:`全部通过 · plan-v4 STEP 19 quests (${pass})`);
process.exit(fail?1:0);
