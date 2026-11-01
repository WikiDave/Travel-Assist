import type { ModeId, Place, Stop, Trip } from '../types';
import { estimateRoute, haversineKm, reverseGeocode, splitRoute } from './geo';
import { normalizeStops, uid, updateTrip } from './store';

/** Kiest een logische standaard-vervoerswijze op basis van afstand. */
export function defaultMode(a: Place, b: Place): ModeId {
  const km = haversineKm(a, b);
  if (km < 3) return 'hike';
  if (km < 25) return 'bike';
  if (km < 700) return 'train';
  if (km < 1300) return 'nighttrain';
  return 'plane';
}

const newStop = (place: Place, nights: number): Stop => ({ id: uid(), place, nights, journal: [] });

export function insertStop(tripId: string, place: Place, at?: number, nights = 2) {
  updateTrip(tripId, (t) => {
    const stops = [...t.stops];
    const idx = at ?? stops.length;
    stops.splice(idx, 0, newStop(place, idx === 0 ? 0 : nights));
    // Het traject naar de stop ná de nieuwe stop moet opnieuw bepaald worden.
    return { ...t, stops: normalizeStops(stops, defaultMode) };
  });
}

export function moveStop(tripId: string, from: number, to: number) {
  updateTrip(tripId, (t) => {
    if (from === to || to < 0 || to >= t.stops.length) return t;
    const stops = [...t.stops];
    const [s] = stops.splice(from, 1);
    stops.splice(to, 0, s);
    return { ...t, stops: normalizeStops(stops, defaultMode) };
  });
}

export function removeStop(tripId: string, i: number) {
  updateTrip(tripId, (t) => ({ ...t, stops: normalizeStops(t.stops.filter((_, k) => k !== i), defaultMode) }));
}

export function replacePlace(tripId: string, i: number, place: Place) {
  updateTrip(tripId, (t) => ({ ...t, stops: t.stops.map((s, k) => (k === i ? { ...s, place } : s)) }));
}

/**
 * Deelt een meerdaagse fiets-/wandeltocht op in dagetappes: voegt tussenstops
 * (met 1 overnachting) toe op gelijke afstanden langs de route.
 */
export async function splitIntoStages(trip: Trip, i: number, stages: number, onProgress?: (done: number, total: number) => void) {
  const stop = trip.stops[i];
  const prev = trip.stops[i - 1];
  if (!stop?.leg || !prev) return;
  const mode = stop.leg.mode;
  const coords = stop.leg.route?.coords ?? estimateRoute(mode, prev.place, stop.place).coords;
  const points = splitRoute(coords, stages);
  const places: Place[] = [];
  for (const [k, p] of points.entries()) {
    onProgress?.(k, points.length);
    const place = await reverseGeocode(p.lat, p.lon);
    places.push({ ...place, name: place.name === 'Huidige locatie' ? `Etappe ${k + 1}` : place.name });
    await new Promise((r) => setTimeout(r, 1100)); // Nominatim: max 1 verzoek per seconde
  }
  onProgress?.(points.length, points.length);
  updateTrip(trip.id, (t) => {
    const idx = t.stops.findIndex((s) => s.id === stop.id);
    if (idx < 1) return t;
    const inserted: Stop[] = places.map((pl) => ({ ...newStop(pl, 1), leg: { mode, booked: false } }));
    const stops = [...t.stops];
    stops.splice(idx, 0, ...inserted);
    stops[idx + inserted.length] = { ...stops[idx + inserted.length], leg: { ...stop.leg!, routeKey: undefined, route: undefined } };
    return { ...t, stops };
  });
}
