/* /assets/caio.js
   CAIO public website helper: dynamic pricing + contact form
   Pages supported: index.html, pricing.html (anything that includes this file)
   Markup hooks:
     - <span data-price="pro"></span>            -> gets “₹1,999.00 / month”
       • optional: data-mode="amount"            -> “₹1,999.00”
     - <span data-copy="positioning"></span>     -> filled from backend copy.positioning (if present)
*/

(() => {
  // ====== CONFIG ======
  const BACKEND_BASE = "https://caio-backend.onrender.com";
  // If you ever need to test a different backend, change ↑ this one line.

  // Money formatter
  function money(amount, currency) {
    try {
      const loc = currency === "USD" ? "en-US" : "en-IN";
      return new Intl.NumberFormat(loc, { style: "currency", currency }).format(amount);
    } catch {
      // Very safe fallback
      return `${currency} ${amount}`;
    }
  }

  // Pull public config (backend decides INR/USD and plan pricing)
  async function fetchPublicConfig() {
    const qp = new URLSearchParams(location.search); // e.g. ?force=USD or ?force=INR
    const url = new URL("/api/public-config", BACKEND_BASE);
    const force = qp.get("force");
    if (force) url.searchParams.set("force", force);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`public-config ${res.status}`);
    return res.json();
  }

  // Set price text everywhere needed
  function paintPrice(cfg) {
    const curr = cfg?.currency || "INR";
    const pro = cfg?.plans?.pro;

    // Price targets: any element with data-price="pro"
    const els = document.querySelectorAll('[data-price="pro"]');
    if (!els.length || !pro || typeof pro.price !== "number") return;

    const pretty = money(pro.price, curr);
    els.forEach((el) => {
      const mode = el.dataset.mode || "full";       // "amount" | "full"
      el.textContent = mode === "amount" ? pretty : `${pretty} / month`;
    });
  }

  // Optional: fill marketing copy from backend (if provided)
  function paintCopy(cfg) {
    const msg = cfg?.copy?.positioning;
    if (!msg) return;
    document.querySelectorAll('[data-copy="positioning"]').forEach((el) => {
      el.textContent = msg;
    });
  }

  // Wire contact form (if present)
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
        const r = await fetch(`${BACKEND_BASE}/api/contact`, {
          method: "POST",
          body: new FormData(form),
        });
        if (!r.ok) throw new Error(`contact ${r.status}`);
        if (ok) ok.style.display = "block";
        form.reset();
      } catch {
        if (err) err.style.display = "block";
      }
    });
  }

  // Footer year stamp
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
      // Silent: keep whatever is in the HTML as fallback
      // You can uncomment for debugging:
      // console.warn("public-config fetch failed; using hard-coded HTML");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
