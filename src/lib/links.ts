import type { ModeId, Place } from '../types';
import { nearestAirport } from './airports';
import { toISO } from './estimate';

export interface ProviderLink {
  label: string;
  url: string;
  hint?: string;
}

const enc = encodeURIComponent;
const yymmdd = (d: Date) => toISO(d).slice(2).replace(/-/g, '');

const gmaps = (a: Place, b: Place, travelmode: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lon}&destination=${b.lat},${b.lon}&travelmode=${travelmode}`;

const rome2rio = (a: Place, b: Place) =>
  `https://www.rome2rio.com/map/${enc(a.name)}/${enc(b.name)}`;

/** Links om een traject te zoeken/boeken bij bestaande aanbieders. */
export function transportLinks(mode: ModeId, a: Place, b: Place, date: Date, travelers: number): ProviderLink[] {
  const day = toISO(date);
  switch (mode) {
    case 'plane': {
      const fa = nearestAirport(a);
      const fb = nearestAirport(b);
      const links: ProviderLink[] = [];
      if (fa && fb) {
        links.push({
          label: `Skyscanner (${fa.iata} → ${fb.iata})`,
          url: `https://www.skyscanner.nl/transport/vluchten/${fa.iata.toLowerCase()}/${fb.iata.toLowerCase()}/${yymmdd(date)}/?adults=${travelers}`,
        });
      }
      links.push(
        { label: 'Google Flights', url: `https://www.google.com/travel/flights?q=${enc(`vluchten van ${a.name} naar ${b.name} op ${day}`)}&hl=nl` },
        { label: 'Kayak', url: `https://www.kayak.nl/flights/${enc(fa?.iata ?? a.name)}-${enc(fb?.iata ?? b.name)}/${day}/${travelers}adults` },
      );
      return links;
    }
    case 'train':
      return [
        { label: 'Deutsche Bahn (heel Europa)', url: `https://www.bahn.de/buchung/fahrplan/suche#sts=true&so=${enc(a.name)}&zo=${enc(b.name)}&hd=${day}T08:00:00&r=13:16:KLASSENLOS:1` },
        { label: 'NS International', url: 'https://www.nsinternational.com/nl/treintickets' },
        { label: 'Trainline', url: 'https://www.thetrainline.com/nl' },
        { label: 'Omio (trein/bus vergelijken)', url: 'https://www.omio.nl/' },
        { label: 'Rome2Rio (alle opties)', url: rome2rio(a, b) },
      ];
    case 'nighttrain':
      return [
        { label: 'ÖBB Nightjet', url: 'https://www.nightjet.com/nl/' },
        { label: 'European Sleeper', url: 'https://www.europeansleeper.eu/' },
        { label: 'Seat61 – nachttreinen', url: 'https://www.seat61.com/sleeper-trains.htm', hint: 'Overzicht van alle nachttreinen' },
        { label: 'Back on Track – kaart', url: 'https://back-on-track.eu/night-train-map/' },
        { label: 'Rome2Rio', url: rome2rio(a, b) },
      ];
    case 'bus':
      return [
        { label: 'FlixBus', url: 'https://www.flixbus.nl/' },
        { label: 'BlaBlaCar Bus / Rides', url: 'https://www.blablacar.nl/' },
        { label: 'Omio', url: 'https://www.omio.nl/' },
        { label: 'Rome2Rio', url: rome2rio(a, b) },
      ];
    case 'car':
      return [
        { label: 'Google Maps route', url: gmaps(a, b, 'driving') },
        { label: 'Huurauto (Rentalcars)', url: 'https://www.rentalcars.com/nl/' },
        { label: 'Camper huren (Goboony)', url: 'https://www.goboony.nl/' },
        { label: 'Tolwegen & vignetten (ANWB)', url: 'https://www.anwb.nl/vakantie/tol' },
      ];
    case 'bike':
      return [
        { label: 'Google Maps (fiets)', url: gmaps(a, b, 'bicycling') },
        { label: 'Komoot planner', url: `https://www.komoot.com/nl-nl/plan/@${a.lat},${a.lon},9z` },
        { label: 'EuroVelo routes', url: 'https://en.eurovelo.com/' },
        { label: 'Fietsknooppunten', url: `https://www.fietsknoop.nl/` },
      ];
    case 'hike':
      return [
        { label: 'Waymarked Trails (wandelroutes)', url: `https://hiking.waymarkedtrails.org/#?map=10/${((a.lat + b.lat) / 2).toFixed(4)}/${((a.lon + b.lon) / 2).toFixed(4)}` },
        { label: 'Komoot planner', url: `https://www.komoot.com/nl-nl/plan/@${a.lat},${a.lon},11z` },
        { label: 'AllTrails', url: 'https://www.alltrails.com/nl' },
        { label: 'Google Maps (lopen)', url: gmaps(a, b, 'walking') },
      ];
    case 'ferry':
      return [
        { label: 'Direct Ferries', url: 'https://www.directferries.nl/' },
        { label: 'Ferryhopper', url: 'https://www.ferryhopper.com/nl/' },
        { label: 'Rome2Rio', url: rome2rio(a, b) },
      ];
  }
}

/** Links om verblijf te zoeken/boeken. */
export function stayLinks(p: Place, checkin: Date, checkout: Date, travelers: number): ProviderLink[] {
  const ci = toISO(checkin);
  const co = toISO(checkout);
  return [
    { label: 'Booking.com', url: `https://www.booking.com/searchresults.nl.html?ss=${enc(p.name)}&checkin=${ci}&checkout=${co}&group_adults=${travelers}&no_rooms=1` },
    { label: 'Airbnb', url: `https://www.airbnb.nl/s/${enc(p.name)}/homes?checkin=${ci}&checkout=${co}&adults=${travelers}` },
    { label: 'Hostelworld', url: `https://www.hostelworld.com/` },
    { label: 'Google Hotels', url: `https://www.google.com/travel/search?q=${enc(`hotels in ${p.name}`)}&hl=nl` },
    { label: 'Campings (ACSI / Park4night)', url: `https://park4night.com/nl/search?lat=${p.lat}&lng=${p.lon}&z=11` },
  ];
}

/** Ideeën voor wat te doen op een plek. */
export function exploreLinks(p: Place): ProviderLink[] {
  return [
    { label: 'Wikivoyage', url: `https://nl.wikivoyage.org/w/index.php?search=${enc(p.name)}` },
    { label: 'Bezienswaardigheden (Google Maps)', url: `https://www.google.com/maps/search/${enc('bezienswaardigheden')}/@${p.lat},${p.lon},13z` },
    { label: 'GetYourGuide', url: `https://www.getyourguide.nl/s/?q=${enc(p.name)}` },
    { label: 'Weer', url: `https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/${p.lat.toFixed(3)},${p.lon.toFixed(3)}` },
  ];
}
