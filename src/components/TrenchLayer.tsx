import { useEffect, useState } from 'react';
import { Polyline, Popup, useMapEvents } from 'react-leaflet';
import { GIS_LIMIT, gisBounds, parseTrenches, type Trench } from '../lib/gis';

export function TrenchLayer({ onStatus }: { onStatus: (status: string) => void }) {
  const [revision, setRevision] = useState(0);
  const [trenches, setTrenches] = useState<Trench[]>([]);
  const map = useMapEvents({ moveend: () => setRevision(v => v + 1), resize: () => setRevision(v => v + 1) });
  useEffect(() => {
    const controller = new AbortController();
    setTrenches([]);
    const b = map.getBounds();
    const bbox = gisBounds({ west: b.getWest(), east: b.getEast(), north: b.getNorth(), south: b.getSouth() });
    if (bbox[2] - bbox[0] > 2000 || bbox[3] - bbox[1] > 2000) {
      onStatus('Für Rohrtrassen bitte näher hineinzoomen (max. 2 km Ausschnitt).');
      return () => controller.abort();
    }
    onStatus('Rohrtrassen werden geladen …');
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/gis/trenches?bbox=${bbox.map(n => n.toFixed(2)).join(',')}&limit=${GIS_LIMIT}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
        if (!response.ok) throw new Error('Rohrtrassen nicht verfügbar. GIS-Konfiguration oder Verbindung prüfen.');
        const data = await response.json();
        const parsed = parseTrenches(data);
        if (controller.signal.aborted) return;
        setTrenches(parsed);
        onStatus(parsed.length ? `${parsed.length} Trassensegmente · Vollständigkeit nicht garantiert; bei Bedarf hineinzoomen.` : 'Keine Rohrtrassen in diesem Ausschnitt gefunden.');
      } catch (error) {
        if (!controller.signal.aborted) onStatus(error instanceof Error ? error.message : 'Rohrtrassen konnten nicht geladen werden.');
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [map, revision, onStatus]);
  return <>{trenches.map((trench, index) => <Polyline key={`${trench.id}-${index}`} positions={trench.positions} pathOptions={{ color: '#f97316', weight: 4, opacity: 0.9 }}>
    <Popup><strong>Rohrtrasse · {trench.id}</strong><br />GIS-Kontext; keine bestätigte Hausanschlussroute.</Popup>
  </Polyline>)}</>;
}
