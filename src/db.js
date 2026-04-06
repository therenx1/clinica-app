const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: 'clinica-db-do-user-35526061-0.e.db.ondigitalocean.com',
  port: 25060,
  user: 'doadmin',
  password: process.env.DB_PASSWORD,
  database: 'clinica_db',
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;