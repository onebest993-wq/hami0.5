#!/usr/bin/env node
/**
 * Gate البحث الشامل — اختبارات وحدة + مسارات حرجة.
 *
 * Usage:
 *   npm run gate:global-search
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const criticalPaths = [
    'src/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch.ts',
    'src/app/hooks/lawyerDashboard/globalSearchIntentWarm.ts',
    'src/app/hooks/lawyerDashboard/headerShellIntentWarm.ts',
    'src/app/hooks/lawyerDashboard/patchLawyerDashboardHeaderOverlayOpen.ts',
    'src/app/hooks/lawyerDashboard/observeGlobalSearchOverlayInteractive.ts',
    'src/app/hooks/lawyerDashboard/useGlobalSearchMobileSuspend.ts',
    'src/app/services/search/globalSearchShellOrchestration.ts',
    'src/app/runtime/globalSearchLoader.ts',
    'src/app/components/lawyer/GlobalSearchOverlay/index.tsx',
    'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchErrorBoundary.tsx',
];

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== Global search production gate ===\n');

for (const path of criticalPaths) {
    if (existsSync(path)) ok(path);
    else fail(`missing ${path}`);
}

console.log('\nRunning global search test suite...');
const test = spawnSync(
    'npx',
    [
        'vitest',
        'run',
        'src/app/hooks/lawyerDashboard/__tests__/useLawyerDashboardGlobalSearch.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/globalSearchIntentWarm.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/observeGlobalSearchOverlayInteractive.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/headerShellIntentWarm.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/patchLawyerDashboardHeaderOverlayOpen.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/lawyerDashboardHeaderPrefetch.test.ts',
        'src/app/services/search/__tests__',
        'src/app/components/lawyer/GlobalSearchOverlay',
        'src/app/runtime/__tests__/dashboardPostInteractiveWarm.test.ts',
    ],
    { stdio: 'inherit', shell: true },
);

if (test.status !== 0) {
    fail('global search unit tests failed');
    process.exit(1);
}
ok('all global search unit tests passed');

console.log('\n=== Gate result ===');
if (failed) {
    console.error('FAILED');
    process.exit(1);
}

console.log('PASSED');
process.exit(0);
