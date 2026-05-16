import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const out = join(root, 'src', 'data', 'executionLaws.articles.json');
const parts = [];
for (let i = 1; i <= 13; i++) {
    const p = join(__dirname, `execution-law-part-${String(i).padStart(2, '0')}.json`);
    const raw = readFileSync(p, 'utf8');
    parts.push(...JSON.parse(raw));
}
parts.sort((a, b) => a.number - b.number);
if (parts.length !== 130 || new Set(parts.map((x) => x.number)).size !== 130) {
    throw new Error(`Expected 130 unique articles, got ${parts.length}`);
}
writeFileSync(out, JSON.stringify(parts, null, 2), 'utf8');
console.log('Wrote', out, parts.length);
