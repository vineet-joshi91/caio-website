/* ==========================================================================
   CAIO — Frontend helpers (drop-in)
   - Geo-routing for paid CTAs (INR vs USD) → Razorpay Payment Pages
   - Demo CTA normalization
   - Price painting (₹/$ per month) with locale-aware formatting
   - Lightweight analytics events
   ========================================================================== */

/* ---------- DEMO ---------- */
const DEMO_URL = "https://caio-frontend.vercel.app/signup?plan=demo";

/* ---------- Razorpay Payment Pages (INR & USD) ---------- */
/* From your provided links */
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

/* ---------- Static pricing (same as earlier) ---------- */
const DEFAULT_CURRENCY = "INR";  // fallback if detection fails
const PAY_INTERVAL_TEXT = "/ month";
const PRICING = {
  pro:      { INR: 1999, USD: 25 },
  pro_plus: { INR: 3999, USD: 49 },
  premium:  { INR: 7999, USD: 99 }
};

/* ---------- Currency detection ---------- */
/* Order: URL override (?currency=inr|usd) > saved choice > heuristic > default */
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

/* ---------- Locale-aware money formatting ---------- */
/* INR: force en-IN for lakh/crore; others: use browser’s preferred locale */
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

/* ---------- Analytics helpers (silent if libs absent) ---------- */
function track(evName, el) {
  try { if (window.gtag) gtag("event", evName, { label: (el && el.textContent || "").trim() }); } catch(e){}
  try { if (window._hsq) window._hsq.push(["trackEvent", { id: evName, value: 1 }]); } catch(e){}
  try { if (window.hj)   hj("event", evName); } catch(e){}
}

/* ---------- DEMO link normalization ---------- */
function wireDemoLinks() {
  document.querySelectorAll('a[data-plan="demo"], a[href="/demo"]').forEach(a => {
    a.setAttribute("href", DEMO_URL);
    a.setAttribute("rel", "noopener");
  });
}

/* ---------- Paid CTAs wiring (multiple selector fallbacks) ---------- */
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

/* ---------- Price text painting ---------- */
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

/* ---------- Global init ---------- */
document.addEventListener("DOMContentLoaded", function () {
  wireDemoLinks();
  wirePricingByGeo();

  // Footer year
  var y = document.getElementById("y");
  if (y) y.textContent = new Date().getFullYear();
});

/* ---------- Analytics: delegate click events ---------- */
document.addEventListener("click", function (e) {
  const el = e.target.closest("[data-event]");
  if (!el) return;
  const ev = el.getAttribute("data-event");
  if (ev) track(ev, el);
}, true);

/* ---------- Minimal API for console debug ---------- */
window.CAIO = Object.assign(window.CAIO || {}, {
  getCurrency: detectCurrency,
  wirePricingByGeo,
  paintPrices
});
