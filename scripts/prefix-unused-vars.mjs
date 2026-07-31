/**
 * Prefix unused identifiers reported by unused-imports/no-unused-vars with `_`.
 * Skips export-only lines. Safe for args / local bindings that eslint already flagged.
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const jsonPath = path.join(ROOT, '.cursor', 'wc-lint-preprefix.json');

const eslintBin = path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
const eslint = spawnSync(
  process.execPath,
  [eslintBin, '.', '--ext', 'ts,tsx', '-f', 'json', '-o', jsonPath],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);

if (!fs.existsSync(jsonPath)) {
  console.error('eslint json missing', eslint.stderr?.slice(-400));
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let changed = 0;
let skipped = 0;
const touched = new Set();

for (const file of data) {
  const msgs = (file.messages || []).filter((m) => m.ruleId === 'unused-imports/no-unused-vars');
  if (!msgs.length) continue;

  let src = fs.readFileSync(file.filePath, 'utf8');
  const nl = src.includes('\r\n') ? '\r\n' : '\n';
  const lines = src.split(/\r?\n/);
  const sorted = [...msgs].sort((a, b) => b.line - a.line || b.column - a.column);

  for (const m of sorted) {
    const nameMatch = String(m.message || '').match(/'([^']+)'/);
    if (!nameMatch) {
      skipped += 1;
      continue;
    }
    const name = nameMatch[1];
    if (!name || name.startsWith('_')) {
      skipped += 1;
      continue;
    }

    const lineIdx = m.line - 1;
    const line = lines[lineIdx];
    if (line == null) {
      skipped += 1;
      continue;
    }
    if (/\bexport\b/.test(line) && !/\bimport\b/.test(line)) {
      skipped += 1;
      continue;
    }

    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    const matches = line.match(new RegExp(re, 'g')) || [];
    if (matches.length !== 1) {
      // Prefer column-based insert when unique start matches name
      const col = Math.max(0, (m.column || 1) - 1);
      if (line.slice(col).startsWith(name)) {
        lines[lineIdx] = `${line.slice(0, col)}_${line.slice(col)}`;
        changed += 1;
        touched.add(file.filePath);
        continue;
      }
      skipped += 1;
      continue;
    }

    lines[lineIdx] = line.replace(re, `_${name}`);
    changed += 1;
    touched.add(file.filePath);
  }

  const next = lines.join(nl);
  if (next !== src) fs.writeFileSync(file.filePath, next);
}

console.log(
  JSON.stringify(
    {
      changed,
      skipped,
      files: touched.size,
    },
    null,
    2,
  ),
);
