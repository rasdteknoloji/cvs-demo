/* ---------- TEMA ---------- */
(function(){
  var saved=null; try{saved=localStorage.getItem('cvs-theme')}catch(e){}
  if(saved) document.documentElement.setAttribute('data-theme',saved);
  document.getElementById('themeBtn').addEventListener('click',function(){
    var cur=document.documentElement.getAttribute('data-theme')==='light'?'dark':'light';
    document.documentElement.setAttribute('data-theme',cur);
    try{localStorage.setItem('cvs-theme',cur)}catch(e){}
  });
})();

/* ---------- HEADER / MENÜ ---------- */
var hdr=document.getElementById('hdr');
window.addEventListener('scroll',function(){hdr.classList.toggle('scrolled',window.scrollY>40)},{passive:true});
var mnav=document.getElementById('mnav');
document.getElementById('burger').addEventListener('click',function(){mnav.classList.toggle('open')});
mnav.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){mnav.classList.remove('open')})});

/* ---------- REVEAL ---------- */
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});


/* ---------- GÖRSEL BÜYÜTME ---------- */
(function(){
  var z=document.querySelectorAll('.zoom'); if(!z.length) return;
  var lb=document.createElement('div'); lb.className='lightbox'; lb.setAttribute('role','dialog'); lb.setAttribute('aria-modal','true');
  lb.innerHTML='<img alt=""><div class="cap"></div><button type="button" aria-label="Kapat">&times;</button>';
  document.body.appendChild(lb);
  var im=lb.querySelector('img'), cap=lb.querySelector('.cap');
  function close(){lb.classList.remove('open');document.body.style.overflow=''}
  z.forEach(function(el){el.addEventListener('click',function(){
    im.src=el.currentSrc||el.src; im.alt=el.alt; cap.textContent=el.getAttribute('data-cap')||el.alt||'';
    lb.classList.add('open'); document.body.style.overflow='hidden';
  })});
  lb.addEventListener('click',function(e){if(e.target!==im)close()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
})();
/* ---------- VİDEO ---------- */
if(document.getElementById('playBtn'))document.getElementById('playBtn').addEventListener('click',function(){
  var p=document.getElementById('player');
  p.innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/DgcVLyYmFB0?autoplay=1&start=28&rel=0" title="CVS Системы защиты топлива — Как устанавливается?" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
});

/* ---------- TEKLİF FORMU: Netlify Forms, olmazsa WhatsApp ---------- */
(function(){
  var f=document.getElementById('teklifForm'); if(!f) return;
  var btn=f.querySelector('button[type=submit]'), msg=f.querySelector('.form-msg'), label=btn.textContent;
  function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  f.addEventListener('submit',function(e){
    e.preventDefault();
    if(f.web&&f.web.value) return;
    var fd=new FormData(f), ad=(fd.get('ad')||'').trim();
    btn.disabled=true; btn.textContent='Отправка…'; msg.className='form-msg'; msg.innerHTML='';
    var txt='Здравствуйте, хочу получить предложение на защиту топлива CVS.\nИмя: '+ad+'\nКомпания: '+(fd.get('firma')||'-')+'\nТип техники: '+fd.get('arac_tipi')+'\nКоличество: '+(fd.get('arac_sayisi')||'-')+'\nТелефон: '+fd.get('telefon');
    var wa='https://wa.me/905050509944?text='+encodeURIComponent(txt);
    function done(ok){
      btn.disabled=false; btn.textContent=label;
      if(ok){msg.className='form-msg ok';msg.innerHTML='<b>Спасибо'+(ad?' '+esc(ad.split(' ')[0]):'')+'!</b> Ваш запрос получен. Мы свяжемся с вами в ближайшее время по номеру '+esc(fd.get('telefon'))+'.';f.reset()}
      else{msg.className='form-msg err';msg.innerHTML='Сейчас не удалось отправить форму. Вы можете отправить запрос в WhatsApp одним нажатием.<br><a href="'+wa+'" target="_blank" rel="noopener">Отправить в WhatsApp →</a>'}
      msg.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
    fetch(f.getAttribute('data-post')||'/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams(fd).toString()})
      .then(function(r){done(r.ok)}).catch(function(){done(false)});
  });
})();

/* ---------- YOUTUBE: görsele tıklayınca yerinde oynat ----------
   • fareyle üzerine gelince YouTube alanlarına ön bağlantı (preconnect)
   • oynatıcı gerçekten oynamaya başlayana dek poster + yükleniyor halkası kalır (siyah kutu yok) */
(function(){
  var els=document.querySelectorAll('.yt[data-yt]'); if(!els.length) return;
  var pre=false;
  function preconnect(){
    if(pre) return; pre=true;
    ['https://www.youtube-nocookie.com','https://www.youtube.com','https://i.ytimg.com','https://www.gstatic.com'].forEach(function(h){
      var l=document.createElement('link'); l.rel='preconnect'; l.href=h; l.crossOrigin='anonymous'; document.head.appendChild(l);
      var d=document.createElement('link'); d.rel='dns-prefetch'; d.href=h; document.head.appendChild(d);
    });
  }
  els.forEach(function(el){
    function play(){
      if(el.classList.contains('on')) return;
      preconnect();
      var id=el.getAttribute('data-yt'), st=parseInt(el.getAttribute('data-start')||'0',10)||0, shown=false;
      var f=document.createElement('iframe');
      var org=/^https?:/.test(location.protocol)?'&origin='+encodeURIComponent(location.origin):'';
      f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&playsinline=1&enablejsapi=1'+(st>0?'&start='+st:'')+org;
      f.title='CVS Системы защиты топлива — Как устанавливается?';
      f.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'; f.allowFullscreen=true;
      function show(){ if(shown) return; shown=true; el.classList.remove('loading'); el.classList.add('live'); }
      function listen(){ try{ f.contentWindow.postMessage(JSON.stringify({event:'listening',id:'cvs-'+id,channel:'widget'}),'*'); }catch(e){} }
      window.addEventListener('message',function(e){
        if(!f.contentWindow||e.source!==f.contentWindow) return;
        var d=e.data; if(typeof d==='string'){ try{ d=JSON.parse(d); }catch(x){ return; } }
        if(!d) return;
        if(d.event==='onReady') listen();
        if((d.event==='onStateChange'&&d.info===1)||(d.event==='infoDelivery'&&d.info&&d.info.playerState===1)) show();
      });
      f.addEventListener('load',function(){ listen(); setTimeout(show,3500); });   /* otomatik oynatma engellenirse YouTube'un kendi düğmesi görünsün */
      setTimeout(show,9000);
      el.classList.add('on','loading'); el.appendChild(f);
    }
    el.addEventListener('pointerenter',preconnect,{once:true});
    el.addEventListener('focus',preconnect,{once:true});
    el.addEventListener('touchstart',preconnect,{once:true,passive:true});
    el.addEventListener('click',play);
    el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();play()}});
  });
  /* boşta kalınca da ön bağlantı */
  if('requestIdleCallback' in window) requestIdleCallback(preconnect,{timeout:4000}); else setTimeout(preconnect,3000);
})();

/* ---------- 3D HOLOGRAM: kare dizisi, sürükle-çevir + otomatik dönüş ---------- */
(function(){
  var box=document.getElementById('holo'); if(!box) return;
  var img=box.querySelector('.holo-frame'), N=parseInt(box.getAttribute('data-frames'),10)||64, tpl=box.getAttribute('data-src');
  var src=function(i){return tpl.replace('{n}',('00'+i).slice(-3))};
  var frames=[], loaded=0, cur=0, dir=1, auto=true, dragging=false, sx=0, sf=0, last=0, FPS=14;
  for(var i=0;i<N;i++){var im=new Image(); im.decoding='async'; im.src=src(i); im.onload=function(){loaded++}; frames.push(im);}
  function show(i){ i=((i%N)+N)%N; if(i===cur&&img.src.indexOf(src(i))>=0) return; cur=i; if(frames[i].complete&&frames[i].naturalWidth) img.src=frames[i].src; }
  function tick(t){
    if(auto&&!dragging&&t-last>1000/FPS){ last=t; var n=cur+dir; if(n>=N-1||n<=0) dir=-dir; show(n); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  function start(x){dragging=true;sx=x;sf=cur;box.classList.add('drag')}
  function move(x){ if(!dragging) return; var d=Math.round((x-sx)/6); show(sf-d); }
  function end(){ if(!dragging) return; dragging=false; box.classList.remove('drag'); clearTimeout(end.t); end.t=setTimeout(function(){auto=true},2500); }
  box.addEventListener('pointerdown',function(e){ if(e.button&&e.button!==0) return; auto=false; start(e.clientX); box.setPointerCapture&&box.setPointerCapture(e.pointerId); e.preventDefault(); });
  box.addEventListener('pointermove',function(e){ move(e.clientX); });
  box.addEventListener('pointerup',end); box.addEventListener('pointercancel',end); box.addEventListener('lostpointercapture',end);
  /* görünür değilken dur */
  if('IntersectionObserver' in window){ new IntersectionObserver(function(es){ auto=es[0].isIntersecting; },{threshold:.1}).observe(box); }
})();
