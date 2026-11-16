/* Anonymous equipment geometry adapted from the supplied model. */
window.CCEquipmentFactories=window.CCEquipmentFactories||{};
window.CCEquipmentFactories.steelTank=function(THREE){
'use strict';
var D={
  L:10400, R:1200, TS:6, TD:8,          /* габарит, радиус, толщины */
  HSUP:470,                             /* низ обечайки над полом: 170 подушка + 300 седло */
  PAD:170, SADDLE_TOP:750,              /* отметка верха седла */
  NSUP:5, SUP_W:600,                    /* 5 опор, ширина 600 (по Виду А) */
  SUP_X:[700,2850,5000,7150,9300],      /* центры опор от левого торца обечайки */
  PART_X:5200,                          /* перегородка — 5200 от торца */
  PLAT_DY:90,                           /* пол площадки выше верха обечайки */
  RAIL:1250,                            /* высота ограждения */
  PL:[{x0:0,len:1500,hatch:710},        /* левая площадка 1500×2000, люк 710 */
      {x0:7570,len:2430,hatch:8370}],   /* правая площадка 2400×2000, люк 8370 */
  PLW:2020,                             /* ширина площадки: от Z=-1200 (борт бака) до Z=+820 */
  LAD:[{x:715,w:557},{x:9181,w:556}],   /* наружные лестницы: прижаты к боковине, Z -1200..-1300 */
  HATCH:800,                            /* люк Ду800 */
  TOPN:[{x:9100,dn:150},{x:9400,dn:50},{x:9700,dn:50}],  /* патрубки сверху */
  INS:200, CLAD:0.7,                    /* изоляция + окожухивание */
  RHO:7850, RHO_W:1000, RHO_INS:100
};
var DEF={LEN:D.L,RAD:D.R,TS:D.TS,TD:D.TD,FILL:85,INS:D.INS};
var GK=['panel','frame','base','beam','pipe','mesh'];
var P={c:{panel:'#b8c2ca',frame:'#aab4ba',base:'#4a555d',beam:'#66737d',pipe:'#3c464d',mesh:'#d5dde2',water:'#2a86c4'},metal:35,rough:55,
CUT:false,WATER:false,PART:true,RING:true,INSUL:false,PLAT:true,NOZ:true,SUP:true,EDG:false,DIM:false};
Object.keys(DEF).forEach(function(k){P[k]=DEF[k];});
function M(){return new THREE.MeshStandardMaterial({color:0xffffff,metalness:.5,roughness:.5,side:THREE.DoubleSide});}
var MAT={
  dark:new THREE.MeshStandardMaterial({color:0x0d1013,metalness:.2,roughness:.9}),
  water:new THREE.MeshStandardMaterial({color:0x2a86c4,metalness:.15,roughness:.18,transparent:true,
        opacity:.55,side:THREE.DoubleSide,depthWrite:false}),
  insul:new THREE.MeshStandardMaterial({color:0xc3ccd2,metalness:.5,roughness:.5,transparent:true,
        opacity:.42,side:THREE.DoubleSide})
};
GK.forEach(function(k){MAT[k]=M();});
var EDGE_MAT=new THREE.LineBasicMaterial({color:0x161c21,transparent:true,opacity:.85});

function applyColors(){
  var m=P.metal/100, r=Math.max(.08,P.rough/100);
  GK.forEach(function(k){MAT[k].color.set(P.c[k]).convertSRGBToLinear();MAT[k].metalness=m;MAT[k].roughness=r;});
  MAT.pipe.metalness=Math.min(1,m+.25);
  MAT.insul.color.set(P.c.mesh).convertSRGBToLinear();
  MAT.water.color.set(P.c.water).convertSRGBToLinear();
}
var root=new THREE.Group(),gS,gE,gD;
function add(m,noEdge,ang){
  m.castShadow=true;m.receiveShadow=true;gS.add(m);
  if(!noEdge){var e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry,ang||28),EDGE_MAT);
    e.position.copy(m.position);e.rotation.copy(m.rotation);e.scale.copy(m.scale);gE.add(e);}
  return m;
}
function box(w,h,d,mat,cx,cy,cz,noEdge){
  var m=new THREE.Mesh(new THREE.BoxGeometry(Math.max(w,.5),Math.max(h,.5),Math.max(d,.5)),mat);
  m.position.set(cx,cy,cz);return add(m,noEdge);
}
/* труба вдоль произвольной оси: ax='X'|'Y'|'Z' */
function tube(r1,r2,len,mat,cx,cy,cz,ax,seg){
  var m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,len,seg||28,1,false),mat);
  if(ax==='X')m.rotation.z=Math.PI/2; else if(ax==='Z')m.rotation.x=Math.PI/2;
  m.position.set(cx,cy,cz);return add(m,false,34);
}
/* полуцилиндр/цилиндр вдоль X, открытый; half=true -> оставляем z<=0 */
function shellMesh(r,len,mat,half,yc,cast){
  var g=new THREE.CylinderGeometry(r,r,len,96,1,true,half?Math.PI/2:0,half?Math.PI:Math.PI*2);
  g.rotateZ(Math.PI/2);
  var m=new THREE.Mesh(g,mat);m.position.y=yc;m.castShadow=cast!==false;m.receiveShadow=true;gS.add(m);
  return m;
}
/* диск (днище/перегородка) в плоскости YZ на координате x; half -> z<=0 */
function disc(r,x,yc,mat,half){
  var g=new THREE.CircleGeometry(r,96,half?-Math.PI/2:0,half?Math.PI:Math.PI*2);
  g.rotateY(Math.PI/2);
  var m=new THREE.Mesh(g,mat);m.position.set(x,yc,0);m.castShadow=true;m.receiveShadow=true;gS.add(m);return m;
}
/* плоская пластина-«срез» в плоскости z=0 */
function face(lx,ly,cx,cy,mat){
  var m=new THREE.Mesh(new THREE.BoxGeometry(Math.max(lx,1),Math.max(ly,1),4),mat);
  m.position.set(cx,cy,-2);m.castShadow=false;m.receiveShadow=true;gS.add(m);return m;
}
/* окружность-контур в плоскости YZ */
function rim(r,x,yc,half){
  var pts=[],n=96,a0=half?-Math.PI/2:0,a1=half?Math.PI/2:Math.PI*2;
  for(var i=0;i<=n;i++){var a=a0+(a1-a0)*i/n;pts.push(new THREE.Vector3(x,yc+r*Math.sin(a),r*Math.cos(a)));}
  gE.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),EDGE_MAT));
}
/* лестница вертикальная, прижатая к боковине: плоскость XY, ширина вдоль X */
function ladder(xc,z,y0,y1,w,mat){
  var h=y1-y0, hw=w/2;
  box(60,h,60,mat,xc-hw,y0+h/2,z);                       /* тетивы */
  box(60,h,60,mat,xc+hw,y0+h/2,z);
  var n=Math.max(3,Math.round(h/300));
  for(var i=1;i<=n;i++) box(w-60,26,40,mat,xc,y0+i*h/(n+1),z,true);   /* ступени */
  /* ограждение лестницы: наружные прутки и дуги */
  var zc=z-95;
  box(45,h*0.82,45,mat,xc-hw,y0+h*0.41,zc,true);
  box(45,h*0.82,45,mat,xc+hw,y0+h*0.41,zc,true);
  var m=Math.max(2,Math.round(h/1200));
  for(var j=1;j<=m;j++){var yy=y0+h*0.18+j*(h*0.78)/(m+1);
    box(w,40,40,mat,xc,yy,zc,true);
    box(40,40,95,mat,xc-hw,yy,z-47,true);
    box(40,40,95,mat,xc+hw,yy,z-47,true);}
}
/* ограждение по периметру площадки; gap=[x0,x1] — проём на борту z0 (выход с лестницы) */
function railing(x0,x1,z0,z1,y,h,mat,gap){
  var pts=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]], st=[y+h*0.42,y+h];
  function bar(ax,az,bx,bz,yy){
    var len=Math.hypot(bx-ax,bz-az); if(len<40)return;
    if(Math.abs(bx-ax)>1) box(len,50,45,mat,(ax+bx)/2,yy,az,true);
    else                  box(45,50,len,mat,ax,yy,(az+bz)/2,true);
  }
  for(var i=0;i<4;i++){
    var a=pts[i],b=pts[(i+1)%4];
    var len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    var n=Math.max(2,Math.round(len/1100));
    for(var k=0;k<=n;k++){
      var t=k/n, px=a[0]+(b[0]-a[0])*t, pz=a[1]+(b[1]-a[1])*t;
      if(i===0&&gap&&px>gap[0]-120&&px<gap[1]+120) continue;
      box(60,h,60,mat,px,y+h/2,pz,true);
    }
    for(var sI=0;sI<2;sI++){
      if(i===0&&gap){ bar(a[0],a[1],gap[0],a[1],st[sI]); bar(gap[1],b[1],b[0],b[1],st[sI]); }
      else            bar(a[0],a[1],b[0],b[1],st[sI]);
    }
  }
}
/* патрубок с фланцем; dir: 'X+','X-','Y+','Y-','Z+','Z-' */
function nozzle(dn,len,bx,by,bz,dir){
  var pr=dn/2+6, fr=dn*0.82, ax=dir[0], s=(dir[1]==='+')?1:-1;
  if(ax==='X'){ tube(pr,pr,len,MAT.pipe,bx+s*len/2,by,bz,'X',24);
                tube(fr,fr,26,MAT.pipe,bx+s*(len-13),by,bz,'X',32); }
  else if(ax==='Z'){ tube(pr,pr,len,MAT.pipe,bx,by,bz+s*len/2,'Z',24);
                tube(fr,fr,26,MAT.pipe,bx,by,bz+s*(len-13),'Z',32); }
  else        { tube(pr,pr,len,MAT.pipe,bx,by+s*len/2,bz,'Y',24);
                tube(fr,fr,26,MAT.pipe,bx,by+s*(len-13),bz,'Y',32); }
}

/* =====================================================================
   6. ГЕОМЕТРИЯ
   ===================================================================== */
var G={};   /* производные величины — считаются в geom() */
function geom(){
  var L=P.LEN,R=P.RAD,ts=P.TS,td=P.TD;
  var k=L/D.L, kr=R/D.R;                 /* коэффициенты подобия по длине и радиусу */
  G.L=L; G.R=R; G.Ri=R-ts;
  G.y0=D.HSUP*Math.max(0.45,kr);         /* низ обечайки над полом */
  G.pad=D.PAD*Math.max(0.45,kr);
  G.axis=G.y0+R;                         /* отметка оси */
  G.top=G.y0+2*R;                        /* верх обечайки */
  G.platY=G.top+D.PLAT_DY;               /* пол площадки */
  G.H=G.platY+D.RAIL;                    /* полная высота */
  G.saddleTop=G.y0+2*R*0.117;            /* верх седла (по чертежу 750 при y0=470,R=1200) */
  G.supX=D.SUP_X.map(function(x){return (x-D.L/2)*k;});
  G.supW=D.SUP_W*Math.max(0.5,k);
  G.supD=1.8*R;
  G.partX=(D.PART_X-D.L/2)*k;
  G.plat=D.PL.map(function(p){return {x0:(p.x0-D.L/2)*k,x1:(p.x0+p.len-D.L/2)*k,
                                      hx:(p.hatch-D.L/2)*k};});
  G.platW=Math.min(D.PLW*kr,1.85*R);
  G.platZ0=-R; G.platZ1=-R+G.platW;                    /* борт площадки заподлицо с боковиной */
  G.lad=D.LAD.map(function(l){return {x:(l.x-D.L/2)*k, w:l.w*Math.max(0.5,k)};});
  G.ladZ=-(R+70);
  G.hatch=Math.min(D.HATCH*kr,1.1*R);
  G.topn=D.TOPN.map(function(n){return {x:(n.x-D.L/2)*k,dn:n.dn*kr};});
  G.ins=P.INS;
  /* уровень воды */
  G.hw=2*G.Ri*P.FILL/100;                /* высота столба от нижней образующей */
  G.yw=G.axis-G.Ri+G.hw;                 /* мировая отметка зеркала */
  G.Lin=L-2*td;
  /* объёмы, м3 */
  var Ri=G.Ri/1000, hw=G.hw/1000, Lin=G.Lin/1000;
  G.Vfull=Math.PI*Ri*Ri*Lin;
  var a;
  if(hw<=0) a=0; else if(hw>=2*Ri) a=Math.PI*Ri*Ri;
  else a=Ri*Ri*Math.acos((Ri-hw)/Ri)-(Ri-hw)*Math.sqrt(Math.max(0,2*Ri*hw-hw*hw));
  G.Vw=a*Lin;
}

function buildTank(){
  var R=G.R,Ri=G.Ri,L=G.L,td=P.TD,ts=P.TS,cut=P.CUT,y=G.axis,Ls=L-2*td;
  /* --- обечайка --- */
  shellMesh(R,Ls,MAT.panel,cut,y);
  if(cut){
    shellMesh(Ri,Ls,MAT.panel,true,y,false);
    face(Ls,ts,0,y+R-ts/2,MAT.frame);
    face(Ls,ts,0,y-R+ts/2,MAT.frame);
  }
  /* --- днища плоские --- */
  [-1,1].forEach(function(s){
    var xo=s*(L/2-td/2);
    disc(R,xo,y,MAT.frame,cut);
    if(cut){ disc(Ri,xo-s*td/2,y,MAT.frame,true);
             face(td,2*R,xo,y,MAT.frame); }
    if(P.EDG) rim(R,s*(L/2-td),y,cut);
  });
  /* --- перегородка по центру (двухсекционный бак) --- */
  if(P.PART){
    disc(Ri,G.partX,y,MAT.frame,cut);
    if(cut) face(td,2*Ri,G.partX,y,MAT.frame);
    if(P.EDG) rim(Ri,G.partX,y,cut);
  }
  /* --- кольца жёсткости (внутренние, видны только в разрезе) --- */
  if(P.RING&&cut){
    var nr=4;
    for(var i=0;i<nr;i++){
      var x=-L/2+L*(i+1)/(nr+1);
      if(P.PART&&Math.abs(x-G.partX)<L*0.04) continue;
      var g=new THREE.CylinderGeometry(Ri,Ri,90,64,1,true,cut?Math.PI/2:0,cut?Math.PI:Math.PI*2);
      g.rotateZ(Math.PI/2);
      var m=new THREE.Mesh(g,MAT.frame); m.position.set(x,y,0); m.scale.set(1,0.955,0.955);
      m.receiveShadow=true; gS.add(m);
    }
  }
  /* --- подсветка внутреннего объёма --- */
  if(cut){
    var pl=new THREE.PointLight(0xdfeaf2,0.55,L*1.5,1.4);
    pl.position.set(-L*0.22,y+R*0.45,-R*0.3); gS.add(pl);
    var pl2=new THREE.PointLight(0xdfeaf2,0.55,L*1.5,1.4);
    pl2.position.set(L*0.22,y+R*0.45,-R*0.3); gS.add(pl2);
  }
  /* --- вода --- */
  if(P.WATER&&cut&&G.hw>20) waterMesh();
}
function waterMesh(){
  var Ri=G.Ri, yw=G.yw-G.axis, L=G.Lin;
  if(yw<=-Ri+2) return;
  var sh=new THREE.Shape();
  if(yw>=Ri-2){
    sh.moveTo(0,-Ri); sh.absarc(0,0,Ri,-Math.PI/2,Math.PI/2,false); sh.lineTo(0,-Ri);
  }else{
    var xw=Math.sqrt(Math.max(1,Ri*Ri-yw*yw)), fw=Math.atan2(yw,xw);
    sh.moveTo(0,-Ri); sh.absarc(0,0,Ri,-Math.PI/2,fw,false); sh.lineTo(0,yw); sh.lineTo(0,-Ri);
  }
  var g=new THREE.ExtrudeGeometry(sh,{depth:L,bevelEnabled:false,curveSegments:72});
  g.rotateY(Math.PI/2); g.translate(-L/2,0,0);
  var m=new THREE.Mesh(g,MAT.water); m.position.y=G.axis; m.renderOrder=2; gS.add(m);
}
function buildSupports(){
  var y0=G.y0,R=G.R;
  G.supX.forEach(function(x){
    box(G.supW*1.25,G.pad,G.supD*1.02,MAT.base,x,G.pad/2,0);          /* фундаментная подушка */
    box(G.supW,y0-G.pad,G.supD,MAT.base,x,G.pad+(y0-G.pad)/2,0);      /* тело опоры */
    /* седло — обхват обечайки */
    var wrap=Math.acos(Math.max(-1,Math.min(1,(G.axis-G.saddleTop)/R)));
    var g=new THREE.CylinderGeometry(R+18,R+18,G.supW,64,1,true,Math.PI/2-wrap,2*wrap);
    g.rotateZ(Math.PI/2);
    var m=new THREE.Mesh(g,MAT.base); m.position.set(x,G.axis,0);
    m.castShadow=true;m.receiveShadow=true;gS.add(m);
    box(G.supW,40,G.supD,MAT.base,x,y0-20,0,true);
  });
}

function buildPlatforms(){
  var y=G.platY, z0=G.platZ0, z1=G.platZ1, w=G.platW;
  G.plat.forEach(function(p,i){
    var lad=G.lad[i]||G.lad[0];
    box(p.x1-p.x0,50,w,MAT.beam,(p.x0+p.x1)/2,y-25,(z0+z1)/2);            /* настил */
    box(p.x1-p.x0,120,80,MAT.beam,(p.x0+p.x1)/2,y-110,z0+50,true);        /* продольные балки */
    box(p.x1-p.x0,120,80,MAT.beam,(p.x0+p.x1)/2,y-110,z1-50,true);
    /* стойки настила от обечайки */
    [p.x0+320,(p.x0+p.x1)/2,p.x1-320].forEach(function(px){
      [z0+140,z1-140].forEach(function(pz){
        var yt=G.axis+Math.sqrt(Math.max(0,G.R*G.R-pz*pz));
        var hh=y-140-yt; if(hh<50) return;
        box(80,hh,80,MAT.beam,px,yt+hh/2,pz,true);
      });
    });
    /* подкос от боковины к вылету настила */
    [p.x0+320,p.x1-320].forEach(function(px){
      box(70,90,Math.abs(z0)*0.5,MAT.beam,px,y-190,z0+Math.abs(z0)*0.22,true);
    });
    railing(p.x0,p.x1,z0,z1,y,D.RAIL,MAT.beam,[lad.x-lad.w/2,lad.x+lad.w/2]);
    ladder(lad.x,G.ladZ,0,y+900,lad.w,MAT.beam);                          /* наружная лестница */
  });
}
function buildNozzles(){
  var R=G.R,L=G.L,y=G.axis,td=P.TD;
  /* люки Ду800 с горловиной и крышкой */
  G.plat.forEach(function(p){
    var hr=G.hatch/2, yt=y+R;
    tube(hr,hr,320,MAT.pipe,p.hx,yt+120,0,'Y',48);
    tube(hr*1.16,hr*1.16,40,MAT.pipe,p.hx,yt+280,0,'Y',48);
    tube(hr*1.16,hr*1.16,26,MAT.pipe,p.hx,yt+310,0,'Y',48);
    for(var a=0;a<12;a++){var an=a/12*Math.PI*2;
      tube(16,16,60,MAT.pipe,p.hx+Math.sin(an)*hr*1.06,yt+300,Math.cos(an)*hr*1.06,'Y',8);}
  });
  /* патрубки сверху (Ду150 / Ду50 / Ду50) */
  G.topn.forEach(function(n){
    nozzle(n.dn,n.dn>100?340:150,n.x,y+R-20,0,'Y+');
  });
  /* левое днище: Ду150 вверху + 2×Ду125 внизу */
  var xL=-L/2, xR=L/2, kr=G.R/D.R;
  nozzle(150*kr,220,xL,G.y0+2*G.R*0.955,0,'X-');
  [-300*kr,300*kr].forEach(function(z){ nozzle(125*kr,200,xL,G.y0+2*G.R*0.173,z,'X-'); });
  /* правое днище: Ду150 + Ду125 + Ду50 */
  nozzle(150*kr,220,xR,G.y0+2*G.R*0.173,0,'X+');
  nozzle(125*kr,200,xR,G.y0+2*G.R*0.42,300*kr,'X+');
  nozzle(50*kr,180,xR,G.y0+2*G.R*0.08,-300*kr,'X+');
  /* нижний слив Ду50 */
  nozzle(50*kr,220,L*0.42,G.y0+10,0,'Y-');
  /* ТЭН 10 кВт — 2 шт, по одному на секцию, врезка в обечайку сбоку внизу */
  [-1,1].forEach(function(s){
    var x=s*L*0.30, zc=-Math.sqrt(Math.max(0,G.R*G.R-Math.pow(G.R*0.62,2)));
    nozzle(200*kr,180,x,y-G.R*0.62,zc,'Z-');
    var rl=G.R*1.15;
    var m=new THREE.Mesh(new THREE.CylinderGeometry(26,26,rl,12),MAT.pipe);
    m.rotation.x=Math.PI/2; m.position.set(x,y-G.R*0.62,zc+rl/2); m.castShadow=true; gS.add(m);
    var m2=new THREE.Mesh(new THREE.CylinderGeometry(26,26,rl*0.9,12),MAT.pipe);
    m2.rotation.x=Math.PI/2; m2.position.set(x+140,y-G.R*0.68,zc+rl*0.45); gS.add(m2);
  });
  /* уровнемеры — 2 шт сверху */
  [-1,1].forEach(function(s){
    var x=s*L*0.20;
    nozzle(80*kr,120,x,y+G.R-20,0,'Y+');
    var m=new THREE.Mesh(new THREE.BoxGeometry(180,260,180),MAT.pipe);
    m.position.set(x,y+G.R+230,0); m.castShadow=true; gS.add(m);
  });
  /* внутренние лестницы под люками */
  if(P.CUT) G.plat.forEach(function(p){
    ladder(p.hx,-G.R*0.72,G.axis-G.R+90,G.axis+G.R-70,460,MAT.beam);
  });
}

function buildInsul(){
  var R=G.R+G.ins, L=G.L+2*G.ins, cut=P.CUT;
  var g=new THREE.CylinderGeometry(R,R,L-2*G.ins,72,1,true,cut?Math.PI/2:0,cut?Math.PI:Math.PI*2);
  g.rotateZ(Math.PI/2);
  var m=new THREE.Mesh(g,MAT.insul); m.position.y=G.axis; gS.add(m);
  [-1,1].forEach(function(s){
    var d=new THREE.CircleGeometry(R,72,cut?-Math.PI/2:0,cut?Math.PI:Math.PI*2);
    d.rotateY(Math.PI/2); d.translate(s*(L/2-G.ins),0,0);
    var mm=new THREE.Mesh(d,MAT.insul); mm.position.y=G.axis; gS.add(mm);
  });
}

function build(){
  if(gS){root.remove(gS);root.remove(gE);root.remove(gD);}
  gS=new THREE.Group();gE=new THREE.Group();gD=new THREE.Group();
  root.add(gS);root.add(gE);root.add(gD);
  geom(); applyColors();
  buildTank();
  if(P.SUP)  buildSupports();
  if(P.PLAT) buildPlatforms();
  if(P.NOZ)  buildNozzles();
  if(P.INSUL)buildInsul();
}

build();
root.remove(gE,gD);
root.scale.setScalar(.001);
root.name='steelTank';
return root;
};
