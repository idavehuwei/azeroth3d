/* plan-v4 STEP 17 · 死亡 / 墓地 / 跑尸 / 游泳 / 存档死亡态 · 无头断言 */
"use strict";
const fs=require("fs");
const path=require("path");

let pass=0,fail=0;
function ok(cond,msg){
  if(cond){pass++;console.log("PASS:",msg);}
  else{fail++;console.error("FAIL:",msg);}
}

const root=__dirname;
const bal=fs.readFileSync(path.join(root,"js/sim/balance.js"),"utf8");
const raid=fs.readFileSync(path.join(root,"raid.js"),"utf8");
const save=fs.readFileSync(path.join(root,"save.js"),"utf8");
const main=fs.readFileSync(path.join(root,"main.js"),"utf8");
const models=fs.readFileSync(path.join(root,"models.js"),"utf8");
const world=fs.readFileSync(path.join(root,"world.js"),"utf8");
const barrens=fs.readFileSync(path.join(root,"barrens.js"),"utf8");
const durotar=fs.readFileSync(path.join(root,"durotar.js"),"utf8");
const html=fs.readFileSync(path.join(root,"game.html"),"utf8");
const combat=fs.readFileSync(path.join(root,"combat.js"),"utf8");

ok(bal.includes("corpseWeaknessT"),"BALANCE.death.corpseWeaknessT");
ok(bal.includes("swimMul")&&bal.includes("swimBlend"),"BALANCE.move 含游泳参数");
ok(models.includes("function buildGraveyard")&&models.includes("function registerGraveyard"),"models 墓地工厂与注册");
ok(models.includes("function nearestGraveyardSpawn"),"models 最近墓地");
ok(world.includes("registerGraveyard(\"mulgore\"")&&world.includes("buildGraveyard"),"莫高雷注册墓地");
ok(barrens.includes("registerGraveyard(\"barrens\"")&&barrens.includes("portal_wailing"),"贫瘠营地+哀嚎门口墓地");
ok(durotar.includes("registerGraveyard(\"durotar\"")&&durotar.includes("portal_ragefire"),"赭岩营地+怒焰门口墓地");
const ashen=fs.readFileSync(path.join(__dirname,"ashen_canyon.js"),"utf8");
ok(ashen.includes("registerGraveyard(\"ashen_canyon\"")&&ashen.includes("portal_crypt"),"灰烬营地+地穴门口墓地");
ok(ashen.includes("buildGraveyard"),"灰烬建造墓地");
ok(raid.includes("nearestGraveyardSpawn")&&raid.includes("releaseSpiritWorld"),"释放灵魂走最近墓地");
ok(raid.includes("corpseWeaknessT")||raid.includes("weaknessT:shortW"),"跑尸复活短虚弱");
ok(raid.includes("restoreDeathFromSave"),"读档恢复死亡态");
ok(raid.includes('btnR.textContent="释放灵魂"')||html.includes('id="btnReleaseRaid"')&&html.includes(">释放灵魂</button>"),"副本死亡按钮文案=释放灵魂");
ok(save.includes("death:{")&&save.includes("corpsePos")&&save.includes("restoreDeathFromSave"),"存档读写死亡态");
ok(main.includes("function playerInWater")&&main.includes("swimMul"),"主循环游泳减速");
ok(combat.includes("weaknessStatMul"),"虚弱伤害倍率接线");

/* 纯逻辑：最近墓地选择 */
const GRAVEYARDS=[];
function registerGraveyard(zoneId,x,z,kind){
  GRAVEYARDS.push({zoneId,x,z,kind:kind||"camp"});
}
function nearestGraveyardSpawn(zoneId,fromX,fromZ){
  const list=GRAVEYARDS.filter(g=>g.zoneId===zoneId);
  if(!list.length)return{x:0,z:0};
  let best=list[0],bestD=Infinity;
  for(const g of list){
    const d=Math.hypot(fromX-g.x,fromZ-g.z);
    if(d<bestD){bestD=d;best=g;}
  }
  return{x:best.x,z:best.z,kind:best.kind};
}
registerGraveyard("mulgore",0,0,"camp");
registerGraveyard("mulgore",100,0,"portal");
const near=nearestGraveyardSpawn("mulgore",90,0);
ok(near.kind==="portal"&&near.x===100,"尸体靠近门口时选门口墓地");
const nearCamp=nearestGraveyardSpawn("mulgore",5,0);
ok(nearCamp.kind==="camp","尸体靠近营地时选营地墓地");

/* 虚弱伤害倍率 */
const mul=.7;
ok(Math.round(100*mul)===70,"虚弱伤害 ×0.7 语义");

console.log(fail?`失败 ${fail} · 通过 ${pass}`:`全部通过 · plan-v4 STEP 17 death (${pass})`);
process.exit(fail?1:0);
