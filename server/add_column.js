const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let val = (match[2] || '').trim();
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[key] = val;
    }
  });
}

const pool = require('./db');
async function run() {
  try {
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS primera_vez BOOLEAN DEFAULT TRUE;`);
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS elapsed_seconds INTEGER DEFAULT 0;`);
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS created_groups TEXT DEFAULT '[]';`);
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS shown_event_ids TEXT DEFAULT '[]';`);
    console.log('Columns added to usuarios table or already exist.');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
