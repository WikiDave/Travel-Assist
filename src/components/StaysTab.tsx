import type { Stay, Trip } from '../types';
import { updateTrip } from '../lib/store';
import { fmtDate, fmtMoney, itinerary } from '../lib/estimate';
import { exploreLinks, stayLinks } from '../lib/links';

export function StaysTab({ trip }: { trip: Trip }) {
  const days = itinerary(trip);
  const patch = (i: number, p: Partial<Stay>) =>
    updateTrip(trip.id, (t) => ({
      ...t,
      stops: t.stops.map((s, k) => (k === i ? { ...s, stay: { name: '', booked: false, ...s.stay, ...p } } : s)),
    }));

  const staying = trip.stops.map((s, i) => ({ s, i })).filter(({ s, i }) => i > 0 && s.nights > 0);
  if (!staying.length) return <div className="empty">Voeg bestemmingen met minstens één nacht toe in het tabblad <b>Route</b>.</div>;

  const nights = staying.reduce((n, { s }) => n + s.nights, 0);
  const booked = staying.filter(({ s }) => s.stay?.booked).reduce((n, { s }) => n + s.nights, 0);

  return (
    <div>
      <div className="progress"><div style={{ width: `${(booked / nights) * 100}%` }} /></div>
      <p className="muted small">{booked} van {nights} nachten geboekt</p>
      {staying.map(({ s, i }) => {
        const d = days[i];
        const st = s.stay;
        return (
          <section key={s.id} className="card">
            <header className="card-head">
              <div>
                <strong>{s.place.name}</strong>
                <div className="muted small">{fmtDate(d.arrival)} → {fmtDate(d.departure)} · {s.nights} {s.nights === 1 ? 'nacht' : 'nachten'}</div>
              </div>
              {st?.booked ? <span className="badge ok">Geboekt</span> : <span className="badge">Nog niet geboekt</span>}
            </header>
            <div className="links">
              {stayLinks(s.place, d.arrival, d.departure, trip.travelers).map((l) => (
                <a key={l.label} className="link-btn" href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>
              ))}
            </div>
            <div className="grid2">
              <label>Accommodatie<input value={st?.name ?? ''} onChange={(e) => patch(i, { name: e.target.value })} placeholder="Naam hotel, hostel, camping…" /></label>
              <label>Totale kosten<input type="number" min={0} step="0.01" value={st?.cost ?? ''} onChange={(e) => patch(i, { cost: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
              <label>Adres<input value={st?.address ?? ''} onChange={(e) => patch(i, { address: e.target.value || undefined })} /></label>
              <label>Boekingsnummer<input value={st?.reference ?? ''} onChange={(e) => patch(i, { reference: e.target.value || undefined })} /></label>
              <label>Link naar boeking<input type="url" value={st?.link ?? ''} onChange={(e) => patch(i, { link: e.target.value || undefined })} /></label>
              <label className="check"><input type="checkbox" checked={!!st?.booked} onChange={(e) => patch(i, { booked: e.target.checked })} /> Geboekt</label>
            </div>
            {st?.cost != null && s.nights > 0 && <p className="muted small">≈ {fmtMoney(st.cost / s.nights, trip.currency)} per nacht</p>}
            <details>
              <summary className="small">💡 Wat te doen in {s.place.name}</summary>
              <div className="links">
                {exploreLinks(s.place).map((l) => <a key={l.label} className="link-btn" href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}
              </div>
            </details>
          </section>
        );
      })}
    </div>
  );
}
