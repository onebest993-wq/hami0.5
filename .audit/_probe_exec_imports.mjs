import fs from 'node:fs';
const file = process.argv[2];
const s = fs.readFileSync(file, 'utf8');
const re = /(?:from|import)\s*["']\.\/([^"']+\.js)["']/g;
const out = [];
let m;
while ((m = re.exec(s))) {
    const before = s.slice(Math.max(0, m.index - 8), m.index);
    if (/import\s*\($/.test(before)) continue;
    if (/execution/.test(m[1])) out.push(m[1]);
}
console.log(out.join('\n') || 'NONE');
console.log('persist idx', s.indexOf('persist-pipeline'));
console.log('boot idx', s.indexOf('boot-pipeline'));
