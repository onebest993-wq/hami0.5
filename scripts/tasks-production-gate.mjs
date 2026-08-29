#!/usr/bin/env node
/**
 * Gate مهام الميدان — مسارات حرجة + unit (+ E2E اختياري عبر release:check:tasks).
 *
 * Usage:
 *   npm run gate:tasks
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const criticalPaths = [
    'src/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks.ts',
    'src/app/hooks/lawyerDashboard/fieldTasks/fieldTasksShellOpenFlow.ts',
    'src/app/hooks/lawyerDashboard/fieldTasks/useFieldTasksHostLifecycle.ts',
    'src/app/hooks/lawyerDashboard/fieldTasks/useFieldTasksInstantPaint.ts',
    'src/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports.ts',
    'src/app/hooks/lawyerDashboard/fieldTasksIntentWarm.ts',
    'src/app/hooks/lawyerDashboard/useLawyerDashboardTasksOverlayEscape.ts',
    'src/app/services/fieldTasks/fieldTasksPerfMetrics.ts',
    'src/app/runtime/fieldTasksHubLoader.ts',
    'src/app/runtime/fieldTasksBootHydrator.ts',
    'src/app/context/QuantumTasksProvider.tsx',
    'src/app/components/lawyer/dashboard/FieldTasksBottomSheet.tsx',
    'src/app/components/lawyer/dashboard/TasksManagerOverlay.tsx',
    'src/app/components/lawyer/dashboard/TasksManager.tsx',
    'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetHost.tsx',
    'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksManagerHost.tsx',
    'src/app/components/lawyer/dashboard/fieldTasks/useTasksLifecycle.ts',
    'src/app/components/lawyer/dashboard/fieldTasks/tasksEscapeCoordinator.ts',
    'src/app/components/lawyer/dashboard/tasksManager/quantumTasksHydration.ts',
    'src/app/components/lawyer/dashboard/tasksManager/useTasksManagerController.tsx',
    'src/app/components/lawyer/dashboard/tasksManager/TaskCard.tsx',
    'src/app/components/lawyer/dashboard/tasksManager/WeeklyAgendaSection.tsx',
    'src/app/components/lawyer/dashboard/tasksManager/DistantTasksSection.tsx',
    'src/app/components/lawyer/dashboard/tasksManager/constants.ts',
    'src/app/components/lawyer/dashboard/tasksManager/utils.ts',
];

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

function run(cmd, args, label, envExtra = {}) {
    console.log(`\nRunning ${label}...`);
    const result = spawnSync(cmd, args, {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, ...envExtra },
    });
    if (result.status !== 0) {
        fail(`${label} failed`);
        return false;
    }
    ok(`${label} passed`);
    return true;
}

console.log('=== Tasks production gate ===\n');

for (const path of criticalPaths) {
    if (existsSync(path)) ok(path);
    else fail(`missing ${path}`);
}

if (failed) {
    console.error('\n=== Gate result ===\nFAILED (critical paths)');
    process.exit(1);
}

/* typecheck/E2E — release:check:tasks (repo-wide typecheck خارج نطاق مهام الميدان وحده) */

if (
    !run(
        'npx',
        [
            'vitest',
            'run',
            'src/app/hooks/lawyerDashboard/__tests__/useLawyerDashboardFieldTasks.test.ts',
            'src/app/hooks/lawyerDashboard/fieldTasks/__tests__/fieldTasksShellOpenFlow.test.ts',
            'src/app/hooks/lawyerDashboard/__tests__/useLawyerDashboardTasksOverlayEscape.test.ts',
            'src/app/hooks/__tests__/useQuantumTasks.test.ts',
            'src/app/hooks/__tests__/useFatalTaskComplete.test.ts',
            'src/app/utils/__tests__/quantumTasksStorage.test.ts',
            'src/app/utils/__tests__/quantumTasksMetrics.test.ts',
            'src/app/utils/__tests__/quantumTaskEnrichment.test.ts',
            'src/app/utils/__tests__/quantumTasksStorage.voice.test.ts',
            'src/app/services/tasks/__tests__',
            'src/app/services/__tests__/fieldTaskAlerts.test.ts',
            'src/app/services/fieldTasks/__tests__/fieldTasksPerfMetrics.test.ts',
            'src/app/runtime/__tests__/fieldTasksDockSectionSurgicalCloseHonesty.test.ts',
            'src/app/runtime/__tests__/worldclassFieldTasksCloseHonesty.test.ts',
            'src/app/components/lawyer/dashboard/__tests__/useCommandCenterDockActions.test.ts',
            'src/app/components/lawyer/dashboard/tasksManager/__tests__',
            'src/app/components/lawyer/dashboard/fieldTasks/__tests__',
            'src/app/runtime/__tests__/fieldTasksInstantPaint.test.ts',
        ],
        'tasks unit tests',
    )
) {
    process.exit(1);
}

console.log('\n=== Gate result ===');
console.log('PASSED');
process.exit(0);
