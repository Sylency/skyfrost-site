'use strict';

const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number.parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || 'hytale_licenses',
    user: process.env.DB_USER || 'hylicense',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: 'utf8mb4'
  });

  return pool;
}

/**
 * Execute a query and return the rows.
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<any[]>}
 */
async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

module.exports = { getPool, query };
