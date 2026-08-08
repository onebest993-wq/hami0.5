/**
 * بديل خفيف لـ @sentry/react عند VITE_ENABLE_SENTRY=false — يمنع vendor-sentry في الحزمة.
 */

type ScopeLike = {
    setExtras: (_extras: Record<string, unknown>) => void;
};

export function init(): void {
    /* no-op */
}

export function captureException(): void {
    /* no-op */
}

export function captureMessage(): void {
    /* no-op */
}

export function withScope(fn: (scope: ScopeLike) => void): void {
    fn({ setExtras: () => undefined });
}

export function browserTracingIntegration(): Record<string, never> {
    return {};
}

export function replayIntegration(): Record<string, never> {
    return {};
}

export function addIntegration(): void {
    /* no-op */
}

export function addBreadcrumb(): void {
    /* no-op */
}

export const metrics = {
    distribution(): void {
        /* no-op */
    },
};
