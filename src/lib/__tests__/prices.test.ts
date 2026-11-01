import { describe, expect, it } from 'vitest';
import { compareStartDates, legPriceOn } from '../prices';
import type { Trip } from '../../types';

const trip = (): Trip => ({
  id: 't', name: 'x', startDate: '2027-03-01', travelers: 2, currency: 'EUR', expenses: [], checklist: [], createdAt: 0, updatedAt: 0,
  stops: [
    { id: 'a', place: { name: 'Amsterdam', lat: 52.37, lon: 4.9 }, nights: 0, journal: [] },
    { id: 'b', place: { name: 'Berlijn', lat: 52.52, lon: 13.4 }, nights: 3, journal: [], stay: { name: 'Hotel', booked: false, cost: 300 },
      leg: { mode: 'train', booked: false, offers: [
        { id: 'o1', provider: 'DB', price: 120, date: '2027-03-01', source: 'manual', addedAt: 0 },
        { id: 'o2', provider: 'DB', price: 60, date: '2027-03-02', source: 'manual', addedAt: 0 },
        { id: 'o3', provider: 'NS', price: 90, date: '2027-03-02', source: 'manual', addedAt: 0 },
      ] } },
    { id: 'c', place: { name: 'Praag', lat: 50.08, lon: 14.43 }, nights: 2, journal: [],
      leg: { mode: 'bus', booked: false, cost: 50 } },
  ],
});

describe('legPriceOn', () => {
  it('gebruikt de goedkoopste prijs van die dag', () => {
    expect(legPriceOn(trip(), 1, '2027-03-02')).toEqual({ amount: 60, source: 'offer', label: 'DB' });
  });
  it('valt terug op schatting zonder prijs voor die dag', () => {
    expect(legPriceOn(trip(), 1, '2027-03-05').source).toBe('estimate');
  });
  it('gebruikt een vaste prijs als die is ingevuld', () => {
    expect(legPriceOn(trip(), 2, '2027-03-09')).toEqual({ amount: 50, source: 'fixed' });
  });
});

describe('compareStartDates', () => {
  it('vindt de goedkoopste startdatum', () => {
    const rows = compareStartDates(trip(), ['2027-03-01', '2027-03-02']);
    expect(rows[0].total).toBe(120 + 50 + 300);
    expect(rows[1].total).toBe(60 + 50 + 300);
    expect(rows[1].end).toBe('2027-03-07');
    expect(rows[1].known).toBe(1);
  });
});
