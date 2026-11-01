#!/usr/bin/env node
// Travel Assist – lokale prijshulp (alleen voor persoonlijk gebruik).
//
// Haalt de laagste Ryanair-prijs per dag op via de openbare prijsgegevens die de
// Ryanair-website zelf ook gebruikt, en geeft die door aan de Travel Assist-app.
// Draait alleen op je eigen computer (127.0.0.1) en is bewust beleefd:
// max. 1 verzoek per seconde, resultaten 1 uur in het geheugen, geen omzeiling
// van blokkades. Houdt Ryanair het tegen of verandert de koppeling, dan stopt
// het gewoon met werken en valt de app terug op de directe links.
//
// Starten:  node tools/fare-helper/server.mjs        (Node 18 of nieuwer)

import http from 'node:http';

const PORT = Number(process.env.PORT) || 8787;
const ALLOWED_ORIGINS = ['https://wikidave.github.io', 'http://localhost:5173', 'http://localhost:4173'];
const CACHE_MS = 60 * 60 * 1000;
const cache = new Map();
const inflight = new Map();
let queue = Promise.resolve();

const IATA = /^[A-Z]{3}$/;
const MONTH = /^\d{4}-\d{2}$/;

// Eén verzoek tegelijk, met minstens 1 seconde ertussen.
function politeFetch(url) {
  const run = queue.then(() => fetch(url, { headers: { Accept: 'application/json' } }));
  queue = run.catch(() => {}).then(() => new Promise((r) => setTimeout(r, 1000)));
  return run;
}

function ryanairMonth(from, to, month) {
  const key = `${from}-${to}-${month}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return Promise.resolve(hit.data);
  // Gelijktijdige vragen voor dezelfde maand delen één verzoek.
  if (!inflight.has(key)) inflight.set(key, loadRyanairMonth(from, to, month, key).finally(() => inflight.delete(key)));
  return inflight.get(key);
}

async function loadRyanairMonth(from, to, month, key) {
  const url = `https://services-api.ryanair.com/farfnd/v4/oneWayFares/${from}/${to}/cheapestPerDay?outboundMonthOfDate=${month}-01&currency=EUR`;
  const res = await politeFetch(url);
  if (!res.ok) throw Object.assign(new Error(`Ryanair antwoordde met ${res.status}`), { status: 502 });
  const body = await res.json();
  const fares = {};
  for (const f of body?.outbound?.fares ?? []) {
    if (f.unavailable || f.soldOut || !f.price) continue;
    fares[f.day] = { price: f.price.value, currency: f.price.currencyCode, departureAt: f.departureDate, arrivalAt: f.arrivalDate };
  }
  const data = { from, to, month, fares, fetchedAt: new Date().toISOString() };
  cache.set(key, { at: Date.now(), data });
  return data;
}

function send(res, status, body, origin) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Private-Network': 'true', // Chrome: toegang vanaf een website tot localhost
    Vary: 'Origin',
  });
  res.end(body === null ? '' : JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS') return send(res, 204, null, origin);
  if (req.method !== 'GET') return send(res, 405, { error: 'Alleen GET' }, origin);
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/health') return send(res, 200, { ok: true, version: 1, sources: ['ryanair'] }, origin);
    if (url.pathname === '/ryanair/month') {
      const from = (url.searchParams.get('from') || '').toUpperCase();
      const to = (url.searchParams.get('to') || '').toUpperCase();
      const month = url.searchParams.get('month') || '';
      if (!IATA.test(from) || !IATA.test(to) || !MONTH.test(month)) return send(res, 400, { error: 'Gebruik from=XXX&to=YYY&month=JJJJ-MM' }, origin);
      const data = await ryanairMonth(from, to, month);
      console.log(`${new Date().toLocaleTimeString('nl-NL')}  ${from} → ${to}  ${month}: ${Object.keys(data.fares).length} dagen met prijs`);
      return send(res, 200, data, origin);
    }
    return send(res, 404, { error: 'Onbekend pad' }, origin);
  } catch (e) {
    console.error(e.message);
    return send(res, e.status || 500, { error: e.message }, origin);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Travel Assist prijshulp draait op http://localhost:${PORT}`);
  console.log('Laat dit venster open terwijl je de app gebruikt. Stoppen: Ctrl+C');
});
