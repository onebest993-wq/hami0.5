export const CALENDAR_FETCH_TIMEOUT_MS = 6_000;
export const CALENDAR_MUTATION_TIMEOUT_MS = 8_000;

const TIMEOUT_CODES = new Set([
    'calendar-fetch-timeout',
    'calendar-save-timeout',
    'calendar-mutation-timeout',
]);

export function isCalendarTimeoutError(err: unknown): boolean {
    return err instanceof Error && TIMEOUT_CODES.has(err.message);
}

/** مهلة مع مسح المؤقّت — لا تسرّب setTimeout بعد نجاح العملية */
export function withCalendarTimeout<T>(promise: Promise<T>, ms: number, code: string): Promise<T> {
    if (typeof window === 'undefined') return promise;
    let timer: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(code)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => {
        if (timer !== undefined) window.clearTimeout(timer);
    });
}
