import { useEffect, useState } from 'react';
import { photoUrl } from '../lib/photos';

/** Kleine miniatuur; klikken opent de afbeelding schermvullend. */
export function ScreenshotThumbs({ ids, onRemove }: { ids: string[]; onRemove?: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!ids.length) return null;
  return (
    <>
      <div className="shots">
        {ids.map((id) => (
          <div key={id} className="shot">
            <button type="button" className="shot-btn" onClick={() => setOpen(id)} title="Bekijk screenshot"><Img id={id} /></button>
            {onRemove && <button type="button" className="shot-x" onClick={() => onRemove(id)} aria-label="Screenshot verwijderen">✕</button>}
          </div>
        ))}
      </div>
      {open && (
        <div className="modal lightbox" onClick={() => setOpen(null)} role="dialog" aria-label="Screenshot">
          <Img id={open} />
          <button type="button" className="btn ghost lightbox-close" onClick={() => setOpen(null)}>Sluiten</button>
        </div>
      )}
    </>
  );
}

function Img({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { photoUrl(id).then(setUrl); }, [id]);
  return url ? <img src={url} alt="Screenshot van de prijs" /> : <span className="shot-ph" />;
}
