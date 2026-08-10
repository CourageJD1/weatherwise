#!/usr/bin/env node
// Verifies every theme preset meets WCAG AA against its own surface.
//
//   node scripts/check-contrast.mjs
//
// Tier A requires "all text must hit at least 4.5:1 against its background in
// every one of the six conditions". This checks it rather than assuming it, and
// exits non-zero on a failure so it can gate a commit.
//
// Thresholds: 4.5:1 is AA for normal text. Large text (the temperature display)
// only needs 3:1, but everything here is held to 4.5 so a token can be reused
// anywhere without re-checking.

import { THEMES } from '../src/utils/theme.js';

const AA_NORMAL = 4.5;

// Panels are a translucent white over the surface, so the effective panel
// colour is that composite — checking text against the raw surface would
// understate the real contrast. This flattens rgba(255,255,255,a) over the
// surface to the colour a user actually sees.
function compositeOver(rgbaish, backdrop) {
  const match = rgbaish.match(/rgba?\(([^)]+)\)/);
  if (!match) return hexToRgb(rgbaish);
  const [r, g, b, a = 1] = match[1].split(',').map((n) => Number(n.trim()));
  const bg = hexToRgb(backdrop);
  return {
    r: Math.round(r * a + bg.r * (1 - a)),
    g: Math.round(g * a + bg.g * (1 - a)),
    b: Math.round(b * a + bg.b * (1 - a)),
  };
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// WCAG 2.1 relative luminance.
function luminance({ r, g, b }) {
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

let failures = 0;

for (const [name, t] of Object.entries(THEMES)) {
  const surface = hexToRgb(t.surface);
  const panel = compositeOver(t.surfaceRaised, t.surface);

  // Each token is checked against both backgrounds it can legitimately sit on.
  const checks = [
    ['ink on surface', hexToRgb(t.ink), surface],
    ['ink on panel', hexToRgb(t.ink), panel],
    ['inkMuted on surface', hexToRgb(t.inkMuted), surface],
    ['inkMuted on panel', hexToRgb(t.inkMuted), panel],
    ['accent on surface', hexToRgb(t.accent), surface],
    ['accent on panel', hexToRgb(t.accent), panel],
  ];

  console.log(`\n${name}`);
  for (const [label, fg, bg] of checks) {
    const r = ratio(fg, bg);
    const ok = r >= AA_NORMAL;
    if (!ok) failures++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(22)} ${r.toFixed(2)}:1`);
  }
}

console.log(
  failures === 0
    ? `\nAll ${Object.keys(THEMES).length} presets meet WCAG AA (${AA_NORMAL}:1).`
    : `\n${failures} combination(s) below ${AA_NORMAL}:1.`
);
process.exit(failures > 0 ? 1 : 0);
