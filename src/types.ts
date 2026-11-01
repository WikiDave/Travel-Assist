export type ModeId = 'plane' | 'train' | 'nighttrain' | 'bus' | 'car' | 'bike' | 'hike' | 'ferry';

export interface Place {
  name: string;
  /** Volledige naam zoals teruggegeven door de geocoder */
  displayName?: string;
  lat: number;
  lon: number;
  countryCode?: string;
}

export interface RouteGeometry {
  /** [lat, lon] punten */
  coords: [number, number][];
  distanceKm: number;
  durationH: number;
  source: 'osrm' | 'estimate';
}

/** Het traject om bij deze stop aan te komen (vanaf de vorige stop). */
export interface Leg {
  mode: ModeId;
  /** Vertrektijd (HH:MM), optioneel */
  departTime?: string;
  booked: boolean;
  /** Werkelijke kosten (totaal, alle reizigers) */
  cost?: number;
  reference?: string;
  notes?: string;
  route?: RouteGeometry;
  /** Sleutel (modus + coördinaten) waarvoor `route` berekend is */
  routeKey?: string;
}

export interface Stay {
  name: string;
  booked: boolean;
  /** Totale kosten voor alle nachten */
  cost?: number;
  address?: string;
  reference?: string;
  link?: string;
}

export interface JournalEntry {
  id: string;
  /** ISO-datum YYYY-MM-DD */
  date: string;
  title?: string;
  text: string;
  photoIds: string[];
  lat?: number;
  lon?: number;
  createdAt: number;
}

export interface Stop {
  id: string;
  place: Place;
  nights: number;
  /** Leeg voor de eerste stop (vertrekpunt) */
  leg?: Leg;
  stay?: Stay;
  journal: JournalEntry[];
  notes?: string;
}

export type ExpenseCategory = 'transport' | 'verblijf' | 'eten' | 'activiteiten' | 'overig';

export interface Expense {
  id: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
  date?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Trip {
  id: string;
  name: string;
  /** ISO-datum YYYY-MM-DD */
  startDate: string;
  travelers: number;
  currency: string;
  budget?: number;
  stops: Stop[];
  expenses: Expense[];
  checklist: ChecklistItem[];
  createdAt: number;
  updatedAt: number;
}
