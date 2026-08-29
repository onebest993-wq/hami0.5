/**
 * Demote same-file-only exports: strip leading `export` from declaration.
 * Only touches symbols listed in _tmp_lawsuit_demote40.json
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const list = JSON.parse(fs.readFileSync(path.join(ROOT, '.audit/_tmp_lawsuit_demote40.json'), 'utf8'));

const byFile = new Map();
for (const item of list) {
  if (!byFile.has(item.rel)) byFile.set(item.rel, []);
  byFile.get(item.rel).push(item.name);
}

let demoted = 0;
const report = [];

for (const [rel, names] of byFile) {
  const abs = path.join(ROOT, rel);
  let text = fs.readFileSync(abs, 'utf8');
  const original = text;
  for (const name of names) {
    // export type Name / export interface Name / export function Name / export async function / export const Name / export enum
    const patterns = [
      new RegExp(`^export\\s+(type\\s+${name}\\b)`, 'm'),
      new RegExp(`^export\\s+(interface\\s+${name}\\b)`, 'm'),
      new RegExp(`^export\\s+(enum\\s+${name}\\b)`, 'm'),
      new RegExp(`^export\\s+(async\\s+function\\s+${name}\\b)`, 'm'),
      new RegExp(`^export\\s+(function\\s+${name}\\b)`, 'm'),
      new RegExp(`^export\\s+(const\\s+${name}\\b)`, 'm'),
      new RegExp(`^export\\s+(let\\s+${name}\\b)`, 'm'),
      new RegExp(`^export\\s+(class\\s+${name}\\b)`, 'm'),
    ];
    let hit = false;
    for (const re of patterns) {
      if (re.test(text)) {
        text = text.replace(re, '$1');
        hit = true;
        demoted += 1;
        report.push(`${rel} :: ${name}`);
        break;
      }
    }
    if (!hit) {
      // export { Name } or export { Name as ... } — remove from named group carefully
      const namedRe = new RegExp(
        `export\\s+(?:type\\s+)?\\{([^}]*)\\}`,
        'g',
      );
      let changed = false;
      text = text.replace(namedRe, (full, inner) => {
        const parts = inner.split(',').map((p) => p.trim()).filter(Boolean);
        const next = parts.filter((p) => {
          const local = p.split(/\s+as\s+/)[0].trim();
          const exported = p.split(/\s+as\s+/).pop().trim();
          if (exported === name || local === name) {
            changed = true;
            return false;
          }
          return true;
        });
        if (!changed) return full;
        if (next.length === 0) return '/* demoted empty export removed */';
        const isType = /^export\s+type/.test(full);
        return `${isType ? 'export type' : 'export'} { ${next.join(', ')} }`;
      });
      if (changed) {
        demoted += 1;
        report.push(`${rel} :: ${name} (named)`);
      } else {
        report.push(`FAIL ${rel} :: ${name}`);
      }
    }
  }
  if (text !== original) {
    // clean empty demote markers
    text = text.replace(/\n?\s*\/\* demoted empty export removed \*\/\s*\n?/g, '\n');
    fs.writeFileSync(abs, text);
  }
}

fs.writeFileSync(
  path.join(ROOT, '.audit/_tmp_lawsuit_demote40_report.txt'),
  [`demoted=${demoted}`, ...report].join('\n'),
);
console.log(`demoted=${demoted}`);
console.log(report.filter((r) => r.startsWith('FAIL')).join('\n') || 'no failures');
