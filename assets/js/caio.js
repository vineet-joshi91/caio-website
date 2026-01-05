/* ==========================================================================
   CAIO — site-wide logic (credit-based)
   - CTA link wiring (Guided Trial + tiers)
   - Visit beacons (Make webhook → optional GAS fallback)
   - GA4 custom events (non-PII)
   - Optional contact form capture (email DOMAIN only)
   ========================================================================== */

/* ---------------------
   CONFIG — EDIT THESE
   --------------------- */

/**
 * App base (Next.js app) used for /signup, /login, /dashboard etc.
 * You already set window.CAIO_APP_BASE in HTML:
 *   <script>window.CAIO_APP_BASE="https://caioinsights.com";</script>
 */
var APP_BASE =
  (window && window.CAIO_APP_BASE) ||
  (location ? location.origin : "https://caioinsights.com");

/** Primary webhook (Make): */
var MAKE_WEBHOOK =
  "https://hook.eu2.make.com/r6wwqfuhd7owzp5glusn4o1en0phdmg5";

/** Optional fallback webhook (Google Apps Script) — leave "" to disable */
var GAS_FALLBACK = ""; // e.g. "https://script.google.com/macros/s/XXXXX/exec"

/**
 * If you still keep tier-based routing inside app, keep these.
 * If you *only* sell credits, you can still keep demo as primary CTA.
 */
var PLAN_URLS = {
  demo: APP_BASE + "/signup?plan=demo",
  pro: APP_BASE + "/signup?plan=pro",
  proplus: APP_BASE + "/signup?plan=proplus",
  premium: APP_BASE + "/signup?plan=premium"
};

/* ---------------------
   HELPERS
   --------------------- */
function qs(sel, root) {
  return (root || document).querySelector(sel);
}
function qsAll(sel, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(sel));
}
function safeLower(s) {
  return String(s || "").toLowerCase();
}
function once(fn) {
  var ran = false;
  return function () {
    if (ran) return;
    ran = true;
    fn();
  };
}

/* ---------------------
   LINK WIRING (IMPORTANT)
   --------------------- */

/**
 * 1) Rewrite any leftover Vercel host in <a href="...">
 *    This handles pages where old URLs are still present.
 */
function rewriteLegacyAppLinks() {
  var legacyHost = "caioinsights.com";
  var anchors = qsAll('a[href*="' + legacyHost + '"]');

  anchors.forEach(function (a) {
    try {
      var href = a.getAttribute("href") || "";
      // Replace only the host part (keep path/query)
      // Example: https://caioinsights.com/signup?plan=demo
      // becomes: https://caioinsights.com/signup?plan=demo
      href = href.replace("https://" + legacyHost, APP_BASE);
      href = href.replace("http://" + legacyHost, APP_BASE);
      a.setAttribute("href", href);
    } catch (e) {}
  });
}

/**
 * 2) Wire buttons/links based on data-plan or data-event conventions.
 *    Supports your current patterns across pages.
 */
function wirePlanLinks() {
  // Common selector patterns used across your HTML
  var planSelectors = [
    '[data-plan="demo"]',
    '[data-plan="pro"]',
    '[data-plan="proplus"]',
    '[data-plan="pro_plus"]',
    '[data-plan="premium"]'
  ];

  planSelectors.forEach(function (sel) {
    qsAll(sel).forEach(function (el) {
      var p = safeLower(el.getAttribute("data-plan"));
      // normalize pro_plus -> proplus
      if (p === "pro_plus" || p === "pro+") p = "proplus";
      var url = PLAN_URLS[p];
      if (!url) return;

      // Set href if it’s an anchor
      if (el.tagName && el.tagName.toLowerCase() === "a") {
        el.setAttribute("href", url);
        el.setAttribute("rel", "noopener");
      } else {
        // If it’s a button/div, click navigates
        el.addEventListener("click", function () {
          window.location.href = url;
        });
      }
    });
  });

  // Wire any CTA elements by data-event name pattern you use
  // Example: data-event="cta_demo_top" etc.
  var demoCtas = qsAll('[data-event*="demo"], [data-event*="trial"]');
  demoCtas.forEach(function (el) {
    // Only update if it’s clearly a “try demo / trial” CTA
    var txt = safeLower(el.textContent);
    var isTrialish =
      txt.indexOf("trial") !== -1 ||
      txt.indexOf("demo") !== -1 ||
      txt.indexOf("try") !== -1 ||
      txt.indexOf("upload") !== -1;

    if (!isTrialish) return;

    if (el.tagName && el.tagName.toLowerCase() === "a") {
      el.setAttribute("href", PLAN_URLS.demo);
      el.setAttribute("rel", "noopener");
    }
  });
}

/**
 * 3) Optional: If you want *all* “Start Guided Trial / Try CAIO” header buttons
 *    to always go to demo, you can force-wire by class.
 */
function forceWirePrimaryCTA() {
  // Conservative: only header nav primary buttons
  qsAll(".nav-cta a.btn.btn-primary").forEach(function (a) {
    a.setAttribute("href", PLAN_URLS.demo);
    a.setAttribute("rel", "noopener");
  });
}

/* ---------------------
   ANALYTICS (GA4 + events)
   --------------------- */
function trackGA4(eventName, params) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(
      Object.assign({ event: eventName }, params || {})
    );
  } catch (e) {}
}

function bindCtaEvents() {
  // Track clicks on anything that looks like a CTA button
  qsAll('a.btn, button.btn, a.btn-primary, button.btn-primary').forEach(function (el) {
    el.addEventListener("click", function () {
      var label = (el.textContent || "").trim().slice(0, 80);
      var href = el.getAttribute && el.getAttribute("href");

      trackGA4("caio_cta_click", {
        cta_label: label,
        cta_href: href || ""
      });
    });
  });
}

/* ---------------------
   VISIT BEACONS (Make webhook)
   --------------------- */
function sendBeaconJSON(url, payload) {
  try {
    var body = JSON.stringify(payload || {});
    if (navigator && navigator.sendBeacon) {
      var blob = new Blob([body], { type: "application/json" });
      return navigator.sendBeacon(url, blob);
    }
  } catch (e) {}
  // fallback fetch
  try {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
      keepalive: true
    }).catch(function () {});
  } catch (e2) {}
}

function fireVisitBeacon() {
  var payload = {
    ts: new Date().toISOString(),
    page: (location && location.href) || "",
    ref: (document && document.referrer) || "",
    ua: (navigator && navigator.userAgent) || ""
  };

  if (MAKE_WEBHOOK) sendBeaconJSON(MAKE_WEBHOOK, payload);
  if (GAS_FALLBACK) sendBeaconJSON(GAS_FALLBACK, payload);
}

/* ---------------------
   OPTIONAL: CONTACT FORM (domain-only)
   --------------------- */
function bindContactCapture() {
  // If you have a form with input[type=email], capture only domain for analytics
  var form = qs("form");
  if (!form) return;

  var emailInput = qs('input[type="email"]', form);
  if (!emailInput) return;

  form.addEventListener("submit", function () {
    try {
      var v = (emailInput.value || "").trim();
      var domain = v.indexOf("@") !== -1 ? v.split("@").pop() : "";
      domain = domain.slice(0, 80);

      if (domain) {
        trackGA4("caio_contact_submit", { email_domain: domain });
      } else {
        trackGA4("caio_contact_submit", { email_domain: "" });
      }
    } catch (e) {}
  });
}

/* ---------------------
   INIT
   --------------------- */
var initCAIO = once(function () {
  rewriteLegacyAppLinks();     // removes vercel leftovers in anchors
  wirePlanLinks();             // wires demo/pro/proplus/premium links by data-plan/data-event
  forceWirePrimaryCTA();       // optional: ensures header primary CTA always points to Guided Trial
  bindCtaEvents();             // GA4 event for CTA clicks
  bindContactCapture();        // optional domain-only capture
  fireVisitBeacon();           // Make webhook + optional GAS
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCAIO);
} else {
  initCAIO();
}
