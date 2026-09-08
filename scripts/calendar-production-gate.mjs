#!/usr/bin/env node
/**
 * Calendar Tier-1 Production Gate — 4 Phases STRICT ORDERED (4P-STRICT UPGRADED 2026-09-08).
 * FIXES vs OLD pre-hardened version:
 *   (C-3) REMOVED existsSync() — replaced with globSync REAL DISK discovery (NTFS case-safe)
 *   (C-4) Canonical SPAWN_OPTS 5-item: shell:true + maxBuffer:500MB + timeout:600_000 + windowsHide:true + stdio
 *   (C-5) JSON parse: reverse-line scan + lastIndexOf('{') fallback (robust against prefixed log lines)
 *   (C-1) Windows 32KB CMD Trap Fix: expand files individually + MAX_TEST_BYTES=10KB permanent standard (forum-proven safe cap)
 *   Plus: Strict Order Banner Phase3 — stderr banner first, THEN stdout last line, THEN exit(0).
 *
 * Usage:
 *   npm run gate:calendar   OR   node scripts/calendar-production-gate.mjs
 */
import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';

const EXACT_BANNER = '===== CALENDAR TIER-1 PRODUCTION GATE PASSED =====';
const EXACT_LAST_STDOUT_LINE = '=== Gate result === PASSED';

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== CALENDAR TIER-1 PRODUCTION GATE (4P-STRICT UPGRADED) ===\n');

/* =========================================================================
 * PHASE 0 — CALENDAR_SHADOW_STUB Anti-Module-Shadowing Bomb (CRITICAL)
 * Windows NTFS case-insensitive trap: existsSync returns TRUE for wrong-case
 * paths when real lower-case file exists. ONLY globSync({caseSensitive:false,
 * nodir:true}) is safe because it returns EMPTY for case-mismatched / wrong-
 * subfolder / non-existent paths. ANY HIT = INSTANT exit(1).
 * =======================================================================*/
console.log('=== Phase0: CALENDAR_SHADOW_STUB Anti-Module-Shadowing Bomb (4 paths) ===');
const CALENDAR_SHADOW_STUB_GLOB_PATHS = [
    'src/app/components/lawyer/SmartLegalRadar/components/SmartLegalRadar.tsx',
    'src/app/components/lawyer/dashboard/CalendarScheduleTile.tsx',
    'src/app/services/calendar/calendarBridge/calendarBridgeIndex.ts',
    'src/app/components/lawyer/dashboard/CalendarReminderHost.tsx',
];
let phase0Clean = 0;
for (const pattern of CALENDAR_SHADOW_STUB_GLOB_PATHS) {
    const hits = globSync(pattern, { caseSensitive: false, nodir: true });
    if (hits.length > 0) {
        console.error(`BOMB PHASE0 CALENDAR_SHADOW_STUB DETECTED: ${pattern} → hits: ${hits.join(', ')}`);
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
 * CR-1..CR-8 Calendar scope: SmartLegalRadar components + calendar services
 * + schedule services + dashboard schedule tabs + schedule hooks + schedule
 * runtime + native calendar reminders + cloud calendar + scheduleConflict
 * + dossierSync bridges + input security + permissions + escapeStack + abort.
 * =======================================================================*/
console.log('=== Phase1: Critical Paths Glob REAL DISK (target ≥56) ===');
const criticalGlobs = [
    'src/app/services/calendar/**/*.{ts,tsx}',
    'src/app/components/lawyer/SmartLegalRadar/**/*.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/schedule/**/*.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/*Schedule*.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/*schedule*.{ts,tsx}',
    'src/app/hooks/*scheduleIntentWarm*.{ts,tsx}',
    'src/app/hooks/__tests__/*useLawyerDashboardSchedule*.test.ts',
    'src/app/services/schedule/**/*.{ts,tsx}',
    'src/app/runtime/schedule*.{ts,tsx}',
    'src/app/runtime/__tests__/*calendar*.test.{ts,tsx}',
    'src/app/runtime/__tests__/*schedule*.test.{ts,tsx}',
    'src/app/components/lawyer/dashboard/schedule/**/*.{ts,tsx}',
    'src/app/components/lawyer/dashboard/*Schedule*.{ts,tsx}',
    'src/app/components/lawyer/hooks/__tests__/*useCalendarData*.test.ts',
    'src/app/services/cloud/lawyerCalendarCloud*.{ts,tsx}',
    'src/app/services/__tests__/calendarFullSimulation.test.ts',
    'src/app/services/__tests__/calendarFullScheduleSync.test.ts',
    'src/app/services/notifications/native/__tests__/calendarNativeReminderScheduler.test.ts',
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
 *   (A) verbose reporter ≥237 PASS lines
 *   (B) JSON reporter: testResult files ≥ 40 / numTotalTests ≥237 / numFailed = 0
 *
 * WINDOWS 32KB CMD TRAP FIX (CRITICAL):
 *   Expand via globSync → INDIVIDUAL REAL FILES, then byte-cap slicer loop.
 * =======================================================================*/
console.log('=== Phase2: Vitest 2-runs (target ≥40 files / ≥237 tests) ===');
const testGlobs = [
    'src/app/hooks/lawyerDashboard/__tests__/useLawyerDashboardScheduleTab.test.ts',
    'src/app/hooks/lawyerDashboard/schedule/__tests__/scheduleShellOpenFlow.test.ts',
    'src/app/components/lawyer/SmartLegalRadar/hooks/__tests__/useScheduleTabEscape.test.ts',
    'src/app/runtime/__tests__/calendarDockSectionSurgicalCloseHonesty.test.ts',
    'src/app/runtime/__tests__/worldclassCalendarCloseHonesty.test.ts',
    'src/app/runtime/__tests__/calendarNetworkIsolationHonesty.test.ts',
    'src/app/runtime/__tests__/scheduleBootHydrator.test.ts',
    'src/app/runtime/__tests__/scheduleHubLoader.test.ts',
    'src/app/services/calendar/__tests__/dockCalendarOpen.test.ts',
    'src/app/services/calendar/__tests__/scheduleConflictDetector.test.ts',
    'src/app/services/calendar/__tests__/calendarPerfMetrics.test.ts',
    'src/app/services/calendar/__tests__/calendarEventsCache.test.ts',
    'src/app/components/lawyer/dashboard/schedule/__tests__/RadarOpenInstantChrome.test.tsx',
    'src/app/components/lawyer/dashboard/schedule/__tests__/RadarOpenInstantAddHost.test.tsx',
    'src/app/services/calendar/__tests__/calendarReminderOverlayGate.test.ts',
    'src/app/components/lawyer/dashboard/schedule/__tests__/useScheduleRadarLivePaint.test.ts',
    'src/app/components/lawyer/dashboard/schedule/__tests__/ScheduleRadarPaintGate.test.tsx',
    'src/app/components/lawyer/dashboard/schedule/__tests__/scheduleRadarLivePaint.test.ts',
    'src/app/services/calendar/__tests__/calendarOpenSourceIntent.test.ts',
    'src/app/services/calendar/__tests__/calendarLiveHandoffContext.test.ts',
    'src/app/components/lawyer/SmartLegalRadar/__tests__/radarFormCritical.test.ts',
    'src/app/components/lawyer/SmartLegalRadar/__tests__/radarVisualLightnessHonesty.test.ts',
    'src/app/components/lawyer/SmartLegalRadar/__tests__/CalendarReminderModal.test.tsx',
    'src/app/components/lawyer/SmartLegalRadar/hooks/__tests__/useCalendarEventReminders.test.ts',
    'src/app/services/calendar/__tests__/calendarEventReminder.test.ts',
    'src/app/services/calendar/__tests__/calendarReminderSnoozeStore.test.ts',
    'src/app/services/calendar/__tests__/calendarReminderAlarmSound.test.ts',
    'src/app/services/calendar/__tests__/hamiLegalAlarmWav.test.ts',
    'src/app/services/notifications/native/__tests__/calendarNativeReminderScheduler.test.ts',
    'src/app/components/lawyer/SmartLegalRadar/__tests__/SmartLegalRadar.render.test.tsx',
    'src/app/components/lawyer/SmartLegalRadar/__tests__/RadarErrorBoundary.test.tsx',
    'src/app/components/lawyer/SmartLegalRadar/__tests__/calendarEventMapping.test.ts',
    'src/app/services/calendar/__tests__/calendarEventRecord.test.ts',
    'src/app/services/calendar/__tests__/calendarEventsWarm.test.ts',
    'src/app/services/calendar/__tests__/calendarLocalSnapshot.test.ts',
    'src/app/components/lawyer/SmartLegalRadar/__tests__/SmartLegalRadarMobile.test.tsx',
    'src/app/components/lawyer/SmartLegalRadar/__tests__/EventForm.test.tsx',
    'src/app/components/lawyer/SmartLegalRadar/__tests__/EventCard.test.tsx',
    'src/app/components/lawyer/SmartLegalRadar/__tests__/RadarSelectedDaySection.test.tsx',
    'src/app/components/lawyer/SmartLegalRadar/__tests__/RadarCalendarSyncError.test.tsx',
    'src/app/components/lawyer/SmartLegalRadar/__tests__/radarWeekStrip.test.ts',
    'src/app/components/lawyer/SmartLegalRadar/hooks/__tests__/useSmartLegalRadarForm.test.ts',
    'src/app/components/lawyer/SmartLegalRadar/hooks/__tests__/useSmartLegalRadarView.test.ts',
    'src/app/components/lawyer/SmartLegalRadar/hooks/__tests__/useSmartLegalRadarLifecycle.test.ts',
    'src/app/components/lawyer/SmartLegalRadar/__tests__/calendarFocusIds.test.ts',
    'src/app/components/lawyer/dashboard/schedule/__tests__/openCalendarRadarSource.test.ts',
    'src/app/components/lawyer/hooks/__tests__/useCalendarData.test.ts',
    'src/app/services/calendar/__tests__/calendarTimeout.test.ts',
    'src/app/services/calendar/__tests__/calendarCloudLoader.test.ts',
    'src/app/services/calendar/__tests__/calendarWeekStrip.test.ts',
    'src/app/services/calendar/__tests__/calendarMonthMath.test.ts',
    'src/app/services/calendar/__tests__/calendarShellSession.test.ts',
    'src/app/services/schedule/__tests__/scheduleShellSnap.test.ts',
    'src/app/services/__tests__/calendarFullSimulation.test.ts',
    'src/app/services/__tests__/calendarFullScheduleSync.test.ts',
    'src/app/services/calendar/dossierSync/__tests__/visitationCalendarSync.test.ts',
    'src/app/hooks/__tests__/useIncrementalCalendarSync.threadingBump.test.ts',
    'src/app/components/lawyer/SmartLegalRadar/__tests__/calendarPermissions.test.ts',
    'src/app/services/calendar/__tests__/calendarInputSecurity.test.ts',
    'src/app/services/calendar/__tests__/calendarMobileEscapeAbortStack.test.ts',
];
const EXCLUDE_PREFIXES = [
    'src/app/runtime/__tests__/calendarDockSectionSurgicalCloseHonesty',
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
/* Canonical SPAWN_OPTS 5 ITEM — no deviations. */
const SPAWN_OPTS = {
    shell: true,
    maxBuffer: 500 * 1024 * 1024,
    timeout: 600_000,
    windowsHide: true,
};

console.log(`Phase2 calendar test files discovered (pre-byte-slicer): ${testFilesAll.length} (raw=${rawTestFiles.length}; excluded=${rawTestFiles.length - testFilesAll.length})`);
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
    /* PASS 1: reverse scan lines (handles log lines prepended before opening brace) */
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
    /* PASS 2 (FALLBACK): lastIndexOf('{') + substring tail until last '}'
       (handles corrupted output where JSON is not on its own line) */
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
 * Never exit(0) before both banners have been successfully written.
 * =======================================================================*/
console.log('\n=== Phase3: PASSED Banner Exact Last Line (stderr banner FIRST, then stdout line, then exit 0) ===');

if (failed) {
    console.error('\n===== CALENDAR TIER-1 PRODUCTION GATE FAILED =====');
    process.exit(1);
}

/* INTENTIONAL STRICT ORDER: no code between the two banner writes and exit(0). */
process.stderr.write(EXACT_BANNER + '\n');
console.log(EXACT_LAST_STDOUT_LINE);
process.exit(0);
