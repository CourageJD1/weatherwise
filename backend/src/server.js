import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' }, error: null });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`WeatherWise backend listening on http://localhost:${port}`);
});
