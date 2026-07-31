let scheduled = false;

/** يُستدعى عند warmHomeOnHover — يمنع موجة shell المكررة بعد 8s */
export function markLawyerShellPrefetchCompleted(): void {
    scheduled = true;
}

/** prefetch خفيف للـ shell — لا يسحب التنبيهات والدوك مبكراً أثناء الإقلاع */
export function scheduleLawyerShellPrefetch(options?: { delayMs?: number }): void {
    if (typeof window === 'undefined' || scheduled) return;
    scheduled = true;

    void import('@/app/components/lawyer/LawyerDashboardParts/components/Header').catch(() => undefined);
    void import('@/app/utils/lazyComponents')
        .then((m) => m.prefetchLawyerHomeHubCard())
        .catch(() => undefined);

    const runDeferred = () => {
        void import('@/app/utils/lazyComponents')
            .then((m) => m.prefetchLawyerHomeShellWidgets())
            .catch(() => undefined);
    };

    const delayMs = options?.delayMs ?? (import.meta.env.DEV ? 800 : 4_000);

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => window.setTimeout(runDeferred, delayMs), { timeout: delayMs + 2_000 });
    } else {
        window.setTimeout(runDeferred, delayMs);
    }
}

export function resetLawyerShellPrefetchForTests(): void {
    scheduled = false;
}
