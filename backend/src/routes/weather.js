import { Router } from 'express';
import { geocode, getCurrent } from '../services/weatherService.js';
import { ValidationError } from '../services/errors.js';

// Ephemeral weather lookups for the search box (plan: /api/weather/* serves
// the search UI, nothing is persisted here — /api/records/* is the saved set).
// Both routes accept EITHER ?location= (free text, geocoded server-side) OR
// ?lat=&lon= (used by the frontend's geolocation button, which already has
// coordinates and must not waste a geocoding round-trip).

const router = Router();

// Resolves the query string into { name, country, admin1, lat, lon }.
// A LocationNotFoundError thrown by geocode() propagates to the error
// middleware as a 404 — on a search endpoint an unknown place is a missing
// resource, unlike the CRUD routes where it is invalid input (400).
async function resolveQueryLocation(query) {
  const { location, lat, lon } = query;

  if (location !== undefined) {
    const candidates = await geocode(location);
    return candidates[0]; // top-ranked candidate, per plan decision 4
  }

  if (lat !== undefined || lon !== undefined) {
    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum) ||
        Math.abs(latNum) > 90 || Math.abs(lonNum) > 180) {
      throw new ValidationError(
        '"lat" must be a number in [-90, 90] and "lon" a number in [-180, 180].'
      );
    }
    return {
      name: `${latNum.toFixed(4)}, ${lonNum.toFixed(4)}`,
      country: null,
      admin1: null,
      lat: latNum,
      lon: lonNum,
    };
  }

  throw new ValidationError(
    'Provide either ?location=<city, postal code, landmark, or "lat,lon"> or ?lat=&lon=.'
  );
}

router.get('/current', async (req, res, next) => {
  try {
    const loc = await resolveQueryLocation(req.query);
    const current = await getCurrent(loc.lat, loc.lon);
    res.json({ success: true, data: { location: loc, current }, error: null });
  } catch (err) {
    next(err);
  }
});

export default router;
