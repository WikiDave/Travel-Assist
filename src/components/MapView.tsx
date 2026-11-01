import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Trip } from '../types';
import { MODES } from '../lib/modes';
import { estimateRoute } from '../lib/geo';
import { legRoute } from '../lib/estimate';

interface Props {
  trip: Trip;
  visible: boolean;
  focusIndex?: number | null;
  onSelectStop?: (i: number) => void;
}

export function MapView({ trip, visible, focusIndex, onSelectStop }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef('');

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: true }).setView([50.5, 6], 5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (visible) setTimeout(() => map.current?.invalidateSize(), 50);
  }, [visible]);

  useEffect(() => {
    const m = map.current, lg = layer.current;
    if (!m || !lg) return;
    lg.clearLayers();
    const bounds = L.latLngBounds([]);
    trip.stops.forEach((s, i) => {
      if (i > 0 && s.leg) {
        const prev = trip.stops[i - 1];
        const route = legRoute(trip, i) ?? estimateRoute(s.leg.mode, prev.place, s.place);
        const mode = MODES[s.leg.mode];
        L.polyline(route.coords, {
          color: mode.color,
          weight: 4,
          opacity: 0.85,
          dashArray: route.source === 'estimate' ? '6 8' : undefined,
        }).bindTooltip(`${mode.icon} ${prev.place.name} → ${s.place.name}`).addTo(lg);
        route.coords.forEach((c) => bounds.extend(c));
      }
      const icon = L.divIcon({
        className: '',
        html: `<div class="map-pin${s.journal.length ? ' has-journal' : ''}">${i + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([s.place.lat, s.place.lon], { icon })
        .bindTooltip(s.place.name)
        .on('click', () => onSelectStop?.(i))
        .addTo(lg);
      bounds.extend([s.place.lat, s.place.lon]);
    });
    // Alleen opnieuw inzoomen als de stops zelf veranderd zijn, niet bij elke bewerking.
    const sig = trip.stops.map((s) => `${s.place.lat},${s.place.lon}`).join('|');
    if (bounds.isValid() && sig !== fitted.current) {
      fitted.current = sig;
      m.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }
  }, [trip, onSelectStop]);

  useEffect(() => {
    if (focusIndex == null) return;
    const s = trip.stops[focusIndex];
    if (s) map.current?.setView([s.place.lat, s.place.lon], 11);
    // alleen reageren op een nieuwe focus
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIndex]);

  return <div ref={el} className="map" />;
}
