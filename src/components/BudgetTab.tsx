import { useState } from 'react';
import type { ExpenseCategory, Trip } from '../types';
import { updateTrip, uid } from '../lib/store';
import { fmtMoney, legEstimate } from '../lib/estimate';
import { MODES } from '../lib/modes';

const CATS: { id: ExpenseCategory; label: string; icon: string }[] = [
  { id: 'transport', label: 'Vervoer', icon: '🚆' },
  { id: 'verblijf', label: 'Verblijf', icon: '🏨' },
  { id: 'eten', label: 'Eten & drinken', icon: '🍝' },
  { id: 'activiteiten', label: 'Activiteiten', icon: '🎟️' },
  { id: 'overig', label: 'Overig', icon: '🧾' },
];

interface Line { label: string; amount: number; category: ExpenseCategory; estimated: boolean; id?: string }

export function BudgetTab({ trip }: { trip: Trip }) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('eten');

  const lines: Line[] = [];
  trip.stops.forEach((s, i) => {
    if (i > 0 && s.leg) {
      const e = legEstimate(trip, i)!;
      const name = `${MODES[s.leg.mode].icon} ${trip.stops[i - 1].place.name} → ${s.place.name}`;
      if (s.leg.cost != null) lines.push({ label: name, amount: s.leg.cost, category: 'transport', estimated: false });
      else if (e.cost > 0) lines.push({ label: name, amount: e.cost, category: 'transport', estimated: true });
    }
    if (s.stay?.cost != null) lines.push({ label: `🏨 ${s.stay.name || s.place.name}`, amount: s.stay.cost, category: 'verblijf', estimated: false });
  });
  trip.expenses.forEach((x) => lines.push({ label: x.label, amount: x.amount, category: x.category, estimated: false, id: x.id }));

  const total = lines.reduce((n, l) => n + l.amount, 0);
  const actual = lines.filter((l) => !l.estimated).reduce((n, l) => n + l.amount, 0);
  const byCat = CATS.map((c) => ({ ...c, sum: lines.filter((l) => l.category === c.id).reduce((n, l) => n + l.amount, 0) }));
  const cur = trip.currency;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount.replace(',', '.'));
    if (!label.trim() || !isFinite(n)) return;
    updateTrip(trip.id, (t) => ({ ...t, expenses: [...t.expenses, { id: uid(), label: label.trim(), amount: n, category }] }));
    setLabel(''); setAmount('');
  };

  const remove = (id: string) => updateTrip(trip.id, (t) => ({ ...t, expenses: t.expenses.filter((x) => x.id !== id) }));

  return (
    <div>
      <div className="stats">
        <div><strong>{fmtMoney(total, cur)}</strong><span>totaal (incl. schattingen)</span></div>
        <div><strong>{fmtMoney(actual, cur)}</strong><span>bevestigd</span></div>
        <div><strong>{fmtMoney(total / Math.max(1, trip.travelers), cur)}</strong><span>per persoon</span></div>
      </div>

      <label className="inline">Budget
        <input type="number" min={0} value={trip.budget ?? ''} placeholder="Geen"
          onChange={(e) => updateTrip(trip.id, (t) => ({ ...t, budget: e.target.value === '' ? undefined : Number(e.target.value) }))} />
      </label>
      {trip.budget ? (
        <>
          <div className={`progress${total > trip.budget ? ' over' : ''}`}><div style={{ width: `${Math.min(100, (total / trip.budget) * 100)}%` }} /></div>
          <p className="small">{total > trip.budget ? `⚠️ ${fmtMoney(total - trip.budget, cur)} boven budget` : `${fmtMoney(trip.budget - total, cur)} over`}</p>
        </>
      ) : null}

      <div className="cats">
        {byCat.filter((c) => c.sum > 0).map((c) => (
          <div key={c.id} className="cat">
            <span>{c.icon} {c.label}</span>
            <div className="bar"><div style={{ width: `${(c.sum / (total || 1)) * 100}%` }} /></div>
            <strong>{fmtMoney(c.sum, cur)}</strong>
          </div>
        ))}
      </div>

      <form className="row add-expense" onSubmit={add}>
        <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
          {CATS.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Omschrijving" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Bedrag" inputMode="decimal" style={{ maxWidth: 110 }} />
        <button className="btn" type="submit">Toevoegen</button>
      </form>

      <table className="lines">
        <tbody>
          {lines.map((l, k) => (
            <tr key={k} className={l.estimated ? 'dim' : ''}>
              <td>{l.label}{l.estimated && <span className="tag">schatting</span>}</td>
              <td className="num">{fmtMoney(l.amount, cur)}</td>
              <td>{l.id && <button type="button" className="icon-btn" onClick={() => remove(l.id!)}>✕</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">Kosten van trajecten en verblijven komen automatisch uit je route; vul de werkelijke prijs in zodra je boekt.</p>
    </div>
  );
}
