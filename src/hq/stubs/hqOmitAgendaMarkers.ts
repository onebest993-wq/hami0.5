/** بديل بناء المقر — شواهد قبر تقويم المحامي ليست سطح المقر. */
export function invalidateTombstoneCache(_userId?: string): void {
    /* HQ product excludes lawyer calendar tombstones */
}

export function resetCloudTombstoneProbeForTests(): void {
    /* HQ product excludes lawyer calendar tombstones */
}

export async function recordTombstone(_userId: string, _eventId: string): Promise<void> {
    /* HQ product excludes lawyer calendar tombstones */
}

export async function loadTombstoneIds(_userId: string): Promise<Set<string>> {
    return new Set();
}

export async function clearTombstone(_userId: string, _eventId: string): Promise<void> {
    /* HQ product excludes lawyer calendar tombstones */
}
