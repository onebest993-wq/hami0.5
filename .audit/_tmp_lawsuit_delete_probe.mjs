/**
 * Find same-file-only exports with <=1 identifier occurrence in defining file
 * (definition only — safe DELETE of the export + body if unused).
 * Skips *Props, demoted-40 set, PersistMigrate, @deprecated KEEP.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const data = JSON.parse(fs.readFileSync(path.join(ROOT, '.audit/_tmp_lawsuit_samefile_probe.json'), 'utf8'));
const demoted = new Set(
  JSON.parse(fs.readFileSync(path.join(ROOT, '.audit/_tmp_lawsuit_demote40.json'), 'utf8')).map(
    (x) => `${x.rel}::${x.name}`,
  ),
);

const deletes = [];
for (const c of data.demoteCandidates) {
  const key = `${c.rel}::${c.name}`;
  if (demoted.has(key)) continue;
  if (/Props$/.test(c.name)) continue;
  if (/PersistMigrate/i.test(c.rel)) continue;
  const text = fs.readFileSync(path.join(ROOT, c.rel), 'utf8');
  if (/@deprecated[\s\S]{0,120}KEEP/i.test(text) && text.includes(c.name)) continue;
  const re = new RegExp(`\\b${c.name.replace(/\$/g, '\\$')}\\b`, 'g');
  const matches = text.match(re) || [];
  if (matches.length <= 1) {
    deletes.push({ rel: c.rel, name: c.name, refs: matches.length, line: c.line });
  }
}

fs.writeFileSync(path.join(ROOT, '.audit/_tmp_lawsuit_delete_candidates.json'), JSON.stringify(deletes, null, 2));
console.log('delete candidates (0-1 in-file refs):', deletes.length);
for (const d of deletes.slice(0, 30)) {
  console.log(`${d.refs} ${d.rel} :: ${d.name}`);
}
