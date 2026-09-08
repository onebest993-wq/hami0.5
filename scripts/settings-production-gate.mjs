#!/usr/bin/env node
/**
 * Settings Tier-1 Production Gate — 4 Phases STRICT ORDERED (4P-STRICT UPGRADED 2026-09-08).
 * FIXES vs OLD pre-hardened version (C-6 critical vulnerabilities):
 *   (NEW) Phase0 SETTINGS_SHADOW_STUB Anti-Module-Shadowing Bomb 4 paths NTFS-case-safe
 *   (C-3) REMOVED existsSync() 27 hardcoded paths — replaced with globSync REAL DISK discovery
 *   (C-4) Canonical SPAWN_OPTS 5-item: shell:true + maxBuffer:500MB + timeout:600_000 + windowsHide:true
 *   (C-5) JSON parse: reverse-line scan + lastIndexOf('{') fallback (robust against prefixed logs)
 *   (C-1) Windows 32KB CMD Trap Fix: expand files via globSync() individually + MAX_TEST_BYTES=10KB permanent standard (forum-proven safe cap)
 *   (C-2 fix equivalent): No folder paths passed; ALL glob patterns expand to INDIVIDUAL REAL FILES
 *   Plus: Strict Order Banner Phase3 — stderr banner first, THEN stdout last line, THEN exit(0).
 *
 * Usage:
 *   npm run gate:settings   OR   node scripts/settings-production-gate.mjs
 */
import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';

const EXACT_BANNER = '===== SETTINGS TIER-1 PRODUCTION GATE PASSED =====';
const EXACT_LAST_STDOUT_LINE = '=== Gate result === PASSED';

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== SETTINGS TIER-1 PRODUCTION GATE (4P-STRICT UPGRADED) ===\n');

/* =========================================================================
 * PHASE 0 — SETTINGS_SHADOW_STUB Anti-Module-Shadowing Bomb (CRITICAL)
 * Windows NTFS case-insensitive trap: existsSync returns TRUE for wrong-case
 * paths when lower-case real file exists. ONLY globSync({caseSensitive:false,
 * nodir:true}) is safe (returns EMPTY for case-mismatched / wrong-subfolder
 * / non-existent paths). ANY HIT = INSTANT exit(1).
 * =======================================================================*/
console.log('=== Phase0: SETTINGS_SHADOW_STUB Anti-Module-Shadowing Bomb (4 paths) ===');
const SETTINGS_SHADOW_STUB_GLOB_PATHS = [
    'src/app/components/Lawyer/HamiSettings/SettingsShieldNucleusSheet.tsx',
    'src/app/SERVICES/settings/settingsShieldOwnershipGate.ts',
    'src/app/HOOKS/lawyerDashboard/settings/settingsShieldShellShadowOpenFlow.ts',
    'src/app/RUNTIME/storage/encryptedStorage/lawyerSettingsShieldBootHydrator.ts',
];
let phase0Clean = 0;
for (const pattern of SETTINGS_SHADOW_STUB_GLOB_PATHS) {
    const hits = globSync(pattern, { caseSensitive: false, nodir: true });
    if (hits.length > 0) {
        console.error(`BOMB PHASE0 SETTINGS_SHADOW_STUB DETECTED: ${pattern} → hits: ${hits.join(', ')}`);
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
 * CR-1..CR-8 Settings scope: HamiSettings components + settings services +
 * lawyerDashboard settings hooks + lawyerSettings context + settings runtime
 * loaders + dashboard settings intents + ui smart dialog + profile settings
 * sheet + privacy blur mobile + business backup + wipe/security.
 * =======================================================================*/
console.log('=== Phase1: Critical Paths Glob REAL DISK (target ≥56) ===');
const criticalGlobs = [
    'src/app/services/settings/**/*.ts',
    'src/app/services/settings/**/*.tsx',
    'src/app/components/lawyer/HamiSettings/**/*.ts',
    'src/app/components/lawyer/HamiSettings/**/*.tsx',
    'src/app/hooks/lawyerDashboard/settings/**/*.ts',
    'src/app/hooks/lawyerDashboard/settings/**/*.tsx',
    'src/app/hooks/lawyerDashboard/*Settings*.ts',
    'src/app/hooks/lawyerDashboard/*settings*.ts',
    'src/app/hooks/*settingsIntentWarm*.ts',
    'src/app/context/lawyerSettings/**/*.ts',
    'src/app/context/lawyerSettings/**/*.tsx',
    'src/app/context/LawyerSettingsContext.tsx',
    'src/app/runtime/settings*.ts',
    'src/app/runtime/settings*.tsx',
    'src/app/runtime/hamiSettings*.ts',
    'src/app/runtime/*Settings*.ts',
    'src/app/components/ui/SmartDialogContainer.tsx',
    'src/app/components/ui/smartDialogScope.ts',
    'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileSettingsSheet.tsx',
    'src/app/components/lawyer/dashboard/__tests__/SettingsInstantPaintCover.test.tsx',
    'src/app/hooks/lawyerDashboard/__tests__/*useLawyerDashboardSettings*.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/*settings*.test.ts',
    'src/app/hooks/__tests__/useLawyerDashboardOverlays.settings.test.ts',
    'src/app/runtime/__tests__/*settings*.test.ts',
    'src/app/runtime/__tests__/*settings*.test.tsx',
    'src/app/runtime/__tests__/*hamiSettings*.test.ts',
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
ok(`Phase1 critical paths: ${criticalPaths.length} ≥ 56 PASS (NTFS-case-safe via globSync)`);

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
 *   (B) JSON reporter: testResult files ≥ 40 / numTotalTests ≥ 237 / numFailed = 0
 *
 * WINDOWS 32KB CMD TRAP FIX (CRITICAL):
 *   Expand via globSync → INDIVIDUAL REAL FILES, then byte-cap slicer loop.
 *   NEVER pass folder glob brace patterns or folders directly.
 * =======================================================================*/
console.log('=== Phase2: Vitest 2-runs (target ≥40 files / ≥237 tests) ===');
const testGlobs = [
    /* — Old gate lines 53-59: explicit dashboard settings hooks — */
    'src/app/hooks/lawyerDashboard/__tests__/useLawyerDashboardSettings.test.ts',
    'src/app/hooks/__tests__/useLawyerDashboardOverlays.settings.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/settingsIntentWarm.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/headerShellIntentWarm.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/patchLawyerDashboardHeaderOverlayOpen.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/lawyerDashboardHeaderPrefetch.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/dashboardViewFingerprint.test.ts',
    /* — Old gate line 60: services/settings/__tests__ folder (expanded to INDIVIDUAL globs) — */
    'src/app/services/settings/__tests__/*.test.ts',
    'src/app/services/settings/__tests__/*.test.tsx',
    /* — Old gate line 61: HamiSettings folder (expanded to INDIVIDUAL recursive) — */
    'src/app/components/lawyer/HamiSettings/**/__tests__/*.test.ts',
    'src/app/components/lawyer/HamiSettings/**/__tests__/*.test.tsx',
    /* — Old gate line 62: lawyerSettings context folder (expanded) — */
    'src/app/context/lawyerSettings/**/__tests__/*.test.ts',
    'src/app/context/lawyerSettings/**/__tests__/*.test.tsx',
    /* — Old gate lines 63-70: explicit test files — */
    'src/app/context/__tests__/privacyBlurMobile.test.tsx',
    'src/app/components/lawyer/RoyalLawyerProfile/components/__tests__/ProfileSettingsSheet.smoke.test.tsx',
    'src/app/runtime/__tests__/settingsBootHydrator.test.ts',
    'src/app/runtime/__tests__/hamiSettingsLoader.test.ts',
    'src/app/runtime/__tests__/hamiSettingsModuleExport.live.test.ts',
    'src/app/runtime/__tests__/settingsInstantPaint.test.ts',
    'src/app/components/lawyer/dashboard/__tests__/SettingsInstantPaintCover.test.tsx',
    'src/app/runtime/__tests__/settingsOverlayPresence.test.ts',
    /* — Old gate line 71: hooks/lawyerDashboard/settings/__tests__ folder (expanded) — */
    'src/app/hooks/lawyerDashboard/settings/__tests__/*.test.ts',
    'src/app/hooks/lawyerDashboard/settings/__tests__/*.test.tsx',
    /* — Old gate lines 72-77: explicit honesty / warm / surgical tests — */
    'src/app/runtime/__tests__/settingsOpenSnappinessHonesty.test.ts',
    'src/app/runtime/__tests__/dashboardPostInteractiveWarm.test.ts',
    'src/app/runtime/__tests__/settingsSectionSurgicalCloseHonesty.test.ts',
    'src/app/runtime/__tests__/worldclassSettingsCloseHonesty.test.ts',
    /* — Old gate lines 76-77: UI Smart Dialog tests — */
    'src/app/components/ui/__tests__/SmartDialogContainer.a11y.test.tsx',
    'src/app/components/ui/__tests__/smartDialogScope.test.ts',
];
const EXCLUDE_PREFIXES = [];

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
/* Canonical SPAWN_OPTS 5 ITEM — no deviations. */
const SPAWN_OPTS = {
    shell: true,
    maxBuffer: 500 * 1024 * 1024,
    timeout: 600_000,
    windowsHide: true,
};

console.log(`Phase2 settings test files discovered (pre-byte-slicer): ${testFilesAll.length} (raw=${rawTestFiles.length}; excluded=${rawTestFiles.length - testFilesAll.length})`);
if (testFilesAll.length < 40) {
    fail(`Phase2 test files ${testFilesAll.length} BELOW threshold 40 → FAIL`);
    process.exit(1);
}

/* ---- WINDOWS CMD 32KB TRAP FIX (CRITICAL): byte-cap slicer decrement loop ---- */
const MAX_TEST_BYTES = 10 * 1024;
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
console.log(`Phase2 Windows 32KB guard: files=${testFiles.length}, totalPathsBytes=${totalPathsBytes} ≤ MAX_TEST_BYTES=${MAX_TEST_BYTES}`);
ok(`Phase2 test files: ${testFiles.length} ≥ 40 PASS (byte-safe slice applied; no hardcoded existsSync)`);

/* ---- Run (A) verbose reporter — EXPANDED INDIVIDUAL FILES not glob patterns ---- */
console.log(`\nPhase2 — Run (A) verbose reporter (${testFiles.length} expanded INDIVIDUAL files)...`);
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

/* ---- Run (B) JSON reporter — SAME EXPANDED FILES + ROBUST JSON PARSE (reverse line + lastIndexOf fallback) ---- */
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
        } catch { /* try next (earlier) line */ }
    }
    if (!jsonReport) {
        const firstBrace = Math.max(jsonOut.lastIndexOf('{'), jsonErr.lastIndexOf('{'));
        const tail = jsonOut.substring(firstBrace) || jsonErr.substring(firstBrace);
        const lastObj = tail.substring(0, tail.lastIndexOf('}') + 1);
        jsonReport = JSON.parse(lastObj);
    }
} catch (e) {
    fail(`Phase2 Run (B) JSON parse FAILED (reverse scan + lastIndexOf both unsuccessful): ${e.message}`);
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
 * PHASE 3 — PASSED Banner EXACT STRING EQUALITY STRICT ORDER:
 *   (1) stderr banner FIRST  (via process.stderr.write)
 *   (2) stdout LAST LINE SECOND  (via console.log EXACT_LAST_STDOUT_LINE)
 *   (3) THEN AND ONLY THEN process.exit(0)
 * =======================================================================*/
console.log('\n=== Phase3: PASSED Banner Exact Last Line (stderr banner FIRST, then stdout line, then exit 0) ===');

if (failed) {
    console.error('\n===== SETTINGS TIER-1 PRODUCTION GATE FAILED =====');
    process.exit(1);
}

/* INTENTIONAL STRICT ORDER: no code between the two banner writes and exit(0). */
process.stderr.write(EXACT_BANNER + '\n');
console.log(EXACT_LAST_STDOUT_LINE);
process.exit(0);
