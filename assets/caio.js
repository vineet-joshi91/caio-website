// Mobile nav (optional)
document.querySelector('.nav-toggle')?.addEventListener('click', ()=>{
  document.querySelector('.nav-links')?.classList.toggle('show');
});

// CTA wiring (same pattern as the rest of your site)
(function(){
  const root = window.CAIO_APP_BASE || "https://caio-orchestrator.onrender.com";
  [
    ['top-try','/signup?plan=demo'],
    ['hero-start','/signup?plan=demo'],
    ['p-starter','/signup?plan=pro'],
    ['p-pro','/signup?plan=proplus'],
    ['fab-demo','/signup?plan=demo'],
  ].forEach(([id,path])=>{
    const el = document.getElementById(id);
    if (el) el.href = root + path;
  });
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();
})();

// Upload demo
const uploadArea = document.getElementById('uploadArea');
const fileInput  = document.getElementById('fileInput');
const loading    = document.getElementById('loading');
function startLoading(){ loading.style.display='block'; }
function stopLoading(){ loading.style.display='none'; }

if (uploadArea && fileInput) {
  uploadArea.addEventListener('click', ()=> fileInput.click());
  uploadArea.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fileInput.click(); }});
  uploadArea.addEventListener('dragover', (e)=>{ e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', ()=> uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', (e)=>{
    e.preventDefault(); uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files?.[0]) simulateAnalysis();
  });
  fileInput.addEventListener('change', ()=>{ if (fileInput.files?.[0]) simulateAnalysis(); });
}
function simulateAnalysis(){
  uploadArea.setAttribute('aria-busy','true'); startLoading();
  setTimeout(()=>{ stopLoading(); uploadArea.removeAttribute('aria-busy'); alert('Analysis complete! (demo)'); }, 1800);
}

// Pricing toggle
const options = document.querySelectorAll('.toggle-option');
const slider  = document.querySelector('.toggle-slider');
const monthly = document.querySelectorAll('.monthly');
const annual  = document.querySelectorAll('.annual');

options.forEach((btn, idx)=>{
  btn.addEventListener('click', ()=>{
    options.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const isAnnual = btn.dataset.plan === 'annual';
    slider.style.transform = isAnnual ? 'translateX(100%)' : 'translateX(0)';
    monthly.forEach(n=> n.hidden = isAnnual);
    annual.forEach(n => n.hidden = !isAnnual);
  });
});

// Smooth scroll (respect only same-page anchors)
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const id = a.getAttribute('href');
    const target = document.querySelector(id);
    if (target) { e.preventDefault(); target.scrollIntoView({behavior:'smooth'}); }
  });
});
