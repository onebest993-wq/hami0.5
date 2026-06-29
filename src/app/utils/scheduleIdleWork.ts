/** يؤجّل عملاً غير عاجل — لا يُشغَّل على مسار النقر/الفتح */
export function scheduleIdleWork(work: () => void, timeoutMs = 2500): () => void {
    if (typeof window === 'undefined') return () => {};

    let cancelled = false;
    const run = () => {
        if (!cancelled) work();
    };

    if (typeof requestIdleCallback !== 'undefined') {
        const idleId = requestIdleCallback(run, { timeout: timeoutMs });
        return () => {
            cancelled = true;
            cancelIdleCallback(idleId);
        };
    }

    queueMicrotask(run);
    return () => {
        cancelled = true;
    };
}
