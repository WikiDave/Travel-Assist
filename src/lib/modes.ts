import type { ModeId } from '../types';

export interface ModeDef {
  id: ModeId;
  label: string;
  icon: string;
  color: string;
  /** Profiel voor routing.openstreetmap.de (echte route) of null (schatting) */
  osrmProfile: 'car' | 'bike' | 'foot' | null;
  /** Gemiddelde snelheid in km/u (voor schatting) */
  speedKmh: number;
  /** Omwegfactor t.o.v. hemelsbrede afstand */
  detour: number;
  /** Vaste extra tijd (inchecken, overstappen) in uren */
  overheadH: number;
  /** kg CO2 per persoon per km */
  co2PerKm: number;
  /** Kosten per persoon per km (EUR, ruwe schatting) */
  costPerKm: number;
  /** Vaste kosten per persoon (EUR) */
  costBase: number;
  /** Zinvolle afstanden (hemelsbreed, km) */
  minKm: number;
  maxKm: number;
  /** Voor meerdaagse modi (fiets/hike): km per dag */
  kmPerDay?: number;
  /** Kosten worden per voertuig gedeeld door reizigers (auto) */
  perVehicle?: boolean;
  /** Komt de volgende ochtend aan (slaaptrein) */
  overnight?: boolean;
}

export const MODES: Record<ModeId, ModeDef> = {
  plane: {
    id: 'plane', label: 'Vliegtuig', icon: '✈️', color: '#2563eb', osrmProfile: null,
    speedKmh: 750, detour: 1.05, overheadH: 3, co2PerKm: 0.2, costPerKm: 0.07, costBase: 45,
    minKm: 250, maxKm: 20000,
  },
  train: {
    id: 'train', label: 'Trein', icon: '🚆', color: '#dc2626', osrmProfile: null,
    speedKmh: 110, detour: 1.2, overheadH: 0.5, co2PerKm: 0.03, costPerKm: 0.13, costBase: 5,
    minKm: 10, maxKm: 2000,
  },
  nighttrain: {
    id: 'nighttrain', label: 'Slaaptrein', icon: '🛏️', color: '#7c3aed', osrmProfile: null,
    speedKmh: 80, detour: 1.2, overheadH: 0.5, co2PerKm: 0.03, costPerKm: 0.08, costBase: 50,
    minKm: 400, maxKm: 2500, overnight: true,
  },
  bus: {
    id: 'bus', label: 'Bus', icon: '🚌', color: '#16a34a', osrmProfile: null,
    speedKmh: 70, detour: 1.25, overheadH: 0.3, co2PerKm: 0.03, costPerKm: 0.06, costBase: 5,
    minKm: 10, maxKm: 2500,
  },
  car: {
    id: 'car', label: 'Auto', icon: '🚗', color: '#ea580c', osrmProfile: 'car',
    speedKmh: 85, detour: 1.25, overheadH: 0, co2PerKm: 0.17, costPerKm: 0.2, costBase: 0,
    minKm: 1, maxKm: 6000, perVehicle: true,
  },
  bike: {
    id: 'bike', label: 'Fiets', icon: '🚲', color: '#0891b2', osrmProfile: 'bike',
    speedKmh: 16, detour: 1.25, overheadH: 0, co2PerKm: 0, costPerKm: 0, costBase: 0,
    minKm: 0, maxKm: 3000, kmPerDay: 80,
  },
  hike: {
    id: 'hike', label: 'Wandelen / hike', icon: '🥾', color: '#65a30d', osrmProfile: 'foot',
    speedKmh: 4.5, detour: 1.3, overheadH: 0, co2PerKm: 0, costPerKm: 0, costBase: 0,
    minKm: 0, maxKm: 1500, kmPerDay: 22,
  },
  ferry: {
    id: 'ferry', label: 'Veerboot', icon: '⛴️', color: '#0369a1', osrmProfile: null,
    speedKmh: 35, detour: 1.15, overheadH: 1, co2PerKm: 0.11, costPerKm: 0.15, costBase: 15,
    minKm: 5, maxKm: 3000,
  },
};

export const MODE_LIST: ModeDef[] = Object.values(MODES);
