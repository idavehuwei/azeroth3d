/* ============================================================
   炽心 · js/ui/static-strings.js
   plan-v4 STEP 14：将 [data-t] / [data-t-html] 填入静态 DOM
   自 js/sim/strings.js 拆出，以保持 sim 层零 document
   依赖：strings.js（T）
   导出：applyStaticUiStrings
   ============================================================ */
"use strict";

function applyStaticUiStrings(){
  if(typeof document==="undefined")return;
  document.querySelectorAll("[data-t]").forEach(function(el){
    const k=el.getAttribute("data-t");
    if(!k)return;
    el.textContent=T(k);
  });
  document.querySelectorAll("[data-t-html]").forEach(function(el){
    const k=el.getAttribute("data-t-html");
    if(!k)return;
    el.innerHTML=T(k);
  });
}

if(typeof document!=="undefined"){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",applyStaticUiStrings);
  else applyStaticUiStrings();
}
