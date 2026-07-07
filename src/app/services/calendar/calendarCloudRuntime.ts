type CalendarCloudLoaderModule = typeof import('@/app/services/calendar/calendarCloudLoader');

let calendarCloudLoaderPromise: Promise<CalendarCloudLoaderModule> | null = null;

function loadCalendarCloudLoader(): Promise<CalendarCloudLoaderModule> {
    if (!calendarCloudLoaderPromise) {
        calendarCloudLoaderPromise = import('@/app/services/calendar/calendarCloudLoader');
    }
    return calendarCloudLoaderPromise;
}

export async function fetchCalendarEvents(
    ...args: Parameters<CalendarCloudLoaderModule['fetchCalendarEvents']>
): ReturnType<CalendarCloudLoaderModule['fetchCalendarEvents']> {
    const mod = await loadCalendarCloudLoader();
    return mod.fetchCalendarEvents(...args);
}

export async function saveCalendarEvent(
    ...args: Parameters<CalendarCloudLoaderModule['saveCalendarEvent']>
): ReturnType<CalendarCloudLoaderModule['saveCalendarEvent']> {
    const mod = await loadCalendarCloudLoader();
    return mod.saveCalendarEvent(...args);
}

export async function updateCalendarEvent(
    ...args: Parameters<CalendarCloudLoaderModule['updateCalendarEvent']>
): ReturnType<CalendarCloudLoaderModule['updateCalendarEvent']> {
    const mod = await loadCalendarCloudLoader();
    return mod.updateCalendarEvent(...args);
}

export async function deleteCalendarEvent(
    ...args: Parameters<CalendarCloudLoaderModule['deleteCalendarEvent']>
): ReturnType<CalendarCloudLoaderModule['deleteCalendarEvent']> {
    const mod = await loadCalendarCloudLoader();
    return mod.deleteCalendarEvent(...args);
}

export function prefetchCalendarCloudModule(): void {
    if (typeof window === 'undefined') return;
    void loadCalendarCloudLoader().then((mod) => {
        mod.prefetchCalendarCloudModule();
    });
}
