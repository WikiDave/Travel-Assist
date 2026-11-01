import { useEffect, useRef, useState } from 'react';
import { deletePhoto, imageFromClipboard, savePhoto } from '../lib/photos';
import { ScreenshotThumbs } from './Screenshots';

interface Props {
  title: string;
  url: string;
  defaultTime?: string;
  onSave: (price: number, screenshotIds: string[], time?: string) => void;
  onCancel: () => void;
}

/**
 * Prijs vastleggen met een eigen screenshot: de site van de aanbieder staat open in een
 * ander tabblad; plak (Ctrl+V) of upload hier de screenshot en vul de prijs in.
 */
export function CapturePanel({ title, url, defaultTime, onSave, onCancel }: Props) {
  const [price, setPrice] = useState('');
  const [time, setTime] = useState(defaultTime ?? '');
  const [shots, setShots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const saved = useRef(false);
  const shotsRef = useRef<string[]>([]);
  shotsRef.current = shots;

  const add = async (file: Blob | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const id = await savePhoto(file, 2000); // iets groter zodat prijzen leesbaar blijven
      setShots((s) => [...s, id]);
    } finally {
      setBusy(false);
    }
  };

  // Plakken werkt overal op de pagina zolang het paneel open is.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const img = imageFromClipboard(e);
      if (img) { e.preventDefault(); add(img); }
    };
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('paste', onPaste);
      // Niet opgeslagen? Dan geplakte screenshots opruimen.
      if (!saved.current) shotsRef.current.forEach(deletePhoto);
    };
  }, []);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(price.replace(',', '.'));
    if (!isFinite(n) || n <= 0) return;
    saved.current = true;
    onSave(n, shots, time || undefined);
  };

  return (
    <form className="capture" onSubmit={save}>
      <div className="capture-head">
        <strong>📸 {title}</strong>
        <a href={url} target="_blank" rel="noreferrer" className="small">site opnieuw openen ↗</a>
      </div>
      <ol className="small capture-steps">
        <li>Zoek op de site de vlucht die je wilt en maak een screenshot (Windows: <kbd>Win+Shift+S</kbd>, Mac: <kbd>Cmd+Ctrl+Shift+4</kbd>).</li>
        <li>Kom terug en druk op <kbd>Ctrl+V</kbd> / <kbd>Cmd+V</kbd>, of kies een bestand (op je telefoon: uit je foto's).</li>
        <li>Vul de prijs in die je ziet en sla op.</li>
      </ol>
      <div className="capture-drop">
        <ScreenshotThumbs ids={shots} onRemove={(id) => { deletePhoto(id); setShots((s) => s.filter((x) => x !== id)); }} />
        <label className="btn ghost small file">
          {shots.length ? '＋ Nog een screenshot' : '📎 Screenshot kiezen'}
          <input type="file" accept="image/*" hidden onChange={(e) => { add(e.target.files?.[0] ?? null); e.target.value = ''; }} />
        </label>
        {busy && <span className="muted small"> verwerken…</span>}
        {!shots.length && <span className="muted small"> of plak met Ctrl+V</span>}
      </div>
      <div className="row">
        <label>Totaalprijs (alle reizigers)
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="bijv. 97,98" autoFocus required />
        </label>
        <label>Vertrektijd
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <div className="row end">
        <button type="button" className="btn ghost" onClick={onCancel}>Annuleren</button>
        <button type="submit" className="btn" disabled={busy}>Prijs opslaan</button>
      </div>
    </form>
  );
}
