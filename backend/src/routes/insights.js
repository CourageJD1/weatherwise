import { Router } from 'express';
import { getWeatherInsights } from '../services/aiService.js';
import { validateInsightsBody } from '../middleware/validate.js';

// POST /api/insights — natural-language weather briefing via the AI service.
// Body: { location, current?, forecast?, airQuality? } with the same shapes
// weatherService returns. Failures become 502/503 via the error middleware;
// the frontend treats any non-success as "no insights panel" (plan decision 7),
// so this endpoint can never take the core weather flow down with it.

const router = Router();

router.post('/', validateInsightsBody, async (req, res, next) => {
  try {
    const { location, current, forecast, airQuality } = req.body;
    const insights = await getWeatherInsights({ location, current, forecast, airQuality });
    res.json({ success: true, data: insights, error: null });
  } catch (err) {
    next(err);
  }
});

export default router;
