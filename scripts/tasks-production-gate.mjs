#!/usr/bin/env node
/**
 * Royal Tasks Tier-1 Production Gate — 4P-STRICT Pattern
 *
 * Phase0: Anti-Shadow BOMB (4 unique non-existent paths + legacy 4)
 * Phase1: Glob Discovery (no hardcoded existsSync)
 * Phase2: Windows CMD 32KB Safe Dual Run + byte-slicer
 * Phase3: Strict Banner Order Exit
 *
 * Usage:
 *   npm run gate:tasks
 *   node scripts/tasks-production-gate.mjs
 */

import { spawnSync } from 'node:child_process';
import { globSync } from 'glob';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const EXACT_BANNER = '===== ROYAL TASKS TIER-1 PRODUCTION GATE PASSED =====';
const EXACT_LAST_STDOUT_LINE = '=== Gate result === PASSED';

const TASKS_SHADOW_STUB_GLOB_PATHS = [
    'src/app/components/Lawyer/dashboard/tasksManager/TasksShieldNucleusSheet.tsx',
    'src/app/SERVICES/fieldTasks/tasksShieldOwnershipGate.ts',
    'src/app/HOOKS/lawyerDashboard/fieldTasks/tasksShieldShellShadowOpenFlow.ts',
    'src/app/RUNTIME/storage/encryptedStorage/lawyerTasksShieldBootHydrator.ts',
];

const LEGACY_TASKS_SHADOW_STUBS = [
    'src/app/components/lawyer/dashboard/tasksManager/TasksManager.tsx',
    'src/app/components/lawyer/dashboard/tasksManager/FieldTasksManager.tsx',
    'src/app/components/lawyer/dashboard/fieldTasks/FieldTasks.tsx',
    'src/app/components/lawyer/dashboard/fieldTasks/TasksManager.tsx',
];

const CANONICAL_SPAWN_OPTS = {
    shell: true,
    maxBuffer: 500 * 1024 * 1024,
    timeout: 600_000,
    windowsHide: true,
};

const MAX_TEST_BYTES = 10 * 1024;

const EXCLUDE_PREFIXES = [];

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

function banner(title) {
    console.log(`\n===== ${title} =====`);
}

console.log('===== ROYAL TASKS TIER-1 PRODUCTION GATE =====\n');

// ============================================================
// PHASE 0: Anti-Shadow BOMB — FAIL FAST IF ANY HIT
// ============================================================
banner('PHASE 0: Anti-Shadow BOMB (TASKS_SHADOW_STUB + LEGACY)');
for (const p of TASKS_SHADOW_STUB_GLOB_PATHS) {
    const hits = globSync(p, { caseSensitive: false, nodir: true, cwd: PROJECT_ROOT });
    if (hits.length > 0) {
        fail(`BOMB PHASE0 TASKS_SHADOW_STUB DETECTED: ${p} → hits: ${hits.join(', ')}`);
        console.error('\n===== GATE TERMINATED PHASE0 SHADOW DETECTED =====');
        process.exit(1);
    }
    ok(`phase0 clean (4P): ${p}`);
}
for (const p of LEGACY_TASKS_SHADOW_STUBS) {
    const hits = globSync(p, { caseSensitive: false, nodir: true, cwd: PROJECT_ROOT });
    if (hits.length > 0) {
        fail(`BOMB PHASE0 LEGACY TASKS SHADOW DETECTED: ${p} → hits: ${hits.join(', ')} — rename or move (risk: module shadowing security hole)`);
        console.error('\n===== GATE TERMINATED PHASE0 LEGACY SHADOW DETECTED =====');
        process.exit(1);
    }
    ok(`phase0 clean (legacy): ${p}`);
}
ok('Phase0 passed — 0 shadow stubs detected');

// ============================================================
// PHASE 1: Glob Discovery — Critical Paths
// ============================================================
banner('PHASE 1: Critical Paths Discovery (globSync)');

const criticalGlobs = [
    'src/app/hooks/lawyerDashboard/**/*fieldTasks*.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/**/*FieldTasks*.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/fieldTasks/**/*.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/**/*useLawyerDashboardFieldTasks*.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/**/*useLawyerDashboardTasksOverlayEscape*.{ts,tsx}',
    'src/app/hooks/**/*useQuantumTasks*.{ts,tsx}',
    'src/app/hooks/**/*useFatalTaskComplete*.{ts,tsx}',
    'src/app/services/fieldTasks/**/*.{ts,tsx}',
    'src/app/services/tasks/**/*.{ts,tsx}',
    'src/app/services/**/*fieldTaskAlerts*.{ts,tsx}',
    'src/app/utils/**/*quantumTasks*.{ts,tsx}',
    'src/app/utils/**/*quantumTask*.{ts,tsx}',
    'src/app/context/**/*QuantumTasksProvider*.{ts,tsx}',
    'src/app/runtime/*fieldTasks*.{ts,tsx}',
    'src/app/runtime/**/*fieldTasks*.{ts,tsx}',
    'src/app/runtime/__tests__/*fieldTasks*.{ts,tsx}',
    'src/app/runtime/__tests__/*worldclassFieldTasks*.{ts,tsx}',
    'src/app/components/lawyer/dashboard/**/*FieldTasks*.{ts,tsx}',
    'src/app/components/lawyer/dashboard/**/*fieldTasks*.{ts,tsx}',
    'src/app/components/lawyer/dashboard/**/*TasksManager*.{ts,tsx}',
    'src/app/components/lawyer/dashboard/**/*TaskCard*.{ts,tsx}',
    'src/app/components/lawyer/dashboard/tasksManager/**/*.{ts,tsx}',
    'src/app/components/lawyer/dashboard/fieldTasks/**/*.{ts,tsx}',
    'src/app/components/lawyer/dashboard/__tests__/**/*tasks*.test.{ts,tsx}',
    'src/app/components/lawyer/dashboard/__tests__/**/*Tasks*.test.{ts,tsx}',
    'src/app/components/lawyer/dashboard/__tests__/**/*CommandCenter*.test.{ts,tsx}',
];

const rawCritical = [];
for (const g of criticalGlobs) {
    const matches = globSync(g, { caseSensitive: false, nodir: true, cwd: PROJECT_ROOT });
    for (const m of matches) {
        const normalized = m.replaceAll('\\', '/');
        if (!rawCritical.some(x => x.replaceAll('\\', '/') === normalized)) {
            rawCritical.push(normalized);
        }
    }
}

const criticalCount = rawCritical.length;
console.log(`Discovered ${criticalCount} critical paths via globSync`);

if (criticalCount < 56) {
    fail(`critical paths below threshold ${criticalCount} < 56`);
} else {
    ok(`critical paths ≥56 threshold: ${criticalCount}`);
}

const sampleCount = Math.min(20, rawCritical.length);
const shuffled = [...rawCritical].sort(() => Math.random() - 0.5);
console.log(`Sample paths (${sampleCount} of ${criticalCount}):`);
for (let i = 0; i < sampleCount; i++) {
    console.log(`  • ${shuffled[i]}`);
}

for (const p of rawCritical) {
    ok(p);
}

// ============================================================
// PHASE 2: Windows CMD Safe Dual Run + byte-slicer
// ============================================================
banner('PHASE 2: Vitest Dual Run (Verbose + JSON)');

const testGlobs = [
    'src/app/hooks/lawyerDashboard/__tests__/*fieldTasks*.test.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/__tests__/*FieldTasks*.test.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/__tests__/*tasksOverlayEscape*.test.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/fieldTasks/__tests__/**/*.test.{ts,tsx}',
    'src/app/hooks/__tests__/*useQuantumTasks*.test.{ts,tsx}',
    'src/app/hooks/__tests__/*useFatalTaskComplete*.test.{ts,tsx}',
    'src/app/utils/__tests__/*quantumTasks*.test.{ts,tsx}',
    'src/app/utils/__tests__/*quantumTask*.test.{ts,tsx}',
    'src/app/services/tasks/__tests__/**/*.test.{ts,tsx}',
    'src/app/services/__tests__/*fieldTask*.test.{ts,tsx}',
    'src/app/services/__tests__/*fieldTasks*.test.{ts,tsx}',
    'src/app/services/fieldTasks/__tests__/**/*.test.{ts,tsx}',
    'src/app/runtime/__tests__/*fieldTasks*.test.{ts,tsx}',
    'src/app/runtime/__tests__/*worldclassFieldTasks*.test.{ts,tsx}',
    'src/app/components/lawyer/dashboard/__tests__/**/*tasks*.test.{ts,tsx}',
    'src/app/components/lawyer/dashboard/__tests__/**/*Tasks*.test.{ts,tsx}',
    'src/app/components/lawyer/dashboard/__tests__/**/*CommandCenter*.test.{ts,tsx}',
    'src/app/components/lawyer/dashboard/tasksManager/__tests__/**/*.test.{ts,tsx}',
    'src/app/components/lawyer/dashboard/fieldTasks/__tests__/**/*.test.{ts,tsx}',
];

const rawTestFiles = [];
for (const g of testGlobs) {
    const matches = globSync(g, { caseSensitive: false, nodir: true, cwd: PROJECT_ROOT });
    for (const m of matches) {
        const normalized = m.replaceAll('\\', '/');
        if (!rawTestFiles.some(x => x.replaceAll('\\', '/') === normalized)) {
            rawTestFiles.push(normalized);
        }
    }
}

const testFilesAll = rawTestFiles.filter(f => !EXCLUDE_PREFIXES.some(x => f.startsWith(x)));
const excludedCount = rawTestFiles.length - testFilesAll.length;
if (excludedCount > 0) {
    console.log(`ℹ Excluded ${excludedCount} pre-existing failing test files via EXCLUDE_PREFIXES`);
}
console.log(`Phase2: test glob discovery → ${rawTestFiles.length} total, ${testFilesAll.length} after exclusions`);

const testFileBytes = JSON.stringify(testFilesAll).length;
console.log(`Phase2: test file list JSON bytes = ${testFileBytes} (safe max=${MAX_TEST_BYTES})`);

let testFiles = [...testFilesAll];
if (testFileBytes > MAX_TEST_BYTES) {
    let cap = 80;
    let sliced = testFilesAll.slice(0, cap);
    let slicedBytes = JSON.stringify(sliced).length;
    while (slicedBytes > MAX_TEST_BYTES && cap >= 45) {
        cap -= 5;
        sliced = testFilesAll.slice(0, cap);
        slicedBytes = JSON.stringify(sliced).length;
    }
    if (slicedBytes > MAX_TEST_BYTES) {
        cap = 60;
        sliced = testFilesAll.slice(0, cap);
        slicedBytes = JSON.stringify(sliced).length;
    }
    console.log(`Phase2: byte-slicer applied — cap=${cap} files, bytes=${slicedBytes} (threshold=${MAX_TEST_BYTES})`);
    testFiles = sliced;
}

if (testFiles.length < 40) {
    fail(`test files below threshold ${testFiles.length} < 40 (after exclusions/slicing)`);
} else {
    ok(`test files ≥40 threshold: ${testFiles.length}`);
}

// ---- Run A: Verbose reporter ----
banner('Run A: Verbose reporter');
const argsA = [
    'vitest', 'run',
    '--reporter=verbose',
    ...testFiles,
];

const resultA = spawnSync('npx', argsA, {
    ...CANONICAL_SPAWN_OPTS,
    cwd: PROJECT_ROOT,
    stdio: ['inherit', 'pipe', 'pipe'],
    encoding: 'utf-8',
});

const stdoutA = resultA.stdout || '';
const stderrA = resultA.stderr || '';
const combinedA = stdoutA + '\n' + stderrA;

if (stdoutA) process.stdout.write(stdoutA);
if (stderrA) process.stderr.write(stderrA);

let passLinesA = 0;
const passLineMatch = combinedA.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
if (passLineMatch) {
    passLinesA = parseInt(passLineMatch[1], 10);
} else {
    const everyTest = [...combinedA.matchAll(/(\d+)\s+passed/g)];
    if (everyTest.length) {
        passLinesA = everyTest.reduce((s, m) => s + parseInt(m[1], 10), 0);
    } else {
        const individualPass = combinedA.match(/^.{0,6}(✓|PASS)\b/mg);
        passLinesA = individualPass ? individualPass.length : 0;
    }
}

console.log(`\nRun A summary: status=${resultA.status}, signaled=${resultA.signal}, tests-passed=${passLinesA}`);

if (resultA.status !== 0) {
    fail(`Run A verbose reporter exited with code ${resultA.status}`);
}

if (passLinesA < 237) {
    fail(`Run A verbose passes below threshold ${passLinesA} < 237`);
} else {
    ok(`Run A verbose passes ≥237 threshold: ${passLinesA}`);
}

// ---- Run B: JSON reporter ----
banner('Run B: JSON reporter');
const argsB = [
    'vitest', 'run',
    '--reporter=json',
    ...testFiles,
];

const resultB = spawnSync('npx', argsB, {
    ...CANONICAL_SPAWN_OPTS,
    cwd: PROJECT_ROOT,
    stdio: ['inherit', 'pipe', 'pipe'],
    encoding: 'utf-8',
});

const stdoutB = resultB.stdout || '';
const stderrB = resultB.stderr || '';
const combinedB = stdoutB + '\n' + stderrB;

console.log(`Run B: status=${resultB.status}, signaled=${resultB.signal}, stdout.length=${stdoutB.length}, stderr.length=${stderrB.length}`);

let jsonData = null;

// Strategy 1: reverse line scan
const allLinesB = combinedB.split(/\r?\n/);
for (let i = allLinesB.length - 1; i >= 0 && !jsonData; i--) {
    const line = allLinesB[i].trim();
    if (!line) continue;
    if (line.startsWith('{')) {
        try {
            jsonData = JSON.parse(line);
        } catch {
            // continue scanning backward
        }
    }
}

// Strategy 2: lastIndexOf fallback
if (!jsonData) {
    const lastOpen = combinedB.lastIndexOf('{');
    const lastClose = combinedB.lastIndexOf('}');
    if (lastOpen >= 0 && lastClose > lastOpen) {
        const tail = combinedB.substring(lastOpen, lastClose + 1);
        try {
            jsonData = JSON.parse(tail);
        } catch (e) {
            console.warn(`Run B JSON parse fallback failed: ${e.message}`);
        }
    }
}

if (!jsonData) {
    fail('Run B JSON reporter — could not parse any JSON object from output');
} else {
    const testResultsB = jsonData.testResults || [];
    const totalTestsB = jsonData.numTotalTests ?? (testResultsB.length ? testResultsB.reduce((s, r) => s + (r.assertionResults?.length || 0), 0) : 0);
    const passedTestsB = jsonData.numPassedTests ?? totalTestsB - (jsonData.numFailedTests ?? 0);
    const failedTestsB = jsonData.numFailedTests ?? (testResultsB.length ? testResultsB.filter(r => r.status === 'failed').length + testResultsB.reduce((s, r) => s + (r.assertionResults?.filter(a => a.status === 'failed').length || 0), 0) : 0);
    const pendingTestsB = jsonData.numPendingTests ?? 0;

    const testFilesB = testResultsB.filter(r => r && r.assertionResults && r.assertionResults.length > 0).length;

    let allPassed = true;
    for (const tr of testResultsB) {
        if (tr.status && tr.status !== 'passed') { allPassed = false; break; }
        for (const at of tr.assertionResults ?? []) {
            if (at.status !== 'passed') { allPassed = false; break; }
        }
        if (!allPassed) break;
    }

    let ratioB = 0;
    if (totalTestsB > 0) {
        ratioB = passedTestsB / totalTestsB;
    }

    console.log(`Run B JSON: testFiles=${testFilesB}, totalTests=${totalTestsB}, failedTests=${failedTestsB}, pending=${pendingTestsB}, allPassed=${allPassed}, success=${jsonData.success}, ratio=${(ratioB * 100).toFixed(2)}%`);

    if (testFilesB < 40) {
        fail(`Run B JSON testFiles below threshold ${testFilesB} < 40`);
    } else {
        ok(`Run B JSON testFiles ≥40 threshold: ${testFilesB}`);
    }

    if (totalTestsB < 237) {
        fail(`Run B JSON totalTests below threshold ${totalTestsB} < 237`);
    } else {
        ok(`Run B JSON totalTests ≥237 threshold: ${totalTestsB}`);
    }

    if (failedTestsB !== 0) {
        fail(`Run B JSON failedTests not zero: ${failedTestsB}`);
    } else {
        ok('Run B JSON failedTests === 0');
    }

    if (testResultsB.length > 0 && !allPassed) {
        fail('Run B JSON — some testResult entries have status !== "passed"');
    } else {
        ok('Run B JSON — all testResult entries status="passed"');
    }

    if (ratioB < 0.99) {
        fail(`Run B JSON success ratio below 0.99: ${ratioB.toFixed(4)}`);
    } else {
        ok(`Run B JSON success ratio ≥0.99: ${ratioB.toFixed(4)}`);
    }
}

if (resultB.status !== 0) {
    fail(`Run B JSON reporter exited with code ${resultB.status}`);
}

ok('Phase2 dual-run completed');

// ============================================================
// PHASE 3: Strict Banner Order Exit
// ============================================================
if (failed) {
    console.error('\n===== ROYAL TASKS TIER-1 PRODUCTION GATE FAILED =====');
    console.log('\n=== Gate result ===');
    console.error('FAILED');
    process.exit(1);
}

banner('PHASE 3: Strict Banner Order Exit');

// STRICT ORDER — NO CODE BETWEEN THESE 3 LINES
process.stderr.write(EXACT_BANNER + '\n');
console.log(EXACT_LAST_STDOUT_LINE);
process.exit(0);
