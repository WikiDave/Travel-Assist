import { useState } from 'react';
import type { Trip } from '../types';
import { suggestedChecklistItems, updateTrip, uid } from '../lib/store';

export function ChecklistTab({ trip }: { trip: Trip }) {
  const [label, setLabel] = useState('');
  const set = (fn: (t: Trip) => Trip) => updateTrip(trip.id, fn);
  const suggestions = suggestedChecklistItems(trip);
  const done = trip.checklist.filter((c) => c.done).length;

  const add = (l: string) => set((t) => ({ ...t, checklist: [...t.checklist, { id: uid(), label: l, done: false }] }));

  return (
    <div>
      <div className="progress"><div style={{ width: `${(done / Math.max(1, trip.checklist.length)) * 100}%` }} /></div>
      <p className="muted small">{done} / {trip.checklist.length} ingepakt</p>
      <ul className="checklist">
        {trip.checklist.map((c) => (
          <li key={c.id} className={c.done ? 'done' : ''}>
            <label className="check">
              <input type="checkbox" checked={c.done}
                onChange={() => set((t) => ({ ...t, checklist: t.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) }))} />
              {c.label}
            </label>
            <button type="button" className="icon-btn" onClick={() => set((t) => ({ ...t, checklist: t.checklist.filter((x) => x.id !== c.id) }))}>✕</button>
          </li>
        ))}
      </ul>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (label.trim()) { add(label.trim()); setLabel(''); } }}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Item toevoegen…" />
        <button className="btn" type="submit">＋</button>
      </form>
      {suggestions.length > 0 && (
        <>
          <h4>Suggesties voor jouw vervoer</h4>
          <div className="links">
            {suggestions.map((s) => <button key={s} type="button" className="chip" onClick={() => add(s)}>＋ {s}</button>)}
          </div>
        </>
      )}
    </div>
  );
}
