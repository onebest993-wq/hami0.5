export type IdlePrefetchFailure = {
    label: string;
    at: number;
    reason: string;
};

const MAX_FAILURES = 8;
const failures: IdlePrefetchFailure[] = [];

function describeIdlePrefetchReason(reason: unknown): string {
    if (reason instanceof Error) return reason.message;
    try {
        return String(reason);
    } catch {
        return 'unknown';
    }
}

export function readIdlePrefetchFailures(): readonly IdlePrefetchFailure[] {
    return failures;
}

export function resetIdlePrefetchFailures(): void {
    failures.length = 0;
}

/**
 * Prefetch is best-effort: a failed hover must not become an unhandled rejection.
 * Failure is visible on the real open path (lazy + error boundary).
 * Production drops `console.*`; the ring is the durable named record.
 */
export function settleIdleChunkPrefetch(label: string, promise: Promise<unknown>): Promise<void> {
    return promise.then(
        () => undefined,
        (reason: unknown) => {
            if (failures.length >= MAX_FAILURES) failures.shift();
            failures.push({
                label,
                at: Date.now(),
                reason: describeIdlePrefetchReason(reason),
            });
            if (import.meta.env.DEV) {
                console.warn(`[hami:prefetch] ${label}`, reason);
            }
        },
    );
}
