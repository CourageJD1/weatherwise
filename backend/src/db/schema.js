import mysql from 'mysql2/promise';
import { pool } from '../config/db.js';

// Schema from docs/PLAN.md. weather_data is one JSON column on purpose:
// UPDATE re-fetches the whole date range, so per-day child rows would only
// add a join for no gain.
const CREATE_WEATHER_RECORDS = `
  CREATE TABLE IF NOT EXISTS weather_records (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    location_query  VARCHAR(255) NOT NULL,
    location_name   VARCHAR(255) NOT NULL,
    country         VARCHAR(100),
    latitude        DECIMAL(9,6) NOT NULL,
    longitude       DECIMAL(9,6) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    weather_data    JSON NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`;

// Called on every server start. A reviewer cloning this repo only needs
// MySQL running and a .env — no .sql import by hand.
export async function initSchema() {
  // The pool is bound to DB_NAME, which doesn't exist on a fresh machine,
  // so the database itself is created over a one-off connection first.
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
  } finally {
    await conn.end();
  }

  await pool.query(CREATE_WEATHER_RECORDS);
}
