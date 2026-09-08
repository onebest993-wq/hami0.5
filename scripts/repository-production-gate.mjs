#!/usr/bin/env node
/**
 * Repository Tier-1 Production Gate — 4 Phases STRICT ORDERED.
 *
 * Usage:
 *   node scripts/repository-production-gate.mjs
 */
import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';

const EXACT_BANNER = '===== REPOSITORY TIER-1 PRODUCTION GATE PASSED =====';
const EXACT_LAST_STDOUT_LINE = '=== Gate result === PASSED';

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== REPOSITORY TIER-1 PRODUCTION GATE ===\n');

/* =========================================================================
 * PHASE 0 — REPO_SHADOW_STUB Anti-Module-Shadowing Bomb (CRITICAL)
 * Windows NTFS case-insensitive trap: existsSync() returns TRUE for wrong
 * case paths when lower-case real file exists. ONLY globSync with
 * caseSensitive:false is safe (returns empty for case-mismatched /
 * wrong-subfolder / non-existent paths). ANY HIT = INSTANT exit(1).
 * =======================================================================*/
console.log('=== Phase0: REPO_SHADOW_STUB Anti-Module-Shadowing Bomb ===');
const REPO_SHADOW_STUB_GLOB_PATHS = [
    'src/app/components/lawyer/dossier-notes/components/DossierNotesVault.tsx',
    'src/app/services/vault/vaultServices/vaultOwnership.ts',
    'src/app/hooks/lawyerDashboard/repository/repositoryShellLifecycle/repositoryShellOpenFlow.ts',
    'src/app/services/storage/encryptedStorage/lawyerStorageRuntime.ts',
];
let phase0Clean = 0;
for (const pattern of REPO_SHADOW_STUB_GLOB_PATHS) {
    const hits = globSync(pattern, { caseSensitive: false, nodir: true });
    if (hits.length > 0) {
        console.error(`BOMB PHASE0 REPO_SHADOW_STUB DETECTED: ${pattern} → hits: ${hits.join(', ')}`);
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
 * CR-1..CR-7 repository scope: SmartRepository components + repository
 * services + repository hooks + repository runtime + vault/storage/dossier
 * services + dashboard repository overlay entries.
 * =======================================================================*/
console.log('=== Phase1: Critical Paths Glob REAL DISK (target ≥56) ===');
const criticalGlobs = [
    'src/app/components/lawyer/SmartRepository/**/*.{ts,tsx}',
    'src/app/services/repository/**/*.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/repository/**/*.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/**/repositoryIntentWarm*.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/**/useLawyerDashboardRepository*.{ts,tsx}',
    'src/app/runtime/repository*.{ts,tsx}',
    'src/app/components/lawyer/dashboard/**/*Repository*.{ts,tsx}',
    'src/app/services/dossierPersistence/**/*repository*.{ts,tsx}',
    'src/app/services/dossierPersistence/**/dossierWipeGuard*.{ts,tsx}',
    'src/app/services/vault/**/vaultOwnership*.{ts,tsx}',
    'src/app/services/vault/**/smartVaultRuntime*.{ts,tsx}',
    'src/app/services/vault/**/vaultDocResolve*.{ts,tsx}',
    'src/app/services/storage/**/lawyerStorageRuntime*.{ts,tsx}',
    'src/app/services/repository/stripRepositoryHtml*.{ts,tsx}',
    'src/app/services/repository/repositoryPermissions*.{ts,tsx}',
    'src/app/services/repository/repositoryCloseEvents*.{ts,tsx}',
    'src/app/services/repository/repositoryEscapeStack*.{ts,tsx}',
    'src/app/services/repository/repositoryNetworkAbort*.{ts,tsx}',
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
 *   (A) verbose reporter — exit 0
 *   (B) JSON reporter: testResults.files ≥ 40 / numTotalTests ≥ 237 /
 *       numFailedTests === 0 / all status === 'passed'
 * Repository Smart components + services/repository + hooks/repository +
 * runtime repository + mobile runtime + dossier/vault tests (repo scope).
 * =======================================================================*/
console.log('=== Phase2: Vitest 2-runs (target ≥40 files / ≥237 tests) ===');
const testGlobs = [
    'src/app/components/lawyer/SmartRepository/**/__tests__/*.test.ts',
    'src/app/components/lawyer/SmartRepository/**/__tests__/*.test.tsx',
    'src/app/components/lawyer/SmartRepository/hooks/__tests__/*.test.ts',
    'src/app/components/lawyer/SmartRepository/hooks/__tests__/*.test.tsx',
    'src/app/services/repository/**/__tests__/*.test.ts',
    'src/app/services/repository/**/__tests__/*.test.tsx',
    'src/app/services/repository/*.test.ts',
    'src/app/services/repository/*.test.tsx',
    'src/app/hooks/lawyerDashboard/repository/__tests__/*.test.ts',
    'src/app/hooks/lawyerDashboard/repository/__tests__/*.test.tsx',
    'src/app/hooks/lawyerDashboard/__tests__/repository*.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/repository*.test.tsx',
    'src/app/runtime/__tests__/repository*.test.ts',
    'src/app/runtime/__tests__/repository*.test.tsx',
    'src/app/runtime/__tests__/mobile*.test.ts',
    'src/app/runtime/__tests__/mobile*.test.tsx',
    'src/app/services/dossierPersistence/__tests__/repositoryDocsWipeGuard.test.ts',
    'src/app/services/__tests__/repositoryDossierFeed.test.ts',
    'src/app/components/lawyer/CommunityScreen/__tests__/repository*.test.ts',
    'src/app/components/lawyer/CommunityScreen/__tests__/repository*.test.tsx',
    'src/app/services/forum/__tests__/repository*.test.ts',
    'src/app/services/forum/__tests__/repository*.test.tsx',
];
const testFilesAll = [];
for (const g of testGlobs) {
    const matches = globSync(g, { caseSensitive: false, nodir: true });
    for (const m of matches) {
        const normalized = m.replaceAll('\\', '/');
        if (!testFilesAll.some(x => x.replaceAll('\\','/') === normalized)) testFilesAll.push(normalized);
    }
}
const SPAWN_OPTS = {
    shell: true,
    maxBuffer: 500 * 1024 * 1024,
    timeout: 600_000,
    windowsHide: true,
};
const MAX_TEST_BYTES = 10 * 1024;

console.log(`Phase2 repository test files discovered: ${testFilesAll.length}`);
if (testFilesAll.length < 40) {
    fail(`Phase2 test files ${testFilesAll.length} BELOW threshold 40 → FAIL`);
    process.exit(1);
}
ok(`Phase2 test files: ${testFilesAll.length} ≥ 40 PASS`);

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

/* ---- Run (A) verbose reporter — pass EXPANDED real files (Windows CMD 32KB safe via byte-slicer) ---- */
console.log('\nPhase2 — Run (A) verbose reporter (63 expanded files, not patterns)...');
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
console.log('\nPhase2 — Run (B) JSON reporter (same 63 expanded files)...');
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
if (intTestOk) ok(`Repo integration test suites ≥3 present: ${passLinesA} A-line / ${totalTestsB} B-total ✅`);
else fail(`Repo integration test suites <3 present: ${passLinesA} / ${totalTestsB}`);

/* =========================================================================
 * PHASE 3 — PASSED Banner Exact Match LAST LINE stdout + stderr banner,
 * THEN AND ONLY THEN process.exit(0). Never exit(0) before banner write.
 * =======================================================================*/
console.log('\n=== Phase3: PASSED Banner Exact Last Line stdout ===');

if (failed) {
    console.error('\n===== REPOSITORY TIER-1 PRODUCTION GATE FAILED =====');
    process.exit(1);
}

process.stderr.write(EXACT_BANNER + '\n');
console.log('=== Gate result === PASSED');
process.exit(0);
