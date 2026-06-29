#!/usr/bin/env node
/**
 * Gate الإشعارات — اختبارات + migrations + (اختياري) health live.
 *
 * Usage:
 *   npm run gate:notifications
 *   npm run gate:notifications -- --live   # يتطلب VITE_* + SUPABASE_* + خادم dev
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = new Set(process.argv.slice(2));
const live = args.has('--live');

const migrations = [
    '027_lawyer_shell_notifications.sql',
    '028_lawyer_shell_inbox_rebuild_from_events.sql',
];

const apiRoutes = [
    'src/app/api/notifications/append/route.ts',
    'src/app/api/notifications/read-state/route.ts',
    'src/app/api/notifications/merge/route.ts',
    'src/app/api/notifications/list/route.ts',
    'src/app/api/notifications/wipe/route.ts',
    'src/app/api/notifications/health/route.ts',
];

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== Notifications production gate ===\n');

for (const m of migrations) {
    const path = join('supabase', 'migrations', m);
    if (existsSync(path)) ok(`migration ${m}`);
    else fail(`missing migration ${m}`);
}

for (const route of apiRoutes) {
    if (existsSync(route)) ok(`API ${route.split('/').slice(-2).join('/')}`);
    else fail(`missing ${route}`);
}

const envExample = readFileSync('.env.production.example', 'utf8');
for (const key of [
    'SHELL_NOTIFICATIONS_SUPABASE',
    'SHELL_NOTIFICATIONS_KV_CACHE',
    'SHELL_NOTIFICATIONS_PURGE_KV_AFTER_BACKFILL',
    'VITE_HAMI_NOTIFICATION_SERVER_SYNC',
]) {
    if (envExample.includes(key)) ok(`env documented: ${key}`);
    else fail(`env missing in .env.production.example: ${key}`);
}

console.log('\nRunning notification test suite...');
const test = spawnSync(
    'npx',
    [
        'vitest',
        'run',
        'src/app/services/notifications/__tests__',
        'src/app/stores/__tests__/notificationStore.test.ts',
        'src/app/services/__tests__/auditLogPublisher.test.ts',
        'src/app/hooks/__tests__/useLawyerDashboardNotifications.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/observeNotificationPanelInteractive.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/notificationIntentWarm.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/headerShellIntentWarm.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/patchLawyerDashboardHeaderOverlayOpen.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/lawyerDashboardHeaderPrefetch.test.ts',
        'src/app/services/notifications/__tests__/notificationShellOrchestration.test.ts',
        'src/app/components/lawyer/NotificationPanel',
        'src/app/services/forum/__tests__/forumNotificationBridge.test.ts',
        'src/app/services/forum/__tests__/forumNotificationDispatchExtras.test.ts',
    ],
    { stdio: 'inherit', shell: true },
);

if (test.status !== 0) {
    fail('notification tests failed');
    process.exit(1);
}
ok('all notification tests passed');

if (live) {
    const base = process.env.HAMI_GATE_BASE_URL || 'http://127.0.0.1:5173';
    console.log(`\nLive health probe (manual auth required): ${base}/api/notifications/health`);
    console.log('Run with authenticated session or integrate in wife-production-gate --live');
}

console.log('\n=== Gate result ===');
if (failed) {
    console.error('FAILED');
    process.exit(1);
}

console.log('PASSED — deploy after: npm run db:shell-notifications');
process.exit(0);
