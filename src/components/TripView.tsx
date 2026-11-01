import { useCallback, useEffect, useRef, useState } from 'react';
import type { Trip } from '../types';
import { MapView } from './MapView';
import { PlanTab } from './PlanTab';
import { StaysTab } from './StaysTab';
import { JournalTab } from './JournalTab';
import { BudgetTab } from './BudgetTab';
import { ChecklistTab } from './ChecklistTab';
import { PricesTab } from './PricesTab';
import { deleteTrip, updateTrip } from '../lib/store';
import { computeRoute } from '../lib/geo';
import { MODES } from '../lib/modes';
import { routeKey } from '../lib/estimate';
import { download, tripToGpx } from '../lib/gpx';

type Tab = 'route' | 'kaart' | 'prijzen' | 'verblijf' | 'dagboek' | 'budget' | 'paklijst';
const TABS: { id: Tab; label: string; icon: string; mobileOnly?: boolean }[] = [
  { id: 'route', label: 'Route', icon: '🧭' },
  { id: 'kaart', label: 'Kaart', icon: '🗺️', mobileOnly: true },
  { id: 'prijzen', label: 'Prijzen', icon: '🏷️' },
  { id: 'verblijf', label: 'Verblijf', icon: '🏨' },
  { id: 'dagboek', label: 'Dagboek', icon: '📔' },
  { id: 'budget', label: 'Budget', icon: '💶' },
  { id: 'paklijst', label: 'Paklijst', icon: '🎒' },
];

/** Haalt echte routes op (auto/fiets/lopen) voor trajecten waarvan de route verouderd is. Geeft de stop-id's terug die bezig zijn. */
function useRouteSync(trip: Trip): Set<string> {
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const inflight = useRef(new Set<string>());
  const failed = useRef(new Set<string>());

  useEffect(() => {
    trip.stops.forEach((s, i) => {
      if (i === 0 || !s.leg || !MODES[s.leg.mode].osrmProfile) return;
      const prev = trip.stops[i - 1];
      const key = routeKey(s.leg.mode, prev.place, s.place);
      if (s.leg.routeKey === key || inflight.current.has(key) || failed.current.has(key)) return;
      inflight.current.add(key);
      setBusy((b) => new Set(b).add(s.id));
      computeRoute(s.leg.mode, prev.place, s.place)
        .then((route) => {
          // Mislukt (geen route, server onbereikbaar): schatting blijven gebruiken, niet steeds opnieuw proberen.
          if (route.source !== 'osrm') { failed.current.add(key); return; }
          updateTrip(trip.id, (t) => ({
            ...t,
            stops: t.stops.map((x) => (x.id === s.id && x.leg ? { ...x, leg: { ...x.leg, route, routeKey: key } } : x)),
          }));
        })
        .finally(() => {
          inflight.current.delete(key);
          setBusy((b) => { const n = new Set(b); n.delete(s.id); return n; });
        });
    });
  }, [trip]);

  return busy;
}

export function TripView({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('route');
  const [focus, setFocus] = useState<number | null>(null);
  const routing = useRouteSync(trip);
  const set = (fn: (t: Trip) => Trip) => updateTrip(trip.id, fn);

  const onSelectStop = useCallback((i: number) => setFocus(i), []);

  const exportJson = () => download(`${trip.name}.json`, JSON.stringify(trip, null, 2), 'application/json');
  const remove = () => {
    if (confirm(`Reis "${trip.name}" definitief verwijderen?`)) { deleteTrip(trip.id); onBack(); }
  };

  return (
    <div className="trip">
      <header className="trip-head">
        <button type="button" className="btn ghost" onClick={onBack} aria-label="Terug">←</button>
        <input className="trip-name" value={trip.name} onChange={(e) => set((t) => ({ ...t, name: e.target.value }))} />
        <details className="menu">
          <summary className="btn ghost">⋯</summary>
          <div className="menu-items">
            <button type="button" onClick={exportJson}>⬇️ Exporteer reis (JSON)</button>
            <button type="button" onClick={() => download(`${trip.name}.gpx`, tripToGpx(trip), 'application/gpx+xml')}>⬇️ Exporteer route (GPX)</button>
            <button type="button" onClick={() => window.print()}>🖨️ Afdrukken / PDF</button>
            <button type="button" className="danger" onClick={remove}>🗑️ Reis verwijderen</button>
          </div>
        </details>
      </header>
      <div className="trip-meta">
        <label>Vertrekdatum<input type="date" value={trip.startDate} onChange={(e) => e.target.value && set((t) => ({ ...t, startDate: e.target.value }))} /></label>
        <label>Reizigers<input type="number" min={1} max={20} value={trip.travelers} onChange={(e) => set((t) => ({ ...t, travelers: Math.max(1, Number(e.target.value) || 1) }))} /></label>
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`${tab === t.id ? 'active' : ''}${t.mobileOnly ? ' mobile-only' : ''}`} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span> <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <div className={`trip-body tab-${tab}`}>
        <main className="panel">
          {tab === 'route' && <PlanTab trip={trip} routingIds={routing} onFocus={(i) => { setFocus(i); }} />}
          {tab === 'prijzen' && <PricesTab trip={trip} />}
          {tab === 'verblijf' && <StaysTab trip={trip} />}
          {tab === 'dagboek' && <JournalTab trip={trip} />}
          {tab === 'budget' && <BudgetTab trip={trip} />}
          {tab === 'paklijst' && <ChecklistTab trip={trip} />}
        </main>
        <aside className="map-pane">
          <MapView trip={trip} visible={tab === 'kaart' || window.innerWidth > 900} focusIndex={focus} onSelectStop={onSelectStop} />
        </aside>
      </div>
    </div>
  );
}
