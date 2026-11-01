import { useEffect, useMemo, useState } from 'react';
import type { Offer, Trip } from '../types';
import { updateTrip, uid } from '../lib/store';
import { addDays, fmtDate, fmtMoney, itinerary, legEstimate, parseDate, toISO } from '../lib/estimate';
import { MODES } from '../lib/modes';
import { flexLinks, stayLinks, transportLinks } from '../lib/links';
import { checkHelper, compareStartDates, fetchMonth, flightCodes, monthsNeeded, type PriceSource } from '../lib/prices';
import { useSettings, setSettings } from '../lib/settings';
import { OfferList } from './OfferList';
import { FareCalendar } from './FareCalendar';
import { AirportCompare } from './AirportCompare';

const SOURCE_LABEL: Record<PriceSource, string> = {
  offer: 'jouw prijs', calendar: 'prijskalender', fixed: 'vaste prijs', estimate: 'schatting',
};

export function PricesTab({ trip }: { trip: Trip }) {
  const settings = useSettings();
  const days = itinerary(trip);
  const legs = trip.stops.map((s, i) => ({ s, i })).filter(({ s, i }) => i > 0 && s.leg);
  const stays = trip.stops.map((s, i) => ({ s, i })).filter(({ s, i }) => i > 0 && s.nights > 0);

  if (!legs.length) return <div className="empty">Voeg eerst minstens twee stops toe in het tabblad <b>Route</b>.</div>;

  const setLeg = (i: number, patch: Partial<NonNullable<Trip['stops'][number]['leg']>>) =>
    updateTrip(trip.id, (t) => ({ ...t, stops: t.stops.map((s, k) => (k === i && s.leg ? { ...s, leg: { ...s.leg, ...patch } } : s)) }));
  const setStay = (i: number, patch: Partial<NonNullable<Trip['stops'][number]['stay']>>) =>
    updateTrip(trip.id, (t) => ({ ...t, stops: t.stops.map((s, k) => (k === i ? { ...s, stay: { name: '', booked: false, ...s.stay, ...patch } } : s)) }));

  return (
    <div className="prices">
      <DateCompare trip={trip} hasSource={!!settings.travelpayoutsToken || !!settings.ryanairHelper} />

      <h3>Prijzen per traject</h3>
      {legs.map(({ s, i }) => {
        const leg = s.leg!;
        const m = MODES[leg.mode];
        const prev = trip.stops[i - 1];
        const planned = toISO(days[i - 1].departure);
        const est = legEstimate(trip, i)!;
        const codes = leg.mode === 'plane' ? flightCodes(trip, i) : null;
        const chosen = leg.offers?.find((o) => o.id === leg.chosenOfferId);
        const providers = transportLinks(leg.mode, prev.place, s.place, days[i - 1].departure, trip.travelers).map((l) => l.label.split(' (')[0]);
        const flex = flexLinks(leg.mode, prev.place, s.place, days[i - 1].departure, trip.travelers);
        return (
          <section key={s.id} className="card">
            <header className="card-head">
              <div>
                <strong>{m.icon} {prev.place.name} → {s.place.name}</strong>
                <div className="muted small">{m.label} · gepland {fmtDate(days[i - 1].departure)} · schatting ~{fmtMoney(est.cost, trip.currency)}</div>
              </div>
              {chosen ? <span className="badge ok">{fmtMoney(chosen.price, trip.currency)}</span> : <span className="badge">{leg.offers?.length ?? 0} prijzen</span>}
            </header>
            {(flex.length > 0) && (
              <div className="links">
                {flex.map((l) => <a key={l.label} className="link-btn" href={l.url} target="_blank" rel="noreferrer" title={l.hint}>📅 {l.label} ↗</a>)}
              </div>
            )}
            {leg.mode === 'plane' && (
              <AirportCompare trip={trip} index={i} planned={planned}
                onAdd={(provider, pp, date, url, note) => setLeg(i, {
                  offers: [...(leg.offers ?? []).filter((o) => !(o.provider === provider && o.date === date)), {
                    id: uid(), provider, price: Math.round(pp * trip.travelers * 100) / 100, date, url, note, source: 'calendar', addedAt: Date.now(),
                  }],
                })}
                onCapture={(provider, total, date, url, screenshotIds, time) => setLeg(i, {
                  offers: [...(leg.offers ?? []), {
                    id: uid(), provider, price: total, date, time, url, screenshotIds, source: 'manual',
                    note: 'met screenshot', addedAt: Date.now(),
                  }],
                })} />
            )}
            {codes && settings.travelpayoutsToken && (
              <FareCalendar from={codes.from} to={codes.to} planned={planned} travelers={trip.travelers} currency={trip.currency}
                onPick={(date, pp, airline, link) => setLeg(i, {
                  offers: [...(leg.offers ?? []).filter((o) => !(o.source === 'calendar' && o.date === date)), {
                    id: uid(), provider: airline ? `Vlucht ${airline}` : 'Vlucht', price: Math.round(pp * trip.travelers),
                    date, url: link, source: 'calendar', note: 'uit prijskalender', addedAt: Date.now(),
                  }],
                })} />
            )}
            {codes && !settings.travelpayoutsToken && (
              <p className="muted small">💡 Vul in <b>Instellingen</b> hieronder een gratis Travelpayouts-token in voor een prijskalender met de goedkoopste vliegdag.</p>
            )}
            <OfferList offers={leg.offers ?? []} chosenId={leg.chosenOfferId} currency={trip.currency}
              defaultDate={planned} plannedDate={planned} providers={providers}
              onChange={(offers) => setLeg(i, { offers })}
              onChoose={(o) => setLeg(i, o
                ? { chosenOfferId: o.id, cost: o.price, departTime: o.time ?? leg.departTime }
                : { chosenOfferId: undefined, cost: undefined })} />
            {chosen?.date && chosen.date !== planned && (
              <ShiftHint trip={trip} legIndex={i} date={chosen.date} />
            )}
          </section>
        );
      })}

      {stays.length > 0 && <h3>Prijzen per verblijf</h3>}
      {stays.map(({ s, i }) => {
        const d = days[i];
        const st = s.stay;
        const chosen = st?.offers?.find((o) => o.id === st.chosenOfferId);
        return (
          <section key={s.id} className="card">
            <header className="card-head">
              <div>
                <strong>🏨 {s.place.name}</strong>
                <div className="muted small">{fmtDate(d.arrival)} → {fmtDate(d.departure)} · {s.nights} {s.nights === 1 ? 'nacht' : 'nachten'}</div>
              </div>
              {chosen ? <span className="badge ok">{fmtMoney(chosen.price, trip.currency)}</span> : <span className="badge">{st?.offers?.length ?? 0} prijzen</span>}
            </header>
            <OfferList offers={st?.offers ?? []} chosenId={st?.chosenOfferId} currency={trip.currency}
              providers={stayLinks(s.place, d.arrival, d.departure, trip.travelers).map((l) => l.label.split(' (')[0])}
              onChange={(offers) => setStay(i, { offers })}
              onChoose={(o: Offer | undefined) => setStay(i, o
                ? { chosenOfferId: o.id, cost: o.price, name: st?.name || o.note || o.provider }
                : { chosenOfferId: undefined, cost: undefined })} />
          </section>
        );
      })}

      <Settings />
    </div>
  );
}

/** Als de gekozen prijs op een andere dag is: voorstel om de hele reis te verschuiven. */
function ShiftHint({ trip, legIndex, date }: { trip: Trip; legIndex: number; date: string }) {
  const days = itinerary(trip);
  const diff = Math.round((parseDate(date).getTime() - days[legIndex - 1].departure.getTime()) / 864e5);
  const newStart = toISO(addDays(parseDate(trip.startDate), diff));
  return (
    <div className="warn small row">
      <span>Deze prijs geldt op {fmtDate(parseDate(date))}, {Math.abs(diff)} {Math.abs(diff) === 1 ? 'dag' : 'dagen'} {diff > 0 ? 'later' : 'eerder'} dan gepland.</span>
      <button type="button" className="btn small" onClick={() => updateTrip(trip.id, (t) => ({ ...t, startDate: newStart }))}>
        Hele reis {diff > 0 ? `${diff} d later` : `${-diff} d eerder`}
      </button>
    </div>
  );
}

function DateCompare({ trip, hasSource }: { trip: Trip; hasSource: boolean }) {
  const base = parseDate(trip.startDate);
  const [from, setFrom] = useState(toISO(addDays(base, -7)));
  const [to, setTo] = useState(toISO(addDays(base, 14)));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const starts = useMemo(() => {
    const out: string[] = [];
    const today = toISO(new Date());
    for (let d = parseDate(from), k = 0; toISO(d) <= to && k < 62; d = addDays(d, 1), k++) {
      if (toISO(d) >= today) out.push(toISO(d));
    }
    return out;
  }, [from, to]);

  const needed = useMemo(() => monthsNeeded(trip, starts), [trip, starts]);

  const loadFares = async () => {
    setLoading(true); setMsg(null);
    let ok = 0;
    for (const n of needed) {
      try { await fetchMonth(n, trip.currency); ok++; } catch (e) { setMsg((e as Error).message); break; }
    }
    setLoading(false);
    setTick((t) => t + 1);
    if (ok === needed.length) setMsg(null);
  };

  // Automatisch ophalen als er een token is (resultaten worden 6 uur bewaard).
  useEffect(() => {
    if (hasSource && needed.length) loadFares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSource, needed.map((n) => `${n.source}${n.from}${n.to}${n.month}`).join()]);

  const rows = compareStartDates(trip, starts);
  if (!rows.length) return null;
  const min = Math.min(...rows.map((r) => r.total));
  const max = Math.max(...rows.map((r) => r.total));
  const best = rows.find((r) => r.total === min)!;
  const current = rows.find((r) => r.start === trip.startDate);
  const saving = current ? current.total - best.total : 0;
  const allEstimated = rows.every((r) => r.legs.every((l) => l.source === 'estimate' || l.source === 'fixed'));

  return (
    <section className="card">
      <header className="card-head">
        <div>
          <strong>📅 Beste vertrekdatum</strong>
          <div className="muted small">Totale reisprijs (vervoer + verblijf) per vertrekdatum</div>
        </div>
      </header>
      <div className="row date-range">
        <label>Van<input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label>
        <label>Tot<input type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} /></label>
        {hasSource && needed.length > 0 && (
          <button type="button" className="btn ghost small" onClick={loadFares} disabled={loading}>{loading ? 'Ophalen…' : '↻ Vliegprijzen'}</button>
        )}
      </div>
      {msg && <div className="warn small">{msg}</div>}

      {allEstimated ? (
        <p className="small">
          Nog geen prijzen per datum bekend, dus elke dag kost nu hetzelfde. Voeg hieronder prijzen toe die je bij aanbieders vindt
          (met datum){!hasSource && trip.stops.some((x) => x.leg?.mode === 'plane') && ', of zet bij Instellingen een prijsbron voor vluchten aan'} — dan zie je hier welke dag het goedkoopst is.
        </p>
      ) : (
        <>
          <div className="hero-number">
            <span className="muted small">Goedkoopste vertrek</span>
            <strong>{fmtDate(parseDate(best.start))}</strong>
            <span>{fmtMoney(best.total, trip.currency)}{saving > 0.5 && <> · <b>{fmtMoney(saving, trip.currency)}</b> goedkoper dan je huidige datum</>}</span>
            {best.start !== trip.startDate && (
              <button type="button" className="btn small" onClick={() => updateTrip(trip.id, (t) => ({ ...t, startDate: best.start }))}>Kies deze datum</button>
            )}
          </div>
          <div className="date-bars" role="list">
            {rows.map((r) => {
              const w = max > 0 ? (100 * r.total) / max : 0; // vanaf nul: eerlijke verhoudingen
              const isBest = r.total === min;
              const isCur = r.start === trip.startDate;
              const guess = r.legs.some((l) => l.source === 'estimate');
              const d = parseDate(r.start);
              const tip = `${fmtDate(d)} → ${fmtDate(parseDate(r.end))}\nTotaal ${fmtMoney(r.total, trip.currency)}\n` +
                r.legs.map((l, k) => `Traject ${k + 1}: ${fmtMoney(l.amount, trip.currency)} (${SOURCE_LABEL[l.source]})`).join('\n') +
                (r.stays ? `\nVerblijf: ${fmtMoney(r.stays, trip.currency)}` : '');
              return (
                <button key={r.start} type="button" role="listitem" className={`date-bar${isCur ? ' current' : ''}`} title={tip}
                  onClick={() => updateTrip(trip.id, (t) => ({ ...t, startDate: r.start }))}>
                  <span className={`db-label${d.getDay() % 6 === 0 ? ' weekend' : ''}`}>{fmtDate(d)}</span>
                  <span className="db-track"><span className={`db-fill${isBest ? ' best' : ''}${guess ? ' guess' : ''}`} style={{ width: `${w}%` }} /></span>
                  <span className={`db-value${guess ? ' muted' : ''}`}>{guess && '~'}{fmtMoney(r.total, trip.currency)}{isBest && ' ★'}</span>
                </button>
              );
            })}
          </div>
          <p className="muted small">★ = goedkoopst. ~ = bevat een schatting (nog geen prijs voor die dag). Klik een datum om je reis daarheen te verschuiven; beweeg erover voor de opbouw.
            Trajecten zonder prijs voor die dag tellen mee als schatting of vaste prijs.</p>
        </>
      )}
    </section>
  );
}

function Settings() {
  const s = useSettings();
  return (
    <details className="card settings">
      <summary><strong>⚙️ Instellingen prijsdata</strong></summary>
      <p className="small">
        Voor de vliegprijskalender gebruikt de app de gratis <a href="https://www.travelpayouts.com/" target="_blank" rel="noreferrer">Travelpayouts</a> Data API
        (prijzen uit recente zoekopdrachten op Aviasales). Maak een gratis account, ga naar <i>Profiel → API-token</i> en plak de token hier.
        De token blijft alleen op dit apparaat en gaat niet mee bij het exporteren van een reis.
      </p>
      <label>Travelpayouts API-token
        <input type="password" autoComplete="off" value={s.travelpayoutsToken ?? ''}
          onChange={(e) => setSettings({ travelpayoutsToken: e.target.value.trim() || undefined })} />
      </label>
      <label>Proxy-URL (optioneel)
        <input type="url" placeholder="https://jouw-worker.workers.dev" value={s.priceProxyUrl ?? ''}
          onChange={(e) => setSettings({ priceProxyUrl: e.target.value.trim() || undefined })} />
      </label>
      <p className="muted small">Alleen nodig als de prijsdienst rechtstreeks vanuit de browser geblokkeerd wordt. Zie <code>proxy/README.md</code> in de repository.</p>
      <HelperSettings />
    </details>
  );
}

function HelperSettings() {
  const s = useSettings();
  const [status, setStatus] = useState<'unknown' | 'ok' | 'down'>('unknown');
  useEffect(() => {
    if (!s.ryanairHelper) return;
    checkHelper().then((ok) => setStatus(ok ? 'ok' : 'down'));
  }, [s.ryanairHelper, s.fareHelperUrl]);
  return (
    <div className="helper-settings">
      <h4>Ryanair-prijzen via mijn computer</h4>
      <p className="small">
        Start op je computer de prijshulp met <code>node tools/fare-helper/server.mjs</code> (zie <code>tools/fare-helper/README.md</code>).
        Werkt alleen in de browser op die computer. Alleen voor persoonlijk gebruik; Ryanairs voorwaarden staan automatisch ophalen niet toe.
      </p>
      <label className="check">
        <input type="checkbox" checked={!!s.ryanairHelper} onChange={(e) => setSettings({ ryanairHelper: e.target.checked || undefined })} />
        Prijshulp gebruiken
        {s.ryanairHelper && <span className={`badge${status === 'ok' ? ' ok' : ''}`}>{status === 'ok' ? 'verbonden' : status === 'down' ? 'niet bereikbaar' : '…'}</span>}
      </label>
      {s.ryanairHelper && (
        <label>Adres prijshulp
          <input type="url" placeholder="http://localhost:8787" value={s.fareHelperUrl ?? ''}
            onChange={(e) => setSettings({ fareHelperUrl: e.target.value.trim() || undefined })} />
        </label>
      )}
    </div>
  );
}
