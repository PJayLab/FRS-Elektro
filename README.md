## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Karten und Umgebungssuche

Die Karten verwenden swisstopo WMTS ohne API-Key. Die Einstellungen oben rechts
bieten **Hell**, **Dunkel** und **Satellit**; die Auswahl bleibt lokal gespeichert.
Hell verwendet die graue Landeskarte, Dunkel dieselben Kacheln mit einem Filter,
Satellit das SWISSIMAGE-Luftbild. Der Filter betrifft nur die Hintergrundkarte.
Die hochauflösende Abdeckung ist auf die Schweiz ausgerichtet. Die Quellenangabe
`© swisstopo` muss sichtbar bleiben.

- [swisstopo: freie Geodaten und Dienste](https://www.swisstopo.admin.ch/en/faq-free-geodata)
- [Geodienste](https://www.swisstopo.admin.ch/en/geoservices-with-swisstopo-geodata)
- [WMTS Capabilities EPSG:3857](https://wmts.geo.admin.ch/EPSG/3857/1.0.0/WMTSCapabilities.xml)

Die frühere CARTO-Karte verlangt inzwischen einen Schlüssel. Falls CARTO später
wieder eingesetzt werden soll, muss ein Key beim Anbieter angefordert und als
`key`-Parameter in der Kachel-URL eingebunden werden. Einen gültigen Key kann
nur der Anbieter ausstellen; für die jetzige swisstopo-Lösung ist keiner nötig.
Siehe [CARTO-Key-Anforderung](https://carto.com/basemaps/apikey/).

### Objekte im Kartenausschnitt

Der Standortknopf fragt wie bisher `/api/search/nearby?lat=…&lon=…&radius=500` ab.
**In diesem Bereich suchen** nutzt denselben authentifizierten Endpunkt mit der
aktuellen Kartenmitte und einem Radius in Metern bis zur entferntesten Ecke.
Die Antwort wird zusätzlich auf den beim Klick sichtbaren Ausschnitt gefiltert.
Neue Abfragen ersetzen die vorherigen Objekte; verspätete Antworten werden ignoriert.
Die Karte bleibt nach einer Ausschnittsuche an ihrer aktuellen Position.

Beide Aktionen verlassen die Verbindungsansicht und zeigen ausschliesslich Objekte.
Gebäude sind standardmässig ausgeblendet und können unter Einstellungen aktiviert
werden. Dies betrifft die Objektmarker, nicht die Gebäude auf den Hintergrundkacheln.
Das Zielgebäude einer ausgewählten Verbindung bleibt sichtbar.
Popups bevorzugen `display_name`, danach `address`, danach `name` und zeigen den
Objekttyp auf Deutsch. Legende und Marker nutzen identische Symbole.

Der maximale Suchradius im Frontend beträgt 10 km; bei grösseren Ausschnitten wird
zum Heranzoomen aufgefordert. Das Backend ist nicht in diesem Repository enthalten.
Es muss variable Radien unterstützen und eine vollständige Objektliste liefern.
Serverseitige Ergebnislimits oder Pagination sind im bestehenden API-Vertrag nicht
beschrieben und können deshalb nicht automatisch aufgelöst werden.

Verbindungen werden schematisch in einer einheitlichen Farbe mit Richtungspfeilen
von der Trafostation über vorhandene Zwischenobjekte zum Gebäude dargestellt.
Es werden keine realen Kabelverläufe oder gemessenen Stromflüsse behauptet.

### Suchergebnis-Typen

Bestehende Treffer ohne `type` gelten weiterhin als `connection`. `connection_uuid`
(oder das bisher teilweise verwendete `uuid`) identifiziert die Verbindung für
`/api/search/connection/{id}`. Die Liste zeigt ein Verbindungssymbol und den Typnamen.

Für spätere Einzelobjekte ist folgendes Format vorbereitet:

```json
{
  "type": "transformer",
  "uuid": "object-id",
  "address": "Trafostation Dorf",
  "location": { "lat": 47.176, "lon": 8.106 }
}
```

Unterstützte Typen: `connection`, `building`, `transformer`, `distribution_box`,
`disconnect_point`. Einzelobjekte mit Koordinaten werden direkt auf der Karte
angezeigt, ohne einen Verbindungsdetail-Endpunkt aufzurufen. Ohne Koordinaten
erscheint ein Hinweis. `location` als Ortsname (String) wird in der Trefferliste
ebenfalls unterstützt. Der aktuelle Such-Endpunkt bleibt unverändert.

### Prüfen

- `npm run lint` – TypeScript
- `npm test` – Geometrie, Stromrichtung und API-Kompatibilität
- `npm run build` – Produktionsbuild

Browserprüfung mit simulierten API-Antworten durchführen, solange kein Testbackend
mit geeigneten Zugangsdaten verfügbar ist. Kartenkacheln können unabhängig davon
über den öffentlichen swisstopo-Dienst geladen werden.
