import { Router } from 'express';
import { pool } from '../config/db.js';
import { getHistorical } from '../services/weatherService.js';
import { validateRecordBody, validateIdParam } from '../middleware/validate.js';

// CRUD for persisted weather records (Assessment #2). All input validation
// happens in the middleware; handlers only fetch weather and talk to MySQL.
// No auth by design — the brief explicitly waives row-level security.

const router = Router();

// DATE columns are formatted in SQL rather than read as JS Date objects:
// mysql2 returns DATEs at local midnight, and serializing those can shift
// the day depending on the server's timezone. Strings can't drift.
const SELECT_RECORD = `
  SELECT id, location_query, location_name, country, latitude, longitude,
         DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
         DATE_FORMAT(end_date,   '%Y-%m-%d') AS end_date,
         weather_data, created_at, updated_at
    FROM weather_records
`;

// DB row -> API shape (camelCase, numeric coords, parsed weather data).
function toRecord(row) {
  return {
    id: row.id,
    locationQuery: row.location_query,
    locationName: row.location_name,
    country: row.country,
    latitude: Number(row.latitude), // DECIMAL arrives as a string
    longitude: Number(row.longitude),
    startDate: row.start_date,
    endDate: row.end_date,
    weatherData:
      typeof row.weather_data === 'string' ? JSON.parse(row.weather_data) : row.weather_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Exported for the export routes, which need the same rows in the same
// API shape without duplicating the SELECT.
export async function findRecord(id) {
  const [rows] = await pool.query(`${SELECT_RECORD} WHERE id = ?`, [id]);
  return rows.length ? toRecord(rows[0]) : null;
}

export async function listRecords() {
  // id DESC as tiebreaker: same-second inserts still list newest first.
  const [rows] = await pool.query(`${SELECT_RECORD} ORDER BY created_at DESC, id DESC`);
  return rows.map(toRecord);
}

function recordNotFound(res, id) {
  res.status(404).json({ success: false, data: null, error: `No record with id ${id}.` });
}

/* --------------------------------- CREATE --------------------------------- */

router.post('/', validateRecordBody, async (req, res, next) => {
  try {
    const { location, startDate, endDate } = req.body;
    const loc = req.resolvedLocation; // attached by validateRecordBody

    const weatherData = await getHistorical(loc.lat, loc.lon, startDate, endDate);

    const [result] = await pool.query(
      `INSERT INTO weather_records
         (location_query, location_name, country, latitude, longitude,
          start_date, end_date, weather_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [location.trim(), loc.name, loc.country, loc.lat, loc.lon,
       startDate, endDate, JSON.stringify(weatherData)]
    );

    res.status(201).json({ success: true, data: await findRecord(result.insertId), error: null });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------- READ ---------------------------------- */

router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await listRecords(), error: null });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validateIdParam, async (req, res, next) => {
  try {
    const record = await findRecord(req.params.id);
    if (!record) return recordNotFound(res, req.params.id);
    res.json({ success: true, data: record, error: null });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------- UPDATE --------------------------------- */

// Same validation and weather re-fetch as CREATE (plan decision 5: users
// edit location/range, never temperature values — those are re-fetched).
router.put('/:id', validateIdParam, validateRecordBody, async (req, res, next) => {
  try {
    const existing = await findRecord(req.params.id);
    if (!existing) return recordNotFound(res, req.params.id);

    const { location, startDate, endDate } = req.body;
    const loc = req.resolvedLocation;

    const weatherData = await getHistorical(loc.lat, loc.lon, startDate, endDate);

    await pool.query(
      `UPDATE weather_records
          SET location_query = ?, location_name = ?, country = ?,
              latitude = ?, longitude = ?, start_date = ?, end_date = ?,
              weather_data = ?
        WHERE id = ?`,
      [location.trim(), loc.name, loc.country, loc.lat, loc.lon,
       startDate, endDate, JSON.stringify(weatherData), req.params.id]
    );

    res.json({ success: true, data: await findRecord(req.params.id), error: null });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------- DELETE --------------------------------- */

router.delete('/:id', validateIdParam, async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM weather_records WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return recordNotFound(res, req.params.id);
    res.json({ success: true, data: { deletedId: Number(req.params.id) }, error: null });
  } catch (err) {
    next(err);
  }
});

export default router;
