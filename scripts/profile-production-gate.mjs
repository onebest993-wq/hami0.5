#!/usr/bin/env node
/**
 * Gate الملف المهني (هيدر) — اختبارات وحدة + مسارات حرجة.
 *
 * Usage:
 *   npm run gate:profile
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const criticalPaths = [
    'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts',
    'src/app/hooks/lawyerDashboard/profileIntentWarm.ts',
    'src/app/hooks/lawyerDashboard/useProfileTabMobileSuspend.ts',
    'src/app/hooks/lawyerDashboard/headerShellIntentWarm.ts',
    'src/app/services/profile/profileShellOrchestration.ts',
    'src/app/runtime/royalLawyerProfileLoader.ts',
    'src/app/services/cloud/lawyerProfileCloud.ts',
    'src/app/services/profile/profileSaveTimeout.ts',
    'src/app/components/lawyer/dashboard/LawyerDashboardProfileTab.tsx',
    'src/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader.ts',
    'src/app/components/lawyer/RoyalLawyerProfile/ProfileErrorBoundary.tsx',
    'src/app/components/lawyer/LawyerDashboardParts/components/HeaderProfileTrigger.tsx',
];

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== Profile header production gate ===\n');

for (const path of criticalPaths) {
    if (existsSync(path)) ok(path);
    else fail(`missing ${path}`);
}

console.log('\nRunning profile header test suite...');
const test = spawnSync(
    'npx',
    [
        'vitest',
        'run',
        'src/app/hooks/lawyerDashboard/__tests__/useLawyerDashboardProfileTab.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/profileIntentWarm.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/lawyerDashboardHeaderPrefetch.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/headerShellIntentWarm.test.ts',
        'src/app/services/profile/__tests__',
        'src/app/hooks/__tests__/useLawyerProfileHeader.test.ts',
        'src/app/components/lawyer/RoyalLawyerProfile/hooks/__tests__/useProfileLifecycle.test.ts',
    ],
    { stdio: 'inherit', shell: true },
);

if (test.status !== 0) {
    fail('profile unit tests failed');
    process.exit(1);
}
ok('all profile unit tests passed');

console.log('\n=== Gate result ===');
if (failed) {
    console.error('FAILED');
    process.exit(1);
}

console.log('PASSED');
process.exit(0);
