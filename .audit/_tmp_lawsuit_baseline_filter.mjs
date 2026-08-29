import fs from 'fs';

const SCOPE_PREFIXES = [
  'src/app/domain/lawsuit/',
  'src/app/components/lawyer/ArchivePortal',
  'src/app/components/lawyer/LawyerNewCase',
  'src/app/components/lawyer/smart-modal/',
  'src/app/components/lawyer/criminal-system/',
  'src/app/components/lawyer/personal-status/',
  'src/app/components/lawyer/caseShare/',
  'src/app/components/lawyer/NeuralAlertsCard/',
];
function inScope(p) {
  return SCOPE_PREFIXES.some((pre) => p === pre.replace(/\/$/, '') || p.startsWith(pre));
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

console.log('########## dead-exports-baseline.json (filtered) ##########');
const deadExports = loadJson('.audit/dead-exports-baseline.json');
let deCount = 0, deFiles = 0;
for (const [file, names] of Object.entries(deadExports.perModule || {})) {
  if (inScope(file)) {
    deFiles++;
    deCount += names.length;
    console.log(file, '->', names.join(', '));
  }
}
console.log(`\nTOTAL in-scope dead-export files: ${deFiles}, dead export names: ${deCount} (repo total: ${deadExports.deadTotal} across ${deadExports.moduleCount} modules)`);

console.log('\n########## dead-modules-baseline.json (filtered) ##########');
const deadModules = loadJson('.audit/dead-modules-baseline.json');
const dmScope = (deadModules.dead || []).filter(inScope);
console.log(`in-scope dead modules: ${dmScope.length} / repo total ${deadModules.count}`);
dmScope.forEach((f) => console.log(f));

console.log('\n########## import-cycles-baseline.json (filtered groups) ##########');
const cycles = loadJson('.audit/import-cycles-baseline.json');
let cycleGroupsInScope = 0;
(cycles.groups || []).forEach((group, i) => {
  const hit = group.filter(inScope);
  if (hit.length) {
    cycleGroupsInScope++;
    console.log(`group #${i} (size ${group.length}), in-scope members:`);
    group.forEach((f) => console.log('  ', inScope(f) ? '*' : ' ', f));
  }
});
console.log(`\nTOTAL cycle groups touching scope: ${cycleGroupsInScope} / repo total groups ${cycles.cycleGroups}`);

console.log('\n########## test-ratchet-baseline.json (filtered failures) ##########');
const testRatchet = loadJson('.audit/test-ratchet-baseline.json');
const failScope = (testRatchet.failures || []).filter((f) => inScope(f.split(' :: ')[0]));
console.log(`in-scope known failing tests: ${failScope.length} / repo total ${testRatchet.numFailedTests} (of ${testRatchet.numTotalTests} total tests)`);
failScope.forEach((f) => console.log(' -', f));

console.log('\n########## lint-baseline.json crashFiles (filtered) ##########');
const lintBaseline = loadJson('.audit/lint-baseline.json');
const crashScope = (lintBaseline.crashFiles || []).filter(inScope);
console.log('in-scope crash files:', crashScope);
console.log('repo-wide lint totals:', lintBaseline.totalErrors, lintBaseline.byRule);

console.log('\n########## ts-nocheck-baseline.json (filtered) ##########');
try {
  const tsNocheck = loadJson('.audit/ts-nocheck-baseline.json');
  const arr = Array.isArray(tsNocheck) ? tsNocheck : (tsNocheck.files || tsNocheck.list || []);
  const scopeArr = arr.filter((f) => inScope(typeof f === 'string' ? f : f.file));
  console.log('in-scope @ts-nocheck files:', scopeArr.length, '/ total', arr.length);
  scopeArr.forEach((f) => console.log(' -', typeof f === 'string' ? f : JSON.stringify(f)));
} catch (e) {
  console.log('no ts-nocheck-baseline.json or unexpected shape:', e.message);
}
