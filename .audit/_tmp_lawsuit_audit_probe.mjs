import { execSync } from 'child_process';
import fs from 'fs';
import { inLawsuitScope, SCOPE_PREFIXES } from './_tmp_lawsuit_scope.mjs';

const extraFiles = [
  'src/app/components/lawyer/ArchivePortal.tsx',
  'src/app/stores/caseStore.ts',
];
const gitArgs = SCOPE_PREFIXES.concat(extraFiles).map((d) => `"${d}"`).join(' ');
const out = execSync(`git ls-files -- ${gitArgs}`, { encoding: 'utf8' });
const files = out.split('\n').map((s) => s.trim()).filter(Boolean).filter(inLawsuitScope);

const sizes = files.map((f) => {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split(/\r?\n/).length;
  return {
    f,
    lines,
    isTest: /__tests__|\.test\.|\.spec\./.test(f),
    text,
  };
});

const nontest = sizes.filter((x) => !x.isTest && !x.f.endsWith('.css')).sort((a, b) => b.lines - a.lines);
console.log('=== TOP20 (non-test) ===');
nontest.slice(0, 20).forEach((x, i) => console.log(String(i + 1).padStart(2), String(x.lines).padStart(5), x.f));

console.log('\n=== >700 non-test ===');
const mega = nontest.filter((x) => x.lines > 700);
console.log('count', mega.length);
mega.forEach((x) => console.log(String(x.lines).padStart(5), x.f));

console.log('\n=== HOOKS >=400 ===');
nontest
  .filter((x) => (/\/hooks?\//i.test(x.f) || /use[A-Z][A-Za-z0-9_]*\.(ts|tsx)$/.test(x.f)) && x.lines >= 400)
  .forEach((x) => console.log(String(x.lines).padStart(5), x.f));

// any / ts-nocheck / TODO
let anyHits = 0,
  nocheckHits = 0,
  todoHits = 0,
  fixmeHits = 0,
  largeCommentBlocks = 0;
const anyFiles = [];
const nocheckFiles = [];
const todoSamples = [];
for (const x of sizes) {
  if (x.isTest) continue;
  if (/@ts-nocheck|@ts-ignore|@ts-expect-error/.test(x.text)) {
    nocheckHits++;
    nocheckFiles.push(x.f);
  }
  const anyMatches = x.text.match(/:\s*any\b|as any\b|<any>|Promise<any>|Record<string,\s*any>/g) || [];
  if (anyMatches.length) {
    anyHits += anyMatches.length;
    anyFiles.push([x.f, anyMatches.length]);
  }
  const todos = x.text.match(/\bTODO\b|\bFIXME\b|\bHACK\b|\bXXX\b/g) || [];
  if (todos.length) {
    todoHits += (x.text.match(/\bTODO\b/g) || []).length;
    fixmeHits += (x.text.match(/\bFIXME\b/g) || []).length;
    for (const line of x.text.split(/\r?\n/)) {
      if (/\b(TODO|FIXME|HACK|XXX)\b/.test(line) && todoSamples.length < 25) {
        todoSamples.push(x.f + ': ' + line.trim().slice(0, 120));
      }
    }
  }
  // crude: blocks of 8+ consecutive comment-only lines
  const lines = x.text.split(/\r?\n/);
  let run = 0;
  for (const line of lines) {
    if (/^\s*(\/\/|\*|\/\*|\*\/)/.test(line) || /^\s*$/.test(line) === false && /^\s*\/\*/.test(line)) {
      if (/^\s*(\/\/|\/\*|\*|\*\/)/.test(line)) run++;
      else run = 0;
    } else run = 0;
    if (run === 8) {
      largeCommentBlocks++;
      break;
    }
  }
}
anyFiles.sort((a, b) => b[1] - a[1]);
console.log('\n=== TYPE SAFETY (nontest) ===');
console.log('files_with_ts_directives', nocheckHits);
nocheckFiles.slice(0, 30).forEach((f) => console.log(' ', f));
console.log('any_occurrence_count', anyHits, 'files', anyFiles.length);
anyFiles.slice(0, 15).forEach(([f, n]) => console.log(String(n).padStart(4), f));
console.log('TODO', todoHits, 'FIXME', fixmeHits, 'files_with_large_comment_run>=8', largeCommentBlocks);
console.log('\n=== TODO SAMPLES ===');
todoSamples.forEach((s) => console.log(s));

// Parallel naming patterns civil/criminal/personal-status
console.log('\n=== PARALLEL NAME STEM SAMPLES ===');
const stems = {};
for (const x of nontest) {
  const base = x.f.split('/').pop().replace(/\.(ts|tsx)$/, '');
  const norm = base
    .replace(/^(Civil|Criminal|PersonalStatus|Lawsuit|Execution)/, '')
    .replace(/(Civil|Criminal|PersonalStatus)$/, '');
  if (!norm || norm === base) continue;
  stems[norm] = stems[norm] || [];
  stems[norm].push(x.f);
}
Object.entries(stems)
  .filter(([, arr]) => arr.length >= 2)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 40)
  .forEach(([k, arr]) => console.log(k, arr.length, '->', arr.map((f) => f.split('/').slice(-2).join('/')).join(' | ')));
