import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchRecordMap } from '../services/api.js';

// Leaflet/OSM map for a saved record. All DATA comes from our backend
// (/api/location/:id/map supplies center, bounding box, and air quality);
// only the map tiles load straight from OpenStreetMap — they're public,
// keyless images, which is exactly what the "no external APIs from the
// frontend" rule protects against leaking (settled in docs/PLAN.md).

function AirQualityLine({ airQuality }) {
  if (!airQuality) {
    return <p className="mt-2 text-xs text-slate-400">Air quality data unavailable.</p>;
  }
  const parts = [
    airQuality.usAqi != null && `US AQI ${airQuality.usAqi}`,
    airQuality.europeanAqi != null && `EU AQI ${airQuality.europeanAqi}`,
    airQuality.pm2_5 != null && `PM2.5 ${airQuality.pm2_5} µg/m³`,
    airQuality.pm10 != null && `PM10 ${airQuality.pm10} µg/m³`,
  ].filter(Boolean);
  return (
    <p className="mt-2 text-xs text-slate-500">
      <span className="font-medium">Current air quality:</span> {parts.join(' · ') || '—'}
    </p>
  );
}

function LocationMap({ recordId }) {
  const containerRef = useRef(null);
  const [mapData, setMapData] = useState(null);
  const [error, setError] = useState(null);

  // Fetch once per mount. RecordDetail is keyed on the record's id AND its
  // updatedAt, so selecting a different record — or editing this one — gives
  // this component a fresh instance rather than changing recordId underneath
  // it. The `stale` flag still matters: it drops a late response if the
  // component unmounts while the request is in flight.
  useEffect(() => {
    let stale = false;
    fetchRecordMap(recordId)
      .then((data) => !stale && setMapData(data))
      .catch((err) => !stale && setError(err.message));
    return () => {
      stale = true;
    };
  }, [recordId]);

  // (Re)build the Leaflet map once data is in. Leaflet manages the DOM node
  // itself, so the map lives outside React: create it in the effect, tear it
  // down in the cleanup. A circleMarker is used instead of the default pin
  // because Leaflet's default icon PNGs don't survive Vite bundling without
  // extra asset wiring — the circle needs none.
  useEffect(() => {
    if (!mapData || !containerRef.current) return undefined;

    const map = L.map(containerRef.current, { scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    map.fitBounds(mapData.boundingBox); // backend supplies [[S,W],[N,E]]
    L.circleMarker([mapData.center.lat, mapData.center.lon], {
      radius: 8,
      color: '#0284c7',
      fillColor: '#38bdf8',
      fillOpacity: 0.7,
    })
      .addTo(map)
      .bindPopup([mapData.locationName, mapData.country].filter(Boolean).join(', '));

    return () => map.remove();
  }, [mapData]);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        Could not load the map: {error}
      </div>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="h-64 w-full rounded-lg border border-slate-200 bg-slate-100"
        aria-label={mapData ? `Map of ${mapData.locationName}` : 'Map loading'}
      >
        {!mapData && (
          <p className="flex h-full items-center justify-center text-sm text-slate-400">
            Loading map…
          </p>
        )}
      </div>
      {mapData && <AirQualityLine airQuality={mapData.airQuality} />}
    </div>
  );
}

export default LocationMap;
