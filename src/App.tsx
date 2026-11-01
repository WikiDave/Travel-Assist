import { useEffect, useState } from 'react';
import { useTrip } from './lib/store';
import { TripList } from './components/TripList';
import { TripView } from './components/TripView';

function readHash(): string | null {
  const m = location.hash.match(/^#\/trip\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export default function App() {
  const [tripId, setTripId] = useState<string | null>(readHash());
  const trip = useTrip(tripId);

  useEffect(() => {
    const onHash = () => setTripId(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const open = (id: string | null) => {
    location.hash = id ? `#/trip/${encodeURIComponent(id)}` : '';
    setTripId(id);
  };

  return trip ? <TripView key={trip.id} trip={trip} onBack={() => open(null)} /> : <TripList onOpen={open} />;
}
