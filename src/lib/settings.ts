import { useSyncExternalStore } from 'react';

/** Apparaatinstellingen; bewust apart van reizen, zodat tokens nooit mee-geëxporteerd worden. */
export interface Settings {
  travelpayoutsToken?: string;
  /** Optionele eigen proxy (bijv. Cloudflare Worker) als de API niet direct vanuit de browser werkt */
  priceProxyUrl?: string;
  /** Lokale prijshulp (tools/fare-helper) gebruiken voor Ryanair-prijzen */
  ryanairHelper?: boolean;
  fareHelperUrl?: string;
}

export const DEFAULT_HELPER_URL = 'http://localhost:8787';

const KEY = 'travel-assist:settings:v1';
let settings: Settings = (() => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
})();
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  return settings;
}

export function setSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  localStorage.setItem(KEY, JSON.stringify(settings));
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => settings);
}
