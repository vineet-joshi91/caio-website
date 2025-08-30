// ====== CONFIG ======
const BACKEND_BASE = "https://caio-backend.onrender.com";
const APP_BASE = "https://caio-frontend.vercel.app";

// Helper: money formatter
function money(amount, currency) {
  const loc = currency === "USD" ? "en-US" : "en-IN";
  return new Intl.NumberFormat(loc, { style: "currency", currency }).format(amount);
}

// Pull public config (backend decides INR/USD and plan pricing)
async function fetchPublicConfig() {
  const qp = new URLSearchParams(location.search); // QA: ?force=INR or ?force=USD
  const u = new URL("/api/public-config", BACKEND_BASE);
  if (qp.get("force")) u.searchParams.set("force", qp.get("force"));
  const r = await fetch(u.toString(), { cache: "no-store" });
  if (!r.ok) throw new Error("public-config status " + r.status);
  return r.json();
}

// Apply pricing to any element with data-price="pro"
async function applyPricing() {
  const elList = document.querySelectorAll('[data-price="pro"]');
  if (!elList.length) return;
  try {
    const cfg = await fetchPublicConfig();
    const pro = cfg?.plans?.pro;
    const curr = cfg?.currency || "INR";
    if (pro && typeof pro.price !== "undefined") {
      elList.forEach((el) => {
        const mode = el.dataset.mode || "full"; // "amount" or "full"
        const val = money(pro.price, curr);
        el.textContent = mode === "amount" ? val : `${val} / month`;
      });
    }
  } catch {
    // keep the hard-coded fallback in HTML
  }
}

// Wire contact form (if present)
function wireContactForm() {
  const FORM = document.getElementById("contactForm");
  if (!FORM) return;
  const OK = document.getElementById("ok");
  const ERR = document.getElementById("err");

  FORM.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (OK) OK.style.display = "none";
    if (ERR) ERR.style.display = "none";

    const fd = new FormData(FORM);
    try {
      const r = await fetch(`${BACKEND_BASE}/api/contact`, { method: "POST", body: fd });
      if (!r.ok) throw new Error("status " + r.status);
      if (OK) OK.style.display = "block";
      FORM.reset();
    } catch {
      if (ERR) ERR.style.display = "block";
    }
  });
}

// Footer year
function stampYear() {
  const y = document.getElementById("y");
  if (y) y.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", () => {
  applyPricing();
  wireContactForm();
  stampYear();
});
