// ===== Мобильное меню =====
document.addEventListener('click', function(e){
  var b = e.target.closest('.burger');
  if(b){ document.querySelector('.site-header').classList.toggle('open'); }
});

// ===== Модальные окна (контакты) =====
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

// ===== Cookie-баннер =====
(function(){
  try{
    if(!localStorage.getItem('cc_cookie_ok')){
      var c=document.getElementById('cookieBanner');
      if(c){ c.classList.add('show'); }
    }
  }catch(e){ var c=document.getElementById('cookieBanner'); if(c){c.classList.add('show');} }
})();
function acceptCookies(){
  try{ localStorage.setItem('cc_cookie_ok','1'); }catch(e){}
  var c=document.getElementById('cookieBanner'); if(c){ c.classList.remove('show'); }
}

// ===== Калькулятор тепловой мощности =====
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
  var t1 = parseFloat(document.getElementById('tHotIn').value);
  var t2 = parseFloat(document.getElementById('tHotOut').value);
  var flow = parseFloat(flowEl ? flowEl.value : '');
  var out = document.getElementById('qValue');
  var outdt = document.getElementById('dtValue');
  if(!out) return;
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

// ===== Отправка форм через Web3Forms =====
async function submitLead(form, msgId){
  var msg = document.getElementById(msgId);
  var btn = form.querySelector('button[type=submit]');
  var data = new FormData(form);
  if(btn){ btn.disabled = true; btn.dataset.t = btn.textContent; btn.textContent = 'Отправка…'; }
  try{
    var res = await fetch('https://api.web3forms.com/submit', {
      method:'POST', headers:{'Accept':'application/json'}, body:data
    });
    var json = await res.json();
    if(json.success){
      msg.className = 'form-msg ok';
      msg.textContent = 'Заявка отправлена. Мы свяжемся с вами по указанной почте в ближайшее время.';
      form.reset(); recalcQ();
    } else {
      throw new Error(json.message || 'error');
    }
  }catch(err){
    msg.className = 'form-msg err';
    msg.innerHTML = 'Не удалось отправить заявку. Напишите нам напрямую: <a href="mailto:info@cooling-consalt.ru">info@cooling-consalt.ru</a>';
  }
  if(btn){ btn.disabled = false; btn.textContent = btn.dataset.t; }
  msg.scrollIntoView({behavior:'smooth', block:'center'});
}
document.addEventListener('submit', function(e){
  var form = e.target;
  if(form.classList.contains('lead-form')){
    e.preventDefault();
    submitLead(form, form.getAttribute('data-msg'));
  }
});

// ===== Карусель на главной =====
(function(){
  var root = document.getElementById('heroCarousel');
  if(!root) return;
  var track = root.querySelector('.slides');
  var slides = root.querySelectorAll('.slide');
  var dotsWrap = root.querySelector('.dots');
  var i = 0, n = slides.length, timer = null;
  // точки
  for(var d=0; d<n; d++){
    var b = document.createElement('button');
    b.setAttribute('aria-label','Слайд '+(d+1));
    (function(idx){ b.addEventListener('click', function(){ go(idx); restart(); }); })(d);
    dotsWrap.appendChild(b);
  }
  var dots = dotsWrap.querySelectorAll('button');
  function go(idx){
    i = (idx + n) % n;
    track.style.transform = 'translateX(' + (-i*100) + '%)';
    for(var k=0;k<dots.length;k++){ dots[k].classList.toggle('active', k===i); }
  }
  function next(){ go(i+1); }
  function prev(){ go(i-1); }
  function start(){ timer = setInterval(next, 6000); }
  function stop(){ if(timer){ clearInterval(timer); timer=null; } }
  function restart(){ stop(); start(); }
  var nx = root.querySelector('.arrow.next'), pv = root.querySelector('.arrow.prev');
  if(nx) nx.addEventListener('click', function(){ next(); restart(); });
  if(pv) pv.addEventListener('click', function(){ prev(); restart(); });
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
  go(0); start();
})();
