import { useLayoutEffect, useRef } from 'react';

export function handlerBagFingerprint(bag: Record<string, unknown> | undefined): unknown[] {
    if (!bag) return [];
    return Object.keys(bag)
        .sort()
        .map((key) => bag[key]);
}

/** أسماء المفاتيح فقط — يمنع republish عند إعادة إنشاء الدوال كل render */
export function handlerBagKeyFingerprint(bag: Record<string, unknown> | undefined): unknown[] {
    if (!bag) return [];
    return Object.keys(bag).sort();
}

function isPlainHandlerBag(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** يدمج patch دون استبدال أغلفة المعالجات إن المراجع الداخلية لم تتغيّر */
export function mergeHandlerClusterPatch(
    current: Record<string, unknown>,
    next: Record<string, unknown>,
): Record<string, unknown> {
    let changed = false;
    const merged: Record<string, unknown> = { ...current };

    for (const key of Object.keys(next)) {
        const curVal = current[key];
        const nextVal = next[key];
        if (Object.is(curVal, nextVal)) continue;

        if (isPlainHandlerBag(curVal) && isPlainHandlerBag(nextVal)) {
            const curBag = curVal;
            const nextBag = nextVal;
            const bagKeys = new Set([...Object.keys(curBag), ...Object.keys(nextBag)]);
            let bagChanged = false;
            const mergedBag: Record<string, unknown> = { ...curBag };
            for (const bagKey of bagKeys) {
                if (!Object.is(curBag[bagKey], nextBag[bagKey])) {
                    mergedBag[bagKey] = nextBag[bagKey];
                    bagChanged = true;
                }
            }
            if (bagChanged) {
                merged[key] = mergedBag;
                changed = true;
            }
            continue;
        }

        merged[key] = nextVal;
        changed = true;
    }

    return changed ? merged : current;
}

export function handlerClusterPatchMeaningfullyChanged(
    current: Record<string, unknown>,
    next: Record<string, unknown>,
): boolean {
    return !Object.is(mergeHandlerClusterPatch(current, next), current);
}

export function usePublishHandlerClusterWhenFingerprintChanges(
    cluster: Record<string, unknown>,
    fingerprint: unknown[],
    onCluster: (cluster: Record<string, unknown>) => void,
): void {
    const clusterRef = useRef(cluster);
    clusterRef.current = cluster;
    const onClusterRef = useRef(onCluster);
    onClusterRef.current = onCluster;
    const lastFpRef = useRef<string | null>(null);
    const fpKey = JSON.stringify(fingerprint);

    useLayoutEffect(() => {
        if (lastFpRef.current === fpKey) return;
        lastFpRef.current = fpKey;
        onClusterRef.current(clusterRef.current);
    }, [fpKey]);
}
