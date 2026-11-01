import { useId, useState } from 'react';
import type { Offer } from '../types';
import { fmtDate, fmtMoney, parseDate } from '../lib/estimate';
import { uid } from '../lib/store';

interface Props {
  offers: Offer[];
  chosenId?: string;
  currency: string;
  /** Standaarddatum voor nieuwe prijzen; leeg = prijs zonder datum (verblijf) */
  defaultDate?: string;
  plannedDate?: string;
  providers: string[];
  onChange: (offers: Offer[]) => void;
  onChoose: (o: Offer | undefined) => void;
}

/** Lijst met gevonden prijzen: toevoegen, vergelijken en de beste kiezen. */
export function OfferList({ offers, chosenId, currency, defaultDate, plannedDate, providers, onChange, onChoose }: Props) {
  const [provider, setProvider] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(defaultDate ?? '');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const listId = useId();

  const sorted = [...offers].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0];

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(price.replace(',', '.'));
    if (!isFinite(n) || n < 0 || !provider.trim()) return;
    onChange([...offers, {
      id: uid(), provider: provider.trim(), price: n, date: date || undefined, time: time || undefined,
      note: note.trim() || undefined, source: 'manual', addedAt: Date.now(),
    }]);
    setPrice(''); setNote(''); setTime('');
  };

  const remove = (id: string) => {
    onChange(offers.filter((o) => o.id !== id));
    if (id === chosenId) onChoose(undefined);
  };

  return (
    <div className="offers">
      {sorted.length > 0 && (
        <table className="offer-table">
          <tbody>
            {sorted.map((o) => (
              <tr key={o.id} className={o.id === chosenId ? 'chosen' : ''}>
                <td>
                  <strong>{o.provider}</strong>
                  {o === cheapest && sorted.length > 1 && <span className="tag green">goedkoopst</span>}
                  {o.source === 'calendar' && <span className="tag">prijskalender</span>}
                  <div className="muted small">
                    {o.date ? fmtDate(parseDate(o.date)) : 'elke datum'}{o.time && ` · ${o.time}`}
                    {o.date && plannedDate && o.date !== plannedDate && ' · ⚠️ andere dag dan gepland'}
                    {o.note && ` · ${o.note}`}
                  </div>
                </td>
                <td className="num"><strong>{fmtMoney(o.price, currency)}</strong>
                  {o !== cheapest && cheapest && <div className="muted small">+{fmtMoney(o.price - cheapest.price, currency)}</div>}
                </td>
                <td className="offer-actions">
                  {o.url && <a href={o.url} target="_blank" rel="noreferrer" className="icon-btn" title="Openen">↗</a>}
                  {o.id === chosenId
                    ? <button type="button" className="btn small" onClick={() => onChoose(undefined)}>✓ Gekozen</button>
                    : <button type="button" className="btn ghost small" onClick={() => onChoose(o)}>Kies</button>}
                  <button type="button" className="icon-btn" onClick={() => remove(o.id)} aria-label="Verwijderen">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form className="offer-form" onSubmit={add}>
        <input list={listId} value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Aanbieder" aria-label="Aanbieder" />
        <datalist id={listId}>{providers.map((p) => <option key={p} value={p} />)}</datalist>
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Prijs (totaal)" inputMode="decimal" aria-label="Prijs" />
        {defaultDate !== undefined && <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Datum" />}
        {defaultDate !== undefined && <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Tijd" />}
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notitie (bijv. 1 overstap, incl. bagage)" aria-label="Notitie" className="wide" />
        <button className="btn" type="submit">＋ Prijs</button>
      </form>
    </div>
  );
}
