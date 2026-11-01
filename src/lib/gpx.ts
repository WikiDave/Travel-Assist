import type { Trip } from '../types';

const esc = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Exporteert de reis als GPX (waypoints + track per traject) voor Komoot, Garmin, OsmAnd, enz. */
export function tripToGpx(trip: Trip, onlyIndex?: number): string {
  const stops = trip.stops;
  const wpts = stops
    .filter((_, i) => onlyIndex === undefined || i === onlyIndex || i === onlyIndex - 1)
    .map((s) => `  <wpt lat="${s.place.lat}" lon="${s.place.lon}"><name>${esc(s.place.name)}</name></wpt>`)
    .join('\n');
  const trks = stops
    .map((s, i) => ({ s, i }))
    .filter(({ s, i }) => i > 0 && s.leg?.route && (onlyIndex === undefined || i === onlyIndex))
    .map(({ s, i }) => {
      const pts = s.leg!.route!.coords.map(([lat, lon]) => `      <trkpt lat="${lat}" lon="${lon}"/>`).join('\n');
      return `  <trk><name>${esc(`${stops[i - 1].place.name} → ${s.place.name}`)}</name><type>${s.leg!.mode}</type>\n    <trkseg>\n${pts}\n    </trkseg>\n  </trk>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Travel Assist" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(trip.name)}</name></metadata>
${wpts}
${trks}
</gpx>
`;
}

export function download(filename: string, content: string | Blob, type = 'application/octet-stream') {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
