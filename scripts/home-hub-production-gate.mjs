#!/usr/bin/env node
/**
 * Gate بطاقة المركز (التنبيهات/التثبيت) — مسارات حرجة + unit.
 *
 * Usage:
 *   npm run gate:homeHub
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const criticalPaths = [
    'src/app/components/lawyer/LawyerHomeHubCard.tsx',
    'src/app/components/lawyer/LawyerHomeHubCard/hooks/useLawyerHomeHubCard.ts',
    'src/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubLifecycle.ts',
    'src/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubRadarState.ts',
    'src/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubPanelState.ts',
    'src/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubGuardedActions.ts',
    'src/app/components/lawyer/LawyerHomeHubCard/components/HubPanelTabs.tsx',
    'src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubAlertsPanel.tsx',
    'src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubPinsPanel.tsx',
    'src/app/services/alerts/homeHubPerfMetrics.ts',
    'src/app/services/alerts/homeHubCardLogic.ts',
    'src/app/hooks/lawyerDashboard/useLawyerDashboardHomeTab.ts',
    'src/app/components/lawyer/NeuralAlertsCard/AlertCardItem.tsx',
];

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== Home Hub production gate ===\n');

for (const path of criticalPaths) {
    if (existsSync(path)) ok(path);
    else fail(`missing ${path}`);
}

console.log('\nRunning home-hub unit test suite...');
const test = spawnSync(
    'npx',
    [
        'vitest',
        'run',
        'src/app/components/lawyer/LawyerHomeHubCard',
        'src/app/services/alerts/__tests__',
        'src/app/runtime/__tests__/homeHubCardSectionSurgicalCloseHonesty.test.ts',
        'src/app/runtime/__tests__/worldclassHomeHubCloseHonesty.test.ts',
        'src/app/hooks/lawyerDashboard/__tests__/useLawyerDashboardHomeTab.test.ts',
    ],
    { stdio: 'inherit', shell: true },
);

if (test.status !== 0) {
    fail('home-hub unit tests failed');
    process.exit(1);
}
ok('all home-hub unit tests passed');

console.log('\n=== Gate result ===');
if (failed) {
    console.error('FAILED');
    process.exit(1);
}

console.log('PASSED');
process.exit(0);
