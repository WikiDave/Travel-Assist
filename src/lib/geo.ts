import type { ModeId, Place, RouteGeometry } from '../types';
import { MODES } from './modes';

const R = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Hemelsbrede afstand in km */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Punten langs de grootcirkel (mooie boog voor vluchten op de kaart) */
export function greatCircle(a: Place, b: Place, n = 32): [number, number][] {
  const φ1 = toRad(a.lat), λ1 = toRad(a.lon), φ2 = toRad(b.lat), λ2 = toRad(b.lon);
  const d = haversineKm(a, b) / R;
  if (d < 1e-6) return [[a.lat, a.lon], [b.lat, b.lon]];
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    pts.push([(Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI, (Math.atan2(y, x) * 180) / Math.PI]);
  }
  return pts;
}

export async function geocode(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&accept-language=nl&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Zoeken mislukt (${res.status})`);
  const data: Array<{
    lat: string; lon: string; display_name: string; name?: string;
    address?: Record<string, string>;
  }> = await res.json();
  return data.map((d) => {
    const a = d.address ?? {};
    const name = d.name || a.city || a.town || a.village || a.municipality || d.display_name.split(',')[0];
    return {
      name,
      displayName: d.display_name,
      lat: parseFloat(d.lat),
      lon: parseFloat(d.lon),
      countryCode: a.country_code?.toUpperCase(),
    };
  });
}

export async function reverseGeocode(lat: number, lon: number): Promise<Place> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&accept-language=nl&lat=${lat}&lon=${lon}`;
  try {
    const res = await fetch(url);
    const d = await res.json();
    const a = d.address ?? {};
    return {
      name: a.city || a.town || a.village || a.municipality || d.name || 'Huidige locatie',
      displayName: d.display_name,
      lat, lon,
      countryCode: a.country_code?.toUpperCase(),
    };
  } catch {
    return { name: 'Huidige locatie', lat, lon };
  }
}

/** Schatting zonder externe dienst */
export function estimateRoute(mode: ModeId, a: Place, b: Place): RouteGeometry {
  const m = MODES[mode];
  const km = haversineKm(a, b) * m.detour;
  const coords = mode === 'plane' ? greatCircle(a, b) : [[a.lat, a.lon], [b.lat, b.lon]] as [number, number][];
  return { coords, distanceKm: km, durationH: km / m.speedKmh + m.overheadH, source: 'estimate' };
}

// Publieke routeservers zijn gratis maar beperkt: één verzoek tegelijk, met cache.
const routeCache = new Map<string, Promise<RouteGeometry>>();
let queue: Promise<unknown> = Promise.resolve();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.then(() => sleep(250), () => sleep(250));
  return run;
}

async function fetchOsrm(profile: string, a: Place, b: Place): Promise<{ km: number; h: number; coords: [number, number][] }> {
  const url = `https://routing.openstreetmap.de/routed-${profile}/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=simplified&geometries=geojson`;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes?.length) throw new Error(data.code ?? `HTTP ${res.status}`);
      const r = data.routes[0];
      return {
        km: r.distance / 1000,
        h: r.duration / 3600,
        coords: (r.geometry.coordinates as [number, number][]).map(([lon, lat]) => [lat, lon]),
      };
    } catch (e) {
      if (attempt >= 1 || (e as Error).message === 'NoRoute') throw e;
      await sleep(1500);
    }
  }
}

/** Echte route via OSRM (routing.openstreetmap.de) voor auto/fiets/lopen, anders schatting. */
export function computeRoute(mode: ModeId, a: Place, b: Place): Promise<RouteGeometry> {
  const m = MODES[mode];
  const profile = m.osrmProfile;
  if (!profile) return Promise.resolve(estimateRoute(mode, a, b));
  const key = `${mode}:${a.lat},${a.lon}:${b.lat},${b.lon}`;
  let p = routeCache.get(key);
  if (!p) {
    p = enqueue(() => fetchOsrm(profile, a, b))
      .then(({ km, h, coords }): RouteGeometry => ({
        coords,
        distanceKm: km,
        // OSRM-duur voor fiets/lopen is optimistisch; gebruik onze tempo's voor consistentie.
        durationH: profile === 'car' ? h : km / m.speedKmh,
        source: 'osrm',
      }))
      .catch(() => {
        routeCache.delete(key);
        return estimateRoute(mode, a, b);
      });
    routeCache.set(key, p);
  }
  return p;
}
