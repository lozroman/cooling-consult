// Cooling Consult — общий скрипт сайта (редизайн 24.09.2026)

// ===== Настройки =====
var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===== Яндекс.Метрика: цели =====
(function(){
  var CID=110487168;
  window.ccGoal=function(name){ if(typeof ym==='function'){ try{ ym(CID,'reachGoal',name); }catch(e){} } };
  document.addEventListener('click', function(e){
    var el=e.target.closest ? e.target.closest('a,button') : null; if(!el) return;
    var g=el.getAttribute('data-goal'); if(g) window.ccGoal(g);
    if(el.classList.contains('row') && el.closest('.svc-col,.related')) window.ccGoal('service_row_click');
    var h=el.getAttribute('href')||'';
    if(h.indexOf('tel:')===0) window.ccGoal('phone_click');
    else if(h.indexOf('mailto:')===0) window.ccGoal('email_click');
    else if(h.indexOf('t.me/')>-1) window.ccGoal('telegram_click');
  }, true);
})();

// ===== Мобильное меню =====
(function(){
  var hdr=document.querySelector('.site-header'); if(!hdr) return;
  var b=hdr.querySelector('.burger'); if(!b) return;
  function set(open){
    hdr.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    b.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }
  b.addEventListener('click', function(){ set(!hdr.classList.contains('open')); });
  hdr.addEventListener('click', function(e){ if(e.target.closest('.mnav a')) set(false); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && hdr.classList.contains('open')){ set(false); b.focus(); } });
})();

// ===== Кнопка «Обсудить задачу» ведёт к форме на этой же странице, если она есть =====
(function(){
  if(!document.getElementById('zayavka')) return;
  document.querySelectorAll('a[href="index.html#zayavka"]').forEach(function(a){ a.setAttribute('href','#zayavka'); });
})();

// ===== Модальные окна (старые страницы) =====
function openModal(id){ var m=document.getElementById(id); if(m){m.classList.add('open');} }
function closeModal(el){ var m=el.closest('.modal'); if(m){m.classList.remove('open');} }
document.addEventListener('click', function(e){
  if(e.target.classList && e.target.classList.contains('modal')){ e.target.classList.remove('open'); }
  var t = e.target.closest('[data-modal]');
  if(t){ e.preventDefault(); openModal(t.getAttribute('data-modal')); }
});
document.addEventListener('keydown', function(e){
  if(e.key==='Escape'){ document.querySelectorAll('.modal.open').forEach(function(m){m.classList.remove('open');}); }
});

// ===== Cookie: необходимые всегда, аналитика (Метрика) — только после согласия =====
// cc_cookies: «all» — принял все, «necessary» — только необходимые. Нет значения — показываем баннер.
function ccCookieChoice(){ try{ return localStorage.getItem('cc_cookies'); }catch(e){ return null; } }
function ccSetCookieChoice(v){
  try{ localStorage.setItem('cc_cookies', v); }catch(e){}
  var c=document.getElementById('cookieBanner'); if(c){ c.classList.remove('show'); }
}
function acceptCookies(){ ccSetCookieChoice('all'); if(typeof window.ccMetrika==='function') window.ccMetrika(); }
function declineCookies(){
  var wasOn = !!window.ccMetrikaOn;
  ccSetCookieChoice('necessary');
  if(wasOn) location.reload();
}
function ccCookieSettings(){
  try{ localStorage.removeItem('cc_cookies'); }catch(e){}
  var c=document.getElementById('cookieBanner'); if(c){ c.classList.add('show'); var b=c.querySelector('button'); if(b) b.focus(); }
}
(function(){
  var c=document.getElementById('cookieBanner'); if(!c) return;
  if(!ccCookieChoice()) c.classList.add('show');
})();

// ===== Ротация последней строки заголовка =====
(function(){
  var ws=document.querySelectorAll('.rot .w'); if(ws.length<2 || REDUCED) return;
  var i=0;
  setInterval(function(){
    var p=i; i=(i+1)%ws.length;
    ws.forEach(function(w,k){ w.className='w'+(k===i?' on':(k===p?' out':'')); });
  }, 2400);
})();

// ===== Перекрестие с координатами над первым экраном =====
(function(){
  var h=document.getElementById('hero'), s=h && h.querySelector('.cross'); if(!s) return;
  if(!window.matchMedia('(pointer: fine) and (min-width: 1024px)').matches) return;
  var v=s.querySelector('.cx-v'), hz=s.querySelector('.cx-h'), r=s.querySelector('.cx-r'), t=s.querySelector('.cx-t');
  h.addEventListener('mousemove', function(e){
    var b=h.getBoundingClientRect(), x=Math.round(e.clientX-b.left), y=Math.round(e.clientY-b.top);
    s.setAttribute('viewBox','0 0 '+Math.round(b.width)+' '+Math.round(b.height));
    s.classList.add('on');
    v.setAttribute('x1',x); v.setAttribute('x2',x); v.setAttribute('y2',b.height);
    hz.setAttribute('y1',y); hz.setAttribute('y2',y); hz.setAttribute('x2',b.width);
    var lx=x+150>b.width?x-146:x+8, ly=y-32<0?y+8:y-32;
    r.setAttribute('x',lx); r.setAttribute('y',ly); t.setAttribute('x',lx+9); t.setAttribute('y',ly+16);
    t.textContent='X '+String(x).padStart(4,'0')+' · Y '+String(y).padStart(4,'0');
  });
  h.addEventListener('mouseleave', function(){ s.classList.remove('on'); });
})();

// ===== Появление блоков при прокрутке (один раз) =====
(function(){
  var els=document.querySelectorAll('.reveal'); if(!els.length) return;
  if(!('IntersectionObserver' in window) || REDUCED){ els.forEach(function(el){ el.classList.add('in'); }); return; }
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
  }, {threshold:.25});
  els.forEach(function(el){ io.observe(el); });
})();

// ===== Место под интерактивную 3D-модель: подгружаем, только если файл есть =====
(function(){
  document.querySelectorAll('.model-slot[data-src]').forEach(function(slot){
    var src=slot.getAttribute('data-src');
    fetch(src,{method:'HEAD'}).then(function(r){
      if(!r.ok) return;
      var f=document.createElement('iframe');
      f.src=src; f.loading='lazy'; f.title=slot.getAttribute('data-title')||'3D-модель';
      f.setAttribute('allowfullscreen','');
      slot.appendChild(f); slot.classList.add('is-loaded');
      var sec=slot.closest('section'); if(sec) sec.hidden=false;
      var open=document.querySelector('.model-open'); if(open){ open.href=src; open.hidden=false; }
    }).catch(function(){});
  });
})();

// ===== Индикатор карусели кейсов на телефоне =====
(function(){
  var box=document.querySelector('.cases'), dots=document.querySelectorAll('.dots span'); if(!box || !dots.length) return;
  box.addEventListener('scroll', function(){
    var cards=box.children, best=0, min=Infinity;
    for(var k=0;k<cards.length;k++){ var d=Math.abs(cards[k].offsetLeft-box.offsetLeft-box.scrollLeft); if(d<min){min=d;best=k;} }
    dots.forEach(function(s,k){ s.classList.toggle('on', k===best); });
  }, {passive:true});
})();

// ===== Калькулятор тепловой мощности (selection.html) =====
// Q = m * cp * ΔT.  m [кг/с] = расход[м3/ч] * плотность / 3600
var FLUIDS = {
  water:      {name:'Вода',                 rho:997,  cp:4.18},
  glycol30:   {name:'Этиленгликоль 30%',    rho:1040, cp:3.65},
  glycol40:   {name:'Этиленгликоль 40%',    rho:1058, cp:3.45},
  pglycol30:  {name:'Пропиленгликоль 30%',  rho:1025, cp:3.85},
  oil:        {name:'Масло минеральное',    rho:875,  cp:1.90},
  milk:       {name:'Молоко',               rho:1030, cp:3.93},
  brine:      {name:'Рассол NaCl 20%',      rho:1150, cp:3.30}
};
function recalcQ(){
  var f = document.getElementById('hotFluid');
  var flowEl = document.getElementById('flow');
  var t1El = document.getElementById('tHotIn'), t2El = document.getElementById('tHotOut');
  var out = document.getElementById('qValue');
  var outdt = document.getElementById('dtValue');
  if(!out || !t1El || !t2El) return;
  var t1 = parseFloat(t1El.value), t2 = parseFloat(t2El.value);
  var flow = parseFloat(flowEl ? flowEl.value : '');
  var fluid = FLUIDS[f && f.value ? f.value : 'water'] || FLUIDS.water;
  if(isFinite(flow) && isFinite(t1) && isFinite(t2)){
    var dt = Math.abs(t1 - t2);
    var m = flow * fluid.rho / 3600;        // кг/с
    var Q = m * fluid.cp * dt;              // кВт
    out.textContent = Q.toFixed(1).replace('.', ',');
    if(outdt) outdt.textContent = dt.toFixed(1).replace('.', ',');
    var hidden = document.getElementById('calcQ'); if(hidden) hidden.value = Q.toFixed(1)+' кВт';
  } else {
    out.textContent = '—';
    if(outdt) outdt.textContent = '—';
  }
}
document.addEventListener('input', function(e){
  if(e.target.closest('#selectForm')) recalcQ();
});

