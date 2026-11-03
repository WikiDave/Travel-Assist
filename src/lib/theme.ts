import { useSyncExternalStore } from 'react';

/** 'auto' volgt de instelling van het apparaat. */
export type ThemeChoice = 'auto' | 'light' | 'dark';

const KEY = 'travel-assist:theme';
const ORDER: ThemeChoice[] = ['auto', 'light', 'dark'];
export const THEME_LABEL: Record<ThemeChoice, string> = { auto: 'Automatisch', light: 'Licht', dark: 'Donker' };

const listeners = new Set<() => void>();
const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

let choice: ThemeChoice = read();

/** Het thema dat nu echt zichtbaar is. */
export function effectiveTheme(c: ThemeChoice = choice): 'light' | 'dark' {
  return c === 'auto' ? (media?.matches ? 'dark' : 'light') : c;
}

function apply() {
  const root = document.documentElement;
  if (choice === 'auto') delete root.dataset.theme;
  else root.dataset.theme = choice;
  // Kleur van de statusbalk / browserbalk op telefoons
  const color = effectiveTheme() === 'dark' ? '#191815' : '#f1ede3';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
}

export function setTheme(c: ThemeChoice) {
  choice = c;
  try {
    if (c === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, c);
  } catch { /* alleen voor deze sessie */ }
  apply();
  listeners.forEach((l) => l());
}

export function cycleTheme() {
  setTheme(ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length]);
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => choice);
}

// Bij wisselen van de systeeminstelling de balkkleur bijwerken.
media?.addEventListener?.('change', () => { apply(); listeners.forEach((l) => l()); });
apply();
