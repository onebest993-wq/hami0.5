export type SeizureWorkflowOptimisticPendingMap = Record<string, string>;

const store = new Map<string, SeizureWorkflowOptimisticPendingMap>();

function entityKey(assetKind: string, entityId: string): string {
    return `${String(assetKind || '').trim()}:${String(entityId || '').trim()}`;
}

export function readSeizureWorkflowOptimisticPending(
    assetKind: string,
    entityId: string,
): SeizureWorkflowOptimisticPendingMap {
    const key = entityKey(assetKind, entityId);
    if (!key.endsWith(':') && key.includes(':')) {
        return { ...(store.get(key) || {}) };
    }
    return {};
}

export function writeSeizureWorkflowOptimisticPending(
    assetKind: string,
    entityId: string,
    map: SeizureWorkflowOptimisticPendingMap,
): void {
    const key = entityKey(assetKind, entityId);
    if (!key || key.endsWith(':')) return;
    const cleaned: SeizureWorkflowOptimisticPendingMap = {};
    for (const [subtype, did] of Object.entries(map)) {
        const st = String(subtype || '').trim();
        const id = String(did || '').trim();
        if (st && id) cleaned[st] = id;
    }
    if (Object.keys(cleaned).length === 0) {
        store.delete(key);
        return;
    }
    store.set(key, cleaned);
}

export function patchSeizureWorkflowOptimisticPending(
    assetKind: string,
    entityId: string,
    subtype: string,
    decisionId: string | null | undefined,
): void {
    const st = String(subtype || '').trim();
    if (!st) return;
    const prev = readSeizureWorkflowOptimisticPending(assetKind, entityId);
    if (!decisionId) {
        delete prev[st];
    } else {
        prev[st] = String(decisionId).trim();
    }
    writeSeizureWorkflowOptimisticPending(assetKind, entityId, prev);
}

export function clearAllSeizureWorkflowOptimisticPendingForTests(): void {
    store.clear();
}
