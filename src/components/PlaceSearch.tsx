import { useEffect, useRef, useState } from 'react';
import type { Place } from '../types';
import { geocode, reverseGeocode } from '../lib/geo';

interface Props {
  placeholder?: string;
  onSelect: (p: Place) => void;
  allowLocation?: boolean;
}

export function PlaceSearch({ placeholder = 'Zoek een stad, dorp of adres…', onSelect, allowLocation = true }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setBusy(true);
      setError(null);
      try {
        setResults(await geocode(q, c.signal));
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    }, 450); // Nominatim staat max ~1 verzoek/sec toe
    return () => clearTimeout(t);
  }, [q]);

  const pick = (p: Place) => {
    onSelect(p);
    setQ('');
    setResults([]);
  };

  const useLocation = () => {
    if (!navigator.geolocation) { setError('Locatie niet beschikbaar in deze browser'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => { pick(await reverseGeocode(pos.coords.latitude, pos.coords.longitude)); setBusy(false); },
      (err) => { setError(`Locatie ophalen mislukt: ${err.message}`); setBusy(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div className="place-search">
      <div className="row">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        {allowLocation && (
          <button type="button" className="btn ghost" onClick={useLocation} title="Gebruik mijn huidige locatie">📍</button>
        )}
      </div>
      {busy && <div className="muted small">Zoeken…</div>}
      {error && <div className="error small">{error}</div>}
      {results.length > 0 && (
        <ul className="results">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => pick(r)}>
                <strong>{r.name}</strong>
                <span className="muted small">{r.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
