import { useState } from 'react';
import { createTrip, importTrips, useTrips } from '../lib/store';
import { addDays, fmtDate, itinerary, legEstimate, parseDate, toISO } from '../lib/estimate';
import { MODES } from '../lib/modes';
import type { Trip } from '../types';

/** Omtrek van de aarde: de schaal van de reismeter. */
const EARTH_KM = 40075;

function verdict(km: number): string {
  if (km < 1) return 'Nog geen kilometer gepland. De bank is ook comfortabel.';
  if (km < 1000) return 'Een prima begin. De koffer staat al klaar.';
  if (km < 10000) return 'Je paspoort begint zich zorgen te maken.';
  if (km < EARTH_KM) return 'Nog even doorplannen en je bent rond.';
  return 'Officieel rond de wereld. Op papier dan.';
}

function tripKm(t: Trip): number {
  return t.stops.reduce((n, _, i) => n + (legEstimate(t, i)?.distanceKm ?? 0), 0);
}

export function TripList({ onOpen }: { onOpen: (id: string) => void }) {
  const trips = useTrips();
  const [name, setName] = useState('');
  const [date, setDate] = useState(toISO(addDays(new Date(), 30)));
  const [showForm, setShowForm] = useState(false);

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

  const km = trips.reduce((n, t) => n + tripKm(t), 0);
  const stops = trips.reduce((n, t) => n + t.stops.length, 0);
  const formOpen = showForm || trips.length === 0;

  return (
    <div className="home">
      <header className="site-head">
        <span className="logo">TRAVEL ASSIST<sup>®</sup></span>
        <span className="status"><i className="dot" /> Klaar voor vertrek</span>
      </header>

      <section className="intro">
        <p className="eyebrow">De alles-in-één reisplanner</p>
        <h1 className="display">Gewoon gaan<span className="accent">.</span> Of toch even plannen?</h1>
        <p className="lead">
          Sommige mensen pakken gewoon hun tas. Jij hebt vliegtuig, trein, slaaptrein, bus, auto, fiets en hike in één app —
          plus verblijf, prijzen, budget, paklijst en reisdagboek.
        </p>
        <span className="sticker">100% reizen. 0% gedoe.</span>
      </section>

      <section className="meter" aria-label="Reismeter">
        <div className="meter-head">
          <span>De reismeter™</span>
          <span className="meter-modes" aria-hidden>{Object.values(MODES).slice(0, 4).map((m) => m.icon).join('')} v.01</span>
        </div>

        <div className="meter-screen">
          {formOpen ? (
            <form className="new-trip" onSubmit={create}>
              <p className="meter-label">Nieuwe reis</p>
              <label>Naam<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Interrail door de Alpen" autoFocus={showForm} /></label>
              <label>Vertrekdatum<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <div className="row">
                <button className="btn" type="submit">Plannen →</button>
                {trips.length > 0 && <button className="btn ghost" type="button" onClick={() => setShowForm(false)}>Terug</button>}
              </div>
            </form>
          ) : (
            <>
              <p className="meter-label">Totaal gepland</p>
              <p className="meter-value">
                <strong>{Math.round(km).toLocaleString('nl-NL')}</strong>
                <span>km / {EARTH_KM.toLocaleString('nl-NL')}</span>
              </p>
              <div className="meter-bar" role="meter" aria-valuemin={0} aria-valuemax={EARTH_KM} aria-valuenow={Math.round(km)} aria-label="Kilometers gepland ten opzichte van een rondje om de aarde">
                <div style={{ width: `${Math.min(100, (km / EARTH_KM) * 100)}%` }} />
              </div>
              <p className="meter-caption">{verdict(km)}</p>
            </>
          )}
        </div>

        {!formOpen && (
          <button type="button" className="meter-btn" onClick={() => setShowForm(true)}>Nieuwe reis? Uiteraard. ↗</button>
        )}

        <div className="meter-foot">
          <span><i className="dot ink" /> {trips.length} {trips.length === 1 ? 'reis' : 'reizen'} gedetecteerd</span>
          <span>Stops {String(stops).padStart(3, '0')}</span>
        </div>
      </section>

      {trips.length > 0 && (
        <section className="trip-list">
          <p className="section-label">Mijn reizen</p>
          <ol>
            {trips.map((t, k) => {
              const it = itinerary(t);
              const end = it[it.length - 1];
              const modes = [...new Set(t.stops.map((s) => s.leg?.mode).filter(Boolean))].map((m) => MODES[m!].icon).join(' ');
              const tkm = tripKm(t);
              return (
                <li key={t.id}>
                  <button type="button" onClick={() => onOpen(t.id)}>
                    <span className="item-kicker">
                      {String(k + 1).padStart(2, '0')} / {fmtDate(parseDate(t.startDate))}{end && t.stops.length > 1 ? ` – ${fmtDate(end.departure)}` : ''}
                    </span>
                    <span className="item-title">{t.name}<span className="accent">.</span></span>
                    <span className="item-text">{t.stops.map((s) => s.place.name).join(' → ') || 'Nog geen stops. Tijd voor een eerste bestemming.'}</span>
                    {(modes || tkm > 0) && <span className="item-meta">{modes}{tkm > 0 && <span>{Math.round(tkm).toLocaleString('nl-NL')} km</span>}</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <label className="btn ghost file small import-btn">
        ⬆️ Reis importeren (JSON)
        <input type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
      </label>

      <footer className="site-foot">
        <p>Gemaakt voor onderweg. Met liefde voor reizen.</p>
        <p>Alles blijft op dit apparaat. Prijzen zijn schattingen tot je boekt. Kaart © OpenStreetMap. © 2026</p>
      </footer>
    </div>
  );
}
