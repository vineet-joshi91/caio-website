// ==== worker.js (Make.com webhook version) ====
// Set your Make webhook URL as a Worker secret named MAKE_WEBHOOK_URL
// (Cloudflare Dashboard → Workers → Your worker → Settings → Variables → Add secret)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Require page context from GTM (avoids duplicate bare hits)
    const hrefQS = url.searchParams.get('href') || '';
    if (!hrefQS) {
      return new Response(null, { status: 204, headers: { 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
    }

    // Client & CF context
    const ip       = request.headers.get('CF-Connecting-IP') || '';
    const ua       = request.headers.get('User-Agent') || '';
    const refererH = request.headers.get('Referer') || '';
    const country  = request.headers.get('CF-IPCountry') || '';
    const colo     = request.headers.get('CF-RAY') || '';

    // GTM-passed params (optional)
    const refQS    = url.searchParams.get('ref')  || '';
    const cid      = url.searchParams.get('cid')  || '';   // first-party visitor id (optional)
    const abm      = url.searchParams.get('abm')  || '';   // campaign/account tag (optional)

    // Normalize page details
    let pageHost = '', pagePath = '', pageHref = hrefQS;
    try { const p = new URL(hrefQS); pageHost = p.hostname; pagePath = p.pathname + p.search; } catch (_) {}

    const payload = {
      ts: new Date().toISOString(),
      ip,
      ua,
      country,
      colo,
      href: pageHref,
      path: pagePath,
      domain: pageHost,
      referer: refQS || refererH || '',
      cid,
      abm,
      // keep original pixel request info too
      pixel: {
        href: url.href,
        qs: Object.fromEntries(url.searchParams.entries())
      }
    };

    // Post to Make webhook without blocking the response
    const makeUrl = env.MAKE_WEBHOOK_URL || 'https://hook.eu2.make.com/r6wwqfuhd7owzp5glusn4o1en0phdmg5';
    ctx.waitUntil(
      fetch(makeUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {})
    );

    // Fast, invisible response
    return new Response(null, {
      status: 204,
      headers: {
        'cache-control': 'no-store',
        'access-control-allow-origin': '*'
      }
    });
  }
}
