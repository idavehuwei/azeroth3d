/* ============================================================
   熔火之心 · textures.js
   程序化贴图库 Tex（plan-V2 · R1）：Canvas 2D 配方 + 缓存，零图片文件
   ------------------------------------------------------------
   [依赖] THREE · core.js（SeededRng · WORLD_SEED · hashZoneId）
          palette.js（PALETTE · MAT）
   [导出] Tex
          Tex.get(key)   → THREE.CanvasTexture（albedo，缓存）
          Tex.rough(key) → roughnessMap（灰度反相，仅 rock/bark/plate）
          Tex.normal(key)→ normalMap（Sobel，仅 rock/bark）
          Tex.keys()     → 配方名列表
          Tex.size()     → 已缓存的 THREE.Texture 数量
          Tex.bind(mat, matKey) → 按 MAT 键挂 map/rough/normal
   ============================================================ */
"use strict";

const Tex=(function(){
  const MOBILE=typeof navigator!=="undefined"&&/Mobi|Android/i.test(navigator.userAgent||"");
  const SIZE=MOBILE?128:256;

  const cache={map:new Map(), rough:new Map(), normal:new Map()};
  let texCount=0;

  function hexRgb(hex){
    const h=hex>>>0;
    return[(h>>16)&255,(h>>8)&255,h&255];
  }
  function css(hex,a){
    const[r,g,b]=hexRgb(hex);
    return a!=null?`rgba(${r},${g},${b},${a})`:`rgb(${r},${g},${b})`;
  }
  function lerp(a,b,t){return a+(b-a)*t;}
  function mixHex(a,b,t){
    const A=hexRgb(a),B=hexRgb(b);
    return(Math.round(lerp(A[0],B[0],t))<<16)|(Math.round(lerp(A[1],B[1],t))<<8)|Math.round(lerp(A[2],B[2],t));
  }
  function rngFor(key){
    const seed=(WORLD_SEED^hashZoneId("tex:"+key))>>>0;
    return SeededRng(seed);
  }

  /* ---------------- 底层画笔（不导出） ---------------- */
  function valueNoise(cx,size,scale,octaves,rng){
    const cells=Math.max(2,Math.round(size/scale));
    const grid=[];
    for(let i=0;i<=cells;i++){
      grid[i]=[];
      for(let j=0;j<=cells;j++)grid[i][j]=rng();
    }
    function sample(u,v){
      u-=Math.floor(u); v-=Math.floor(v);
      if(u>0.999999)u=0; if(v>0.999999)v=0;
      const x=u*cells,y=v*cells;
      const x0=Math.floor(x),y0=Math.floor(y);
      const x1=Math.min(cells,x0+1),y1=Math.min(cells,y0+1);
      const fx=x-x0,fy=y-y0;
      const sfx=fx*fx*(3-2*fx),sfy=fy*fy*(3-2*fy);
      const a=grid[x0][y0],b=grid[x1][y0],c=grid[x0][y1],d=grid[x1][y1];
      return lerp(lerp(a,b,sfx),lerp(c,d,sfx),sfy);
    }
    const img=cx.createImageData(size,size);
    const data=img.data;
    for(let y=0;y<size;y++){
      for(let x=0;x<size;x++){
        let amp=1,sum=0,norm=0,freq=1;
        for(let o=0;o<octaves;o++){
          sum+=sample((x/size)*freq,(y/size)*freq)*amp;
          norm+=amp; amp*=.5; freq*=2;
        }
        const v=Math.floor((sum/norm)*255);
        const i=(y*size+x)*4;
        data[i]=data[i+1]=data[i+2]=v; data[i+3]=255;
      }
    }
    cx.putImageData(img,0,0);
  }

  function streaks(cx,dir,count,color,alpha,rng,size){
    cx.save();
    cx.strokeStyle=css(color,alpha);
    cx.lineWidth=1+rng()*1.5;
    cx.lineCap="round";
    const dx=dir[0],dy=dir[1];
    for(let i=0;i<count;i++){
      const x=rng()*size,y=rng()*size;
      const len=(.08+rng()*.35)*size;
      cx.globalAlpha=.35+rng()*.55;
      cx.beginPath();
      cx.moveTo(x,y);
      cx.lineTo(x+dx*len,y+dy*len);
      cx.stroke();
    }
    cx.restore();
  }

  function speckle(cx,count,sizeRange,colors,rng,size){
    cx.save();
    for(let i=0;i<count;i++){
      const col=colors[(rng()*colors.length)|0];
      const r=sizeRange[0]+rng()*(sizeRange[1]-sizeRange[0]);
      cx.fillStyle=css(col,.25+rng()*.55);
      cx.beginPath();
      cx.arc(rng()*size,rng()*size,r,0,Math.PI*2);
      cx.fill();
    }
    cx.restore();
  }

  function cracks(cx,count,jitter,color,alpha,rng,size){
    cx.save();
    cx.strokeStyle=css(color,alpha);
    cx.lineWidth=1;
    cx.lineJoin="round";
    for(let i=0;i<count;i++){
      let x=rng()*size,y=rng()*size;
      const segs=3+(rng()*5)|0;
      cx.beginPath();
      cx.moveTo(x,y);
      for(let s=0;s<segs;s++){
        x+=(rng()-.5)*jitter;
        y+=(rng()-.5)*jitter;
        cx.lineTo(x,y);
      }
      cx.stroke();
    }
    cx.restore();
  }

  function fillBase(cx,size,hex){
    cx.fillStyle=css(hex);
    cx.fillRect(0,0,size,size);
  }

  function tintNoise(cx,size,hexA,hexB,amount){
    const img=cx.getImageData(0,0,size,size);
    const data=img.data;
    const A=hexRgb(hexA),B=hexRgb(hexB);
    for(let i=0;i<data.length;i+=4){
      const t=(data[i]/255)*amount;
      data[i]=Math.round(lerp(A[0],B[0],t));
      data[i+1]=Math.round(lerp(A[1],B[1],t));
      data[i+2]=Math.round(lerp(A[2],B[2],t));
      data[i+3]=255;
    }
    cx.putImageData(img,0,0);
  }

  /* ---------------- 配方表 ---------------- */
  const RECIPES={
    grass:{repeat:[10,10], draw(cx,size,rng){
      valueNoise(cx,size,size/6,4,rng);
      tintNoise(cx,size,PALETTE.grass.dark,PALETTE.grass.light,1);
      speckle(cx,180,[.5,2.2],[PALETTE.grass.dark,PALETTE.grass.base,0x3a6020],rng,size);
      streaks(cx,[0,-1],90,PALETTE.grass.dark,.35,rng,size);
    }},
    dirt:{repeat:[6,6], draw(cx,size,rng){
      valueNoise(cx,size,size/5,3,rng);
      tintNoise(cx,size,PALETTE.dirt.dark,PALETTE.dirt.light,1);
      speckle(cx,120,[.8,2.5],[PALETTE.rock.base,PALETTE.dirt.dark,0x5a4030],rng,size);
    }},
    rock:{repeat:[3,3], draw(cx,size,rng){
      valueNoise(cx,size,size/4,4,rng);
      tintNoise(cx,size,PALETTE.rock.dark,PALETTE.rock.light,1);
      cracks(cx,28,size*.12,0x2a2018,.55,rng,size);
      speckle(cx,90,[.6,2],[0x1a1510,PALETTE.rock.light],rng,size);
    }},
    bark:{repeat:[1,2], draw(cx,size,rng){
      fillBase(cx,size,PALETTE.wood.base);
      streaks(cx,[0,1],130,PALETTE.wood.dark,.55,rng,size);
      streaks(cx,[0,1],60,0x2a1808,.3,rng,size);
      speckle(cx,35,[2,6],[PALETTE.wood.dark,0x2a1808],rng,size);
      /* 节疤 */
      for(let i=0;i<5;i++){
        const x=rng()*size,y=rng()*size,r=3+rng()*6;
        cx.fillStyle=css(PALETTE.wood.dark,.4);
        cx.beginPath();cx.arc(x,y,r,0,Math.PI*2);cx.fill();
      }
    }},
    leaf:{repeat:[2,2], draw(cx,size,rng){
      valueNoise(cx,size,size/3.5,3,rng);
      tintNoise(cx,size,PALETTE.grass.dark,mixHex(PALETTE.grass.light,0xa0d060,.4),1);
      speckle(cx,70,[3,8],[PALETTE.grass.base,PALETTE.grass.dark],rng,size);
    }},
    fur:{repeat:[2,2], draw(cx,size,rng){
      fillBase(cx,size,PALETTE.fur.base);
      streaks(cx,[.6,.8],170,PALETTE.fur.dark,.45,rng,size);
      streaks(cx,[-.3,.9],90,0x4a3020,.3,rng,size);
      speckle(cx,40,[1,2.5],[PALETTE.fur.dark,PALETTE.fur.light],rng,size);
    }},
    hide:{repeat:[2,2], draw(cx,size,rng){
      fillBase(cx,size,PALETTE.fur.base);
      valueNoise(cx,size,size/4,3,rng);
      tintNoise(cx,size,PALETTE.fur.dark,PALETTE.fur.light,.8);
      cx.strokeStyle=css(PALETTE.wood.dark,.45);
      cx.lineWidth=1;
      for(let i=0;i<6;i++){
        const y=(i+1)/7*size;
        cx.beginPath();cx.moveTo(size*.08,y);cx.lineTo(size*.92,y);cx.stroke();
      }
      speckle(cx,50,[1,3],[PALETTE.fur.dark,0x6a4030],rng,size);
    }},
    plate:{repeat:[2,2], draw(cx,size,rng){
      fillBase(cx,size,PALETTE.steel.dark);
      valueNoise(cx,size,size/5,2,rng);
      tintNoise(cx,size,PALETTE.steel.dark,PALETTE.steel.light,.7);
      streaks(cx,[1,.15],70,PALETTE.steel.light,.35,rng,size);
      streaks(cx,[-.2,1],40,0x1a2030,.3,rng,size);
      speckle(cx,30,[1,2],[PALETTE.steel.light,0xffffff],rng,size);
    }},
    cloth:{repeat:[3,3], draw(cx,size,rng){
      fillBase(cx,size,0x6a4a3a);
      const step=Math.max(2,(size/16)|0);
      cx.strokeStyle=css(0x3a2818,.4);
      cx.lineWidth=1;
      for(let i=0;i<size;i+=step){
        cx.beginPath();cx.moveTo(i,0);cx.lineTo(i,size);cx.stroke();
        cx.beginPath();cx.moveTo(0,i);cx.lineTo(size,i);cx.stroke();
      }
      speckle(cx,40,[.5,1.5],[0x4a3020,0x8a6a50],rng,size);
    }},
    bone:{repeat:[1,1], draw(cx,size,rng){
      fillBase(cx,size,PALETTE.bone.base);
      valueNoise(cx,size,size/4,3,rng);
      tintNoise(cx,size,PALETTE.bone.dark,PALETTE.bone.light,.75);
      cracks(cx,18,size*.1,0x8a7860,.4,rng,size);
    }},
    magma:{repeat:[2,2], draw(cx,size,rng){
      fillBase(cx,size,PALETTE.lava.dark);
      valueNoise(cx,size,size/4,3,rng);
      tintNoise(cx,size,0x120804,0x3a1408,.9);
      cracks(cx,36,size*.14,PALETTE.lava.base,.85,rng,size);
      cracks(cx,16,size*.1,PALETTE.lava.light,.55,rng,size);
      speckle(cx,40,[1,3],[PALETTE.lava.base,PALETTE.lava.light],rng,size);
    }},
  };

  function makeCanvas(key){
    const recipe=RECIPES[key];
    if(!recipe)throw new Error("Tex: unknown key "+key);
    const c=document.createElement("canvas");
    c.width=c.height=SIZE;
    const cx=c.getContext("2d");
    recipe.draw(cx,SIZE,rngFor(key));
    return c;
  }

  function toTexture(canvas,key){
    const tex=new THREE.CanvasTexture(canvas);
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.magFilter=THREE.LinearFilter;
    tex.minFilter=THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps=true;
    tex.needsUpdate=true;
    const rep=RECIPES[key].repeat||[1,1];
    tex.repeat.set(rep[0],rep[1]);
    /* r128 个别环境下 CanvasTexture.userData 可能未初始化 */
    if(!tex.userData)tex.userData={};
    tex.userData.texKey=key;
    tex.userData.sharedTex=true;
    texCount++;
    return tex;
  }

  function get(key){
    if(!RECIPES[key])throw new Error("Tex.get: unknown "+key);
    let t=cache.map.get(key);
    if(t)return t;
    t=toTexture(makeCanvas(key),key);
    cache.map.set(key,t);
    return t;
  }

  /* 灰度反相 → roughnessMap（亮=光滑）；仅缓存 rock/bark/plate */
  const ROUGH_KEYS={rock:1,bark:1,plate:1};
  function rough(key){
    if(!ROUGH_KEYS[key])return null;
    let t=cache.rough.get(key);
    if(t)return t;
    const src=get(key).image;
    const c=document.createElement("canvas");
    c.width=c.height=SIZE;
    const cx=c.getContext("2d");
    cx.drawImage(src,0,0);
    const img=cx.getImageData(0,0,SIZE,SIZE);
    const d=img.data;
    for(let i=0;i<d.length;i+=4){
      const g=255-((d[i]+d[i+1]+d[i+2])/3)|0;
      d[i]=d[i+1]=d[i+2]=g;
    }
    cx.putImageData(img,0,0);
    t=toTexture(c,key);
    t.repeat.copy(get(key).repeat);
    cache.rough.set(key,t);
    return t;
  }

  /* Sobel 法线；仅 rock / bark */
  const NORMAL_KEYS={rock:1,bark:1};
  function normal(key){
    if(!NORMAL_KEYS[key])return null;
    let t=cache.normal.get(key);
    if(t)return t;
    const src=get(key).image;
    const c=document.createElement("canvas");
    c.width=c.height=SIZE;
    const cx=c.getContext("2d");
    cx.drawImage(src,0,0);
    const img=cx.getImageData(0,0,SIZE,SIZE);
    const d=img.data;
    const gray=new Float32Array(SIZE*SIZE);
    for(let i=0;i<SIZE*SIZE;i++)gray[i]=(d[i*4]+d[i*4+1]+d[i*4+2])/3/255;
    const out=cx.createImageData(SIZE,SIZE);
    const o=out.data;
    const str=1.8;
    for(let y=0;y<SIZE;y++){
      for(let x=0;x<SIZE;x++){
        const i=y*SIZE+x;
        const xm=(x+SIZE-1)%SIZE,xp=(x+1)%SIZE;
        const ym=(y+SIZE-1)%SIZE,yp=(y+1)%SIZE;
        const dx=gray[y*SIZE+xp]-gray[y*SIZE+xm];
        const dy=gray[yp*SIZE+x]-gray[ym*SIZE+x];
        const nx=(-dx*str)*.5+.5;
        const ny=(-dy*str)*.5+.5;
        const nz=.5+.5;
        const p=i*4;
        o[p]=nx*255;o[p+1]=ny*255;o[p+2]=nz*255;o[p+3]=255;
      }
    }
    cx.putImageData(out,0,0);
    t=toTexture(c,key);
    t.repeat.copy(get(key).repeat);
    cache.normal.set(key,t);
    return t;
  }

  /* MAT 键 → 贴图绑定（不改任何 build*） */
  const MAT_BIND={
    "grass.ground":{map:"grass"},
    "grass.canopy":{map:"leaf"},
    "grass.mesaTop":{map:"grass"},
    "grass.cloth":{map:"cloth"},
    "grass.herb":{map:"leaf"},
    "dirt.path":{map:"dirt"},
    "dirt.zone":{map:"dirt"},
    "rock.boulder":{map:"rock",rough:1,normal:1},
    "rock.mesa":{map:"rock",rough:1,normal:1},
    "rock.ore":{map:"rock",rough:1},
    "rock.camp":{map:"rock",rough:1},
    "fur.hide":{map:"hide"},
    "fur.hideDark":{map:"hide"},
    "fur.boar":{map:"fur"},
    "fur.centaur":{map:"fur"},
    "fur.centaurD":{map:"fur"},
    "fur.quad":{map:"fur"},
    "fur.tent":{map:"hide"},
    "fur.nose":{map:"fur"},
    "wood.trunk":{map:"bark",rough:1,normal:1},
    "wood.dead":{map:"bark",rough:1},
    "wood.prop":{map:"bark",rough:1,normal:1},
    "wood.totem":{map:"bark"},
    "wood.build":{map:"bark",rough:1},
    "wood.buildD":{map:"bark"},
    "wood.roof":{map:"hide"},
    "wood.stake":{map:"bark"},
    "wood.gate":{map:"bark"},
    "lava.magma":{map:"magma",emissive:1},
    "lava.rock":{map:"magma"},
    "lava.ember":{map:"magma",emissive:1},
    "lava.pool":{map:"magma",emissive:1},
    "lava.pillar":{map:"rock",rough:1},
    "lava.glowRock":{map:"magma",emissive:1},
    "lava.bridge":{map:"rock",rough:1},
    "lava.gate":{map:"magma"},
    "lava.dungeon":{map:"magma",emissive:1},
    "bone.horn":{map:"bone"},
    "bone.ivory":{map:"bone"},
    "bone.dungeon":{map:"bone"},
    "metal.plate":{map:"plate",rough:1},
    "metal.blade":{map:"plate",rough:1},
    "metal.iron":{map:"plate",rough:1},
    "metal.vein":{map:"rock"},
    "cloth.flag":{map:"cloth"},
    "cloth.centaur":{map:"cloth"},
    "cloth.stall":{map:"cloth"},
    "obsidian.gate":{map:"rock",rough:1},
    "obsidian.plat":{map:"rock",rough:1},
    "obsidian.pillar":{map:"rock"},
    "obsidian.slab":{map:"rock"},
    "dungeon.ground":{map:"rock",rough:1,normal:1},
    "dungeon.wall":{map:"rock",rough:1},
    "dungeon.moss":{map:"leaf"},
    "ash.corpse":{map:"dirt"},
    "quest.marker":{map:"bone"},
  };

  function resolveBind(matKey){
    if(!matKey)return null;
    if(MAT_BIND[matKey])return MAT_BIND[matKey];
    if(matKey.startsWith("spec.")){
      const s=matKey.slice(5);
      if(/armor|blade|gold|trim/.test(s))return{map:"plate",rough:1};
      if(/robe|cloth|cape|leather|feather|book/.test(s))return{map:"cloth"};
      if(/wood/.test(s))return{map:"bark",rough:1,normal:1};
      if(/magma|rock/.test(s))return{map:"magma",emissive:1};
      return null;
    }
    if(matKey.startsWith("wood."))return{map:"bark",rough:1};
    if(matKey.startsWith("fur."))return{map:"fur"};
    if(matKey.startsWith("paint."))return{map:"cloth"};
    if(matKey.startsWith("dungeon."))return{map:"rock",rough:1};
    if(matKey.startsWith("lava."))return{map:"magma"};
    return null;
  }

  function bind(mat,matKey){
    if(!mat||!matKey)return;
    const b=resolveBind(matKey);
    if(!b)return;
    try{
      mat.map=get(b.map);
      if(b.rough){
        const r=rough(b.map);
        if(r){mat.roughnessMap=r;mat.roughness=Math.max(mat.roughness,.55);}
      }
      if(b.normal){
        const n=normal(b.map);
        if(n){
          mat.normalMap=n;
          if(mat.normalScale&&mat.normalScale.set)mat.normalScale.set(.55,.55);
          else mat.normalScale=new THREE.Vector2(.55,.55);
        }
      }
      if(b.emissive)mat.emissiveMap=get(b.map);
      mat.needsUpdate=true;
    }catch(err){
      console.warn("Tex.bind",matKey,err);
    }
  }

  /* 预热常用贴图，保证首次进世界不卡；总数 ≤16 */
  function warm(){
    ["grass","dirt","rock","bark","leaf","fur","hide","plate","cloth","bone","magma"].forEach(get);
    rough("rock");rough("bark");rough("plate");
    normal("rock");normal("bark");
  }

  return{
    get,rough,normal,bind,warm,
    keys(){return Object.keys(RECIPES);},
    size(){return texCount;},
    SIZE,
    _recipes:RECIPES,
    _cache:cache,
  };
})();

/* 挂到 MAT.create：材质一建就带贴图 */
(function hookMat(){
  if(typeof MAT==="undefined")return;
  const origGet=MAT.get.bind(MAT);
  MAT.get=function(key,overrides){
    const mat=origGet(key,overrides);
    if(mat&&!mat.userData.texBound){
      Tex.bind(mat,key);
      mat.userData.texBound=true;
    }
    return mat;
  };
  /* 预热（document 可用时） */
  if(typeof document!=="undefined"){
    try{Tex.warm();}catch(e){console.warn("Tex.warm",e);}
  }
})();
