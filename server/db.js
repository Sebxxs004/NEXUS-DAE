const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const useSsl = process.env.DB_SSL === 'true' || Boolean(connectionString);

const baseConfig = connectionString
  ? {
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    }
  : {
      user: process.env.DB_USER || 'prisma_admin',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'prisma_dae',
      password: process.env.DB_PASSWORD || 'prisma_secure_2026',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5435,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    };

const pool = new Pool(baseConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
