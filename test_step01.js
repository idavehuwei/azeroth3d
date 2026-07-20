/* 无头回归测试 · STEP 0 + STEP 1
   在 Node 中真实加载五个模块（stub 掉 DOM 与 WebGL 渲染器），
   验证：SeededRng 确定性 / BALANCE 生效 / hitEntity 三类实体链路 / 任务挂接 */
"use strict";
const fs = require("fs"), vm = require("vm");
const THREE = require("three");

/* ---- WebGL 渲染器替身（Node 无 WebGL） ---- */
THREE.WebGLRenderer = class {
  constructor(){ this.domElement = elem(); this.shadowMap = {}; }
  setSize(){} setPixelRatio(){} render(){}
};

/* ---- 万能 DOM 元素替身 ---- */
function elem(){
  const e = {
    style:{}, dataset:{}, children:[], textContent:"", innerHTML:"", className:"",
    classList:{ add(){}, remove(){}, toggle(){}, contains(){return false;} },
    appendChild(c){ this.children.push(c); }, removeChild(c){ const i=this.children.indexOf(c); if(i>=0)this.children.splice(i,1); },
    remove(){}, addEventListener(){}, getBoundingClientRect(){ return {left:0,top:0,width:100,height:100}; },
    querySelector(){ return elem(); }, get firstChild(){ return this.children[0]; },
    getContext(){ return { font:"", textAlign:"", textBaseline:"", shadowColor:"", shadowBlur:0,
      fillStyle:"", fillText(){}, clearRect(){}, measureText(){return{width:0};} }; },
    width:0, height:0, offsetWidth:0,
  };
  return e;
}
const sandbox = {
  THREE, console,
  innerWidth:1280, innerHeight:720, devicePixelRatio:1,
  addEventListener(){}, requestAnimationFrame(){ /* 只跑一帧 */ },
  setTimeout(){ return 0; }, setInterval(){ return 0; }, clearInterval(){}, clearTimeout(){},
  performance,
  document:{
    querySelector(){ return elem(); },
    querySelectorAll(){ return []; },
    getElementById(){ return elem(); },
    createElement(){ return elem(); },
    body: elem(),
  },
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for(const f of ["core.js","models.js","world.js","combat.js","main.js"])
  vm.runInContext(fs.readFileSync(f,"utf8"), sandbox, {filename:f});

/* ---------------- 断言工具 ---------------- */
let pass=0, fail=0;
function ok(cond, name){ if(cond){pass++;console.log("  ✓ "+name);} else {fail++;console.log("  ✗ FAIL: "+name);} }
const g = code => vm.runInContext(code, sandbox);

console.log("== STEP 0 · SeededRng 确定性 ==");
const seqA = g(`(()=>{const r=SeededRng(42);return [r(),r(),r()];})()`);
const seqB = g(`(()=>{const r=SeededRng(42);return [r(),r(),r()];})()`);
const seqC = g(`(()=>{const r=SeededRng(43);return [r(),r(),r()];})()`);
ok(JSON.stringify(seqA)===JSON.stringify(seqB), "同种子序列完全一致");
ok(JSON.stringify(seqA)!==JSON.stringify(seqC), "不同种子序列不同");
ok(seqA.every(v=>v>=0&&v<1), "输出落在 [0,1)");

console.log("== STEP 0 · BALANCE 生效 ==");
ok(g(`S.b.hpMax===BAL.boss.hp && S.b.hpMax===120000`), "Boss 血量来自 BALANCE (120000)");
ok(g(`MOBS.length===5 && MOBS.every(m=>m.hpMax===BAL.mob.hp)`), "5 只野猪血量来自 BALANCE (650)");
ok(g(`typeof makeLabel==='function'`), "makeLabel 已在全局（core.js）");

console.log("== STEP 1 · 野猪：hitEntity 链路 + 仇恨 + 任务挂接 ==");
g(`S.started=true; QUEST.state=1; QUEST.kills=0;`);
g(`mobDamage(MOBS[0], 100, "测试")`);
ok(g(`MOBS[0].state==="aggro"`), "受击触发仇恨（onHit）");
ok(g(`MOBS[0].hp < MOBS[0].hpMax && MOBS[0].hp >= 650-Math.round(100*1.08*S.p.dmgMul)`), "扣血在浮动区间内");
g(`mobDamage(MOBS[0], 99999)`);
ok(g(`MOBS[0].state==="dead" && MOBS[0].respawnT===BAL.mob.respawnT`), "死亡回调：状态 dead + 重生计时来自 BALANCE");
ok(g(`QUEST.kills===1`), "任务击杀数通过 onDeath 挂接 +1");
g(`mobDamage(MOBS[0], 500, "鞭尸")`);
ok(g(`QUEST.kills===1`), "死亡实体免疫再次受击（dead() 守卫）");
g(`mobDamage(MOBS[1],99999); mobDamage(MOBS[2],99999);`);
ok(g(`QUEST.kills===3`), "杀满 3 只任务目标达成");

console.log("== STEP 1 · 烈焰之子：实体化 ==");
g(`spawnAdd(5,5)`);
ok(g(`S.adds.length===1 && S.adds[0].hpMax===BAL.add.hp`), "召唤成功，血量来自 BALANCE (1400)");
g(`const a=S.adds[0]; addDamage(a, 400); sandbox_last=a.hp;`);
ok(g(`S.adds[0].hp === 1400-Math.round(400*S.p.dmgMul)`), "无浮动扣血（variance:null，行为与旧版一致）");
g(`addDamage(S.adds[0], 99999)`);
ok(g(`S.adds.length===0`), "死亡后从 S.adds 移除（addDie）");

console.log("== STEP 1 · Boss：BOSS_ENT 代理 + 击杀 ==");
g(`S.b.rising=false; S.b.submerged=false; QUEST.state=2;`);
g(`dmgBoss(1000, "测试")`);
ok(g(`S.b.hp<S.b.hpMax && S.b.hp>=S.b.hpMax-Math.round(1000*1.12*S.p.dmgMul)`), "hp 代理写回 S.b，浮动 [0.9,1.12]");
g(`dmgBoss(9999999)`);
ok(g(`S.b.hp===0 && S.b.alive===false && S.over===true`), "击杀触发 bossDie");
ok(g(`QUEST.state===3`), "讨伐任务完成");
g(`const before=S.b.hp; dmgBoss(500); `);
ok(g(`S.b.hp===0`), "死亡 Boss 免疫再次受击");

console.log("== 行为保真：变异区间统计（1000 次采样） ==");
const spread = g(`(()=>{
  const m={hp:1e9,hpMax:1e9,state:"x",variance:BAL.variance.mob,
    fctPos(){return new THREE.Vector3()},onDeath(){}};
  let lo=1e9,hi=0;
  for(let i=0;i<1000;i++){const h0=m.hp;hitEntity(m,1000);const d=h0-m.hp;lo=Math.min(lo,d);hi=Math.max(hi,d);}
  return [lo,hi];
})()`);
ok(spread[0]>=920*g("S.p.dmgMul")-1 && spread[1]<=1080*g("S.p.dmgMul")+1,
   `野猪浮动区间 [${spread[0]},${spread[1]}] ⊆ [920,1080]×dmgMul`);

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail?1:0);
