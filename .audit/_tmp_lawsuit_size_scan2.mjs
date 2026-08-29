import { execSync } from 'child_process';
import fs from 'fs';
import { inLawsuitScope, SCOPE_PREFIXES } from './_tmp_lawsuit_scope.mjs';

const extraFiles = [
  'src/app/components/lawyer/ArchivePortal.tsx',
  'src/app/stores/caseStore.ts',
];

const gitArgs = SCOPE_PREFIXES.concat(extraFiles).map(d => `"${d}"`).join(' ');
const out = execSync(`git ls-files -- ${gitArgs}`, { encoding: 'utf8' });
const files = out.split('\n').map(s => s.trim()).filter(Boolean).filter(inLawsuitScope);

let total = 0, totalNonTest = 0, testFiles = 0, testLines = 0, cssFiles = 0, cssLines = 0;
const bySub = {};
const biggest = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n').length;
  total += lines;
  const isTest = /__tests__|\.test\.|\.spec\./.test(f);
  const isCss = f.endsWith('.css');
  if (isCss) { cssFiles++; cssLines += lines; }
  if (isTest) { testFiles++; testLines += lines; } else { totalNonTest += lines; }
  const top = SCOPE_PREFIXES.find(d => f.startsWith(d)) || 'other(root files)';
  bySub[top] = bySub[top] || { files: 0, lines: 0 };
  bySub[top].files++;
  bySub[top].lines += lines;
  if (!isTest && !isCss) biggest.push([f, lines]);
}

biggest.sort((a, b) => b[1] - a[1]);

console.log('=== TOTAL (refined: ArchivePortal execution-only files excluded) ===');
console.log('files:', files.length, 'lines(all):', total, 'lines(non-test):', totalNonTest);
console.log('test files:', testFiles, 'test lines:', testLines);
console.log('css files:', cssFiles, 'css lines:', cssLines);
console.log('\n=== BY SUBDIR ===');
for (const [k, v] of Object.entries(bySub)) {
  console.log(k.padEnd(55), 'files=' + v.files, 'lines=' + v.lines);
}
console.log('\n=== FILES >600 LINES (non-test, non-css) — "god file" candidates ===');
const over600 = biggest.filter(([, l]) => l > 600);
console.log('count:', over600.length);
for (const [f, l] of over600) {
  console.log(String(l).padStart(6), f);
}
console.log('\n=== AVERAGE FILE SIZE (non-test, non-css) ===');
const nonTestNonCss = biggest.length;
const sumNonTestNonCss = biggest.reduce((s, [, l]) => s + l, 0);
console.log('files:', nonTestNonCss, 'avg lines/file:', Math.round(sumNonTestNonCss / nonTestNonCss));
