import { useEffect, useRef } from 'react';
import { startWeatherCanvas } from '../utils/particles.js';

// Thin React wrapper around the particle engine. All the interesting logic is
// in utils/particles.js; this owns only the element and its lifecycle.
//
// The layer is fixed to the viewport, sits behind every panel, and is
// pointer-events:none plus aria-hidden — it must never intercept a click, block
// scrolling, or be announced to a screen reader, since it carries no
// information the text does not already give.

function WeatherCanvas({ themeName, windSpeed, precipitation }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  // Created once. Condition changes are pushed in through setCondition rather
  // than by tearing the canvas down, so the cross-fade has both systems to
  // blend between.
  useEffect(() => {
    engineRef.current = startWeatherCanvas(canvasRef.current, {
      themeName,
      windSpeed,
      precipitation,
    });
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only by design
  }, []);

  useEffect(() => {
    engineRef.current?.setCondition(themeName, { windSpeed, precipitation });
  }, [themeName, windSpeed, precipitation]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}

export default WeatherCanvas;
