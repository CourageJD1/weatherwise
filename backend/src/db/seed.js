import { pool } from '../config/db.js';
import { initSchema } from './schema.js';

// Builds one {date, tempMax, tempMin, precipitationProbability} entry per day
// in the range. A sine wave around the base values gives day-to-day variation
// that looks like real weather but stays deterministic across reruns.
function buildDailyData(startDate, endDate, baseMax, baseMin, basePrecip) {
  const days = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  for (let i = 0; cursor <= end; i++, cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const wiggle = Math.sin(i * 1.7);
    days.push({
      date: cursor.toISOString().slice(0, 10),
      tempMax: Math.round((baseMax + wiggle * 2.5) * 10) / 10,
      tempMin: Math.round((baseMin + wiggle * 2) * 10) / 10,
      precipitationProbability: Math.max(
        0,
        Math.min(100, Math.round(basePrecip + wiggle * 15))
      ),
    });
  }
  return days;
}

// 8 sample records: varied continents, hemispheres (Sydney/Cape Town are in
// winter here), range lengths, and one coordinate-shaped query to show the
// geocoder-bypass path from the plan. Temps in Celsius, dates YYYY-MM-DD.
const SAMPLES = [
  { query: 'new york',           name: 'New York',   country: 'United States',  lat: 40.712776,  lon: -74.005974,  start: '2026-07-20', end: '2026-07-26', baseMax: 31, baseMin: 22, precip: 25 },
  { query: 'London',             name: 'London',     country: 'United Kingdom', lat: 51.507351,  lon: -0.127758,   start: '2026-07-01', end: '2026-07-05', baseMax: 23, baseMin: 14, precip: 40 },
  { query: '35.6895,139.6917',   name: 'Tokyo',      country: 'Japan',          lat: 35.689500,  lon: 139.691700,  start: '2026-06-10', end: '2026-06-14', baseMax: 27, baseMin: 20, precip: 65 },
  { query: 'lagos',              name: 'Lagos',      country: 'Nigeria',        lat: 6.524379,   lon: 3.379206,    start: '2026-07-08', end: '2026-07-12', baseMax: 29, baseMin: 24, precip: 70 },
  { query: 'sydney',             name: 'Sydney',     country: 'Australia',      lat: -33.868820, lon: 151.209290,  start: '2026-06-15', end: '2026-06-21', baseMax: 17, baseMin: 9,  precip: 35 },
  { query: 'paris',              name: 'Paris',      country: 'France',         lat: 48.856613,  lon: 2.352222,    start: '2026-05-04', end: '2026-05-08', baseMax: 19, baseMin: 10, precip: 30 },
  { query: 'vancouver',          name: 'Vancouver',  country: 'Canada',         lat: 49.282730,  lon: -123.120735, start: '2026-07-27', end: '2026-08-01', baseMax: 24, baseMin: 14, precip: 20 },
  { query: 'cape town',          name: 'Cape Town',  country: 'South Africa',   lat: -33.924870, lon: 18.424055,   start: '2026-06-01', end: '2026-06-07', baseMax: 18, baseMin: 10, precip: 55 },
];

async function seed() {
  await initSchema();

  // Wipe first so rerunning `npm run seed` resets to a clean 8 rows
  // instead of piling up duplicates.
  await pool.query('DELETE FROM weather_records');

  for (const s of SAMPLES) {
    const weatherData = buildDailyData(s.start, s.end, s.baseMax, s.baseMin, s.precip);
    await pool.query(
      `INSERT INTO weather_records
         (location_query, location_name, country, latitude, longitude,
          start_date, end_date, weather_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.query, s.name, s.country, s.lat, s.lon, s.start, s.end, JSON.stringify(weatherData)]
    );
  }

  const [[{ count }]] = await pool.query(
    'SELECT COUNT(*) AS count FROM weather_records'
  );
  console.log(`Seeded ${count} weather records.`);
}

try {
  await seed();
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
