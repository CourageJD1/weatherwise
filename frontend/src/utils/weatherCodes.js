// WMO weather codes (what Open-Meteo's weather_code field contains) mapped
// to a label and an icon. Codes 0-2 get day/night icon variants via is_day.
// Shared by CurrentConditions (day/night aware) and Forecast (always day).
const WEATHER_CODES = {
  0: { label: 'Clear sky', day: '☀️', night: '🌕' },
  1: { label: 'Mainly clear', day: '🌤️', night: '🌕' },
  2: { label: 'Partly cloudy', day: '⛅', night: '☁️' },
  3: { label: 'Overcast', day: '☁️', night: '☁️' },
  45: { label: 'Fog', day: '🌫️', night: '🌫️' },
  48: { label: 'Depositing rime fog', day: '🌫️', night: '🌫️' },
  51: { label: 'Light drizzle', day: '🌦️', night: '🌧️' },
  53: { label: 'Drizzle', day: '🌦️', night: '🌧️' },
  55: { label: 'Dense drizzle', day: '🌧️', night: '🌧️' },
  56: { label: 'Freezing drizzle', day: '🌧️', night: '🌧️' },
  57: { label: 'Dense freezing drizzle', day: '🌧️', night: '🌧️' },
  61: { label: 'Light rain', day: '🌦️', night: '🌧️' },
  63: { label: 'Rain', day: '🌧️', night: '🌧️' },
  65: { label: 'Heavy rain', day: '🌧️', night: '🌧️' },
  66: { label: 'Freezing rain', day: '🌧️', night: '🌧️' },
  67: { label: 'Heavy freezing rain', day: '🌧️', night: '🌧️' },
  71: { label: 'Light snow', day: '🌨️', night: '🌨️' },
  73: { label: 'Snow', day: '🌨️', night: '🌨️' },
  75: { label: 'Heavy snow', day: '❄️', night: '❄️' },
  77: { label: 'Snow grains', day: '🌨️', night: '🌨️' },
  80: { label: 'Light rain showers', day: '🌦️', night: '🌧️' },
  81: { label: 'Rain showers', day: '🌧️', night: '🌧️' },
  82: { label: 'Violent rain showers', day: '⛈️', night: '⛈️' },
  85: { label: 'Snow showers', day: '🌨️', night: '🌨️' },
  86: { label: 'Heavy snow showers', day: '❄️', night: '❄️' },
  95: { label: 'Thunderstorm', day: '⛈️', night: '⛈️' },
  96: { label: 'Thunderstorm with hail', day: '⛈️', night: '⛈️' },
  99: { label: 'Thunderstorm with heavy hail', day: '⛈️', night: '⛈️' },
};

// CSS class that gives the icon motion matching its condition. Defined in
// index.css; returns '' for codes with no natural movement so we don't animate
// for the sake of it.
function motionClassFor(code, isDay) {
  const n = Number(code);
  if (Number.isNaN(n)) return '';
  if ((n === 0 || n === 1) && isDay) return 'icon-motion icon-sun';
  if (n === 45 || n === 48) return 'icon-motion icon-fog';
  if (n >= 95) return 'icon-motion icon-storm';
  if ((n >= 71 && n <= 77) || n === 85 || n === 86) return 'icon-motion icon-snow';
  if ((n >= 51 && n <= 67) || (n >= 80 && n <= 82)) return 'icon-motion icon-rain';
  return '';
}

export function describeWeather(code, isDay = true) {
  const entry = WEATHER_CODES[code] ?? { label: 'Unknown conditions', day: '🌡️', night: '🌡️' };
  return {
    label: entry.label,
    icon: isDay ? entry.day : entry.night,
    motionClass: motionClassFor(code, isDay),
  };
}
