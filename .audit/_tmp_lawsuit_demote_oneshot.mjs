/**
 * Demote same-file-only exports from _tmp_lawsuit_demote_oneshot.json
 * Strips leading `export` from declarations; cleans named export groups.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const list = JSON.parse(
  fs.readFileSync(path.join(ROOT, '.audit/_tmp_lawsuit_demote_oneshot.json'), 'utf8'),
);

const byFile = new Map();
for (const item of list) {
  if (!byFile.has(item.rel)) byFile.set(item.rel, []);
  byFile.get(item.rel).push(item.name);
}

let demoted = 0;
const report = [];
const fails = [];

for (const [rel, names] of byFile) {
  const abs = path.join(ROOT, rel);
  let text = fs.readFileSync(abs, 'utf8');
  const original = text;
  for (const name of names) {
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
      // export declare type / export declare const
      const declareRe = new RegExp(`^export\\s+(declare\\s+(?:type|const|function|class|enum|interface)\\s+${name}\\b)`, 'm');
      if (declareRe.test(text)) {
        text = text.replace(declareRe, '$1');
        demoted += 1;
        report.push(`${rel} :: ${name} (declare)`);
        hit = true;
      }
    }
    if (!hit) {
      let changed = false;
      const namedRe = /export\s+(type\s+)?\{([^}]*)\}/g;
      text = text.replace(namedRe, (full, typeKw, inner) => {
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
        return `${typeKw ? 'export type' : 'export'} { ${next.join(', ')} }`;
      });
      if (changed) {
        demoted += 1;
        report.push(`${rel} :: ${name} (named)`);
      } else {
        fails.push(`${rel} :: ${name}`);
      }
    }
  }
  if (text !== original) {
    text = text.replace(/\n?\s*\/\* demoted empty export removed \*\/\s*\n?/g, '\n');
    fs.writeFileSync(abs, text);
  }
}

fs.writeFileSync(
  path.join(ROOT, '.audit/_tmp_lawsuit_demote_oneshot_report.txt'),
  [`demoted=${demoted}`, `fails=${fails.length}`, 'FAILS:', ...fails, 'OK:', ...report].join('\n'),
);
console.log(`demoted=${demoted} fails=${fails.length}`);
if (fails.length) console.log(fails.slice(0, 40).join('\n'));
