export function loadScheduleIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/scheduleIntentWarm');
}

export function loadScheduleBootHydrator() {
    return import('@/app/runtime/scheduleBootHydrator');
}

export function loadScheduleHubLoader() {
    return import('@/app/runtime/scheduleHubLoader');
}

/** Matches scheduleBootHydrator.ts SCHEDULE_PRIME_HOST_EVENT — local to avoid sync stem pull. */
export const SCHEDULE_PRIME_HOST_EVENT = 'hami:schedule-prime-host';
