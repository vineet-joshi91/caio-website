
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const href=a.getAttribute('href');
    if(href.length>1){
      const el=document.querySelector(href);
      if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth'}); }
    }
  });
});


// --- Simple CTA click tracking for GA/HubSpot/Hotjar ---
(function(){
  function track(evName, el){
    try {
      // GA4
      if (window.gtag) gtag('event', evName, {label: el?.textContent?.trim() || ''});
      // HubSpot
      if (window._hsq){ window._hsq.push(['trackEvent',{id: evName, value: 1}]); }
      // Hotjar
      if (window.hj){ hj('event', evName); }
    } catch(e){}
  }
  document.addEventListener('click', function(e){
    var el = e.target.closest('[data-event]');
    if (!el) return;
    var ev = el.getAttribute('data-event');
    if (ev) track(ev, el);
  }, true);
})();

