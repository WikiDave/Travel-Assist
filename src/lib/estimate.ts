import type { ModeId, Place, RouteGeometry, Stop, Trip } from '../types';
import { MODES } from './modes';
import { haversineKm } from './geo';

export interface LegEstimate {
  mode: ModeId;
  distanceKm: number;
  /** Reistijd in uren (inclusief overhead) */
  durationH: number;
  /** Aantal reisdagen (fiets/hike meerdaags, slaaptrein = 1 nacht) */
  days: number;
  /** Totale CO2 in kg voor de hele groep */
  co2Kg: number;
  /** Geschatte kosten voor de hele groep (EUR) */
  cost: number;
  feasible: boolean;
  reason?: string;
  source: 'osrm' | 'estimate';
}

export function estimateLeg(mode: ModeId, from: Place, to: Place, travelers: number, route?: RouteGeometry): LegEstimate {
  const m = MODES[mode];
  const straight = haversineKm(from, to);
  const distanceKm = route?.distanceKm ?? straight * m.detour;
  const durationH = route?.durationH ?? distanceKm / m.speedKmh + m.overheadH;
  const people = Math.max(1, travelers);

  let days = 0;
  if (m.kmPerDay) days = Math.max(1, Math.ceil(distanceKm / m.kmPerDay));
  else if (m.overnight) days = 1;
  else if (durationH > 14) days = 1;

  const cars = Math.ceil(people / 5);
  const co2Kg = m.perVehicle ? distanceKm * m.co2PerKm * cars : distanceKm * m.co2PerKm * people;
  const cost = m.perVehicle
    ? distanceKm * m.costPerKm * cars
    : (m.costBase + distanceKm * m.costPerKm) * people;

  let feasible = true;
  let reason: string | undefined;
  if (straight < m.minKm) { feasible = false; reason = 'Te kort voor deze vervoerswijze'; }
  else if (straight > m.maxKm) { feasible = false; reason = 'Te ver voor deze vervoerswijze'; }

  return { mode, distanceKm, durationH, days, co2Kg, cost, feasible, reason, source: route?.source ?? 'estimate' };
}

export interface ItineraryDay {
  stopIndex: number;
  arrival: Date;
  departure: Date;
  legDays: number;
}

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function legDays(trip: Trip, i: number): number {
  const stop = trip.stops[i];
  if (i === 0 || !stop.leg) return 0;
  const prev = trip.stops[i - 1];
  return estimateLeg(stop.leg.mode, prev.place, stop.place, trip.travelers, legRoute(trip, i)).days;
}

export function routeKey(mode: ModeId, a: Place, b: Place): string {
  return `${mode}:${a.lat.toFixed(5)},${a.lon.toFixed(5)}:${b.lat.toFixed(5)},${b.lon.toFixed(5)}`;
}

/** De opgeslagen route voor traject i, mits nog geldig voor de huidige modus en punten. */
export function legRoute(trip: Trip, i: number): RouteGeometry | undefined {
  const leg = trip.stops[i]?.leg;
  if (!leg || i === 0) return undefined;
  return leg.routeKey === routeKey(leg.mode, trip.stops[i - 1].place, trip.stops[i].place) ? leg.route : undefined;
}

/** Schatting voor traject i met de gekozen modus. */
export function legEstimate(trip: Trip, i: number): LegEstimate | undefined {
  const leg = trip.stops[i]?.leg;
  if (!leg || i === 0) return undefined;
  return estimateLeg(leg.mode, trip.stops[i - 1].place, trip.stops[i].place, trip.travelers, legRoute(trip, i));
}

/** Berekent aankomst/vertrek per stop op basis van startdatum, nachten en reisdagen. */
export function itinerary(trip: Trip): ItineraryDay[] {
  const out: ItineraryDay[] = [];
  let cursor = parseDate(trip.startDate);
  trip.stops.forEach((s: Stop, i) => {
    const ld = legDays(trip, i);
    const arrival = addDays(cursor, ld);
    const departure = addDays(arrival, i === 0 ? 0 : s.nights);
    out.push({ stopIndex: i, arrival, departure, legDays: ld });
    cursor = departure;
  });
  return out;
}

export function fmtDuration(h: number): string {
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rest = Math.round(h - d * 24);
    return `${d}d ${rest}u`;
  }
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return hh ? `${hh}u ${String(mm).padStart(2, '0')}m` : `${mm} min`;
}

export function fmtKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString('nl-NL')} km`;
}

export function fmtMoney(n: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}
