/* ==========================================================================
   CAIO — site-wide logic (drop-in)
   - Price wiring (INR/USD) + CTA links
   - Visit beacons (Make webhook → optional GAS fallback)
   - GA4 custom events (non-PII)
   - Optional contact form capture (email DOMAIN only)
   ========================================================================== */

/* ---------------------
   CONFIG — EDIT THESE
   --------------------- */
var DEMO_URL = "https://caio-frontend.vercel.app/signup?plan=demo";

/* Primary webhook (Make): */
var MAKE_WEBHOOK = "https://hook.eu2.make.com/r6wwqfuhd7owzp5glusn4o1en0phdmg5";

/* Optional fallback (Google Apps Script Web App doPost): */
var GAS_FALLBACK = "https://script.google.com/macros/s/AKfycbxeFzLF-Zv7GmMMXql8PJM6uiPE5WpU9O3g69v8_DdzEsK4EToZH-VX643_w9wOoane/exec"; 

/* GA4 custom event names: */
var GA4_EVENTS = { page: "caio_page_beacon", dwell: "caio_dwell_ping", lead: "caio_lead_submit" };

/* Logical source tags sent to Make/GAS: */
var SOURCES = { page: "website", form: "website-form" };

/* Razorpay payment pages: */
var RZP_LINKS = {
  inr: { pro: "https://rzp.io/rzp/0cPc21s", pro_plus: "https://rzp.io/rzp/ACy9fQf", premium: "https://rzp.io/rzp/dyD6BmX1" },
  usd: { pro: "https://rzp.io/rzp/limEk7z", pro_plus: "https://rzp.io/rzp/P8K8wv50", premium: "https://rzp.io/rzp/LrzjAdwV" }
};

/* Static price table (numbers only): */
var PRICING = {
  pro:      { INR: 1999, USD: 25 },
  pro_plus: { INR: 3999, USD: 49 },
  premium:  { INR: 7999, USD: 99 }
};
var DEFAULT_CURRENCY = "INR";
var PAY_INTERVAL_TEXT = "/ month";

/* Debug surface (DevTools): */
try { window.__CAIO_DEBUG = { MAKE_WEBHOOK: MAKE_WEBHOOK, GAS_FALLBACK: GAS_FALLBACK, SOURCES: SOURCES, GA4_EVENTS: GA4_EVENTS }; } catch (_e) {}

/* ---------------------
   UTILS (no PII)
   --------------------- */
function safeGetLanguage() {
  try {
    var ls = (navigator.languages && navigator.languages.length) ? navigator.languages[0] : (navigator.language || "en");
    return ls || "en";
  } catch (_e) { return "en"; }
}
function detectCurrency() {
  try {
    var url = new URL(window.location.href);
    var q = (url.searchParams.get("currency") || "").toLowerCase();
    if (q === "inr" || q === "usd") { try { localStorage.setItem("caio_currency", q); } catch (_e) {} return q; }
  } catch (_e) {}

  try {
    var saved = (localStorage.getItem("caio_currency") || "").toLowerCase();
    if (saved === "inr" || saved === "usd") return saved;
  } catch (_e) {}

  try {
    var tz = (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || "";
    var lang = safeGetLanguage().toUpperCase();
    if ((tz && tz.indexOf("Asia/Kolkata") === 0) || /-IN$/.test(lang)) return "inr";
  } catch (_e) {}

  return (DEFAULT_CURRENCY || "INR").toLowerCase() === "inr" ? "inr" : "usd";
}
function localeForCurrency(cur) {
  return (cur || "").toUpperCase() === "INR" ? "en-IN" : safeGetLanguage();
}
function fmtMoney(amount, cur) {
  try {
    return new Intl.NumberFormat(localeForCurrency(cur), {
      style: "currency", currency: (cur || "USD").toUpperCase(),
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount);
  } catch (_e) {
    return (cur || "CUR") + " " + amount;
  }
}
function trackGA4(ev, params) {
  try { if (window.gtag) { window.gtag("event", ev, params || {}); } } catch (_e) {}
  try { if (window.dataLayer) { window.dataLayer.push({ event: ev, params: params || {} }); } } catch (_e) {}
}
function postJSON(url, payload) {
  if (!url) return Promise.resolve(false);
  var body = JSON.stringify(payload || {});
  try {
    if (navigator.sendBeacon) {
      var ok = navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      if (ok) return Promise.resolve(true);
    }
  } catch (_e) {}
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body,
    keepalive: true,
    mode: "cors",
    cache: "no-store",
    credentials: "omit"
  }).then(function (r) { return !!r && r.ok; }).catch(function () { return false; });
}
function qsAll(sel) { try { return Array.prototype.slice.call(document.querySelectorAll(sel)); } catch (_e) { return []; } }

/* ---------------------
   ATTRIBUTION + VISITOR
   --------------------- */
var VID_KEY = "caio_visitor_id";
var VISITOR_ID = (function () {
  try {
    var v = localStorage.getItem(VID_KEY);
    if (v) return v;
    v = "CAIO-" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem(VID_KEY, v);
    return v;
  } catch (_e) { return "CAIO-" + Math.random().toString(36).slice(2, 12); }
})();
function persistAttribution() {
  var bag = {};
  try {
    var url = new URL(window.location.href);
    var keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem("caio_attr") || "{}"); } catch (_e) { saved = {}; }
    var dirty = false;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i]; var v = url.searchParams.get(k);
      if (v) { saved[k] = v; dirty = true; }
    }
    if (dirty) { try { localStorage.setItem("caio_attr", JSON.stringify(saved)); } catch (_e2) {} }
    bag = saved;
  } catch (_e3) {}
  return bag;
}

/* ---------------------
   PRICING + CTAs
   --------------------- */
function applyPlanHref(plan, url) {
  var mapId = plan === "pro_plus" ? "proplus" : plan;
  var sels = [
    '[data-event="cta_pricing_' + plan + '"]',
    '[data-plan="' + (plan === "pro_plus" ? "pro+" : plan) + '"]',
    '#cta-' + mapId,
    'a[href="/' + (plan === "pro_plus" ? "pro-plus" : plan) + '"]',
    'a[href="/checkout/' + (plan === "pro_plus" ? "pro-plus" : plan) + '"]'
  ];
  var seen = [];
  for (var s = 0; s < sels.length; s++) {
    var arr = qsAll(sels[s]);
    for (var i = 0; i < arr.length; i++) {
      var a = arr[i];
      if (seen.indexOf(a) !== -1) continue;
      seen.push(a);
      try { a.href = url; a.rel = "noopener"; a.setAttribute("data-currency", detectCurrency()); } catch (_e) {}
    }
  }
}
function paintPrices(currencyFlag) {
  var cur3 = (currencyFlag || detectCurrency()).toUpperCase();
  var rows = [
    ["pro", PRICING.pro[cur3]],
    ["pro_plus", PRICING.pro_plus[cur3]],
    ["premium", PRICING.premium[cur3]]
  ];
  for (var r = 0; r < rows.length; r++) {
    var key = rows[r][0], amount = rows[r][1];
    if (typeof amount === "undefined") continue;
    var pretty = fmtMoney(amount, cur3);
    var nodes = qsAll('[data-price="' + key + '"]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var mode = (el.getAttribute("data-mode") || "full").toLowerCase();
      try {
        el.textContent = mode === "amount" ? pretty : (pretty + " " + PAY_INTERVAL_TEXT);
        el.setAttribute("data-currency", currencyFlag);
      } catch (_e) {}
    }
  }
}
function wirePricingByGeo() {
  var flag = detectCurrency();                   // "inr" | "usd"
  var links = RZP_LINKS[flag] || RZP_LINKS.usd;  // default to USD links if missing
  applyPlanHref("pro", links.pro);
  applyPlanHref("pro_plus", links.pro_plus);
  applyPlanHref("premium", links.premium);
  paintPrices(flag);
}
function wireDemoLinks() {
  var nodes = qsAll('a[data-plan="demo"], a[href="/demo"]');
  for (var i = 0; i < nodes.length; i++) { try { nodes[i].href = DEMO_URL; nodes[i].rel = "noopener"; } catch (_e) {} }
}

/* ---------------------
   VISIT BEACON + DWELL
   --------------------- */
function beaconOncePerPage() {
  var key = "caio_beacon_" + window.location.pathname + "|" + (document.referrer || "");
  try { if (sessionStorage.getItem(key)) return; } catch (_e) {}

  var attr = persistAttribution();
  var payload = {
    source: SOURCES.page,
    visitor_id: VISITOR_ID,
    domain: location.hostname,
    page: location.pathname,
    referrer: document.referrer || "direct",
    user_agent: navigator.userAgent || "",
    timestamp: new Date().toISOString(),
    currency: detectCurrency()
  };
  for (var k in attr) { if (attr.hasOwnProperty(k)) payload[k] = attr[k]; }

  (function () {
    var triedMake = false;
    if (MAKE_WEBHOOK && MAKE_WEBHOOK.indexOf("REPLACE_WITH_YOUR_WEBHOOK_ID") === -1) {
      triedMake = true;
      postJSON(MAKE_WEBHOOK, payload).then(function (ok) {
        if (!ok && GAS_FALLBACK) postJSON(GAS_FALLBACK, payload);
      });
    } else if (GAS_FALLBACK) {
      postJSON(GAS_FALLBACK, payload);
    }
  })();

  trackGA4(GA4_EVENTS.page, { visitor_id: VISITOR_ID, page: payload.page, referrer: payload.referrer });
  try { sessionStorage.setItem(key, "1"); } catch (_e2) {}
}
function startDwellPings() {
  var secs = 0;
  setInterval(function () {
    secs += 15;
    var attr = persistAttribution();
    var payload = {
      event: "dwell",
      source: SOURCES.page,
      visitor_id: VISITOR_ID,
      page: location.pathname,
      dwell_seconds: secs,
      timestamp: new Date().toISOString()
    };
    for (var k in attr) { if (attr.hasOwnProperty(k)) payload[k] = attr[k]; }
    if (MAKE_WEBHOOK) postJSON(MAKE_WEBHOOK, payload);
    trackGA4(GA4_EVENTS.dwell, { visitor_id: VISITOR_ID, page: location.pathname, dwell_seconds: secs });
  }, 15000);
}

/* ---------------------
   FORM CAPTURE (optional)
   - expects <form id="contactForm"> with #email and optional #name
   - sends only email DOMAIN (no PII)
   --------------------- */
function bindContactForm() {
  var form = document.getElementById("contactForm");
  if (!form) return;
  form.addEventListener("submit", function () {
    try {
      var email = ""; var name = "";
      var emailEl = document.getElementById("email"); if (emailEl) email = (emailEl.value || "").trim();
      var nameEl = document.getElementById("name");   if (nameEl)  name  = (nameEl.value || "").trim();
      var emailDomain = "";
      if (email && email.indexOf("@") > -1) emailDomain = email.split("@")[1];

      var attr = persistAttribution();
      var payload = {
        source: SOURCES.form,
        visitor_id: VISITOR_ID,
        domain: location.hostname,
        page: location.pathname,
        referrer: document.referrer || "direct",
        timestamp: new Date().toISOString(),
        email_domain: emailDomain,
        name: name || ""
      };
      for (var k in attr) { if (attr.hasOwnProperty(k)) payload[k] = attr[k]; }

      if (MAKE_WEBHOOK) {
        postJSON(MAKE_WEBHOOK, payload).then(function (ok) {
          if (!ok && GAS_FALLBACK) postJSON(GAS_FALLBACK, payload);
        });
      } else if (GAS_FALLBACK) {
        postJSON(GAS_FALLBACK, payload);
      }

      trackGA4(GA4_EVENTS.lead, { visitor_id: VISITOR_ID, page: location.pathname, referrer: document.referrer || "direct" });
    } catch (_e) {}
  });
}

/* ---------------------
   GLOBAL INIT
   --------------------- */
function initCAIO() {
  try { wireDemoLinks(); } catch (_e) {}
  try { wirePricingByGeo(); } catch (_e2) {}
  try { var y = document.getElementById("y"); if (y) y.textContent = (new Date()).getFullYear(); } catch (_e3) {}

  try { beaconOncePerPage(); } catch (_e4) {}
  try { startDwellPings(); } catch (_e5) {}
  try { bindContactForm(); } catch (_e6) {}
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCAIO);
} else {
  try { initCAIO(); } catch (_e7) {}
}

/* Minimal click tracking via [data-event] */
document.addEventListener("click", function (e) {
  try {
    var el = e.target && e.target.closest ? e.target.closest("[data-event]") : null;
    if (!el) return;
    var ev = el.getAttribute("data-event") || "";
    if (ev) trackGA4(ev, { text: (el.textContent || "").trim() });
  } catch (_e) {}
}, true);

/* ========================== CAIO Beacon & Dwell (ADD-ON) ========================== */
(function () {
  if (window.__CAIO_BEACON_INSTALLED__) return; // prevent duplicates
  window.__CAIO_BEACON_INSTALLED__ = true;

  // --- gentle reads of existing globals (don’t overwrite anything) ---
  var MAKE_WEBHOOK = (typeof window.MAKE_WEBHOOK === "string" && window.MAKE_WEBHOOK) || "";
  var GAS_FALLBACK = (typeof window.GAS_FALLBACK === "string" && window.GAS_FALLBACK) || "";
  var GA4_EVENTS = window.GA4_EVENTS || { page: "caio_page_beacon", dwell: "caio_dwell_ping" };
  var SOURCES = window.SOURCES || { page: "website" };

  // visitor id: reuse if present, otherwise create once (but don’t export)
  var VISITOR_ID = (function () {
    if (window.VISITOR_ID) return window.VISITOR_ID;
    try {
      var k = "caio_visitor_id";
      var v = localStorage.getItem(k);
      if (!v) { v = "CAIO-" + Math.random().toString(36).slice(2, 12); localStorage.setItem(k, v); }
      return v;
    } catch (_) { return "CAIO-" + Math.random().toString(36).slice(2, 12); }
  })();

  // small utils kept local to avoid conflicts
  function trackGA4(ev, params) {
    try { if (window.gtag) window.gtag("event", ev, params || {}); } catch (_) {}
    try { if (window.dataLayer) window.dataLayer.push({ event: ev, params: params || {} }); } catch (_) {}
  }
  function postJSON(url, payload) {
    if (!url) return Promise.resolve(false);
    var body = JSON.stringify(payload || {});
    try {
      if (navigator.sendBeacon) {
        var ok = navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
        if (ok) return Promise.resolve(true);
      }
    } catch (_){}
    return fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: body, keepalive: true, mode: "cors", cache: "no-store", credentials: "omit"
    }).then(function (r) { return !!r && r.ok; }).catch(function () { return false; });
  }
  function persistAttribution() {
    var bag = {};
    try {
      var url = new URL(window.location.href);
      var keys = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid"];
      var saved = {}; try { saved = JSON.parse(localStorage.getItem("caio_attr") || "{}"); } catch(_) { saved = {}; }
      var dirty = false;
      keys.forEach(function (k) {
        var v = url.searchParams.get(k);
        if (v) { saved[k] = v; dirty = true; }
      });
      if (dirty) { try { localStorage.setItem("caio_attr", JSON.stringify(saved)); } catch(_){} }
      bag = saved;
    } catch(_){}
    return bag;
  }

  // --- one-time page beacon per page/referrer combo (session) ---
  function beaconOncePerPage() {
    var key = "caio_beacon|" + location.pathname + "|" + (document.referrer || "direct");
    try { if (sessionStorage.getItem(key)) return; } catch(_) {}

    var attr = persistAttribution();
    var payload = {
      source: SOURCES.page,
      visitor_id: VISITOR_ID,
      domain: location.hostname,
      page: location.pathname,
      referrer: document.referrer || "direct",
      timestamp: new Date().toISOString()
    };
    for (var k in attr) if (Object.prototype.hasOwnProperty.call(attr, k)) payload[k] = attr[k];

    // send to Make (fallback to GAS if provided)
    (function () {
      if (MAKE_WEBHOOK) {
        postJSON(MAKE_WEBHOOK, payload).then(function (ok) {
          if (!ok && GAS_FALLBACK) postJSON(GAS_FALLBACK, payload);
        });
      } else if (GAS_FALLBACK) {
        postJSON(GAS_FALLBACK, payload);
      }
    })();

    // GA4 event
    trackGA4(GA4_EVENTS.page, {
      visitor_id: VISITOR_ID,
      page: payload.page,
      referrer: payload.referrer
    });

    try { sessionStorage.setItem(key, "1"); } catch(_) {}
  }

  // --- 15-second dwell pings (repeat) ---
  function startDwellPings() {
    var secs = 0;
    setInterval(function () {
      secs += 15;
      var attr = persistAttribution();
      var payload = {
        event: "dwell",
        source: SOURCES.page,
        visitor_id: VISITOR_ID,
        page: location.pathname,
        dwell_seconds: secs,
        timestamp: new Date().toISOString()
      };
      for (var k in attr) if (Object.prototype.hasOwnProperty.call(attr, k)) payload[k] = attr[k];

      if (MAKE_WEBHOOK) postJSON(MAKE_WEBHOOK, payload);
      else if (GAS_FALLBACK) postJSON(GAS_FALLBACK, payload);

      trackGA4(GA4_EVENTS.dwell, {
        visitor_id: VISITOR_ID,
        page: location.pathname,
        dwell_seconds: secs
      });
    }, 15000);
  }

  // init safely alongside your existing boot logic
  function initAddon() { try { beaconOncePerPage(); } catch(_) {} try { startDwellPings(); } catch(_) {} }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAddon);
  } else {
    initAddon();
  }
})();
