export type LawsuitLifecycleTarget = 'active' | 'archived' | 'deleted' | 'permanent';

const inFlightTargets = new Map<string, LawsuitLifecycleTarget>();

/**
 * يمنع autosave/سجل WAL من إعادة معرّف بينما معاملة دورة الحياة قيد COMMIT.
 * الواجهة تُحدَّث بعد القرص، لذلك تبقى الحالة القديمة مرئية لبضعة أجزاء من الثانية.
 */
export function beginLawsuitLifecycleMutationFence(
    ids: readonly (string | number)[],
    target: LawsuitLifecycleTarget,
): () => void {
    const normalized = [...new Set(ids.map(String).filter(Boolean))];
    for (const id of normalized) inFlightTargets.set(id, target);
    return () => {
        for (const id of normalized) {
            if (inFlightTargets.get(id) === target) inFlightTargets.delete(id);
        }
    };
}

/** معرّفات لا يجوز لأي كاتب نشط إعادتها أثناء المعاملة. */
export function readLawsuitLifecycleHeldFenceIds(): Set<string> {
    const held = new Set<string>();
    for (const [id, target] of inFlightTargets) {
        if (target !== 'active') held.add(id);
    }
    return held;
}

export function clearLawsuitLifecycleMutationFencesForTests(): void {
    if (!import.meta.env.VITEST) return;
    inFlightTargets.clear();
}
