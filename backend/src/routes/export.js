import { Router } from 'express';
import { findRecord, listRecords } from './records.js';
import { EXPORTERS } from '../utils/exporters.js';
import { ValidationError } from '../services/errors.js';

// GET /api/export/:format[?id=] — download saved records as a file.
// Mounted outside /api/records so "/api/export/csv" can never be captured
// by the "/api/records/:id" pattern (plan endpoint table).

const router = Router();

router.get('/:format', async (req, res, next) => {
  try {
    // Object.hasOwn, not a plain lookup: EXPORTERS["constructor"] (or
    // "__proto__", "toString", …) would find an inherited property, pass a
    // truthy check, then blow up on exporter.render as a 500. Own keys only.
    const exporter = Object.hasOwn(EXPORTERS, req.params.format)
      ? EXPORTERS[req.params.format]
      : null;
    if (!exporter) {
      throw new ValidationError(
        `Unknown export format "${req.params.format}". Supported formats: ${Object.keys(EXPORTERS).join(', ')}.`
      );
    }

    // ?id= narrows the export to a single record; omitted means all records.
    let records;
    let filename = `weatherwise-records.${exporter.extension}`;
    if (req.query.id !== undefined) {
      if (!/^[1-9]\d*$/.test(req.query.id)) {
        throw new ValidationError(
          `"id" must be a positive whole number, got "${req.query.id}".`
        );
      }
      const record = await findRecord(req.query.id);
      if (!record) {
        return res
          .status(404)
          .json({ success: false, data: null, error: `No record with id ${req.query.id}.` });
      }
      records = [record];
      filename = `weatherwise-record-${record.id}.${exporter.extension}`;
    } else {
      records = await listRecords();
    }

    // Render BEFORE setting headers: if a formatter throws, the error
    // middleware must still be able to send plain JSON, not a JSON body
    // wearing attachment/PDF headers the browser would try to download.
    const body = await exporter.render(records);

    // Content-Disposition: attachment is what makes the browser download
    // instead of rendering the response inline.
    res.setHeader('Content-Type', exporter.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(body);
  } catch (err) {
    next(err);
  }
});

export default router;
