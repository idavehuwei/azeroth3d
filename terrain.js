/* ============================================================
   熔火之心 · terrain.js
   高度场地形 + 顶点着色 + 多段马路（plan-V2 · R2 / 经典莫高雷地貌）
   ------------------------------------------------------------
   [依赖] THREE · core.js（WORLD_SEED · hashZoneId）· palette.js（PALETTE）
          textures.js（可选 Tex.get）
   [导出] heightAt buildMulgoreTerrain TERRAIN
          heightAt(x,z) → number（与网格同一公式，确定性）
          TERRAIN.slopeAt / roadWeight / lakeBlend（props 植被筛选）
          buildMulgoreTerrain(cfg) → {mesh, size, segs}
   ============================================================ */
"use strict";

const TERRAIN=(function(){
  const SEED=(WORLD_SEED^hashZoneId("terrain_mulgore"))>>>0;

  function smoothstep(e0,e1,x){
    const t=Math.max(0,Math.min(1,(x-e0)/(e1-e0)));
    return t*t*(3-2*t);
  }
  function lerp(a,b,t){return a+(b-a)*t;}
  function hash2(ix,iz){
    let n=((ix|0)*374761393+((iz|0)*668265263)+(SEED|0))|0;
    n=(n^(n>>>13))*1274126177|0;
    return ((n^(n>>>16))>>>0)/4294967296;
  }
  function valueNoise(x,z){
    const x0=Math.floor(x),z0=Math.floor(z);
    const fx=x-x0,fz=z-z0;
    const sx=fx*fx*(3-2*fx),sz=fz*fz*(3-2*fz);
    const a=hash2(x0,z0),b=hash2(x0+1,z0),c=hash2(x0,z0+1),d=hash2(x0+1,z0+1);
    return lerp(lerp(a,b,sx),lerp(c,d,sx),sz);
  }
  function fbm(x,z,oct){
    let amp=1,freq=1,sum=0,norm=0;
    for(let i=0;i<oct;i++){
      sum+=valueNoise(x*freq,z*freq)*amp;
      norm+=amp; amp*=.5; freq*=2;
    }
    return sum/norm;
  }

  /* 配置由 buildMulgoreTerrain 写入；heightAt 读取 */
  let CFG={
    ready:false,
    camp:{x:-36,z:40},
    portalMC:{x:0,z:-344},
    portalBarrens:{x:0,z:344},
    lakes:[],
    flats:[],
    mesas:[],
    pits:[],
    roads:[],
    roadHalfW:5.2,
    ampLarge:2.6,
    ampMid:1.1,
    ampDetail:.32,
  };

  function heightRaw(x,z){
    const n1=(fbm(x/95,z/95,4)-.5)*2;
    const n2=(fbm(x/22+17.3,z/22+9.1,3)-.5)*2;
    const n3=(fbm(x/5.5+41.7,z/5.5+3.9,2)-.5)*2;
    return n1*CFG.ampLarge+n2*CFG.ampMid+n3*CFG.ampDetail;
  }

  function distFade(x,z,cx,cz,inner,outer){
    const d=Math.hypot(x-cx,z-cz);
    if(d<=inner)return 0;
    if(d>=outer)return 1;
    return smoothstep(inner,outer,d);
  }

  /** 平顶山 / 台地抬升（红云台地·雷霆崖·乱风岗） */
  function mesaLift(x,z){
    let lift=0;
    const list=CFG.mesas||[];
    for(let i=0;i<list.length;i++){
      const m=list[i];
      const d=Math.hypot(x-m.x,z-m.z);
      const ri=m.rInner!=null?m.rInner:(m.r||40)*.55;
      const ro=m.rOuter!=null?m.rOuter:(m.r||40);
      const h=m.h!=null?m.h:8;
      if(d>=ro)continue;
      const w=d<=ri?1:1-smoothstep(ri,ro,d);
      /* 峭壁：外圈陡升 */
      const cliff=m.cliff!=null?m.cliff:1.35;
      const shaped=Math.pow(w,1/cliff);
      if(shaped*h>lift)lift=shaped*h;
    }
    return lift;
  }

  /** 矿洞 / 挖掘场凹陷 */
  function pitDepth(x,z){
    let depth=0;
    const list=CFG.pits||[];
    for(let i=0;i<list.length;i++){
      const p=list[i];
      const d=Math.hypot(x-p.x,z-p.z);
      const ri=p.rInner!=null?p.rInner:8;
      const ro=p.rOuter!=null?p.rOuter:18;
      const dep=p.depth!=null?p.depth:4.5;
      if(d>=ro)continue;
      const w=d<=ri?1:1-smoothstep(ri,ro,d);
      if(w*dep>depth)depth=w*dep;
    }
    return depth;
  }

  function flattenMask(x,z){
    let m=1;
    const flats=CFG.flats||[];
    for(let i=0;i<flats.length;i++){
      const f=flats[i];
      m=Math.min(m,distFade(x,z,f.x,f.z,f.inner||24,f.outer||42));
    }
    if(!flats.length&&CFG.camp){
      m=Math.min(m,distFade(x,z,CFG.camp.x,CFG.camp.z,40,70));
    }
    const MC=CFG.portalMC, B=CFG.portalBarrens;
    if(MC)m=Math.min(m,distFade(x,z,MC.x,MC.z,20,36));
    if(B)m=Math.min(m,distFade(x,z,B.x,B.z,20,36));
    return m;
  }

  function distPointSeg(px,pz,ax,az,bx,bz){
    const abx=bx-ax, abz=bz-az;
    const len2=abx*abx+abz*abz;
    if(len2<1e-6)return Math.hypot(px-ax,pz-az);
    let t=((px-ax)*abx+(pz-az)*abz)/len2;
    t=Math.max(0,Math.min(1,t));
    return Math.hypot(px-(ax+abx*t),pz-(az+abz*t));
  }

  function distToRoad(x,z){
    const roads=CFG.roads||[];
    let best=1e9;
    for(let r=0;r<roads.length;r++){
      const pts=roads[r].pts;
      if(!pts||pts.length<2)continue;
      for(let i=0;i<pts.length-1;i++){
        const a=pts[i],b=pts[i+1];
        const d=distPointSeg(x,z,a.x,a.z,b.x,b.z);
        if(d<best)best=d;
      }
    }
    /* 兼容旧单贝塞尔 */
    if(CFG.road&&CFG.road.p0&&(!roads.length)){
      const R=CFG.road;
      for(let i=0;i<=64;i++){
        const t=i/64,u=1-t;
        const px=u*u*R.p0.x+2*u*t*R.p1.x+t*t*R.p2.x;
        const pz=u*u*R.p0.z+2*u*t*R.p1.z+t*t*R.p2.z;
        const d=Math.hypot(x-px,z-pz);
        if(d<best)best=d;
      }
    }
    return best;
  }

  function roadHalfAt(x,z){
    const roads=CFG.roads||[];
    let best=1e9, hw=CFG.roadHalfW||5.2;
    for(let r=0;r<roads.length;r++){
      const pts=roads[r].pts;
      if(!pts||pts.length<2)continue;
      for(let i=0;i<pts.length-1;i++){
        const a=pts[i],b=pts[i+1];
        const d=distPointSeg(x,z,a.x,a.z,b.x,b.z);
        if(d<best){
          best=d;
          hw=roads[r].halfW!=null?roads[r].halfW:(CFG.roadHalfW||5.2);
        }
      }
    }
    if(CFG.road&&CFG.road.halfW!=null&&(!roads.length))hw=CFG.road.halfW;
    return{d:best,halfW:hw};
  }

  function roadWeight(x,z){
    const info=roadHalfAt(x,z);
    if(info.d>=info.halfW)return 0;
    return 1-smoothstep(0,info.halfW,info.d);
  }

  function lakeBlend(x,z){
    const lakes=CFG.lakes||[];
    let bestW=0, bestDepth=0;
    for(let i=0;i<lakes.length;i++){
      const L=lakes[i];
      const d=Math.hypot(x-L.x,z-L.z);
      const lo=L.outer!=null?L.outer:36;
      const li=L.inner!=null?L.inner:lo*.5;
      if(d>=lo)continue;
      const w=1-smoothstep(li,lo,d);
      if(w>bestW){
        bestW=w;
        bestDepth=L.depth!=null?L.depth:.55;
      }
    }
    return{w:bestW,depth:bestDepth};
  }

  /** 与网格顶点同一公式 —— 任何时刻同参同结果 */
  function heightAt(x,z){
    if(!CFG.ready)return 0;
    let h=heightRaw(x,z)*flattenMask(x,z);
    h+=mesaLift(x,z);
    h-=pitDepth(x,z);
    const rw=roadWeight(x,z);
    if(rw>0){
      /* 马路压到当地台地高度（平原≈0；台顶保持抬升） */
      const base=mesaLift(x,z);
      h=lerp(h,base,rw*rw);
    }
    const lk=lakeBlend(x,z);
    if(lk.w>0)h=lerp(h,-lk.depth,lk.w);
    return h;
  }

  function slopeAt(x,z){
    const e=.75;
    const dx=heightAt(x+e,z)-heightAt(x-e,z);
    const dz=heightAt(x,z+e)-heightAt(x,z-e);
    return Math.hypot(dx,dz)/(2*e);
  }

  function hexRgb(hex){
    const h=hex>>>0;
    return[(h>>16)&255,(h>>8)&255,h&255];
  }
  function mix3(a,b,t){
    return[
      a[0]+(b[0]-a[0])*t,
      a[1]+(b[1]-a[1])*t,
      a[2]+(b[2]-a[2])*t,
    ];
  }

  function vertexColor(x,z,h,slope){
    const grass=hexRgb(PALETTE.grass.base);
    const grassD=hexRgb(PALETTE.grass.dark);
    const dirt=hexRgb(PALETTE.dirt.base);
    const sand=hexRgb(PALETTE.dirt.light);
    const rock=hexRgb(PALETTE.rock.base);
    const rockD=hexRgb(PALETTE.rock.dark);
    const redRock=hexRgb(0xa86840);

    let col=mix3(grass,dirt,smoothstep(.2,3.2,h));
    col=mix3(col,grassD,smoothstep(-.2,.6,-h)*.35);

    /* 台地顶草 / 峭壁红岩 */
    const ml=mesaLift(x,z);
    if(ml>2){
      col=mix3(col,grass,smoothstep(2,6,ml)*.55);
      col=mix3(col,redRock,smoothstep(.4,.75,slope)*.85);
    }

    const sandW=1-smoothstep(.05,.55,h);
    col=mix3(col,sand,sandW*.85);

    const rockW=smoothstep(.32,.58,slope);
    col=mix3(col,mix3(rock,rockD,.4),rockW);

    /* 矿洞内壁暗岩 */
    const pd=pitDepth(x,z);
    if(pd>.4)col=mix3(col,rockD,smoothstep(.4,3,pd)*.9);

    const rw=roadWeight(x,z);
    if(rw>0)col=mix3(col,dirt,rw*.94);

    const lakes=CFG.lakes||[];
    for(let i=0;i<lakes.length;i++){
      const L=lakes[i];
      const d=Math.hypot(x-L.x,z-L.z);
      const lo=L.outer!=null?L.outer:36;
      if(d<lo)col=mix3(col,sand,(1-smoothstep(lo*.35,lo,d))*.75);
    }

    return col;
  }

  /**
   * cfg: worldR, camp, flats, mesas, pits, lakes, roads[{pts,halfW}], …
   */
  function buildMulgoreTerrain(cfg){
    cfg=cfg||{};
    const worldR=cfg.worldR!=null?cfg.worldR:352;
    const size=cfg.size!=null?cfg.size:(worldR+50)*2;
    const segs=cfg.segs!=null?cfg.segs:240;

    CFG.camp=cfg.camp||{x:-36,z:40};
    CFG.portalMC=cfg.portalMC||{x:0,z:-(worldR-8)};
    CFG.portalBarrens=cfg.portalBarrens||{x:0,z:worldR-8};
    CFG.flats=cfg.flats||[{x:CFG.camp.x,z:CFG.camp.z,inner:36,outer:62}];
    CFG.mesas=cfg.mesas||[];
    CFG.pits=cfg.pits||[];
    CFG.lakes=cfg.lakes||(cfg.lake?[{
      x:cfg.lake.x,z:cfg.lake.z,
      inner:(cfg.lakeBasin||32)*.5,
      outer:cfg.lakeBasin||32,
      depth:.55,
    }]:[]);
    CFG.roads=cfg.roads||[];
    CFG.roadHalfW=cfg.roadHalfW!=null?cfg.roadHalfW:5.2;
    if(cfg.roadP0&&cfg.roadP2){
      CFG.road={
        p0:cfg.roadP0,
        p1:cfg.roadP1||{x:0,z:(cfg.roadP0.z+cfg.roadP2.z)*.5},
        p2:cfg.roadP2,
        halfW:CFG.roadHalfW,
      };
    }else{
      CFG.road=null;
    }
    if(cfg.ampLarge!=null)CFG.ampLarge=cfg.ampLarge;
    if(cfg.ampMid!=null)CFG.ampMid=cfg.ampMid;
    if(cfg.ampDetail!=null)CFG.ampDetail=cfg.ampDetail;
    CFG.ready=true;

    const geo=new THREE.PlaneGeometry(size,size,segs,segs);
    geo.rotateX(-Math.PI/2);
    const pos=geo.attributes.position;
    const colors=new Float32Array(pos.count*3);
    const eps=.55;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),z=pos.getZ(i);
      const h=heightAt(x,z);
      pos.setY(i,h);
      const dx=heightAt(x+eps,z)-heightAt(x-eps,z);
      const dz=heightAt(x,z+eps)-heightAt(x,z-eps);
      const slope=Math.hypot(dx,dz)/(2*eps);
      const c=vertexColor(x,z,h,slope);
      colors[i*3]=c[0]/255; colors[i*3+1]=c[1]/255; colors[i*3+2]=c[2]/255;
    }
    pos.needsUpdate=true;
    geo.setAttribute("color",new THREE.BufferAttribute(colors,3));
    geo.computeVertexNormals();

    const matParams={
      vertexColors:true,
      roughness:.95,
      color:0xffffff,
    };
    if(typeof Tex!=="undefined"&&Tex.get){
      try{matParams.map=Tex.get("grass");}catch(e){}
    }
    const mat=MAT.get("terrain.mulgore",matParams);
    const mesh=new THREE.Mesh(geo,mat);
    mesh.receiveShadow=true;
    mesh.name="mulgoreTerrain";
    mesh.userData.terrain=true;

    return{mesh,size,segs,heightAt};
  }

  return{
    heightAt,
    slopeAt,
    roadWeight,
    lakeBlend,
    buildMulgoreTerrain,
    get cfg(){return CFG;},
    _arm(cfg){
      Object.assign(CFG,cfg||{});
      if(cfg&&cfg.lakes)CFG.lakes=cfg.lakes;
      if(cfg&&cfg.mesas)CFG.mesas=cfg.mesas;
      if(cfg&&cfg.pits)CFG.pits=cfg.pits;
      if(cfg&&cfg.roads)CFG.roads=cfg.roads;
      if(cfg&&cfg.flats)CFG.flats=cfg.flats;
      CFG.ready=true;
    },
  };
})();

const heightAt=(x,z)=>TERRAIN.heightAt(x,z);
function buildMulgoreTerrain(cfg){return TERRAIN.buildMulgoreTerrain(cfg);}
