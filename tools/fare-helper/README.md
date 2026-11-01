# Lokale prijshulp (Ryanair)

Klein programma dat op **je eigen computer** draait en de laagste Ryanair-prijs per dag ophaalt voor de
Travel Assist-app. Alleen voor persoonlijk gebruik.

## Starten

Je hebt [Node.js](https://nodejs.org) 18 of nieuwer nodig. Download `server.mjs` (of de hele repository) en voer uit:

```bash
node tools/fare-helper/server.mjs
```

Open daarna de app → **Prijzen → Instellingen** → zet **Ryanair-prijzen via mijn computer** aan.
Laat het venster open zolang je prijzen wilt ophalen.

## Goed om te weten

- Werkt alleen in de browser op de computer waar de hulp draait, niet op je telefoon.
- Beleefd ingesteld: maximaal 1 verzoek per seconde en resultaten worden 1 uur onthouden.
- Ryanairs gebruiksvoorwaarden staan geautomatiseerd ophalen niet toe; gebruik op eigen verantwoordelijkheid.
  Het programma omzeilt geen blokkades: weigert Ryanair, dan stopt het en gebruik je de directe links.
- Wizz Air wordt niet ondersteund; daarvoor toont de app directe zoeklinks.
- Prijzen zijn per persoon, enkele reis, zonder extra's zoals bagage of stoelkeuze.
- Chrome kan eenmalig vragen of de website toegang mag tot apparaten in je lokale netwerk: kies **Toestaan**.
