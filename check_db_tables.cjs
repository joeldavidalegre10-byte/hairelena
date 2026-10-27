const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const dbPath = path.resolve(__dirname, 'backend', 'data', 'elite_pos.db');
if (!fs.existsSync(dbPath)) {
  console.error('No se encontró la base de datos en', dbPath);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);

console.log('Tablas existentes:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
console.log(tables.map(t => t.name));

for (const t of tables) {
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get().c;
  console.log(`- ${t.name}: ${count} filas`);
}
