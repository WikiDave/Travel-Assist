import type { ModeId, Place, Trip } from '../types';
import { PlaceSearch } from './PlaceSearch';
import { LegCard } from './LegCard';
import { updateTrip, uid } from '../lib/store';
import { fmtDate, fmtDuration, fmtKm, fmtMoney, itinerary, legEstimate } from '../lib/estimate';
import { haversineKm } from '../lib/geo';
import { MODES } from '../lib/modes';

interface Props {
  trip: Trip;
  routingIndex: Set<number>;
  onFocus: (i: number) => void;
}

/** Kiest een logische standaard-vervoerswijze op basis van afstand. */
function defaultMode(a: Place, b: Place): ModeId {
  const km = haversineKm(a, b);
  if (km < 3) return 'hike';
  if (km < 25) return 'bike';
  if (km < 700) return 'train';
  if (km < 1300) return 'nighttrain';
  return 'plane';
}

export function PlanTab({ trip, routingIndex, onFocus }: Props) {
  const days = itinerary(trip);
  const set = (fn: (t: Trip) => Trip) => updateTrip(trip.id, fn);

  const addStop = (place: Place) =>
    set((t) => {
      const prev = t.stops[t.stops.length - 1];
      return {
        ...t,
        stops: [...t.stops, {
          id: uid(), place, nights: prev ? 2 : 0, journal: [],
          leg: prev ? { mode: defaultMode(prev.place, place), booked: false } : undefined,
        }],
      };
    });

  const move = (i: number, dir: -1 | 1) =>
    set((t) => {
      const j = i + dir;
      if (j < 0 || j >= t.stops.length) return t;
      const stops = [...t.stops];
      [stops[i], stops[j]] = [stops[j], stops[i]];
      return { ...t, stops: normalize(stops) };
    });

  const remove = (i: number) => {
    const s = trip.stops[i];
    if ((s.journal.length || s.stay) && !confirm(`${s.place.name} verwijderen, inclusief verblijf en dagboek?`)) return;
    set((t) => ({ ...t, stops: normalize(t.stops.filter((_, k) => k !== i)) }));
  };

  const setNights = (i: number, n: number) =>
    set((t) => ({ ...t, stops: t.stops.map((s, k) => (k === i ? { ...s, nights: Math.max(0, n) } : s)) }));

  const roundTrip = () => {
    const first = trip.stops[0];
    if (first) addStop(first.place);
  };

  const totals = trip.stops.reduce(
    (acc, _, i) => {
      const e = legEstimate(trip, i);
      if (e) { acc.km += e.distanceKm; acc.h += e.durationH; acc.co2 += e.co2Kg; }
      return acc;
    },
    { km: 0, h: 0, co2: 0 },
  );
  const end = days[days.length - 1];

  return (
    <div className="plan">
      {trip.stops.length > 1 && (
        <div className="stats">
          <div><strong>{trip.stops.length}</strong><span>stops</span></div>
          <div><strong>{fmtKm(totals.km)}</strong><span>afstand</span></div>
          <div><strong>{fmtDuration(totals.h)}</strong><span>onderweg</span></div>
          <div><strong>{Math.round(totals.co2)} kg</strong><span>CO₂</span></div>
          {end && <div><strong>{Math.round((end.departure.getTime() - days[0].arrival.getTime()) / 864e5) + 1}</strong><span>dagen</span></div>}
        </div>
      )}

      {trip.stops.length === 0 && (
        <div className="empty">
          <p>Waar vertrek je vandaan? Voeg je startpunt toe en daarna elke bestemming.</p>
        </div>
      )}

      <ol className="stops">
        {trip.stops.map((s, i) => {
          const d = days[i];
          return (
            <li key={s.id}>
              {i > 0 && s.leg && (
                <LegCard trip={trip} index={i} departDate={days[i - 1].departure} routing={routingIndex.has(i)} />
              )}
              <div className="stop">
                <button type="button" className="stop-num" onClick={() => onFocus(i)} title="Toon op kaart">{i + 1}</button>
                <div className="stop-main">
                  <div className="stop-title">
                    <strong>{s.place.name}</strong>
                    {s.place.countryCode && <span className="muted small"> {flag(s.place.countryCode)}</span>}
                  </div>
                  <div className="muted small">
                    {i === 0 ? `Vertrek ${fmtDate(d.arrival)}` : (
                      <>
                        {fmtDate(d.arrival)}{s.nights > 0 && ` → ${fmtDate(d.departure)}`}
                        {s.leg && s.leg.mode && d.legDays > 1 && ` · ${d.legDays} reisdagen ${MODES[s.leg.mode].icon}`}
                        {s.stay?.name && ` · 🏨 ${s.stay.name}`}
                        {s.stay?.cost != null && ` (${fmtMoney(s.stay.cost, trip.currency)})`}
                      </>
                    )}
                  </div>
                </div>
                {i > 0 && (
                  <div className="nights" title="Aantal nachten">
                    <button type="button" onClick={() => setNights(i, s.nights - 1)}>−</button>
                    <span>{s.nights} 🌙</span>
                    <button type="button" onClick={() => setNights(i, s.nights + 1)}>+</button>
                  </div>
                )}
                <div className="stop-actions">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Omhoog">↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === trip.stops.length - 1} title="Omlaag">↓</button>
                  <button type="button" onClick={() => remove(i)} title="Verwijderen">✕</button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="add-stop">
        <h3>{trip.stops.length === 0 ? '🏁 Vertrekpunt' : '➕ Volgende bestemming'}</h3>
        <PlaceSearch onSelect={addStop} />
        {trip.stops.length > 1 && trip.stops[trip.stops.length - 1].place.name !== trip.stops[0].place.name && (
          <button type="button" className="btn ghost small" onClick={roundTrip}>↩️ Terug naar {trip.stops[0].place.name}</button>
        )}
      </div>
    </div>
  );
}

/** Zorgt dat de eerste stop geen traject heeft en de rest wel. */
function normalize(stops: Trip['stops']): Trip['stops'] {
  return stops.map((s, i) => {
    if (i === 0) return { ...s, leg: undefined, nights: 0 };
    if (!s.leg) return { ...s, leg: { mode: defaultMode(stops[i - 1].place, s.place), booked: false }, nights: s.nights || 1 };
    return s;
  });
}

export function flag(cc: string): string {
  return cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '';
}
