# BreedGuessle – GUI-Design

## Produktidee

BreedGuessle ist ein tägliches Ratespiel für Hunderassen. Die Hauptansicht ist direkt das Spielbrett: Rasse suchen, Tipp abgeben, Merkmale vergleichen. Keine vorgeschaltete Marketingseite und keine erklärenden Feature-Karten.

Ein Spiel hat sechs Versuche. Nach jedem Tipp erscheint eine Vergleichszeile mit Herkunft, FCI-Gruppe/Sektion, Größe und Gewicht. Die Zeile wird von links nach rechts aufgedeckt. Nach dem letzten Versuch oder einem Treffer wird die gesuchte Rasse mit Bild und den verfügbaren Kennzahlen gezeigt.

## Visuelle Richtung

Die Oberfläche orientiert sich an einer schmalen, dunklen Musik-Rätselansicht: Graphit-Hintergrund, kompakter pillenförmiger Kopf, zentrierte Hochkant-Spielspalte und warme orange Markenakzente. Dünne Linien und eine sehr leichte, unregelmäßige Punktstruktur geben dem Hintergrund Tiefe, ohne das Spielbrett zu stören. Keine Pfotenabdruck-Muster, Maskottchen oder dekorativen Kartenstapel.

### Farbpalette

| Verwendung | Farbe | Hex |
| --- | --- | --- |
| Seitenhintergrund | dunkles Graphit | `#211F25` |
| Eingabe / Vorschlagsfeld | Weiß | `#FFFFFF` |
| Spielfeld / Flächen | dunkles Anthrazit | `#2D2A32` |
| Haupttext | helles Grau | `#F3F0F4` |
| Sekundärtext | gedämpftes Grau-Lila | `#B1ACB8` |
| Markenakzent / Primäraktion | warmes Orange | `#F47A38` |
| Richtig | blasses Blau | `#DCEAF8` |
| Richtig: Text/Icon | dunkles Blau | `#244F73` |
| Nah dran | blasses Gold | `#FFF0C2` |
| Nah dran: Text/Icon | dunkler Ocker | `#765000` |
| Falsch | blasses Violett | `#ECE4F5` |
| Falsch: Text/Icon | dunkles Violett | `#59426D` |
| Unbekannt / neutral | kühles Grau | `#E9EEEB` |
| Unbekannt: Text/Icon | dunkles Grau | `#52615A` |
| Raster / Trennlinien | helles Grün-Grau | `#D9E1DA` |

Die Statusfarben sind keine Rot-Grün-Skala: Richtig ist Blau, nah dran Gold und falsch Violett. Im Spielbrett tragen Farbe und Symbol die sichtbare Information; Statuswörter sind nur für Screenreader vorhanden. „Unbekannt“ bleibt ausgeschrieben. Alle Symbole müssen auch ohne Farberkennung unterscheidbar sein.

## Typografie und Symbole

- Wortmarke und kurze Überschriften: **Barlow Condensed**, kräftiger Schnitt, kompakt und gut wiedererkennbar.
- Fließtext, Eingabe und Tabellenwerte: **Source Sans 3**, gut lesbar in kleinen Größen.
- Kennzahlen: tabellarische Ziffern aktivieren, damit Werte beim Vergleichen nicht springen.
- Symbole aus Lucide: Häkchen für richtig, Richtungs-Pfeil für Größen-/Gewichts-Hinweise, X für falsch und Fragezeichen für unbekannt.
- Im Brett stehen keine sichtbaren Statuswörter oder Formulierungen wie „größer“ und „kleiner“. Pfeile zeigen bei Messwerten die Richtung zum Ziel; zugängliche Labels liefern Screenreadern den Status.

## Hauptansicht

### Kopfbereich

Oben links steht **BreedGuessle** als Wortmarke. Daneben oder darunter: „Rätsel des Tages“ mit Datum und eine schmale Anzeige „Versuch 2 von 6“. Eine kleine, ruhige Aktionsleiste rechts enthält Hilfe/Regeln und Teilen; Icons erhalten Tooltips. Der Kopf bleibt niedrig, damit das Spielbrett auf Laptop und Mobilgerät sofort sichtbar ist.

### Rassensuche

Eine einzelne, breite Eingabe „Rasse eingeben …“ ist die primäre Aktion. Die Vorschlagsliste toleriert Tippfehler, fehlende Akzente und ungefähre Namensbestandteile. Jeder Vorschlag zeigt den Rassenamen deutlich, darunter Herkunft und FCI-Nummer klein als Disambiguierung. Tastaturbedienung: Pfeile bewegen die Auswahl, Enter übernimmt den Vorschlag, Escape schließt die Liste. Die Eingabe wird erst mit ausgewählter Rasse abgeschickt.

Die Vorschläge sind eine einfache Dropdown-Liste direkt am Feld, keine schwebende Karte. Bei keinem Treffer erscheint „Keine passende Rasse gefunden“ mit weiterhin editierbarem Text.

### Vergleichsbrett

Das Brett ist eine kompakte Tabelle mit stabilen Spalten:

| Rasse | Herkunft | FCI-Gruppe / Sektion | Größe | Gewicht |
| --- | --- | --- | --- | --- |

Auf Desktop sind alle Spalten gleichzeitig sichtbar. In Hochkantansicht wird jeder Tipp zu einem kompakten 2×2-Raster aus Merkmalszellen unter einer schmalen Rassezeile. Dadurch entfällt horizontales Scrollen. Desktop-Zeilen bleiben flach; feine Trennlinien statt Karten halten die Liste ruhig.

In jeder Merkmalszelle steht oben der Wert des geratenen Hundes und darunter der Vergleichsstatus. So bleibt sichtbar, was der Tipp tatsächlich war, auch wenn er falsch ist. Die Rassenspalte bleibt neutral und zeigt den eingegebenen Namen.

### Zustände im Brett

- **Richtig:** blauer Zellhintergrund und Häkchen.
- **Nah dran:** goldener Zellhintergrund; bei Größe/Gewicht zusätzlich ein Richtungs-Pfeil.
- **Falsch:** violetter Zellhintergrund und X.
- **Unbekannt:** neutralgraue Zelle mit „Unbekannt“. Keine Richtung und keine irreführende Wertung.

Die Statusfläche füllt die jeweilige Zelle, nicht die ganze Zeile. Dadurch lassen sich Treffer über mehrere Versuche schnell vergleichen.

## Vergleichsregeln, die das Design voraussetzt

- **Herkunft:** Der kanonische Herkunftswert stimmt exakt: „Richtig“. Ein anderer Herkunftswert aus demselben Kontinent: „Nah dran“. Anderer Kontinent: „Falsch“.
- **Länder und Regionen:** Ja, dafür braucht es eine gepflegte Zuordnung zu Kontinenten. Wikipedia enthält neben Ländern auch Angaben wie „Tibet“, „Zentralafrika“ oder „Nahost“; diese Werte müssen vor dem Vergleich auf einen Kontinent abgebildet werden. Unklare oder fehlende Zuordnungen ergeben „Unbekannt“, nicht „Falsch“.
- **FCI-Gruppe/Sektion:** Beide gleich: „Richtig“. Gruppe gleich, Sektion verschieden: „Nah dran“. Gruppe verschieden: „Falsch“.
- **Größe und Gewicht:** Für eine Rasse wird der Mittelwert der verfügbaren Zahlen als angezeigter Kennwert genutzt. Liegt der Tipp-Kennwert innerhalb des Wertebereichs der gesuchten Rasse, ist das Ergebnis „Nah dran“; stimmt der Kennwert exakt, „Richtig“. Liegt er darunter oder darüber, ist das Ergebnis „Falsch“ und zeigt einen Pfeil zur gesuchten Richtung.
- **Einzelwert ohne Spanne:** Für den Zielwert gilt eine Toleranz von ±10 Prozent als „Nah dran“.
- **Fehlende Messwerte:** Wenn Ziel oder Tipp keinen belastbaren Wert hat, zeigt die Zelle „Unbekannt“. Solche Werte geben keinen Hinweis und werden nicht als falsch gezählt.

Messwerte bleiben in der Oberfläche einheitlich: Größe in cm, Gewicht in kg, Dezimalkomma und Bereich mit Bindestrich. Die Einheiten `cm` und `kg` stehen direkt an jedem Wert und zusätzlich in den Spaltenüberschriften.

## Auflösung und Spielende

Bei einem Treffer bekommt die richtige Zeile eine dezente Hervorhebung. Darunter erscheint ein ungerahmter Ergebnisbereich mit Rassenname, Herkunft und einem echten Foto der Rasse. Größe und Gewicht werden nur gezeigt, wenn Werte vorhanden sind; sonst steht „Unbekannt“. Eine knappe Zusammenfassung wie „Gelöst in 3 von 6 Versuchen“ und eine Teilen-Aktion schließen die Runde ab.

Nach sechs Fehlversuchen wird dieselbe Auflösung gezeigt. Das Ergebnis darf die vorherigen Tippzeilen nicht überdecken.

## Bewegung und Feedback

Beim Absenden decken sich die vier Vergleichszellen nacheinander mit kurzem Abstand auf. Die Bewegung dient nur der Lesereihenfolge; keine hüpfenden Kacheln oder dauerhaft animierten Effekte. Bei `prefers-reduced-motion` erscheinen die Zustände ohne Übergang. Fokus, Auswahl in der Vorschlagsliste und deaktivierte Aktion werden klar sichtbar dargestellt.

## Responsive Verhalten

- **Alle Größen:** Der Spielbereich bleibt als schmale, zentrierte Hochkant-Spalte mit maximal etwa 480 px Breite angelegt. Auch auf Desktop wird die Fläche nicht auf volle Fensterbreite gestreckt.
- **Hochkant:** kompakter Kopf, Eingabe und Versuchszähler zuerst, danach je Tipp ein 2×2-Merkmalsraster. Keine seitliche Tabelle. Touch-Ziele mindestens 44 px hoch.
- Lange Rassennamen umbrechen; Werte oder Statuslabels werden nicht abgeschnitten. Die Suche bleibt beim Scrollen erreichbar, ohne das Brett zu verdecken.

## Inhalt und Barrierefreiheit

- UI-Texte und Statusbezeichnungen auf Deutsch.
- Statusfarben sind nicht Rot-Grün-kodiert; Symbole unterscheiden die Zustände zusätzlich. Screenreader erhalten ausgeschriebene Statuslabels.
- Tastaturfokus ist deutlich erkennbar und folgt Eingabe → Vorschläge → Absenden → Spielbrett.
- Bilder zeigen die jeweilige Rasse klar und mit sinnvollem Alternativtext; im Ergebnisbereich Quellenhinweis zur Bildquelle.
- „Unbekannt“ wird als neutraler Datenzustand behandelt, nicht als Fehler des Spielers.