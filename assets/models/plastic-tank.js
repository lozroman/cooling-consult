/* Anonymous equipment geometry adapted from the supplied model. */
window.CCEquipmentFactories=window.CCEquipmentFactories||{};
window.CCEquipmentFactories.plasticTank=function(THREE){
'use strict';
var BASE={D:1026,H:1476,SW:8,INS:30,LVL:85,
          NU:2,DU:7,ZU:1376,AU:90,
          NL:2,DL:7,ZL:138,AL:90,
          HD:600,NT:2,DT:1,EXT:150};

/* ГОСТ 33259-2015, PN10: Ду, наружн. Ø трубы ПНД, Ø фланца, число болтов */
var DNT=[{dn:15,od:20,fd:95,nb:4},{dn:20,od:25,fd:105,nb:4},{dn:25,od:32,fd:115,nb:4},
         {dn:32,od:40,fd:140,nb:4},{dn:40,od:50,fd:150,nb:4},{dn:50,od:63,fd:165,nb:4},
         {dn:65,od:75,fd:185,nb:4},{dn:80,od:90,fd:200,nb:8},{dn:100,od:110,fd:220,nb:8},
         {dn:125,od:140,fd:250,nb:8},{dn:150,od:160,fd:285,nb:8},{dn:200,od:225,fd:340,nb:8}];
var GK=['body','base','pipe','hatch','insul','cut','water'];
var Y0=-30;
var P={c:{body:'#33383b',base:'#22282b',pipe:'#2b3134',hatch:'#3d4348',insul:'#d8d2c4',cut:'#c3ccd2',water:'#2f8fd0'},metal:10,rough:66,
SEC:false,WAT:false,INSU:false,RIB:true,LUG:true,LG:true,BOLT:true,EDG:false,DIM:false};
Object.keys(BASE).forEach(function(k){P[k]=BASE[k];});
function M(){return new THREE.MeshStandardMaterial({color:0xffffff,metalness:.5,roughness:.5,side:THREE.DoubleSide});}
var MAT={glass:new THREE.MeshStandardMaterial({color:0xbfe6f5,metalness:.1,roughness:.15,
                transparent:true,opacity:.30,side:THREE.DoubleSide}),
         bolt:new THREE.MeshStandardMaterial({color:0x8c959b,metalness:.85,roughness:.35})};
GK.forEach(function(k){MAT[k]=M();});
MAT.water.transparent=true; MAT.water.opacity=.46;
MAT.insul.transparent=true; MAT.insul.opacity=.72;
var EDGE_MAT=new THREE.LineBasicMaterial({color:0x33393d,transparent:true,opacity:.85});

function applyColors(){
  var m=P.metal/100, r=Math.max(.08,P.rough/100);
  GK.forEach(function(k){MAT[k].color.set(P.c[k]).convertSRGBToLinear();
    MAT[k].metalness=m;MAT[k].roughness=r;});
  MAT.pipe.metalness=Math.min(1,m+.30);
  MAT.hatch.metalness=Math.min(1,m+.20);
  MAT.cut.metalness=0.15; MAT.cut.roughness=0.55;
  MAT.water.metalness=0.05; MAT.water.roughness=0.12;
  MAT.insul.metalness=0.02; MAT.insul.roughness=0.95;
  MAT.bolt.color.set('#8c959b').convertSRGBToLinear();
  MAT.glass.color.set('#bfe6f5').convertSRGBToLinear();
}
var root=new THREE.Group(),gS,gE,gD;
var SEG=96, NOE=false, EX=[];

function add(m,noEdge,ang){
  m.castShadow=true;m.receiveShadow=true;gS.add(m);
  if(!noEdge){var e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry,ang||28),EDGE_MAT);
    e.position.copy(m.position);e.rotation.copy(m.rotation);e.scale.copy(m.scale);
    if(NOE){gS.add(e);e.visible=P.EDG;EX.push(e);}else{gE.add(e);}}
  return m;
}
function box(w,h,d,mat,cx,cy,cz,ry,noEdge){
  var m=new THREE.Mesh(new THREE.BoxGeometry(Math.max(w,.5),Math.max(h,.5),Math.max(d,.5)),mat);
  m.position.set(cx,cy,cz); if(ry)m.rotation.y=ry; return add(m,noEdge);
}
function cyl(r1,r2,h,mat,cx,cy,cz,rx,seg,noEdge){
  var m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,Math.max(h,.4),seg||40),mat);
  m.position.set(cx,cy,cz); if(rx)m.rotation.x=rx; return add(m,noEdge,34);
}
/* тело вращения по профилю [[r,y],...]; в разрезе — половина + плоские крышки */
function lathe(pts,mat,sec,cutMat){
  var v=pts.map(function(p){return new THREE.Vector2(Math.max(p[0],0.001),p[1]);});
  var ph0=sec?Math.PI/2:0, phL=sec?Math.PI:Math.PI*2;
  var g=new THREE.LatheGeometry(v,sec?Math.round(SEG/2):SEG,ph0,phL);
  var m=new THREE.Mesh(g,mat); m.castShadow=true;m.receiveShadow=true;gS.add(m);
  if(sec){
    var sh=new THREE.Shape();
    sh.moveTo(pts[0][0],pts[0][1]);
    for(var i=1;i<pts.length;i++) sh.lineTo(pts[i][0],pts[i][1]);
    sh.closePath();
    var cg=new THREE.ShapeGeometry(sh);
    [0,Math.PI].forEach(function(a){
      var c=new THREE.Mesh(cg,cutMat||mat); c.rotation.y=a; c.castShadow=true; gS.add(c);
    });
  }
  return m;
}
function ringEdge(r,y,sec){        /* контурная окружность для читаемости */
  var pts=[],n=sec?49:97,ph0=sec?Math.PI/2:0,phL=sec?Math.PI:Math.PI*2;
  for(var i=0;i<n;i++){var a=ph0+phL*i/(n-1);pts.push(new THREE.Vector3(Math.sin(a)*r,y,Math.cos(a)*r));}
  gE.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),EDGE_MAT));
}

/* патрубок: втулка ПНД + свободный прижимной фланец, ось радиальная */
function nozzleRad(a,y,dn,R,Ro,L,sec){
  if(sec&&Math.cos(a)>0.02) return;
  var g=new THREE.Group(); g.rotation.y=a; root.add(g);
  var keep=gS; gS=new THREE.Group(); g.add(gS); NOE=true;
  var r0=R-P.SW, r1=Ro+L;
  cyl(dn.od/2,dn.od/2,r1-r0,MAT.pipe,0,y,(r0+r1)/2,Math.PI/2,32);
  cyl(dn.od/2+13,dn.od/2+13,14,MAT.pipe,0,y,r1-32,Math.PI/2,36);
  cyl(dn.fd/2,dn.fd/2,22,MAT.pipe,0,y,r1-11,Math.PI/2,44);
  if(P.BOLT){var bc=dn.fd-42;
    for(var i=0;i<dn.nb;i++){var t=Math.PI*2*i/dn.nb;
      var bo=new THREE.Mesh(new THREE.CylinderGeometry(8,8,34,10),MAT.bolt);
      bo.rotation.x=Math.PI/2; bo.position.set(Math.cos(t)*bc/2,y+Math.sin(t)*bc/2,r1-11);
      bo.castShadow=true; gS.add(bo);}}
  NOE=false; gS=keep;
}
/* вертикальный патрубок на крышке */
function nozzleTop(a,r,yTop,dn,h){
  var g=new THREE.Group(); g.rotation.y=a; root.add(g);
  var keep=gS; gS=new THREE.Group(); g.add(gS); NOE=true;
  cyl(dn.od/2,dn.od/2,h,MAT.pipe,0,yTop+h/2,r,0,28);
  cyl(dn.od/2+11,dn.od/2+11,12,MAT.pipe,0,yTop+h-24,r,0,32);
  cyl(dn.fd/2,dn.fd/2,20,MAT.pipe,0,yTop+h-8,r,0,40);
  if(P.BOLT){var bc=dn.fd-42;
    for(var i=0;i<dn.nb;i++){var t=Math.PI*2*i/dn.nb;
      var bo=new THREE.Mesh(new THREE.CylinderGeometry(7,7,30,10),MAT.bolt);
      bo.position.set(Math.cos(t)*bc/2,yTop+h-8,r+Math.sin(t)*bc/2);
      bo.castShadow=true; gS.add(bo);}}
  NOE=false; gS=keep;
}

/* =====================================================================
   6. ГЕОМЕТРИЯ
   ===================================================================== */
var CALC={};
function build(){
  while(root.children.length) root.remove(root.children[0]);
  gS=new THREE.Group();gE=new THREE.Group();gD=new THREE.Group();EX=[];
  root.add(gS);root.add(gE);root.add(gD);
  applyColors();

  var D=P.D, H=P.H, s=P.SW, R=D/2, Rb=R+15, sec=P.SEC;
  var ri=R-s;                       /* внутренний радиус */
  var hi=Math.max(0,H-2*s);         /* внутренняя высота */

  /* --- корпус: дно s, обечайка s, крышка s, борта Ø D+30 --- */
  var body=[[0,0],[Rb,0],[Rb,s],[R,s],[R,H-s],[Rb,H-s],[Rb,H],[0,H],
            [0,H-s],[ri,H-s],[ri,s],[0,s]];
  lathe(body,MAT.body,sec,MAT.cut);
  ringEdge(Rb,0,sec); ringEdge(Rb,s,sec); ringEdge(Rb,H-s,sec); ringEdge(Rb,H,sec);
  ringEdge(R,s,sec); ringEdge(R,H-s,sec);

  /* --- утеплитель ППУ: цилиндр + верх --- */
  var ti=P.INS;
  if(P.INSU&&ti>0){
    var ins=[[Rb,0],[Rb+ti,0],[Rb+ti,H+ti],[0,H+ti],[0,H],[Rb,H]];
    lathe(ins,MAT.insul,sec,MAT.insul);
    ringEdge(Rb+ti,0,sec); ringEdge(Rb+ti,H+ti,sec);
  }
  var Ro=Rb+((P.INSU&&ti>0)?ti:0);   /* наружный радиус изделия */

  /* --- жидкость --- */
  var hl=hi*P.LVL/100;
  if(P.WAT&&sec&&hl>1){
    lathe([[0,s],[ri,s],[ri,s+hl],[0,s+hl]],MAT.water,true,MAT.water);
  }

  /* --- опорное кольцо 30 мм + 4 ребра (вид Г-Г) --- */
  if(P.RIB){
    lathe([[Rb-60,Y0],[Rb,Y0],[Rb,0],[Rb-60,0]],MAT.base,sec,MAT.cut);
    for(var i=0;i<4;i++){
      var a=Math.PI/4+i*Math.PI/2, Lr=Rb-60;
      if(sec&&Math.cos(a)>0.02) continue;
      var m=box(14,30,Lr,MAT.base,0,Y0/2,0,a,true);
      m.position.set(Math.sin(a)*Lr/2,Y0/2,Math.cos(a)*Lr/2); m.rotation.y=a;
    }
    /* внутренние рёбра жёсткости под крышкой (вид А-А, Ø950 при Ø1026) */
    var rr=ri*0.94;
    lathe([[rr-s,H-s-110],[rr,H-s-110],[rr,H-s],[rr-s,H-s]],MAT.base,sec,MAT.cut);
    for(var j=0;j<4;j++){
      var b=j*Math.PI/2+Math.PI/4;
      if(sec&&Math.cos(b)>0.02) continue;
      var w=(ri-rr);
      var mm=box(s,100,w,MAT.base,0,H-s-50,0,b,true);
      mm.position.set(Math.sin(b)*(rr+w/2),H-s-50,Math.cos(b)*(rr+w/2));
      mm.rotation.y=b;
    }
  }

  /* --- люк технологический (поз. 4) --- */
  var hr=P.HD/2, hRim=38, yTop=H;
  lathe([[hr,yTop-s],[hr+s,yTop-s],[hr+s,yTop+hRim],[hr,yTop+hRim]],MAT.body,sec,MAT.cut);
  lathe([[hr,yTop+hRim],[hr+60,yTop+hRim],[hr+60,yTop+hRim+18],[hr,yTop+hRim+18]],MAT.hatch,sec,MAT.cut);
  lathe([[0,yTop+hRim+18],[hr+60,yTop+hRim+18],[hr+60,yTop+hRim+40],[0,yTop+hRim+40]],MAT.hatch,sec,MAT.cut);
  ringEdge(hr+s,yTop+hRim,sec); ringEdge(hr+60,yTop+hRim+18,sec); ringEdge(hr+60,yTop+hRim+40,sec);
  cyl(hr*0.30,hr*0.30,26,MAT.hatch,0,yTop+hRim+52,0,0,24);
  if(P.BOLT){
    for(var k=0;k<8;k++){var t=Math.PI*2*k/8, bcr=hr+38, bz=Math.sin(t)*bcr;
      if(sec&&bz>2) continue;
      var bo=new THREE.Mesh(new THREE.CylinderGeometry(9,9,48,10),MAT.bolt);
      bo.position.set(Math.cos(t)*bcr,yTop+hRim+24,bz);
      bo.castShadow=true; gS.add(bo);}
  }
  /* дыхательный клапан (поз. 5) — отм. +1694 при базовых габаритах */
  var vr=Math.max(30,R*0.075), va=Math.PI*0.58, vx=Math.sin(va)*R*0.60, vz=Math.cos(va)*R*0.60;
  if(!(sec&&vz>2)){
    cyl(vr,vr,150,MAT.hatch,vx,yTop+75,vz,0,26);
    cyl(vr*1.7,vr*1.7,26,MAT.hatch,vx,yTop+163,vz,0,30);
  }

  /* --- проушины 4 шт. L=220 --- */
  if(P.LUG){
    for(var q=0;q<4;q++){
      var la=Math.PI/4+q*Math.PI/2;
      if(sec&&Math.cos(la)>0.02) continue;
      var lug=box(10,58,Math.min(220,D*0.22),MAT.base,0,yTop+29,0,la,true);
      lug.position.set(Math.sin(la)*(R*0.72),yTop+29,Math.cos(la)*(R*0.72));
      lug.rotation.y=la;
    }
  }

  /* --- патрубки --- */
  var du=DNT[P.DU], dl=DNT[P.DL], dt=DNT[P.DT], L=P.EXT;
  var zu=Math.min(P.ZU,H-du.fd/2-20), zl=Math.min(P.ZL,H-dl.fd/2-20);
  var i2;
  for(i2=0;i2<P.NU;i2++) nozzleRad(P.AU*Math.PI/180+Math.PI*2*i2/Math.max(P.NU,1),zu,du,R,Ro,L,sec);
  for(i2=0;i2<P.NL;i2++) nozzleRad(P.AL*Math.PI/180+Math.PI*2*i2/Math.max(P.NL,1),zl,dl,R,Ro,L,sec);
  for(i2=0;i2<P.NT;i2++){
    var ta=Math.PI*0.72+Math.PI*2*i2/Math.max(P.NT,1);
    if(sec&&Math.cos(ta)>0.02) continue;
    nozzleTop(ta,R*0.78,yTop,dt,110);
  }

  /* --- уровнемер (поз. 6): прозрачная трубка D25 на выносе 65 --- */
  if(P.LG){
    var ga=Math.PI*0.62, gr=Ro+65;
    if(!(sec&&Math.cos(ga)>0.02)){
      var gg=new THREE.Group(); gg.rotation.y=ga; root.add(gg);
      var keep=gS; gS=new THREE.Group(); gg.add(gS); NOE=true;
      var y1=Math.min(zl,zu), y2=Math.max(zl,zu);
      var tube=new THREE.Mesh(new THREE.CylinderGeometry(13,13,Math.max(y2-y1,10),20),MAT.glass);
      tube.position.set(0,(y1+y2)/2,gr); gS.add(tube);
      var wl=s+hl;
      if(P.WAT&&wl>y1){
        var wt=new THREE.Mesh(new THREE.CylinderGeometry(11,11,Math.min(wl,y2)-y1,20),MAT.water);
        wt.position.set(0,(y1+Math.min(wl,y2))/2,gr); gS.add(wt);
      }
      [y1,y2].forEach(function(yy){
        cyl(14,14,gr-Ro+20,MAT.pipe,0,yy,(Ro+gr)/2,Math.PI/2,20);
        cyl(19,19,16,MAT.pipe,0,yy,gr,0,20);
      });
      NOE=false; gS=keep;
    }
  }

}

build();
root.remove(gE,gD);
root.scale.setScalar(.001);
root.name='plasticTank';
return root;
};
