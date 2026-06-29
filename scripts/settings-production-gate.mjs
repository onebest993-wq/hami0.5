#!/usr/bin/env node
/**
 * Gate الإعدادات — اختبارات وحدة + مسارات حرجة.
 *
 * Usage:
 *   npm run gate:settings
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const criticalPaths = [
    'src/app/hooks/lawyerDashboard/useLawyerDashboardSettings.ts',
    'src/app/hooks/lawyerDashboard/settingsIntentWarm.ts',
    'src/app/hooks/lawyerDashboard/headerShellIntentWarm.ts',
    'src/app/hooks/lawyerDashboard/patchLawyerDashboardHeaderOverlayOpen.ts',
    'src/app/services/settings/settingsShellOrchestration.ts',
    'src/app/runtime/hamiSettingsLoader.ts',
    'src/app/components/lawyer/HamiSettings/index.tsx',
    'src/app/components/lawyer/HamiSettings/SettingsShell.tsx',
];

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== Settings production gate ===\n');

for (const path of criticalPaths) {
    if (existsSync(path)) ok(path);
    else fail(`missing ${path}`);
}

console.log('\nRunning settings test suite...');
const test = spawnSync(
    'npx',
    [
        'vitest',
        'run',
        'src/app/hooks/lawyerDashboard/__tests__/useLawyerDashboardSettings.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/settingsIntentWarm.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/headerShellIntentWarm.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/patchLawyerDashboardHeaderOverlayOpen.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/lawyerDashboardHeaderPrefetch.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/dashboardViewFingerprint.test.ts',
        'src/app/services/settings/__tests__',
        'src/app/components/lawyer/HamiSettings',
        'src/app/runtime/__tests__/dashboardPostInteractiveWarm.test.ts',
    ],
    { stdio: 'inherit', shell: true },
);

if (test.status !== 0) {
    fail('settings unit tests failed');
    process.exit(1);
}
ok('all settings unit tests passed');

console.log('\n=== Gate result ===');
if (failed) {
    console.error('FAILED');
    process.exit(1);
}

console.log('PASSED');
process.exit(0);
