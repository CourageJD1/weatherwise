import { Router } from 'express';
import { findRecord } from './records.js';
import { getAirQuality } from '../services/weatherService.js';
import { validateIdParam } from '../middleware/validate.js';

// Location detail for a stored record (Assessment #2 "stand apart" item):
// everything the frontend needs to render a Leaflet/OSM map — center
// coordinates and a bounding box for fitBounds — plus current air quality
// from Open-Meteo folded into the same response.

const router = Router();

// Half-size of the bounding box in degrees of latitude (~5.5 km). Purely a
// presentation choice: it gives Leaflet's fitBounds a sensible city-scale
// zoom instead of us hand-picking a zoom level.
const BBOX_HALF_SIZE_DEG = 0.05;

// A degree of longitude shrinks by cos(latitude) away from the equator, so
// the longitude delta is widened to keep the box roughly square on the
// ground. Latitude is clamped so cos() can't hit zero at the poles.
function boundingBox(lat, lon) {
  const safeLat = Math.max(-85, Math.min(85, lat));
  const lonDelta = BBOX_HALF_SIZE_DEG / Math.cos((safeLat * Math.PI) / 180);
  // Leaflet's fitBounds format: [[south, west], [north, east]].
  return [
    [lat - BBOX_HALF_SIZE_DEG, lon - lonDelta],
    [lat + BBOX_HALF_SIZE_DEG, lon + lonDelta],
  ];
}

router.get('/:id/map', validateIdParam, async (req, res, next) => {
  try {
    const record = await findRecord(req.params.id);
    if (!record) {
      return res
        .status(404)
        .json({ success: false, data: null, error: `No record with id ${req.params.id}.` });
    }

    // Air quality is an enrichment: if its API is down, the map (the primary
    // purpose of this endpoint) should still render, so degrade to null
    // instead of failing the whole response.
    let airQuality = null;
    try {
      airQuality = await getAirQuality(record.latitude, record.longitude);
    } catch (err) {
      console.error('Air quality lookup failed:', err.cause ?? err.message);
    }

    res.json({
      success: true,
      data: {
        id: record.id,
        locationName: record.locationName,
        country: record.country,
        center: { lat: record.latitude, lon: record.longitude },
        boundingBox: boundingBox(record.latitude, record.longitude),
        airQuality,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
