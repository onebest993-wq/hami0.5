import { execSync } from 'child_process';
import fs from 'fs';

const dirs = [
  'src/app/domain/lawsuit',
  'src/app/components/lawyer/ArchivePortal',
  'src/app/components/lawyer/LawyerNewCase',
  'src/app/components/lawyer/smart-modal',
  'src/app/components/lawyer/criminal-system',
  'src/app/components/lawyer/personal-status',
  'src/app/components/lawyer/caseShare',
  'src/app/components/lawyer/NeuralAlertsCard',
];
const extraFiles = [
  'src/app/components/lawyer/ArchivePortal.tsx',
  'src/app/stores/caseStore.ts',
];

const gitArgs = dirs.concat(extraFiles).map(d => `"${d}"`).join(' ');
const out = execSync(`git ls-files -- ${gitArgs}`, { encoding: 'utf8' });
const files = out.split('\n').map(s => s.trim()).filter(Boolean);

let total = 0, totalNonTest = 0, testFiles = 0, testLines = 0, cssFiles = 0, cssLines = 0;
const bySub = {};
const biggest = [];

for (const f of files) {
  let content;
  try {
    content = fs.readFileSync(f, 'utf8');
  } catch (e) {
    console.error('MISSING', f);
    continue;
  }
  const lines = content.split('\n').length;
  total += lines;
  const isTest = /__tests__|\.test\.|\.spec\./.test(f);
  const isCss = f.endsWith('.css');
  if (isCss) { cssFiles++; cssLines += lines; }
  if (isTest) { testFiles++; testLines += lines; } else { totalNonTest += lines; }
  const top = dirs.find(d => f.startsWith(d + '/') || f === d) || 'other(root files)';
  bySub[top] = bySub[top] || { files: 0, lines: 0 };
  bySub[top].files++;
  bySub[top].lines += lines;
  if (!isTest && !isCss) biggest.push([f, lines]);
}

biggest.sort((a, b) => b[1] - a[1]);

console.log('=== TOTAL ===');
console.log('files:', files.length, 'lines(all):', total, 'lines(non-test):', totalNonTest);
console.log('test files:', testFiles, 'test lines:', testLines);
console.log('css files:', cssFiles, 'css lines:', cssLines);
console.log('\n=== BY SUBDIR ===');
for (const [k, v] of Object.entries(bySub)) {
  console.log(k.padEnd(55), 'files=' + v.files, 'lines=' + v.lines);
}
console.log('\n=== TOP 40 BIGGEST NON-TEST NON-CSS FILES ===');
for (const [f, l] of biggest.slice(0, 40)) {
  console.log(String(l).padStart(6), f);
}
