# BreedGuessle

Statisches Hunderassen-Ratespiel für GitHub Pages. Es gibt keinen Build-Schritt oder Backend. Der Browser lädt die JSON-Dateien vom selben Pages-Host; Wikipedia-Bild- und Artikellinks werden beim Daten-Crawl gespeichert, nicht beim Spielen abgefragt.

## GitHub Pages

Der Workflow unter `.github/workflows/pages.yml` veröffentlicht bei Pushes auf `main` automatisch `breedguessle-mockup.html` als `index.html`, `app.js` und die beiden JSON-Dateien.

Im GitHub-Repository unter **Settings → Pages → Build and deployment** als Quelle **GitHub Actions** auswählen. Danach den Workflow auf `main` ausführen oder dorthin pushen.

## Lokal testen

Die Seite nicht per `file://` öffnen, weil Browser lokale JSON-Dateien dabei blockieren können. Stattdessen im Repository-Verzeichnis einen statischen Server starten:

```sh
python -m http.server 8000
```

Dann `http://localhost:8000/breedguessle-mockup.html` öffnen.

## Hunderassendaten aktualisieren

Das Scraping-Script speichert Artikel- und Bild-URLs in `fci_hunderassen.json` und ergänzt die vom Spiel verwendete `fci_hunderassen_normalisiert.json`. Die Bildsuche erfolgt beim Crawl über Wikipedia beziehungsweise Wikimedia Commons.

```sh
python -m pip install -r requirements.txt
python scrape_fci_breeds.py
```

## Tagesauswahl

Pro Jahr wird die Liste mit einem deterministischen, jahresabhängigen Seed gemischt. Der Tag im Jahr wählt den entsprechenden Eintrag aus dieser Permutation. Innerhalb eines Jahres wird daher keine Rasse doppelt gezogen; ein anderes Jahr erzeugt eine andere Reihenfolge. Tipps werden pro lokalem Kalendertag im `localStorage` des Browsers gespeichert.