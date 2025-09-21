# Lumora – statisk webbsida

En enkel, responsiv produktsida för doftljus (Lumora) byggd med HTML/CSS/JS och Bootstrap 5.

## Struktur

- `index.html` – Sidstruktur, navbar, galleri, sidfot och offcanvas-varukorg
- `index.css` – Layout och stilar (gallerigrid, produktkort, sidfot, varukorg)
- `js/app.js` – Dynamisk rendering av produkter, paginering ("Visa mer"), varukorg (localStorage), "Läs mer"
- `data/products.json` – Produktdata (id, name, image, price, scent, description, mood)
- `images/` – Produktbilder (Ljus1.png .. Ljus26.PNG)

## Köra/prova

Det här är en statisk sida:

1. Öppna `index.html` i din webbläsare (dubbelklick eller via Öppet med VS Code Live Server).
2. Klicka på "Visa mer" för att ladda fler produkter.
3. Använd knappen "Läs mer" under ett kort för att se extra beskrivning.
4. Lägg till i varukorgen via knappen "Lägg i varukorg". Vagns-badgen visar antal.
5. Öppna varukorgen (offcanvas) via vagnen i navbaren för att öka/minska/ta bort eller tömma.

Tips: Om du inte ser de senaste JS‑ändringarna, gör en "hård uppdatering" (Ctrl+F5) eller ändra versionsparametern i skripttaggen: `js/app.js?v=YYYYMMDD`.

## Dataformat

`data/products.json` (exempel):

[
  {
    "id": "ljus1",
    "name": "Vanilla Dream",
    "image": "images/Ljus1.png",
    "price": 199,
    "scent": "Vanilj",
    "description": "Krämig vanilj med varm ton.",
    "mood": "Lugn & mys"
  }
]

- `id` måste vara unik och matchar även CSS-klassen på kortet (för layout-variationer).
- `image` ska peka på en fil i `images/`.
- `price` i SEK (tal). Om pris saknas visas "Pris saknas".
- `scent` (Doft) och `mood` (Känsla) är valfria men rekommenderas.
- `description` laddas först när användaren klickar på "Läs mer".

## Utvecklingsanteckningar

- Kommentarer för utvecklare är på svenska och syns inte på sidan.
- "Läs mer" injicerar text säkert via `textContent` (ingen HTML injiceras).
- Varukorgen sparas i `localStorage` under nyckeln `cart`.
- Layouten använder CSS Grid och är responsiv från mobil till desktop.

## Vidareutveckling (idéer)

- Filtrering/sortering av produkter
- Produktdetalsida (modal eller ny sida)
- Enkel kassa/demo-checkout 
