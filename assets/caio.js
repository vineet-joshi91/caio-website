/* /assets/caio.js
   CAIO public website helper: dynamic pricing + contact form + footer year
   Pages supported: index.html, pricing.html (anything that includes this file)
   Markup hooks:
     - <span data-price="pro"></span>            -> “₹2,999 / month” (from API)
       • optional: data-mode="amount"            -> “₹2,999”
     - <span data-copy="positioning"></span>     -> from backend copy.positioning (if present)
*/

(() => {
  // ====== CONFIG ======
  const BACKEND_BASE = "https://caio-orchestrator.onrender.com";
  // To test another backend locally, change ↑ this one line.

  // Format money for INR / USD (extend as needed)
  function money(amount, currency) {
    try {
      const loc = currency === "USD" ? "en-US" : "en-IN";
      return new Intl.NumberFormat(loc, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  }

  // Fetch /api/public-config (supports ?force=INR|USD passthrough)
  async function fetchPublicConfig() {
    const qp = new URLSearchParams(location.search);
    const url = new URL("/api/public-config", BACKEND_BASE);
    const force = qp.get("force");
    if (force) url.searchParams.set("force", force);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`public-config ${res.status}`);
    return res.json();
  }

  // Paint price everywhere: [data-price="pro"]
  function paintPrice(cfg) {
    const currency = (cfg && cfg.currency) ? String(cfg.currency).toUpperCase() : "INR";
    const pro = cfg?.plans?.pro;
    const els = document.querySelectorAll('[data-price="pro"]');

    if (!els.length || !pro || typeof pro.price !== "number") return;

    const pretty = money(pro.price, currency);
    els.forEach((el) => {
      const mode = el.getAttribute("data-mode") || "full"; // "amount" | "full"
      el.textContent = mode === "amount" ? pretty : `${pretty} / month`;
    });
  }

  // Optional: marketing copy
  function paintCopy(cfg) {
    const msg = cfg?.copy?.positioning;
    if (!msg) return;
    document.querySelectorAll('[data-copy="positioning"]').forEach((el) => {
      el.textContent = msg;
    });
  }

  // Contact form wiring (if present)
  function wireContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;

    const ok = document.getElementById("ok");
    const err = document.getElementById("err");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (ok) ok.style.display = "none";
      if (err) err.style.display = "none";

      try {
        const r = await fetch(`${BACKEND_BASE}/api/contact`, { method: "POST", body: new FormData(form) });
        if (!r.ok) throw new Error(`contact ${r.status}`);
        if (ok) ok.style.display = "block";
        form.reset();
      } catch {
        if (err) err.style.display = "block";
      }
    });
  }

  // Footer year
  function stampYear() {
    const y = document.getElementById("y");
    if (y) y.textContent = new Date().getFullYear();
  }

  async function init() {
    stampYear();
    wireContactForm();

    try {
      const cfg = await fetchPublicConfig();
      paintPrice(cfg);
      paintCopy(cfg);
    } catch {
      // Keep hardcoded values if API not reachable
      // console.warn("public-config fetch failed; using HTML fallbacks");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
