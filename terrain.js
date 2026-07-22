/* ============================================================
   熔火之心 · terrain.js
   高度场地形 + 顶点着色 + 绘入道路（plan-V2 · R2）
   ------------------------------------------------------------
   [依赖] THREE · core.js（WORLD_SEED · hashZoneId）· palette.js（PALETTE）
          textures.js（可选 Tex.get）
   [导出] heightAt buildMulgoreTerrain TERRAIN
          heightAt(x,z) → number（与网格同一公式，确定性）
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
    camp:{x:0,z:52},
    portalMC:{x:0,z:-168},
    portalBarrens:{x:0,z:168},
    lake:{x:-38,z:14},
    road:{
      p0:{x:0,z:52},
      p1:{x:10,z:-50},
      p2:{x:0,z:-168},
      halfW:3.5,
    },
    /* 风险缓解：大尺度振幅先 ≤3m */
    ampLarge:3.0,
    ampMid:1.2,
    ampDetail:.28,
  };

  function heightRaw(x,z){
    const n1=(fbm(x/90,z/90,4)-.5)*2;
    const n2=(fbm(x/20+17.3,z/20+9.1,3)-.5)*2;
    const n3=(fbm(x/5+41.7,z/5+3.9,2)-.5)*2;
    return n1*CFG.ampLarge+n2*CFG.ampMid+n3*CFG.ampDetail;
  }

  function distFade(x,z,cx,cz,inner,outer){
    const d=Math.hypot(x-cx,z-cz);
    if(d<=inner)return 0;
    if(d>=outer)return 1;
    return smoothstep(inner,outer,d);
  }

  function flattenMask(x,z){
    let m=1;
    const C=CFG.camp, MC=CFG.portalMC, B=CFG.portalBarrens;
    m=Math.min(m,distFade(x,z,C.x,C.z,24,42));
    m=Math.min(m,distFade(x,z,MC.x,MC.z,16,30));
    m=Math.min(m,distFade(x,z,B.x,B.z,16,30));
    return m;
  }

  function bezier(t,p0,p1,p2){
    const u=1-t;
    return{
      x:u*u*p0.x+2*u*t*p1.x+t*t*p2.x,
      z:u*u*p0.z+2*u*t*p1.z+t*t*p2.z,
    };
  }

  function distToRoad(x,z){
    const R=CFG.road;
    let best=1e9;
    for(let i=0;i<=72;i++){
      const p=bezier(i/72,R.p0,R.p1,R.p2);
      const d=Math.hypot(x-p.x,z-p.z);
      if(d<best)best=d;
    }
    return best;
  }

  function roadWeight(x,z){
    const d=distToRoad(x,z);
    const hw=CFG.road.halfW;
    if(d>=hw)return 0;
    return 1-smoothstep(0,hw,d);
  }

  /** 与网格顶点同一公式 —— 任何时刻同参同结果 */
  function heightAt(x,z){
    if(!CFG.ready)return 0;
    let h=heightRaw(x,z)*flattenMask(x,z);
    const rw=roadWeight(x,z);
    if(rw>0)h=lerp(h,0,rw*rw);
    const L=CFG.lake;
    const ld=Math.hypot(x-L.x,z-L.z);
    if(ld<18){
      const w=1-smoothstep(9,18,ld);
      h=lerp(h,-.45,w);
    }
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

    /* 基色：高度 → 草→土 */
    let col=mix3(grass,dirt,smoothstep(.2,2.8,h));
    col=mix3(col,grassD,smoothstep(-.2,.6,-h)*.35);

    /* 低洼沙岸 */
    const sandW=1-smoothstep(.05,.55,h);
    col=mix3(col,sand,sandW*.85);

    /* 陡坡露岩 */
    const rockW=smoothstep(.35,.55,slope);
    col=mix3(col,mix3(rock,rockD,.4),rockW);

    /* 道路混土 */
    const rw=roadWeight(x,z);
    if(rw>0)col=mix3(col,dirt,rw*.92);

    /* 湖盆加深沙 */
    const L=CFG.lake;
    const ld=Math.hypot(x-L.x,z-L.z);
    if(ld<16)col=mix3(col,sand,(1-smoothstep(6,16,ld))*.7);

    return col;
  }

  /**
   * cfg: {worldR, camp:{x,z}, portalMC, portalBarrens, lake, size?, segs?}
   * 振幅保守（大尺度 ≤3），验收贴地后再调大。
   */
  function buildMulgoreTerrain(cfg){
    cfg=cfg||{};
    const worldR=cfg.worldR!=null?cfg.worldR:176;
    const size=cfg.size!=null?cfg.size:(worldR+50)*2;
    const segs=cfg.segs!=null?cfg.segs:180;

    CFG.camp=cfg.camp||{x:0,z:52};
    CFG.portalMC=cfg.portalMC||{x:0,z:-(worldR-8)};
    CFG.portalBarrens=cfg.portalBarrens||{x:0,z:worldR-8};
    CFG.lake=cfg.lake||{x:-38,z:14};
    CFG.road={
      p0:cfg.roadP0||{x:CFG.camp.x,z:CFG.camp.z},
      p1:cfg.roadP1||{x:10,z:(CFG.camp.z+CFG.portalMC.z)*.45},
      p2:cfg.roadP2||{x:CFG.portalMC.x,z:CFG.portalMC.z},
      halfW:cfg.roadHalfW!=null?cfg.roadHalfW:3.5,
    };
    if(cfg.ampLarge!=null)CFG.ampLarge=cfg.ampLarge;
    if(cfg.ampMid!=null)CFG.ampMid=cfg.ampMid;
    if(cfg.ampDetail!=null)CFG.ampDetail=cfg.ampDetail;
    CFG.ready=true;

    const geo=new THREE.PlaneGeometry(size,size,segs,segs);
    geo.rotateX(-Math.PI/2);
    const pos=geo.attributes.position;
    const colors=new Float32Array(pos.count*3);
    const eps=.6;
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
    buildMulgoreTerrain,
    get cfg(){return CFG;},
    /* 测试用：强制开启公式（不建网格也可采样） */
    _arm(cfg){
      Object.assign(CFG,cfg||{});
      CFG.ready=true;
    },
  };
})();

const heightAt=(x,z)=>TERRAIN.heightAt(x,z);
function buildMulgoreTerrain(cfg){return TERRAIN.buildMulgoreTerrain(cfg);}
