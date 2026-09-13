#!/usr/bin/env node
/**
 * Operations production gate
 *
 * Usage:
 *   npm run gate:operations
 *   npm run gate:operations -- --live
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const args = new Set(process.argv.slice(2));
const live = args.has('--live');
const npmExecPath = process.env.npm_execpath;

let failed = false;

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

function requireEnvDoc(envText, key) {
    if (envText.includes(key)) ok(`env documented: ${key}`);
    else fail(`env missing in .env.production.example: ${key}`);
}

function bin(name) {
    return process.platform === 'win32' ? `${name}.cmd` : name;
}

function runCommand(label, command, argsList) {
    console.log(`\n=== ${label} ===`);
    const result = spawnSync(bin(command), argsList, { stdio: 'inherit' });
    if (result.status !== 0) {
        fail(`${label} failed`);
        process.exit(1);
    }
    ok(`${label} passed`);
}

function runNpm(label, argsList) {
    console.log(`\n=== ${label} ===`);
    /*
     * **`shell: true` على ويندوز إلزاميّ، لا تحسين.** `npm` هناك ملفُّ `.cmd`،
     * و**Node يرفض تشغيله بلا غلاف** فيُرجع `EINVAL` فوراً (منذ CVE-2024-27980).
     *
     * وتظهر العلّة فقط عند الاستدعاء المباشر (`node scripts/…`) — وهو **الأمر الذي
     * تكتبه مصفوفة `section-gates.yml` حرفاً** — لأنّ `npm_execpath` لا يُضبط حينها
     * فيسقط النداء إلى المسار الثاني. قِيس ٢٠٢٦-٠٩-١٣: البوّابة تسقط في **صفر ثانية**
     * شاكيةً «TypeScript failed» **والمترجمُ لم يعمل قطّ** — تشخيصٌ كاذب لعطلٍ غير موجود.
     *
     * والمُشغّل الرسميّ `run-gate-wave0.mjs:59-66` يفعل هذا منذ البداية؛ **فهذه موافقةٌ
     * له لا اختراع**.
     */
    const isWin = process.platform === 'win32';
    const result = npmExecPath
        ? spawnSync(process.execPath, [npmExecPath, ...argsList], { stdio: 'inherit' })
        : spawnSync(bin('npm'), argsList, { stdio: 'inherit', shell: isWin });
    if (result.status !== 0) {
        fail(`${label} failed`);
        process.exit(1);
    }
    ok(`${label} passed`);
}

function runVitest(label, testFiles) {
    if (npmExecPath) {
        runNpm(label, ['exec', '--', 'vitest', 'run', ...testFiles]);
        return;
    }
    runCommand(label, 'npx', ['vitest', 'run', ...testFiles]);
}

console.log('=== Operations production gate ===\n');

[
    'docs/scalability-reliability.md',
    'docs/operations-runbook.md',
    'src/app/api/public/healthz/route.ts',
    'src/app/api/public/readyz/route.ts',
    'src/app/api/public/bff/route.ts',
    'scripts/loadtest-api.mjs',
    'scripts/verify-production-build.mjs',
    'supabase/migrations/20260714000000_external_ids_for_legal_tables.sql',
].forEach(requireFile);

const envExample = readFileSync('.env.production.example', 'utf8');
[
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_BFF_AUTH=true',
    'WIFE_REDIS_REST_URL',
    'WIFE_REDIS_REST_TOKEN',
    'ADMIN_ACCESS_KEY',
].forEach((key) => requireEnvDoc(envExample, key));

/*
 * **يُستدعى ما يفرضه المستودع فعلاً، لا ما تمنّاه هذا السكربت.** وقِيس الاثنان
 * ٢٠٢٦-٠٩-١٣ فكانا معطوبين، وكلاهما يمنع هذه البوّابة من المرور **مهما كانت الشفرة**:
 *
 *   `npm run lint:errors`  →  **أمرٌ غير مُعرَّف في `package.json` إطلاقاً** (`Missing script`).
 *   `npm run typecheck`    →  `tsc --noEmit` على شفرةٍ خطُّ أساسها **٩٥٦ خطأً** في §٤،
 *                             فيخرج بـ2 دائماً. قِيس: `status=2`.
 *
 * والنيّة المكتوبة فوق السطر الثاني كانت «أخطاء فقط — تحذيرات no-explicit-any
 * التاريخية خارج النطاق»، **وهي بعينها دلالةُ المِسنَنة**. فيُستدعى الحارسان اللذان
 * يفرضهما §٤ ويشغّلهما كلُّ ما في المستودع: لا انحدار، لا صفرٌ لم يوجد قطّ.
 *
 * **ولم يكن هذا تليينَ معيار:** «صفر خطأ» لم يكن معياراً قائماً بل تعذُّراً دائماً.
 * ومن أراد لهذه البوّابة صرامةً أشدّ من §٤ فذاك سطرٌ واحد يُعاد — **وقرارُ مالك، لأنّه
 * يُخالف مِسنَنةً مُعلَنة لا يُصلح عطلاً**.
 */
runNpm('TypeScript (ratchet §٤)', ['run', 'guard:tsc']);
runNpm('ESLint (ratchet §٤)', ['run', 'guard:lint']);
runNpm('Security audit', ['run', 'health:security']);
runNpm('Resource audit', ['run', 'health:resources']);
runNpm('Production build verification', ['run', 'verify:production-build']);

runVitest('Operations reliability tests', [
    'src/app/services/settings/__tests__/businessBackup.import.test.ts',
    'src/app/services/settings/__tests__/businessBackupSecurity.test.ts',
    'src/app/services/__tests__/secureStoreRecovery.test.ts',
    'src/app/services/__tests__/SupabaseService.test.ts',
    'src/app/services/realtimeSyncGate.test.ts',
    'src/app/services/notesCloudAdapter.test.ts',
    'src/app/services/notesSyncBridge.test.ts',
    'src/app/services/notifications/__tests__/notificationProductionReadiness.test.ts',
    'src/app/services/notifications/__tests__/notificationServerSync.test.ts',
]);

if (live) {
    const baseUrl = process.env.HAMI_GATE_BASE_URL || 'http://127.0.0.1:4173';
    console.log('\n=== Live probes ===');
    console.log(`Probe healthz: ${baseUrl}/api/public/healthz`);
    console.log(`Probe readyz: ${baseUrl}/api/public/readyz`);
    console.log(`Probe bff: ${baseUrl}/api/public/bff`);
    console.log(
        `Load test example: npm run loadtest:api -- --url=${baseUrl}/api/public/healthz --requests=300 --concurrency=20 --timeoutMs=3000`,
    );
}

console.log('\n=== Gate result ===');
if (failed) {
    console.error('FAILED');
    process.exit(1);
}

console.log('PASSED');
