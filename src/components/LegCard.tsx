import { useEffect, useState } from 'react';
import type { ModeId, RouteGeometry, Trip } from '../types';
import { MODE_LIST, MODES } from '../lib/modes';
import { computeRoute } from '../lib/geo';
import { estimateLeg, fmtDuration, fmtKm, fmtMoney, legEstimate, type LegEstimate } from '../lib/estimate';
import { transportLinks } from '../lib/links';
import { download, tripToGpx } from '../lib/gpx';
import { updateTrip } from '../lib/store';

interface Props {
  trip: Trip;
  index: number;
  departDate: Date;
  routing: boolean;
}

export function LegCard({ trip, index, departDate, routing }: Props) {
  const stop = trip.stops[index];
  const prev = trip.stops[index - 1];
  const leg = stop.leg!;
  const mode = MODES[leg.mode];
  const est = legEstimate(trip, index)!;
  const [open, setOpen] = useState(false);
  const [compare, setCompare] = useState(false);

  const patch = (p: Partial<typeof leg>) =>
    updateTrip(trip.id, (t) => ({
      ...t,
      stops: t.stops.map((s, i) => (i === index ? { ...s, leg: { ...s.leg!, ...p } } : s)),
    }));

  const setMode = (m: ModeId) => patch({ mode: m });

  return (
    <div className="leg" style={{ borderColor: mode.color }}>
      <div className="leg-head" onClick={() => setOpen(!open)}>
        <span className="leg-icon" style={{ background: mode.color }}>{mode.icon}</span>
        <div className="leg-summary">
          <strong>{mode.label}</strong>
          <span className="muted small">
            {fmtKm(est.distanceKm)} · {est.days > 1 && mode.kmPerDay ? `${est.days} dagen` : fmtDuration(est.durationH)}
            {' · '}{est.co2Kg < 1 ? '0' : Math.round(est.co2Kg)} kg CO₂
            {' · '}{leg.cost != null ? fmtMoney(leg.cost, trip.currency) : `~${fmtMoney(est.cost, trip.currency)}`}
            {est.source === 'estimate' && ' · schatting'}
            {routing && ' · route berekenen…'}
          </span>
        </div>
        {leg.booked ? <span className="badge ok">Geboekt</span> : <span className="badge">Te boeken</span>}
        <span className="chev">{open ? '▴' : '▾'}</span>
      </div>

      {!est.feasible && <div className="warn small">⚠️ {est.reason}</div>}

      {open && (
        <div className="leg-body">
          <div className="mode-chips">
            {MODE_LIST.map((m) => (
              <button key={m.id} type="button" className={`chip${m.id === leg.mode ? ' active' : ''}`}
                style={m.id === leg.mode ? { background: m.color, borderColor: m.color } : undefined}
                onClick={() => setMode(m.id)} title={m.label}>
                {m.icon} <span className="chip-label">{m.label}</span>
              </button>
            ))}
          </div>

          <button type="button" className="btn ghost small" onClick={() => setCompare(!compare)}>
            {compare ? 'Verberg vergelijking' : '⚖️ Vergelijk alle vervoerswijzen'}
          </button>
          {compare && <ModeCompare trip={trip} index={index} onPick={(m) => { setMode(m); setCompare(false); }} />}

          {mode.kmPerDay && est.days > 1 && (
            <p className="small">
              {mode.icon} Ongeveer <strong>{est.days} etappes</strong> van ~{Math.round(est.distanceKm / est.days)} km.
              Plan overnachtingen onderweg door tussenstops toe te voegen.
            </p>
          )}
          {mode.overnight && <p className="small">🛏️ Je slaapt in de trein: dat scheelt een hotelnacht en je komt de volgende ochtend aan.</p>}

          <h4>Zoeken & boeken</h4>
          <div className="links">
            {transportLinks(leg.mode, prev.place, stop.place, departDate, trip.travelers).map((l) => (
              <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="link-btn" title={l.hint}>{l.label} ↗</a>
            ))}
          </div>

          <h4>Mijn boeking</h4>
          <div className="grid2">
            <label className="check">
              <input type="checkbox" checked={leg.booked} onChange={(e) => patch({ booked: e.target.checked })} /> Geboekt
            </label>
            <label>Vertrektijd
              <input type="time" value={leg.departTime ?? ''} onChange={(e) => patch({ departTime: e.target.value || undefined })} />
            </label>
            <label>Werkelijke kosten (totaal)
              <input type="number" min={0} step="0.01" value={leg.cost ?? ''} placeholder={String(Math.round(est.cost))}
                onChange={(e) => patch({ cost: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </label>
            <label>Boekingsnummer / ticket
              <input value={leg.reference ?? ''} onChange={(e) => patch({ reference: e.target.value || undefined })} />
            </label>
          </div>
          <label>Notities
            <textarea rows={2} value={leg.notes ?? ''} onChange={(e) => patch({ notes: e.target.value || undefined })} />
          </label>
          {(leg.mode === 'bike' || leg.mode === 'hike' || leg.mode === 'car') && leg.route && (
            <button type="button" className="btn ghost small"
              onClick={() => download(`${prev.place.name}-${stop.place.name}.gpx`, tripToGpx(trip, index), 'application/gpx+xml')}>
              ⬇️ GPX van dit traject (Komoot, Garmin, OsmAnd)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ModeCompare({ trip, index, onPick }: { trip: Trip; index: number; onPick: (m: ModeId) => void }) {
  const a = trip.stops[index - 1].place;
  const b = trip.stops[index].place;
  const [routes, setRoutes] = useState<Partial<Record<ModeId, RouteGeometry>>>({});

  useEffect(() => {
    let alive = true;
    for (const m of MODE_LIST.filter((m) => m.osrmProfile)) {
      computeRoute(m.id, a, b).then((r) => alive && setRoutes((prev) => ({ ...prev, [m.id]: r })));
    }
    return () => { alive = false; };
  }, [a, b]);

  const rows: LegEstimate[] = MODE_LIST.map((m) => estimateLeg(m.id, a, b, trip.travelers, routes[m.id]));
  const ok = rows.filter((r) => r.feasible);
  const fastest = ok.reduce<LegEstimate | null>((x, r) => (!x || r.durationH < x.durationH ? r : x), null);
  const cheapest = ok.reduce<LegEstimate | null>((x, r) => (!x || r.cost < x.cost ? r : x), null);
  const greenest = ok.filter((r) => !MODES[r.mode].kmPerDay)
    .reduce<LegEstimate | null>((x, r) => (!x || r.co2Kg < x.co2Kg ? r : x), null);

  return (
    <div className="compare">
      <table>
        <thead>
          <tr><th>Vervoer</th><th>Afstand</th><th>Reistijd</th><th>CO₂</th><th>Kosten*</th></tr>
        </thead>
        <tbody>
          {rows.sort((x, y) => Number(y.feasible) - Number(x.feasible) || x.durationH - y.durationH).map((r) => {
            const m = MODES[r.mode];
            return (
              <tr key={r.mode} className={r.feasible ? '' : 'dim'} onClick={() => onPick(r.mode)}>
                <td>
                  {m.icon} {m.label}
                  {r === fastest && <span className="tag">snelst</span>}
                  {r === cheapest && <span className="tag">goedkoopst</span>}
                  {r === greenest && <span className="tag green">groenst</span>}
                </td>
                <td>{fmtKm(r.distanceKm)}</td>
                <td>{m.kmPerDay && r.days > 1 ? `${r.days} dagen` : fmtDuration(r.durationH)}</td>
                <td>{Math.round(r.co2Kg)} kg</td>
                <td>{fmtMoney(r.cost, trip.currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted small">
        * Ruwe schatting voor {trip.travelers} {trip.travelers === 1 ? 'reiziger' : 'reizigers'}. Auto, fiets en wandelen
        gebruiken een echte route (OpenStreetMap); vliegen/trein/bus/boot zijn geschat. Klik een rij om te kiezen.
      </p>
    </div>
  );
}
