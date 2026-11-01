import { useEffect, useState } from 'react';
import type { Trip } from '../types';
import { airportPairs, fetchRyanairMonth, PriceError, type MonthFares } from '../lib/prices';
import { airlineLinks } from '../lib/links';
import { useSettings } from '../lib/settings';
import { fmtDate, fmtMoney, parseDate } from '../lib/estimate';
import { FareCalendar } from './FareCalendar';

interface Props {
  trip: Trip;
  index: number;
  /** Geplande vertrekdatum (YYYY-MM-DD) */
  planned: string;
  onAdd: (provider: string, pricePerPerson: number, date: string, url: string, note: string) => void;
}

/**
 * Vergelijkt alle luchthavencombinaties in de buurt (bijv. Eindhoven i.p.v. Schiphol),
 * met directe links naar Ryanair, Wizz Air en Skyscanner en — als de lokale prijshulp
 * aanstaat — de Ryanair-prijs op de geplande dag en de goedkoopste dag van de maand.
 */
export function AirportCompare({ trip, index, planned, onAdd }: Props) {
  const { ryanairHelper } = useSettings();
  const pairs = airportPairs(trip, index);
  const [fares, setFares] = useState<Record<string, MonthFares | 'error'>>({});
  const [error, setError] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<string | null>(null);
  const month = planned.slice(0, 7);
  const pairKey = pairs.map((p) => `${p.from.iata}${p.to.iata}`).join();

  useEffect(() => {
    if (!ryanairHelper) return;
    let alive = true;
    setError(null);
    (async () => {
      for (const p of pairs) {
        const k = `${p.from.iata}-${p.to.iata}`;
        try {
          const f = await fetchRyanairMonth(p.from.iata, p.to.iata, month);
          if (alive) setFares((x) => ({ ...x, [k]: f }));
        } catch (e) {
          if (!alive) return;
          setFares((x) => ({ ...x, [k]: 'error' }));
          if (e instanceof PriceError && e.message.startsWith('Prijshulp niet bereikbaar')) { setError(e.message); return; }
        }
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ryanairHelper, pairKey, month]);

  if (!pairs.length) return null;
  const date = parseDate(planned);

  const rows = pairs.map((p) => {
    const k = `${p.from.iata}-${p.to.iata}`;
    const f = fares[k];
    const month = f && f !== 'error' ? f : undefined;
    const onDay = month?.[planned];
    const cheapest = month && Object.entries(month).reduce<[string, number] | null>((best, [d, v]) => (!best || v.price < best[1] ? [d, v.price] : best), null);
    return { p, k, onDay, cheapest, state: f === 'error' ? 'error' : month ? (Object.keys(month).length ? 'ok' : 'none') : 'loading' };
  });
  const bestOnDay = Math.min(...rows.map((r) => r.onDay?.price ?? Infinity));

  return (
    <div className="airport-compare">
      <h4>Luchthavens in de buurt</h4>
      {error && <div className="warn small">{error}</div>}
      <table className="offer-table">
        <tbody>
          {rows.map(({ p, k, onDay, cheapest, state }) => (
            <tr key={k}>
              <td>
                <strong>{p.from.iata} → {p.to.iata}</strong>
                <div className="muted small">
                  {p.from.city}{p.from.distanceKm > 25 && ` (${Math.round(p.from.distanceKm)} km)`} → {p.to.city}{p.to.distanceKm > 25 && ` (${Math.round(p.to.distanceKm)} km)`}
                </div>
                <div className="links compact">
                  {airlineLinks(p.from.iata, p.to.iata, date, trip.travelers).map((l) => (
                    <a key={l.label} className="link-btn" href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>
                  ))}
                </div>
              </td>
              {ryanairHelper && (
                <td className="num">
                  {state === 'loading' && <span className="muted small">…</span>}
                  {state === 'error' && <span className="muted small">–</span>}
                  {state === 'none' && <span className="muted small">geen Ryanair</span>}
                  {onDay && (
                    <>
                      <strong>{fmtMoney(onDay.price, trip.currency)}</strong>
                      {onDay.price === bestOnDay && rows.length > 1 && <span className="tag green">goedkoopst</span>}
                      <div className="muted small">p.p. op {fmtDate(date)}</div>
                      <button type="button" className="btn ghost small"
                        onClick={() => onAdd(`Ryanair ${p.from.iata}→${p.to.iata}`, onDay.price, planned, airlineLinks(p.from.iata, p.to.iata, date, trip.travelers)[0].url,
                          `vertrek ${onDay.departureAt?.slice(11, 16) ?? '?'}${p.from.distanceKm > 25 ? ` · ${Math.round(p.from.distanceKm)} km naar luchthaven` : ''}`)}>
                        ＋ toevoegen
                      </button>
                    </>
                  )}
                  {state === 'ok' && !onDay && <div className="muted small">geen vlucht op {fmtDate(date)}</div>}
                  {cheapest && cheapest[0] !== planned && (
                    <div className="muted small">laagste: {fmtMoney(cheapest[1], trip.currency)} op {fmtDate(parseDate(cheapest[0]))}</div>
                  )}
                  {state === 'ok' && (
                    <button type="button" className="icon-btn small" onClick={() => setCalendar(calendar === k ? null : k)}>📅 maand</button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {calendar && (() => {
        const p = pairs.find((x) => `${x.from.iata}-${x.to.iata}` === calendar)!;
        return (
          <FareCalendar from={p.from.iata} to={p.to.iata} planned={planned} travelers={trip.travelers} currency={trip.currency}
            load={fetchRyanairMonth} source="Ryanair (via je eigen computer)"
            onPick={(d, pp) => onAdd(`Ryanair ${p.from.iata}→${p.to.iata}`, pp, d, airlineLinks(p.from.iata, p.to.iata, parseDate(d), trip.travelers)[0].url, 'uit Ryanair-kalender')} />
        );
      })()}
      {!ryanairHelper && (
        <p className="muted small">💡 Zet in <b>Instellingen</b> de lokale prijshulp aan om hier Ryanair-prijzen per luchthaven te zien.</p>
      )}
      <p className="muted small">Prijzen per persoon zonder bagage; reken de reis naar een verder gelegen luchthaven mee.</p>
    </div>
  );
}
