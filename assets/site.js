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
  p.innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/DgcVLyYmFB0?autoplay=1&start=28&rel=0" title="CVS Yakıt Koruma Sistemleri – Nasıl Kurulur?" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
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
    btn.disabled=true; btn.textContent='Gönderiliyor…'; msg.className='form-msg'; msg.innerHTML='';
    var txt='Merhaba, CVS yakıt koruma için teklif almak istiyorum.\nAd Soyad: '+ad+'\nFirma: '+(fd.get('firma')||'-')+'\nAraç tipi: '+fd.get('arac_tipi')+'\nAraç sayısı: '+(fd.get('arac_sayisi')||'-')+'\nTelefon: '+fd.get('telefon');
    var wa='https://wa.me/905323978397?text='+encodeURIComponent(txt);
    function done(ok){
      btn.disabled=false; btn.textContent=label;
      if(ok){msg.className='form-msg ok';msg.innerHTML='<b>Teşekkürler'+(ad?' '+esc(ad.split(' ')[0]):'')+'!</b> Talebiniz bize ulaştı. En kısa sürede '+esc(fd.get('telefon'))+' numarasından size dönüş yapacağız.';f.reset()}
      else{msg.className='form-msg err';msg.innerHTML='Şu an form bağlantısı kurulamadı. Talebinizi tek tıkla WhatsApp\'tan iletebilirsiniz.<br><a href="'+wa+'" target="_blank" rel="noopener">WhatsApp ile gönder →</a>'}
      msg.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
    fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fd).toString()})
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
      f.title='CVS Yakıt Koruma Sistemleri – Nasıl Kurulur?';
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
