/* ============================================================
   炽心 · js/ui/tooltip.js
   plan-V3 C8：统一金边浮层（物品 / 法术共用 #itemTip）
   依赖：core.js（$）· items.js（itemTipHtml QUALITY）可选
   导出：showTipHtml hideTip bindTipHtml
   ============================================================ */
"use strict";

function showTipHtml(html,clientX,clientY){
  const tip=$("#itemTip"); if(!tip||!html)return;
  tip.innerHTML=html;
  tip.style.display="block";
  tip.setAttribute("aria-hidden","false");
  const pad=14, tw=tip.offsetWidth||200, th=tip.offsetHeight||120;
  let x=clientX+pad, y=clientY+pad;
  if(x+tw>innerWidth-8)x=clientX-tw-pad;
  if(y+th>innerHeight-8)y=clientY-th-pad;
  tip.style.left=Math.max(8,x)+"px";
  tip.style.top=Math.max(8,y)+"px";
}
function hideTip(){
  const tip=$("#itemTip"); if(!tip)return;
  tip.style.display="none";
  tip.setAttribute("aria-hidden","true");
}
function bindTipHtml(el,htmlOrFn){
  if(!el)return;
  const get=()=>typeof htmlOrFn==="function"?htmlOrFn():htmlOrFn;
  el.addEventListener("pointerenter",e=>showTipHtml(get(),e.clientX,e.clientY));
  el.addEventListener("pointermove",e=>showTipHtml(get(),e.clientX,e.clientY));
  el.addEventListener("pointerleave",hideTip);
}
