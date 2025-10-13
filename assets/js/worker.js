// ==== worker.js ====
export default {
  async fetch(request, env) {
    // Grab client info from headers
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
    const ua = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    const url = new URL(request.url);

    const payload = {
      ip, ua, referer,
      href: url.href,
      path: url.pathname,
      qs: Object.fromEntries(url.searchParams.entries()),
      ts: new Date().toISOString()
    };

    // Forward to Apps Script Web App (stored as secret)
    const res = await fetch(env.GAS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Small, fast, cacheable 204 so it's nearly invisible
    return new Response(null, {
      status: 204,
      headers: {
        'cache-control': 'no-store',
        'access-control-allow-origin': '*'
      }
    });
  }
}
