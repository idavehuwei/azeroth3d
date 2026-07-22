#!/usr/bin/env node
/* plan-V3 C0：把暴雪专有名词字面量替换为 T("…") / 注释内原创名 */
"use strict";
const fs=require("fs");
const path=require("path");

const ROOT=path.join(__dirname,"..");
const SKIP=new Set(["js/sim/strings.js","tools/c0_codemod.js","test_step01.js"]);

/* 长词优先，避免截断 */
const EXACT=[
  ["奥妮克希亚巢穴","zone.onyxia"],
  ["哀嚎洞穴","zone.wailing"],
  ["怒焰裂谷","zone.ragefire"],
  ["熔火之心","zone.molten_core"],
  ["贫瘠之地","zone.barrens"],
  ["莫高雷","zone.mulgore"],
  ["萨弗拉斯之柄","item.sulfuras_haft"],
  ["奥妮克希亚之牙","item.onyxia_fang"],
  ["烈焰之子","mob.flame_spawn"],
  ["拉戈斯 · 炎魔领主","boss.ragnaros"],
  ["拉戈斯·炎魔领主","boss.ragnaros"],
  ["炎魔领主拉戈斯","boss.ragnaros_full"],
  ["炎魔领主","boss.ragnaros_title"],
  ["拉戈斯","boss.ragnaros_short"],
  ["玛格曼达","boss.magmadar"],
  ["奥妮克希亚","boss.onyxia"],
  ["考布莱恩","boss.cobrahn_short"],
  ["牛头人","race.tauren"],
  ["纳拉其营地","poi.camp_narache"],
  ["血蹄村","poi.bloodhoof"],
  ["雷霆崖","poi.thunder_bluff"],
  ["十字路口","poi.crossroads"],
  ["乱风岗","poi.freewind"],
  ["贝恩 · 血蹄","npc.baine"],
  ["贝恩·血蹄","npc.baine"],
  ["血蹄长者","npc.bloodhoof_elder"],
  ["大酋长 · 凯恩","npc.cairne"],
  ["大酋长·凯恩","npc.cairne"],
  ["凯恩 · 血蹄","npc.cairne"],
  ["凯恩·血蹄","npc.cairne"],
  ["刺背野猪人","mob.bristleback"],
  ["刺脊野猪人","mob.razorback"],
  ["野猪人长老","mob.quilboarElder"],
  ["野猪人斥候","mob.quilboar"],
  ["野猪人","mob.quilboar"],
  ["萨弗拉斯","item.sulfuras_haft"],
];

/* 注释/文件头：旧品牌 → 新品牌（不走 T） */
const COMMENT_REPL=[
  [/熔火之心/g,"炽心"],
  [/莫高雷/g,"赤蹄草甸"],
  [/贫瘠之地/g,"枯原荒地"],
  [/哀嚎洞穴/g,"泣息洞窟"],
  [/怒焰裂谷/g,"焰怒深渊"],
  [/奥妮克希亚巢穴/g,"黑曜巢穴"],
  [/奥妮克希亚/g,"黑曜女皇"],
  [/拉戈斯/g,"卡尔戈"],
  [/烈焰之子/g,"火裔"],
  [/萨弗拉斯/g,"熔渊之柄"],
  [/玛格曼达/g,"炎喉"],
  [/考布莱恩/g,"考布"],
  [/牛头人/g,"蹄人"],
  [/血蹄村/g,"赤蹄村"],
  [/纳拉其/g,"岩蹄"],
  [/雷霆崖/g,"雷岩台"],
  [/十字路口/g,"岔路镇"],
  [/乱风岗/g,"风啸岗"],
  [/炎魔/g,"熔渊"],
  [/野猪人/g,"野豕"],
];

function transformCodeString(inner){
  /* 空串 / 无专名：原样保留（避免 "" 被吃成空表达式） */
  if(!inner)return {whole:false, unchanged:true, text:inner};
  /* 若整段恰好等于某个专名 → 整段变 T()，由调用方处理引号 */
  for(const [zh,key] of EXACT){
    if(inner===zh)return {whole:true, expr:`T(${JSON.stringify(key)})`};
  }
  /* 内嵌：拆成拼接 */
  let left=inner;
  const parts=[];
  while(left.length){
    let hit=null, hitAt=-1;
    for(const [zh,key] of EXACT){
      const i=left.indexOf(zh);
      if(i>=0&&(hitAt<0||i<hitAt||(i===hitAt&&zh.length>hit.zh.length))){
        hit={zh,key}; hitAt=i;
      }
    }
    if(!hit){parts.push(JSON.stringify(left));break;}
    if(hitAt>0)parts.push(JSON.stringify(left.slice(0,hitAt)));
    parts.push(`T(${JSON.stringify(hit.key)})`);
    left=left.slice(hitAt+hit.zh.length);
  }
  if(parts.length===1&&parts[0].startsWith("T("))return {whole:true, expr:parts[0]};
  if(parts.length===1)return {whole:false, unchanged:true, text:inner};
  return {whole:true, expr:parts.join("+")};
}

function transformJs(src, fileRel){
  let out="";
  let i=0;
  const n=src.length;
  while(i<n){
    /* 行注释 */
    if(src[i]==="/"&&src[i+1]==="/"){
      let j=i+2;
      while(j<n&&src[j]!=="\n")j++;
      let c=src.slice(i,j);
      for(const [re,to] of COMMENT_REPL)c=c.replace(re,to);
      out+=c; i=j; continue;
    }
    /* 块注释 */
    if(src[i]==="/"&&src[i+1]==="*"){
      let j=i+2;
      while(j<n-1&&!(src[j]==="*"&&src[j+1]==="/"))j++;
      j=Math.min(j+2,n);
      let c=src.slice(i,j);
      for(const [re,to] of COMMENT_REPL)c=c.replace(re,to);
      out+=c; i=j; continue;
    }
    /* 字符串 "..." 或 '...'（非模板） */
    if(src[i]==='"'||src[i]==="'"){
      const q=src[i];
      let j=i+1, raw="";
      while(j<n){
        if(src[j]==="\\"){raw+=src[j]+src[j+1];j+=2;continue;}
        if(src[j]===q)break;
        raw+=src[j]; j++;
      }
      /* 解码常见转义以便匹配中文 */
      const inner=raw.replace(/\\n/g,"\n").replace(/\\"/g,'"').replace(/\\'/g,"'").replace(/\\\\/g,"\\");
      const tr=transformCodeString(inner);
      if(tr.unchanged){out+=src.slice(i,j+1); i=j+1; continue;}
      out+=tr.expr; i=j+1; continue;
    }
    /* 模板字符串 `...`：仅替换 ${} 外的中文专名 → ${T(...)} */
    if(src[i]==="`"){
      let j=i+1, buf="`";
      while(j<n){
        if(src[j]==="\\"){buf+=src[j]+src[j+1];j+=2;continue;}
        if(src[j]==="`" ){buf+="`";j++;break;}
        if(src[j]==="$"&&src[j+1]==="{"){
          buf+="${"; j+=2; let depth=1;
          while(j<n&&depth){
            if(src[j]==="{")depth++;
            else if(src[j]==="}")depth--;
            if(depth)buf+=src[j];
            else buf+="}";
            j++;
          }
          continue;
        }
        /* 尝试匹配专名 */
        let matched=false;
        for(const [zh,key] of EXACT){
          if(src.startsWith(zh,j)){
            buf+="${T("+JSON.stringify(key)+")}";
            j+=zh.length; matched=true; break;
          }
        }
        if(!matched){buf+=src[j]; j++;}
      }
      out+=buf; i=j; continue;
    }
    out+=src[i]; i++;
  }
  return out;
}

function walk(dir, acc){
  for(const name of fs.readdirSync(dir)){
    if(name==="node_modules"||name===".git"||name==="agent-transcripts")continue;
    const p=path.join(dir,name);
    const st=fs.statSync(p);
    if(st.isDirectory())walk(p,acc);
    else if(name.endsWith(".js"))acc.push(p);
  }
}

const files=[];
walk(ROOT,files);
let changed=0;
for(const abs of files){
  const rel=path.relative(ROOT,abs).replace(/\\/g,"/");
  if(SKIP.has(rel))continue;
  if(rel.startsWith("tools/"))continue;
  const before=fs.readFileSync(abs,"utf8");
  const after=transformJs(before,rel);
  if(after!==before){
    fs.writeFileSync(abs,after);
    changed++;
    console.log("updated",rel);
  }
}
console.log("done, files changed:",changed);
