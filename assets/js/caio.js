/* ==========================================================================
   CAIO — Frontend helpers (drop-in)
   - Geo-routing for paid CTAs (INR vs USD) → Razorpay Payment Pages
   - Demo CTA normalization
   - Price painting (₹/$ per month) with locale-aware formatting
   - Lightweight analytics events
   - Global Beacon: Make.com webhook + GA4-safe dataLayer events
   ========================================================================== */

/* =======================
   CONFIG (EDIT THESE)
   ======================= */
const DEMO_URL = "https://caio-frontend.vercel.app/signup?plan=demo";

/** Make.com Webhook (REPLACE with your live URL) **/
const MAKE_WEBHOOK = "https://hook.eu2.make.com/REPLACE_WITH_YOUR_WEBHOOK_ID";

/** Optional: event names used in GTM/GA4 **/
const GA4_EVENTS = {
  page: "caio_page_beacon",
  lead: "caio_lead_submit"
};

/* ---------- Razorpay Payment Pages (INR & USD) ---------- */
const RZP_LINKS = {
  inr: {
    pro:      "https://rzp.io/rzp/0cPc21s",
    pro_plus: "https://rzp.io/rzp/ACy9fQf",
    premium:  "https://rzp.io/rzp/dyD6BmX1"
  },
  usd: {
    pro:      "https://rzp.io/rzp/limEk7z",
    pro_plus: "https://rzp.io/rzp/P8K8wv50",
    premium:  "https://rzp.io/rzp/LrzjAdwV"
  }
};

/* ---------- Static pricing ---------- */
const DEFAULT_CURRENCY = "INR";  // fallback if detection fails
const PAY_INTERVAL_TEXT = "/ month";
const PRICING = {
  pro:      { INR: 1999, USD: 25 },
  pro_plus: { INR: 3999, USD: 49 },
  premium:  { INR: 7999, USD: 99 }
};

/* =======================
   Currency detection & money formatting
   ======================= */
function detectCurrency() {
  try {
    const url = new URL(window.location.href);
    const q = (url.searchParams.get("currency") || "").toLowerCase();
    if (q === "inr" || q === "usd") {
      localStorage.setItem("caio_currency", q);
      return q;
    }
  } catch (e) {}

  const saved = (localStorage.getItem("caio_currency") || "").toLowerCase();
  if (saved === "inr" || saved === "usd") return saved;

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const lang = (navigator.language || "").toUpperCase();
    if (tz.startsWith("Asia/Kolkata") || lang.endsWith("-IN")) return "inr";
  } catch (e) {}

  return DEFAULT_CURRENCY.toLowerCase() === "inr" ? "inr" : "usd";
}

function localeForCurrency(cur) {
  if ((cur || '').toUpperCase() === 'INR') return 'en-IN';
  const langs = (navigator.languages && navigator.languages.length)
    ? navigator.languages
    : [navigator.language || 'en'];
  return langs[0] || 'en';
}

function fmtMoney(amount, cur) {
  try {
    const loc = localeForCurrency(cur);
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: (cur || 'USD').toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (e) {
    return `${cur} ${amount}`;
  }
}

/* =======================
   Lightweight analytics helpers
   ======================= */
function track(evName, el) {
  try { if (window.gtag) gtag("event", evName, { label: (el && el.textContent || "").trim() }); } catch(e){}
  try { if (window._hsq) window._hsq.push(["trackEvent", { id: evName, value: 1 }]); } catch(e){}
  try { if (window.hj)   hj("event", evName); } catch(e){}
}

/* =======================
   Demo CTA normalization
   ======================= */
function wireDemoLinks() {
  document.querySelectorAll('a[data-plan="demo"], a[href="/demo"]').forEach(a => {
    a.setAttribute("href", DEMO_URL);
    a.setAttribute("rel", "noopener");
  });
}

/* =======================
   Paid CTAs wiring
   ======================= */
function applyPlanHref(plan, url) {
  const selectors = [
    `[data-event="cta_pricing_${plan}"]`,                       // preferred (pricing.html)
    `[data-plan="${plan.replace("pro_plus","pro+")}"]`,         // data-plan
    `#cta-${plan.replace("pro_plus","proplus")}`,               // optional IDs
    `a[href="/${plan.replace("pro_plus","pro-plus")}"]`,        // legacy local
    `a[href="/checkout/${plan.replace("pro_plus","pro-plus")}"]`
  ];
  const seen = new Set();
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(a => {
      if (seen.has(a)) return;
      seen.add(a);
      a.setAttribute("href", url);
      a.setAttribute("rel", "noopener");
      a.dataset.currency = detectCurrency();
    });
  });
}

function wirePricingByGeo() {
  const curFlag = detectCurrency();        // "inr" | "usd"
  const links = RZP_LINKS[curFlag];

  applyPlanHref("pro",      links.pro);
  applyPlanHref("pro_plus", links.pro_plus);
  applyPlanHref("premium",  links.premium);

  paintPrices(curFlag);
}

/* =======================
   Price text painting
   ======================= */
function paintPrices(currencyFlag /* "inr"|"usd" */) {
  const cur3 = (currencyFlag || detectCurrency()).toUpperCase(); // "INR"|"USD"
  const map = [
    ["pro", PRICING.pro[cur3]],
    ["pro_plus", PRICING.pro_plus[cur3]],
    ["premium", PRICING.premium[cur3]]
  ];

  map.forEach(([key, amount]) => {
    if (typeof amount === "undefined") return;
    const pretty = fmtMoney(amount, cur3);

    document.querySelectorAll(`[data-price="${key}"]`).forEach(el => {
      const mode = (el.getAttribute("data-mode") || "full").toLowerCase();
      el.textContent = (mode === "amount") ? pretty : `${pretty} ${PAY_INTERVAL_TEXT}`;
      el.dataset.currency = currencyFlag;
    });
  });
}

/* =======================
   Global init + analytics click delegation
   ======================= */
document.addEventListener("DOMContentLoaded", function () {
  wireDemoLinks();
  wirePricingByGeo();

  // Footer year
  var y = document.getElementById("y");
  if (y) y.textContent = new Date().getFullYear();
});

document.addEventListener("click", function (e) {
  const el = e.target.closest("[data-event]");
  if (!el) return;
  const ev = el.getAttribute("data-event");
  if (ev) track(ev, el);
}, true);

/* Expose tiny API for console debug */
window.CAIO = Object.assign(window.CAIO || {}, {
  getCurrency: detectCurrency,
  wirePricingByGeo,
  paintPrices
});

/* ==========================================================================
   GLOBAL BEACON (Make webhook + GA4 dataLayer)
   - Sends page view + visitor_id to Make
   - Pushes GA4-safe events (no PII)
   - Captures optional form submits (email_domain to Make only)
   ========================================================================== */
(function () {
  // Stable visitor id (no PII)
  const KEY = "caio_visitor_id";
  let vid = localStorage.getItem(KEY);
  if (!vid) {
    vid = "CAIO-" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem(KEY, vid);
  }

  // Safe dataLayer push
  window.dataLayer = window.dataLayer || [];
  function pushDL(event, params) {
    window.dataLayer.push(Object.assign({ event }, params || {}));
  }

  // POST to Make webhook (survives page unload)
  async function postToMake(payload) {
    if (!MAKE_WEBHOOK || /REPLACE_WITH_YOUR_WEBHOOK_ID/.test(MAKE_WEBHOOK)) return;
    try {
      await fetch(MAKE_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (e) { /* silent */ }
  }

  // De-dupe page beacon per page load
  const pageOnceKey = "caio_beacon_sent_" + location.pathname + "|" + document.referrer;
  if (!sessionStorage.getItem(pageOnceKey)) {
    const pagePayload = {
      visitor_id: vid,
      domain: location.hostname,
      page: location.pathname,
      referrer: document.referrer || "direct",
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      source: "website"
    };
    postToMake(pagePayload);
    pushDL(GA4_EVENTS.page, pagePayload); // GA4 journey (no PII)
    sessionStorage.setItem(pageOnceKey, "1");
  }

  // Optional: capture a contact/demo form (adjust selectors if needed)
  // Expecting <form id="contactForm"> with inputs #email and #name
  const form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function () {
      const emailEl = document.getElementById("email");
      const nameEl  = document.getElementById("name");
      const email = emailEl ? (emailEl.value || "").trim() : "";
      const name  = nameEl ? (nameEl.value || "").trim() : "";
      const emailDomain = email.includes("@") ? email.split("@")[1] : "";

      // To Make (OK to include email domain; avoid sending full email)
      postToMake({
        visitor_id: vid,
        domain: location.hostname,
        page: location.pathname,
        referrer: document.referrer || "direct",
        timestamp: new Date().toISOString(),
        source: "website-form",
        email_domain: emailDomain,
        name: name
      });

      // To GA4 (NO PII)
      pushDL(GA4_EVENTS.lead, {
        visitor_id: vid,
        page: location.pathname,
        referrer: document.referrer || "direct"
      });
    });
  }
})();
