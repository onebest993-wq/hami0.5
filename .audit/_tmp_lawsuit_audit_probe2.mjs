import fs from 'fs';
import { execSync } from 'child_process';

const e2e = [
  'e2e/civil-lawsuit-new-case.spec.ts',
  'e2e/civil-lawsuit-smoke.spec.ts',
  'e2e/civil-lawsuit-procedural.spec.ts',
  'e2e/lawsuit-flow.spec.ts',
  'e2e/civil-lawsuit-scenarios.spec.ts',
];
for (const f of e2e) {
  if (!fs.existsSync(f)) {
    console.log('missing', f);
    continue;
  }
  const t = fs.readFileSync(f, 'utf8');
  const its = (t.match(/\b(?:test|it)\(/g) || []).length;
  console.log(String(t.split(/\n/).length).padStart(5), 'tests', String(its).padStart(3), f);
}

const files = execSync('git ls-files -- "src/app/components/lawyer/criminal-system/criminalStore*"', {
  encoding: 'utf8',
}).trim().split(/\n/).filter(Boolean);
console.log('\ncriminalStore surface:');
for (const f of files) console.log(String(fs.readFileSync(f, 'utf8').split(/\n/).length).padStart(5), f);

const hooks = [
  'src/app/components/lawyer/ArchivePortal/hooks/useLawsuitArchivePortalController.ts',
  'src/app/components/lawyer/ArchivePortal/hooks/useLawsuitArchivePortalDossierState.ts',
  'src/app/components/lawyer/ArchivePortal/hooks/useLawsuitArchivePortalTrashState.ts',
  'src/app/components/lawyer/smart-modal/hooks/procedural/useProceduralIncidentalActions.ts',
  'src/app/components/lawyer/smart-modal/hooks/procedural/useProceduralTimelineActions.ts',
  'src/app/components/lawyer/criminal-system/useCriminalDashboardResolvedOrchestration.ts',
  'src/app/components/lawyer/criminal-system/useCriminalRequestCommitFlow.ts',
];
console.log('\nkey hooks:');
for (const f of hooks) console.log(String(fs.readFileSync(f, 'utf8').split(/\n/).length).padStart(5), f);

// duplicate-logic file locations
const dup = JSON.parse(fs.readFileSync('.audit/duplicate-logic-baseline.json', 'utf8'));
console.log('\nduplicate-logic count', dup.count, 'wastedBytes', dup.wastedBytes);
const live = fs.existsSync('.audit/_agent_dup_logic_live.txt')
  ? fs.readFileSync('.audit/_agent_dup_logic_live.txt', 'utf8').slice(0, 4000)
  : '';
if (live) console.log('\n--- live dup snippet ---\n', live);

// ts-nocheck baseline lawsuit
const tn = JSON.parse(fs.readFileSync('.audit/ts-nocheck-baseline.json', 'utf8'));
const list = tn.files || tn.paths || tn.entries || [];
console.log('\nts-nocheck shape keys', Object.keys(tn));
if (Array.isArray(list)) {
  const scoped = list.filter(
    (p) =>
      typeof p === 'string' &&
      (p.includes('criminal-system') ||
        p.includes('smart-modal') ||
        p.includes('personal-status') ||
        p.includes('ArchivePortal') ||
        p.includes('LawyerNewCase') ||
        p.includes('domain/lawsuit') ||
        p.includes('caseShare') ||
        p.includes('NeuralAlerts')),
  );
  console.log('ts-nocheck scoped', scoped);
}
