#!/usr/bin/env node
/**
 * Legal domain production gate
 *
 * Usage:
 *   npm run gate:legal
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

let failed = false;
const npmExecPath = process.env.npm_execpath;

function fail(message) {
    console.error(`✗ ${message}`);
    failed = true;
}

function ok(message) {
    console.log(`✓ ${message}`);
}

function requireFile(path) {
    if (existsSync(path)) ok(`file ${path}`);
    else fail(`missing ${path}`);
}

function bin(name) {
    return process.platform === 'win32' ? `${name}.cmd` : name;
}

function runVitest(testFiles) {
    if (npmExecPath) {
        return spawnSync(process.execPath, [npmExecPath, 'exec', '--', 'vitest', 'run', ...testFiles], {
            stdio: 'inherit',
        });
    }
    return spawnSync(bin('npx'), ['vitest', 'run', ...testFiles], { stdio: 'inherit' });
}

console.log('=== Legal validation gate ===\n');

[
    'docs/legal-validation-gate.md',
    'src/app/domain/lawsuit/__tests__/lawsuitJurisdiction.test.ts',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/__tests__/appealDeadlineEnforcement.test.ts',
    'src/app/components/lawyer/smart-modal/smartFile/__tests__/judgmentAppealRights.test.ts',
    'src/app/components/lawyer/smart-modal/smartFile/__tests__/crossAppealEngine.test.ts',
    'src/app/domain/execution/visitation/visitationScheduleEngine.test.ts',
    'src/app/utils/__tests__/alimonyCalculations.test.ts',
    'src/app/utils/__tests__/inheritanceCalculations.test.ts',
    'src/app/domain/execution/imprisonment/imprisonmentEngine.test.ts',
    'src/app/application/execution/followup/__tests__/buildDebtorSummonsProfileBundle.test.ts',
    'src/app/utils/__tests__/executionSummonsWorkflow.test.ts',
    'src/app/components/lawyer/criminal-system/cassationEngine.test.ts',
    'src/app/components/lawyer/criminal-system/decisionAppealPeriodEngine.test.ts',
    'src/app/components/lawyer/criminal-system/judicialDecisionsEngine.test.ts',
    'src/app/components/lawyer/criminal-system/trialSessionsEngine.test.ts',
    'src/app/components/lawyer/criminal-system/verdictCassationResultEngine.test.ts',
    'src/app/components/lawyer/criminal-system/stageJourney.test.ts',
].forEach(requireFile);

console.log('\n=== Running legal-critical test suite ===');
const result = runVitest([
    'src/app/domain/lawsuit/__tests__/lawsuitJurisdiction.test.ts',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/__tests__/appealDeadlineEnforcement.test.ts',
    'src/app/components/lawyer/smart-modal/smartFile/__tests__/judgmentAppealRights.test.ts',
    'src/app/components/lawyer/smart-modal/smartFile/__tests__/crossAppealEngine.test.ts',
    'src/app/domain/execution/visitation/visitationScheduleEngine.test.ts',
    'src/app/utils/__tests__/alimonyCalculations.test.ts',
    'src/app/utils/__tests__/inheritanceCalculations.test.ts',
    'src/app/domain/execution/imprisonment/imprisonmentEngine.test.ts',
    'src/app/application/execution/followup/__tests__/buildDebtorSummonsProfileBundle.test.ts',
    'src/app/utils/__tests__/executionSummonsWorkflow.test.ts',
    'src/app/components/lawyer/criminal-system/cassationEngine.test.ts',
    'src/app/components/lawyer/criminal-system/decisionAppealPeriodEngine.test.ts',
    'src/app/components/lawyer/criminal-system/judicialDecisionsEngine.test.ts',
    'src/app/components/lawyer/criminal-system/trialSessionsEngine.test.ts',
    'src/app/components/lawyer/criminal-system/verdictCassationResultEngine.test.ts',
    'src/app/components/lawyer/criminal-system/stageJourney.test.ts',
]);

if (result.status !== 0) {
    fail('legal-critical tests failed');
    process.exit(1);
}
ok('legal-critical tests passed');

console.log('\n=== Gate result ===');
if (failed) {
    console.error('FAILED');
    process.exit(1);
}

console.log('PASSED');
