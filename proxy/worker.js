// Minimale Cloudflare Worker-proxy voor de Travelpayouts Data API.
// Alleen nodig als de API vanuit de browser geblokkeerd wordt (CORS).
// Stuurt alleen GET-verzoeken naar /aviasales/... door en voegt CORS-headers toe.

const ALLOWED_ORIGINS = ['https://wikidave.github.io', 'http://localhost:5173', 'http://localhost:4173'];

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(request.url);
    if (request.method !== 'GET' || !url.pathname.startsWith('/aviasales/')) {
      return new Response('Niet toegestaan', { status: 403, headers: cors });
    }
    const upstream = await fetch(`https://api.travelpayouts.com${url.pathname}${url.search}`, {
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    const res = new Response(upstream.body, upstream);
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  },
};
