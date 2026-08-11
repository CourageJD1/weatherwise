// Ambient weather particle systems, canvas 2D, no libraries.
//
// One file on purpose: every tunable number lives in TUNING at the top so the
// behaviour can be explained and adjusted without reading the draw code.
//
// The engine is deliberately dumb. Each system is a plain object with spawn /
// step / draw, and the runner owns timing, resizing, cross-fades and the
// pause rules. Nothing here touches React or the DOM beyond the canvas.

/* --------------------------------- tuning ---------------------------------- */

export const TUNING = {
  // Particle budget is expressed per million device-independent pixels, then
  // clamped, so a phone does not run the same 400 particles as a desktop.
  density: {
    perMegapixel: { rain: 260, snow: 130, fog: 5, dust: 45, stars: 220, haze: 14 },
    maxParticles: 420, // hard ceiling on any viewport
    minParticles: 12,
    // The soft-blob systems are meant to be "a few large shapes". The global
    // minimum of 12 defeats that: fog's own budget is 3 blobs on a laptop, so
    // the clamp was forcing four times as many onto every screen — measured at
    // 82% coverage on a phone, which is a white wash, not atmosphere.
    minPerKind: { fog: 3, haze: 4 },
  },

  // Blob radii below are authored for roughly this viewport width and scaled
  // down on narrower screens. A 340px blob on a 390px phone is full-width.
  referenceWidthPx: 1280,

  rain: {
    speedPxPerSec: [700, 1100], // fall speed range
    lengthPx: [10, 26], // streak length, scaled by speed
    widthPx: 1.1,
    alpha: [0.18, 0.42],
    // Wind tilts the streaks. km/h -> radians, capped so a gale still reads.
    windRadPerKmh: 0.012,
    maxTiltRad: 0.55,
    // Heavier precipitation means more, faster drops.
    precipBoost: 0.5, // extra density per mm/h, capped below
    maxPrecipBoost: 1.8,
  },

  snow: {
    speedPxPerSec: [28, 80],
    radiusPx: [1.1, 3.4],
    alpha: [0.35, 0.85],
    // Sideways drift is a slow sine per flake so they wander rather than fall straight.
    swayPxPerSec: [8, 34],
    swayPeriodSec: [2.4, 6.5],
    windRadPerKmh: 0.02,
    maxTiltRad: 0.7,
  },

  fog: {
    // A few large soft blobs at very low opacity.
    //
    // These alphas are a CONTRAST constraint, not a taste one. Panels are ~7%
    // opaque with a backdrop blur, so anything drawn behind them bleeds through
    // and lightens the effective background for panel text. Measured: a 6.4%
    // white wash drops accent-on-panel from 5.12:1 to 4.23:1, under WCAG AA.
    // Keep the mean well under ~3%.
    radiusPx: [140, 340],
    speedPxPerSec: [6, 20],
    alpha: [0.025, 0.06],
  },

  // Clear day: sparse motes catching the light.
  dust: {
    radiusPx: [0.8, 2.2],
    speedPxPerSec: [6, 22],
    alpha: [0.12, 0.35],
    swayPxPerSec: [4, 14],
    swayPeriodSec: [3, 9],
  },

  // Clear night: a faint starfield that twinkles.
  stars: {
    radiusPx: [0.5, 1.6],
    alpha: [0.15, 0.7],
    twinklePeriodSec: [1.8, 6],
    driftPxPerSec: 2, // barely moves; keeps it from looking like a static image
  },

  // Overcast/partly cloudy: barely-there drifting haze so the layer is not dead.
  haze: {
    radiusPx: [90, 220],
    speedPxPerSec: [4, 14],
    alpha: [0.02, 0.045], // same contrast constraint as fog above
  },

  storm: {
    flashIntervalSec: [8, 20],
    flashDurationMs: 180,
    flashPeakAlpha: 0.5,
  },

  crossFadeMs: 1000, // never hard-cut between conditions
  maxFrameSeconds: 0.05, // clamp dt so a background tab cannot teleport particles
  maxDevicePixelRatio: 2,
};

/* --------------------------------- helpers --------------------------------- */

const rand = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// Particle count for a system, scaled by viewport area and clamped.
function budgetFor(kind, width, height) {
  const megapixels = (width * height) / 1_000_000;
  const perMp = TUNING.density.perMegapixel[kind] ?? 0;
  const raw = Math.round(perMp * megapixels);
  const min = TUNING.density.minPerKind[kind] ?? TUNING.density.minParticles;
  return Math.max(min, Math.min(TUNING.density.maxParticles, raw));
}

/* -------------------------------- systems ---------------------------------- */
// Each system: { step(dt, w, h), draw(ctx, alpha, w, h) }.
// `env` carries live weather values: { windSpeed (km/h), precipitation (mm) }.

function rainSystem(width, height, env, { stormy = false } = {}) {
  const cfg = TUNING.rain;
  const precipBoost = Math.min(
    cfg.maxPrecipBoost,
    1 + (env.precipitation ?? 0) * cfg.precipBoost
  );
  const count = Math.round(budgetFor('rain', width, height) * precipBoost);
  const tilt = Math.max(
    -cfg.maxTiltRad,
    Math.min(cfg.maxTiltRad, (env.windSpeed ?? 0) * cfg.windRadPerKmh)
  );

  const drops = Array.from({ length: count }, () => {
    const speed = rand(...cfg.speedPxPerSec) * precipBoost;
    return {
      x: rand(-width * 0.2, width * 1.2),
      y: rand(-height, height),
      speed,
      // Long streaks for fast drops keeps the sense of speed consistent.
      len: rand(...cfg.lengthPx) * (speed / cfg.speedPxPerSec[1]),
      alpha: rand(...cfg.alpha),
    };
  });

  // Storm flashes are owned here so lightning and rain stay in the same system.
  let nextFlashIn = rand(...TUNING.storm.flashIntervalSec);
  let flashElapsed = null;

  return {
    step(dt, w, h) {
      for (const d of drops) {
        d.y += d.speed * dt;
        d.x += d.speed * dt * Math.tan(tilt);
        if (d.y > h) {
          d.y = rand(-h * 0.2, 0);
          d.x = rand(-w * 0.2, w * 1.2);
        }
      }
      if (!stormy) return;
      if (flashElapsed !== null) {
        flashElapsed += dt * 1000;
        if (flashElapsed > TUNING.storm.flashDurationMs) flashElapsed = null;
      } else {
        nextFlashIn -= dt;
        if (nextFlashIn <= 0) {
          flashElapsed = 0;
          nextFlashIn = rand(...TUNING.storm.flashIntervalSec);
        }
      }
    },
    draw(ctx, alpha, w, h) {
      ctx.lineWidth = cfg.widthPx;
      ctx.lineCap = 'round';
      for (const d of drops) {
        ctx.strokeStyle = `rgba(255,255,255,${d.alpha * alpha})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * Math.tan(tilt), d.y - d.len);
        ctx.stroke();
      }
      if (stormy && flashElapsed !== null) {
        // Fade the flash out rather than cutting it, or it reads as a glitch.
        const t = 1 - flashElapsed / TUNING.storm.flashDurationMs;
        ctx.fillStyle = `rgba(255,255,255,${TUNING.storm.flashPeakAlpha * t * alpha})`;
        ctx.fillRect(0, 0, w, h);
      }
    },
  };
}

function snowSystem(width, height, env) {
  const cfg = TUNING.snow;
  const tilt = Math.max(
    -cfg.maxTiltRad,
    Math.min(cfg.maxTiltRad, (env.windSpeed ?? 0) * cfg.windRadPerKmh)
  );
  const flakes = Array.from({ length: budgetFor('snow', width, height) }, () => ({
    x: rand(0, width),
    y: rand(-height, height),
    r: rand(...cfg.radiusPx),
    speed: rand(...cfg.speedPxPerSec),
    alpha: rand(...cfg.alpha),
    sway: rand(...cfg.swayPxPerSec),
    period: rand(...cfg.swayPeriodSec),
    phase: rand(0, Math.PI * 2),
  }));

  let t = 0;
  return {
    step(dt, w, h) {
      t += dt;
      for (const f of flakes) {
        f.y += f.speed * dt;
        f.x += (Math.sin((t / f.period) * Math.PI * 2 + f.phase) * f.sway + f.speed * Math.tan(tilt)) * dt;
        if (f.y - f.r > h) {
          f.y = -f.r;
          f.x = rand(0, w);
        }
        if (f.x < -f.r) f.x = w + f.r;
        if (f.x > w + f.r) f.x = -f.r;
      }
    },
    draw(ctx, alpha) {
      for (const f of flakes) {
        ctx.fillStyle = `rgba(255,255,255,${f.alpha * alpha})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

// Shared implementation for the two soft-blob systems (fog and haze); they
// differ only in size, speed and opacity.
function blobSystem(kind, width, height) {
  const cfg = TUNING[kind];
  // Narrow viewports get proportionally smaller blobs, or the layer stops
  // reading as haze and becomes an opaque sheet over the whole screen.
  // Floor of 0.5, not lower: at 0.35 the overcast haze measured 0.2% coverage
  // on a phone, i.e. invisible, and overcast is the most common condition.
  const scale = Math.max(0.5, Math.min(1.2, width / TUNING.referenceWidthPx));
  const blobs = Array.from({ length: budgetFor(kind, width, height) }, () => ({
    x: rand(-0.2, 1.2) * width,
    y: rand(0, height),
    r: rand(...cfg.radiusPx) * scale,
    vx: rand(...cfg.speedPxPerSec) * (Math.random() < 0.5 ? -1 : 1),
    vy: rand(-6, 6),
    alpha: rand(...cfg.alpha),
  }));

  return {
    step(dt, w, h) {
      for (const b of blobs) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x - b.r > w) b.x = -b.r;
        if (b.x + b.r < 0) b.x = w + b.r;
        if (b.y - b.r > h) b.y = -b.r;
        if (b.y + b.r < 0) b.y = h + b.r;
      }
    },
    draw(ctx, alpha) {
      for (const b of blobs) {
        // Radial gradient keeps edges soft; a flat circle looks like a bubble.
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, `rgba(255,255,255,${b.alpha * alpha})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

function dustSystem(width, height) {
  const cfg = TUNING.dust;
  const motes = Array.from({ length: budgetFor('dust', width, height) }, () => ({
    x: rand(0, width),
    y: rand(0, height),
    r: rand(...cfg.radiusPx),
    speed: rand(...cfg.speedPxPerSec) * (Math.random() < 0.5 ? -1 : 1),
    alpha: rand(...cfg.alpha),
    sway: rand(...cfg.swayPxPerSec),
    period: rand(...cfg.swayPeriodSec),
    phase: rand(0, Math.PI * 2),
  }));

  let t = 0;
  return {
    step(dt, w, h) {
      t += dt;
      for (const m of motes) {
        m.y -= m.speed * dt * 0.35; // drift gently upward, like lit dust
        m.x += Math.sin((t / m.period) * Math.PI * 2 + m.phase) * m.sway * dt;
        if (m.y < -m.r) { m.y = h + m.r; m.x = rand(0, w); }
        if (m.y > h + m.r) m.y = -m.r;
      }
    },
    draw(ctx, alpha) {
      for (const m of motes) {
        ctx.fillStyle = `rgba(255,255,255,${m.alpha * alpha})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

function starSystem(width, height) {
  const cfg = TUNING.stars;
  const stars = Array.from({ length: budgetFor('stars', width, height) }, () => ({
    x: rand(0, width),
    y: rand(0, height * 0.85), // keep the lower band clearer, where panels sit
    r: rand(...cfg.radiusPx),
    base: rand(...cfg.alpha),
    period: rand(...cfg.twinklePeriodSec),
    phase: rand(0, Math.PI * 2),
  }));

  let t = 0;
  return {
    step(dt, w, h) {
      t += dt;
      for (const s of stars) {
        s.y += cfg.driftPxPerSec * dt;
        if (s.y > h) { s.y = 0; s.x = rand(0, w); }
      }
    },
    draw(ctx, alpha) {
      for (const s of stars) {
        // Twinkle is a sine on alpha, never reaching zero so stars don't vanish.
        const tw = 0.55 + 0.45 * Math.sin((t / s.period) * Math.PI * 2 + s.phase);
        ctx.fillStyle = `rgba(255,255,255,${s.base * tw * alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

// Theme name (from utils/theme.js) -> particle system.
export function createSystem(themeName, width, height, env) {
  switch (themeName) {
    case 'rain': return rainSystem(width, height, env);
    case 'storm': return rainSystem(width, height, env, { stormy: true });
    case 'snow': return snowSystem(width, height, env);
    case 'fog': return blobSystem('fog', width, height);
    case 'cloudy': return blobSystem('haze', width, height);
    case 'clearNight': return starSystem(width, height);
    case 'clearDay':
    default: return dustSystem(width, height);
  }
}

/* --------------------------------- runner ---------------------------------- */

/**
 * Drives a canvas. Returns a handle with setCondition() and destroy().
 *
 * Pause rules, both required: nothing animates when the tab is hidden, and
 * nothing animates at all when the user has asked for reduced motion — in that
 * case a single frame is painted so the layer still reads, then the loop stops.
 */
export function startWeatherCanvas(canvas, initial) {
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = 0;
  let height = 0;
  let env = { windSpeed: initial.windSpeed, precipitation: initial.precipitation };
  let current = null;
  let previous = null; // kept alive during a cross-fade
  let fade = 1; // 0..1 progress of current fading in
  let rafId = null;
  let lastTime = null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, TUNING.maxDevicePixelRatio);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // setTransform (not scale) so repeated resizes do not compound the scale.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Particle spawn positions are viewport-relative, so rebuild on resize.
    const keptName = current?.themeName ?? initial.themeName;
    current = createSystem(keptName, width, height, env);
    current.themeName = keptName;
    previous = null;
    fade = 1;

    // Setting canvas.width above clears the backing store. With reduced motion
    // there is no loop to repaint it, so without this a resize would leave the
    // layer permanently blank until the condition happened to change.
    if (reduceMotion) {
      current.step(0, width, height);
      drawFrame();
    }
  }

  function drawFrame() {
    ctx.clearRect(0, 0, width, height);
    if (previous) previous.draw(ctx, 1 - fade, width, height);
    if (current) current.draw(ctx, fade, width, height);
  }

  function frame(now) {
    // Delta time in seconds, clamped: a tab that was throttled must not
    // fast-forward every particle across the screen on the first frame back.
    const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, TUNING.maxFrameSeconds);
    lastTime = now;

    if (fade < 1) {
      fade = Math.min(1, fade + (dt * 1000) / TUNING.crossFadeMs);
      if (fade >= 1) previous = null;
    }
    previous?.step(dt, width, height);
    current?.step(dt, width, height);
    drawFrame();
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    // Also refuse to start while hidden: a frame scheduled in a background tab
    // just sits queued until the tab is shown, so there is no point holding it.
    if (rafId !== null || reduceMotion || document.hidden) return;
    lastTime = null;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function onVisibility() {
    if (document.hidden) stop();
    else start();
  }

  resize();
  current.themeName = initial.themeName;

  if (reduceMotion) {
    // One static frame, then nothing. The layer is still present and themed.
    current.step(0, width, height);
    drawFrame();
  } else {
    start();
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);

  return {
    setCondition(themeName, nextEnv) {
      env = { ...env, ...nextEnv };
      if (themeName === current?.themeName) return;
      previous = current;
      current = createSystem(themeName, width, height, env);
      current.themeName = themeName;
      fade = 0;
      if (reduceMotion) {
        // No cross-fade: paint the new system once and stay still.
        previous = null;
        fade = 1;
        current.step(0, width, height);
        drawFrame();
      }
    },
    destroy() {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
