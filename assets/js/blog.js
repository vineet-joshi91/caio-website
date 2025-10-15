// ===============================
// CAIO Blog Helper
// File: /assets/js/blog.js
// ===============================

// Ensure hard links are available even if site.js loads after this
window.__CAIO__ = Object.assign(window.__CAIO__ || {}, {
  TRY_DEMO_URL: window.__CAIO__?.TRY_DEMO_URL || 'https://caio-frontend.vercel.app/signup?plan=demo',
  CONTACT_URL:  window.__CAIO__?.CONTACT_URL  || '/contact.html'
});

(function(){
  const NS = {};

  // Tiny markdown renderer (basic)
  const md = {
    render(s) {
      if (!s) return '';
      s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      s = s.replace(/^###### (.*)$/gm,'<h6>$1</h6>')
           .replace(/^##### (.*)$/gm,'<h5>$1</h5>')
           .replace(/^#### (.*)$/gm,'<h4>$1</h4>')
           .replace(/^### (.*)$/gm,'<h3>$1</h3>')
           .replace(/^## (.*)$/gm,'<h2>$1</h2>')
           .replace(/^# (.*)$/gm,'<h1>$1</h1>');
      s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img alt="$1" src="$2">');
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
      s = s.replace(/`([^`]+)`/g,'<code>$1</code>');
      s = s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
           .replace(/\*([^*]+)\*/g,'<em>$1</em>');
      s = s.replace(/(?:^|\n)\s*-\s+(.*)/g,'\n<li>$1</li>');
      s = s.replace(/(<li>.*<\/li>)/gs,'<ul>$1</ul>');
      s = s.replace(/(?:^|\n)([^<\n][^\n]*)/g,(m,p1)=>{
        if (p1.trim().match(/^(<h|<ul|<img|<\/ul|<li|<pre|<code|<blockquote|<table|<\/table)/)) return '\n'+p1;
        if (!p1.trim()) return '';
        return '\n<p>'+p1+'</p>';
      });
      return s;
    }
  };

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'}); }
    catch { return iso; }
  }
  function withSlash(s){ return s.endsWith('/') ? s : s + '/'; }

  function cardHTML(post, baseUrl) {
    const url = withSlash(baseUrl) + 'post.html?slug=' + encodeURIComponent(post.slug);
    const tags = (post.tags || []).map(t=>`<span class="chips"><span class="btn-ghost" style="padding:4px 8px;border-radius:999px">${t}</span></span>`).join(' ');
    return `
      <article class="tile">
        <h3><a href="${url}">${post.title}</a></h3>
        <p class="muted small">${fmtDate(post.date)} • ${post.readingMinutes || 3} min read</p>
        <p class="muted">${post.excerpt || ''}</p>
        <p>${tags}</p>
        <p><a class="btn btn-ghost" href="${url}">Read →</a></p>
      </article>
    `;
  }

  async function loadJSON(path){ const r=await fetch(path,{cache:'no-store'}); if(!r.ok) throw new Error('Failed '+path); return r.json(); }
  async function loadText(path){ const r=await fetch(path,{cache:'no-store'}); if(!r.ok) throw new Error('Failed '+path); return r.text(); }

  // ----- Public: render blog list
  NS.renderList = async function({ mountId, emptyId, baseUrl }){
    try{
      baseUrl = withSlash(baseUrl || '/blog/');
      const posts = await loadJSON(baseUrl + 'posts.json');
      const mount = document.getElementById(mountId);
      const empty = document.getElementById(emptyId);
      if (!posts || !posts.length){ if (empty) empty.style.display='block'; return; }
      mount.innerHTML = posts.map(p=>cardHTML(p, baseUrl)).join('');
    }catch(e){
      console.error(e);
      const empty = document.getElementById(emptyId);
      if (empty) empty.style.display='block';
    }
  };

  // ----- Public: render a single post
  NS.renderPost = async function({ baseUrl, utm }){
    baseUrl = withSlash(baseUrl || '/blog/');
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');
    if (!slug){ location.href = baseUrl; return; }

    const posts = await loadJSON(baseUrl + 'posts.json');
    const post  = posts.find(p => p.slug === slug);
    if (!post){ location.href = baseUrl; return; }

    // Meta + OG
    document.title = post.title + ' • CAIO Blog';
    const setMeta = (id,val)=>{ const el=document.getElementById(id); if (el) el.content = val; };
    setMeta('doc-desc', post.excerpt || 'CAIO article');
    setMeta('og-title', post.title);
    setMeta('og-desc',  post.excerpt || 'CAIO article');
    if (post.image) setMeta('og-image', new URL(post.image, location.href).toString());

    // Canonical (domain identifier)
    let canon = document.querySelector('link[rel="canonical"]');
    if (!canon){ canon = document.createElement('link'); canon.rel='canonical'; document.head.appendChild(canon); }
    canon.href = location.origin + baseUrl + 'post.html?slug=' + encodeURIComponent(slug);

    // Header
    const metaEl  = document.getElementById('post-meta');
    const titleEl = document.getElementById('post-title');
    metaEl  && (metaEl.textContent  = `${fmtDate(post.date)} • ${post.readingMinutes || 3} min read`);
    titleEl && (titleEl.textContent = post.title);

    // Body
    const mdText = await loadText(baseUrl + 'posts/' + slug + '.md');
    const bodyEl = document.getElementById('post-body');
    bodyEl && (bodyEl.innerHTML = md.render(mdText));

    // Shares (with UTM)
    const url = location.origin + baseUrl + 'post.html?slug=' + encodeURIComponent(slug);
    const utmStr = utm || `utm_source=blog&utm_medium=owned&utm_campaign=${encodeURIComponent(slug)}&utm_content=post`;
    const shareUrl = url + (url.includes('?') ? '&' : '?') + utmStr;
    const uEnc = encodeURIComponent(shareUrl);
    const tEnc = encodeURIComponent(post.title);
    const li = document.getElementById('share-linkedin'); if (li) li.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + uEnc;
    const tw = document.getElementById('share-twitter');  if (tw) tw.href = 'https://twitter.com/intent/tweet?text=' + tEnc + '&url=' + uEnc;

    // Strong end-of-post CTA (hard-linked)
    const cta = document.createElement('section');
    cta.className = 'tile';
    cta.style.marginTop = '18px';
    cta.innerHTML = `
      <h3>Ready to turn documents into decisions?</h3>
      <p class="muted">Get a boardroom-ready brief in minutes with the 2–3–1 method (2–3 highlights + 1 recommendation per brain).</p>
      <div class="cta-row">
        <a class="btn btn-primary" id="cta-post-demo">Start a Free Brief</a>
        <a class="btn btn-outline" id="cta-post-contact" href="../contact.html">Talk to Us</a>
        <a class="btn btn-ghost"  id="cta-post-plans"   href="../pricing.html">See Plans</a>
      </div>
    `;
    (document.querySelector('.post-wrap') || document.body).appendChild(cta);

    // Wire the CTA with hard link (no autodetect)
    const C = window.__CAIO__;
    const demoUrl    = C.TRY_DEMO_URL;
    const contactUrl = '../contact.html';
    const plansUrl   = '../pricing.html';
    const elDemo     = document.getElementById('cta-post-demo');     if (elDemo)     elDemo.href    = demoUrl;
    const elContact  = document.getElementById('cta-post-contact');  if (elContact)  elContact.href = contactUrl;
    const elPlans    = document.getElementById('cta-post-plans');    if (elPlans)    elPlans.href   = plansUrl;

    // Read + click tracking (optional, privacy-safe)
    const px = window.__CAIO__.PIXEL_URL;
    const ping = (t, extra)=>{ try{
      if (!px) return;
      const qs = new URLSearchParams(Object.assign({t,slug,ts:Date.now().toString(),ref:document.referrer||''}, extra||{})).toString();
      (new Image()).src = px + '?' + qs;
    }catch(e){} };
    ping('blog_read');
    elDemo    && elDemo.addEventListener('click', ()=> ping('blog_cta_click',{cta:'demo'}));
    elContact && elContact.addEventListener('click',()=> ping('blog_cta_click',{cta:'contact'}));
    elPlans   && elPlans.addEventListener('click',  ()=> ping('blog_cta_click',{cta:'plans'}));
  };

  window.CAIO_BLOG = NS;
})();
