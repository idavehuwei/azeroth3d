/* ============================================================
   炽心 · js/sim/rules.js
   plan-v4 STEP 14：经典公式层入口（架构锚点）
   当前实现位于 formulas.js（rollAttack / armorReduction / meleeTable…）
   STEP 15 在此增量扩展或与 formulas 合并；本文件保持零禁词
   依赖：formulas.js（须先加载）
   导出：无新增符号（避免重复声明）
   ============================================================ */
"use strict";

/* 守卫用：确认公式层已就绪（Node / 浏览器均可） */
if(typeof rollAttack!=="function"&&typeof console!=="undefined"&&console.warn){
  console.warn("[sim/rules] formulas.js 未加载：rollAttack 缺失");
}
