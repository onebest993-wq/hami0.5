#!/usr/bin/env node
/** Mechanical pattern scan over every production file in execution-inventory.json */
import { readFileSync, writeFileSync } from 'node:fs';

const inv = JSON.parse(readFileSync('.audit/execution-inventory.json', 'utf8'));
const prod = inv.records.filter((r) => !r.isTest);

const patterns = {
  nocheck: /^\s*\/\/\s*@ts-nocheck/m,
  tsIgnore: /@ts-ignore|@ts-expect-error/,
  windowConfirm: /window\.confirm\s*\(/,
  asAny: /\bas any\b/,
  todo: /\bTODO\b|\bFIXME\b|\bHACK\b/,
  eslintDisable: /eslint-disable/,
  emptyCatch: /catch\s*\([^)]*\)\s*\{\s*\/\*[^*]*\*\/\s*\}|catch\s*\{\s*\}/,
};

const hits = {};
for (const key of Object.keys(patterns)) hits[key] = [];

const buttonNoClick = [];
const filesUnreadable = [];

for (const rec of prod) {
  let src;
  try {
    src = readFileSync(rec.path, 'utf8');
  } catch {
    filesUnreadable.push(rec.path);
    continue;
  }
  for (const [key, re] of Object.entries(patterns)) {
    if (re.test(src)) hits[key].push({ path: rec.path, lines: rec.lines, module: rec.module });
  }
  if (/\.tsx$/.test(rec.path)) {
    const buttons = src.match(/<button\b[^>]*>/g) || [];
    for (const b of buttons) {
      if (!/\bonClick\s*=/.test(b) && !/\bdisabled\b/.test(b) && !/\btype=["']submit["']/.test(b)) {
        buttonNoClick.push({ path: rec.path, snippet: b.slice(0, 160) });
      }
    }
  }
}

const summary = {};
for (const [k, v] of Object.entries(hits)) summary[k] = v.length;

writeFileSync(
  '.audit/execution-pattern-scan.json',
  JSON.stringify({ scanned: prod.length, unreadable: filesUnreadable, summary, hits, buttonNoClick }, null, 2),
  'utf8',
);

console.log('scanned', prod.length, 'unreadable', filesUnreadable.length);
console.log(summary);
console.log('buttonNoClick candidates', buttonNoClick.length);
for (const row of buttonNoClick.slice(0, 40)) {
  console.log(' -', row.path, row.snippet.replace(/\s+/g, ' '));
}
