import { useEffect, useState } from 'react';
import { fetchFlightMonth, PriceError, type MonthFares } from '../lib/prices';

type Loader = (from: string, to: string, month: string) => Promise<MonthFares>;
import { fmtMoney, toISO } from '../lib/estimate';

interface Props {
  from: string;
  to: string;
  /** Geplande vertrekdatum (YYYY-MM-DD) */
  planned: string;
  travelers: number;
  currency: string;
  onPick: (date: string, pricePerPerson: number, airline?: string, link?: string) => void;
  /** Prijsbron; standaard de Travelpayouts-kalender */
  load?: Loader;
  source?: string;
}

const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

/** Maandkalender met de laagste vliegprijs per dag. Donkerder = duurder. */
export function FareCalendar({ from, to, planned, travelers, currency, onPick, load, source = 'recente zoekopdrachten' }: Props) {
  const [month, setMonth] = useState(planned.slice(0, 7));
  const [fares, setFares] = useState<MonthFares | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    (load ? load(from, to, month) : fetchFlightMonth(from, to, month, currency))
      .then((f) => alive && setFares(f))
      .catch((e) => alive && setError(e instanceof PriceError ? e.message : 'Ophalen mislukt'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, month, currency]);

  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const prices = Object.values(fares ?? {}).map((f) => f.price);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const today = toISO(new Date());
  const shift = (n: number) => setMonth(toISO(new Date(y, m - 1 + n, 1)).slice(0, 7));

  return (
    <div className="fare-cal">
      <div className="fare-cal-head">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Vorige maand">‹</button>
        <strong>{first.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })} · {from} → {to}</strong>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Volgende maand">›</button>
      </div>
      {error && <div className="warn small">{error}</div>}
      {loading && <div className="muted small">Prijzen ophalen…</div>}
      <div className="fare-grid" role="grid">
        {WEEKDAYS.map((d) => <div key={d} className="fare-wd">{d}</div>)}
        {Array.from({ length: lead }, (_, k) => <div key={`e${k}`} />)}
        {Array.from({ length: daysInMonth }, (_, k) => {
          const iso = `${month}-${String(k + 1).padStart(2, '0')}`;
          const f = fares?.[iso];
          // Eén tint, lichter = goedkoper (sequentiële schaal van 15% tot 85%)
          const t = f && max > min ? (f.price - min) / (max - min) : 0;
          const past = iso < today;
          return (
            <button key={iso} type="button" disabled={!f || past}
              className={`fare-day${iso === planned ? ' planned' : ''}${f && f.price === min ? ' cheapest' : ''}`}
              style={f ? { background: `color-mix(in srgb, var(--brand-2) ${Math.round(15 + t * 70)}%, white)` } : undefined}
              title={f ? `${iso}: ${fmtMoney(f.price, currency)} p.p.${f.airline ? ` · ${f.airline}` : ''}${f.transfers != null ? ` · ${f.transfers === 0 ? 'direct' : `${f.transfers} overstap(pen)`}` : ''}` : `${iso}: geen prijs bekend`}
              onClick={() => f && onPick(iso, f.price, f.airline, f.link)}>
              <span className="fare-dn">{k + 1}</span>
              {f && <span className="fare-p">{Math.round(f.price)}</span>}
            </button>
          );
        })}
      </div>
      {prices.length > 0 && (
        <p className="muted small">
          Laagste prijs deze maand: <strong>{fmtMoney(min, currency)}</strong> p.p. ({fmtMoney(min * travelers, currency)} totaal).
          Prijzen per persoon, enkele reis, bron: {source} — controleer bij boeken. Klik op een dag om hem toe te voegen.
        </p>
      )}
      {fares && !prices.length && !loading && <p className="muted small">Geen prijzen bekend voor deze maand.</p>}
    </div>
  );
}
