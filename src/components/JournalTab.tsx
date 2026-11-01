import { useEffect, useState } from 'react';
import type { JournalEntry, Trip } from '../types';
import { updateTrip, uid } from '../lib/store';
import { deletePhoto, photoUrl, savePhoto } from '../lib/photos';
import { fmtDate, itinerary, legEstimate, parseDate, toISO } from '../lib/estimate';
import { flag } from './PlanTab';

export function JournalTab({ trip }: { trip: Trip }) {
  const days = itinerary(trip);
  const [editing, setEditing] = useState<{ stop: number; entry?: JournalEntry } | null>(null);

  if (!trip.stops.length) return <div className="empty">Voeg eerst stops toe aan je route.</div>;

  const countries = [...new Set(trip.stops.map((s) => s.place.countryCode).filter(Boolean))] as string[];
  const km = trip.stops.reduce((n, _, i) => n + (legEstimate(trip, i)?.distanceKm ?? 0), 0);
  const photos = trip.stops.reduce((n, s) => n + s.journal.reduce((m, e) => m + e.photoIds.length, 0), 0);
  const entries = trip.stops.reduce((n, s) => n + s.journal.length, 0);

  return (
    <div className="journal">
      <div className="stats">
        <div><strong>{countries.length}</strong><span>{countries.map(flag).join(' ') || 'landen'}</span></div>
        <div><strong>{Math.round(km).toLocaleString('nl-NL')}</strong><span>km</span></div>
        <div><strong>{entries}</strong><span>verhalen</span></div>
        <div><strong>{photos}</strong><span>foto's</span></div>
      </div>

      <ol className="timeline">
        {trip.stops.map((s, i) => (
          <li key={s.id}>
            <div className="tl-head">
              <span className="tl-dot">{i + 1}</span>
              <div>
                <strong>{s.place.name}</strong>
                <div className="muted small">{fmtDate(days[i].arrival)}</div>
              </div>
              <button type="button" className="btn ghost small" onClick={() => setEditing({ stop: i })}>＋ Verhaal / foto's</button>
            </div>
            {[...s.journal].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt).map((e) => (
              <article key={e.id} className="entry" onClick={() => setEditing({ stop: i, entry: e })}>
                <div className="muted small">{fmtDate(parseDate(e.date))}</div>
                {e.title && <h4>{e.title}</h4>}
                {e.text && <p>{e.text}</p>}
                {e.photoIds.length > 0 && <div className="photos">{e.photoIds.map((p) => <Photo key={p} id={p} />)}</div>}
              </article>
            ))}
          </li>
        ))}
      </ol>

      {editing && (
        <EntryEditor
          trip={trip}
          stopIndex={editing.stop}
          entry={editing.entry}
          defaultDate={toISO(days[editing.stop].arrival)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Photo({ id, onRemove }: { id: string; onRemove?: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { photoUrl(id).then(setUrl); }, [id]);
  if (!url) return <div className="photo placeholder" />;
  return (
    <div className="photo">
      <img src={url} alt="" loading="lazy" />
      {onRemove && <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }}>✕</button>}
    </div>
  );
}

function EntryEditor({ trip, stopIndex, entry, defaultDate, onClose }: {
  trip: Trip; stopIndex: number; entry?: JournalEntry; defaultDate: string; onClose: () => void;
}) {
  const [draft, setDraft] = useState<JournalEntry>(
    entry ?? { id: uid(), date: defaultDate, text: '', photoIds: [], createdAt: Date.now() },
  );
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<string[]>([]);

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    try {
      const ids: string[] = [];
      for (const f of Array.from(files)) ids.push(await savePhoto(f));
      setAdded((a) => [...a, ...ids]);
      setDraft((d) => ({ ...d, photoIds: [...d.photoIds, ...ids] }));
    } finally {
      setBusy(false);
    }
  };

  const write = (fn: (list: JournalEntry[]) => JournalEntry[]) =>
    updateTrip(trip.id, (t) => ({
      ...t,
      stops: t.stops.map((s, k) => (k === stopIndex ? { ...s, journal: fn(s.journal) } : s)),
    }));

  const save = () => {
    write((list) => (list.some((e) => e.id === draft.id) ? list.map((e) => (e.id === draft.id ? draft : e)) : [...list, draft]));
    // Foto's die uit het concept zijn verwijderd definitief opruimen
    entry?.photoIds.filter((p) => !draft.photoIds.includes(p)).forEach(deletePhoto);
    onClose();
  };

  const cancel = () => {
    added.forEach(deletePhoto);
    onClose();
  };

  const remove = () => {
    if (!confirm('Dit verhaal verwijderen?')) return;
    write((list) => list.filter((e) => e.id !== draft.id));
    [...(entry?.photoIds ?? []), ...added].forEach(deletePhoto);
    onClose();
  };

  return (
    <div className="modal" onClick={cancel}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <h3>{trip.stops[stopIndex].place.name}</h3>
        <label>Datum<input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label>
        <label>Titel<input value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value || undefined })} placeholder="Bijv. Zonsopkomst op de berg" /></label>
        <label>Verhaal<textarea rows={6} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} placeholder="Wat heb je beleefd?" /></label>
        <label className="btn ghost file">
          📷 Foto's toevoegen
          <input type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
        </label>
        {busy && <span className="muted small"> Foto's verwerken…</span>}
        <div className="photos">
          {draft.photoIds.map((p) => (
            <Photo key={p} id={p} onRemove={() => setDraft((d) => ({ ...d, photoIds: d.photoIds.filter((x) => x !== p) }))} />
          ))}
        </div>
        <div className="row end">
          {entry && <button type="button" className="btn danger" onClick={remove}>Verwijderen</button>}
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={cancel}>Annuleren</button>
          <button type="button" className="btn" onClick={save} disabled={busy}>Opslaan</button>
        </div>
      </div>
    </div>
  );
}

