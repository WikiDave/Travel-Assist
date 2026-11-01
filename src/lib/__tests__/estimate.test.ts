import { describe, expect, it } from 'vitest';
import { estimateLeg, itinerary, toISO } from '../estimate';
import { haversineKm } from '../geo';
import { nearestAirport } from '../airports';
import { transportLinks, stayLinks } from '../links';
import type { Trip } from '../../types';

const ams = { name: 'Amsterdam', lat: 52.37, lon: 4.9 };
const rome = { name: 'Rome', lat: 41.9, lon: 12.5 };
const utrecht = { name: 'Utrecht', lat: 52.09, lon: 5.12 };

describe('geo', () => {
  it('berekent hemelsbrede afstand', () => {
    expect(haversineKm(ams, rome)).toBeGreaterThan(1280);
    expect(haversineKm(ams, rome)).toBeLessThan(1310);
  });
  it('vindt de dichtstbijzijnde luchthaven', () => {
    expect(nearestAirport(ams)?.iata).toBe('AMS');
    expect(nearestAirport(rome)?.iata).toBe('FCO');
    expect(nearestAirport({ lat: 0, lon: -140 })).toBeNull();
  });
});

describe('estimateLeg', () => {
  it('markeert vliegen over korte afstand als onzinnig', () => {
    expect(estimateLeg('plane', ams, utrecht, 2).feasible).toBe(false);
    expect(estimateLeg('plane', ams, rome, 2).feasible).toBe(true);
  });
  it('vliegen is sneller maar vervuilender dan de trein', () => {
    const p = estimateLeg('plane', ams, rome, 1);
    const t = estimateLeg('train', ams, rome, 1);
    expect(p.durationH).toBeLessThan(t.durationH);
    expect(p.co2Kg).toBeGreaterThan(t.co2Kg * 4);
  });
  it('deelt autokosten per voertuig', () => {
    expect(estimateLeg('car', ams, rome, 4).cost).toBeCloseTo(estimateLeg('car', ams, rome, 1).cost);
  });
  it('splitst fietstochten in dagetappes', () => {
    const b = estimateLeg('bike', ams, rome, 1);
    expect(b.days).toBeGreaterThan(15);
    expect(estimateLeg('nighttrain', ams, rome, 1).days).toBe(1);
  });
});

describe('itinerary', () => {
  it('telt nachten en reisdagen op', () => {
    const trip: Trip = {
      id: 't', name: 'x', startDate: '2026-12-01', travelers: 2, currency: 'EUR', stops: [
        { id: 'a', place: ams, nights: 0, journal: [] },
        { id: 'b', place: rome, nights: 3, journal: [], leg: { mode: 'nighttrain', booked: false } },
        { id: 'c', place: { name: 'Napels', lat: 40.85, lon: 14.27 }, nights: 2, journal: [], leg: { mode: 'train', booked: false } },
      ], expenses: [], checklist: [], createdAt: 0, updatedAt: 0,
    };
    const it = itinerary(trip);
    expect(toISO(it[1].arrival)).toBe('2026-12-02'); // slaaptrein: volgende ochtend
    expect(toISO(it[1].departure)).toBe('2026-12-05');
    expect(toISO(it[2].arrival)).toBe('2026-12-05');
    expect(toISO(it[2].departure)).toBe('2026-12-07');
  });
});

describe('links', () => {
  it('bouwt een Skyscanner-link met IATA-codes en datum', () => {
    const l = transportLinks('plane', ams, rome, new Date(2026, 11, 1), 2);
    expect(l[0].url).toBe('https://www.skyscanner.nl/transport/vluchten/ams/fco/261201/?adults=2');
  });
  it('bouwt een Booking.com-link met data', () => {
    const l = stayLinks(rome, new Date(2026, 11, 1), new Date(2026, 11, 4), 2);
    expect(l[0].url).toContain('checkin=2026-12-01&checkout=2026-12-04&group_adults=2');
  });
});


import { splitRoute } from '../geo';
describe('dagberekening fiets/hike', () => {
  it('een fietsrit van één dag komt dezelfde dag aan', () => {
    const e = estimateLeg('bike', ams, utrecht, 1);
    expect(e.days).toBe(1);
    expect(e.dayOffset).toBe(0);
  });
  it('splitst een route in gelijke etappes', () => {
    const pts = splitRoute([[52, 4], [52, 5], [52, 6]], 4);
    expect(pts).toHaveLength(3);
    expect(pts[1].lon).toBeCloseTo(5, 1);
    expect(pts[0].lon).toBeCloseTo(4.5, 1);
  });
});

import { nearbyAirports } from '../airports';
import { airlineLinks } from '../links';
describe('luchthavens in de buurt', () => {
  it('vindt Schiphol, Rotterdam en Eindhoven rond Amsterdam', () => {
    const codes = nearbyAirports(ams).map((a) => a.iata);
    expect(codes[0]).toBe('AMS');
    expect(codes).toContain('EIN');
    expect(codes).toContain('RTM');
  });
  it('bouwt Ryanair- en Wizz Air-links', () => {
    const [ry, wz] = airlineLinks('EIN', 'AGP', new Date(2026, 11, 1), 2);
    expect(ry.url).toContain('dateOut=2026-12-01&isReturn=false&originIata=EIN&destinationIata=AGP');
    expect(wz.url).toBe('https://wizzair.com/nl-nl/booking/select-flight/EIN/AGP/2026-12-01/null/2/0/0/null');
  });
});
