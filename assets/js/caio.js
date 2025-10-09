/* /assets/js/caio.js
   Static pricing & copy sourced from backend .env at build-time.
   No network calls. Populates pricing text and tracks CTA clicks.
   Hooks:
     <span data-price="pro|pro_plus|premium" data-mode="full|amount"></span>
     <p data-copy="positioning"></p>
*/
// Canonical on-domain paths
const PLAN_PATHS = {
  demo:     "/demo",
  pro:      "/checkout/pro",
  pro_plus: "/checkout/pro-plus",
  premium:  "/checkout/premium"
};

// Legacy short paths we might still find in HTML
const LEGACY_TO_PLAN = {
  "/demo": "demo",
  "/pro": "pro",
  "/pro-plus": "pro_plus",
  "/premium": "premium"
};

(function wirePlanLinks(){
  // 1) Authoritative: data-plan
  document.querySelectorAll('[data-plan]').forEach(a=>{
    let key = (a.getAttribute('data-plan')||"").toLowerCase().replace("+","_plus").replace(" ","_");
    if (PLAN_PATHS[key]) {
      a.setAttribute("href", PLAN_PATHS[key]);
      a.setAttribute("rel","noopener");
    }
  });

  // 2) Fallback: legacy hrefs -> canonical paths
  document.querySelectorAll('a[href^="/"]').forEach(a=>{
    const href = a.getAttribute("href");
    const plan = LEGACY_TO_PLAN[href];
    if (plan && PLAN_PATHS[plan]) {
      a.setAttribute("href", PLAN_PATHS[plan]);
      a.setAttribute("rel","noopener");
    }
  });
})();

(function(){
  // ---- .env snapshot (from backend) ----
  var DEFAULT_CURRENCY = 'INR';            // PAY_DEFAULT_CURRENCY or DEFAULT_ADMIN_CURRENCY
  var PAY_INTERVAL_TEXT = 'every 1 monthly'; // PAY_INTERVAL_TEXT
  var POSITIONING_COPY = "CAIO replaces an entire C-Suite worth of insights at just ₹1,999 or $25 a month."; // POSITIONING_COPY

  var PRICING = {
    pro:      { INR: 1999, USD: 25 },     // PRO_PRICE_INR / PRO_PRICE_USD
    pro_plus: { INR: 3999, USD: 49 },     // PRO_PLUS_PRICE_INR / PRO_PLUS_PRICE_USD
    premium:  { INR: 7999, USD: 99 }      // PREMIUM_PRICE_INR / PREMIUM_PRICE_USD
  };
  // --------------------------------------

  function currencyFromQuery(){
    var q = new URLSearchParams(location.search);
    var force = (q.get('force')||'').toUpperCase();
    return (force==='INR'||force==='USD') ? force : DEFAULT_CURRENCY;
  }

  function fmtMoney(amount, cur){
    try {
      var loc = (cur==='USD') ? 'en-US' : 'en-IN';
      return new Intl.NumberFormat(loc, { style:'currency', currency:cur, maximumFractionDigits:0 }).format(amount);
    } catch(e){ return cur + ' ' + amount; }
  }

  function normalizeInterval(s){
    if(!s) return '/month';
    // Show a compact '/ month' style on UI but preserve your wording
    // e.g., "every 1 monthly" -> "/ month"
    return '/ month';
  }

  function paintPrices(){
    var cur = currencyFromQuery();
    [['pro','pro'],['pro_plus','pro_plus'],['premium','premium']].forEach(function(pair){
      var key = pair[0];
      var plan = PRICING[key];
      if(!plan) return;
      var amount = plan[cur];
      var pretty = fmtMoney(amount, cur);
      document.querySelectorAll('[data-price="'+pair[1]+'"]').forEach(function(el){
        var mode = el.getAttribute('data-mode') || 'full'; // 'amount' | 'full'
        el.textContent = (mode==='amount') ? pretty : (pretty + ' ' + normalizeInterval(PAY_INTERVAL_TEXT));
      });
    });
  }

  function paintCopy(){
    document.querySelectorAll('[data-copy="positioning"]').forEach(function(el){
      el.textContent = POSITIONING_COPY;
    });
  }

  // Minimal CTA click tracking (GA4 / HubSpot / Hotjar if present)
  function track(evName, el){
    try{ if(window.gtag) gtag('event', evName, {label:(el && el.textContent||'').trim()}); }catch(e){}
    try{ if(window._hsq) window._hsq.push(['trackEvent', {id:evName, value:1}]); }catch(e){}
    try{ if(window.hj) hj('event', evName); }catch(e){}
  }
  document.addEventListener('click', function(e){
    var el = e.target.closest('[data-event]');
    if(!el) return;
    var ev = el.getAttribute('data-event');
    if(ev) track(ev, el);
  }, true);

  document.addEventListener('DOMContentLoaded', function(){
    paintPrices();
    paintCopy();
    var y=document.getElementById('y'); if(y) y.textContent=new Date().getFullYear();
  });
})();
