#!/usr/bin/env node
/**
 * Gate المستودع الذكي — اختبارات وحدة + مسارات حرجة.
 *
 * Usage:
 *   npm run gate:repository
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const criticalPaths = [
    'src/app/hooks/lawyerDashboard/useLawyerDashboardRepository.ts',
    'src/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow.ts',
    'src/app/hooks/lawyerDashboard/repository/repositoryLazyImports.ts',
    'src/app/hooks/lawyerDashboard/repositoryIntentWarm.ts',
    'src/app/services/repository/repositoryPerfMetrics.ts',
    'src/app/services/repository/repositoryShellNavigation.ts',
    'src/app/runtime/repositoryHubLoader.ts',
    'src/app/runtime/repositoryBootHydrator.ts',
    'src/app/components/lawyer/SmartRepository/SmartRepositoryHost.tsx',
    'src/app/components/lawyer/SmartRepositoryModal.tsx',
    'src/app/components/lawyer/SmartRepository/hooks/useRepositoryEscapeStack.ts',
    'src/app/components/lawyer/SmartRepository/hooks/useRepositoryLifecycle.ts',
    'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry.tsx',
    'src/app/components/lawyer/dashboard/commandHub/DockHalfTile.tsx',
    'src/app/runtime/repositoryInstantPaint.ts',
    'src/app/services/platform/mediaCaptureBackgroundRelease.ts',
    'src/app/services/platform/microphoneSession.ts',
];

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== Repository production gate ===\n');

for (const path of criticalPaths) {
    if (existsSync(path)) ok(path);
    else fail(`missing ${path}`);
}

console.log('\nRunning repository unit test suite...');
const test = spawnSync(
    'npx',
    [
        'vitest',
        'run',
        'src/app/hooks/lawyerDashboard/__tests__/useLawyerDashboardRepository.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/repositoryIntentWarm.test.ts',
        'src/app/hooks/lawyerDashboard/repository/__tests__/repositoryShellOpenFlow.test.ts',
        'src/app/runtime/__tests__/repositoryDockSectionSurgicalCloseHonesty.test.ts',
        'src/app/runtime/__tests__/worldclassRepositoryCloseHonesty.test.ts',
        'src/app/runtime/__tests__/repositoryInstantPaint.test.ts',
        'src/app/components/lawyer/SmartRepository/__tests__',
        'src/app/components/lawyer/SmartRepository/hooks/__tests__',
        'src/app/services/platform/__tests__/microphoneSession.test.ts',
        'src/app/services/platform/__tests__/mediaCaptureBackgroundRelease.test.ts',
        'src/app/services/platform/__tests__/requestMicrophoneStream.test.ts',
        'src/app/services/platform/__tests__/mediaStreamTimeout.test.ts',
        'src/app/components/lawyer/ActionModals/__tests__/voiceRecorderMedia.test.ts',
        'src/app/components/lawyer/SmartVaultModal/__tests__/VaultSearchFilterHub.test.tsx',
        'src/app/components/lawyer/SmartVaultModal/__tests__/scannerCamera.test.ts',
        'src/app/services/repository',
    ],
    { stdio: 'inherit', shell: true },
);

if (test.status !== 0) {
    fail('repository unit tests failed');
    process.exit(1);
}
ok('all repository unit tests passed');

console.log('\n=== Gate result ===');
if (failed) {
    console.error('FAILED');
    process.exit(1);
}

console.log('PASSED');
process.exit(0);
