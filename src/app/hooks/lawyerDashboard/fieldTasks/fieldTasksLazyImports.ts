/** تحميل ديناميكي — لا تبعيات ثقيلة على مسار أول paint. */

export function loadFieldTasksBootHydrator() {
    return import('@/app/runtime/fieldTasksBootHydrator');
}

export function loadFieldTasksHubLoader() {
    return import('@/app/runtime/fieldTasksHubLoader');
}

export function loadFieldTasksInstantPaint() {
    return import('@/app/runtime/fieldTasksInstantPaint');
}

export function warmQuantumTasksDiskRead(): void {
    void import('@/app/utils/quantumTasksStorage')
        .then((m) => m.warmQuantumTasksDiskRead())
        .catch(() => undefined);
}

export type FieldTasksInstantPaintModule = Awaited<ReturnType<typeof loadFieldTasksInstantPaint>>;
