import { useState } from 'react';
import type { Place, Trip } from '../types';
import { PlaceSearch } from './PlaceSearch';
import { LegCard } from './LegCard';
import { updateTrip } from '../lib/store';
import { fmtDate, fmtDuration, fmtKm, fmtMoney, itinerary, legEstimate } from '../lib/estimate';
import { MODES } from '../lib/modes';
import { insertStop, moveStop, removeStop, replacePlace } from '../lib/plan';

interface Props {
  trip: Trip;
  routingIds: Set<string>;
  onFocus: (i: number) => void;
}

export function PlanTab({ trip, routingIds, onFocus }: Props) {
  const days = itinerary(trip);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const remove = (i: number) => {
    const s = trip.stops[i];
    if ((s.journal.length || s.stay?.name) && !confirm(`${s.place.name} verwijderen, inclusief verblijf en dagboek?`)) return;
    removeStop(trip.id, i);
  };

  const setNights = (i: number, n: number) =>
    updateTrip(trip.id, (t) => ({ ...t, stops: t.stops.map((s, k) => (k === i ? { ...s, nights: Math.max(0, Math.min(60, n)) } : s)) }));

  const totals = trip.stops.reduce(
    (acc, _, i) => {
      const e = legEstimate(trip, i);
      if (e) { acc.km += e.distanceKm; acc.h += e.durationH; acc.co2 += e.co2Kg; }
      return acc;
    },
    { km: 0, h: 0, co2: 0 },
  );
  const end = days[days.length - 1];
  const last = trip.stops[trip.stops.length - 1];

  const insertBox = (at: number) => (
    <div className="insert-box">
      <PlaceSearch placeholder="Tussenstop zoeken…" onSelect={(p: Place) => { insertStop(trip.id, p, at); setInsertAt(null); }} />
      <button type="button" className="btn ghost small" onClick={() => setInsertAt(null)}>Annuleren</button>
    </div>
  );

  return (
    <div className="plan">
      {trip.stops.length > 1 && (
        <div className="stats">
          <div><strong>{fmtKm(totals.km)}</strong><span>afstand</span></div>
          <div><strong>{fmtDuration(totals.h)}</strong><span>onderweg</span></div>
          <div><strong>{Math.round(totals.co2)} kg</strong><span>CO₂</span></div>
          {end && <div><strong>{Math.round((end.departure.getTime() - days[0].arrival.getTime()) / 864e5) + 1}</strong><span>dagen</span></div>}
        </div>
      )}

      {trip.stops.length === 0 && (
        <div className="empty"><p>Waar vertrek je vandaan? Voeg je startpunt toe en daarna elke bestemming.</p></div>
      )}

      <ol className="stops">
        {trip.stops.map((s, i) => {
          const d = days[i];
          const est = legEstimate(trip, i);
          return (
            <li key={s.id}
              className={`${dragFrom !== null && dragOver === i && dragFrom !== i ? 'drop-target' : ''}${dragFrom === i ? ' dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); if (dragOver !== i) setDragOver(i); }}
              onDrop={(e) => {
                e.preventDefault();
                const from = Number(e.dataTransfer.getData('text/plain'));
                if (Number.isInteger(from) && e.dataTransfer.getData('text/plain') !== '') moveStop(trip.id, from, i);
                setDragFrom(null); setDragOver(null);
              }}
            >
              {i > 0 && s.leg && (
                <>
                  {insertAt === i ? insertBox(i) : (
                    <button type="button" className="insert-btn" onClick={() => setInsertAt(i)} title="Tussenstop toevoegen">＋ tussenstop</button>
                  )}
                  <LegCard trip={trip} index={i} departDate={days[i - 1].departure} routing={routingIds.has(s.id)} />
                </>
              )}
              <div className="stop" draggable={editing !== i}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(i)); // vereist door Firefox
                  setTimeout(() => setDragFrom(i), 0); // DOM niet wijzigen tijdens dragstart
                }}
                onDragEnd={() => { setDragFrom(null); setDragOver(null); }}>
                <span className="drag-handle" title="Sleep om te verplaatsen">⋮⋮</span>
                <button type="button" className="stop-num" onClick={() => onFocus(i)} title="Toon op kaart">{i + 1}</button>
                <div className="stop-main">
                  {editing === i ? (
                    <div className="row">
                      <PlaceSearch placeholder={`Vervang ${s.place.name}…`} allowLocation={false}
                        onSelect={(p) => { replacePlace(trip.id, i, p); setEditing(null); }} />
                      <button type="button" className="icon-btn" onClick={() => setEditing(null)}>✕</button>
                    </div>
                  ) : (
                    <>
                      <div className="stop-title">
                        <strong>{s.place.name}</strong>
                        {s.place.countryCode && <span className="small"> {flag(s.place.countryCode)}</span>}
                      </div>
                      <div className="muted small">
                        {i === 0 ? `Vertrek ${fmtDate(d.arrival)}` : (
                          <>
                            {fmtDate(d.arrival)}{s.nights > 0 && ` → ${fmtDate(d.departure)}`}
                            {s.leg && est && MODES[s.leg.mode].kmPerDay && est.days > 1 && ` · na ${est.days} dagen ${MODES[s.leg.mode].icon}`}
                            {s.stay?.name && ` · 🏨 ${s.stay.name}`}
                            {s.stay?.cost != null && ` (${fmtMoney(s.stay.cost, trip.currency)})`}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {i > 0 && (
                  <div className="nights" title="Aantal nachten">
                    <button type="button" onClick={() => setNights(i, s.nights - 1)} aria-label="Minder nachten">−</button>
                    <span>{s.nights} 🌙</span>
                    <button type="button" onClick={() => setNights(i, s.nights + 1)} aria-label="Meer nachten">+</button>
                  </div>
                )}
                <details className="menu stop-menu">
                  <summary className="icon-btn" title="Meer">⋯</summary>
                  <div className="menu-items" onClick={(e) => (e.currentTarget.parentElement as HTMLDetailsElement).removeAttribute('open')}>
                    <button type="button" onClick={() => setEditing(i)}>✏️ Andere plaats kiezen</button>
                    <button type="button" disabled={i === 0} onClick={() => moveStop(trip.id, i, i - 1)}>↑ Omhoog</button>
                    <button type="button" disabled={i === trip.stops.length - 1} onClick={() => moveStop(trip.id, i, i + 1)}>↓ Omlaag</button>
                    <button type="button" className="danger" onClick={() => remove(i)}>🗑️ Verwijderen</button>
                  </div>
                </details>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="add-stop">
        <h3>{trip.stops.length === 0 ? '🏁 Vertrekpunt' : '➕ Volgende bestemming'}</h3>
        <PlaceSearch onSelect={(p) => insertStop(trip.id, p)} />
        {trip.stops.length > 1 && last.place.name !== trip.stops[0].place.name && (
          <button type="button" className="btn ghost small" onClick={() => insertStop(trip.id, trip.stops[0].place, undefined, 0)}>
            ↩️ Terug naar {trip.stops[0].place.name}
          </button>
        )}
      </div>
    </div>
  );
}

export function flag(cc: string): string {
  return cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '';
}
