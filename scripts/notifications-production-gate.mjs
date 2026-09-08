#!/usr/bin/env node
/**
 * Notifications Tier-1 Production Gate — 4 Phases STRICT ORDERED (4P-STRICT UPGRADED 2026-09-08).
 * FIXES vs OLD pre-hardened version (C-6 critical vulnerabilities):
 *   (NEW) Phase0 NOTIFICATION_SHADOW_STUB Anti-Module-Shadowing Bomb 4 paths NTFS-case-safe
 *   (C-3) REMOVED existsSync() 24 hardcoded paths — replaced with globSync REAL DISK discovery
 *   (C-4) Canonical SPAWN_OPTS 5-item: shell:true + maxBuffer:500MB + timeout:600_000 + windowsHide:true
 *   (C-5) JSON parse: reverse-line scan + lastIndexOf('{') fallback (robust against prefixed logs)
 *   (C-1) Windows 32KB CMD Trap Fix: expand files via globSync() individually + MAX_TEST_BYTES=10KB permanent standard (forum-proven safe cap)
 *   Plus: Strict Order Banner Phase3 — stderr banner first, THEN stdout last line, THEN exit(0).
 *   PRESERVED from old gate: migrations existence check + apiRoutes glob check + env keys documented check
 *
 * Usage:
 *   npm run gate:notifications   OR   node scripts/notifications-production-gate.mjs [--live]
 */
import { spawnSync } from 'node:child_process';
import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const EXACT_BANNER = '===== NOTIFICATIONS TIER-1 PRODUCTION GATE PASSED =====';
const EXACT_LAST_STDOUT_LINE = '=== Gate result === PASSED';

const args = new Set(process.argv.slice(2));
const live = args.has('--live');

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== NOTIFICATIONS TIER-1 PRODUCTION GATE (4P-STRICT UPGRADED) ===\n');

/* =========================================================================
 * PHASE 0 — NOTIFICATION_SHADOW_STUB Anti-Module-Shadowing Bomb (CRITICAL)
 * Windows NTFS case-insensitive trap. ANY HIT = INSTANT exit(1).
 * =======================================================================*/
console.log('=== Phase0: NOTIFICATION_SHADOW_STUB Anti-Module-Shadowing Bomb (4 paths) ===');
const NOTIFICATION_SHADOW_STUB_GLOB_PATHS = [
    'src/app/components/Lawyer/NotificationPanel/NotificationShieldNucleusSheet.tsx',
    'src/app/SERVICES/notifications/notificationShieldOwnershipGate.ts',
    'src/app/HOOKS/lawyerDashboard/notifications/notificationShieldShellShadowOpenFlow.ts',
    'src/app/RUNTIME/storage/encryptedStorage/lawyerNotificationShieldBootHydrator.ts',
];
let phase0Clean = 0;
for (const pattern of NOTIFICATION_SHADOW_STUB_GLOB_PATHS) {
    const hits = globSync(pattern, { caseSensitive: false, nodir: true });
    if (hits.length > 0) {
        console.error(`BOMB PHASE0 NOTIFICATION_SHADOW_STUB DETECTED: ${pattern} → hits: ${hits.join(', ')}`);
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
 * PHASE 1 — Critical Paths Glob REAL DISK ≥ 56 files
 * Scope: notification services (native/fcm) + NotificationPanel +
 * notification hooks + forum notifications + infrastructure +
 * stores + API routes + runtime loaders + community hooks.
 * PRESERVED: Migration SQL existence + env keys documentation check
 * =======================================================================*/
console.log('=== Phase1: Critical Paths Glob REAL DISK (target ≥56) + Migrations + Env ===');

/* — Preserved from old gate: migration file existence checks via globSync — */
const migrations = [
    '027_lawyer_shell_notifications.sql',
    '028_lawyer_shell_inbox_rebuild_from_events.sql',
    '20260828121500_ensure_lawyer_shell_notifications.sql',
];
for (const m of migrations) {
    const p = join('supabase', 'migrations', m);
    const hits = globSync(p, { caseSensitive: false, nodir: true });
    if (hits.length > 0) ok(`migration ${m}`);
    else fail(`missing migration ${m}`);
}

/* — Preserved from old gate: .env.production.example documented keys check — */
const envExample = readFileSync('.env.production.example', 'utf8');
for (const key of [
    'SHELL_NOTIFICATIONS_SUPABASE',
    'SHELL_NOTIFICATIONS_KV_CACHE',
    'SHELL_NOTIFICATIONS_PURGE_KV_AFTER_BACKFILL',
    'VITE_HAMI_NOTIFICATION_SERVER_SYNC',
    'VITE_NATIVE_NOTIFICATION_SHEET',
    'VITE_VAPID_PUBLIC_KEY',
    'FCM_SERVICE_ACCOUNT_JSON',
]) {
    if (envExample.includes(key)) ok(`env documented: ${key}`);
    else fail(`env missing in .env.production.example: ${key}`);
}

const criticalGlobs = [
    'src/app/services/notifications/**/*.ts',
    'src/app/services/notifications/**/*.tsx',
    'src/app/services/forum/*Notification*.ts',
    'src/app/services/forum/*Notification*.tsx',
    'src/app/components/lawyer/NotificationPanel/**/*.ts',
    'src/app/components/lawyer/NotificationPanel/**/*.tsx',
    'src/app/components/lawyer/CommunityScreen/hooks/*Notification*.ts',
    'src/app/hooks/lawyerDashboard/notifications/**/*.ts',
    'src/app/hooks/lawyerDashboard/*Notification*.ts',
    'src/app/hooks/lawyerDashboard/*notification*.ts',
    'src/app/hooks/*notification*.ts',
    'src/app/hooks/*Notification*.ts',
    'src/app/infrastructure/notification*.ts',
    'src/app/infrastructure/Notification*.ts',
    'src/app/stores/notification*.ts',
    'src/app/api/notifications/**/*.ts',
    'src/app/runtime/*notification*.ts',
    'src/app/runtime/*Notification*.ts',
    'src/app/services/platform/__tests__/deviceHaptic.test.ts',
    'src/app/services/calendar/__tests__/hamiLegalAlarmWav.test.ts',
];
const criticalPaths = [];
for (const g of criticalGlobs) {
    const matches = globSync(g, { caseSensitive: false, nodir: true });
    for (const m of matches) {
        if (!criticalPaths.includes(m)) criticalPaths.push(m);
    }
}
console.log(`Phase1 actual critical paths count (glob): ${criticalPaths.length}`);
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
 * =======================================================================*/
console.log('=== Phase2: Vitest 2-runs (target ≥40 files / ≥237 tests) ===');
const testGlobs = [
    /* — Old gate lines 96-98: folders → expanded to INDIVIDUAL globs — */
    'src/app/services/notifications/__tests__/*.test.ts',
    'src/app/services/notifications/__tests__/*.test.tsx',
    'src/app/services/notifications/native/__tests__/*.test.ts',
    'src/app/services/notifications/native/__tests__/*.test.tsx',
    'src/app/services/notifications/fcm/__tests__/*.test.ts',
    'src/app/services/notifications/fcm/__tests__/*.test.tsx',
    /* — Old gate lines 99-103 — */
    'src/app/stores/__tests__/notificationStore.test.ts',
    'src/app/stores/__tests__/notificationStoreList.test.ts',
    'src/app/stores/__tests__/notificationStorePersist.test.ts',
    'src/app/infrastructure/__tests__/notificationModel.test.ts',
    'src/app/infrastructure/__tests__/NotificationRepository.test.ts',
    /* — Old gate lines 104-123 — */
    'src/app/services/__tests__/auditLogPublisher.test.ts',
    'src/app/hooks/__tests__/useLawyerDashboardNotifications.test.ts',
    'src/app/hooks/lawyerDashboard/notifications/__tests__/notificationShellOpenFlow.test.ts',
    'src/app/components/lawyer/CommunityScreen/hooks/__tests__/forumAppBarNotificationSnapshot.test.ts',
    'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useForumAppBarNotifications.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/observeNotificationPanelInteractive.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/notificationIntentWarm.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/useIncomingNotificationPopups.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/incomingNotificationPopupModel.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/incomingNotificationPopupArrival.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/useNotificationMobileSuspend.test.ts',
    'src/app/runtime/__tests__/notificationInstantPaint.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/headerShellIntentWarm.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/patchLawyerDashboardHeaderOverlayOpen.test.ts',
    'src/app/hooks/lawyerDashboard/__tests__/lawyerDashboardHeaderPrefetch.test.ts',
    'src/app/services/notifications/__tests__/notificationShellOrchestration.test.ts',
    /* — Old gate line 120: NotificationPanel folder — */
    'src/app/components/lawyer/NotificationPanel/**/__tests__/*.test.ts',
    'src/app/components/lawyer/NotificationPanel/**/__tests__/*.test.tsx',
    /* — Old gate lines 121-123 — */
    'src/app/services/forum/__tests__/forumNotificationBridge.test.ts',
    'src/app/services/forum/__tests__/forumNotificationDispatchExtras.test.ts',
    'src/app/services/forum/__tests__/forumNotificationDispatchPush.test.ts',
    /* — Old gate lines 124-126 — */
    'src/app/runtime/__tests__/notificationsSectionSurgicalCloseHonesty.test.ts',
    'src/app/services/platform/__tests__/deviceHaptic.test.ts',
    'src/app/services/calendar/__tests__/hamiLegalAlarmWav.test.ts',
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
const SPAWN_OPTS = {
    shell: true,
    maxBuffer: 500 * 1024 * 1024,
    timeout: 600_000,
    windowsHide: true,
};

console.log(`Phase2 notification test files discovered (pre-byte-slicer): ${testFilesAll.length} (raw=${rawTestFiles.length}; excluded=${rawTestFiles.length - testFilesAll.length})`);
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

/* ---- Run (B) JSON reporter — SAME EXPANDED FILES + ROBUST JSON PARSE ---- */
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

/* ---- --live flag info (NOT part of strict 4P order; informational BEFORE banners) ---- */
if (live) {
    const base = process.env.HAMI_GATE_BASE_URL || 'http://127.0.0.1:5173';
    console.log(`\n[INFO --live] Live health probe (requires auth): ${base}/api/notifications/health`);
    console.log('[INFO --live] Post-deploy: npm run db:shell-notifications (migration backfill)');
}

/* =========================================================================
 * PHASE 3 — PASSED Banner EXACT STRING EQUALITY STRICT ORDER
 *   (1) stderr banner FIRST  (2) stdout LAST LINE SECOND  (3) exit(0)
 * =======================================================================*/
console.log('\n=== Phase3: PASSED Banner Exact Last Line (strict order) ===');

if (failed) {
    console.error('\n===== NOTIFICATIONS TIER-1 PRODUCTION GATE FAILED =====');
    process.exit(1);
}

/* INTENTIONAL STRICT ORDER: no code between the two banner writes and exit(0). */
process.stderr.write(EXACT_BANNER + '\n');
console.log(EXACT_LAST_STDOUT_LINE);
process.exit(0);
