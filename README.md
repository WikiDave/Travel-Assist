# 🧭 Travel Assist

Eén alles-in-één reisplanner die meerdere apps vervangt:

| Wat | Vervangt | Hoe |
|---|---|---|
| **Route plannen met elke vervoerswijze** – vliegtuig ✈️, trein 🚆, slaaptrein 🛏️, bus 🚌, auto 🚗, fiets 🚲, wandelen/hike 🥾 en veerboot ⛴️ | Roadie / Roadtrippers, Rome2Rio | Stops toevoegen, per traject een vervoerswijze kiezen. Auto, fiets en lopen krijgen een échte route (OpenStreetMap/OSRM). |
| **Vervoer vergelijken** – reistijd, afstand, CO₂ en kosten naast elkaar, met labels *snelst / goedkoopst / groenst* | Skyscanner, Omio | Schattingsmodel per vervoerswijze + echte routes. |
| **Zoeken & boeken** | Skyscanner, Booking.com, Airbnb, FlixBus, Nightjet… | Directe links met ingevulde datum, bestemming en reizigers (Skyscanner met dichtstbijzijnde luchthaven, Booking.com met check-in/out, enz.). |
| **Verblijf** per stop met boekingsstatus, kosten en referentie | Booking.com / TripIt | Check-in/out-data worden automatisch berekend uit je reisschema. |
| **Reisdagboek** met verhalen en foto's per stop, tijdlijn en statistieken (landen, km) | Polarsteps | Foto's worden verkleind en lokaal opgeslagen (IndexedDB). |
| **Budget** – automatisch uit trajecten en verblijven + eigen uitgaven | Spreadsheets | Schattingen worden vervangen door echte prijzen zodra je boekt. |
| **Paklijst** met suggesties op basis van je vervoer (bijv. bandenplakset bij fiets, blarenpleisters bij hike) | Packpoint | |
| **Meerdaagse fiets- en wandeltochten** – automatisch in dagetappes, GPX-export voor Komoot/Garmin/OsmAnd | Komoot (deels) | |

Verder: slimme planning (een slaaptrein bespaart een hotelnacht en je komt de volgende ochtend aan; fietstochten tellen reisdagen mee), interactieve kaart, export/import als JSON, afdrukken als PDF, installeerbaar als app (PWA) en offline bruikbaar.

## Starten

```bash
npm install
npm run dev      # ontwikkelserver op http://localhost:5173
npm test         # unit tests
npm run build    # productiebuild in dist/ (statisch te hosten, bv. GitHub Pages / Netlify)
```

## Techniek

- React 19 + TypeScript + Vite, geen backend: alle data blijft op je eigen apparaat (localStorage + IndexedDB).
- Kaart: Leaflet + OpenStreetMap-tegels.
- Plaatsen zoeken: Nominatim (OpenStreetMap).
- Routes: OSRM via `routing.openstreetmap.de` (auto / fiets / voet).

## Beperkingen & volgende stappen

- **Prijzen en reistijden voor vliegen, trein, bus en boot zijn schattingen.** Echte live prijzen en dienstregelingen vereisen API-sleutels/partnerschappen (bijv. Amadeus of Duffel voor vluchten, Booking.com Affiliate API, Trainline/Omio-partners). Dit vraagt een kleine backend om sleutels geheim te houden.
- Gratis publieke diensten (Nominatim, OSRM) hebben gebruikslimieten; voor veel gebruikers is een eigen instantie of betaalde variant nodig.
- Ideeën: automatische locatietracking zoals Polarsteps, delen van een reis met medereizigers (sync), weersverwachting per stop, offline kaarten, inchecken op boardingpasses/tickets via e-mail-import.
