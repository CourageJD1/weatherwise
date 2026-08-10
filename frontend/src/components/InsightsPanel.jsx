import { useEffect, useState } from 'react';
import { fetchInsights } from '../services/api.js';

// AI briefing for a saved record. Generated on demand (a button) rather than
// automatically, so browsing records doesn't fire a Gemini call per click.
// Failure is deliberately soft — a small note, never an intrusive error —
// because the AI is an enrichment, not core data (plan decision 7).

function InsightsPanel({ record }) {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);

  // A different record means stale advice: reset to the button.
  useEffect(() => {
    setStatus('idle');
    setInsights(null);
    setError(null);
  }, [record.id]);

  async function handleGenerate() {
    setStatus('loading');
    setError(null);
    try {
      const data = await fetchInsights({
        location: [record.locationName, record.country].filter(Boolean).join(', '),
        forecast: record.weatherData,
      });
      setInsights(data);
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-800">
          <span aria-hidden="true">✨</span> AI weather briefing
        </h4>
        {status !== 'success' && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={status === 'loading'}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white
                       hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'loading' ? 'Thinking…' : status === 'error' ? 'Try again' : 'Generate'}
          </button>
        )}
      </div>

      {status === 'idle' && (
        <p className="mt-2 text-xs text-slate-500">
          Get a natural-language summary of this record&apos;s weather, with clothing advice and
          travel tips.
        </p>
      )}

      {status === 'error' && (
        <p className="mt-2 text-xs text-slate-500">
          The AI briefing is unavailable right now ({error}). Everything else still works.
        </p>
      )}

      {status === 'success' && insights && (
        <div className="mt-3 space-y-3 text-sm text-slate-700">
          <p>{insights.summary}</p>

          {insights.clothingAdvice && (
            <p>
              <span className="font-semibold">What to wear:</span> {insights.clothingAdvice}
            </p>
          )}

          {insights.travelTips.length > 0 && (
            <div>
              <p className="font-semibold">Travel tips</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {insights.travelTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {insights.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="font-semibold text-amber-800">Worth knowing</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-800">
                {insights.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InsightsPanel;
