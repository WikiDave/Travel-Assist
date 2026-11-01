# Prijs-proxy (optioneel)

Werkt de vliegprijskalender niet ("Prijsdienst niet bereikbaar vanuit de browser")? Dan blokkeert de
Travelpayouts-API verzoeken rechtstreeks vanuit de browser. Deze kleine Cloudflare Worker lost dat op.

1. Maak een gratis account op https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Hello World**-worker.
2. Vervang de code door `worker.js` uit deze map en klik **Deploy**.
3. Kopieer de URL (bijv. `https://travel-prices.jouwnaam.workers.dev`) naar **Prijzen → Instellingen → Proxy-URL** in de app.

De token blijft in de app op je eigen apparaat en wordt per verzoek meegestuurd; de worker bewaart niets.
