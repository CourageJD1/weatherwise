import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Loaded here (not only in server.js) so standalone scripts like seed.js
// get the same config without duplicating dotenv calls.
dotenv.config();

// One shared pool for the whole app. Pools connect lazily, so creating it
// before the database exists is safe — initSchema() creates the database
// on boot before any query runs through the pool.
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});
