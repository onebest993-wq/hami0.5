let dockChunkPromise: Promise<void> | null = null;

/** يبدأ تحميل شريط القيادة مبكراً — مسار كشف الإقلاع ينتظره قبل content-ready */
export function preloadHomeDockBootChunk(): void {
    if (typeof window === 'undefined') return;
    if (!dockChunkPromise) {
        dockChunkPromise = import('@/app/components/lawyer/LegalCommandCenterDock').then(() => undefined);
    }
}

export function waitForHomeDockBootChunk(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    preloadHomeDockBootChunk();
    return dockChunkPromise ?? Promise.resolve();
}

export function resetHomeDockBootGateForTests(): void {
    dockChunkPromise = null;
}
