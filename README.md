## Run locally

**Prerequisite:** Node.js.

1. Install dependencies with `npm install`.
2. Start the app with `npm run dev`.

## Maps and nearby search

The map uses public swisstopo WMTS tiles without an API key. The top-right
settings menu offers **Hell**, **Dunkel**, and **Satellit**, and saves the selected
map style locally. Light mode uses the color map; dark mode uses grayscale tiles
with a filter that affects only the background. Satellite mode uses SWISSIMAGE.
High-resolution coverage focuses on Switzerland. Keep the `© swisstopo`
attribution visible.

- [swisstopo open geodata](https://www.swisstopo.admin.ch/en/faq-free-geodata)
- [Geoservices](https://www.swisstopo.admin.ch/en/geoservices-with-swisstopo-geodata)
- [WMTS capabilities](https://wmts.geo.admin.ch/EPSG/3857/1.0.0/WMTSCapabilities.xml)

The current swisstopo setup needs no key. If CARTO basemaps are reintroduced,
obtain a provider-issued key and include it in the tile URL's `key` parameter.
See [CARTO API keys](https://carto.com/basemaps/apikey/).

### Objects in the visible map area

The location button requests `/api/search/nearby?lat=…&lon=…&radius=500`.
**In diesem Bereich suchen** uses the same authenticated endpoint with the
current map center and a radius reaching the farthest corner. Results are
filtered to the bounds visible when the search was started. New searches
replace previous objects, stale responses are ignored, and area searches keep
the current map position.

Both actions leave the connection view and display individual objects.
The settings menu separates the following controls into two categories:

- **Suche in Umgebung → Anzeige Gebäude:** show or hide nearby building markers.
  Buildings are hidden by default. This does not affect buildings in background
  tiles or the destination building of a selected connection.
- **Verbindungsdarstellung → Zeige Verbindungen:** show or hide the selected
  connection's lines and direction arrows. Enabled by default.

The connection details sheet has a close button next to its expand/minimize
control. It performs the same action as clearing the search field: removing the
selected connection and clearing the query and search results in the frontend.

A red close button beside **In diesem Bereich suchen** appears while a nearby
search is loading or has results/status. It removes the displayed objects,
location marker, search radius, and status, then disappears. Pending nearby
requests and geolocation callbacks are invalidated so cleared objects cannot
reappear from a late response. No backend records are deleted.

Both controls use labeled, keyboard-accessible switches with icons.
Hovering over or clicking an object marker opens the same dark-blue popup,
including all objects sharing that location. Close it with its close button or
by clicking the map. Popup names prefer `display_name`, then `address`, then
`name`, and include the German object type. Legend and markers share symbols.

The maximum frontend search radius is 10 km; larger areas prompt the user to
zoom in. The backend is not included in this repository. It must support
variable radii and return a complete object list. Server-side limits and
pagination are not specified in the existing API contract and cannot be
resolved automatically.

Connections are schematic, use a consistent color, and show direction arrows
from the transformer through available intermediate objects to the building.
They do not represent actual cable routes or measured current flow.

### Search result types

Existing results without `type` are treated as `connection`. `connection_uuid`
(or the legacy `uuid`) identifies the connection for
`/api/search/connection/{id}`. Results show a connection icon and type label.

Individual objects can use this format:

```json
{
  "type": "transformer",
  "uuid": "object-id",
  "address": "Trafostation Dorf",
  "location": { "lat": 47.176, "lon": 8.106 }
}
```

Supported types: `connection`, `building`, `transformer`, `distribution_box`,
and `disconnect_point`. Individual objects with coordinates appear directly
on the map without a connection-detail request. Missing coordinates produce
a notice. A string `location` is also supported as a place name in search
results. The current search endpoint remains unchanged.

### Validation

- `npm run lint`: TypeScript checks.
- `npm test`: geometry, flow direction, and API compatibility.
- `npm run build`: production build.

Use mocked API responses for browser checks when no test backend and suitable
credentials are available. Map tiles can load independently from the public
swisstopo service.
