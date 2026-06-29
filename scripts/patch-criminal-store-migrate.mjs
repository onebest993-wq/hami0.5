import fs from 'node:fs';
import path from 'node:path';

const storePath = path.resolve('src/app/components/lawyer/criminal-system/criminalStore.ts');
let content = fs.readFileSync(storePath, 'utf8');
const lines = content.split(/\r?\n/);

const migrateStart = lines.findIndex((l) => l.includes('migrate: (persistedState: unknown) =>'));
const migrateEnd = lines.findIndex((l, i) => i > migrateStart && l.trim() === '},' && lines[i - 1]?.includes('casesById: casesOut'));

if (migrateStart < 0 || migrateEnd < 0) {
    console.error('migrate block not found', { migrateStart, migrateEnd });
    process.exit(1);
}

lines.splice(migrateStart, migrateEnd - migrateStart + 1, '            migrate: migrateCriminalPersistState,');
fs.writeFileSync(storePath, lines.join('\n'), 'utf8');
console.log('Replaced migrate block in criminalStore.ts');
