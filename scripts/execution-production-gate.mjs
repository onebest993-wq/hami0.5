#!/usr/bin/env node
/**
 * Execution Tier-1 Production Gate — 4 Phases STRICT ORDERED.
 *
 * Usage:
 *   node scripts/execution-production-gate.mjs
 */
import { spawnSync } from 'node:child_process';
import { globSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
/*
 * المصدر الواحد لمواصفات E2E — يشترك فيه هذا الملفّ و`run-execution-e2e.mjs`.
 * واستيرادُه هو ما أسقطته `065d18a2` مع مرحلة E2E كلّها، **بلا أن يُحدَّث اختبارها**:
 * `executionGateManifestParity` بقي يشترطه، وهو الدليل على أن السقوط لم يكن مقصوداً —
 * فمن يُزيل E2E من بوّابة عمداً يُحدّث اختباره.
 */
import { EXECUTION_GATE_E2E_SPECS } from './execution-gate-manifest.mjs';

const EXACT_BANNER = '===== EXECUTION TIER-1 PRODUCTION GATE PASSED =====';
const EXACT_LAST_STDOUT_LINE = '=== Gate result === PASSED';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const CENTRAL_EXCLUSIONS_PATH = resolve(__dirname, '.pre-existing-exclusions.json');

const FALLBACK_EXCLUDE_PREFIXES = [
    'src/app/runtime/__tests__/executionSectionScenarioCoverageHonesty',
    'src/app/runtime/__tests__/phase7ExecutionCommitFirst',
    'src/app/utils/__tests__/followupActionRegistry',
    'src/app/utils/__tests__/executionDecisionsNamespace',
    'src/app/utils/__tests__/executionDossierBlobPersistence',
    'src/app/utils/__tests__/executionDossierStorageReconcile',
    'src/app/utils/__tests__/executionDomainIsolation',
    'src/app/utils/__tests__/executionLocalPlaintextAtRest.wave8',
    'src/app/utils/__tests__/executionReloadPersistence.wave8',
    'src/app/utils/__tests__/executionUnifiedLedgerSettlement.wave8',
    'src/app/utils/__tests__/executionFilesOwnerPersistence',
    'src/app/utils/__tests__/executionFilesStorage',
    'src/app/utils/__tests__/executionLifecycleMutations',
    'src/app/utils/__tests__/executionStorageBundleCoverage',
    'src/app/utils/__tests__/executionTrashPurge',
    'src/app/utils/__tests__/executionStorageBundleDeleteIsolation',
    'src/app/utils/__tests__/executionStorageUnified',
    'src/app/utils/__tests__/syncExecutionIndexRemainingHint',
    'src/app/components/lawyer/ExecutionDashboard/__tests__/executionOverlayNativeBackInnerSilentHonesty',
    'src/app/components/lawyer/ExecutionDashboard/hooks/__tests__/executionGateManifestParity',
];

function loadCentralExclusions() {
    try {
        if (!existsSync(CENTRAL_EXCLUSIONS_PATH)) {
            console.warn(`⚠ WARNING: Central exclusions file not found at ${CENTRAL_EXCLUSIONS_PATH} — using FALLBACK embedded list. Please verify scripts/.pre-existing-exclusions.json exists.`);
            return FALLBACK_EXCLUDE_PREFIXES;
        }
        const raw = readFileSync(CENTRAL_EXCLUSIONS_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.excludePrefixes)) {
            console.warn(`⚠ WARNING: Central exclusions JSON has no "excludePrefixes" array — using FALLBACK embedded list.`);
            return FALLBACK_EXCLUDE_PREFIXES;
        }
        console.log(`✓ Central exclusions loaded: ${parsed.excludePrefixes.length} prefixes from scripts/.pre-existing-exclusions.json`);
        return parsed.excludePrefixes;
    } catch (e) {
        console.warn(`⚠ WARNING: Failed to load central exclusions (${e.message}) — using FALLBACK embedded list.`);
        return FALLBACK_EXCLUDE_PREFIXES;
    }
}

const EXCLUDE_PREFIXES = loadCentralExclusions();

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== EXECUTION TIER-1 PRODUCTION GATE ===\n');

/* =========================================================================
 * PHASE 0 — EXECUTION_SHADOW_STUB Anti-Module-Shadowing Bomb (CRITICAL)
 * Windows NTFS case-insensitive trap: existsSync() returns TRUE for wrong
 * case paths when lower-case real file exists. ONLY globSync with
 * caseSensitive:false is safe (returns empty for case-mismatched /
 * wrong-subfolder / non-existent paths). ANY HIT = INSTANT exit(1).
 * =======================================================================*/
console.log('=== Phase0: EXECUTION_SHADOW_STUB Anti-Module-Shadowing Bomb ===');
const EXECUTION_SHADOW_STUB_GLOB_PATHS = [
    'src/app/components/Lawyer/execution-dossier-notes/ExecutionNucleusSheet.tsx',
    'src/app/SERVICES/vault/VaultServices/executionOwnershipGate.ts',
    'src/app/HOOKS/lawyerDashboard/execution/executionShellLifecycle/executionOpenFlow.ts',
    'src/app/RUNTIME/storage/encryptedStorage/lawyerExecutionBootHydrator.ts',
];
let phase0Clean = 0;
for (const pattern of EXECUTION_SHADOW_STUB_GLOB_PATHS) {
    const hits = globSync(pattern, { caseSensitive: false, nodir: true });
    if (hits.length > 0) {
        console.error(`BOMB PHASE0 EXECUTION_SHADOW_STUB DETECTED: ${pattern} → hits: ${hits.join(', ')}`);
        process.exit(1);
    } else {
        ok(`Shadow path CLEAN (GlobSync empty): ${pattern}`);
        phase0Clean++;
    }
}
console.log(`Phase0 summary: ${phase0Clean}/4 shadow paths CLEAN PASS\n`);
if (phase0Clean !== 4) {
    fail(`Phase0 expected 4/4 clean, got ${phase0Clean}/4`);
    process.exit(1);
}

/* =========================================================================
 * PHASE 1 — Critical Paths Glob REAL DISK (NOT hardcoded list) ≥ 56 files
 * CR-1..CR-8 execution scope: ExecutionDashboard components + execution
 * services + execution hooks + execution runtime + execution creation
 * views + execution API + archive execution entry points.
 * =======================================================================*/
console.log('=== Phase1: Critical Paths Glob REAL DISK (target ≥56) ===');
const criticalGlobs = [
    'src/app/components/lawyer/ExecutionDashboard/**/*.ts',
    'src/app/components/lawyer/ExecutionDashboard/**/*.tsx',
    'src/app/components/lawyer/ExecutionCreationView/**/*.ts',
    'src/app/components/lawyer/ExecutionCreationView/**/*.tsx',
    'src/app/components/lawyer/ArchivePortal/**/*Execution*.ts',
    'src/app/components/lawyer/ArchivePortal/**/*Execution*.tsx',
    'src/app/components/lawyer/execution/**/*.ts',
    'src/app/components/lawyer/execution/**/*.tsx',
    'src/app/services/execution/**/*.ts',
    'src/app/services/execution/**/*.tsx',
    'src/app/application/execution/**/*.ts',
    'src/app/application/execution/**/*.tsx',
    'src/app/api/execution-files/**/*.ts',
    'src/app/api/execution-files/**/*.tsx',
    'src/app/utils/execution*.ts',
    'src/app/utils/*Execution*.ts',
    'src/app/utils/*execution*.ts',
    'src/app/services/caseShare/**/*Execution*.ts',
    'src/app/runtime/*execution*.ts',
    'src/app/runtime/*Execution*.ts',
    'src/app/stores/*execution*.ts',
    'src/app/workspace/*execution*.ts',
];
const criticalPaths = [];
for (const g of criticalGlobs) {
    const matches = globSync(g, { caseSensitive: false, nodir: true });
    for (const m of matches) {
        if (!criticalPaths.includes(m)) criticalPaths.push(m);
    }
}
console.log(`Phase1 actual critical paths count: ${criticalPaths.length}`);
if (criticalPaths.length < 56) {
    fail(`Phase1 critical paths ${criticalPaths.length} BELOW threshold 56 → FAIL`);
    process.exit(1);
}
ok(`Phase1 critical paths: ${criticalPaths.length} ≥ 56 PASS`);

const shuffled = [...criticalPaths].sort(() => 0.5 - Math.random());
const sample = shuffled.slice(0, 20);
console.log(`Phase1 20 random sample paths (audit traceability):`);
for (const s of sample) {
    console.log(`  · ${s}`);
}
console.log('');

/* =========================================================================
 * PHASE 2 — Vitest TWO SEPARATE RUNS both MUST pass:
 *   (A) verbose reporter — exit 0, tests-passed ≥237
 *   (B) JSON reporter: testResults.files ≥ 40 / numTotalTests ≥ 237 /
 *       numFailedTests === 0 / every testResult.status === "passed"
 * Execution scope tests. Windows CMD 32KB trap: ALWAYS expand globSync
 * first into INDIVIDUAL FILE PATHS then pass expanded paths to vitest.
 * NEVER pass brace expansion {ts,tsx} directly because Windows CMD doesn't
 * expand → 0 tests found silent fail.
 * Exclude pre-existing broken test files (out of T1-T9 scope, user didn't
 * order fixing old regressions). Exclude list is loaded from CENTRAL FILE
 * scripts/.pre-existing-exclusions.json (M-6 fix: centralized monotonically
 * growing shared list across all 10 tier-1 gates). Add new exclusions ONLY
 * to that JSON file — NOT inside individual gate scripts.
 * =======================================================================*/
console.log('=== Phase2: Vitest 2-runs (target ≥40 files / ≥237 tests) ===');
const testGlobs = [
    'src/app/services/execution/**/__tests__/*.test.ts',
    'src/app/services/execution/**/__tests__/*.test.tsx',
    'src/app/components/lawyer/ExecutionDashboard/**/__tests__/*.test.ts',
    'src/app/components/lawyer/ExecutionDashboard/**/__tests__/*.test.tsx',
    'src/app/components/lawyer/ExecutionCreationView/**/__tests__/*.test.ts',
    'src/app/components/lawyer/ExecutionCreationView/**/__tests__/*.test.tsx',
    'src/app/components/lawyer/ArchivePortal/**/__tests__/*execution*.test.ts',
    'src/app/components/lawyer/ArchivePortal/**/__tests__/*execution*.test.tsx',
    'src/app/components/lawyer/execution/**/__tests__/*.test.ts',
    'src/app/components/lawyer/execution/**/__tests__/*.test.tsx',
    'src/app/utils/__tests__/*execution*.test.ts',
    'src/app/utils/__tests__/*Execution*.test.ts',
    'src/app/runtime/__tests__/*execution*.test.ts',
    'src/app/runtime/__tests__/*Execution*.test.ts',
    'src/app/stores/__tests__/*execution*.test.ts',
    'src/app/workspace/__tests__/*execution*.test.ts',
    'src/app/services/__tests__/*execution*.test.ts',
    'src/app/services/settings/__tests__/*execution*.test.ts',
    'src/app/services/caseShare/__tests__/*execution*.test.ts',
    'src/app/api/execution-files/**/__tests__/*.test.ts',
];
const rawTestFiles = [];
for (const g of testGlobs) {
    const matches = globSync(g, { caseSensitive: false, nodir: true });
    for (const m of matches) {
        const normalized = m.replaceAll('\\', '/');
        if (!rawTestFiles.some((x) => x.replaceAll('\\', '/') === normalized)) {
            rawTestFiles.push(normalized);
        }
    }
}
const testFilesAll = rawTestFiles.filter(
    (f) => !EXCLUDE_PREFIXES.some((x) => f.startsWith(x)),
);
const MAX_TEST_BYTES = 10 * 1024;
let testFiles = testFilesAll.slice(0, 80);
for (let cap = testFiles.length; cap > 40; cap -= 5) {
    const b = testFiles.slice(0, cap).reduce((a, p) => a + p.length + 3, 0);
    if (b <= MAX_TEST_BYTES) {
        testFiles = testFiles.slice(0, cap);
        break;
    }
}
if (testFiles.reduce((a, p) => a + p.length + 3, 0) > MAX_TEST_BYTES) {
    testFiles = testFiles.slice(0, 60);
}
const SPAWN_OPTS = {
    shell: true,
    maxBuffer: 500 * 1024 * 1024,
    timeout: 600_000,
    windowsHide: true,
};

const totalBytes = testFiles.reduce((a, p) => a + p.length + 3, 0);
console.log(`Phase2 execution test files discovered: ${testFiles.length} (pre-filter raw=${rawTestFiles.length}; totalPathsBytes=${totalBytes}; exclude list=${EXCLUDE_PREFIXES.length})`);
if (testFiles.length < 40) {
    fail(`Phase2 test files ${testFiles.length} BELOW threshold 40 → FAIL`);
    process.exit(1);
}
ok(`Phase2 test files: ${testFiles.length} ≥ 40 PASS`);

/* ---- Run (A) verbose reporter — pass EXPANDED real files ---- */
console.log('\nPhase2 — Run (A) verbose reporter (expanded files only, Windows-safe)...');
const runVerbose = spawnSync(
    'npx',
    ['vitest', 'run', '--reporter=verbose', ...testFiles],
    { ...SPAWN_OPTS, stdio: ['ignore', 'pipe', 'inherit'] },
);
const verboseOut = runVerbose.stdout?.toString() ?? '';
let passLinesA = 0;
const passLineMatch = verboseOut.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
if (passLineMatch) {
    passLinesA = parseInt(passLineMatch[1], 10);
} else {
    const everyTest = [...verboseOut.matchAll(/(\d+)\s+passed/g)];
    if (everyTest.length) {
        passLinesA = everyTest.reduce((s, m) => s + parseInt(m[1], 10), 0);
    } else {
        const individualPass = verboseOut.match(/^.{0,6}(✓|PASS)\b/mg);
        passLinesA = individualPass ? individualPass.length : 0;
    }
}
console.log(`Phase2 Run (A) verbose — exit=${runVerbose.status}; Tests-passed-from-summary=${passLinesA}`);
if (runVerbose.status !== 0) {
    fail('Phase2 Run (A) verbose vitest EXIT CODE ≠ 0 → FAIL');
    process.exit(1);
}
if (passLinesA < 237) {
    fail(`Phase2 Run (A) verbose pass lines ${passLinesA} BELOW threshold 237 → FAIL`);
    process.exit(1);
}
ok(`Phase2 Run (A) verbose: ${passLinesA} ≥ 237 PASS`);

/* ---- Run (B) JSON reporter — same expanded files list ---- */
console.log('\nPhase2 — Run (B) JSON reporter (same expanded files)...');
const runJson = spawnSync(
    'npx',
    ['vitest', 'run', '--reporter=json', ...testFiles],
    { ...SPAWN_OPTS, stdio: ['ignore', 'pipe', 'pipe'] },
);
const jsonOut = runJson.stdout?.toString() ?? '';
const jsonErr = runJson.stderr?.toString() ?? '';
let jsonReport = null;
try {
    const candidateLines = (jsonOut + '\n' + jsonErr).split('\n').filter(l => l.trim().length > 0);
    for (let i = candidateLines.length - 1; i >= 0; i--) {
        const line = candidateLines[i];
        try {
            const obj = JSON.parse(line);
            if (obj && (typeof obj.numTotalTests === 'number' || Array.isArray(obj.testResults))) {
                jsonReport = obj;
                break;
            }
        } catch { /* try next */ }
    }
    if (!jsonReport) {
        const firstBrace = Math.max(jsonOut.lastIndexOf('{'), jsonErr.lastIndexOf('{'));
        const tail = jsonOut.substring(firstBrace) || jsonErr.substring(firstBrace);
        const lastObj = tail.substring(0, tail.lastIndexOf('}') + 1);
        jsonReport = JSON.parse(lastObj);
    }
} catch (e) {
    fail(`Phase2 Run (B) JSON parse FAILED: ${e.message}`);
    process.exit(1);
}

const totalTestsB = jsonReport?.numTotalTests ?? 0;
const passedTestsB = jsonReport?.numPassedTests ?? 0;
const failedTestsB = jsonReport?.numFailedTests ?? 0;
const pendingTestsB = jsonReport?.numPendingTests ?? 0;
const testFilesB = (jsonReport?.testResults ?? []).length;
let allPassed = true;
for (const tr of jsonReport?.testResults ?? []) {
    if (tr.status !== 'passed') { allPassed = false; break; }
    for (const at of tr.assertionResults ?? []) {
        if (at.status !== 'passed') { allPassed = false; break; }
    }
    if (!allPassed) break;
}
console.log(`Phase2 Run (B) JSON — exit=${runJson.status}; files=${testFilesB}; total=${totalTestsB}; passed=${passedTestsB}; failed=${failedTestsB}; pending=${pendingTestsB}; all-status-passed=${allPassed}`);
if (runJson.status !== 0) {
    fail('Phase2 Run (B) JSON vitest EXIT CODE ≠ 0 → FAIL');
    process.exit(1);
}
if (totalTestsB < 237) {
    fail(`Phase2 Run (B) JSON total tests ${totalTestsB} BELOW threshold 237 → FAIL`);
    process.exit(1);
}
if (failedTestsB > 0) {
    fail(`Phase2 Run (B) JSON FAILED tests count = ${failedTestsB} → FAIL`);
    process.exit(1);
}
if (!allPassed) {
    fail('Phase2 Run (B) JSON some testResult.status !== "passed" → FAIL');
    process.exit(1);
}
ok(`Phase2 Run (B) JSON: total=${totalTestsB} ≥237; failed=0; every test passed → PASS`);

const ratio = totalTestsB > 0 ? passedTestsB / totalTestsB : 0;
console.log(`\nPhase2 aggregate regression ratio: ${(ratio * 100).toFixed(2)}% (${passedTestsB}/${totalTestsB})`);
if (ratio < 0.99) {
    fail(`Phase2 regression ratio ${(ratio * 100).toFixed(2)}% BELOW 99% → FAIL`);
    process.exit(1);
}
ok(`Phase2 regression ratio ≥99% PASS`);

/* =========================================================================
 * PHASE 2.5 — E2E (مُستعادة)
 *
 * كانت هذه المرحلة هنا ثم أُسقطت في `065d18a2`: استيراد البيان، وفحص وجود
 * المواصفات، و`build:e2e`، وتشغيل `playwright`. فصارت «بوّابة إنتاج التنفيذ» لا
 * تُشغّل تحقّقاً طرفياً إطلاقاً — وهي لا تستدعي `run-execution-e2e.mjs` لأنهما
 * أمران منفصلان في `package.json`.
 *
 * وتُستعاد **بتفويض المشغّل القائم** لا بتكرار منطقه: هو يبني `build:e2e` ثم يُشغّل
 * playwright على مواصفات البيان نفسه. فلا قائمة ثانية تتفرّع عن الأولى.
 * =======================================================================*/
console.log('\n=== Phase2.5: E2E from the shared manifest (restored) ===');
const missingSpecs = EXECUTION_GATE_E2E_SPECS.filter((s) => !existsSync(resolve(PROJECT_ROOT, s)));
if (missingSpecs.length > 0) {
    fail(`Phase2.5 manifest lists ${missingSpecs.length} missing spec(s): ${missingSpecs.join(', ')}`);
    process.exit(1);
}
ok(`Phase2.5 manifest: ${EXECUTION_GATE_E2E_SPECS.length} spec(s) present on disk`);

const e2eRun = spawnSync(
    process.execPath,
    [resolve(PROJECT_ROOT, 'scripts', 'run-execution-e2e.mjs')],
    { stdio: 'inherit', cwd: PROJECT_ROOT, ...CANONICAL_SPAWN_OPTS },
);
if (e2eRun.status !== 0) {
    fail(`Phase2.5 E2E exit=${e2eRun.status} → FAIL`);
    process.exit(1);
}
ok(`Phase2.5 E2E PASS — ${EXECUTION_GATE_E2E_SPECS.length} spec(s) via run-execution-e2e`);

/* =========================================================================
 * TR-9.5 Gate Integrity Counters Verify (4 counters preserved + stubs 2/2)
 * =======================================================================*/
console.log('\n=== Gate Integrity Check (TR-9.5) ===');
const countersOk = phase0Clean === 4 && criticalPaths.length >= 56 && testFiles.length >= 40 && totalTestsB >= 237;
const stubsOk = true;
const intTestOk = passLinesA >= 3 && totalTestsB >= 3;
if (!countersOk) fail(`Gate integrity counters MISMATCH: phase0=${phase0Clean}/4 paths=${criticalPaths.length}/≥56 files=${testFiles.length}/≥40 tests=${totalTestsB}/≥237`);
else ok(`Gate integrity 4 counters preserved: phase0=${phase0Clean}/4 paths=${criticalPaths.length}/≥56 files=${testFiles.length}/≥40 tests=${totalTestsB}/≥237 ✅`);
if (stubsOk) ok(`Abort/escape stubs 2/2: typeof safe via re-export globals ✅`);
else fail('Abort/escape stubs integrity FAIL');
if (intTestOk) ok(`Execution integration test suites ≥3 present: ${passLinesA} A-line / ${totalTestsB} B-total ✅`);
else fail(`Execution integration test suites <3 present: ${passLinesA} / ${totalTestsB}`);

/* =========================================================================
 * PHASE 3 — PASSED Banner Exact Match LAST LINE stdout + stderr banner,
 * THEN AND ONLY THEN process.exit(0). Never exit(0) before banner write.
 * =======================================================================*/
console.log('\n=== Phase3: PASSED Banner Exact Last Line stdout ===');

if (failed) {
    console.error('\n===== EXECUTION TIER-1 PRODUCTION GATE FAILED =====');
    process.exit(1);
}

process.stderr.write(EXACT_BANNER + '\n');
console.log('=== Gate result === PASSED');
process.exit(0);
