const calendarCloudLoaderController: AbortController | null =
    typeof AbortController !== 'undefined' ? new AbortController() : null;

const calendarDossierSyncController: AbortController | null =
    typeof AbortController !== 'undefined' ? new AbortController() : null;

const calendarNativeSyncController: AbortController | null =
    typeof AbortController !== 'undefined' ? new AbortController() : null;

let calendarAbortGlobalsAttached = false;

export function getCalendarCloudLoaderSignal(): AbortSignal | undefined {
    return calendarCloudLoaderController?.signal;
}

export function getCalendarDossierSyncSignal(): AbortSignal | undefined {
    return calendarDossierSyncController?.signal;
}

export function getCalendarNativeSyncSignal(): AbortSignal | undefined {
    return calendarNativeSyncController?.signal;
}

export function abortCalendarCloudLoader(): void {
    try {
        calendarCloudLoaderController?.abort();
    } catch {
        /* ignore */
    }
}

export function abortCalendarDossierSyncOrchestrator(): void {
    try {
        calendarDossierSyncController?.abort();
    } catch {
        /* ignore */
    }
}

export function abortCalendarNativeSyncBridge(): void {
    try {
        calendarNativeSyncController?.abort();
    } catch {
        /* ignore */
    }
}

function attachCalendarAbortGlobals(): void {
    if (calendarAbortGlobalsAttached) return;
    try {
        if (typeof window === 'undefined') return;
        const w = window as unknown as Record<string, unknown>;
        w.__hamiCalendarAbortCloud = {
            abort: () => abortCalendarCloudLoader(),
        };
        w.__hamiCalendarAbortDossier = {
            abort: () => abortCalendarDossierSyncOrchestrator(),
        };
        w.__hamiCalendarAbortNative = {
            abort: () => abortCalendarNativeSyncBridge(),
        };
        calendarAbortGlobalsAttached = true;
    } catch {
        /* attach ignore */
    }
}

export function isCalendarAbortGlobalsAttached(): boolean {
    return calendarAbortGlobalsAttached;
}

try {
    if (typeof window !== 'undefined') {
        attachCalendarAbortGlobals();
    }
} catch {
    /* top-level ignore */
}
