require('dotenv').config();
const pool = require('./db');
async function run() {
  try {
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS primera_vez BOOLEAN DEFAULT TRUE;`);
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS elapsed_seconds INTEGER DEFAULT 0;`);
    console.log('Columns added to usuarios table or already exist.');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
