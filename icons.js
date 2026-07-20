/* ============================================================
   熔火之心 · icons.js
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
  /* 🔨 巨锤：熔火锤头 + 长柄（萨弗拉斯之柄） */
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
