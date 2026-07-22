/* ============================================================
   炽心 · icons.js
   图标画布工厂（STEP 2）：所有技能/物品图标运行时 Canvas 2D 绘制，零图片文件
   「资源 = 工厂函数 + 数据参数」：画笔函数库 P（渐变底/光晕/多边形/描边）
   + 图标配方表 RECIPES，加新图标 = 加一条配方，不新建画布代码
   ------------------------------------------------------------
   [依赖] 无（纯 Canvas 2D，不依赖 THREE）
   [导出] Icons
          Icons.canvas(name,borderColor) → HTMLCanvasElement（品质描边色由参数决定）
          Icons.get(name,borderColor)    → dataURL（供 <img>/CSS 使用）
          Icons.list()                   → 全部配方名
   ============================================================ */
"use strict";
const Icons=(()=>{
const SIZE=64, cache={};

/* ---------------- 画笔函数库 ---------------- */
const P={
  /* 径向渐变底 */
  bg(cx,inner,outer){
    const g=cx.createRadialGradient(32,24,4,32,34,42);
    g.addColorStop(0,inner);g.addColorStop(1,outer);
    cx.fillStyle=g;cx.fillRect(0,0,SIZE,SIZE);
  },
  /* 光晕 */
  glow(cx,x,y,r,color){
    const g=cx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,color);g.addColorStop(1,"rgba(0,0,0,0)");
    cx.fillStyle=g;cx.fillRect(x-r,y-r,r*2,r*2);
  },
  /* 多边形（fill 可传颜色或渐变对象） */
  poly(cx,pts,fill,stroke,lw=2){
    cx.beginPath();cx.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++)cx.lineTo(pts[i][0],pts[i][1]);
    cx.closePath();
    if(fill){cx.fillStyle=fill;cx.fill();}
    if(stroke){cx.strokeStyle=stroke;cx.lineWidth=lw;cx.stroke();}
  },
  /* 线性渐变填充样式 */
  lin(cx,x0,y0,x1,y1,stops){
    const g=cx.createLinearGradient(x0,y0,x1,y1);
    for(const[o,c]of stops)g.addColorStop(o,c);
    return g;
  },
  /* 品质描边：白/绿/蓝/橙由参数决定 */
  border(cx,color){
    cx.strokeStyle=color;cx.lineWidth=3;cx.strokeRect(1.5,1.5,SIZE-3,SIZE-3);
    cx.strokeStyle="rgba(0,0,0,.6)";cx.lineWidth=1;cx.strokeRect(4.5,4.5,SIZE-9,SIZE-9);
  },
};

/* ---------------- 图标配方表 ---------------- */
const RECIPES={
  /* ☄️ 火球：火橙渐变底 + 贝塞尔火舌 + 亮核 */
  fireball(cx){
    P.bg(cx,"#6a1a02","#1a0400");
    P.glow(cx,32,36,24,"rgba(255,120,20,.85)");
    cx.fillStyle=P.lin(cx,20,50,44,14,[[0,"#ff5a00"],[1,"#ffd060"]]);
    cx.beginPath();cx.moveTo(32,8);
    cx.bezierCurveTo(46,22,50,34,44,46);
    cx.bezierCurveTo(40,54,24,54,20,46);
    cx.bezierCurveTo(14,34,18,22,32,8);
    cx.fill();
    cx.fillStyle="#fff0b0";
    cx.beginPath();cx.arc(32,42,8,0,6.283);cx.fill();
  },
  /* ✚ 治疗：绿底 + 十字光晕 */
  heal(cx){
    P.bg(cx,"#0e4a1c","#03140a");
    P.glow(cx,32,32,26,"rgba(140,255,170,.8)");
    cx.fillStyle="#eafff0";
    cx.fillRect(26,13,12,38);cx.fillRect(13,26,38,12);
    cx.fillStyle="rgba(80,220,130,.55)";
    cx.fillRect(28,15,8,34);cx.fillRect(15,28,34,8);
  },
  /* 🗡 剑：斜置银刃 + 金护手 */
  sword(cx){
    P.bg(cx,"#2a3648","#0a0e16");
    cx.save();cx.translate(32,32);cx.rotate(-Math.PI/4);
    const blade=P.lin(cx,-3,0,3,0,[[0,"#8ea0b8"],[.5,"#eef4fa"],[1,"#7688a0"]]);
    P.poly(cx,[[-3,-26],[0,-31],[3,-26],[3,12],[-3,12]],blade);
    cx.fillStyle="#d9a441";cx.fillRect(-8,12,16,4);
    cx.fillStyle="#6a4520";cx.fillRect(-2,16,4,9);
    cx.fillStyle="#d9a441";cx.beginPath();cx.arc(0,27,3,0,6.283);cx.fill();
    cx.restore();
  },
  /* 🔨 巨锤：熔火锤头 + 长柄（熔渊之柄之柄） */
  hammer(cx){
    P.bg(cx,"#4a1602","#140401");
    P.glow(cx,26,20,22,"rgba(255,140,30,.7)");
    cx.save();cx.translate(32,32);cx.rotate(-Math.PI/4);
    cx.fillStyle="#5a3a1a";cx.fillRect(-2.5,-8,5,32);
    cx.fillStyle="#3a2410";cx.fillRect(-3,22,6,5);
    cx.fillStyle=P.lin(cx,0,-24,0,-8,[[0,"#8a4a20"],[.5,"#3a2010"],[1,"#8a4a20"]]);
    cx.fillRect(-13,-24,26,16);
    cx.fillStyle="#ffd060";cx.fillRect(-13,-17,26,3);
    cx.restore();
    P.glow(cx,20,18,10,"rgba(255,220,120,.8)");
  },
  /* 🛡 护甲：胸甲轮廓 + 中缝高光 + 铆钉 */
  armor(cx){
    P.bg(cx,"#26303c","#0c1016");
    cx.fillStyle=P.lin(cx,16,14,48,52,[[0,"#9ab0c8"],[.5,"#5a7088"],[1,"#31404f"]]);
    cx.beginPath();cx.moveTo(14,16);cx.lineTo(24,12);
    cx.quadraticCurveTo(32,18,40,12);cx.lineTo(50,16);cx.lineTo(48,34);
    cx.quadraticCurveTo(46,50,32,54);cx.quadraticCurveTo(18,50,16,34);
    cx.closePath();cx.fill();
    cx.strokeStyle="#1c242e";cx.lineWidth=2;cx.stroke();
    cx.strokeStyle="rgba(220,235,255,.5)";cx.lineWidth=1.5;
    cx.beginPath();cx.moveTo(32,20);cx.lineTo(32,50);cx.stroke();
    cx.fillStyle="#d9a441";
    for(const[x,y]of[[20,20],[44,20]]){cx.beginPath();cx.arc(x,y,2.2,0,6.283);cx.fill();}
  },
  /* 🟫 兽皮：不规则皮张 + 缝线 */
  hide(cx){
    P.bg(cx,"#31200e","#100802");
    P.poly(cx,[[14,20],[24,10],[42,12],[52,24],[48,44],[34,54],[18,48],[12,34]],
      "#a8763e","#5a3a1a",3);
    cx.setLineDash([3,3]);cx.strokeStyle="#e8d8b0";cx.lineWidth=1.5;
    cx.strokeRect(20,20,24,22);cx.setLineDash([]);
  },
  /* 🦷 獠牙：弯月象牙 */
  tusk(cx){
    P.bg(cx,"#241608","#0c0602");
    cx.fillStyle=P.lin(cx,16,50,46,16,[[0,"#c8b890"],[1,"#f6efdc"]]);
    cx.beginPath();cx.moveTo(16,52);
    cx.bezierCurveTo(14,34,26,16,46,12);
    cx.bezierCurveTo(38,22,30,34,26,52);
    cx.closePath();cx.fill();
    cx.strokeStyle="#8a7350";cx.lineWidth=2;cx.stroke();
  },
  /* 🪶 羽毛：羽片 + 羽轴 */
  feather(cx){
    P.bg(cx,"#2a3020","#0e120a");
    cx.save();cx.translate(32,32);cx.rotate(.6);
    cx.fillStyle=P.lin(cx,-10,0,10,0,[[0,"#c8d8b0"],[1,"#eef4da"]]);
    cx.beginPath();cx.moveTo(0,-24);cx.bezierCurveTo(12,-10,10,10,0,22);
    cx.bezierCurveTo(-10,10,-12,-10,0,-24);cx.closePath();cx.fill();
    cx.strokeStyle="#8a9a70";cx.lineWidth=1.5;
    cx.beginPath();cx.moveTo(0,-22);cx.lineTo(0,27);cx.stroke();
    cx.restore();
  },
  /* 🍖 兽肉：肉块 + 骨柄 */
  meat(cx){
    P.bg(cx,"#331008","#120402");
    cx.fillStyle="#b03a28";
    cx.beginPath();cx.ellipse(36,32,17,13,-.5,0,6.283);cx.fill();
    cx.fillStyle="#d86a4a";
    cx.beginPath();cx.ellipse(38,30,11,8,-.5,0,6.283);cx.fill();
    cx.save();cx.translate(18,46);cx.rotate(-.5);
    cx.fillStyle="#efe6d2";cx.fillRect(-2.5,-10,5,14);
    cx.beginPath();cx.arc(-3,5,3.4,0,6.283);cx.arc(3,5,3.4,0,6.283);cx.fill();
    cx.restore();
  },
  /* 🩹 绷带：白卷布 */
  bandage(cx){
    P.bg(cx,"#2a3028","#0c100c");
    cx.fillStyle="#d8e0d0";
    cx.beginPath();cx.ellipse(32,30,16,10,0,0,6.283);cx.fill();
    cx.fillStyle="#f4f6f0";
    cx.fillRect(18,26,28,10);
    cx.strokeStyle="#8a9880";cx.lineWidth=1.5;cx.strokeRect(18,26,28,10);
    cx.fillStyle="#6a8a60";
    cx.fillRect(30,24,4,14);
  },
  /* 🍞 面包：椭圆条 */
  bread(cx){
    P.bg(cx,"#3a2810","#140c04");
    cx.fillStyle=P.lin(cx,16,40,48,20,[[0,"#a86828"],[1,"#e8c070"]]);
    cx.beginPath();cx.ellipse(32,34,20,12,0,0,6.283);cx.fill();
    cx.strokeStyle="#6a4018";cx.lineWidth=2;cx.stroke();
    cx.fillStyle="rgba(255,230,180,.35)";
    cx.beginPath();cx.ellipse(28,30,8,4,-.2,0,6.283);cx.fill();
  },
  /* ⚡ 神圣：金白放射光（STEP 19） */
  holy(cx){
    P.bg(cx,"#5a4a18","#1a1408");
    P.glow(cx,32,32,28,"rgba(255,230,120,.85)");
    cx.strokeStyle="#fff8d0";cx.lineWidth=3;
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      cx.beginPath();cx.moveTo(32+Math.cos(a)*8,32+Math.sin(a)*8);
      cx.lineTo(32+Math.cos(a)*26,32+Math.sin(a)*26);cx.stroke();
    }
    cx.fillStyle="#ffe9a0";
    cx.beginPath();cx.arc(32,32,9,0,6.283);cx.fill();
  },
  /* 🛡 圣盾：金边圆盾（STEP 19） */
  holy_shield(cx){
    P.bg(cx,"#4a3a10","#120e06");
    P.glow(cx,32,32,24,"rgba(255,210,100,.7)");
    cx.fillStyle="#c9a050";
    cx.beginPath();cx.arc(32,34,18,0,6.283);cx.fill();
    cx.fillStyle="#fff0c0";
    cx.beginPath();cx.arc(32,34,12,0,6.283);cx.fill();
    cx.strokeStyle="#8a7020";cx.lineWidth=2;
    cx.beginPath();cx.arc(32,34,18,0,6.283);cx.stroke();
    cx.fillStyle="#d4af37";
    cx.fillRect(29,24,6,20);cx.fillRect(22,31,20,6);
  },
  /* 💚 快速治疗：小十字 + 闪电纹（STEP 19） */
  flash_heal(cx){
    P.bg(cx,"#0e3a2a","#04140e");
    P.glow(cx,32,32,22,"rgba(120,255,180,.75)");
    cx.fillStyle="#e8fff0";
    cx.fillRect(28,16,8,32);cx.fillRect(16,28,32,8);
    cx.strokeStyle="#ffe080";cx.lineWidth=2;
    cx.beginPath();cx.moveTo(40,14);cx.lineTo(48,22);cx.lineTo(42,28);cx.lineTo(50,36);
    cx.stroke();
  },
  /* ⚡ 闪电（V1-C1 萨满） */
  lightning(cx){
    P.bg(cx,"#102838","#061018");
    P.glow(cx,32,28,24,"rgba(100,220,255,.8)");
    cx.strokeStyle="#e8ffff";cx.lineWidth=3;cx.lineJoin="round";
    cx.beginPath();
    cx.moveTo(28,10);cx.lineTo(38,26);cx.lineTo(30,26);cx.lineTo(40,50);cx.lineTo(22,30);cx.lineTo(32,30);
    cx.closePath();cx.stroke();
    cx.fillStyle="#9aeeff";
    cx.beginPath();
    cx.moveTo(28,10);cx.lineTo(38,26);cx.lineTo(30,26);cx.lineTo(40,50);cx.lineTo(22,30);cx.lineTo(32,30);
    cx.closePath();cx.fill();
  },
  /* 🪨 大地震击 */
  earth_shock(cx){
    P.bg(cx,"#2a2010","#100c06");
    P.glow(cx,32,36,20,"rgba(200,150,60,.55)");
    cx.fillStyle="#8a6a40";
    cx.beginPath();cx.moveTo(14,44);cx.lineTo(24,22);cx.lineTo(40,18);cx.lineTo(52,44);cx.closePath();cx.fill();
    cx.fillStyle="#c9a060";
    cx.beginPath();cx.moveTo(26,34);cx.lineTo(34,22);cx.lineTo(42,36);cx.closePath();cx.fill();
    cx.strokeStyle="#ffe080";cx.lineWidth=2;
    cx.beginPath();cx.moveTo(18,48);cx.lineTo(32,40);cx.lineTo(46,48);cx.stroke();
  },
  /* 🗿 治疗图腾 */
  totem(cx){
    P.bg(cx,"#1a3028","#081410");
    P.glow(cx,32,30,20,"rgba(80,220,160,.6)");
    cx.fillStyle="#6a4528";
    cx.fillRect(26,18,12,34);
    cx.fillStyle="#3aaa78";
    cx.beginPath();cx.moveTo(22,18);cx.lineTo(32,6);cx.lineTo(42,18);cx.closePath();cx.fill();
    cx.strokeStyle="#7aeeaa";cx.lineWidth=2;
    cx.beginPath();cx.arc(32,42,14,0,Math.PI,true);cx.stroke();
  },
  /* 🗡 影袭（V1-C2） */
  sinister_strike(cx){
    P.bg(cx,"#1a1e28","#080a10");
    P.glow(cx,34,30,20,"rgba(160,180,220,.55)");
    cx.fillStyle="#c8d0e0";
    cx.beginPath();cx.moveTo(22,48);cx.lineTo(28,18);cx.lineTo(34,18);cx.lineTo(40,48);cx.closePath();cx.fill();
    cx.fillStyle="#8a90a0";cx.fillRect(24,40,16,6);
    cx.strokeStyle="#e8f0ff";cx.lineWidth=2;
    cx.beginPath();cx.moveTo(40,16);cx.lineTo(50,24);cx.stroke();
  },
  /* 背刺 */
  backstab(cx){
    P.bg(cx,"#201018","#0c0608");
    P.glow(cx,32,32,22,"rgba(200,80,100,.5)");
    cx.fillStyle="#d0d8e8";
    cx.beginPath();cx.moveTo(18,42);cx.lineTo(32,12);cx.lineTo(36,14);cx.lineTo(28,46);cx.closePath();cx.fill();
    cx.fillStyle="#a03040";
    cx.beginPath();cx.arc(44,28,8,0,6.283);cx.fill();
    cx.fillStyle="#fff0f0";cx.font="bold 14px sans-serif";cx.fillText("!",42,33);
  },
  /* 潜行 */
  stealth(cx){
    P.bg(cx,"#101418","#040608");
    P.glow(cx,32,32,22,"rgba(80,100,140,.55)");
    cx.fillStyle="rgba(160,180,220,.35)";
    cx.beginPath();cx.ellipse(32,34,18,12,0,0,6.283);cx.fill();
    cx.strokeStyle="#a0b8d8";cx.lineWidth=2;
    cx.beginPath();cx.arc(32,28,10,0,Math.PI*2);cx.stroke();
    cx.fillStyle="#c8d8f0";
    cx.beginPath();cx.arc(28,26,2.5,0,6.283);cx.fill();
    cx.beginPath();cx.arc(36,26,2.5,0,6.283);cx.fill();
  },
  /* 虚弱 debuff（V1-C3） */
  weakness(cx){
    P.bg(cx,"#2a1828","#100810");
    P.glow(cx,32,32,20,"rgba(160,80,160,.45)");
    cx.strokeStyle="#c080c0";cx.lineWidth=3;
    cx.beginPath();cx.moveTo(18,22);cx.lineTo(46,42);cx.stroke();
    cx.beginPath();cx.moveTo(46,22);cx.lineTo(18,42);cx.stroke();
    cx.fillStyle="#e0a0e0";
    cx.beginPath();cx.arc(32,32,8,0,6.283);cx.fill();
    cx.fillStyle="#401848";
    cx.fillRect(28,28,8,8);
  },
  /* 恐惧 debuff（V1-C3） */
  fear(cx){
    P.bg(cx,"#281018","#100608");
    P.glow(cx,32,28,22,"rgba(220,60,80,.55)");
    cx.strokeStyle="#ff8090";cx.lineWidth=2;
    for(let i=0;i<3;i++){
      cx.beginPath();cx.arc(32,34,8+i*5,Math.PI*1.15,Math.PI*1.85);cx.stroke();
    }
    cx.fillStyle="#ffd0d8";
    cx.beginPath();cx.arc(26,26,3,0,6.283);cx.fill();
    cx.beginPath();cx.arc(38,26,3,0,6.283);cx.fill();
    cx.fillStyle="#a02030";
    cx.beginPath();cx.moveTo(24,40);cx.quadraticCurveTo(32,48,40,40);cx.fill();
  },
  /* 疾步 */
  sprint(cx){
    P.bg(cx,"#182028","#081018");
    P.glow(cx,32,32,20,"rgba(120,200,255,.55)");
    cx.strokeStyle="#b0e0ff";cx.lineWidth=3;
    cx.beginPath();cx.moveTo(14,40);cx.lineTo(26,20);cx.lineTo(34,34);cx.lineTo(48,14);cx.stroke();
    cx.strokeStyle="#6080a0";cx.lineWidth=2;
    cx.beginPath();cx.moveTo(12,48);cx.lineTo(22,32);cx.stroke();
    cx.beginPath();cx.moveTo(30,48);cx.lineTo(40,28);cx.stroke();
  },
  /* 🛡 嘲讽（V1-C5） */
  taunt(cx){
    P.bg(cx,"#3a2810","#140c06");
    P.glow(cx,32,32,22,"rgba(255,180,60,.65)");
    cx.fillStyle="#c9a050";
    cx.beginPath();cx.arc(32,34,16,0,6.283);cx.fill();
    cx.fillStyle="#ffe9a0";
    cx.beginPath();cx.arc(32,34,10,0,6.283);cx.fill();
    cx.strokeStyle="#8a6020";cx.lineWidth=2;
    cx.beginPath();cx.arc(32,34,16,0,6.283);cx.stroke();
    cx.fillStyle="#7a3010";
    cx.font="bold 18px sans-serif";cx.textAlign="center";cx.textBaseline="middle";
    cx.fillText("!",32,35);
  },
  /* 🌿 草药（STEP 23） */
  herb(cx){
    P.bg(cx,"#1a3a18","#081208");
    P.glow(cx,32,36,18,"rgba(100,220,80,.55)");
    cx.fillStyle="#5a9a40";
    cx.beginPath();cx.moveTo(32,14);cx.quadraticCurveTo(48,28,36,48);cx.quadraticCurveTo(32,36,28,48);cx.quadraticCurveTo(16,28,32,14);cx.fill();
    cx.fillStyle="#8ad060";
    cx.beginPath();cx.ellipse(24,30,7,4,-.4,0,6.283);cx.fill();
    cx.beginPath();cx.ellipse(40,28,7,4,.4,0,6.283);cx.fill();
  },
  /* ⛏ 矿石（STEP 23） */
  ore(cx){
    P.bg(cx,"#2a2420","#100c08");
    P.glow(cx,32,34,16,"rgba(180,160,100,.4)");
    cx.fillStyle="#8a7860";
    cx.beginPath();cx.moveTo(18,42);cx.lineTo(28,18);cx.lineTo(44,22);cx.lineTo(50,42);cx.closePath();cx.fill();
    cx.fillStyle="#c9b070";
    cx.beginPath();cx.moveTo(26,30);cx.lineTo(34,20);cx.lineTo(40,32);cx.closePath();cx.fill();
  },
  /* 🧪 药水（STEP 23） */
  potion(cx){
    P.bg(cx,"#1a2840","#080e18");
    P.glow(cx,32,34,18,"rgba(80,180,255,.55)");
    cx.fillStyle="#6a90c0";
    cx.fillRect(26,14,12,10);
    cx.fillStyle="#3a8acc";
    cx.beginPath();cx.moveTo(20,24);cx.lineTo(44,24);cx.lineTo(40,50);cx.lineTo(24,50);cx.closePath();cx.fill();
    cx.fillStyle="rgba(180,230,255,.45)";
    cx.fillRect(28,30,6,12);
  },
  /* 🪨 磨刀石（STEP 23） */
  whetstone(cx){
    P.bg(cx,"#2a2218","#100c08");
    cx.fillStyle="#9a8870";
    cx.beginPath();cx.ellipse(32,34,18,12,0,0,6.283);cx.fill();
    cx.strokeStyle="#6a5840";cx.lineWidth=2;cx.stroke();
    cx.strokeStyle="#d8c8a0";cx.lineWidth=2;
    cx.beginPath();cx.moveTo(18,34);cx.lineTo(46,30);cx.stroke();
  },
  /* —— V1-A2 技能 / UI 图标 —— */
  whirlwind(cx){
    P.bg(cx,"#1a3048","#081018");
    P.glow(cx,32,32,22,"rgba(140,200,255,.55)");
    cx.strokeStyle="#c8e8ff";cx.lineWidth=3;
    for(let i=0;i<3;i++){
      cx.beginPath();cx.arc(32,32,10+i*6,i*.4,i*.4+4.2);cx.stroke();
    }
    cx.fillStyle="#9ad0ff";
    cx.beginPath();cx.arc(32,32,5,0,6.283);cx.fill();
  },
  charge(cx){
    P.bg(cx,"#3a2810","#140c04");
    P.glow(cx,40,28,16,"rgba(255,220,120,.5)");
    cx.fillStyle="#ffe9a0";
    cx.beginPath();cx.moveTo(12,36);cx.lineTo(44,18);cx.lineTo(40,28);cx.lineTo(52,32);cx.lineTo(36,40);cx.lineTo(42,34);cx.closePath();cx.fill();
  },
  frost(cx){
    P.bg(cx,"#143050","#060e18");
    P.glow(cx,32,32,22,"rgba(120,200,255,.7)");
    cx.strokeStyle="#d0f0ff";cx.lineWidth=2.5;
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      cx.beginPath();cx.moveTo(32,32);cx.lineTo(32+Math.cos(a)*22,32+Math.sin(a)*22);cx.stroke();
    }
    cx.fillStyle="#e8f8ff";
    cx.beginPath();cx.arc(32,32,6,0,6.283);cx.fill();
  },
  blink(cx){
    P.bg(cx,"#2a1840","#0c0618");
    P.glow(cx,32,32,20,"rgba(200,160,255,.65)");
    cx.fillStyle="#e8d0ff";
    for(const[x,y,r]of[[22,28,5],[32,22,7],[42,30,5],[34,38,4]]){
      cx.beginPath();cx.arc(x,y,r,0,6.283);cx.fill();
    }
  },
  ice_block(cx){
    P.bg(cx,"#183848","#081018");
    P.glow(cx,32,32,18,"rgba(160,220,255,.45)");
    cx.fillStyle="rgba(180,230,255,.55)";
    cx.fillRect(16,14,32,38);
    cx.strokeStyle="#a8d8f0";cx.lineWidth=2;cx.strokeRect(16,14,32,38);
    cx.strokeStyle="rgba(255,255,255,.5)";cx.lineWidth=1.5;
    cx.beginPath();cx.moveTo(16,28);cx.lineTo(48,22);cx.moveTo(20,42);cx.lineTo(46,36);cx.stroke();
  },
  aimed(cx){
    P.bg(cx,"#203018","#0a1008");
    P.glow(cx,32,32,18,"rgba(180,255,120,.4)");
    cx.strokeStyle="#d0ffa0";cx.lineWidth=2.5;
    cx.beginPath();cx.arc(32,32,16,0,6.283);cx.stroke();
    cx.beginPath();cx.arc(32,32,8,0,6.283);cx.stroke();
    cx.beginPath();cx.moveTo(32,8);cx.lineTo(32,56);cx.moveTo(8,32);cx.lineTo(56,32);cx.stroke();
  },
  multi_shot(cx){
    P.bg(cx,"#283018","#0c1008");
    cx.strokeStyle="#c8e890";cx.lineWidth=2.5;
    for(const a of[-.35,0,.35]){
      cx.save();cx.translate(32,32);cx.rotate(a);
      cx.beginPath();cx.moveTo(-4,18);cx.lineTo(0,-20);cx.lineTo(4,18);cx.stroke();
      cx.restore();
    }
  },
  roll(cx){
    P.bg(cx,"#303020","#101008");
    P.glow(cx,36,34,14,"rgba(255,220,100,.35)");
    cx.strokeStyle="#e8d080";cx.lineWidth=3;
    cx.beginPath();cx.arc(32,34,14,-.2,4.5);cx.stroke();
    cx.fillStyle="#ffe9a0";
    cx.beginPath();cx.moveTo(42,22);cx.lineTo(52,28);cx.lineTo(44,32);cx.closePath();cx.fill();
  },
  map(cx){
    P.bg(cx,"#1a2818","#0a1008");
    cx.fillStyle="#6a8a50";cx.fillRect(12,14,40,36);
    cx.strokeStyle="#c8e8a0";cx.lineWidth=2;cx.strokeRect(12,14,40,36);
    cx.strokeStyle="#a8c878";cx.lineWidth=1.5;
    cx.beginPath();cx.moveTo(18,40);cx.lineTo(28,28);cx.lineTo(36,34);cx.lineTo(46,22);cx.stroke();
    cx.fillStyle="#ff9060";cx.beginPath();cx.arc(40,24,3,0,6.283);cx.fill();
  },
  dungeon(cx){
    P.bg(cx,"#281810","#0c0804");
    P.glow(cx,32,28,16,"rgba(255,120,40,.45)");
    cx.fillStyle="#5a4030";
    cx.fillRect(14,22,36,28);
    cx.fillStyle="#1a1008";cx.fillRect(26,34,12,16);
    cx.fillStyle="#ff8a40";cx.fillRect(18,18,28,8);
  },
  scroll(cx){
    P.bg(cx,"#2a2418","#100c08");
    cx.fillStyle="#e8d8b0";cx.fillRect(16,12,32,42);
    cx.strokeStyle="#8a7850";cx.lineWidth=2;cx.strokeRect(16,12,32,42);
    cx.strokeStyle="#6a5840";cx.lineWidth=1.5;
    for(const y of[22,30,38,46]){cx.beginPath();cx.moveTo(22,y);cx.lineTo(42,y);cx.stroke();}
  },
  star(cx){
    P.bg(cx,"#3a3010","#140e04");
    P.glow(cx,32,32,20,"rgba(255,220,100,.55)");
    const pts=[];
    for(let i=0;i<5;i++){
      const a=-Math.PI/2+i*4*Math.PI/5;
      pts.push([32+Math.cos(a)*18,32+Math.sin(a)*18]);
    }
    P.poly(cx,pts,"#ffe080","#c9a040",2);
  },
  title(cx){
    P.bg(cx,"#2a2010","#100a04");
    P.glow(cx,32,28,16,"rgba(255,200,80,.4)");
    cx.fillStyle="#d9a441";
    cx.beginPath();cx.moveTo(32,10);cx.lineTo(40,26);cx.lineTo(54,28);cx.lineTo(44,38);cx.lineTo(48,52);cx.lineTo(32,44);cx.lineTo(16,52);cx.lineTo(20,38);cx.lineTo(10,28);cx.lineTo(24,26);cx.closePath();cx.fill();
  },
  venom(cx){
    P.bg(cx,"#143018","#061008");
    P.glow(cx,32,34,18,"rgba(80,220,100,.5)");
    cx.fillStyle="#44aa44";
    cx.beginPath();cx.moveTo(32,12);cx.quadraticCurveTo(48,28,36,52);cx.quadraticCurveTo(32,40,28,52);cx.quadraticCurveTo(16,28,32,12);cx.fill();
    cx.fillStyle="#a0ff80";cx.beginPath();cx.arc(32,30,5,0,6.283);cx.fill();
  },
  shadow_bolt(cx){
    P.bg(cx,"#201028","#0c0610");
    P.glow(cx,32,30,20,"rgba(160,60,220,.55)");
    cx.fillStyle="#a050ff";
    cx.beginPath();cx.moveTo(18,40);cx.lineTo(32,12);cx.lineTo(46,40);cx.closePath();cx.fill();
    cx.fillStyle="#e0b0ff";
    cx.beginPath();cx.arc(32,28,5,0,6.283);cx.fill();
  },
  corruption(cx){
    P.bg(cx,"#221018","#0c0608");
    P.glow(cx,32,32,18,"rgba(180,40,120,.5)");
    cx.fillStyle="#c040a0";
    for(let i=0;i<5;i++){
      const a=i/5*6.283;
      cx.beginPath();cx.ellipse(32+Math.cos(a)*10,32+Math.sin(a)*10,4,7,a,0,6.283);cx.fill();
    }
    cx.fillStyle="#401028";
    cx.beginPath();cx.arc(32,32,6,0,6.283);cx.fill();
  },
  drain_life(cx){
    P.bg(cx,"#281018","#100808");
    P.glow(cx,32,28,18,"rgba(200,60,80,.45)");
    cx.strokeStyle="#ff6080";cx.lineWidth=3;
    cx.beginPath();cx.moveTo(16,44);cx.lineTo(32,18);cx.lineTo(48,44);cx.stroke();
    cx.fillStyle="#60e090";
    cx.beginPath();cx.arc(32,22,6,0,6.283);cx.fill();
  },
  life_tap(cx){
    P.bg(cx,"#201820","#0c080c");
    P.glow(cx,32,30,16,"rgba(140,80,200,.45)");
    cx.fillStyle="#c070ff";
    cx.beginPath();cx.moveTo(32,12);cx.lineTo(44,36);cx.lineTo(20,36);cx.closePath();cx.fill();
    cx.fillStyle="#60a0ff";
    cx.fillRect(28,38,8,12);
  },
  /* STEP 20：单位框架肖像（程序化，零外部图） */
  portrait_warrior(cx){
    P.bg(cx,"#3a2818","#140a06");
    P.glow(cx,32,28,18,"rgba(255,160,60,.35)");
    cx.fillStyle="#c89050";
    cx.beginPath();cx.arc(32,22,11,0,6.283);cx.fill();
    cx.fillStyle="#6a4a28";
    cx.fillRect(18,32,28,22);
    cx.fillStyle="#d9a441";
    cx.fillRect(22,14,20,6);
  },
  portrait_mage(cx){
    P.bg(cx,"#182438","#080c18");
    P.glow(cx,32,28,18,"rgba(100,180,255,.4)");
    cx.fillStyle="#e8d0b0";
    cx.beginPath();cx.arc(32,24,10,0,6.283);cx.fill();
    cx.fillStyle="#3a58a0";
    cx.beginPath();cx.moveTo(16,34);cx.lineTo(48,34);cx.lineTo(40,54);cx.lineTo(24,54);cx.closePath();cx.fill();
    cx.fillStyle="#88ccff";cx.beginPath();cx.arc(32,18,4,0,6.283);cx.fill();
  },
  portrait_archer(cx){
    P.bg(cx,"#1a2818","#081008");
    P.glow(cx,32,28,16,"rgba(120,200,80,.35)");
    cx.fillStyle="#d0b080";
    cx.beginPath();cx.arc(32,22,10,0,6.283);cx.fill();
    cx.fillStyle="#3a6030";cx.fillRect(20,32,24,20);
    cx.strokeStyle="#c8a060";cx.lineWidth=2;
    cx.beginPath();cx.arc(46,34,12,Math.PI*.6,Math.PI*1.5);cx.stroke();
  },
  portrait_priest(cx){
    P.bg(cx,"#282018","#100c08");
    P.glow(cx,32,26,16,"rgba(255,220,120,.4)");
    cx.fillStyle="#f0e0c8";
    cx.beginPath();cx.arc(32,22,10,0,6.283);cx.fill();
    cx.fillStyle="#e8e0d0";cx.fillRect(18,32,28,20);
    cx.fillStyle="#ffd76a";
    cx.beginPath();cx.moveTo(32,8);cx.lineTo(36,18);cx.lineTo(26,18);cx.closePath();cx.fill();
  },
  portrait_shaman(cx){
    P.bg(cx,"#182828","#081018");
    P.glow(cx,32,28,16,"rgba(80,200,220,.4)");
    cx.fillStyle="#c8a888";
    cx.beginPath();cx.arc(32,22,10,0,6.283);cx.fill();
    cx.fillStyle="#2a6870";cx.fillRect(18,32,28,20);
    cx.strokeStyle="#60d8e8";cx.lineWidth=2;
    cx.beginPath();cx.moveTo(22,40);cx.lineTo(32,28);cx.lineTo(42,40);cx.stroke();
  },
  portrait_rogue(cx){
    P.bg(cx,"#1a1820","#08060c");
    P.glow(cx,32,28,14,"rgba(180,80,200,.35)");
    cx.fillStyle="#b09070";
    cx.beginPath();cx.arc(32,24,9,0,6.283);cx.fill();
    cx.fillStyle="#2a2030";cx.fillRect(18,32,28,20);
    cx.fillStyle="#1a1020";cx.fillRect(18,20,28,8);
  },
  portrait_warlock(cx){
    P.bg(cx,"#241028","#0c0610");
    P.glow(cx,32,28,16,"rgba(160,60,220,.45)");
    cx.fillStyle="#c8a080";
    cx.beginPath();cx.arc(32,24,10,0,6.283);cx.fill();
    cx.fillStyle="#3a1848";cx.fillRect(18,32,28,20);
    cx.fillStyle="#9060c0";
    cx.beginPath();cx.moveTo(22,18);cx.lineTo(26,8);cx.lineTo(28,18);cx.closePath();cx.fill();
    cx.beginPath();cx.moveTo(42,18);cx.lineTo(38,8);cx.lineTo(36,18);cx.closePath();cx.fill();
  },
  portrait_enemy(cx){
    P.bg(cx,"#2a1810","#100806");
    P.glow(cx,32,30,16,"rgba(220,80,40,.4)");
    cx.fillStyle="#e07040";
    cx.beginPath();cx.ellipse(32,40,14,16,0,0,6.283);cx.fill();
    cx.beginPath();cx.arc(32,20,10,0,6.283);cx.fill();
  },
  portrait_boss(cx){
    P.bg(cx,"#3a1008","#140404");
    P.glow(cx,32,28,20,"rgba(255,80,20,.55)");
    cx.fillStyle="#ff6030";
    cx.beginPath();cx.arc(32,22,12,0,6.283);cx.fill();
    cx.fillStyle="#6a2010";cx.fillRect(14,34,36,22);
    cx.fillStyle="#ffd76a";cx.fillRect(20,12,24,5);
  },
  portrait_rare(cx){
    P.bg(cx,"#282030","#100818");
    P.glow(cx,32,28,16,"rgba(180,160,255,.45)");
    cx.fillStyle="#e8e0ff";
    cx.beginPath();cx.arc(32,22,10,0,6.283);cx.fill();
    cx.fillStyle="#4a3860";cx.fillRect(18,32,28,20);
  },
  portrait_companion(cx){
    P.bg(cx,"#182028","#080c14");
    P.glow(cx,32,28,14,"rgba(100,160,255,.4)");
    cx.fillStyle="#c8b090";
    cx.beginPath();cx.arc(32,22,9,0,6.283);cx.fill();
    cx.fillStyle="#3a5878";cx.fillRect(20,32,24,18);
  },
};

/* ---------------- 工厂出口 ---------------- */
function draw(name,borderColor){
  const cv=document.createElement("canvas");cv.width=cv.height=SIZE;
  const cx=cv.getContext("2d");
  (RECIPES[name]||RECIPES.sword)(cx);
  P.border(cx,borderColor||"#e8e8e8");
  return cv;
}
return{
  canvas(name,borderColor){
    const k=name+"|"+borderColor;
    return cache[k]||(cache[k]=draw(name,borderColor));
  },
  get(name,borderColor){
    const cv=this.canvas(name,borderColor);
    return cv.__url||(cv.__url=cv.toDataURL());
  },
  list(){return Object.keys(RECIPES);},
};
})();
