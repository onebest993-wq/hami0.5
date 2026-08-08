/** تحميل ديناميكي — لا تبعيات ثقيلة على مسار أول paint. */

let instantPaintInflight: Promise<
    typeof import('@/app/runtime/fieldTasksInstantPaint')
> | null = null;

export function loadFieldTasksBootHydrator() {
    return import('@/app/runtime/fieldTasksBootHydrator');
}

export function loadFieldTasksHubLoader() {
    return import('@/app/runtime/fieldTasksHubLoader');
}

export function loadFieldTasksInstantPaint() {
    if (!instantPaintInflight) {
        instantPaintInflight = import('@/app/runtime/fieldTasksInstantPaint');
    }
    return instantPaintInflight;
}

/** تسخين مبكر — يملأ instantPaintRef قبل أول نقرة على الميدان */
export function prefetchFieldTasksInstantPaint(): void {
    void loadFieldTasksInstantPaint();
}

export function warmQuantumTasksDiskRead(): void {
    void import('@/app/utils/quantumTasksStorage')
        .then((m) => m.warmQuantumTasksDiskRead())
        .catch(() => undefined);
}

export type FieldTasksInstantPaintModule = Awaited<ReturnType<typeof loadFieldTasksInstantPaint>>;
