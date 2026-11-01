import { useSyncExternalStore } from 'react';
import type { ChecklistItem, ModeId, Trip } from '../types';
import { toISO } from './estimate';

const KEY = 'travel-assist:trips:v1';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function load(): Trip[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Trip[]) : [];
  } catch {
    return [];
  }
}

let trips: Trip[] = load();
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(trips));
  } catch (e) {
    console.error('Opslaan mislukt', e);
    alert('Opslaan mislukt: de opslag van je browser is vol.');
  }
  listeners.forEach((l) => l());
}

export function useTrips(): Trip[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => trips,
  );
}

export function useTrip(id: string | null): Trip | undefined {
  const all = useTrips();
  return all.find((t) => t.id === id);
}

export function updateTrip(id: string, fn: (t: Trip) => Trip) {
  trips = trips.map((t) => (t.id === id ? { ...fn(t), updatedAt: Date.now() } : t));
  emit();
}

export function createTrip(name: string, startDate = toISO(new Date()), travelers = 2): Trip {
  const t: Trip = {
    id: uid(), name, startDate, travelers, currency: 'EUR',
    stops: [], expenses: [], checklist: defaultChecklist([]),
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  trips = [t, ...trips];
  emit();
  return t;
}

export function deleteTrip(id: string) {
  trips = trips.filter((t) => t.id !== id);
  emit();
}

export function importTrips(incoming: Trip[]) {
  const ids = new Set(trips.map((t) => t.id));
  const fresh = incoming.map((t) => (ids.has(t.id) ? { ...t, id: uid() } : t));
  trips = [...fresh, ...trips];
  emit();
}

const BASE = ['Paspoort / ID-kaart', 'Reisverzekering', 'Bankpas & creditcard', 'Telefoon + oplader', 'Powerbank', 'Medicijnen', 'Wereldstekker'];
const BY_MODE: Partial<Record<ModeId, string[]>> = {
  plane: ['Boardingpass', 'Vloeistoffen in zakje (max 100 ml)'],
  nighttrain: ['Oordoppen & slaapmasker', 'Snacks en water'],
  car: ['Rijbewijs', 'Kentekenbewijs / huurcontract', 'Vignet / tolbadge', 'Gevarendriehoek & hesjes'],
  bike: ['Fietspomp & bandenplakset', 'Fietsslot', 'Fietstassen', 'Regenpak', 'Fietsverlichting'],
  hike: ['Wandelschoenen', 'Offline kaart / GPX', 'EHBO-set', 'Waterfles / filter', 'Regenjas', 'Blarenpleisters'],
  ferry: ['Tegen zeeziekte'],
};

export function defaultChecklist(modes: ModeId[]): ChecklistItem[] {
  const labels = [...BASE, ...modes.flatMap((m) => BY_MODE[m] ?? [])];
  return [...new Set(labels)].map((label) => ({ id: uid(), label, done: false }));
}

export function suggestedChecklistItems(trip: Trip): string[] {
  const modes = [...new Set(trip.stops.map((s) => s.leg?.mode).filter(Boolean) as ModeId[])];
  const have = new Set(trip.checklist.map((c) => c.label));
  return [...new Set(modes.flatMap((m) => BY_MODE[m] ?? []))].filter((l) => !have.has(l));
}
