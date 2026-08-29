#!/usr/bin/env node
/**
 * Gate التقويم (dockCalendar) — اختبارات وحدة + مسارات حرجة.
 *
 * Usage:
 *   npm run gate:calendar
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const criticalPaths = [
    'src/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab.ts',
    'src/app/hooks/lawyerDashboard/schedule/scheduleShellOpenFlow.ts',
    'src/app/hooks/lawyerDashboard/schedule/scheduleLazyImports.ts',
    'src/app/hooks/lawyerDashboard/scheduleIntentWarm.ts',
    'src/app/services/calendar/calendarPerfMetrics.ts',
    'src/app/services/calendar/calendarTimeout.ts',
    'src/app/services/calendar/dockCalendarOpen.ts',
    'src/app/services/schedule/scheduleShellNavigation.ts',
    'src/app/runtime/scheduleHubLoader.ts',
    'src/app/runtime/scheduleBootHydrator.ts',
    'src/app/components/lawyer/dashboard/schedule/ScheduleTabHost.tsx',
    'src/app/components/lawyer/dashboard/schedule/RadarOpenInstantChrome.tsx',
    'src/app/components/lawyer/dashboard/schedule/ScheduleRadarPaintGate.tsx',
    'src/app/components/lawyer/dashboard/LawyerDashboardScheduleTab.tsx',
    'src/app/components/lawyer/SmartLegalRadar/hooks/useScheduleTabEscape.ts',
    'src/app/components/lawyer/SmartLegalRadar/hooks/useSmartLegalRadarLifecycle.ts',
    'src/app/components/lawyer/SmartLegalRadar/CalendarReminderModal.tsx',
];

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

console.log('=== Calendar production gate ===\n');

for (const path of criticalPaths) {
    if (existsSync(path)) ok(path);
    else fail(`missing ${path}`);
}

console.log('\nRunning calendar unit test suite...');
const test = spawnSync(
    'npx',
    [
        'vitest',
        'run',
        'src/app/hooks/lawyerDashboard/__tests__/useLawyerDashboardScheduleTab.test.ts',
        'src/app/hooks/lawyerDashboard/schedule/__tests__/scheduleShellOpenFlow.test.ts',
        'src/app/components/lawyer/SmartLegalRadar/hooks/__tests__/useScheduleTabEscape.test.ts',
        'src/app/runtime/__tests__/calendarDockSectionSurgicalCloseHonesty.test.ts',
        'src/app/runtime/__tests__/worldclassCalendarCloseHonesty.test.ts',
        'src/app/runtime/__tests__/scheduleBootHydrator.test.ts',
        'src/app/runtime/__tests__/scheduleHubLoader.test.ts',
        'src/app/services/calendar/__tests__/dockCalendarOpen.test.ts',
        'src/app/services/calendar/__tests__/scheduleConflictDetector.test.ts',
        'src/app/services/calendar/__tests__/calendarPerfMetrics.test.ts',
        'src/app/services/calendar/__tests__/calendarEventsCache.test.ts',
        'src/app/components/lawyer/dashboard/schedule/__tests__/RadarOpenInstantChrome.test.tsx',
        'src/app/components/lawyer/dashboard/schedule/__tests__/scheduleRadarLivePaint.test.ts',
        'src/app/components/lawyer/dashboard/schedule/__tests__/ScheduleRadarPaintGate.test.tsx',
        'src/app/components/lawyer/SmartLegalRadar/__tests__/radarFormCritical.test.ts',
        'src/app/components/lawyer/SmartLegalRadar/__tests__/radarVisualLightnessHonesty.test.ts',
        'src/app/components/lawyer/SmartLegalRadar/__tests__/CalendarReminderModal.test.tsx',
        'src/app/components/lawyer/SmartLegalRadar/hooks/__tests__/useCalendarEventReminders.test.ts',
        'src/app/services/calendar/__tests__/calendarEventReminder.test.ts',
        'src/app/services/calendar/__tests__/calendarReminderSnoozeStore.test.ts',
        'src/app/services/calendar/__tests__/calendarReminderAlarmSound.test.ts',
        'src/app/services/calendar/__tests__/hamiLegalAlarmWav.test.ts',
        'src/app/services/notifications/native/__tests__/calendarNativeReminderScheduler.test.ts',
        'src/app/components/lawyer/SmartLegalRadar/__tests__/SmartLegalRadarMobile.test.tsx',
        'src/app/components/lawyer/SmartLegalRadar/__tests__/EventForm.test.tsx',
        'src/app/components/lawyer/SmartLegalRadar/__tests__/EventCard.test.tsx',
        'src/app/components/lawyer/SmartLegalRadar/__tests__/RadarCalendarSyncError.test.tsx',
        'src/app/components/lawyer/SmartLegalRadar/__tests__/radarWeekStrip.test.ts',
        'src/app/components/lawyer/SmartLegalRadar/hooks/__tests__/useSmartLegalRadarForm.test.ts',
        'src/app/components/lawyer/SmartLegalRadar/hooks/__tests__/useSmartLegalRadarView.test.ts',
        'src/app/components/lawyer/SmartLegalRadar/hooks/__tests__/useSmartLegalRadarLifecycle.test.ts',
        'src/app/components/lawyer/SmartLegalRadar/__tests__/calendarFocusIds.test.ts',
        'src/app/components/lawyer/dashboard/schedule/__tests__/openCalendarRadarSource.test.ts',
        'src/app/components/lawyer/hooks/__tests__/useCalendarData.test.ts',
        'src/app/services/calendar/__tests__/calendarTimeout.test.ts',
        'src/app/services/calendar/__tests__/calendarCloudLoader.test.ts',
        'src/app/services/schedule/__tests__/scheduleShellSnap.test.ts',
        'src/app/services/__tests__/calendarFullSimulation.test.ts',
        'src/app/services/calendar/__tests__/calendarFullScheduleSync.test.ts',
        'src/app/services/calendar/dossierSync/__tests__/visitationCalendarSync.test.ts',
        'src/app/hooks/__tests__/useIncrementalCalendarSync.threadingBump.test.ts',
    ],
    { stdio: 'inherit', shell: true },
);

if (test.status !== 0) {
    fail('calendar unit tests failed');
    process.exit(1);
}
ok('all calendar unit tests passed');

console.log('\n=== Gate result ===');
if (failed) {
    console.error('FAILED');
    process.exit(1);
}

console.log('PASSED');
process.exit(0);
