import PDFDocument from 'pdfkit';

// One exporter per format (assessment section 2.3). Every function takes the
// same input — an array of records in the API shape produced by
// routes/records.js — and returns the complete file body (string, or Buffer
// for PDF). The EXPORTERS table at the bottom pairs each with its
// Content-Type and file extension so the route can stay a thin dispatcher.

// Tabular formats (CSV, Markdown, PDF) flatten each record into one row per
// day, since a range record holds many days. JSON and XML keep the nested
// record -> days structure because those formats can represent it.

/* --------------------------------- helpers -------------------------------- */

// null/undefined print as empty rather than "null" in tabular output.
function cell(value) {
  return value === null || value === undefined ? '' : String(value);
}

// One flat row per (record, day) for the tabular formats.
const DAY_COLUMNS = [
  'recordId', 'location', 'country', 'latitude', 'longitude',
  'date', 'tempMaxC', 'tempMinC', 'weatherCode', 'precipitationProbability',
];

function toDayRows(records) {
  return records.flatMap((r) =>
    r.weatherData.map((day) => ({
      recordId: r.id,
      location: r.locationName,
      country: r.country,
      latitude: r.latitude,
      longitude: r.longitude,
      date: day.date,
      tempMaxC: day.tempMax,
      tempMinC: day.tempMin,
      weatherCode: day.weatherCode,
      precipitationProbability: day.precipitationProbability,
    }))
  );
}

/* ---------------------------------- JSON ----------------------------------- */

export function toJson(records) {
  return JSON.stringify(records, null, 2);
}

/* ----------------------------------- CSV ----------------------------------- */

// RFC 4180 quoting: a field containing a comma, double quote, or newline is
// wrapped in double quotes, with embedded quotes doubled. Everything else is
// left bare. This is the part the assessment calls out explicitly.
function csvField(value) {
  const s = cell(value);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCsv(records) {
  const lines = [DAY_COLUMNS.join(',')];
  for (const row of toDayRows(records)) {
    lines.push(DAY_COLUMNS.map((col) => csvField(row[col])).join(','));
  }
  // Leading BOM so Excel detects UTF-8 on double-click; without it,
  // accented location names ("Zürich") garble. CRLF line endings per
  // RFC 4180; Excel is happiest with those too.
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

/* -------------------------------- Markdown --------------------------------- */

// Pipes would break table cells; escape them. (Locations can contain
// anything the geocoder returns.)
function mdCell(value) {
  return cell(value).replaceAll('|', '\\|');
}

export function toMarkdown(records) {
  const parts = ['# WeatherWise Export', ''];
  for (const r of records) {
    const place = r.country ? `${r.locationName}, ${r.country}` : r.locationName;
    parts.push(
      `## ${mdCell(place)} (record ${r.id})`,
      '',
      `- Searched as: ${mdCell(r.locationQuery)}`,
      `- Coordinates: ${r.latitude}, ${r.longitude}`,
      `- Range: ${r.startDate} to ${r.endDate}`,
      '',
      '| Date | Max °C | Min °C | Weather code | Precip. prob. % |',
      '| --- | --- | --- | --- | --- |',
      ...r.weatherData.map(
        (d) =>
          `| ${d.date} | ${cell(d.tempMax)} | ${cell(d.tempMin)} | ${cell(d.weatherCode)} | ${cell(d.precipitationProbability)} |`
      ),
      ''
    );
  }
  return parts.join('\n');
}

/* ----------------------------------- XML ----------------------------------- */

function xmlEscape(value) {
  return cell(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// <tag>value</tag>, or a self-closing <tag/> for null so "no data" is
// distinguishable from an empty string.
function xmlTag(name, value, indent) {
  if (value === null || value === undefined) return `${indent}<${name}/>`;
  return `${indent}<${name}>${xmlEscape(value)}</${name}>`;
}

export function toXml(records) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<weatherRecords>'];
  for (const r of records) {
    lines.push(
      `  <record id="${r.id}">`,
      xmlTag('locationQuery', r.locationQuery, '    '),
      xmlTag('locationName', r.locationName, '    '),
      xmlTag('country', r.country, '    '),
      xmlTag('latitude', r.latitude, '    '),
      xmlTag('longitude', r.longitude, '    '),
      xmlTag('startDate', r.startDate, '    '),
      xmlTag('endDate', r.endDate, '    '),
      '    <days>'
    );
    for (const d of r.weatherData) {
      lines.push(
        `      <day date="${xmlEscape(d.date)}">`,
        xmlTag('tempMax', d.tempMax, '        '),
        xmlTag('tempMin', d.tempMin, '        '),
        xmlTag('weatherCode', d.weatherCode, '        '),
        xmlTag('precipitationProbability', d.precipitationProbability, '        '),
        '      </day>'
      );
    }
    lines.push('    </days>', '  </record>');
  }
  lines.push('</weatherRecords>', '');
  return lines.join('\n');
}

/* ----------------------------------- PDF ----------------------------------- */

// PDFKit writes to a stream, so this one is async: collect the chunks and
// resolve with the finished Buffer once the document ends.
export function toPdf(records) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(18).text('WeatherWise Export');
    doc.font('Helvetica').fontSize(10).fillColor('#555')
      .text(`Generated ${new Date().toISOString().slice(0, 10)} — ${records.length} record(s)`);

    for (const r of records) {
      const place = r.country ? `${r.locationName}, ${r.country}` : r.locationName;
      doc.moveDown(1.5);
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#000')
        .text(`${place}  (record ${r.id})`);
      doc.font('Helvetica').fontSize(9).fillColor('#555')
        .text(`Searched as "${r.locationQuery}" — ${r.latitude}, ${r.longitude} — ${r.startDate} to ${r.endDate}`);
      doc.moveDown(0.5);

      // Courier + padEnd gives aligned columns without a table library.
      doc.font('Courier-Bold').fontSize(9).fillColor('#000')
        .text(pdfRow('Date', 'Max °C', 'Min °C', 'Code', 'Precip %'));
      doc.font('Courier');
      for (const d of r.weatherData) {
        doc.text(pdfRow(d.date, cell(d.tempMax), cell(d.tempMin), cell(d.weatherCode), cell(d.precipitationProbability)));
      }
    }

    doc.end();
  });
}

function pdfRow(date, max, min, code, precip) {
  return [
    String(date).padEnd(12),
    String(max).padStart(7),
    String(min).padStart(7),
    String(code).padStart(6),
    String(precip).padStart(9),
  ].join('');
}

/* -------------------------------- dispatcher ------------------------------- */

export const EXPORTERS = {
  json: { render: toJson, contentType: 'application/json; charset=utf-8', extension: 'json' },
  csv: { render: toCsv, contentType: 'text/csv; charset=utf-8', extension: 'csv' },
  markdown: { render: toMarkdown, contentType: 'text/markdown; charset=utf-8', extension: 'md' },
  xml: { render: toXml, contentType: 'application/xml; charset=utf-8', extension: 'xml' },
  pdf: { render: toPdf, contentType: 'application/pdf', extension: 'pdf' },
};
