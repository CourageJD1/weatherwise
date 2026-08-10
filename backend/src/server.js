import express from 'express';
import dotenv from 'dotenv';
import { initSchema } from './db/schema.js';
import weatherRouter from './routes/weather.js';
import recordsRouter from './routes/records.js';
import exportRouter from './routes/export.js';
import insightsRouter from './routes/insights.js';
import locationRouter from './routes/location.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

// Create the database and tables before accepting requests, so a fresh
// clone only needs MySQL running and a .env — no manual .sql import.
try {
  await initSchema();
  console.log('Database schema ready');
} catch (err) {
  console.error('Could not initialize the database:', err.message);
  console.error('Is MySQL running on the host/port set in backend/.env?');
  process.exit(1);
}

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' }, error: null });
});

app.use('/api/weather', weatherRouter);
app.use('/api/records', recordsRouter);
app.use('/api/export', exportRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/location', locationRouter);

// Any /api path that matched no router above. Without this, Express's default
// handler replies with an HTML error page, which breaks the frontend's
// envelope parsing and contradicts the { success, data, error } contract every
// other endpoint honours.
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: `No such endpoint: ${req.method} ${req.originalUrl}`,
  });
});

// Must be registered after all routes so thrown/next()ed errors land here.
app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`WeatherWise backend listening on http://localhost:${port}`);
});
