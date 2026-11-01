import type { Offer, Trip } from '../types';
import { getSettings } from './settings';
import { nearestAirport } from './airports';
import { estimateLeg, itinerary, legRoute, toISO } from './estimate';

/** Laagste gevonden vliegprijs per dag (per persoon). */
export interface DayFare {
  price: number;
  airline?: string;
  transfers?: number;
  departureAt?: string;
  link?: string;
}
export type MonthFares = Record<string, DayFare>;

const CACHE_KEY = 'travel-assist:fares:v1';
const TTL = 6 * 3600 * 1000;
type CacheEntry = { at: number; fares: MonthFares };
const memory: Record<string, CacheEntry> = (() => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
})();

function persist() {
  const now = Date.now();
  for (const k of Object.keys(memory)) if (now - memory[k].at > TTL) delete memory[k];
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(memory)); } catch { /* cache is optioneel */ }
}

export function cachedMonth(origin: string, dest: string, month: string): MonthFares | undefined {
  const e = memory[`${origin}-${dest}-${month}`];
  return e && Date.now() - e.at < TTL ? e.fares : undefined;
}

export class PriceError extends Error {}

/**
 * Haalt de goedkoopste enkele-reis-vliegprijzen per dag voor een maand op via de
 * Travelpayouts (Aviasales) Data API. Dit zijn prijzen uit recente zoekopdrachten
 * van andere reizigers (cache), geen live boekbare prijzen.
 */
export async function fetchFlightMonth(origin: string, dest: string, month: string, currency = 'EUR'): Promise<MonthFares> {
  const hit = cachedMonth(origin, dest, month);
  if (hit) return hit;
  const { travelpayoutsToken: token, priceProxyUrl } = getSettings();
  if (!token) throw new PriceError('Geen Travelpayouts-token ingesteld');
  const base = (priceProxyUrl || 'https://api.travelpayouts.com').replace(/\/$/, '');
  const qs = new URLSearchParams({
    origin, destination: dest, departure_at: month, one_way: 'true', sorting: 'price',
    direct: 'false', limit: '1000', currency: currency.toLowerCase(), token,
  });
  let res: Response;
  try {
    res = await fetch(`${base}/aviasales/v3/prices_for_dates?${qs}`);
  } catch {
    throw new PriceError('Prijsdienst niet bereikbaar vanuit de browser. Stel een proxy in (zie Instellingen).');
  }
  if (res.status === 401) throw new PriceError('Token ongeldig');
  if (!res.ok) throw new PriceError(`Prijsdienst gaf fout ${res.status}`);
  const body = await res.json();
  const fares: MonthFares = {};
  for (const f of (body.data ?? []) as Array<{ price: number; departure_at: string; airline?: string; transfers?: number; link?: string }>) {
    const day = f.departure_at?.slice(0, 10);
    if (!day) continue;
    if (!fares[day] || f.price < fares[day].price) {
      fares[day] = {
        price: f.price, airline: f.airline, transfers: f.transfers, departureAt: f.departure_at,
        link: f.link ? `https://www.aviasales.com${f.link}` : undefined,
      };
    }
  }
  memory[`${origin}-${dest}-${month}`] = { at: Date.now(), fares };
  persist();
  return fares;
}

/** IATA-codes voor een vliegtraject, of null als er geen luchthaven in de buurt is. */
export function flightCodes(trip: Trip, i: number): { from: string; to: string } | null {
  const a = nearestAirport(trip.stops[i - 1].place);
  const b = nearestAirport(trip.stops[i].place);
  return a && b && a.iata !== b.iata ? { from: a.iata, to: b.iata } : null;
}

export type PriceSource = 'offer' | 'calendar' | 'fixed' | 'estimate';
export interface PricePoint { amount: number; source: PriceSource; label?: string }

/** Beste bekende prijs voor traject i als je op `date` vertrekt. */
export function legPriceOn(trip: Trip, i: number, date: string): PricePoint {
  const leg = trip.stops[i].leg!;
  const sameDay = (leg.offers ?? []).filter((o) => o.date === date);
  if (sameDay.length) {
    const best = sameDay.reduce((a, b) => (b.price < a.price ? b : a));
    return { amount: best.price, source: 'offer', label: best.provider };
  }
  if (leg.mode === 'plane') {
    const codes = flightCodes(trip, i);
    const fare = codes && cachedMonth(codes.from, codes.to, date.slice(0, 7))?.[date];
    if (fare) return { amount: fare.price * trip.travelers, source: 'calendar', label: fare.airline };
  }
  // Prijzen zonder datum (bijv. auto, vaste OV-prijs) gelden voor elke dag.
  const undated = (leg.offers ?? []).filter((o) => !o.date);
  if (undated.length) return { amount: Math.min(...undated.map((o) => o.price)), source: 'offer' };
  if (leg.cost != null) return { amount: leg.cost, source: 'fixed' };
  const est = estimateLeg(leg.mode, trip.stops[i - 1].place, trip.stops[i].place, trip.travelers, legRoute(trip, i));
  return { amount: est.cost, source: 'estimate' };
}

export interface StartDateOption {
  start: string;
  end: string;
  total: number;
  legs: PricePoint[];
  stays: number;
  /** Aandeel van het totaal dat op echte prijzen (geen schatting) gebaseerd is */
  known: number;
}

/** Berekent de totale reisprijs voor elke kandidaat-startdatum. */
export function compareStartDates(trip: Trip, starts: string[]): StartDateOption[] {
  const stays = trip.stops.reduce((n, s) => n + (s.stay?.cost ?? 0), 0);
  return starts.map((start) => {
    const t = { ...trip, startDate: start };
    const it = itinerary(t);
    const legs = t.stops.map((_, i) => (i === 0 ? null : legPriceOn(t, i, toISO(it[i - 1].departure)))).filter(Boolean) as PricePoint[];
    const legSum = legs.reduce((n, l) => n + l.amount, 0);
    const knownSum = legs.filter((l) => l.source !== 'estimate').reduce((n, l) => n + l.amount, 0) + stays;
    const total = legSum + stays;
    return { start, end: it.length ? toISO(it[it.length - 1].departure) : start, total, legs, stays, known: total ? knownSum / total : 0 };
  });
}

/** Maanden (YYYY-MM) die nodig zijn om vliegtrajecten voor alle startdatums te prijzen. */
export function monthsNeeded(trip: Trip, starts: string[]): { i: number; from: string; to: string; month: string }[] {
  const out = new Map<string, { i: number; from: string; to: string; month: string }>();
  for (const start of starts) {
    const it = itinerary({ ...trip, startDate: start });
    trip.stops.forEach((s, i) => {
      if (i === 0 || s.leg?.mode !== 'plane') return;
      const codes = flightCodes(trip, i);
      if (!codes) return;
      const month = toISO(it[i - 1].departure).slice(0, 7);
      out.set(`${codes.from}-${codes.to}-${month}`, { i, ...codes, month });
    });
  }
  return [...out.values()];
}

export function cheapestOffer(offers: Offer[] | undefined): Offer | undefined {
  return offers?.length ? offers.reduce((a, b) => (b.price < a.price ? b : a)) : undefined;
}
