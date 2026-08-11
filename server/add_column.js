require('dotenv').config();
const pool = require('./db');
async function run() {
  try {
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS primera_vez BOOLEAN DEFAULT TRUE;`);
    console.log('Column primera_vez added to usuarios table or already exists.');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
