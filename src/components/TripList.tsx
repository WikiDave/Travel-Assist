import { useState } from 'react';
import { createTrip, importTrips, useTrips } from '../lib/store';
import { fmtDate, itinerary, parseDate, toISO, addDays } from '../lib/estimate';
import { MODES } from '../lib/modes';
import type { Trip } from '../types';

export function TripList({ onOpen }: { onOpen: (id: string) => void }) {
  const trips = useTrips();
  const [name, setName] = useState('');
  const [date, setDate] = useState(toISO(addDays(new Date(), 30)));

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const t = createTrip(name.trim() || 'Nieuwe reis', date);
    setName('');
    onOpen(t.id);
  };

  const importFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const list: Trip[] = Array.isArray(data) ? data : [data];
      if (!list.every((t) => t && Array.isArray(t.stops) && t.name)) throw new Error('Geen geldig reisbestand');
      importTrips(list);
    } catch (err) {
      alert(`Importeren mislukt: ${(err as Error).message}`);
    }
  };

  return (
    <div className="home">
      <header className="hero">
        <h1>🧭 Travel Assist</h1>
        <p>Eén app voor je hele reis: vliegen, trein, slaaptrein, bus, auto, fiets en hiken — plus verblijf, budget, paklijst en reisdagboek.</p>
        <div className="mode-strip">{Object.values(MODES).map((m) => <span key={m.id} title={m.label}>{m.icon}</span>)}</div>
      </header>

      <form className="card new-trip" onSubmit={create}>
        <h2>Nieuwe reis</h2>
        <div className="row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Interrail door de Alpen" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 170 }} />
          <button className="btn" type="submit">Plannen →</button>
        </div>
      </form>

      {trips.length > 0 && <h2>Mijn reizen</h2>}
      <div className="trip-cards">
        {trips.map((t) => {
          const it = itinerary(t);
          const end = it[it.length - 1];
          const modes = [...new Set(t.stops.map((s) => s.leg?.mode).filter(Boolean))].map((m) => MODES[m!].icon).join(' ');
          return (
            <button key={t.id} type="button" className="card trip-card" onClick={() => onOpen(t.id)}>
              <strong>{t.name}</strong>
              <span className="muted small">
                {fmtDate(parseDate(t.startDate))}{end && t.stops.length > 1 ? ` – ${fmtDate(end.departure)}` : ''}
              </span>
              <span className="small">{t.stops.map((s) => s.place.name).join(' → ') || 'Nog geen stops'}</span>
              <span>{modes}</span>
            </button>
          );
        })}
      </div>

      <label className="btn ghost file small">
        ⬆️ Reis importeren (JSON)
        <input type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
      </label>
      <p className="muted small footer-note">
        Alles wordt lokaal op dit apparaat opgeslagen. Kaartdata © OpenStreetMap-bijdragers. Prijzen en reistijden zijn schattingen;
        boeken gaat via de aanbieders zelf.
      </p>
    </div>
  );
}
