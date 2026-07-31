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
    'src/app/hooks/lawyerDashboard/globalSearch/globalSearchShellOpenFlow.ts',
    'src/app/hooks/lawyerDashboard/globalSearch/useGlobalSearchHostLifecycle.ts',
    'src/app/hooks/lawyerDashboard/globalSearch/useGlobalSearchKeyboardShortcut.ts',
    'src/app/hooks/useLawyerDashboardGlobalSearchNav.ts',
    'src/app/hooks/globalSearchNavDispatch.ts',
    'src/app/hooks/lawyerDashboard/globalSearchIntentWarm.ts',
    'src/app/hooks/lawyerDashboard/headerShellIntentWarm.ts',
    'src/app/hooks/lawyerDashboard/patchLawyerDashboardHeaderOverlayOpen.ts',
    'src/app/hooks/lawyerDashboard/observeGlobalSearchOverlayInteractive.ts',
    'src/app/hooks/lawyerDashboard/useGlobalSearchMobileSuspend.ts',
    'src/app/services/search/globalSearchShellOrchestration.ts',
    'src/app/services/search/globalSearchIndexFileEntries.ts',
    'src/app/services/search/globalSearchIndexFileTasks.ts',
    'src/app/services/search/globalSearchIndexLawsuitStages.ts',
    'src/app/services/search/globalSearchQuerySecurity.ts',
    'src/app/runtime/globalSearchLoader.ts',
    'src/app/runtime/globalSearchDraftQuery.ts',
    'src/app/components/lawyer/GlobalSearchOverlay/index.tsx',
    'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchErrorBoundary.tsx',
    'src/app/components/lawyer/LawyerDashboardParts/components/HeaderSearchTrigger.tsx',
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
        'src/app/hooks/lawyerDashboard/globalSearch/__tests__/globalSearchShellOpenFlow.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/globalSearchIntentWarm.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/observeGlobalSearchOverlayInteractive.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/headerShellIntentWarm.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/patchLawyerDashboardHeaderOverlayOpen.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/lawyerDashboardHeaderPrefetch.test.ts',
        'src/app/hooks/__tests__/useLawyerDashboardGlobalSearchNav.openCover.test.ts',
        'src/app/hooks/__tests__/globalSearchNavDispatch.test.ts',
        'src/app/runtime/__tests__/globalSearchDraftQuery.test.ts',
        'src/app/runtime/__tests__/globalSearchInstantPaint.test.ts',
        'src/app/services/__tests__/globalSearchIndex.test.ts',
        'src/app/services/__tests__/globalSearchFuseRank.test.ts',
        'src/app/runtime/__tests__/globalSearchSectionSurgicalCloseHonesty.test.ts',
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
