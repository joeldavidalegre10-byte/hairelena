const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync('C:\\Users\\joeld\\.gemini\\antigravity\\scratch\\elite-studio-pos\\backend\\data\\elite_pos.db');
const tables = [
  'users',
  'stylists',
  'categories',
  'services',
  'service_stylist_margins',
  'service_variants',
  'products',
  'cash_registers',
  'cash_movements',
  'sales',
  'sale_items',
  'stylist_payouts',
  'commissions',
  'stylist_payout_items',
  'settings',
  'audit_logs'
];

for (const t of tables) {
  const cols = db.prepare(`PRAGMA table_info(${t})`).all();
  console.log(`TABLE ${t}:`);
  console.log(cols.map(c => `${c.name} (${c.type}, notnull=${c.notnull}, dflt=${c.dflt_value})`).join(', '));
}
