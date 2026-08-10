// Weather-driven theme: a WMO weather code plus is-day maps to the six colour
// tokens the whole UI is built from. This is the reason the app feels alive
// rather than skinned — the palette is derived from the conditions being
// displayed, not fixed.
//
// The base surface stays dark in every preset so text contrast is never in
// question and the panels read consistently. Only `accent` and `glow` swing
// hard between conditions.
//
// Every combination in here is checked against WCAG AA (4.5:1) by
// scripts/check-contrast.mjs — run it after changing any value.

// `cloudy` is not in the original design table, which covered clear/rain/snow/
// storm/fog only. WMO codes 2 and 3 (partly cloudy, overcast) are among the
// most common conditions Open-Meteo returns and would otherwise have to borrow
// the clear-sky preset, putting a warm high-sun accent on a grey overcast day.
// It is deliberately the most muted of the set.
export const THEMES = {
  clearDay: {
    surface: '#1B3A4B',
    surfaceRaised: 'rgba(255, 255, 255, 0.07)',
    ink: '#F5F9FB',
    inkMuted: '#AFC4CE',
    accent: '#F2C14E',
    glow: '#F7D98B',
  },
  clearNight: {
    surface: '#101826',
    surfaceRaised: 'rgba(255, 255, 255, 0.06)',
    ink: '#EEF2F8',
    inkMuted: '#A3B2C7',
    accent: '#7FA8D9',
    glow: '#A9C4E6',
  },
  rain: {
    surface: '#1E2A32',
    surfaceRaised: 'rgba(255, 255, 255, 0.06)',
    ink: '#F0F5F7',
    inkMuted: '#A8BCC5',
    accent: '#6FB1C4',
    glow: '#8FCBDC',
  },
  snow: {
    surface: '#243040',
    surfaceRaised: 'rgba(255, 255, 255, 0.07)',
    ink: '#F4F8FC',
    inkMuted: '#AEBDD0',
    accent: '#D6E4F0',
    glow: '#E8F1F8',
  },
  storm: {
    surface: '#161B26',
    surfaceRaised: 'rgba(255, 255, 255, 0.06)',
    ink: '#F1F0F7',
    inkMuted: '#A9A6BD',
    // Design table specified #8C7AE6, which measures 4.20:1 on a raised panel
    // and fails AA. Lightened the minimum amount that clears 4.5:1 (now 4.88)
    // while keeping the bruised-violet character.
    accent: '#9788EA',
    glow: '#B3A5F0',
  },
  fog: {
    surface: '#2A2F33',
    surfaceRaised: 'rgba(255, 255, 255, 0.07)',
    ink: '#F2F4F5',
    inkMuted: '#B2BABF',
    accent: '#A9B4BA',
    glow: '#C7CFD3',
  },
  cloudy: {
    surface: '#1F2933',
    surfaceRaised: 'rgba(255, 255, 255, 0.06)',
    ink: '#F1F5F8',
    inkMuted: '#AAB8C4',
    accent: '#9BB3C4',
    glow: '#B8CBD8',
  },
};

// WMO weather interpretation codes, grouped into the presets above. Same code
// set weatherCodes.js renders icons from.
export function themeNameFor(weatherCode, isDay = true) {
  const code = Number(weatherCode);

  if (Number.isNaN(code)) return isDay ? 'clearDay' : 'clearNight';
  if (code === 0 || code === 1) return isDay ? 'clearDay' : 'clearNight';
  if (code === 2 || code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 95) return 'storm';
  // Snow and snow showers before rain: 85/86 sit above the rain-shower range.
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  return 'cloudy';
}

export function themeFor(weatherCode, isDay = true) {
  return THEMES[themeNameFor(weatherCode, isDay)];
}

// Writes the tokens onto the root element. The 700ms fade lives in CSS (the
// custom properties are registered with @property so they interpolate); this
// only swaps the values.
export function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--surface-raised', theme.surfaceRaised);
  root.style.setProperty('--ink', theme.ink);
  root.style.setProperty('--ink-muted', theme.inkMuted);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--glow', theme.glow);
}
