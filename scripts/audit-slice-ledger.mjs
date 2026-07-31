import fs from 'fs';
import path from 'path';

const inv = JSON.parse(fs.readFileSync('.audit/execution-inventory.json', 'utf8'));
const mods = ['A4-dashboard-utils', 'A5-dashboard-helpers', 'A6-dashboard-root'];
const files = inv.fileInventory.filter((f) => mods.includes(f.module));
files.sort((a, b) => a.path.localeCompare(b.path));
console.log('COUNT', files.length);
let total = 0;
for (const f of files) {
  total += f.lines;
  console.log(`${f.lines}\t${f.path}`);
}
console.log('TOTAL', total);
