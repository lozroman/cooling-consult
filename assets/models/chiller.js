/* Equipment geometry adapted from the supplied model; no manufacturer marks. */
window.CCEquipmentFactories = window.CCEquipmentFactories || {};
window.CCEquipmentFactories.chiller = function(THREE) {
'use strict';
var S={
  /* ГАБАРИТ (по чертежу): длина 6405, ширина 2224, высота 2523 над опорой */
  L:6405, D:2224, H:2523,
  FRAME_H:2240,        /* верх несущей рамы = низ фан-дека */
  DECK_H:170,          /* высота фан-дека (2240..2410) */
  COWL_TOP:2523,       /* верх обечаек/лопастей */
  BASE_H:200,          /* высота базовой рамы */
  FOOT:110,            /* просвет опоры до земли */
  POST:90,             /* сечение угловой стойки */
  PT:22,               /* толщина панели обшивки */
  MACH_TOP:1150,       /* верх машинного отсека */
  FC_LEN:496,          /* модуль фрикулинга (торец X-) */
  PIPE_LEN:261,        /* обвязка на противоположном торце */
  BODY:5500,           /* корпус между ними */
  NF:4, NF2:2,         /* 4 ряда × 2 вентилятора */
  FAN_D:800,           /* Ø рабочего колеса (на чертеже не проставлен; принят по
                          условию размещения двух колёс в ширине 2224 с зазорами) */
  FAN_BAY:1090,        /* шаг вентиляторов по ширине */
  FAN_PITCH:1060,      /* шаг рядов вдоль длины */
  BM_ON:true, BM_W:200, BM_H:110, BM_LEN:2224,
  PL:{w:820,h:250,zc:1750}
};
var GK=['panel','frame','mesh','coil','fc','base','beam','pipe','fan'];
var P={c:{panel:'#c3ccd2',frame:'#4a555d',mesh:'#39434a',coil:'#8a6a4a',fc:'#7d8288',base:'#4a555d',beam:'#5c6670',pipe:'#3c464d',fan:'#2a3238'},metal:35,rough:52,
OPEN:false,FANS:true,COIL:true,FCM:true,BEAM:true,PLATE:false,EDG:false,DIM:false};
function meshTex(){                       /* перфорация: шаг 32 при 256×256 */
  var c=document.createElement('canvas');c.width=c.height=256;var g=c.getContext('2d');
  g.fillStyle='#ffffff';g.fillRect(0,0,256,256);
  g.fillStyle='#0a0d0f';
  for(var y=0;y<256;y+=32)for(var x=0;x<256;x+=32){g.beginPath();g.arc(x+16,y+16,11,0,7);g.fill();}
  var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
}
var MESH_TEX=meshTex();
function M(){return new THREE.MeshStandardMaterial({color:0xffffff,metalness:.5,roughness:.5});}
var MAT={dark:new THREE.MeshStandardMaterial({color:0x0d1013,metalness:.2,roughness:.9}),
         screen:new THREE.MeshStandardMaterial({color:0x16323d,metalness:.35,roughness:.22}),
         hmi:new THREE.MeshStandardMaterial({color:0x1e2a30,metalness:.3,roughness:.55}),
         lampR:new THREE.MeshStandardMaterial({color:0xc7392f,metalness:.15,roughness:.35,emissive:0x3a0d09}),
         lampG:new THREE.MeshStandardMaterial({color:0x3fae52,metalness:.15,roughness:.35,emissive:0x0d2a12}),
         lampY:new THREE.MeshStandardMaterial({color:0xd8a521,metalness:.15,roughness:.35,emissive:0x3a2a05}),
         knob:new THREE.MeshStandardMaterial({color:0x23292d,metalness:.3,roughness:.6}),
         plate:new THREE.MeshStandardMaterial({metalness:.35,roughness:.5})};
GK.forEach(function(k){MAT[k]=M();});
MAT.mesh.map=MESH_TEX;
var EDGE_MAT=new THREE.LineBasicMaterial({color:0x30393f,transparent:true,opacity:.55});


function applyColors(){
  GK.forEach(function(k){MAT[k].color.set(P.c[k]).convertSRGBToLinear();MAT[k].metalness=P.metal/100;MAT[k].roughness=P.rough/100;});
  MAT.pipe.metalness=.6;
}
var root=new THREE.Group(),gS,gE,gD,spin=[];
function box(w,h,d,mat,cx,cy,cz,noEdge){
  w=Math.max(w,.5);h=Math.max(h,.5);d=Math.max(d,.5);
  var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(cx,cy,cz);m.castShadow=true;m.receiveShadow=true;gS.add(m);
  if(!noEdge){var e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry,25),EDGE_MAT);
    e.position.copy(m.position);gE.add(e);}
  return m;
}
function cyl(r1,r2,h,seg,mat,cx,cy,cz,rx,rz,noEdge){
  var m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg),mat);
  m.position.set(cx,cy,cz); if(rx)m.rotation.x=rx; if(rz)m.rotation.z=rz;
  m.castShadow=true;m.receiveShadow=true;gS.add(m);
  if(!noEdge){var e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry,32),EDGE_MAT);
    e.position.copy(m.position);e.rotation.copy(m.rotation);gE.add(e);}
  return m;
}
/* панель с прямоугольным проёмом: режем на 4 куска, без булевых операций */
function panelWithOpening(axis,sg,fullW,z0,z1,off,t,op,mat){
  function put(w,h,cx,cz){
    if(w<1||h<1)return;
    if(axis==='Z') box(w,h,t,mat,cx,cz+h/2,sg*(off-t/2-4));
    else           box(t,h,w,mat,sg*(off-t/2-4),cz+h/2,cx);
  }
  if(!op){put(fullW,z1-z0,0,z0);return;}
  var side=(fullW-op.w)/2;
  put(side,z1-z0,-(op.w/2+side/2),z0);
  put(side,z1-z0, (op.w/2+side/2),z0);
  if(op.z1<z1-1) put(op.w,z1-op.z1,0,op.z1);
  if(op.z0>z0+1) put(op.w,op.z0-z0,0,z0);
}
/* патрубок с фланцем; face: '+Z' | '-Z' | '+X' | '-X' */
function nozzle(pd,od,L,face,a,z,hx,hz){
  if(face==='+Z'||face==='-Z'){var s=face==='+Z'?1:-1;
    cyl(pd/2,pd/2,L,28,MAT.pipe,a,z,s*(hz-10+L/2),Math.PI/2,0);
    cyl(od/2,od/2,26,32,MAT.pipe,a,z,s*(hz-10+L),Math.PI/2,0);
  }else{var sx=face==='+X'?1:-1;
    cyl(pd/2,pd/2,L,28,MAT.pipe,sx*(hx-10+L/2),z,a,0,Math.PI/2);
    cyl(od/2,od/2,26,32,MAT.pipe,sx*(hx-10+L),z,a,0,Math.PI/2);
  }
}

/* =====================================================================
   6. ГЕОМЕТРИЯ — ЭТО ЕДИНСТВЕННОЕ, ЧТО МЕНЯЕТСЯ ПОД КОНКРЕТНУЮ МАШИНУ
      Ниже — рабочий каркас-заглушка: стойки, пояса, панели, основание,
      балки, шильд. Дополняй проёмами, механизмами и патрубками.
   ===================================================================== */
function build(){
  if(gS){root.remove(gS,gE,gD);}
  gS=new THREE.Group();gE=new THREE.Group();gD=new THREE.Group();
  root.add(gS);root.add(gE);root.add(gD); spin=[];
  applyColors();

  var hx=S.L/2, hz=S.D/2, pw=S.POST, pt=S.PT;
  var xFC0=-hx, xFC1=-hx+S.FC_LEN;          /* модуль фрикулинга */
  var xB0=xFC1, xB1=xFC1+S.BODY;            /* корпус */
  var xP1=hx;                               /* обвязка */
  var BH=S.BASE_H, MT=S.MACH_TOP, FH=S.FRAME_H;

  /* ============ 1. ОСНОВАНИЕ / РАМА ============ */
  /* продольные швеллеры базы */
  [1,-1].forEach(function(sg){
    box(S.L,BH,150,MAT.base,0,BH/2,sg*(hz-75));
  });
  /* поперечные балки базы */
  var nCross=9;
  for(var i=0;i<nCross;i++){
    var x=-hx+40+ i*(S.L-80)/(nCross-1);
    box(90,BH*0.8,S.D-300,MAT.base,x,BH*0.45,0);
  }
  /* настил основания */
  box(S.L-20,26,S.D-320,MAT.base,0,BH-14,0,true);

  /* опорные лапы (по чертежу 110 мм просвет) */
  if(P.BEAM&&S.BM_ON){
    [-1,1].forEach(function(sx){
      [-1,1].forEach(function(sz){
        box(340,S.FOOT,300,MAT.beam,sx*(hx-190),-S.FOOT/2,sz*(hz-170));
      });
    });
    /* промежуточные опоры */
    [-0.5,0,0.5].forEach(function(f){
      [-1,1].forEach(function(sz){
        box(240,S.FOOT,260,MAT.beam,f*(S.L-800),-S.FOOT/2,sz*(hz-170));
      });
    });
  }

  /* ============ 2. КАРКАС ============ */
  /* угловые стойки */
  [[xFC0+pw/2,-1],[xFC0+pw/2,1],[xP1-pw/2,-1],[xP1-pw/2,1]].forEach(function(s){
    box(pw,FH-BH,pw,MAT.frame,s[0],BH+(FH-BH)/2,s[1]*(hz-pw/2));
  });
  /* промежуточные стойки: границы секций */
  var secX=[xB0, xB0+S.BODY*0.25, xB0+S.BODY*0.5, xB0+S.BODY*0.75, xB1];
  secX.forEach(function(x){
    [1,-1].forEach(function(sz){
      box(70,FH-BH,70,MAT.frame,x,BH+(FH-BH)/2,sz*(hz-35));
    });
  });
  /* верхний пояс рамы (под фан-деком) */
  [1,-1].forEach(function(sz){ box(S.L,120,110,MAT.frame,0,FH-60,sz*(hz-55)); });
  [1,-1].forEach(function(sx){ box(110,120,S.D,MAT.frame,sx*(hx-55),FH-60,0); });
  /* пояс на отметке верха машинного отсека */
  [1,-1].forEach(function(sz){ box(S.L,110,100,MAT.frame,0,MT-55,sz*(hz-50)); });
  [1,-1].forEach(function(sx){ box(100,110,S.D-200,MAT.frame,sx*(hx-50),MT-55,0); });
  /* нижний пояс машинного отсека */
  [1,-1].forEach(function(sz){ box(S.L,90,90,MAT.frame,0,BH+45,sz*(hz-45)); });

  /* ============ 3. МАШИННЫЙ ОТСЕК ============ */
  /* По виду снизу: зона агрегатов ~0..964 от одной длинной грани,
     центральный хребет ~1106..1275, гидравлика — у противоположной грани. */
  var mz0=BH+90, mz1=MT-110;
  var zMach =  hz-620;      /* ось компрессоров/ресиверов — со стороны щита */
  var zHydr = -hz+560;      /* ось испарителя и гидравлики — противоположная грань */

  /* --- ВНУТРЕННИЕ УЗЛЫ: строятся ВСЕГДА, объём под конденсаторами не пустует --- */
  var gMach=new THREE.Group();

  /* монтажная платформа агрегатов */
  box(S.BODY-120,40,900,MAT.base,(xB0+xB1)/2,mz0+20,zMach);

  for(var s2=0;s2<4;s2++){
    var cx=xB0+(s2+0.5)*S.BODY/4;
    var secW=S.BODY/4;

    /* --- ресивер: горизонтальный цилиндр с эллиптическими днищами --- */
    var rcY=mz0+300, rcR=210, rcL=secW-620;
    cyl(rcR,rcR,rcL,28,MAT.fan,cx-150,rcY,zMach-190,0,Math.PI/2);
    [-1,1].forEach(function(k){
      var cap=new THREE.Mesh(new THREE.SphereGeometry(rcR,22,14,0,Math.PI*2,0,Math.PI/2),MAT.fan);
      cap.position.set(cx-150+k*rcL/2,rcY,zMach-190);
      cap.rotation.z=k>0?-Math.PI/2:Math.PI/2; cap.castShadow=true; gS.add(cap);
    });
    /* опорные хомуты ресивера */
    [-1,1].forEach(function(k){
      box(60,rcR*2+60,rcR*2+40,MAT.pipe,cx-150+k*rcL*0.3,rcY-20,zMach-190);
    });

    /* --- два спиральных компрессора на секцию --- */
    [-1,1].forEach(function(k){
      var kx=cx+140+k*230;
      /* корпус */
      cyl(165,165,560,26,MAT.fan,kx,mz0+330,zMach+260);
      /* верхняя крышка-купол */
      var dm=new THREE.Mesh(new THREE.SphereGeometry(165,22,12,0,Math.PI*2,0,Math.PI/2),MAT.fan);
      dm.position.set(kx,mz0+610,zMach+260); dm.castShadow=true; gS.add(dm);
      /* клеммная коробка */
      box(150,170,120,MAT.dark,kx+150,mz0+430,zMach+260);
      /* виброопоры */
      [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(q){
        cyl(34,34,90,12,MAT.pipe,kx+q[0]*110,mz0+95,zMach+260+q[1]*110);
      });
      /* нагнетательный патрубок */
      cyl(46,46,260,14,MAT.pipe,kx,mz0+660,zMach+260,0,0);
      cyl(46,46,300,14,MAT.pipe,kx,mz0+780,zMach+150,Math.PI/2,0);
    });

    /* --- маслоотделитель --- */
    cyl(95,95,420,18,MAT.fan,cx+430,mz0+320,zMach+40);

    /* --- стойка секции --- */
    box(70,mz1-mz0,70,MAT.frame,cx+secW/2-35,(mz0+mz1)/2,zMach);
  }

  /* --- испаритель: кожухотрубный, вдоль машины --- */
  var evR=300, evL=S.BODY-900;
  cyl(evR,evR,evL,32,MAT.pipe,(xB0+xB1)/2,mz0+330,zHydr,0,Math.PI/2);
  [-1,1].forEach(function(k){
    /* крышки-фланцы испарителя */
    cyl(evR+40,evR+40,60,32,MAT.pipe,(xB0+xB1)/2+k*(evL/2+30),mz0+330,zHydr,0,Math.PI/2);
  });
  /* изоляция-обечайка (чуть больше диаметра) */
  /* опоры испарителя */
  [-1,0,1].forEach(function(k){
    box(120,300,evR*2+80,MAT.pipe,(xB0+xB1)/2+k*evL*0.34,mz0+150,zHydr);
  });

  /* --- гидравлическая обвязка: магистраль вдоль машины --- */
  [[-1,850],[1,300]].forEach(function(p){
    var zc = zHydr + p[0]*(evR+150);
    cyl(84,84,S.BODY-300,20,MAT.pipe,(xB0+xB1)/2,p[1],zc,0,Math.PI/2);
    /* подвесы магистрали */
    for(var q=0;q<5;q++){
      box(50,120,50,MAT.pipe,xB0+200+q*(S.BODY-400)/4,p[1]-110,zc);
    }
  });

  /* --- поперечные перемычки между агрегатами и гидравликой --- */
  for(var s3=0;s3<4;s3++){
    var px=xB0+(s3+0.5)*S.BODY/4;
    cyl(52,52,Math.abs(zHydr-zMach)-260,16,MAT.pipe,px,mz1-190,(zMach+zHydr)/2,Math.PI/2,0);
  }

  /* --- лицевые панели машинного отсека (снимаются чекбоксом) --- */
  if(!P.OPEN){
    for(var s=0;s<4;s++){
      var x0=xB0+s*S.BODY/4+40, x1=xB0+(s+1)*S.BODY/4-40;
      [1,-1].forEach(function(sz){
        box(x1-x0,mz1-mz0,pt,MAT.panel,(x0+x1)/2,(mz0+mz1)/2,sz*(hz-pt/2-6));
        /* ручка-замок */
        box(52,150,20,MAT.frame,(x0+x1)/2+(x1-x0)/2-90,(mz0+mz1)/2,sz*(hz-14));
        /* петли */
        [-1,1].forEach(function(kk){
          box(40,90,22,MAT.frame,x0+18,(mz0+mz1)/2+kk*(mz1-mz0)*0.33,sz*(hz-12));
        });
      });
    }
  }

  /* торцевые панели машинного отсека: по грани рамы, а не по габариту.
     Со стороны патрубков рама заканчивается на hx-261, дальше открытая зона обвязки. */
  box(pt,mz1-mz0,S.D-200,MAT.panel,hx-S.PIPE_LEN-pt/2,(mz0+mz1)/2,0);
  /* торец со стороны фрикулинга: центр занят навесным щитом, обшивка — по бокам */
  (function(){
    var eQW=S.D-360;                       /* ширина щита */
    var eSide=((S.D-200)-eQW)/2;
    [1,-1].forEach(function(sz){
      box(pt,mz1-mz0,eSide,MAT.panel,xFC0+pt/2+6,(mz0+mz1)/2,sz*(eQW/2+eSide/2));
    });
  })();

  /* ============ 4. V-БЛОК КОНДЕНСАТОРОВ ============ */
  var vz0=MT+40, vz1=FH-130;        /* низ и верх V-блока */
  var vH=vz1-vz0;
  var coilT=110;                     /* толщина пакета */
  var gapTop=170;                    /* просвет между вершинами V вверху */
  var spread=hz-215;                 /* полураскрытие внизу */
  var ang=Math.atan2(spread-gapTop/2, vH);
  var coilLen=Math.sqrt(vH*vH+(spread-gapTop/2)*(spread-gapTop/2));
  if(P.COIL){
    for(var r=0;r<S.NF;r++){
      var cxr=xB0+(r+0.5)*S.BODY/S.NF;
      var segW=S.BODY/S.NF-90;
      [1,-1].forEach(function(sz){
        var m=new THREE.Mesh(new THREE.BoxGeometry(segW,coilLen,coilT),MAT.coil);
        m.position.set(cxr,(vz0+vz1)/2, sz*(gapTop/2+spread)/2);
        m.rotation.x = sz*ang;
        m.castShadow=true;m.receiveShadow=true;gS.add(m);
        var e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry,25),EDGE_MAT);
        e.position.copy(m.position);e.rotation.copy(m.rotation);gE.add(e);
        /* коллекторы по краям пакета */
        [-1,1].forEach(function(kx){
          var c=new THREE.Mesh(new THREE.CylinderGeometry(42,42,coilLen-90,16),MAT.pipe);
          c.position.set(cxr+kx*(segW/2+26),(vz0+vz1)/2, sz*(gapTop/2+spread)/2);
          c.rotation.x=sz*ang; c.castShadow=true; gS.add(c);
        });
      });
      /* распорка в вершине V */
      box(segW,70,gapTop+40,MAT.frame,cxr,vz1-35,0);
      /* нижние опорные уголки */
      [1,-1].forEach(function(sz){
        box(segW,60,90,MAT.frame,cxr,vz0-30,sz*(spread-20));
      });
      /* торцевые заглушки секции V (треугольник аппроксимирован пластиной) */
      [-1,1].forEach(function(kx){
        [1,-1].forEach(function(sz){
          var p=new THREE.Mesh(new THREE.BoxGeometry(14,coilLen-40,coilT+24),MAT.frame);
          p.position.set(cxr+kx*(segW/2+8),(vz0+vz1)/2, sz*(gapTop/2+spread)/2);
          p.rotation.x=sz*ang; p.castShadow=true; gS.add(p);
        });
      });
    }
    /* защитные решётки на длинных гранях напротив V-блока */
    [1,-1].forEach(function(sz){
      var g=new THREE.Mesh(new THREE.BoxGeometry(S.BODY-60,vH+60,18),
        new THREE.MeshStandardMaterial({map:MAT.mesh.map,color:new THREE.Color(P.c.mesh),
          transparent:true,opacity:0.55,metalness:P.metal/100,roughness:Math.max(.08,P.rough/100)}));
      if(g.material.map){g.material.map=MAT.mesh.map.clone();g.material.map.needsUpdate=true;
        g.material.map.repeat.set((S.BODY-60)/270,(vH+60)/270);}
      g.position.set((xB0+xB1)/2,(vz0+vz1)/2, sz*(hz-14));
      g.castShadow=false;g.receiveShadow=true;gS.add(g);
    });
  }

  /* ============ 5. ФАН-ДЕК И ВЕНТИЛЯТОРЫ ============ */
  var deckY=FH+S.DECK_H/2-40;
  /* настил фан-дека с проёмами под вентиляторы: собираем из полос */
  var fanX=[], fanZ=[];
  for(var r2=0;r2<S.NF;r2++) fanX.push(xB0+(r2+0.5)*S.BODY/S.NF);
  fanZ=[-S.FAN_BAY/2, S.FAN_BAY/2];
  var deckX0=xB0-40, deckX1=xB1+40;
  /* рама фан-дека по периметру */
  [1,-1].forEach(function(sz){ box(deckX1-deckX0,110,120,MAT.panel,(deckX0+deckX1)/2,FH+55,sz*(hz-60)); });
  /* поперечины между рядами вентиляторов */
  for(var r3=0;r3<=S.NF;r3++){
    var xx=xB0+r3*S.BODY/S.NF;
    box(90,110,S.D-120,MAT.panel,xx,FH+55,0);
  }
  /* центральная продольная балка деки */
  box(deckX1-deckX0,100,90,MAT.panel,(deckX0+deckX1)/2,FH+50,0);

  if(P.FANS){
    fanX.forEach(function(fx){
      fanZ.forEach(function(fz){
        var yb=FH+40;
        /* конфузор / обечайка */
        var cw=new THREE.Mesh(new THREE.CylinderGeometry(S.FAN_D/2+42,S.FAN_D/2+8,190,40,1,true),MAT.frame);
        cw.position.set(fx,yb+95,fz); cw.castShadow=true;cw.receiveShadow=true;
        cw.material=MAT.frame; gS.add(cw);
        var ce=new THREE.LineSegments(new THREE.EdgesGeometry(cw.geometry,30),EDGE_MAT);
        ce.position.copy(cw.position); gE.add(ce);
        /* фланец обечайки */
        cyl(S.FAN_D/2+58,S.FAN_D/2+58,22,44,MAT.frame,fx,yb+2,fz);
        /* мотор */
        cyl(115,115,220,20,MAT.fan,fx,yb+105,fz);
        cyl(52,52,80,14,MAT.fan,fx,yb+195,fz);
        /* лопасти: одна вращающаяся группа */
        var rot=new THREE.Group(); rot.position.set(fx,yb+120,fz);
        var hub=new THREE.Mesh(new THREE.CylinderGeometry(150,170,120,26),MAT.fan);
        hub.castShadow=true; rot.add(hub);
        var rIn=175, rOut=S.FAN_D/2-25;
        for(var b=0;b<5;b++){
          var bl=new THREE.Mesh(new THREE.BoxGeometry(rOut-rIn,26,300),MAT.fan);
          var a2=b*Math.PI*2/5;
          bl.position.set(Math.cos(a2)*(rIn+rOut)/2, 8, Math.sin(a2)*(rIn+rOut)/2);
          bl.rotation.y=-a2; bl.rotation.z=0.38; bl.castShadow=true;
          rot.add(bl);
        }
        rot.rotation.x=Math.PI/2;   /* компенсация: вращаем вокруг оси Y сцены */
        rot.rotation.x=0;
        gS.add(rot); spin.push(rot);
        /* защитная решётка сверху: кольца + спицы */
        var gr=new THREE.Group(); gr.position.set(fx,yb+215,fz);
        [0.30,0.55,0.80,1.04].forEach(function(k){
          var tr=new THREE.Mesh(new THREE.TorusGeometry(S.FAN_D/2*k,10,8,44),MAT.mesh);
          tr.rotation.x=Math.PI/2; tr.castShadow=true; gr.add(tr);
        });
        for(var sp=0;sp<8;sp++){
          var a3=sp*Math.PI/4;
          var sb=new THREE.Mesh(new THREE.BoxGeometry(S.FAN_D/2,14,18),MAT.mesh);
          sb.position.set(Math.cos(a3)*S.FAN_D/4,0,Math.sin(a3)*S.FAN_D/4);
          sb.rotation.y=-a3; gr.add(sb);
        }
        gS.add(gr);
      });
    });
  }

  /* ============ 6. МОДУЛЬ ФРИКУЛИНГА (торец X-) ============ */
  if(P.FCM){
    var fz0=MT+40, fz1=FH-90;
    /* корпус модуля */
    box(S.FC_LEN-60,fz1-fz0,S.D-140,MAT.fc,xFC0+S.FC_LEN/2,(fz0+fz1)/2,0);
    /* оребрённый пакет — горизонтальные ламели на торцевой грани */
    var nl=16;
    for(var l=0;l<nl;l++){
      var ly=fz0+40+(l+0.5)*(fz1-fz0-80)/nl;
      box(28,(fz1-fz0-80)/nl*0.62,S.D-200,MAT.mesh,xFC0+22,ly,0,true);
    }
    /* рама модуля */
    [1,-1].forEach(function(sz){ box(S.FC_LEN,fz1-fz0,60,MAT.frame,xFC0+S.FC_LEN/2,(fz0+fz1)/2,sz*(S.D/2-40)); });
    box(S.FC_LEN,70,S.D-80,MAT.frame,xFC0+S.FC_LEN/2,fz1-35,0);
    box(S.FC_LEN,70,S.D-80,MAT.frame,xFC0+S.FC_LEN/2,fz0+35,0);
    /* коллекторы фрикулинга */
    [1,-1].forEach(function(sz){
      cyl(70,70,fz1-fz0-60,18,MAT.pipe,xFC0+120,(fz0+fz1)/2,sz*(S.D/2-140));
    });
    /* нижняя часть модуля — обшивка по бокам от навесного щита управления */
    var fcQW=S.D-360;                    /* ширина щита (см. раздел 8) */
    var fcSide=((S.D-140)-fcQW)/2;
    [1,-1].forEach(function(sz){
      box(S.FC_LEN-60,MT-BH-90,fcSide,MAT.fc,xFC0+S.FC_LEN/2,(BH+90+MT)/2,sz*(fcQW/2+fcSide/2));
    });
    /* перемычка над щитом */
    box(S.FC_LEN-60,90,fcQW,MAT.fc,xFC0+S.FC_LEN/2,MT-45,0);
  }

  /* ============ 7. ПАТРУБКИ Ду150 С ЗАТВОРАМИ (торец X+) ============ */
  /* По чертежу: вход отм. 850, выход отм. 300; корпус затвора выходит за раму
     (рама 5991, тело затвора до ~6150, рукоятка до ~6390 от нуля длины).
     Ду150: труба Ø168, фланец Ø300. */
  var nozA1 = -hz + 900;   /* выход теплоносителя */
  var nozA2 = -hz + 800;   /* вход теплоносителя */

  function valveAssembly(a,zc){
    var xFrame = hx - S.PIPE_LEN;      /* грань рамы */
    /* патрубок от испарителя наружу через грань рамы */
    cyl(84,84,S.PIPE_LEN+120,24,MAT.pipe,xFrame+(S.PIPE_LEN+120)/2-90,zc,a,0,Math.PI/2);
    /* ответный фланец на грани рамы */
    cyl(150,150,32,32,MAT.pipe,xFrame+34,zc,a,0,Math.PI/2);

    /* --- дисковый поворотный затвор (по чертежу — за габаритом рамы) --- */
    var xv = hx - 118;
    /* фланцы затвора */
    cyl(154,154,36,36,MAT.pipe,xv-64,zc,a,0,Math.PI/2);
    cyl(154,154,36,36,MAT.pipe,xv+64,zc,a,0,Math.PI/2);
    /* корпус (утолщение по центру) */
    cyl(124,124,96,32,MAT.fan,xv,zc,a,0,Math.PI/2);
    /* проушины корпуса */
    box(70,300,70,MAT.fan,xv,zc+120,a);
    /* болты фланцевого соединения — сталь, а не «каркас» */
    for(var b=0;b<8;b++){
      var ang=b*Math.PI/4+Math.PI/8;
      cyl(12,12,210,8,MAT.pipe,xv,zc+Math.cos(ang)*130,a+Math.sin(ang)*130,0,Math.PI/2,true);
    }
    /* шток */
    cyl(28,28,190,14,MAT.pipe,xv,zc+250,a);
    /* редуктор / шайба-указатель */
    cyl(96,96,64,20,MAT.fan,xv,zc+352,a);
    /* рукоятка-рычаг с сектором фиксации */
    var lever=new THREE.Mesh(new THREE.BoxGeometry(40,34,330),MAT.fan);
    lever.position.set(xv,zc+392,a+150); lever.castShadow=true;lever.receiveShadow=true; gS.add(lever);
    var le=new THREE.LineSegments(new THREE.EdgesGeometry(lever.geometry,25),EDGE_MAT);
    le.position.copy(lever.position); gE.add(le);
    /* рукоять-набалдашник */
    cyl(26,26,90,14,MAT.fan,xv,zc+392,a+300,Math.PI/2,0);
    /* сектор фиксации положения (дуга) */
    var arc=new THREE.Mesh(new THREE.TorusGeometry(170,13,10,24,Math.PI*0.6),MAT.pipe);
    arc.position.set(xv,zc+352,a); arc.rotation.y=Math.PI/2; arc.rotation.z=Math.PI*0.2;
    arc.castShadow=true; gS.add(arc);

    /* свободный фланец под трубопровод заказчика */
    cyl(152,152,34,32,MAT.pipe,hx-26,zc,a,0,Math.PI/2);
    /* торец трубы */
    cyl(84,84,120,24,MAT.pipe,hx-70,zc,a,0,Math.PI/2);
  }
  valveAssembly(nozA2,850,'вход');
  valveAssembly(nozA1,300,'выход');

  /* коллектор обвязки за торцом */
  /* вертикальный участок обвязки между патрубками */
  cyl(84,84,560,20,MAT.pipe,hx-S.PIPE_LEN+60,575,-hz+850);

  /* ============ 8. НАВЕСНОЙ ЩИТ УПРАВЛЕНИЯ (торец X-, напротив патрубков) ============ */
  /* Щит навешен на торцевую грань со стороны модуля фрикулинга — противоположной
     от патрубков. Низ щита на отметке 250 от земли (земля = -S.FOOT), до земли не доходит.
     Щит утоплен внутрь габарита: наружная грань совпадает с габаритной плоскостью 6405. */
  var qBot = -S.FOOT + 250;                  /* низ щита: 250 мм от земли */
  var qTop = MT - 60;                        /* верх — под поясом машинного отсека */
  var qH   = qTop - qBot;                    /* высота щита */
  var qY   = (qBot + qTop) / 2;              /* отметка центра */
  var qW   = S.D - 360;                      /* ширина по торцу, с полями от кромок */
  var qT   = 240;                            /* глубина навесного корпуса */
  var qZ   = 0;                              /* по центру торца */
  var qXo  = -hx;                            /* габаритная плоскость X- */
  var qREC = 60;                             /* лицевая плоскость дверей от габарита */
  var qF   = qXo + qREC;                     /* наружная поверхность дверей */
  var qX   = qF + qT/2;                      /* центр корпуса щита */

  /* корпус щита */
  box(qT,qH,qW,MAT.panel,qX,qY,qZ);
  /* задняя монтажная плита */
  box(24,qH-60,qW-60,MAT.frame,qX+qT/2-14,qY,qZ);
  /* козырёк от осадков */
  box(qT+80,26,qW+90,MAT.frame,qXo+20+(qT+80)/2,qY+qH/2+22,qZ);
  box(26,60,qW+90,MAT.frame,qXo+33,qY+qH/2+50,qZ);
  /* опорные кронштейны снизу (щит не доходит до земли) */
  [-1,1].forEach(function(k){
    box(qT-40,90,70,MAT.frame,qX,qBot-45,qZ+k*(qW/2-90));
  });

  /* две дверцы (открываются по ширине торца) */
  [-1,1].forEach(function(k){
    var dW=qW/2-16;
    box(26,qH-40,dW,MAT.panel,qF+13,qY,qZ+k*(qW/4));
    /* петли на внешней кромке */
    [-1,1].forEach(function(m){
      box(40,110,34,MAT.pipe,qF-4,qY+m*(qH*0.33),qZ+k*(qW/2-22));
    });
    /* замок-ригель на внутренней кромке */
    cyl(26,26,60,14,MAT.pipe,qF-16,qY,qZ+k*36,0,Math.PI/2);
    box(26,120,30,MAT.pipe,qF-10,qY,qZ+k*36);
  });

  /* --- контроллер на одной дверце --- */
  var ctZ=qZ-qW/4;
  box(22,300,430,MAT.hmi,qF-11,qY+qH*0.22,ctZ);              /* рамка контроллера */
  box(14,186,356,MAT.screen,qF-20,qY+qH*0.24,ctZ);          /* экран */
  for(var ln=0;ln<3;ln++){
    box(8,12,250-ln*46,MAT.frame,qF-26,qY+qH*0.24+42-ln*36,ctZ-40+ln*18,true);
  }
  /* кнопки контроллера */
  for(var kb=0;kb<4;kb++){
    cyl(19,19,16,12,MAT.knob,qF-18,qY+qH*0.22-108,ctZ-135+kb*90,0,Math.PI/2);
  }
  /* шильд контроллера */
  box(14,34,430,MAT.hmi,qF-12,qY+qH*0.22-190,ctZ);

  /* --- органы управления на второй дверце --- */
  var opZ=qZ+qW/4;
  /* вводной рубильник с поворотной рукояткой */
  box(20,190,190,MAT.hmi,qF-10,qY+qH*0.25,opZ+130);
  cyl(46,46,54,16,MAT.lampR,qF-30,qY+qH*0.25,opZ+130,0,Math.PI/2);
  box(30,42,150,MAT.lampY,qF-42,qY+qH*0.25,opZ+168);
  /* сигнальные лампы */
  [MAT.lampG,MAT.lampY,MAT.lampR].forEach(function(lm,ix){
    cyl(30,30,16,16,MAT.knob,qF-14,qY+qH*0.25,opZ-150+ix*80,0,Math.PI/2);
    cyl(22,22,22,16,lm,qF-22,qY+qH*0.25,opZ-150+ix*80,0,Math.PI/2);
  });
  /* кнопки «пуск/стоп» */
  [[-1,MAT.lampG],[1,MAT.lampR]].forEach(function(p){
    cyl(34,34,14,16,MAT.knob,qF-12,qY-qH*0.06,opZ-60+p[0]*90,0,Math.PI/2);
    cyl(26,26,24,16,p[1],qF-20,qY-qH*0.06,opZ-60+p[0]*90,0,Math.PI/2);
  });
  /* переключатель режима */
  cyl(34,34,20,16,MAT.knob,qF-14,qY-qH*0.06,opZ+140,0,Math.PI/2);
  box(20,20,80,MAT.knob,qF-26,qY-qH*0.06,opZ+140);
  /* карман для документации */
  box(30,150,320,MAT.panel,qF-14,qY-qH*0.30,opZ);
  box(40,14,320,MAT.pipe,qF-18,qY-qH*0.30-70,opZ);

  /* кабельные вводы снизу щита */
  for(var cg=0;cg<4;cg++){
    cyl(34,34,70,14,MAT.pipe,qX,qBot-30,qZ-210+cg*140);
  }

  gE.visible=false; gD.visible=false;
}

build();
root.remove(gE,gD);
root.scale.setScalar(.001);
root.name='chiller';
return root;
};
