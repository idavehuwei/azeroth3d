#!/usr/bin/env node
/* plan-v4 STEP 16：光环引擎无头单测 */
"use strict";
const fs=require("fs");
const path=require("path");
const vm=require("vm");

let failed=0;
function assert(cond,msg){
  if(cond)console.log("PASS:",msg);
  else{console.log("FAIL:",msg);failed++;}
}

const root=__dirname;
const ctx={console,Math};
vm.createContext(ctx);
for(const f of [
  "js/sim/content.js",
  "js/sim/entity.js",
  "js/sim/auras.js"
]){
  vm.runInContext(fs.readFileSync(path.join(root,f),"utf8"),ctx,{filename:f});
}

const{
  SIM_CONTENT,applyAura,tickAuras,hasAura,getAura,removeAura,listAuras,
  applyAbsorbShield,applyEntityHpDamage,syncAbsorbAuraFromEnt
}=ctx;

assert(SIM_CONTENT.auras&&SIM_CONTENT.auras.corruption,"SIM_CONTENT.auras.corruption 存在");
assert(SIM_CONTENT.auras.power_word_shield.type==="absorb","护盾类型 absorb");

/* ---- 3 层 DoT：9 秒内每 3 秒跳一次，到期消失 ---- */
{
  const mob={hp:500,hpMax:500,name:"测试野猪",auras:[],rootT:0};
  applyAura(mob,"corruption",{stacks:3});
  assert(hasAura(mob,"corruption"),"施加腐蚀");
  assert(getAura(mob,"corruption").stacks===3,"腐蚀 3 层");
  let ticks=0,dmgSum=0;
  for(let step=0;step<10;step++){
    const r=tickAuras(mob,1,{
      onDot(ent,amount){ticks++;dmgSum+=amount;applyEntityHpDamage(ent,amount);}
    });
    void r;
  }
  assert(ticks===3,"9 秒内 DoT 跳 3 次（tick=3）");
  assert(dmgSum===3*35*3,"3 层 × 35 × 3 跳");
  assert(!hasAura(mob,"corruption"),"到期后腐蚀消失");
  assert(mob.hp===500-dmgSum,"DoT 扣血正确");
}

/* ---- 定身：rootT 同步 ---- */
{
  const mob={auras:[],rootT:0};
  applyAura(mob,"rooted",{duration:4});
  assert(mob.rootT>=3.9,"定身写入 rootT");
  tickAuras(mob,4.1,{});
  assert(!hasAura(mob,"rooted"),"定身到期");
}

/* ---- 吸收盾：先扣盾再碎裂 ---- */
{
  const p={absorb:0,absorbT:0,auras:[],hp:100};
  applyAura(p,"power_word_shield",{duration:15,absorb:80});
  assert(p.absorb===80&&hasAura(p,"power_word_shield"),"护盾施加");
  const sh=applyAbsorbShield(p,50);
  assert(sh.absorbed===50&&sh.amount===0&&p.absorb===30,"部分吸收");
  syncAbsorbAuraFromEnt(p);
  assert(getAura(p,"power_word_shield").absorb===30,"aura.absorb 同步");
  const sh2=applyAbsorbShield(p,100);
  assert(sh2.shieldBroken&&sh2.amount===70,"盾碎裂并溢出");
  syncAbsorbAuraFromEnt(p);
  assert(!hasAura(p,"power_word_shield"),"碎裂后移除光环");
}

/* ---- 无敌光环 ---- */
{
  const p={invuln:0,auras:[]};
  applyAura(p,"ice_block",{duration:3});
  assert(p.invuln>=2.9,"冰障写入 invuln");
  tickAuras(p,3.1,{});
  assert(!hasAura(p,"ice_block"),"冰障到期");
}

/* ---- 牧师恢复术 HoT（STEP 23） ---- */
{
  assert(SIM_CONTENT.auras.renew&&SIM_CONTENT.auras.renew.type==="hot","SIM_CONTENT.auras.renew 为 hot");
  const p={hp:100,hpMax:500,auras:[]};
  applyAura(p,"renew",{duration:12,healPerSec:50});
  assert(hasAura(p,"renew"),"施加恢复");
  let healed=0;
  for(let step=0;step<4;step++){
    tickAuras(p,3,{
      onHot(ent,amount){healed+=amount;ent.hp=Math.min(ent.hpMax,ent.hp+amount);}
    });
  }
  assert(healed>=140,"恢复术 12 秒内跳疗");
  assert(p.hp>100,"玩家生命因 HoT 上升");
}

assert(typeof listAuras==="function"&&listAuras({auras:[]}).length===0,"listAuras 空列表");

if(failed){
  console.log("\n失败",failed,"项 · test_auras.js");
  process.exit(1);
}
console.log("\n全部通过 · plan-v4 STEP 16 auras");
process.exit(0);
