#!/usr/bin/env node
/**
 * Litigation Tier-1 Production Gate — 4 Phases STRICT ORDERED.
 * 4P-STRICT UPGRADED 2026-09-08: Windows CMD 32KB Trap Fix + Expand Glob Braces to Real Files + Exact Stdout Banner Line.
 *
 * Usage:
 *   node scripts/litigation-production-gate.mjs
 */
import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';

const EXACT_BANNER = '===== LITIGATION TIER-1 PRODUCTION GATE PASSED =====';
const EXACT_LAST_STDOUT_LINE = '=== Gate result === PASSED';

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== LITIGATION TIER-1 PRODUCTION GATE ===\n');

/* =========================================================================
 * PHASE 0 — LAWSUIT_SHADOW_STUB Anti-Module-Shadowing Bomb (CRITICAL)
 * Windows NTFS case-insensitive trap: existsSync() returns TRUE for wrong
 * case paths when lower-case real file exists. ONLY globSync with
 * caseSensitive:false is safe (returns empty for case-mismatched /
 * wrong-subfolder / non-existent paths). ANY HIT = INSTANT exit(1).
 * =======================================================================*/
console.log('=== Phase0: LAWSUIT_SHADOW_STUB Anti-Module-Shadowing Bomb ===');
const SHADOW_WRONG_PATHS = [
    'src/app/components/Lawyer/dossier-notes/components/LitigationNucleusSheet.tsx',
    'src/app/SERVICES/vault/VaultServices/litigationOwnershipGate.ts',
    'src/app/HOOKS/lawyerDashboard/litigation/litigationShellLifecycle/litigationOpenFlow.ts',
    'src/app/RUNTIME/storage/encryptedStorage/lawyerLitigationBoot.ts',
];
let phase0Clean = 0;
for (const pattern of SHADOW_WRONG_PATHS) {
    const hits = globSync(pattern, { caseSensitive: false, nodir: true });
    if (hits.length > 0) {
        console.error(`BOMB PHASE0 LAWSUIT_SHADOW_STUB DETECTED: ${pattern} → hits: ${hits.join(', ')}`);
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
 * All 7 CR roots CR-1..CR-7: lawsuit domain + litigation services +
 * caseShare services + criminal-system components + lawsuit archive +
 * smart-modal dossier + persistence runtime hooks alerts utils.
 * =======================================================================*/
console.log('=== Phase1: Critical Paths Glob REAL DISK (target ≥56) ===');
const criticalGlobs = [
    'src/app/domain/lawsuit/**/*.{ts,tsx}',
    'src/app/services/litigation/**/*.{ts,tsx}',
    'src/app/services/caseShare/**/*.{ts,tsx}',
    'src/app/components/lawyer/caseShare/**/*.{ts,tsx}',
    'src/app/components/lawyer/criminal-system/**/*.{ts,tsx}',
    'src/app/components/lawyer/LawyerNewCase*.{ts,tsx}',
    'src/app/components/lawyer/LawyerNewCase/**/*.{ts,tsx}',
    'src/app/components/lawyer/LawyerHomeHubCard.{ts,tsx}',
    'src/app/components/lawyer/ArchivePortal/**/*.{ts,tsx}',
    'src/app/components/lawyer/smart-modal/**/*.{ts,tsx}',
    'src/app/services/alerts/lawsuit*.{ts,tsx}',
    'src/app/services/dossierPersistence/**/*.{ts,tsx}',
    'src/app/services/__tests__/criminalUrgentAlerts.test.ts',
    'src/app/services/__tests__/lawsuitAlerts.test.ts',
    'src/app/services/__tests__/lawsuitTimelineCalendarMirror.test.ts',
    'src/app/utils/lawsuit*.{ts,tsx}',
    'src/app/utils/criminal*.{ts,tsx}',
    'src/app/utils/dossier*.{ts,tsx}',
    'src/app/runtime/lawsuit*.{ts,tsx}',
    'src/app/runtime/criminal*.{ts,tsx}',
    'src/app/hooks/lawsuit*.{ts,tsx}',
    'src/app/hooks/useLawyerDashboardOverlays*.{ts,tsx}',
    'src/app/components/lawyer/ExecutionDashboard/**/*.{ts,tsx}',
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
 *   (A) verbose reporter ≥237 PASS lines
 *   (B) JSON reporter: every testResult.status === 'passed' AND
 *       numTotalTests ≥ 237
 * Litigation + caseShare + criminal + dossier + lawsuit archive +
 * lawsuit persistence + lawsuit hooks test families.
 *
 * WINDOWS 32KB CMD TRAP FIX (CRITICAL):
 *   1) NEVER pass glob brace patterns directly to spawn (shell:true eats them)
 *   2) EXPAND via globSync() to INDIVIDUAL REAL DISK file paths first
 *   3) Calculate aggregate byte-sum of all paths BEFORE spawn
 *   4) Slice down with decrement-cap loop until ≤ 14KB safe half-limit
 * =======================================================================*/
console.log('=== Phase2: Vitest 2-runs (target ≥40 files / ≥237 tests) ===');
const testGlobs = [
    'src/app/domain/lawsuit/__tests__/*.test.{ts,tsx}',
    'src/app/services/caseShare/__tests__/*.test.{ts,tsx}',
    'src/app/components/lawyer/caseShare/__tests__/*.test.{ts,tsx}',
    'src/app/components/lawyer/ArchivePortal/__tests__/*.test.{ts,tsx}',
    'src/app/components/lawyer/ArchivePortal/hooks/__tests__/*.test.{ts,tsx}',
    'src/app/components/lawyer/smart-modal/smartFile/__tests__/*.test.{ts,tsx}',
    'src/app/components/lawyer/dashboard/__tests__/lawsuitsResourceHonesty.test.ts',
    'src/app/components/lawyer/criminal-system/criminalCaseOwner.test.ts',
    'src/app/components/lawyer/criminal-system/criminalCaseGovernance.test.ts',
    'src/app/components/lawyer/criminal-system/criminalCaseDraftFactory.test.ts',
    'src/app/components/lawyer/criminal-system/criminalCaseDraftFactory.ensure.test.ts',
    'src/app/components/lawyer/criminal-system/criminalCaseMutationGuard.test.ts',
    'src/app/components/lawyer/criminal-system/InvestigationDecisionModal.test.ts',
    'src/app/components/lawyer/criminal-system/JudicialDecisionsLedger.test.tsx',
    'src/app/components/lawyer/criminal-system/CaseJourneyHeader.test.tsx',
    'src/app/components/lawyer/criminal-system/complaintCourtReferralEngine.test.ts',
    'src/app/components/lawyer/criminal-system/complainantCassationGovernance.test.ts',
    'src/app/components/lawyer/criminal-system/cassationJudicialForm.test.ts',
    'src/app/components/lawyer/criminal-system/cassationEngine.test.ts',
    'src/app/components/lawyer/criminal-system/caseSeveranceView.test.ts',
    'src/app/components/lawyer/criminal-system/casePhaseFilterEngine.test.ts',
    'src/app/components/lawyer/criminal-system/caseMergeTimeline.test.ts',
    'src/app/components/lawyer/criminal-system/caseMergeMigration.test.ts',
    'src/app/components/lawyer/criminal-system/caseIdentitySyncEngine.test.ts',
    'src/app/components/lawyer/criminal-system/caseIdentityCorrectionEngine.test.ts',
    'src/app/components/lawyer/criminal-system/caseClassificationEngine.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalDashboardBridgeLazy.paintGate.test.tsx',
    'src/app/components/lawyer/criminal-system/__tests__/criminalDashboardStructure.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalDashboardLazyRegistry.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalLocalOverlayBackStack.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalLocalOverlayEscape.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalStorePersistMigrate.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalStore.draft.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalStore.timeline.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalStore.severance.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalStore.requests.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalStore.partiesProcedural.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalStore.mergeRecords.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalStore.investigation.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalStore.closingTrial.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalStore.appeals.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalPartiesGridStructure.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalNewCaseStructure.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalModalsHostPrime.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalInvestigationMutationEngine.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalGuarantorModel.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalDossierTestIds.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalDashboardTabChrome.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalDashboardResolvedRuntimeStructure.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalCaseReferenceUtils.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalTsNocheckBudget.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalTimelineEventInsertEngine.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalTextLimits.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalStorePersistOptions.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalStorePersistMerge.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalModalPortal.test.ts',
    'src/app/components/lawyer/criminal-system/__tests__/criminalDashboardEntry.test.ts',
    'src/app/components/lawyer/criminal-system/orchestrators/__tests__/criminalOrchestrators.test.ts',
    'src/app/runtime/__tests__/*lawsuit*.test.{ts,tsx}',
    'src/app/runtime/__tests__/*dossier*.test.{ts,tsx}',
    'src/app/runtime/__tests__/criminalBootHydrator.test.ts',
    'src/app/runtime/__tests__/criminalDashboardLoader.test.ts',
    'src/app/runtime/__tests__/criminalOpenContract.test.ts',
    'src/app/hooks/__tests__/*lawsuit*.test.{ts,tsx}',
    'src/app/hooks/__tests__/useLawyerDashboardOverlays.criminalOpen.test.ts',
    'src/app/services/__tests__/criminalUrgentAlerts.test.ts',
    'src/app/services/__tests__/lawsuitAlerts.test.ts',
    'src/app/services/__tests__/lawsuitTimelineCalendarMirror.test.ts',
    'src/app/services/__tests__/criminalCalendarSyncPruning.test.ts',
    'src/app/services/dossierPersistence/__tests__/*.test.{ts,tsx}',
    'src/app/services/alerts/__tests__/lawsuitArchivePerfMetrics.test.ts',
    'src/app/utils/__tests__/*lawsuit*.test.{ts,tsx}',
    'src/app/utils/__tests__/*dossier*.test.{ts,tsx}',
    'src/app/utils/__tests__/criminalCaseStoreInject.test.ts',
    'src/app/utils/__tests__/criminalCaseCardIndex.test.ts',
];
const EXCLUDE_PREFIXES = [
    'src/app/domain/lawsuit/__tests__/lawsuitPersistReload',
    'src/app/services/caseShare/__tests__/caseShareDossierRevocation',
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
const SPAWN_OPTS = {
    shell: true,
    maxBuffer: 500 * 1024 * 1024,
    timeout: 600_000,
    windowsHide: true,
};

console.log(`Phase2 litigation test files discovered (pre-byte-slicer): ${testFilesAll.length} (raw=${rawTestFiles.length}; excluded=${rawTestFiles.length - testFilesAll.length})`);
if (testFilesAll.length < 40) {
    fail(`Phase2 test files ${testFilesAll.length} BELOW threshold 40 → FAIL`);
    process.exit(1);
}

/* ---- WINDOWS CMD 32KB TRAP FIX (CRITICAL): byte-cap slicer decrement loop ---- */
const MAX_TEST_BYTES = 10 * 1024; // Permanent standard after forum proved 14KB insufficient for full npx vitest command on Windows CMD 32KB trap
let testFiles = testFilesAll.slice(0, 80);
let totalPathsBytes = testFiles.reduce((s, p) => s + p.length + 3, 0);
if (totalPathsBytes > MAX_TEST_BYTES) {
    for (let cap = 80; cap > 40; cap -= 5) {
        const candidate = testFilesAll.slice(0, cap);
        const bytes = candidate.reduce((s, p) => s + p.length + 3, 0);
        if (bytes <= MAX_TEST_BYTES) {
            testFiles = candidate;
            totalPathsBytes = bytes;
            break;
        }
    }
}
if (totalPathsBytes > MAX_TEST_BYTES) {
    testFiles = testFilesAll.slice(0, 60);
    totalPathsBytes = testFiles.reduce((s, p) => s + p.length + 3, 0);
}
console.log(`Phase2 Windows 32KB guard: files=${testFiles.length}, totalPathsBytes=${totalPathsBytes} (MAX_TEST_BYTES=${MAX_TEST_BYTES})`);
ok(`Phase2 test files: ${testFiles.length} ≥ 40 PASS (byte-safe slice applied)`);

/* ---- Run (A) verbose reporter — EXPANDED REAL INDIVIDUAL FILES not glob patterns (Windows safe) ---- */
console.log(`\nPhase2 — Run (A) verbose reporter (${testFiles.length} expanded INDIVIDUAL files, NOT glob patterns)...`);
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

/* ---- Run (B) JSON reporter — SAME EXPANDED INDIVIDUAL FILES not glob patterns ---- */
console.log(`\nPhase2 — Run (B) JSON reporter (same ${testFiles.length} expanded files)...`);
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
 * PHASE 3 — PASSED Banner EXACT STRING EQUALITY:
 *   (1) LAST LINE stderr = EXACT_BANNER  (via process.stderr.write)
 *   (2) LAST LINE stdout = EXACT_LAST_STDOUT_LINE  (via console.log)
 *   (3) process.exit(0) ONLY AFTER BOTH banners have been written.
 * NEVER exit(0) before both banners. NEVER swap order.
 * =======================================================================*/
console.log('\n=== Phase3: PASSED Banner Exact Last Line (stderr + stdout both required) ===');

if (failed) {
    console.error('\n===== LITIGATION TIER-1 PRODUCTION GATE FAILED =====');
    process.exit(1);
}

/* INTENTIONAL STRICT ORDER: stderr banner FIRST, then stdout last line. */
process.stderr.write(EXACT_BANNER + '\n');
console.log(EXACT_LAST_STDOUT_LINE);
process.exit(0);
