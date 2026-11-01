import { haversineKm } from './geo';

/** Compacte lijst van grote luchthavens: [IATA, stad, lat, lon] */
const AIRPORTS: [string, string, number, number][] = [
  ['AMS', 'Amsterdam', 52.31, 4.76], ['EIN', 'Eindhoven', 51.45, 5.37], ['RTM', 'Rotterdam', 51.96, 4.44],
  ['BRU', 'Brussel', 50.9, 4.48], ['CRL', 'Charleroi', 50.46, 4.45], ['DUS', 'Düsseldorf', 51.29, 6.77],
  ['CGN', 'Keulen', 50.87, 7.14], ['FRA', 'Frankfurt', 50.04, 8.56], ['MUC', 'München', 48.35, 11.79],
  ['BER', 'Berlijn', 52.37, 13.5], ['HAM', 'Hamburg', 53.63, 9.99], ['STR', 'Stuttgart', 48.69, 9.22],
  ['LHR', 'Londen Heathrow', 51.47, -0.45], ['LGW', 'Londen Gatwick', 51.15, -0.19], ['STN', 'Londen Stansted', 51.89, 0.24],
  ['MAN', 'Manchester', 53.35, -2.27], ['EDI', 'Edinburgh', 55.95, -3.37], ['DUB', 'Dublin', 53.42, -6.27],
  ['CDG', 'Parijs CDG', 49.01, 2.55], ['ORY', 'Parijs Orly', 48.72, 2.38], ['NCE', 'Nice', 43.66, 7.21],
  ['LYS', 'Lyon', 45.73, 5.08], ['MRS', 'Marseille', 43.44, 5.22], ['TLS', 'Toulouse', 43.63, 1.37],
  ['BOD', 'Bordeaux', 44.83, -0.72], ['GVA', 'Genève', 46.24, 6.11], ['ZRH', 'Zürich', 47.46, 8.55],
  ['BSL', 'Bazel', 47.6, 7.53], ['VIE', 'Wenen', 48.11, 16.57], ['PRG', 'Praag', 50.1, 14.26],
  ['BUD', 'Boedapest', 47.44, 19.26], ['WAW', 'Warschau', 52.17, 20.97], ['KRK', 'Krakau', 50.08, 19.78],
  ['CPH', 'Kopenhagen', 55.62, 12.65], ['ARN', 'Stockholm', 59.65, 17.92], ['OSL', 'Oslo', 60.19, 11.1],
  ['HEL', 'Helsinki', 60.32, 24.96], ['KEF', 'Reykjavik', 63.98, -22.61], ['TRD', 'Trondheim', 63.46, 10.92],
  ['BGO', 'Bergen', 60.29, 5.22], ['TOS', 'Tromsø', 69.68, 18.92], ['RIX', 'Riga', 56.92, 23.97],
  ['MAD', 'Madrid', 40.49, -3.57], ['BCN', 'Barcelona', 41.3, 2.08], ['AGP', 'Málaga', 36.67, -4.5],
  ['SVQ', 'Sevilla', 37.42, -5.9], ['VLC', 'Valencia', 39.49, -0.48], ['ALC', 'Alicante', 38.28, -0.56],
  ['PMI', 'Palma de Mallorca', 39.55, 2.74], ['IBZ', 'Ibiza', 38.87, 1.37], ['TFS', 'Tenerife Zuid', 28.04, -16.57],
  ['LPA', 'Gran Canaria', 27.93, -15.39], ['LIS', 'Lissabon', 38.77, -9.13], ['OPO', 'Porto', 41.24, -8.68],
  ['FAO', 'Faro', 37.01, -7.97], ['FCO', 'Rome', 41.8, 12.25], ['MXP', 'Milaan', 45.63, 8.72],
  ['VCE', 'Venetië', 45.5, 12.35], ['NAP', 'Napels', 40.88, 14.29], ['BLQ', 'Bologna', 44.53, 11.29],
  ['PSA', 'Pisa', 43.68, 10.39], ['CTA', 'Catania', 37.47, 15.07], ['PMO', 'Palermo', 38.18, 13.1],
  ['CAG', 'Cagliari', 39.25, 9.06], ['ATH', 'Athene', 37.94, 23.94], ['HER', 'Heraklion', 35.34, 25.18],
  ['SKG', 'Thessaloniki', 40.52, 22.97], ['SPU', 'Split', 43.54, 16.3], ['DBV', 'Dubrovnik', 42.56, 18.27],
  ['ZAG', 'Zagreb', 45.74, 16.07], ['LJU', 'Ljubljana', 46.22, 14.46], ['OTP', 'Boekarest', 44.57, 26.09],
  ['SOF', 'Sofia', 42.7, 23.41], ['IST', 'Istanbul', 41.26, 28.74], ['AYT', 'Antalya', 36.9, 30.8],
  ['MLA', 'Malta', 35.86, 14.48], ['RAK', 'Marrakech', 31.61, -8.04], ['CMN', 'Casablanca', 33.37, -7.59],
  ['CAI', 'Caïro', 30.12, 31.41], ['TLV', 'Tel Aviv', 32.01, 34.89], ['DXB', 'Dubai', 25.25, 55.36],
  ['DOH', 'Doha', 25.27, 51.61], ['JFK', 'New York', 40.64, -73.78], ['EWR', 'Newark', 40.69, -74.17],
  ['BOS', 'Boston', 42.36, -71.01], ['ORD', 'Chicago', 41.97, -87.91], ['LAX', 'Los Angeles', 33.94, -118.41],
  ['SFO', 'San Francisco', 37.62, -122.38], ['MIA', 'Miami', 25.79, -80.29], ['YYZ', 'Toronto', 43.68, -79.63],
  ['YUL', 'Montreal', 45.47, -73.74], ['YVR', 'Vancouver', 49.19, -123.18], ['MEX', 'Mexico-Stad', 19.44, -99.07],
  ['CUN', 'Cancún', 21.04, -86.87], ['GRU', 'São Paulo', -23.43, -46.47], ['EZE', 'Buenos Aires', -34.82, -58.54],
  ['LIM', 'Lima', -12.02, -77.11], ['BOG', 'Bogotá', 4.7, -74.15], ['JNB', 'Johannesburg', -26.14, 28.25],
  ['CPT', 'Kaapstad', -33.97, 18.6], ['NBO', 'Nairobi', -1.32, 36.93], ['DEL', 'Delhi', 28.56, 77.1],
  ['BOM', 'Mumbai', 19.09, 72.87], ['BKK', 'Bangkok', 13.69, 100.75], ['SIN', 'Singapore', 1.36, 103.99],
  ['KUL', 'Kuala Lumpur', 2.74, 101.71], ['DPS', 'Bali', -8.75, 115.17], ['CGK', 'Jakarta', -6.13, 106.66],
  ['HKG', 'Hongkong', 22.31, 113.91], ['PEK', 'Peking', 40.08, 116.6], ['PVG', 'Shanghai', 31.14, 121.81],
  ['NRT', 'Tokio Narita', 35.77, 140.39], ['HND', 'Tokio Haneda', 35.55, 139.78], ['KIX', 'Osaka', 34.43, 135.24],
  ['ICN', 'Seoul', 37.46, 126.44], ['HAN', 'Hanoi', 21.22, 105.81], ['SGN', 'Ho Chi Minh-stad', 10.82, 106.65],
  ['SYD', 'Sydney', -33.94, 151.18], ['MEL', 'Melbourne', -37.67, 144.84], ['AKL', 'Auckland', -37.01, 174.79],
];

/** Regionale luchthavens die veel door prijsvliegers worden gebruikt (alleen in de vergelijking). */
const REGIONAL: [string, string, number, number][] = [
  ['MST', 'Maastricht', 50.91, 5.77], ['GRQ', 'Groningen', 53.12, 6.58], ['NRN', 'Weeze', 51.6, 6.14],
  ['DTM', 'Dortmund', 51.52, 7.61], ['HHN', 'Frankfurt-Hahn', 49.95, 7.26], ['FMM', 'Memmingen', 47.99, 10.24],
  ['FKB', 'Karlsruhe/Baden-Baden', 48.78, 8.08], ['BRE', 'Bremen', 53.05, 8.79], ['LUX', 'Luxemburg', 49.63, 6.21],
  ['ANR', 'Antwerpen', 51.19, 4.46], ['LGG', 'Luik', 50.64, 5.44], ['BVA', 'Parijs Beauvais', 49.45, 2.11],
  ['LTN', 'Londen Luton', 51.87, -0.37], ['BGY', 'Milaan Bergamo', 45.67, 9.7], ['CIA', 'Rome Ciampino', 41.8, 12.59],
  ['TSF', 'Venetië Treviso', 45.65, 12.19], ['GRO', 'Girona', 41.9, 2.76], ['REU', 'Reus', 41.15, 1.17],
  ['BTS', 'Bratislava', 48.17, 17.21], ['GDN', 'Gdańsk', 54.38, 18.47], ['KTW', 'Katowice', 50.47, 19.08],
  ['VNO', 'Vilnius', 54.63, 25.29], ['TLL', 'Tallinn', 59.41, 24.83], ['BRS', 'Bristol', 51.38, -2.72],
];

export interface Airport { iata: string; city: string; lat: number; lon: number; distanceKm: number }

export function nearestAirport(p: { lat: number; lon: number }): Airport | null {
  let best: Airport | null = null;
  for (const [iata, city, lat, lon] of AIRPORTS) {
    const d = haversineKm(p, { lat, lon });
    if (!best || d < best.distanceKm) best = { iata, city, lat, lon, distanceKm: d };
  }
  return best && best.distanceKm < 250 ? best : null;
}

/** Alle luchthavens binnen `radiusKm`, dichtstbijzijnde eerst. */
export function nearbyAirports(p: { lat: number; lon: number }, radiusKm = 150, max = 4): Airport[] {
  return [...AIRPORTS, ...REGIONAL]
    .map(([iata, city, lat, lon]) => ({ iata, city, lat, lon, distanceKm: haversineKm(p, { lat, lon }) }))
    .filter((a) => a.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, max);
}
